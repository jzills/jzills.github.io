import { describe, expect, it } from 'vitest'
import { fbm2, noise2 } from './noise'

const grid = (fn: (x: number, y: number) => number) => {
  const out: number[] = []
  for (let i = 0; i < 60; i++) for (let j = 0; j < 60; j++) out.push(fn(i * 0.37 - 7, j * 0.29 + 3))
  return out
}

describe('noise2', () => {
  it('is deterministic', () => {
    expect(noise2(1.23, 4.56)).toBe(noise2(1.23, 4.56))
  })

  it('stays within -1..1 and actually varies', () => {
    const values = grid(noise2)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-1)
    expect(Math.max(...values)).toBeLessThanOrEqual(1)
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.8)
  })

  it('is zero on integer lattice points', () => {
    expect(noise2(3, 8)).toBeCloseTo(0)
  })

  it('is continuous: tiny steps give tiny changes', () => {
    for (const [x, y] of [[0.4, 0.7], [5.1, -2.3], [12.9, 3.3]]) {
      expect(Math.abs(noise2(x + 1e-4, y) - noise2(x, y))).toBeLessThan(1e-3)
    }
  })
})

describe('fbm2', () => {
  it('stays within -1..1', () => {
    const values = grid((x, y) => fbm2(x, y, 5))
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-1)
    expect(Math.max(...values)).toBeLessThanOrEqual(1)
  })

  it('with one octave is plain noise', () => {
    expect(fbm2(2.2, 1.7, 1)).toBeCloseTo(noise2(2.2, 1.7))
  })
})
