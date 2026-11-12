import { describe, expect, it } from 'vitest'
import { LOOKS, TAIL_RANGE, lookCycle, rollTailStyle, sweepPush, tailLineCount } from './wind'
import { strongestGust } from './gust'

describe('lookCycle', () => {
  it('starts at streaks and loops through every look in order', () => {
    const next = lookCycle()
    const seen = Array.from({ length: LOOKS.length * 2 + 1 }, next)
    expect(seen).toEqual([...LOOKS, ...LOOKS, LOOKS[0]])
    expect(seen[0]).toBe('streaks')
  })

  it('keeps separate cycles independent', () => {
    const a = lookCycle(), b = lookCycle()
    a()
    a()
    expect(b()).toBe('streaks')
  })
})

describe('rollTailStyle', () => {
  it('lands every property inside its range', () => {
    for (const r of [0, 0.25, 0.5, 0.999]) {
      const style = rollTailStyle(() => r)
      for (const key of Object.keys(TAIL_RANGE) as (keyof typeof TAIL_RANGE)[]) {
        const [lo, hi] = TAIL_RANGE[key]
        expect(style[key]).toBeGreaterThanOrEqual(lo)
        expect(style[key]).toBeLessThanOrEqual(hi)
      }
    }
  })

  it('spans the range from shortest and faintest to longest and brightest', () => {
    const low = rollTailStyle(() => 0), high = rollTailStyle(() => 0.9999)
    expect(low.length).toBe(TAIL_RANGE.length[0])
    expect(high.length).toBe(TAIL_RANGE.length[1])
    expect(high.intensity).toBeGreaterThan(low.intensity)
  })

  it('rolls whole frames of history', () => {
    expect(Number.isInteger(rollTailStyle(() => 0.37).length)).toBe(true)
  })

  it('varies between blasts', () => {
    const styles = Array.from({ length: 20 }, () => rollTailStyle())
    expect(new Set(styles.map((s) => s.length)).size).toBeGreaterThan(1)
    expect(new Set(styles.map((s) => s.intensity)).size).toBeGreaterThan(1)
  })
})

describe('tailLineCount', () => {
  it('gives a letter one or two lines and a wide block more', () => {
    expect(tailLineCount(20, 40, 1)).toBeLessThanOrEqual(2)
    expect(tailLineCount(300, 30, 1)).toBeGreaterThan(tailLineCount(20, 40, 1))
  })

  it('always trails at least one line and at most six', () => {
    expect(tailLineCount(5, 5, 0.1)).toBe(1)
    expect(tailLineCount(2000, 2000, 5)).toBe(6)
  })
})

describe('sweepPush', () => {
  const origin = { x: 0, y: 0 }
  const reach = 1000

  it('does nothing before the front arrives or after it has passed', () => {
    // A piece 800px out along the sweep (dir 0 = +x); the front moves 1600px/s.
    expect(sweepPush(800, 0, 0.1, origin, 0, reach)).toEqual({ vx: 0, vy: 0 })
    expect(sweepPush(800, 0, 2, origin, 0, reach)).toEqual({ vx: 0, vy: 0 })
  })

  it('pushes along the sweep direction while the front passes', () => {
    // The front reaches 800px at t = 0.5 and its band is 300px wide.
    const mid = sweepPush(800, 0, 0.5 + 150 / 1600, origin, 0, reach)
    expect(mid.vx).toBeGreaterThan(0)
    expect(mid.vy).toBeCloseTo(0)
    const down = sweepPush(0, 800, 0.5 + 150 / 1600, origin, Math.PI / 2, reach)
    expect(down.vy).toBeGreaterThan(0)
  })
})

describe('strongestGust', () => {
  it('is stable for a seed and differs between seeds', () => {
    expect(strongestGust(12.5)).toBe(strongestGust(12.5))
    const dirs = new Set([1, 50, 200, 700].map((s) => strongestGust(s).toFixed(3)))
    expect(dirs.size).toBeGreaterThan(1)
  })
})
