import { describe, expect, it } from 'vitest'
import { FIGURES, PULSE, curve, curvePoints, pulseAt } from './lissajous'
import { gustAt, impulse } from './blast'

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

describe('gustAt', () => {
  it('bends by at most about 50 degrees and never reverses the push', () => {
    for (let i = 0; i < 64; i++) {
      const { deflect, boost } = gustAt((i / 64) * Math.PI * 2, 42.5)
      expect(Math.abs(deflect)).toBeLessThanOrEqual(0.9)
      expect(boost).toBeGreaterThan(0)
    }
  })

  it('differs between seeds, so every blast is different', () => {
    const a = gustAt(1, 10), b = gustAt(1, 500)
    expect(a).not.toEqual(b)
  })

  it('is the same for the same direction and seed', () => {
    expect(gustAt(2.1, 77)).toEqual(gustAt(2.1, 77))
  })

  it('rotates the push by its deflection', () => {
    const origin = { x: 0, y: 0 }
    const straight = impulse({ x: 300, y: 0 }, { width: 200, height: 40 }, origin, 1000, () => 0.5)
    const bent = impulse({ x: 300, y: 0 }, { width: 200, height: 40 }, origin, 1000, () => 0.5, { deflect: Math.PI / 2, boost: 1 })
    expect(straight.vx).toBeGreaterThan(0)
    expect(bent.vy).toBeGreaterThan(Math.abs(bent.vx))
  })
})

describe('pulseAt', () => {
  it('stays still before the first pulse is due', () => {
    for (let t = 0; t < PULSE.delay; t += 0.1) expect(pulseAt(t)).toBe(0)
  })

  it('peaks at 1 midway through each pulse and is still between them', () => {
    for (let k = 0; k < 3; k++) {
      const start = PULSE.delay + k * PULSE.every
      expect(pulseAt(start)).toBeCloseTo(0)
      expect(pulseAt(start + PULSE.length / 2)).toBeCloseTo(1)
      expect(pulseAt(start + PULSE.length + 0.5)).toBe(0)
    }
  })

  it('stays within 0..1', () => {
    for (let t = 0; t < 30; t += 0.05) {
      const v = pulseAt(t)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
