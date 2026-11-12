import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Mail, FileText, ChevronDown, FlaskConical } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'
import { m } from 'framer-motion'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/Button'
import { TypingLine } from '@/components/ui/TypingLine'
import { HeroMarkCanvas, MarkFallback, SHOCKWAVE_EVENT, type ShockwaveDetail } from '@/components/sections/HeroMark'
import { experience } from '@/data/experience'
import { LAB_PATH } from '@/lib/pages'
import { getLitPieces, litLetters, subscribeLitPieces } from '@/lib/party'
import { profile } from '@/data/profile'

const current = experience[0]

// The name splits into letters so the blast can scatter them one by one. Each
// word stays unbreakable so the letters still wrap as words. The first `lit`
// letters glow in the accent: progress toward party mode (src/lib/party.ts).
function BlastableName({ text, lit }: { text: string; lit: number }) {
  let index = 0
  return text.split(' ').map((word, w) => (
    <span key={w}>
      {w > 0 && ' '}
      <span className="inline-block whitespace-nowrap">
        {[...word].map((ch, i) => {
          const on = index++ < lit
          return (
            <span key={i} data-blast="" className={`inline-block${on ? ' name-lit' : ''}`}>{ch}</span>
          )
        })}
      </span>
    </span>
  ))
}

const serverLit = () => 0

const iconLinkClass = 'inline-flex items-center justify-center w-9 h-9 rounded bg-surface border border-border text-muted hover:text-fg hover:border-accent/40 transition-all duration-200'

// The light-theme stroke is darker and stronger so the lines still read on white.
const waveStroke = {
  dark: 'rgba(34, 211, 238, 0.12)',
  light: 'rgba(14, 116, 144, 0.18)',
  party: 'rgba(255, 43, 214, 0.55)',
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
    // The hero mark bursting hits the waveform with a big ripple.
    const onShockwave = (e: Event) => {
      const { clientX } = (e as CustomEvent<ShockwaveDetail>).detail
      pluck.x = clientX - canvas.getBoundingClientRect().left
      pluck.age = 0
      pluck.amp = 1.8
      energy = 0.9
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
      window.addEventListener(SHOCKWAVE_EVENT, onShockwave)
    }

    // Resizing a canvas wipes it, and the observer runs after this frame's draw
    // but before it's painted, so repaint at once or a blank frame shows. On
    // iPhones the hero resizes constantly while scrolling, as Safari's toolbar
    // collapses and expands, which made the canvas blink.
    // Sized in device pixels (capped at 2x) so the lines stay crisp on high-DPI
    // screens; w and h are the CSS size the drawing works in.
    let w = 0, h = 0, dpr = 0
    const resize = () => {
      const nextDpr = Math.min(2, window.devicePixelRatio || 1)
      if (w === canvas.offsetWidth && h === canvas.offsetHeight && dpr === nextDpr) return
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      dpr = nextDpr
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paint()
    }

    const noise = (x: number) => Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.3) * 0.3 + Math.sin(x * 0.7) * 0.2

    const paint = () => {
      ctx.clearRect(0, 0, w, h)

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

      const cy = h / 2
      const sigma = Math.max(120, w * 0.12)
      const spread = 2 * sigma * sigma
      // How far toward the cursor the lines bend, capped so they never leave the band.
      const pull = Math.max(-0.3, Math.min(0.3, (pointer.y - cy) / h)) * h

      waves.forEach((wave, i) => {
        ctx.beginPath()
        const weight = 1 - i * 0.25

        for (let x = 0; x <= w; x += 2) {
          const noiseVal = noise(x * 0.003 + t * 0.5 + wave.phase)
          const dx = x - pointer.x
          const bump = pointer.strength * Math.exp(-(dx * dx) / spread)
          const amp = h * wave.amp * (1 + noiseVal * 0.4) * (1 + energy + bump * 2.2)
          let y = cy + Math.sin(x * wave.freq + t * wave.speed * 60 + wave.phase) * amp
          y += pull * bump * weight

          if (pluck.amp > 0.01) {
            const px = x - pluck.x
            const envelope = Math.exp(-(px * px) / (spread * 4))
            y += Math.sin(Math.abs(px) * 0.03 - pluck.age * 9 + i) * envelope * pluck.amp * h * 0.07 * weight
          }

          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        ctx.stroke()
      })

      t += 0.016
    }

    const draw = () => {
      paint()
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
      window.removeEventListener(SHOCKWAVE_EVENT, onShockwave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="party-hue absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}

export function Hero() {
  const [scrolled, setScrolled] = useState(false)
  const markRef = useRef<HTMLButtonElement>(null)
  const litPieces = useSyncExternalStore(subscribeLitPieces, getLitPieces, serverLit)

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
        {/* Positioned so the desktop mark anchors to this block whether or not
            the entrance animation's transform is still running. */}
        <div className="page-rise relative">
          <p data-blast="" className="inline-flex items-center gap-2.5 mb-6 px-3 py-1 rounded-full border border-border bg-surface/60 text-xs font-mono text-muted">
            <span className="relative flex w-2 h-2" aria-hidden="true">
              <span className="absolute inline-flex w-full h-full rounded-full bg-accent opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-accent" />
            </span>
            {current.role} <span className="text-accent">@ {current.company}</span>
          </p>
          <div className="flex items-center gap-3 mb-4">
            <h1 aria-label={profile.name} className="text-5xl sm:text-6xl font-bold text-fg tracking-tight leading-none">
              <BlastableName text={profile.name} lit={litLetters(litPieces)} />
            </h1>
            {/* Hit area for the oscilloscope mark; its dots are drawn on the
                full-hero canvas so the burst can spill across the whole section.
                Beside the name on phones (hidden where there's no room), large in
                the empty right half on desktop. */}
            <button
              ref={markRef}
              type="button"
              aria-label="Blow up the page"
              className="hero-mark shrink-0 block w-[84px] h-[68px] max-[359px]:hidden lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:w-[340px] lg:h-[300px] cursor-pointer rounded outline-offset-4"
            >
              <MarkFallback />
            </button>
          </div>
          <p data-blast="" className="text-xl text-muted mb-3 w-fit">
            {profile.headline}
          </p>
          <div data-blast="" className="w-fit">
            <TypingLine
              phrases={profile.focus}
              label={`Focus areas: ${profile.focus.join(', ')}.`}
              className="text-sm text-accent mb-4"
            />
          </div>
          <p data-blast="" className="text-base text-muted font-mono max-w-lg mb-10 leading-relaxed">
            {profile.tagline}
          </p>

          {/* On phones the icons drop to their own row rather than wrapping one at a time. */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div data-blast-group="" className="flex items-center gap-3">
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
            <div data-blast-group="" className="flex items-center gap-3">
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

      <HeroMarkCanvas anchorRef={markRef} />

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
