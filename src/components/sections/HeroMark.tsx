import { useEffect, useRef, type RefObject } from 'react'
import { blastPage } from '@/lib/blast'
import { SHOCKWAVE_EVENT, type ShockwaveDetail } from '@/lib/events'
import { curve, curvePoints, pulseAt } from '@/lib/lissajous'
import { fbm2 } from '@/lib/noise'
import { MARK_TAP_EVENT } from '@/lib/party'

// The hero's easter egg: an oscilloscope figure drawn in dots beside the name.
// Tap it and it swells, spins and twists, bursts, blows the page apart, then
// redraws itself as the next figure, pen-stroke style along the curve. Under
// reduced motion a tap just fades to the next figure.

// Re-exported for the hero's waveform, which reacts to the burst.
export { SHOCKWAVE_EVENT, type ShockwaveDetail }

const SPIN = 0.7
const FLY = 0.8
const REDRAW = 1.3
// Seconds for a returning dot's pull to build to full strength.
const DOT_RAMP = 0.6
const FADE = 0.3
// How much the hint pulse swells the idle figure (see pulseAt).
const PULSE_SCALE = 0.12

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

// fbm2 has a standard deviation of about 0.23; rescale to roughly unit spread
// (clamped) so its weights below read as real amplitudes.
const unit = (n: number) => Math.max(-1.6, Math.min(1.6, n / 0.23))

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

    let w = 0, h = 0, dpr = 0, cx = 0, cy = 0, rx = 0, ry = 0, radius = 1.5
    let boxW = -1, boxH = -1
    // False when the hit area is hidden (narrow phones): nothing is drawn then.
    let shown = false
    // How much the figure swells during the wind-up: small marks grow more.
    let grow = 0.3
    // Fresh for every tap, so each wind-up and burst churns differently.
    let seed = 0
    let spinDir = 1
    // The wind-up's rotation, integrated from a noisy spin speed each frame.
    let spinAngle = 0
    let dots: Dot[] = []
    let figure = 0
    let phase: Phase = 'idle'
    let phaseStart = performance.now()
    let idleStart = phaseStart
    let raf = 0, last = phaseStart, frame = 0
    let color = readAccent()
    // Set by the first tap; the hint pulse stops for good after that.
    let found = false

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

    // Runs on every resize. On iPhones that's constantly while scrolling (the
    // hero tracks the screen height as Safari's toolbar collapses), so it only
    // touches what actually changed, and repaints straight away: resizing a
    // canvas wipes it after this frame's draw, and a blank frame would show.
    const layout = () => {
      const nextDpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.offsetWidth !== w || canvas.offsetHeight !== h || nextDpr !== dpr) {
        w = canvas.offsetWidth
        h = canvas.offsetHeight
        dpr = nextDpr
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      const box = anchor.getBoundingClientRect()
      shown = box.width > 0
      // Only a change to the figure's own box restarts it.
      if (box.width !== boxW || box.height !== boxH) {
        boxW = box.width
        boxH = box.height
        rx = box.width * 0.46
        ry = box.height * 0.46
        radius = Math.max(1.3, box.width / 200)
        grow = Math.min(1.1, Math.max(0.2, 170 / box.width - 0.9))
        const count = Math.round(Math.min(340, Math.max(160, box.width * 1.1)))
        dots = Array.from({ length: count }, () => ({ x: 0, y: 0, vx: 0, vy: 0, sx: 0, sy: 0 }))
        phase = 'idle'
        idleStart = performance.now()
      }
      paint(performance.now())
    }

    const burst = (now: number) => {
      const reach = Math.max(w, h) / 900
      for (const d of dots) {
        const len = Math.hypot(d.x, d.y) || 1
        const ox = d.x / len, oy = d.y / len
        // Noise around the circle turns the spray into uneven jets and lobes,
        // bent off straight-out, and different for every seed.
        const jet = fbm2(ox * 1.6 + seed, oy * 1.6 - seed * 0.7)
        const bend = fbm2(ox * 1.1 - seed * 0.4 + 31.3, oy * 1.1 + seed + 5.9) * 1.1
        const cos = Math.cos(bend), sin = Math.sin(bend)
        const ux = ox * cos - oy * sin, uy = ox * sin + oy * cos
        const speed = (6 + Math.random() * 10 + Math.max(0, jet) * 26) * reach
        const swirl = 0.45 * spinDir
        d.vx = ux * speed - uy * speed * swirl + (Math.random() - 0.5) * 2
        d.vy = uy * speed + ux * speed * swirl + (Math.random() - 0.5) * 2
      }
      phase = 'fly'
      phaseStart = now
      const host = canvas.getBoundingClientRect()
      const clientX = host.left + cx, clientY = host.top + cy
      window.dispatchEvent(new CustomEvent<ShockwaveDetail>(SHOCKWAVE_EVENT, { detail: { clientX, clientY } }))
      blastPage(clientX, clientY, seed)
    }

    const paint = (now: number) => {
      const f = Math.min(3, Math.max(0, (now - last) / (1000 / 60)))
      last = now
      if (++frame % 30 === 1) color = readAccent()
      locate()
      const t = (now - phaseStart) / 1000

      ctx.clearRect(0, 0, w, h)
      if (!shown) return

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
      // The hint pulse: a brightness lift always, plus a swell unless motion is reduced.
      const pulse = phase === 'idle' && !found ? pulseAt((now - idleStart) / 1000) : 0
      const pulseScale = reduce.matches ? 1 : 1 + PULSE_SCALE * pulse

      // Per-frame wind-up state, shared by every dot.
      let breath = 1
      if (phase === 'spin') {
        const k = Math.min(1, tNow / SPIN)
        // Spin speed in rad/s: a floor that builds, plus noise surges that can
        // whip it to several times that, or let it all but stall.
        const surge = Math.max(0, 0.35 + unit(fbm2(tNow * 6.5 + seed, 0.37)) * 0.75)
        spinAngle += spinDir * (2 * k + 16 * k * surge) * (f / 60)
        breath = 1 + 0.45 * unit(fbm2(tNow * 7.5 - seed, 4.2))
      }

      for (let i = 0; i < n; i++) {
        const d = dots[i]
        let alpha = 1
        if (idle) {
          const [hx, hy] = home(i, figure, drift)
          d.x = hx * pulseScale
          d.y = hy * pulseScale
          const behind = (head - i + n) % n
          const trace = 0.3 + 0.7 * Math.exp(-behind / (n * 0.15))
          alpha = Math.min(1, trace + 0.5 * pulse) * Math.max(0, Math.min(1, fade))
        } else if (phase === 'spin') {
          // Noise drives the motion rather than decorating it: the spin speed
          // lurches and stalls (spinAngle, integrated once per frame above),
          // sections of the curve twist apart and bulge out unevenly, and the
          // whole thing breathes. Calm at the tap, churning by the burst.
          //
          // The noise is sampled by position *along* the curve (a point on a
          // circle), broad and with two octaves, so neighbouring dots move
          // together and the line bends instead of shredding. Bulges add to
          // the growth rather than multiply it, so no section can collapse.
          const k = Math.min(1, tNow / SPIN)
          const g = Math.min(1, k / 0.55)
          const swell = 1 + 2.2 * (g - 1) ** 3 + 1.2 * (g - 1) ** 2
          const churn = Math.min(1, k * 1.4) ** 2
          const along = (i / n) * Math.PI * 2
          const ux = Math.cos(along), uy = Math.sin(along)
          const lump = unit(fbm2(ux * 1.2 + tNow * 2.6 + seed, uy * 1.2 - tNow * 1.9, 2))
          const twist = unit(fbm2(ux * 0.9 - tNow * 2.2 + seed + 11.7, uy * 0.9 + tNow * 1.5 + 3.1, 2))
          const ang = spinAngle + spinDir * twist * 0.9 * churn
          const sc = Math.max(0.6, 1 + grow * swell * breath + (grow * 0.7 + 0.3) * lump * churn)
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
    }

    const draw = (now: number) => {
      paint(now)
      raf = requestAnimationFrame(draw)
    }

    const trigger = () => {
      if (phase !== 'idle' || !shown) return
      found = true
      window.dispatchEvent(new Event(MARK_TAP_EVENT))
      phaseStart = performance.now()
      if (reduce.matches) {
        phase = 'fade-out'
        return
      }
      for (const d of dots) {
        d.sx = d.x
        d.sy = d.y
      }
      seed = Math.random() * 1000
      spinDir = Math.random() < 0.5 ? -1 : 1
      spinAngle = 0
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

  return <canvas ref={canvasRef} className="party-hue absolute inset-0 w-full h-full pointer-events-none z-10" aria-hidden="true" />
}
