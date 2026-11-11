import { fbm2 } from '@/lib/noise'

// Throws page elements away from a point, then springs them home: the page
// "blowing up" when the hero mark bursts.
//
// Debris is anything marked [data-blast], plus every child of a
// [data-blast-group]. Each piece is a small rigid body written straight to its
// inline transform, so React never re-renders mid-blast. Elements whose
// transform is owned by something else (framer-motion) must not be marked.

interface Body {
  el: HTMLElement
  x: number; y: number; r: number
  vx: number; vy: number; vr: number
  // Seconds after the blast when this piece starts heading home.
  returnAt: number
}

export interface Impulse { vx: number; vy: number; vr: number }

// How one blast bends and scales the push in each direction. Sampled from noise
// around the blast point, so neighbouring pieces get swept the same way like a
// gust, and a new seed per blast makes every blast different.
export interface Gust { deflect: number; boost: number }

export function gustAt(angle: number, seed: number): Gust {
  const cx = Math.cos(angle), cy = Math.sin(angle)
  return {
    // Up to about ±50° off straight-out.
    deflect: fbm2(cx * 1.2 + seed, cy * 1.2 + seed * 0.61) * 0.9,
    // Some directions blow much harder than others.
    boost: 1 + 0.7 * fbm2(cx * 1.7 - seed * 0.3 + 19.1, cy * 1.7 + seed + 7.7),
  }
}

const FLY = 0.85
const RETURN_STAGGER = 0.8
// Seconds for a returning piece's pull to build from gentle to full strength.
const RETURN_RAMP = 0.9
const SHAKE_TARGETS = ['header', '#hero']

let active = false

// The kick a piece gets: away from the blast, weaker with distance, with some
// sideways scatter and spin. Light pieces (single letters) fly further and
// tumble more. `rand` returns 0..1 and is injectable for tests.
export function impulse(
  center: { x: number; y: number },
  size: { width: number; height: number },
  origin: { x: number; y: number },
  reach: number,
  rand: () => number = Math.random,
  gust: Gust = { deflect: 0, boost: 1 },
): Impulse {
  const dx = center.x - origin.x
  const dy = center.y - origin.y
  const dist = Math.hypot(dx, dy)
  const ox = dist > 1 ? dx / dist : rand() - 0.5
  const oy = dist > 1 ? dy / dist : rand() - 0.5
  const cos = Math.cos(gust.deflect), sin = Math.sin(gust.deflect)
  const ux = ox * cos - oy * sin
  const uy = ox * sin + oy * cos
  const light = size.width < 60 && size.height < 90
  const force = ((reach * 0.075) / (1 + dist / (reach * 0.3))) * (light ? 1.25 : 1) * (0.8 + rand() * 0.4) * gust.boost
  return {
    vx: ux * force + (rand() - 0.5) * force * 0.35,
    vy: uy * force - rand() * force * 0.25,
    vr: (rand() - 0.5) * force * (light ? 1.4 : 0.6),
  }
}

function collect(): HTMLElement[] {
  const found = new Set<HTMLElement>()
  document.querySelectorAll<HTMLElement>('[data-blast]').forEach((el) => found.add(el))
  document.querySelectorAll<HTMLElement>('[data-blast-group] > *').forEach((el) => found.add(el))
  return [...found]
}

export function blastPage(originX: number, originY: number, seed = Math.random() * 1000) {
  if (active) return
  const vh = window.innerHeight
  const reach = Math.max(window.innerWidth, vh)
  const origin = { x: originX, y: originY }

  const bodies: Body[] = []
  for (const el of collect()) {
    const rect = el.getBoundingClientRect()
    // Skip hidden (display: none) and off-screen pieces.
    if (!rect.width || rect.bottom < 0 || rect.top > vh) continue
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const gust = gustAt(Math.atan2(center.y - originY, center.x - originX), seed)
    bodies.push({
      el,
      x: 0, y: 0, r: 0,
      ...impulse(center, rect, origin, reach, Math.random, gust),
      returnAt: FLY + Math.random() * RETURN_STAGGER,
    })
  }
  const shakers = SHAKE_TARGETS
    .map((sel) => document.querySelector<HTMLElement>(sel))
    .filter((el): el is HTMLElement => el !== null)

  active = true
  document.documentElement.dataset.blasting = ''
  const start = performance.now()
  let last = start

  const step = (now: number) => {
    // Scale every step to a 60 Hz frame so 120 Hz phones play at the same speed.
    const f = Math.min(3, (now - last) / (1000 / 60))
    last = now
    const t = (now - start) / 1000

    const shake = t < 0.6 ? 16 * Math.exp(-t * 7) : 0
    for (const el of shakers) {
      el.style.transform = shake > 0.3
        ? `translate(${(Math.random() - 0.5) * 2 * shake}px, ${(Math.random() - 0.5) * 2 * shake}px)`
        : ''
    }

    let settled = t > FLY
    for (const b of bodies) {
      if (t < b.returnAt) {
        b.vx *= 0.9 ** f
        // Gravity only while flying, so waiting pieces don't sink off screen.
        b.vy = b.vy * 0.9 ** f + (t < FLY ? 0.45 * f : 0)
        b.vr *= 0.94 ** f
        settled = false
      } else {
        // A spring whose pull ramps up: pieces drift home slowly at first, then
        // tighten and wobble into place.
        const ramp = Math.min(1, (t - b.returnAt) / RETURN_RAMP)
        const k = 0.008 + 0.07 * ramp * ramp
        b.vx = (b.vx - b.x * k * f) * 0.8 ** f
        b.vy = (b.vy - b.y * k * f) * 0.8 ** f
        b.vr = (b.vr - b.r * k * f) * 0.8 ** f
        if (Math.abs(b.x) + Math.abs(b.y) + Math.abs(b.r) > 0.4 || Math.abs(b.vx) + Math.abs(b.vy) > 0.2) settled = false
      }
      b.x += b.vx * f
      b.y += b.vy * f
      b.r += b.vr * f
      b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.r}deg)`
    }

    if (!settled) {
      requestAnimationFrame(step)
      return
    }
    for (const b of bodies) b.el.style.transform = ''
    for (const el of shakers) el.style.transform = ''
    delete document.documentElement.dataset.blasting
    active = false
  }
  requestAnimationFrame(step)
}
