import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionHeading } from '@/components/ui/SectionHeading'

function MultiWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const channels = [
      { freq: 0.018, amp: 0.18, speed: 0.003, yOffset: 0.25, opacity: 0.18 },
      { freq: 0.01, amp: 0.22, speed: 0.0018, yOffset: 0.5, opacity: 0.13 },
      { freq: 0.025, amp: 0.12, speed: 0.005, yOffset: 0.75, opacity: 0.1 },
    ]

    const draw = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      channels.forEach((ch) => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(34, 211, 238, ${ch.opacity})`
        ctx.lineWidth = 1.2

        const cy = canvas.height * ch.yOffset

        for (let x = 0; x <= canvas.width; x += 2) {
          const envelope = Math.sin((x / canvas.width) * Math.PI)
          const y = cy + Math.sin(x * ch.freq + t * ch.speed * 60) * canvas.height * ch.amp * envelope

          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        ctx.stroke()
      })

      t += 0.016
      raf = requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    draw()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-40 rounded border border-border"
      aria-hidden="true"
    />
  )
}

export function Creative() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="creative" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading
            label="Beyond Platform Work"
            heading="Creative & Experimental"
            subheading="Where engineering instincts meet generative media."
          />

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-start">
            <div className="space-y-5 text-muted leading-relaxed">
              <p>
                Alongside platform and backend work, I build software that generates
                and transforms media. This includes audio synthesis systems, generative
                image pipelines, and video processing tools — work that requires the same
                precision and abstraction as infrastructure, but applied to signal and form
                rather than services and deployments.
              </p>
              <p>
                I'm drawn to the overlap between engineering rigour and creative output.
                The best systems in both spaces are minimal, composable, and produce
                outputs that feel inevitable. Whether it's a Helm chart or an audio
                processing graph, the design problems are more similar than they look.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Audio Systems', desc: 'Signal synthesis and processing' },
                  { label: 'Generative Image', desc: 'Procedural visual systems' },
                  { label: 'Video Processing', desc: 'Frame-level manipulation' },
                  { label: 'Experimental Tools', desc: 'Software as creative medium' },
                ].map((item) => (
                  <div key={item.label} className="bg-surface border border-border rounded p-3">
                    <p className="text-xs font-mono text-accent mb-1">{item.label}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <MultiWaveform />
              <p className="text-xs font-mono text-border text-center">
                — composite waveform, three channels —
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
