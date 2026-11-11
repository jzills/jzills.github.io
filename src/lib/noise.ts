// 2D gradient (Perlin) noise and fractal Brownian motion, for organic motion.
// Deterministic: the permutation table comes from a fixed seed.

const perm = new Uint8Array(512)
{
  const p = Array.from({ length: 256 }, (_, i) => i)
  // Fisher-Yates with a small LCG so every load gets the same field.
  let seed = 1337
  for (let i = 255; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Dot product with one of 8 gradient directions picked by the hash.
function grad(hash: number, x: number, y: number) {
  switch (hash & 7) {
    case 0: return x + y
    case 1: return -x + y
    case 2: return x - y
    case 3: return -x - y
    case 4: return x
    case 5: return -x
    case 6: return y
    default: return -y
  }
}

// Smooth noise in roughly -1..1, continuous in x and y.
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const X = xi & 255, Y = yi & 255
  const u = fade(xf), v = fade(yf)
  const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1]
  const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1]
  const n = lerp(
    lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
    v,
  )
  // 2D gradient noise peaks near ±0.7 with these gradients; scale toward ±1.
  return Math.max(-1, Math.min(1, n * 1.4))
}

// Several octaves of noise, each twice the frequency and half the weight of
// the last: broad swells with finer churn on top. Stays within -1..1.
export function fbm2(x: number, y: number, octaves = 4): number {
  let sum = 0, weight = 0, amp = 1, freq = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq)
    weight += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / weight
}
