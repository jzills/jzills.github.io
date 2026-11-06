import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`.trim()

// Guarded for prerendering, which has no window; the hook itself only runs in the browser.
const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// Where a shader animates. On touch devices only the middle band of the screen
// counts, so a page of shaders animates about one at a time while the rest hold a
// still frame; on desktop anything on screen animates.
const animateMargin = coarse ? '-35% 0px -35% 0px' : '0px'

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

export function useShaderRunner(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  // Empty until the source has loaded; nothing is drawn before then.
  fragmentShader: string,
  // False holds the current frame, e.g. when the visitor pauses the shader.
  active: boolean,
  // For shaders that don't use u_time: draw one frame and never start the loop.
  still = false
) {
  const rafRef = useRef<number>(0)
  const stateRef = useRef<ShaderState | null>(null)

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

    // Animate only inside the animate band: ray-marching every frame while
    // off-screen starves scrolling on phones. Paused canvases keep their last frame.
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) play()
      else pause()
    }, { rootMargin: animateMargin })
    visibility.observe(canvas)

    const cleanup = () => {
      cancelAnimationFrame(initRaf)
      pause()
      visibility.disconnect()
    }

    if (stateRef.current) return cleanup

    // Defer first init to rAF so canvas has been laid out and has real dimensions
    initRaf = requestAnimationFrame(() => {
      if (!canvas) return

      const gl = canvas.getContext('webgl')
      if (!gl) return

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

      stateRef.current = {
        gl,
        uTime: gl.getUniformLocation(prog, 'u_time'),
        uRes: gl.getUniformLocation(prog, 'u_resolution'),
        observer,
        start: performance.now(),
        pausedAt: null,
      }

      // Draw one frame up front so shaders outside the animate band still show a still.
      render(stateRef.current)
      play()
    })

    return cleanup
  }, [active, fragmentShader, still])

  // Full teardown on unmount only
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (stateRef.current) {
        stateRef.current.observer.disconnect()
        stateRef.current.gl.getExtension('WEBGL_lose_context')?.loseContext()
        stateRef.current = null
      }
    }
  }, [])
}
