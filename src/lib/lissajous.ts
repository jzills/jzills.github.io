// The hero mark's oscilloscope figures: Lissajous curves, the shapes a scope
// draws when two sine waves drive its x and y.

// [x frequency, y frequency, phase]. Each rebuild moves on to the next figure.
export const FIGURES: readonly (readonly [number, number, number])[] = [
  [3, 2, Math.PI / 2],
  [1, 2, Math.PI / 4],
  [5, 4, Math.PI / 2],
  [3, 4, Math.PI / 4],
  [2, 3, Math.PI / 2],
]

// A point on figure `figure` at parameter s (0..2π), in -1..1 on both axes.
// `drift` slides the x phase, which is what makes the idle figure morph.
export function curve(figure: number, s: number, drift = 0): readonly [number, number] {
  const [a, b, d] = FIGURES[((figure % FIGURES.length) + FIGURES.length) % FIGURES.length]
  return [Math.sin(a * s + d + drift), Math.sin(b * s)]
}

// An SVG polyline `points` string for a figure, closed, scaled into -scale..scale.
export function curvePoints(figure: number, steps = 240, scale = 0.92): string {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const [x, y] = curve(figure, (i / steps) * Math.PI * 2)
    return `${(x * scale).toFixed(3)},${(y * scale).toFixed(3)}`
  }).join(' ')
}

// The hint that the mark can be tapped: until the first tap, the idle figure
// swells and brightens briefly every few seconds. Seconds throughout.
export const PULSE = { delay: 3, every: 5, length: 0.7 }

// 0 except during a pulse, where it rises and falls smoothly to 1 and back.
// `idleFor` is seconds since the figure last came to rest.
export function pulseAt(idleFor: number): number {
  if (idleFor < PULSE.delay) return 0
  const p = ((idleFor - PULSE.delay) % PULSE.every) / PULSE.length
  return p < 1 ? Math.sin(Math.PI * p) ** 2 : 0
}
