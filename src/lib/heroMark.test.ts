import { describe, expect, it } from 'vitest'
import { FIGURES, curve, curvePoints } from './lissajous'
import { impulse } from './blast'

describe('curve', () => {
  it('stays inside -1..1 on both axes for every figure', () => {
    for (let fig = 0; fig < FIGURES.length; fig++) {
      for (let i = 0; i <= 100; i++) {
        const [x, y] = curve(fig, (i / 100) * Math.PI * 2, 0.7)
        expect(Math.abs(x)).toBeLessThanOrEqual(1)
        expect(Math.abs(y)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('cycles past the last figure back to the first', () => {
    expect(curve(FIGURES.length, 1.2)).toEqual(curve(0, 1.2))
  })

  it('is a closed loop', () => {
    const [x0, y0] = curve(2, 0)
    const [x1, y1] = curve(2, Math.PI * 2)
    expect(x1).toBeCloseTo(x0)
    expect(y1).toBeCloseTo(y0)
  })
})

describe('curvePoints', () => {
  it('has steps + 1 points, all within the scale', () => {
    const points = curvePoints(0, 10, 0.5).split(' ')
    expect(points).toHaveLength(11)
    for (const p of points) {
      for (const v of p.split(',').map(Number)) expect(Math.abs(v)).toBeLessThanOrEqual(0.5)
    }
  })
})

describe('impulse', () => {
  const origin = { x: 500, y: 400 }
  const block = { width: 200, height: 40 }
  const mid = () => 0.5

  it('pushes pieces away from the blast', () => {
    const right = impulse({ x: 800, y: 400 }, block, origin, 1000, mid)
    const above = impulse({ x: 500, y: 100 }, block, origin, 1000, mid)
    expect(right.vx).toBeGreaterThan(0)
    expect(above.vy).toBeLessThan(0)
  })

  it('hits nearer pieces harder', () => {
    const near = impulse({ x: 600, y: 400 }, block, origin, 1000, mid)
    const far = impulse({ x: 1400, y: 400 }, block, origin, 1000, mid)
    expect(Math.hypot(near.vx, near.vy)).toBeGreaterThan(Math.hypot(far.vx, far.vy))
  })

  it('throws light pieces (single letters) harder than blocks', () => {
    const letter = impulse({ x: 700, y: 400 }, { width: 30, height: 50 }, origin, 1000, mid)
    const line = impulse({ x: 700, y: 400 }, block, origin, 1000, mid)
    expect(letter.vx).toBeGreaterThan(line.vx)
  })
})
