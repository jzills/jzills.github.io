// Party mode: the hidden 90s theme. The hero mark announces each tap with
// MARK_TAP_EVENT; every fourth tap made outside party mode switches it on
// (PartyLayer), so after leaving it takes four more to come back. Each tap
// lights the next piece of the name in the hero ("Josh", "ua", "Zill", "wood")
// so the progress shows. Taps count rather than blasts, so it works under
// reduced motion too, where a tap just fades the figure instead of blowing up
// the page.

export const MARK_TAP_EVENT = 'hero-mark-tap'
export const UNLOCK_AT = 4

// How many letters of the name each tap lights, in order: Josh, ua, Zill, wood.
// One piece per tap toward party mode.
export const NAME_PIECES = [4, 2, 4, 4] as const

// Module state so remounting the layer doesn't reset it. `taps` is every tap
// this page view (the banner shows it); `streak` counts toward party mode.
let taps = 0
let streak = 0

// Counts one tap; true when it's the fourth toward party mode. Taps made while
// already partying (`towardParty` false) don't count toward the next entry.
export function recordTap(towardParty = true): boolean {
  taps++
  if (!towardParty) return false
  streak++
  if (streak < UNLOCK_AT) return false
  streak = 0
  return true
}

export const tapCount = () => taps
export const streakCount = () => streak

// Letters of the name lit after `pieces` pieces.
export const litLetters = (pieces: number) =>
  NAME_PIECES.slice(0, Math.max(0, pieces)).reduce((sum, n) => sum + n, 0)

// How many pieces of the name are lit, as a tiny store the hero subscribes to.
let lit = 0
const litListeners = new Set<() => void>()

export const getLitPieces = () => lit

export function setLitPieces(pieces: number) {
  if (pieces === lit) return
  lit = pieces
  litListeners.forEach((listener) => listener())
}

export function subscribeLitPieces(listener: () => void) {
  litListeners.add(listener)
  return () => {
    litListeners.delete(listener)
  }
}

// The scrolling banner along the top, as a 90s homepage would have it.
export function tickerItems(count: number): string[] {
  return [
    'WELCOME TO MY HOMEPAGE!!!',
    `YOU HAVE BLOWN UP THIS PAGE ${count} ${count === 1 ? 'TIME' : 'TIMES'}`,
    'BEST VIEWED AT 800×600',
    '🚧 UNDER CONSTRUCTION 🚧',
    'NOW WITH 100% MORE NEON',
    'THANKS FOR VISITING!!!',
  ]
}

// Neon colours for the sparkle trail, cycled per sparkle.
export const SPARKLE_COLORS = ['#ff2bd6', '#39ff14', '#00f0ff', '#ffe500', '#ff7a00', '#b26bff'] as const

export interface Sparkle {
  x: number; y: number; vx: number; vy: number
  age: number; life: number; size: number; spin: number; color: string
}

// One sparkle thrown off the pointer: a little upward pop, then gravity.
export function makeSparkle(x: number, y: number, index: number, rand: () => number = Math.random): Sparkle {
  return {
    x, y,
    vx: (rand() - 0.5) * 2.4,
    vy: -0.6 - rand() * 1.6,
    age: 0,
    life: 0.6 + rand() * 0.6,
    size: 5 + rand() * 7,
    spin: rand() * Math.PI,
    color: SPARKLE_COLORS[index % SPARKLE_COLORS.length],
  }
}

// Advances a sparkle by f 60 Hz frames; false once it has burnt out.
export function stepSparkle(s: Sparkle, f: number): boolean {
  s.age += f / 60
  if (s.age >= s.life) return false
  s.vy += 0.09 * f
  s.vx *= 0.98 ** f
  s.x += s.vx * f
  s.y += s.vy * f
  s.spin += 0.12 * f
  return true
}

// ── Banana rain ──────────────────────────────────────────────────────────
// Every so often in party mode (and on every blast) a shower of pixel-art
// bananas spins down the screen, 90s clip-art style.

// The banana sprite, one character per pixel: K outline, Y yellow, L light,
// D shade, B brown tip, G green stem, W shine, . transparent.
export const BANANA_SPRITE = [
  '.............KK.',
  '............KGGK',
  '...........KGK..',
  '...........KYK..',
  '..........KYYDK.',
  '..........KYYDK.',
  '.........KLYYDK.',
  '........KLYYYDK.',
  '.......KLYYYDDK.',
  '.....KKLYYYYDK..',
  '...KKLLYYYYDDK..',
  '.KKWLYYYYYDDK...',
  'KBLYYYYYYDDK....',
  'KKBYYYDDDKK.....',
  '.KKKKKKKK.......',
] as const

export const BANANA_PALETTE: Record<string, readonly [number, number, number]> = {
  K: [0, 0, 0],
  Y: [255, 229, 0],
  L: [255, 248, 170],
  D: [224, 168, 0],
  B: [107, 62, 0],
  G: [110, 150, 20],
  W: [255, 255, 255],
}

// Seconds between showers, after the first one shortly after party starts.
export const SHOWER = { first: 3, min: 20, max: 40 }

export const nextShowerDelay = (rand: () => number = Math.random) =>
  SHOWER.min + rand() * (SHOWER.max - SHOWER.min)

export interface Banana {
  x: number; y: number; vy: number
  // Screen pixels per sprite pixel, so 16px of sprite is 32 to 64 on screen.
  scale: number
  angle: number; spin: number
  // Sideways sway: how far, how fast, and where in the swing it starts.
  sway: number; swaySpeed: number; phase: number
  // Seconds into the shower before this one appears, so they don't all drop at once.
  delay: number
}

// One shower: 15 to 25 bananas spread across a screen `width` wide, starting
// just above it with a little stagger.
export function makeShower(width: number, rand: () => number = Math.random): Banana[] {
  const count = 15 + Math.floor(rand() * 11)
  return Array.from({ length: count }, () => {
    const scale = 2 + Math.floor(rand() * 3)
    return {
      x: rand() * width,
      y: -BANANA_SPRITE.length * scale * 1.5,
      vy: 2.6 + rand() * 3,
      scale,
      angle: rand() * Math.PI * 2,
      spin: (rand() < 0.5 ? -1 : 1) * (0.04 + rand() * 0.08),
      sway: 10 + rand() * 30,
      swaySpeed: 1.5 + rand() * 2,
      phase: rand() * Math.PI * 2,
      delay: rand() * 1.2,
    }
  })
}

// Where a banana is t seconds into its shower (after its delay), falling at
// vy px per 60 Hz frame; and whether it has dropped past a screen `height` tall.
export function bananaAt(b: Banana, t: number, height: number) {
  const s = Math.max(0, t - b.delay)
  const y = b.y + b.vy * 60 * s
  return {
    x: b.x + Math.sin(b.phase + s * b.swaySpeed) * b.sway,
    y,
    angle: b.angle + b.spin * 60 * s,
    gone: y > height + BANANA_SPRITE.length * b.scale * 1.5,
  }
}
