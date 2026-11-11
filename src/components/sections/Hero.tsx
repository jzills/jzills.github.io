import { useEffect, useRef, useState } from 'react'
import { Mail, FileText, ChevronDown, FlaskConical } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'
import { m } from 'framer-motion'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/Button'
import { TypingLine } from '@/components/ui/TypingLine'
import { experience } from '@/data/experience'
import { LAB_PATH } from '@/lib/pages'
import { profile } from '@/data/profile'

const current = experience[0]

const iconLinkClass = 'inline-flex items-center justify-center w-9 h-9 rounded bg-surface border border-border text-muted hover:text-fg hover:border-accent/40 transition-all duration-200'

// The light-theme stroke is darker and stronger so the lines still read on white.
const waveStroke = {
  dark: 'rgba(34, 211, 238, 0.12)',
  light: 'rgba(14, 116, 144, 0.18)',
}

function WaveformCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = useTheme()
  // Read by the draw loop each frame so a theme switch doesn't restart the animation.
  const strokeRef = useRef(waveStroke[theme])
  useEffect(() => {
    strokeRef.current = waveStroke[theme]
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let t = 0

    // Interaction state, all eased per frame. A mouse swells the lines near it
    // and draws them toward it; a tap or click plucks a ripple outward; scrolling
    // adds energy to every line, which is what phones see most. This is the one
    // effect reduced motion turns off: large movement across the whole screen.
    const interactive = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: -1e4, y: 0, tx: -1e4, ty: 0, strength: 0, target: 0 }
    const pluck = { x: 0, age: 0, amp: 0 }
    let energy = 0
    let lastScroll = window.scrollY

    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, inside: e.clientY >= rect.top && e.clientY <= rect.bottom }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const { x, y, inside } = local(e)
      // Snap rather than glide in from wherever the cursor last left.
      if (pointer.strength < 0.01) {
        pointer.x = x
        pointer.y = y
      }
      pointer.tx = x
      pointer.ty = y
      pointer.target = inside ? 1 : 0
    }
    const onPointerLeave = () => {
      pointer.target = 0
    }
    const onPointerDown = (e: PointerEvent) => {
      const { x, inside } = local(e)
      if (!inside) return
      pluck.x = x
      pluck.age = 0
      pluck.amp = 1
    }
    const onScroll = () => {
      const dy = Math.abs(window.scrollY - lastScroll)
      lastScroll = window.scrollY
      energy = Math.min(0.9, energy + Math.min(dy, 60) * 0.006)
    }

    if (interactive) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onPointerLeave)
      window.addEventListener('pointerdown', onPointerDown, { passive: true })
      window.addEventListener('scroll', onScroll, { passive: true })
    }

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

      pointer.x += (pointer.tx - pointer.x) * 0.12
      pointer.y += (pointer.ty - pointer.y) * 0.12
      pointer.strength += (pointer.target - pointer.strength) * 0.05
      pluck.age += 0.016
      pluck.amp *= 0.975
      energy *= 0.95

      ctx.strokeStyle = strokeRef.current
      ctx.lineWidth = 1.5

      const cy = canvas.height / 2
      const sigma = Math.max(120, canvas.width * 0.12)
      const spread = 2 * sigma * sigma
      // How far toward the cursor the lines bend, capped so they never leave the band.
      const pull = Math.max(-0.3, Math.min(0.3, (pointer.y - cy) / canvas.height)) * canvas.height

      waves.forEach((wave, w) => {
        ctx.beginPath()
        const weight = 1 - w * 0.25

        for (let x = 0; x <= canvas.width; x += 2) {
          const noiseVal = noise(x * 0.003 + t * 0.5 + wave.phase)
          const dx = x - pointer.x
          const bump = pointer.strength * Math.exp(-(dx * dx) / spread)
          const amp = canvas.height * wave.amp * (1 + noiseVal * 0.4) * (1 + energy + bump * 2.2)
          let y = cy + Math.sin(x * wave.freq + t * wave.speed * 60 + wave.phase) * amp
          y += pull * bump * weight

          if (pluck.amp > 0.01) {
            const px = x - pluck.x
            const envelope = Math.exp(-(px * px) / (spread * 4))
            y += Math.sin(Math.abs(px) * 0.03 - pluck.age * 9 + w) * envelope * pluck.amp * canvas.height * 0.07 * weight
          }

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

    // Animate only while the hero is on screen so the loop doesn't compete with scrolling.
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf)
      if (entry.isIntersecting) draw()
    })
    visibility.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      visibility.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll)
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
        {/* A CSS animation rather than framer-motion: it starts from the prerendered
            HTML, so the hero paints before any JavaScript has loaded. */}
        <div className="page-rise">
          <p className="inline-flex items-center gap-2.5 mb-6 px-3 py-1 rounded-full border border-border bg-surface/60 text-xs font-mono text-muted">
            <span className="relative flex w-2 h-2" aria-hidden="true">
              <span className="absolute inline-flex w-full h-full rounded-full bg-accent opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-accent" />
            </span>
            {current.role} <span className="text-accent">@ {current.company}</span>
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold text-fg tracking-tight leading-none mb-4">
            {profile.name}
          </h1>
          <p className="text-xl text-muted mb-3">
            {profile.headline}
          </p>
          <TypingLine
            phrases={profile.focus}
            label={`Focus areas: ${profile.focus.join(', ')}.`}
            className="text-sm text-accent mb-4"
          />
          <p className="text-base text-muted font-mono max-w-lg mb-10 leading-relaxed">
            {profile.tagline}
          </p>

          {/* On phones the icons drop to their own row rather than wrapping one at a time. */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                href={profile.links.resume}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={15} />
                Resume
              </Button>
              <Button href={LAB_PATH}>
                <FlaskConical size={15} />
                Lab
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={profile.links.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title="GitHub"
                className={iconLinkClass}
              >
                <GitHubIcon size={16} />
              </a>
              <a
                href={profile.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
                className={iconLinkClass}
              >
                <LinkedInIcon size={16} />
              </a>
              <a
                href={`mailto:${profile.links.email}`}
                aria-label="Email"
                title="Email"
                className={iconLinkClass}
              >
                <Mail size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <m.a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-border hover:text-muted transition-colors"
        aria-label="Scroll to about"
        animate={{ opacity: scrolled ? 0 : 1, y: scrolled ? 8 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <m.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} />
        </m.div>
      </m.a>
    </section>
  )
}
