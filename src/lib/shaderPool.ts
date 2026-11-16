// One WebGL context draws every shader on the page. Each card keeps its own
// canvas, and a frame is drawn here and handed to it. Compared with a context
// per card, each shader compiles once per visit (scrolling back to a card costs
// nothing), contexts aren't created and thrown away as cards scroll past, and
// there's no browser cap on live contexts to stay under.
//
// Compiling is the slow part, so it's queued: at most one shader finishes per
// frame, and where the browser can compile in the background
// (KHR_parallel_shader_compile) the page keeps scrolling while it does.
//
// Handing a frame over is where it can go wrong: copying a WebGL canvas into a 2D
// one with drawImage makes the page wait for the GPU to finish the frame, about
// 14 ms a frame on a phone. So where WebGL runs in an OffscreenCanvas, each frame
// is passed as an ImageBitmap to the card's bitmaprenderer canvas, which hands it
// over on the GPU without waiting. Elsewhere (Safari before 17) it falls back to drawImage.

export type ShaderProgram = {
  prog: WebGLProgram
  uTime: WebGLUniformLocation | null
  uRes: WebGLUniformLocation | null
}

// Called with the program once it's ready, and with null if the context is lost;
// after a restore it's called again with the recompiled program.
type Subscriber = (program: ShaderProgram | null) => void

type Entry = {
  state: 'queued' | 'linking' | 'ready' | 'failed'
  prog: WebGLProgram | null
  program: ShaderProgram | null
  subscribers: Set<Subscriber>
}

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`.trim()

// From KHR_parallel_shader_compile.
const COMPLETION_STATUS_KHR = 0x91b1

// Where a card's frames go: a bitmaprenderer canvas when frames move as ImageBitmaps,
// otherwise a 2D canvas they're copied into.
export type ShaderTarget =
  | { canvas: HTMLCanvasElement; bitmap: ImageBitmapRenderingContext }
  | { canvas: HTMLCanvasElement; copy: CanvasRenderingContext2D }

const entries = new Map<string, Entry>()
let canvas: HTMLCanvasElement | OffscreenCanvas | null = null
// Whether the shared context runs in an OffscreenCanvas, so frames can move as ImageBitmaps.
let offscreen = false
let gl: WebGLRenderingContext | null = null
let lost = false
let parallel = false
let vert: WebGLShader | null = null
let frame = 0

// Per-context state: the vertex shader every program shares and the full-screen quad.
function setup(g: WebGLRenderingContext) {
  parallel = !!g.getExtension('KHR_parallel_shader_compile')
  vert = g.createShader(g.VERTEX_SHADER)
  g.shaderSource(vert!, VERT)
  g.compileShader(vert!)
  g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer())
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW)
  g.enableVertexAttribArray(0)
  g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0)
}

function context() {
  if (lost) return null
  if (gl) return gl
  const options: WebGLContextAttributes = { antialias: false, depth: false, stencil: false }
  if (typeof OffscreenCanvas !== 'undefined') {
    const off = new OffscreenCanvas(1, 1)
    gl = off.getContext('webgl', options)
    if (gl) {
      canvas = off
      offscreen = true
    }
  }
  if (!gl) {
    const el = document.createElement('canvas')
    el.width = el.height = 1
    gl = el.getContext('webgl', options)
    canvas = el
  }
  if (!gl || !canvas) return null

  canvas.addEventListener('webglcontextlost', (e: Event) => {
    e.preventDefault()
    lost = true
    cancelAnimationFrame(frame)
    frame = 0
    for (const entry of entries.values()) {
      const wasReady = entry.state === 'ready'
      entry.state = 'queued'
      entry.prog = entry.program = null
      if (wasReady) for (const s of entry.subscribers) s(null)
    }
  })
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false
    setup(gl!)
    schedule()
  })

  setup(gl)
  return gl
}

function startLink(g: WebGLRenderingContext, entry: Entry, source: string) {
  const frag = g.createShader(g.FRAGMENT_SHADER)!
  g.shaderSource(frag, source)
  g.compileShader(frag)
  const prog = g.createProgram()!
  g.attachShader(prog, vert!)
  g.attachShader(prog, frag)
  // Bound up front so nothing has to query the program (and wait on it) for the location.
  g.bindAttribLocation(prog, 0, 'a_position')
  g.linkProgram(prog)
  entry.prog = prog
  entry.state = 'linking'
}

// Blocks until the program is linked, unless the browser reports it already is.
function finish(g: WebGLRenderingContext, entry: Entry) {
  const prog = entry.prog!
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
    entry.state = 'failed'
    console.warn('Shader failed to compile:', g.getProgramInfoLog(prog))
    return
  }
  entry.program = { prog, uTime: g.getUniformLocation(prog, 'u_time'), uRes: g.getUniformLocation(prog, 'u_resolution') }
  entry.state = 'ready'
  // A subscriber draws its first frame here, which is when the driver does any work it deferred.
  for (const s of entry.subscribers) s(entry.program)
}

function pump() {
  frame = 0
  const g = context()
  if (!g) return

  if (parallel) {
    // Hand every waiting shader to the background compiler, then take the first
    // one that's done. Starting a link doesn't block; querying an unfinished one would.
    for (const [source, entry] of entries) if (entry.state === 'queued' && entry.subscribers.size) startLink(g, entry, source)
    for (const entry of entries.values()) {
      if (entry.state === 'linking' && g.getProgramParameter(entry.prog!, COMPLETION_STATUS_KHR)) {
        finish(g, entry)
        break
      }
    }
  } else {
    // No background compiling: compile one shader this frame.
    for (const [source, entry] of entries) {
      if (entry.state !== 'queued' || !entry.subscribers.size) continue
      startLink(g, entry, source)
      finish(g, entry)
      break
    }
  }

  for (const entry of entries.values()) {
    if (entry.state === 'linking' || (entry.state === 'queued' && entry.subscribers.size)) return schedule()
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(pump)
}

// Asks for a shader to be compiled and calls back when it can be drawn (at once,
// if it already can). Returns the unsubscribe.
export function subscribeShader(source: string, subscriber: Subscriber) {
  let entry = entries.get(source)
  if (!entry) {
    entry = { state: 'queued', prog: null, program: null, subscribers: new Set() }
    entries.set(source, entry)
  }
  entry.subscribers.add(subscriber)
  if (entry.state === 'ready') subscriber(entry.program)
  else schedule()

  const current = entry
  return () => {
    current.subscribers.delete(subscriber)
  }
}

// Sets a card's canvas up to receive frames. A canvas keeps the first kind of
// context it's given, so each card canvas comes here once.
export function shaderTarget(el: HTMLCanvasElement): ShaderTarget | null {
  context()
  if (offscreen) {
    const bitmap = el.getContext('bitmaprenderer')
    if (bitmap) return { canvas: el, bitmap }
  }
  const copy = el.getContext('2d')
  return copy ? { canvas: el, copy } : null
}

// Draws one frame of a ready shader at the target's size and hands it to the target.
export function drawShader(program: ShaderProgram, target: ShaderTarget, time: number) {
  const g = context()
  if (!g || !canvas) return
  const { width, height } = target.canvas

  if ('bitmap' in target) {
    // The whole canvas becomes the bitmap, so it's sized to the target. Cards
    // share a size, so this rarely reallocates.
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
  } else {
    // The shared canvas only grows; each draw uses its bottom-left corner, which
    // is where the viewport's origin sits.
    if (canvas.width < width) canvas.width = width
    if (canvas.height < height) canvas.height = height
  }

  g.viewport(0, 0, width, height)
  g.useProgram(program.prog)
  g.uniform1f(program.uTime, time)
  g.uniform2f(program.uRes, width, height)
  g.drawArrays(g.TRIANGLE_STRIP, 0, 4)

  if ('bitmap' in target) {
    target.bitmap.transferFromImageBitmap((canvas as OffscreenCanvas).transferToImageBitmap())
  } else {
    target.copy.clearRect(0, 0, width, height)
    target.copy.drawImage(canvas, 0, canvas.height - height, width, height, 0, 0, width, height)
  }
}
