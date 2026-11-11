import { useEffect, useRef, type RefObject } from 'react'
import { blastPage } from '@/lib/blast'
import { curve, curvePoints } from '@/lib/lissajous'

// The hero's easter egg: an oscilloscope figure drawn in dots beside the name.
// Tap it and it swells, spins and twists, bursts, blows the page apart, then
// redraws itself as the next figure, pen-stroke style along the curve. Under
// reduced motion a tap just fades to the next figure.

export const SHOCKWAVE_EVENT = 'hero-shockwave'
export type ShockwaveDetail = { clientX: number; clientY: number }

const SPIN = 0.7
const FLY = 0.8
const REDRAW = 1.3
// Seconds for a returning dot's pull to build to full strength.
const DOT_RAMP = 0.6
const FADE = 0.3

type Phase = 'idle' | 'spin' | 'fly' | 'rebuild' | 'fade-out' | 'fade-in'
interface Dot { x: number; y: number; vx: number; vy: number; sx: number; sy: number }

// Static stand-in shown before the canvas takes over (and in the prerendered HTML).
export function MarkFallback() {
  const points = curvePoints(0)
  return (
    <svg viewBox="-1 -1 2 2" preserveAspectRatio="none" className="mark-fallback w-full h-full text-accent" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const readAccent = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#22d3ee'

export function HeroMarkCanvas({ anchorRef }: { anchorRef: RefObject<HTMLButtonElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const anchor = anchorRef.current
    if (!canvas || !anchor) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    let w = 0, h = 0, cx = 0, cy = 0, rx = 0, ry = 0, radius = 1.5
    // False when the hit area is hidden (narrow phones): nothing is drawn then.
    let shown = false
    // How much the figure swells during the wind-up: small marks grow more.
    let grow = 0.3
    let dots: Dot[] = []
    let figure = 0
    let phase: Phase = 'idle'
    let phaseStart = performance.now()
    let idleStart = phaseStart
    let raf = 0, last = phaseStart, frame = 0
    let color = readAccent()

    const home = (i: number, fig: number, drift: number) => {
      const [x, y] = curve(fig, (i / dots.length) * Math.PI * 2, drift)
      return [x * rx, y * ry] as const
    }

    // Where the hit area sits on the canvas. Measured every frame: the hero's
    // entrance animation slides it into place after the first layout, and a
    // one-off measurement would leave the figure drawn below its box.
    const locate = () => {
      const host = canvas.getBoundingClientRect()
      const box = anchor.getBoundingClientRect()
      cx = box.left - host.left + box.width / 2
      cy = box.top - host.top + box.height / 2
    }

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const box = anchor.getBoundingClientRect()
      shown = box.width > 0
      locate()
      rx = box.width * 0.46
      ry = box.height * 0.46
      radius = Math.max(1.3, box.width / 200)
      grow = Math.min(1.1, Math.max(0.2, 170 / box.width - 0.9))
      const count = Math.round(Math.min(340, Math.max(160, box.width * 1.1)))
      dots = Array.from({ length: count }, () => ({ x: 0, y: 0, vx: 0, vy: 0, sx: 0, sy: 0 }))
      phase = 'idle'
      idleStart = performance.now()
    }

    const burst = (now: number) => {
      const reach = Math.max(w, h) / 900
      for (const d of dots) {
        const len = Math.hypot(d.x, d.y) || 1
        const ux = d.x / len, uy = d.y / len
        const speed = (7 + Math.random() * 18) * reach
        d.vx = ux * speed - uy * speed * 0.45 + (Math.random() - 0.5) * 3
        d.vy = uy * speed + ux * speed * 0.45 + (Math.random() - 0.5) * 3
      }
      phase = 'fly'
      phaseStart = now
      const host = canvas.getBoundingClientRect()
      const clientX = host.left + cx, clientY = host.top + cy
      window.dispatchEvent(new CustomEvent<ShockwaveDetail>(SHOCKWAVE_EVENT, { detail: { clientX, clientY } }))
      blastPage(clientX, clientY)
    }

    const draw = (now: number) => {
      const f = Math.min(3, (now - last) / (1000 / 60))
      last = now
      if (++frame % 30 === 1) color = readAccent()
      locate()
      const t = (now - phaseStart) / 1000

      ctx.clearRect(0, 0, w, h)
      if (!shown) {
        raf = requestAnimationFrame(draw)
        return
      }

      if (phase === 'spin' && t >= SPIN) burst(now)
      else if (phase === 'fly' && t >= FLY) {
        phase = 'rebuild'
        phaseStart = now
        figure++
      } else if (phase === 'fade-out' && t >= FADE) {
        phase = 'fade-in'
        phaseStart = now
        figure++
        idleStart = now
      } else if (phase === 'fade-in' && t >= FADE) phase = 'idle'

      ctx.fillStyle = color
      const n = dots.length
      const idle = phase === 'idle' || phase === 'fade-out' || phase === 'fade-in'
      const drift = (now - idleStart) * 0.00035
      // A bright "beam" sweeps along the curve like a scope trace.
      const head = ((now * 0.00011) % 1) * n
      // Time within the current phase, read after any transition above.
      const tNow = (now - phaseStart) / 1000
      const fade = phase === 'fade-out' ? 1 - tNow / FADE : phase === 'fade-in' ? tNow / FADE : 1
      let settled = phase === 'rebuild'

      for (let i = 0; i < n; i++) {
        const d = dots[i]
        let alpha = 1
        if (idle) {
          const [hx, hy] = home(i, figure, drift)
          d.x = hx
          d.y = hy
          const behind = (head - i + n) % n
          alpha = (0.3 + 0.7 * Math.exp(-behind / (n * 0.15))) * Math.max(0, Math.min(1, fade))
        } else if (phase === 'spin') {
          // Swells first (easing out with a little overshoot), while the spin and
          // twist build up to the burst.
          const k = Math.min(1, tNow / SPIN)
          const e = k * k * k
          const g = Math.min(1, k / 0.55)
          const swell = 1 + 2.2 * (g - 1) ** 3 + 1.2 * (g - 1) ** 2
          const r = Math.hypot(d.sx, d.sy)
          const ang = e * Math.PI * 2.4 + e * r * 0.03
          const sc = 1 + grow * swell
          const cos = Math.cos(ang), sin = Math.sin(ang)
          d.x = (d.sx * cos - d.sy * sin) * sc
          d.y = (d.sx * sin + d.sy * cos) * sc
        } else {
          // Rebuild runs along the curve, so the new figure draws itself like a pen.
          const startsAt = (i / n) * REDRAW
          const returning = phase === 'rebuild' && tNow >= startsAt
          if (returning) {
            const [hx, hy] = home(i, figure, 0)
            const ramp = Math.min(1, (tNow - startsAt) / DOT_RAMP)
            const k = 0.01 + 0.07 * ramp * ramp
            d.vx = (d.vx + (hx - d.x) * k * f) * 0.8 ** f
            d.vy = (d.vy + (hy - d.y) * k * f) * 0.8 ** f
            if (Math.abs(hx - d.x) + Math.abs(hy - d.y) > 0.5 || Math.abs(d.vx) + Math.abs(d.vy) > 0.1) settled = false
          } else {
            d.vx *= 0.93 ** f
            d.vy *= 0.93 ** f
            settled = false
            alpha = 0.85
          }
          d.x += d.vx * f
          d.y += d.vy * f
        }
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(cx + d.x, cy + d.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (settled) {
        phase = 'idle'
        idleStart = now
      }
      raf = requestAnimationFrame(draw)
    }

    const trigger = () => {
      if (phase !== 'idle' || !shown) return
      phaseStart = performance.now()
      if (reduce.matches) {
        phase = 'fade-out'
        return
      }
      for (const d of dots) {
        d.sx = d.x
        d.sy = d.y
      }
      phase = 'spin'
    }

    anchor.addEventListener('click', trigger)
    const resize = new ResizeObserver(layout)
    resize.observe(canvas)
    resize.observe(anchor)
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf)
      if (entry.isIntersecting) {
        last = performance.now()
        raf = requestAnimationFrame(draw)
      }
    })
    visibility.observe(canvas)
    layout()
    anchor.dataset.live = ''

    return () => {
      cancelAnimationFrame(raf)
      anchor.removeEventListener('click', trigger)
      resize.disconnect()
      visibility.disconnect()
      delete anchor.dataset.live
    }
  }, [anchorRef])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" aria-hidden="true" />
}
