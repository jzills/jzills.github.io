// Runs a shader in its own WebGL context, drawing straight into the card's canvas.
// Used on touch screens: phones ran heavy shaders much worse through the shared
// context (see shaderPool), whose frames have to be handed from its canvas to the
// card's every frame. Cards unmount when they scroll away, which frees their
// context; browsers drop the oldest past about 16.
import { useEffect, useRef } from 'react'
import { watchAnimate } from '@/lib/shaderPlayback'

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`.trim()

// Compiling a shader is the slow part of setting a card up, and normally it blocks the
// page: right after the lab loads, a tap can wait behind the cards on screen compiling.
// Where the browser compiles in the background (KHR_parallel_shader_compile), a card only
// starts the compile and draws once it's done, so the page isn't blocked by it.
const COMPLETION_STATUS_KHR = 0x91b1

type ShaderState = {
  gl: WebGLRenderingContext
  uTime: WebGLUniformLocation | null
  uRes: WebGLUniformLocation | null
  observer: ResizeObserver
  start: number
  // When the animation stopped, or null while it runs. Resuming shifts start by
  // the time spent stopped, so a shader picks up on the frame it paused on.
  pausedAt: number | null
}

export function useOwnContextRunner(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  // Empty until the source has loaded; nothing is drawn before then.
  fragmentShader: string,
  // False holds the current frame, e.g. when the visitor pauses the shader.
  active: boolean,
  // For shaders that don't use u_time: draw one frame and never start the loop.
  still = false,
  // With a mouse, play only while this element is hovered or holds focus (see watchHover).
  hoverTargetRef?: React.RefObject<HTMLElement | null>
) {
  const rafRef = useRef<number>(0)
  const stateRef = useRef<ShaderState | null>(null)
  // The context while its shader is still compiling, so unmounting then still frees it.
  const pendingGlRef = useRef<WebGLRenderingContext | null>(null)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    if (!active || !fragmentShader) return

    const canvas = canvasRef.current
    if (!canvas) return

    let visible = false
    let running = false
    let initRaf = 0

    const render = ({ gl, uTime, uRes, start, pausedAt }: ShaderState) => {
      gl.uniform1f(uTime, ((pausedAt ?? performance.now()) - start) / 1000)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const play = () => {
      const state = stateRef.current
      if (still || running || !visible || !state) return
      running = true
      if (state.pausedAt !== null) {
        state.start += performance.now() - state.pausedAt
        state.pausedAt = null
      }
      const draw = () => {
        render(state)
        rafRef.current = requestAnimationFrame(draw)
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    const pause = () => {
      if (running && stateRef.current) stateRef.current.pausedAt = performance.now()
      running = false
      cancelAnimationFrame(rafRef.current)
    }

    // Animate only a few at a time (see watchAnimate): ray-marching several
    // canvases every frame stutters. Paused canvases keep their last frame.
    const stopWatching = watchAnimate(
      canvas,
      (on) => {
        visible = on
        if (on) play()
        else pause()
      },
      hoverTargetRef?.current,
    )

    const cleanup = () => {
      cancelAnimationFrame(initRaf)
      pause()
      stopWatching()
    }

    if (stateRef.current) return cleanup

    const finishSetup = (gl: WebGLRenderingContext, prog: WebGLProgram) => {
      if (stateRef.current) return
      pendingGlRef.current = null
      gl.useProgram(prog)

      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      )

      const pos = gl.getAttribLocation(prog, 'a_position')
      gl.enableVertexAttribArray(pos)
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

      const resize = () => {
        canvas.width = Math.max(1, Math.round(canvas.offsetWidth))
        canvas.height = Math.max(1, Math.round(canvas.offsetHeight))
        gl.viewport(0, 0, canvas.width, canvas.height)
        // Resizing clears the canvas; redraw so a paused shader doesn't go blank.
        if (!running && stateRef.current) render(stateRef.current)
      }
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)
      resize()

      // Starts paused at t = 0, so a shader that waits outside the animating ones
      // picks up from the still it has been showing instead of jumping ahead by
      // however long it waited.
      const now = performance.now()
      stateRef.current = {
        gl,
        uTime: gl.getUniformLocation(prog, 'u_time'),
        uRes: gl.getUniformLocation(prog, 'u_resolution'),
        observer,
        start: now,
        pausedAt: now,
      }

      // Draw one frame up front so shaders outside the animating ones still show a still.
      render(stateRef.current)
      play()
    }

    // Deferred a frame so the canvas has been laid out and has real dimensions.
    initRaf = requestAnimationFrame(() => {
      const gl = canvas.getContext('webgl')
      if (!gl) return
      pendingGlRef.current = gl

      const compile = (type: number, src: string) => {
        const shader = gl.createShader(type)!
        gl.shaderSource(shader, src)
        gl.compileShader(shader)
        return shader
      }

      const prog = gl.createProgram()!
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragmentShader))
      gl.linkProgram(prog)

      // With background compiling, wait for it before touching the program: using or
      // querying an unfinished one would block until it's done.
      if (!gl.getExtension('KHR_parallel_shader_compile')) return finishSetup(gl, prog)
      const poll = () => {
        if (gl.getProgramParameter(prog, COMPLETION_STATUS_KHR)) finishSetup(gl, prog)
        else initRaf = requestAnimationFrame(poll)
      }
      poll()
    })

    return cleanup
  }, [active, canvasRef, fragmentShader, hoverTargetRef, still])

  // Full teardown on unmount only
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (stateRef.current) {
        stateRef.current.observer.disconnect()
        stateRef.current.gl.getExtension('WEBGL_lose_context')?.loseContext()
        stateRef.current = null
      }
      pendingGlRef.current?.getExtension('WEBGL_lose_context')?.loseContext()
      pendingGlRef.current = null
    }
  }, [])
}
