import { describe, expect, it } from 'vitest'
import { SPARKLE_COLORS, UNLOCK_AT, makeSparkle, recordTap, stepSparkle, tapCount, tickerItems } from './party'
import { nextTheme } from './theme'

describe('recordTap', () => {
  it('unlocks on exactly the fifth tap, and never again', () => {
    const results = Array.from({ length: UNLOCK_AT + 3 }, recordTap)
    expect(results.indexOf(true)).toBe(UNLOCK_AT - 1)
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(tapCount()).toBe(UNLOCK_AT + 3)
  })
})

describe('nextTheme', () => {
  it('alternates dark and light while party is locked', () => {
    expect(nextTheme('dark', false)).toBe('light')
    expect(nextTheme('light', false)).toBe('dark')
  })

  it('cycles dark → light → party → dark once unlocked', () => {
    expect(nextTheme('dark', true)).toBe('light')
    expect(nextTheme('light', true)).toBe('party')
    expect(nextTheme('party', true)).toBe('dark')
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
