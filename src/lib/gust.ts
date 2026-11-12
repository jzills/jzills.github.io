import { fbm2 } from '@/lib/noise'

// The blast's gust, shared by the debris (blast.ts) and the visible wind (wind.ts).

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

// The direction this blast's gust blows hardest, sampled at `samples` angles.
// The sweep rolls this way.
export function strongestGust(seed: number, samples = 24): number {
  let best = 0, bestBoost = -Infinity
  for (let k = 0; k < samples; k++) {
    const angle = (k / samples) * Math.PI * 2
    const { boost, deflect } = gustAt(angle, seed)
    if (boost > bestBoost) {
      bestBoost = boost
      best = angle + deflect
    }
  }
  return best
}
