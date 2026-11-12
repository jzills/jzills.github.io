import { describe, expect, it } from 'vitest'
import { SPARKLE_COLORS, UNLOCK_AT, makeSparkle, recordTap, stepSparkle, tapCount, tickerItems } from './party'
import { nextTheme } from './theme'

describe('recordTap', () => {
  it('enters party on every fifth tap, counting every tap for the banner', () => {
    const before = tapCount()
    const results = Array.from({ length: UNLOCK_AT * 2 }, () => recordTap())
    expect(results.map((r, i) => (r ? i : -1)).filter((i) => i >= 0)).toEqual([UNLOCK_AT - 1, UNLOCK_AT * 2 - 1])
    expect(tapCount() - before).toBe(UNLOCK_AT * 2)
  })

  it('ignores taps made while already partying, so leaving takes five fresh taps to return', () => {
    for (let i = 0; i < 7; i++) expect(recordTap(false)).toBe(false)
    const back = Array.from({ length: UNLOCK_AT }, () => recordTap())
    expect(back.indexOf(true)).toBe(UNLOCK_AT - 1)
  })
})

describe('nextTheme', () => {
  it('only ever offers dark and light; party leaves to dark', () => {
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('party')).toBe('dark')
  })
})

describe('tickerItems', () => {
  it('reports the real tap count, singular and plural', () => {
    expect(tickerItems(1)).toContain('YOU HAVE BLOWN UP THIS PAGE 1 TIME')
    expect(tickerItems(7)).toContain('YOU HAVE BLOWN UP THIS PAGE 7 TIMES')
  })

  it('has no duplicate items, since they key the rendered list', () => {
    const items = tickerItems(3)
    expect(new Set(items).size).toBe(items.length)
  })
})

describe('sparkles', () => {
  it('cycles through the neon colours', () => {
    const colors = Array.from({ length: SPARKLE_COLORS.length + 1 }, (_, i) => makeSparkle(0, 0, i).color)
    expect(colors.slice(0, -1)).toEqual([...SPARKLE_COLORS])
    expect(colors.at(-1)).toBe(SPARKLE_COLORS[0])
  })

  it('pops upward, falls under gravity, and burns out within its life', () => {
    const s = makeSparkle(100, 100, 0, () => 0.5)
    expect(s.vy).toBeLessThan(0)
    let frames = 0
    while (stepSparkle(s, 1)) frames++
    expect(s.vy).toBeGreaterThan(0)
    expect(frames).toBeLessThanOrEqual(Math.ceil(s.life * 60))
  })
})
