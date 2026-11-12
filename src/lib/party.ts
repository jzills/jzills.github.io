// Party mode: the hidden 90s theme. The hero mark announces each tap with
// MARK_TAP_EVENT; every fifth tap made outside party mode switches it on
// (PartyLayer), so after leaving it takes five more to come back. Taps count
// rather than blasts, so it works under reduced motion too, where a tap just
// fades the figure instead of blowing up the page.

export const MARK_TAP_EVENT = 'hero-mark-tap'
export const UNLOCK_AT = 5

// Module state so remounting the layer doesn't reset it. `taps` is every tap
// this page view (the banner shows it); `streak` counts toward party mode.
let taps = 0
let streak = 0

// Counts one tap; true when it's the fifth toward party mode. Taps made while
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
