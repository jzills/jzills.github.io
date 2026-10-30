import { useEffect, useRef, useState } from 'react'
import { Mail, FileText, ChevronDown } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { experience } from '@/data/experience'

const current = experience[0]

const iconLinkClass = 'inline-flex items-center justify-center w-9 h-9 rounded bg-surface border border-border text-muted hover:text-fg hover:border-accent/40 transition-all duration-200'

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
          <p className="inline-flex items-center gap-2.5 mb-6 px-3 py-1 rounded-full border border-border bg-surface/60 text-xs font-mono text-muted">
            <span className="relative flex w-2 h-2" aria-hidden="true">
              <span className="absolute inline-flex w-full h-full rounded-full bg-accent opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-accent" />
            </span>
            {current.role} <span className="text-accent">@ {current.company}</span>
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold text-fg tracking-tight leading-none mb-4">
            Joshua Zillwood
          </h1>
          <p className="text-xl text-muted mb-4">
            Platform &amp; Software Engineer
          </p>
          <p className="text-base text-muted font-mono max-w-lg mb-10 leading-relaxed">
            Building developer platforms and cloud infrastructure, with a focus on AI-assisted engineering.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              href="https://docs.google.com/document/d/1Cn8XP9f3FjcqYxIxBOgPaePRyFFD69YliEm-djYhK0k/export?format=pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText size={15} />
              Resume
            </Button>
            <a
              href="https://github.com/jzills"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="GitHub"
              className={iconLinkClass}
            >
              <GitHubIcon size={16} />
            </a>
            <a
              href="https://linkedin.com/in/jzillss"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
              className={iconLinkClass}
            >
              <LinkedInIcon size={16} />
            </a>
            <a
              href="mailto:joshua.zillwood@gmail.com"
              aria-label="Email"
              title="Email"
              className={iconLinkClass}
            >
              <Mail size={16} />
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
