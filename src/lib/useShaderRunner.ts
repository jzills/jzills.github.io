import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`.trim()

type ShaderState = {
  gl: WebGLRenderingContext
  uTime: WebGLUniformLocation | null
  uRes: WebGLUniformLocation | null
  observer: ResizeObserver
  start: number
}

export function useShaderRunner(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  fragmentShader: string,
  active: boolean
) {
  const rafRef = useRef<number>(0)
  const stateRef = useRef<ShaderState | null>(null)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return

    const startLoop = (state: ShaderState) => {
      const { gl, uTime, uRes, start } = state
      const draw = () => {
        const t = (performance.now() - start) / 1000
        gl.uniform1f(uTime, t)
        gl.uniform2f(uRes, canvas.width, canvas.height)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        rafRef.current = requestAnimationFrame(draw)
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    if (stateRef.current) {
      startLoop(stateRef.current)
      return () => cancelAnimationFrame(rafRef.current)
    }

    // Defer first init to rAF so canvas has been laid out and has real dimensions
    rafRef.current = requestAnimationFrame(() => {
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

      const observer = new ResizeObserver(() => {
        canvas.width = Math.max(1, canvas.offsetWidth)
        canvas.height = Math.max(1, canvas.offsetHeight)
        gl.viewport(0, 0, canvas.width, canvas.height)
      })
      observer.observe(canvas)
      canvas.width = Math.max(1, canvas.offsetWidth)
      canvas.height = Math.max(1, canvas.offsetHeight)
      gl.viewport(0, 0, canvas.width, canvas.height)

      stateRef.current = {
        gl,
        uTime: gl.getUniformLocation(prog, 'u_time'),
        uRes: gl.getUniformLocation(prog, 'u_resolution'),
        observer,
        start: performance.now(),
      }

      startLoop(stateRef.current)
    })

    return () => cancelAnimationFrame(rafRef.current)
  }, [active, fragmentShader])

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
