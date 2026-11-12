import { describe, expect, it } from 'vitest'
import { NAME_PIECES, litLetters, getLitPieces, setLitPieces, subscribeLitPieces, BANANA_PALETTE, BANANA_SPRITE, SHOWER, SPARKLE_COLORS, UNLOCK_AT, bananaAt, makeShower, makeSparkle, nextShowerDelay, recordTap, stepSparkle, tapCount, tickerItems } from './party'
import { nextTheme } from './theme'

describe('recordTap', () => {
  it('enters party on every fourth tap, counting every tap for the banner', () => {
    const before = tapCount()
    const results = Array.from({ length: UNLOCK_AT * 2 }, () => recordTap())
    expect(results.map((r, i) => (r ? i : -1)).filter((i) => i >= 0)).toEqual([UNLOCK_AT - 1, UNLOCK_AT * 2 - 1])
    expect(tapCount() - before).toBe(UNLOCK_AT * 2)
  })

  it('ignores taps made while already partying, so leaving takes four fresh taps to return', () => {
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

describe('banana rain', () => {
  it('has a rectangular sprite drawn only in palette colours', () => {
    const width = BANANA_SPRITE[0].length
    for (const row of BANANA_SPRITE) {
      expect(row).toHaveLength(width)
      for (const ch of row) if (ch !== '.') expect(BANANA_PALETTE[ch]).toBeDefined()
    }
  })

  it('waits 20 to 40 seconds between showers', () => {
    expect(nextShowerDelay(() => 0)).toBe(SHOWER.min)
    expect(nextShowerDelay(() => 0.999)).toBeLessThan(SHOWER.max)
  })

  it('drops 15 to 25 bananas, all starting above the screen and across its width', () => {
    for (const r of [0, 0.5, 0.999]) {
      const shower = makeShower(400, () => r)
      expect(shower.length).toBeGreaterThanOrEqual(15)
      expect(shower.length).toBeLessThanOrEqual(25)
      for (const b of shower) {
        expect(b.y).toBeLessThan(0)
        expect(b.x).toBeGreaterThanOrEqual(0)
        expect(b.x).toBeLessThanOrEqual(400)
        expect(b.scale).toBeGreaterThanOrEqual(2)
        expect(b.scale).toBeLessThanOrEqual(4)
      }
    }
  })

  it('falls, spins, and is gone a few seconds later', () => {
    const [b] = makeShower(400, () => 0.5)
    const start = bananaAt(b, 0, 800), later = bananaAt(b, b.delay + 1, 800)
    expect(later.y).toBeGreaterThan(start.y)
    expect(later.angle).not.toBe(start.angle)
    expect(start.gone).toBe(false)
    expect(bananaAt(b, b.delay + 5, 800).gone).toBe(true)
  })
})

describe('name progress', () => {
  it('lights Josh, ua, Zill, wood: one piece per tap, the whole name by the last', () => {
    expect(NAME_PIECES).toHaveLength(UNLOCK_AT)
    expect(litLetters(0)).toBe(0)
    expect(litLetters(1)).toBe(4)
    expect(litLetters(2)).toBe(6)
    expect(litLetters(3)).toBe(10)
    expect(litLetters(UNLOCK_AT)).toBe('JoshuaZillwood'.length)
  })

  it('splits the name at the right letters', () => {
    const letters = [...'JoshuaZillwood']
    const pieces: string[] = []
    let at = 0
    for (const n of NAME_PIECES) {
      pieces.push(letters.slice(at, at + n).join(''))
      at += n
    }
    expect(pieces).toEqual(['Josh', 'ua', 'Zill', 'wood'])
  })

  it('notifies subscribers only when the lit count changes', () => {
    let calls = 0
    const off = subscribeLitPieces(() => calls++)
    setLitPieces(2)
    setLitPieces(2)
    setLitPieces(3)
    off()
    setLitPieces(0)
    expect(calls).toBe(2)
    expect(getLitPieces()).toBe(0)
  })
})
