import { useRef, useEffect } from 'react'

export function BackgroundWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const noise = (x: number) =>
      Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.3) * 0.3 + Math.sin(x * 0.7) * 0.2

    const waves = [
      { freq: 0.006, amp: 0.06, speed: 0.0008, phase: 0 },
      { freq: 0.009, amp: 0.04, speed: 0.0014, phase: Math.PI * 0.6 },
      { freq: 0.004, amp: 0.08, speed: 0.0004, phase: Math.PI * 1.3 },
    ]

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      waves.forEach((wave) => {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.07)'
        ctx.lineWidth = 1.5

        const cy = canvas.height / 2

        for (let x = 0; x <= canvas.width; x += 2) {
          const noiseVal = noise(x * 0.003 + t * 0.5 + wave.phase)
          const y =
            cy +
            Math.sin(x * wave.freq + t * wave.speed * 60 + wave.phase) *
              canvas.height *
              wave.amp *
              (1 + noiseVal * 0.4)

          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        ctx.stroke()
      })

      t += 0.016
      raf = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    resize()
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  )
}
