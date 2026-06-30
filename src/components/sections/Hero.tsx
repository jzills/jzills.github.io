import { useEffect, useRef, useState } from 'react'
import { Mail, FileText, ChevronDown } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'
import { motion } from 'framer-motion'

function WaveformCanvas() {
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

    const noise = (x: number) => Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.3) * 0.3 + Math.sin(x * 0.7) * 0.2

    const draw = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const waves = [
        { freq: 0.008, amp: 0.04, speed: 0.004, phase: 0 },
        { freq: 0.012, amp: 0.025, speed: 0.007, phase: Math.PI * 0.6 },
        { freq: 0.005, amp: 0.06, speed: 0.002, phase: Math.PI * 1.3 },
      ]

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)'
      ctx.lineWidth = 1.5

      waves.forEach((wave) => {
        ctx.beginPath()
        const cy = canvas.height / 2

        for (let x = 0; x <= canvas.width; x += 2) {
          const noiseVal = noise(x * 0.003 + t * 0.5 + wave.phase)
          const y = cy + Math.sin(x * wave.freq + t * wave.speed * 60 + wave.phase) * canvas.height * wave.amp * (1 + noiseVal * 0.4)

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
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}

export function Hero() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section id="hero" className="relative min-h-[100dvh] flex items-center overflow-hidden">
      <WaveformCanvas />
      <div className="relative max-w-[1100px] mx-auto px-6 w-full pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-5xl sm:text-6xl font-bold text-fg tracking-tight leading-none mb-4">
            Joshua Zillwood
          </h1>
          <p className="text-xl text-muted mb-4">
            Senior DevOps Engineer &amp; Software Developer
          </p>
          <p className="text-base text-muted/70 font-mono max-w-lg mb-10 leading-relaxed">
            Building developer platforms, cloud infrastructure, and automation systems.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/jzills"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-surface border border-border text-sm text-fg hover:border-accent/40 transition-all duration-200"
            >
              <GitHubIcon size={15} />
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/jzillss"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-surface border border-border text-sm text-fg hover:border-accent/40 transition-all duration-200"
            >
              <LinkedInIcon size={15} />
              LinkedIn
            </a>
            <a
              href="mailto:joshua.zillwood@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-surface border border-border text-sm text-fg hover:border-accent/40 transition-all duration-200"
            >
              <Mail size={15} />
              Email
            </a>
            <a
              href="https://docs.google.com/document/d/1Cn8XP9f3FjcqYxIxBOgPaePRyFFD69YliEm-djYhK0k/export?format=pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded border border-accent/50 text-sm text-accent hover:bg-accent/5 transition-all duration-200"
            >
              <FileText size={15} />
              Resume
            </a>
          </div>
        </motion.div>
      </div>

      <motion.a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-border hover:text-muted transition-colors"
        aria-label="Scroll to about"
        animate={{ opacity: scrolled ? 0 : 1, y: scrolled ? 8 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.a>
    </section>
  )
}
