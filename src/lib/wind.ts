import { fbm2 } from '@/lib/noise'
import { gustAt, strongestGust } from '@/lib/gust'

// Visible wind for the page blast (blast.ts), drawn on a full-screen overlay
// canvas that exists only while the blast runs. Two layers:
//
//  - a look, which cycles with each blast:
//      streaks  thin scope-style lines shooting out from the burst
//      sweep    one broad gust front rolling across the page, shoving pieces
//      dust     specks carried off along a swirling noise field
//  - tails on every blast: wind lines streaming behind each flying piece. How
//    long, bright, dense and wavy they are is rolled fresh per blast.

export type WindLook = 'streaks' | 'sweep' | 'dust'
export const LOOKS: readonly WindLook[] = ['streaks', 'sweep', 'dust']

// Returns the next look each call, looping. Every page load starts at streaks.
export function lookCycle(looks: readonly WindLook[] = LOOKS) {
  let i = 0
  return () => looks[i++ % looks.length]
}

export interface TailStyle {
  // Frames of history each line keeps: how long the tails get.
  length: number
  // Peak opacity.
  intensity: number
  // Multiplier on how many lines a piece trails.
  density: number
  // Sideways waver, in px at the newest end.
  wobble: number
  // Line width at the newest end, in px.
  width: number
}

export const TAIL_RANGE = {
  length: [8, 26],
  intensity: [0.35, 0.85],
  density: [0.6, 1.6],
  wobble: [0, 10],
  width: [1, 2.2],
} as const satisfies Record<keyof TailStyle, readonly [number, number]>

// One blast's tails, each property drawn independently from its range.
export function rollTailStyle(rand: () => number = Math.random): TailStyle {
  const pick = ([lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo)
  return {
    length: Math.round(pick(TAIL_RANGE.length)),
    intensity: pick(TAIL_RANGE.intensity),
    density: pick(TAIL_RANGE.density),
    wobble: pick(TAIL_RANGE.wobble),
    width: pick(TAIL_RANGE.width),
  }
}

// How many lines a piece trails: more for bigger pieces, scaled by the blast's density.
export function tailLineCount(width: number, height: number, density: number): number {
  const base = Math.round(Math.max(width, height) / 40) + 1
  return Math.max(1, Math.min(6, Math.round(base * density)))
}

// The sweep front: how fast it travels (px/s per px of screen) and how wide
// the band that shoves pieces is (fraction of the screen).
const FRONT_SPEED = 1.6
const FRONT_BAND = 0.3
const SWEEP_PUSH = 2.4
const SWEEP_LEN = 1.4

// The sweep's shove on a piece at (x, y), t seconds into the blast: zero until
// the front reaches it, a smooth push along the gust while the front passes,
// then zero again.
export function sweepPush(
  x: number, y: number, t: number,
  origin: { x: number; y: number }, dir: number, reach: number,
): { vx: number; vy: number } {
  const dx = Math.cos(dir), dy = Math.sin(dir)
  const along = (x - origin.x) * dx + (y - origin.y) * dy
  const passed = t * FRONT_SPEED * reach - along
  const band = reach * FRONT_BAND
  if (passed < 0 || passed > band) return { vx: 0, vy: 0 }
  const k = Math.sin((passed / band) * Math.PI) * SWEEP_PUSH
  return { vx: dx * k, vy: dy * k }
}

// A flying piece as the wind sees it: its resting centre, how far it has
// moved from there, its velocity (px per 60 Hz frame) and its size.
export interface Piece { cx: number; cy: number; x: number; y: number; vx: number; vy: number; w: number; h: number }

export interface Wind {
  // Draws one frame; false once the wind has died away (and the overlay is gone).
  step(t: number, f: number, pieces: readonly Piece[]): boolean
  // Extra velocity for a piece centred at (x, y), t seconds in.
  push(x: number, y: number, t: number): { vx: number; vy: number }
  dispose(): void
}

interface Mote { x: number; y: number; vx: number; vy: number; life: number; age: number; trail: number[]; width: number }
interface Tail { hist: number[]; lines: number[] }

// Tails are stroked in this many bands, each thinner and fainter toward the
// old end, rather than one stroke per segment.
const TAIL_BANDS = 4
// Below this speed (px per frame) a piece's tail shrinks away.
const TAIL_MIN_SPEED = 1.2

// Lines are grouped by opacity and width and each group stroked once per
// frame: hundreds of separate strokes cost too much on slower phones.
const ALPHA_LEVELS = 6
const WIDTH_LEVELS = 4

function strokeBatcher(ctx: CanvasRenderingContext2D, maxWidth: number) {
  const paths = new Map<number, Path2D>()
  return {
    // A path for lines of roughly this opacity (0..1) and width, or null when
    // they'd be invisible.
    path(alpha: number, width: number): Path2D | null {
      const a = Math.min(ALPHA_LEVELS, Math.round(alpha * ALPHA_LEVELS))
      if (a <= 0) return null
      const w = Math.max(1, Math.min(WIDTH_LEVELS, Math.round((width / maxWidth) * WIDTH_LEVELS)))
      const key = a * 16 + w
      let p = paths.get(key)
      if (!p) paths.set(key, (p = new Path2D()))
      return p
    },
    flush() {
      for (const [key, p] of paths) {
        ctx.globalAlpha = Math.floor(key / 16) / ALPHA_LEVELS
        ctx.lineWidth = ((key % 16) / WIDTH_LEVELS) * maxWidth
        ctx.stroke(p)
      }
      paths.clear()
    },
  }
}

export function startWind(look: WindLook, originX: number, originY: number, seed: number, tails: TailStyle): Wind {
  const W = window.innerWidth, H = window.innerHeight
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '60' })
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const color = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#22d3ee'
  const reach = Math.max(W, H)
  const scale = reach / 900
  const origin = { x: originX, y: originY }
  const sweepDir = strongestGust(seed)
  let done = false

  const dispose = () => {
    done = true
    canvas.remove()
  }
  if (!ctx) {
    dispose()
    return { step: () => false, push: () => ({ vx: 0, vy: 0 }), dispose }
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const batch = strokeBatcher(ctx, Math.max(2.4, tails.width))

  // Streaks and dust: motes thrown out along this blast's gust.
  const motes: Mote[] = []
  const spawn = (n: number, speed: () => number, life: () => number, width: () => number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const g = gustAt(a, seed)
      const s = speed() * g.boost
      motes.push({ x: originX, y: originY, vx: Math.cos(a + g.deflect) * s, vy: Math.sin(a + g.deflect) * s, life: life(), age: 0, trail: [], width: width() })
    }
  }
  if (look === 'streaks') spawn(70, () => (14 + Math.random() * 22) * scale, () => 0.7 + Math.random() * 0.6, () => 0.8 + Math.random() * 1.2)
  if (look === 'dust') spawn(240, () => (4 + Math.random() * 16) * scale, () => 1.2 + Math.random() * 1.2, () => 0.8 + Math.random() * 1.6)

  // Sweep: lines riding the front, spread across it.
  const sweepLines = look === 'sweep'
    ? Array.from({ length: 90 }, () => ({
        across: (Math.random() - 0.5) * reach * 2.2,
        lag: Math.random() * reach * 0.35,
        len: (0.08 + Math.random() * 0.22) * reach,
        width: 0.6 + Math.random() * 1.4,
      }))
    : []

  const pieceTails: Tail[] = []

  const stepMotes = (t: number, f: number) => {
    let alive = false
    for (const m of motes) {
      m.age += f / 60
      if (m.age > m.life) continue
      alive = true
      if (look === 'streaks') {
        // Curl a little off straight as they slow.
        const n = fbm2(m.x * 0.004 + seed, m.y * 0.004, 2) * 0.08 * f
        const c = Math.cos(n), s = Math.sin(n)
        ;[m.vx, m.vy] = [m.vx * c - m.vy * s, m.vx * s + m.vy * c]
        m.vx *= 0.94 ** f
        m.vy *= 0.94 ** f
      } else {
        // Steer along a swirling field, keeping the speed.
        const ang = fbm2(m.x * 0.003 + seed, m.y * 0.003 + t * 0.4, 2) * Math.PI * 2.5
        const sp = Math.hypot(m.vx, m.vy)
        m.vx += (Math.cos(ang) * sp - m.vx) * 0.06 * f
        m.vy += (Math.sin(ang) * sp - m.vy) * 0.06 * f
        m.vx *= 0.975 ** f
        m.vy *= 0.975 ** f
      }
      m.x += m.vx * f
      m.y += m.vy * f
      m.trail.push(m.x, m.y)
      const keep = look === 'streaks' ? 28 : 8
      if (m.trail.length > keep) m.trail.splice(0, m.trail.length - keep)
      if (m.trail.length < 4) continue
      const fade = 1 - m.age / m.life
      const path = batch.path((look === 'streaks' ? 0.75 : 0.55) * fade * fade, m.width)
      if (!path) continue
      path.moveTo(m.trail[0], m.trail[1])
      for (let i = 2; i < m.trail.length; i += 2) path.lineTo(m.trail[i], m.trail[i + 1])
    }
    return alive
  }

  const stepSweep = (t: number) => {
    const fade = Math.max(0, 1 - t / SWEEP_LEN)
    if (fade === 0) return false
    const front = t * FRONT_SPEED * reach
    const dx = Math.cos(sweepDir), dy = Math.sin(sweepDir)
    const px = -dy, py = dx
    for (const l of sweepLines) {
      const head = front - l.lag
      if (head < 0) continue
      const wob = fbm2(l.across * 0.003 + seed, t * 2, 2) * reach * 0.04
      const hx = originX + dx * head + px * (l.across + wob)
      const hy = originY + dy * head + py * (l.across + wob)
      const tail = Math.min(l.len * (0.4 + t * 2), head)
      const path = batch.path(0.6 * fade * Math.min(1, head / (reach * 0.15)), l.width)
      if (!path) continue
      path.moveTo(hx, hy)
      path.lineTo(hx - dx * tail, hy - dy * tail)
    }
    return true
  }

  const stepTails = (t: number, pieces: readonly Piece[]) => {
    let alive = false
    pieces.forEach((p, i) => {
      let tail = pieceTails[i]
      if (!tail) {
        const n = tailLineCount(p.w, p.h, tails.density)
        // Spread across the piece's width, with a little jitter.
        const lines = Array.from({ length: n }, (_, k) => (n === 1 ? 0 : k / (n - 1) - 0.5) * 0.8 + (Math.random() - 0.5) * 0.15)
        tail = pieceTails[i] = { hist: [], lines }
      }
      const speed = Math.hypot(p.vx, p.vy)
      const hist = tail.hist
      hist.push(p.cx + p.x, p.cy + p.y)
      if (hist.length > tails.length * 2) hist.splice(0, 2)
      // A slow piece's tail retracts: two points off for the one just added.
      if (speed < TAIL_MIN_SPEED) hist.splice(0, 4)
      const len = hist.length / 2
      if (len < 3) return
      alive = true

      const ux = p.vx / (speed || 1), uy = p.vy / (speed || 1)
      // Lines start at the piece's trailing edge, not its middle.
      const back = (Math.abs(ux) * p.w + Math.abs(uy) * p.h) * 0.5
      const nx = -uy, ny = ux
      const across = Math.abs(nx) * p.w + Math.abs(ny) * p.h
      const peak = tails.intensity * Math.min(1, speed / 14)

      for (const off of tail.lines) {
        const sx = nx * off * across - ux * back
        const sy = ny * off * across - uy * back
        // Newest end (j = len - 1) to oldest, in bands that thin and fade.
        const bandSize = Math.max(1, Math.ceil((len - 1) / TAIL_BANDS))
        for (let hiEnd = len - 1; hiEnd > 0; hiEnd -= bandSize) {
          const loEnd = Math.max(0, hiEnd - bandSize)
          const k = hiEnd / len
          const path = batch.path(peak * k, tails.width * k)
          if (!path) continue
          for (let j = hiEnd; j >= loEnd; j--) {
            const wob = fbm2(j * 0.25 + off * 7 + seed, t * 3, 2) * tails.wobble * (j / len)
            const x = hist[j * 2] + sx + nx * wob, y = hist[j * 2 + 1] + sy + ny * wob
            if (j === hiEnd) path.moveTo(x, y)
            else path.lineTo(x, y)
          }
        }
      }
    })
    return alive
  }

  return {
    step(t, f, pieces) {
      if (done) return false
      ctx.clearRect(0, 0, W, H)
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      const lookAlive = look === 'sweep' ? stepSweep(t) : stepMotes(t, f)
      const tailsAlive = stepTails(t, pieces)
      batch.flush()
      ctx.globalAlpha = 1
      // Hold on for the first moments, before any piece has built a tail.
      const alive = lookAlive || tailsAlive || t < 0.3
      if (!alive) dispose()
      return alive
    },
    push(x, y, t) {
      return look === 'sweep' ? sweepPush(x, y, t, origin, sweepDir, reach) : { vx: 0, vy: 0 }
    },
    dispose,
  }
}
