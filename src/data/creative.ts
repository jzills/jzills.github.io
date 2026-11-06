type BaseItem = {
  title: string
  description: string
  tags: string[]
  // Featured items also appear in the landing page carousel; everything appears on /lab.
  featured?: boolean
}

export type ShaderVariant = {
  // Fetches the fragment shader source; each one is its own chunk, loaded when its card mounts.
  load: () => Promise<string>
  // Doesn't use u_time: drawn once, with no animation loop or pause button.
  still?: boolean
}

// One shader, or a series of variants of one idea shown as a single card.
export type ShaderItem = BaseItem & {
  kind: 'shader'
  variants: ShaderVariant[]
}

export type AudioItem = BaseItem & {
  kind: 'audio'
  audioSrc: string
}

// Media files live in public/lab/; width and height reserve layout space before load.
export type LabImage = {
  // Full size, for the lightbox.
  src: string
  // About 800px, for the grid card.
  card: string
  width: number
  height: number
}

// One still, or a series of variants of one idea shown as a single card.
export type ImageItem = BaseItem & {
  kind: 'image'
  images: LabImage[]
  alt: string
}

export type VideoItem = BaseItem & {
  kind: 'video'
  src: string
  poster: string
  alt: string
  // Has an audio track worth hearing: the card shows a play button and volume
  // controls instead of autoplaying muted.
  sound?: boolean
}

export type CreativeItem = ShaderItem | AudioItem | ImageItem | VideoItem

const glsl = import.meta.glob<string>('./shaders/glsl/*.glsl', { query: '?raw', import: 'default' })

// A shader in src/data/shaders/glsl/<name>.glsl.
const shader = (name: string, opts: { still?: boolean } = {}): ShaderVariant => {
  const load = glsl[`./shaders/glsl/${name}.glsl`]
  if (!load) throw new Error(`No shader named ${name}`)
  return { load, ...opts }
}
const still = { still: true }

// Images processed into public/lab/art/<slug>/ as 01.webp, 01-card.webp, 02.webp, …
const art = (slug: string, sizes: [width: number, height: number][]): LabImage[] =>
  sizes.map(([width, height], i) => {
    const name = String(i + 1).padStart(2, '0')
    return { src: `/lab/art/${slug}/${name}.webp`, card: `/lab/art/${slug}/${name}-card.webp`, width, height }
  })

const square = (n: number, size = 2000) => Array.from({ length: n }, (): [number, number] => [size, size])

export const creativeItems: CreativeItem[] = [
  {
    kind: 'shader',
    title: 'Spiral Tunnel',
    description: 'Ray-marched spiral geometry with Perlin noise shading — infinite procedural depth.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
    variants: [shader('spiral-tunnel')],
    featured: true,
  },
  {
    kind: 'shader',
    title: 'Pseudo Fractal #5',
    description: 'Procedural SDF generated through iterative coordinate folding, rotation, and domain repetition.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
    variants: [shader('pseudo-fractal')],
    featured: true,
  },
  {
    kind: 'shader',
    title: 'Electric Railway to Nowhere-Ville',
    description: 'Ray-marched infinite railway assembled from tiled signed distance fields, animated electrical arcs, and procedural atmospheric glow.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
    variants: [shader('electric-railway')],
    featured: true,
  },
  {
    kind: 'shader',
    title: 'Lime Cells',
    description: 'Glossy yellow-green cells that bulge and shift, each edge ringed with a bright seam.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('2dstuff-03')],
  },
  {
    kind: 'shader',
    title: 'Ring of Squares',
    description: 'Eight glowing outlined squares turning in a ring over a dark, softly lit field.',
    tags: ['GLSL', '2D'],
    variants: [shader('2dstuff-01')],
  },
  {
    kind: 'shader',
    title: 'Spheres',
    description: 'Glossy spheres merging into a checkered red and blue world that bends around them.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('spheres04')],
  },
  {
    kind: 'shader',
    title: 'Strange Terrain',
    description: 'A smooth pale-blue landscape of curving ridges and soft, glowing hollows.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('strange-terrain04')],
  },
  {
    kind: 'shader',
    title: 'Symmetry',
    description: 'Radially symmetric forms built from repeated, rotated distance fields: spiked rings, studded crowns, and a ribbed blossom.',
    tags: ['GLSL', 'Ray Marching', 'Series'],
    variants: [shader('symmetry07'), shader('symmetry08'), shader('symmetry09'), shader('symmetry11')],
  },
  {
    kind: 'shader',
    title: 'Liquid Chrome',
    description: 'Cellular patterns with a polished, metallic sheen: a silver honeycomb, a tiled green and violet grid, and a sphere of shards.',
    tags: ['GLSL', '2D', 'Voronoi', 'Series'],
    variants: [shader('combo-14'), shader('combo-13'), shader('combo-11')],
  },
  {
    kind: 'shader',
    title: 'Magenta Lattice',
    description: 'A soft magenta grid of rounded cells dimpling toward a dark center.',
    tags: ['GLSL', '2D'],
    variants: [shader('combo-07', still)],
  },
  {
    kind: 'shader',
    title: 'Fourier Forms',
    description: 'Green organic sculptures shaped by sums of waves: one rippling and turning, one a frozen, streaked swirl.',
    tags: ['GLSL', 'Ray Marching', 'Series'],
    variants: [shader('ft3d-06'), shader('ft3d-07', still)],
  },
  {
    kind: 'shader',
    title: 'Coral Rings',
    description: 'Concentric pink and silver ridges stacked into an ornate, shell-like mandala.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('nu10')],
  },
  {
    kind: 'shader',
    title: 'Banded Capsule',
    description: 'A pale-blue capsule wrapped in fine bands, tumbling slowly in empty space.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('run03')],
  },
  {
    kind: 'shader',
    title: 'Glossy Blobs',
    description: 'Shiny coral-pink blobs and capsules receding into a dark, mirrored distance.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('geom01', still)],
  },
  {
    kind: 'shader',
    title: 'Iridescent Hall',
    description: 'A dense, layered chamber of warped, oil-slick surfaces in rust, teal, and violet.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('geom04-r', still)],
  },
  {
    kind: 'shader',
    title: 'Tendril Garden',
    description: 'Iridescent tendrils, spheres, and twisted forms floating in the dark.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('geom12', still)],
  },
  {
    kind: 'shader',
    title: 'Popcorn 09',
    description: 'A popcorn-map field in hot pink, orange, and electric blue, swirling into a bright eye.',
    tags: ['GLSL', '2D'],
    variants: [shader('popcorn09', still)],
  },
  {
    kind: 'shader',
    title: 'Popcorn 11',
    description: 'Repeating violet glints, like light catching ice, drifting across a deep blue tile.',
    tags: ['GLSL', '2D'],
    variants: [shader('popcorn11')],
  },
  {
    kind: 'shader',
    title: 'Popcorn 12',
    description: 'Liquid blue folds that roll and churn like a slow, glossy sea.',
    tags: ['GLSL', '2D'],
    variants: [shader('popcorn12')],
  },
  {
    kind: 'shader',
    title: 'Popcorn 13',
    description: 'Marbled cream, rust, and navy bands, a popcorn map with sharp contour edges.',
    tags: ['GLSL', '2D'],
    variants: [shader('popcorn13', still)],
  },
  {
    kind: 'shader',
    title: 'Pseudo Fractal 4-05',
    description: 'Rows of lavender arches folded from one shape, repeated toward a cyan horizon.',
    tags: ['GLSL', 'Ray Marching', 'Fractal'],
    variants: [shader('pf4-05')],
  },
  {
    kind: 'shader',
    title: 'Pseudo Fractal 5-06',
    description: 'A neon skyline of folded spikes in blue, violet, and acid green above a glowing floor.',
    tags: ['GLSL', 'Ray Marching', 'Fractal'],
    variants: [shader('pf5-06')],
  },
  {
    kind: 'shader',
    title: 'Pseudo Fractal 6-03',
    description: 'Pearly, knotted limbs reaching in from above and below, mirrored across a dark plane.',
    tags: ['GLSL', 'Ray Marching', 'Fractal'],
    variants: [shader('pf6-03')],
  },
  {
    kind: 'shader',
    title: 'Pseudo Fractal 7-06',
    description: 'An endless pale tunnel of folded rings narrowing to a dark center.',
    tags: ['GLSL', 'Ray Marching', 'Fractal'],
    variants: [shader('pf7-06')],
  },
  {
    kind: 'shader',
    title: 'Reflection',
    description: 'A mossy sphere resting on an endless yellow and green checkerboard.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('reflection01', still)],
  },
  {
    kind: 'shader',
    title: 'Sine Warp I',
    description: 'Oxblood and teal liquid wound into a glossy whirlpool by layered sine waves.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('sw01')],
  },
  {
    kind: 'shader',
    title: 'Sine Warp II',
    description: 'Stained-glass cells in red, blue, and magenta, sheared into diagonal streams.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('sw02')],
  },
  {
    kind: 'shader',
    title: 'Bump Mapping',
    description: 'A small sphere whose surface is roughened into green and violet cells by a bump map.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('bump-mapping-02')],
  },
  {
    kind: 'shader',
    title: 'Normal Mapping',
    description: 'Monochrome triangles split into four quadrants, lit as if carved from the surface.',
    tags: ['GLSL', '2D'],
    variants: [shader('normal-mapping-01')],
  },
  {
    kind: 'shader',
    title: 'Lantern Corridor',
    description: 'An endless hall of blue and silver lantern forms converging on a white-hot vanishing point.',
    tags: ['GLSL', 'Ray Marching', 'Series'],
    variants: [shader('t01', still), shader('t02', still)],
  },
  {
    kind: 'shader',
    title: 'Floating Dunes',
    description: 'Warm, sunlit mushroom forms hovering over a pale desert floor.',
    tags: ['GLSL', 'Ray Marching', 'Series'],
    variants: [shader('t07', still), shader('t08', still)],
  },
  {
    kind: 'shader',
    title: 'Voronoi 01',
    description: 'Shattered mosaic cells in magenta, maroon, and cyan.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('voronoi01')],
  },
  {
    kind: 'shader',
    title: 'Voronoi 04',
    description: 'Deep blue cells blurred into flowing, watery light.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('voronoi04')],
  },
  {
    kind: 'shader',
    title: 'Voronoi 05',
    description: 'Bright blue cells with glowing violet edges, like a crackled glaze.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('voronoi05')],
  },
  {
    kind: 'shader',
    title: 'Voronoi 06',
    description: 'Dark cells outlined in neon blue, each lit by a faint violet glow.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('voronoi06')],
  },
  {
    kind: 'shader',
    title: 'Voronoi 10',
    description: 'Molten pink, orange, and green swirls pulled through a cell pattern.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('voronoi10')],
  },
  {
    kind: 'shader',
    title: 'Voronoi 12',
    description: 'Interference rings in green, blue, and red layered over a cell grid.',
    tags: ['GLSL', '2D', 'Voronoi'],
    variants: [shader('voronoi12')],
  },
  {
    kind: 'shader',
    title: 'Voronoi 14',
    description: 'Lilac cells with soft contour bands, like a topographic map of clouds.',
    tags: ['GLSL', '2D', 'Voronoi', 'Noise'],
    variants: [shader('voronoi14')],
  },
  {
    kind: 'shader',
    title: 'Capsule Cells',
    description: 'Pale-blue capsules and spheres clustering and blending smoothly on a deep blue field.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('capsule-cells')],
  },
  {
    kind: 'shader',
    title: 'Woven Orb',
    description: 'An intricate orb of interlocking pink and teal patterns, turning in the dark.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('n-01')],
  },
  {
    kind: 'shader',
    title: 'Menger Sponge',
    description: 'Flying through the endlessly recursive tunnels of a Menger sponge fractal.',
    tags: ['GLSL', 'Ray Marching', 'Fractal'],
    variants: [shader('menger-sponge')],
  },
  {
    kind: 'shader',
    title: 'Perlin Noise',
    description: 'A silver sphere banded by Perlin noise, lit by a long beam of warm light.',
    tags: ['GLSL', 'Ray Marching', 'Noise'],
    variants: [shader('perlin-noise')],
  },
  {
    kind: 'shader',
    title: 'Hashless Noise',
    description: 'Rippled lavender noise, streaked with flares of pink light.',
    tags: ['GLSL', '2D', 'Noise'],
    variants: [shader('hashless-noise-02')],
  },
  {
    kind: 'shader',
    title: 'Popcorn Texture',
    description: 'A molten amber and violet popcorn texture wrapped around a turning sphere.',
    tags: ['GLSL', 'Ray Marching', 'Noise'],
    variants: [shader('popcorn-texture-01')],
  },
  {
    kind: 'shader',
    title: 'Murky Terrain',
    description: 'Flying low over a hazy, rose-tinted canyon toward a pale sun.',
    tags: ['GLSL', 'Ray Marching', 'Terrain'],
    variants: [shader('murky-terrain')],
  },
  {
    kind: 'shader',
    title: 'Ornate Terrain',
    description: 'A dark, intricately textured mountain rising through mist under a violet sky.',
    tags: ['GLSL', 'Ray Marching', 'Terrain'],
    variants: [shader('ornate-terrain')],
  },
  {
    kind: 'shader',
    title: 'what',
    description: 'Bright white filaments tracing a warped grid across black.',
    tags: ['GLSL', '2D'],
    variants: [shader('what')],
  },
  {
    kind: 'shader',
    title: 'Gyroid',
    description: 'A teal gyroid surface caged inside a glowing lattice sphere.',
    tags: ['GLSL', 'Ray Marching'],
    variants: [shader('gyroid')],
  },
  {
    kind: 'video',
    title: 'Bloom',
    description: 'Glowing petal forms in violet and blue that fold, open, and turn around a green core, set to sound.',
    tags: ['Video', 'Audio', 'Generative'],
    src: '/lab/art/bloom.mp4',
    poster: '/lab/art/bloom-poster.webp',
    alt: 'Luminous violet and blue petal shapes unfolding around a green center on black',
    sound: true,
  },
  {
    kind: 'image',
    title: 'Shatter, Color',
    description: 'Fields of splintered triangles in flat pastel color, densest where the shards converge.',
    tags: ['Series', 'Generative'],
    images: art('msc', square(5)),
    alt: 'Overlapping pastel triangles splintering toward a dense point',
  },
  {
    kind: 'image',
    title: 'Shatter, Mono',
    description: 'The shard compositions in grayscale, from sparse black wedges to dense silver fracture.',
    tags: ['Series', 'Generative'],
    images: art('ms', square(6)),
    alt: 'Gray, black, and white shards fracturing across the frame',
  },
  {
    kind: 'image',
    title: 'Shard Field',
    description: 'Dark fans of slivers in slate blue and moss green, layered into a dense, scratched surface.',
    tags: ['Series', 'Generative'],
    images: art('gm', square(3)),
    alt: 'Dense dark blue and green slivers radiating in overlapping fans',
  },
  {
    kind: 'image',
    title: 'Blooms',
    description: 'Crowded clusters of saturated petal shapes, each ringed with fine contour lines.',
    tags: ['Series', 'Generative'],
    images: art('c', square(2)),
    alt: 'Crowded, brightly colored flower-like shapes outlined with thin lines',
  },
  {
    kind: 'image',
    title: 'Interference',
    description: 'Two frames of a red and navy moiré, rings and bands bending through each other.',
    tags: ['Series', 'Generative'],
    images: art('screen', square(2, 1200)),
    alt: 'Red and navy interference pattern of rings and warped stripes',
  },
  {
    kind: 'image',
    title: 'Thermal',
    description: 'Heat-map color fields of rings and ripples, one scattered and one spiraling into a single center.',
    tags: ['Series', 'Generative'],
    images: art('screenshots', [[838, 694], [840, 696]]),
    alt: 'Rainbow heat-map rings and ripples on a dark background',
  },
  {
    kind: 'image',
    title: 'polyR',
    description: 'Black and white striped polygons tiled at rising density, from bold shapes to fine static.',
    tags: ['Series', 'Generative'],
    images: art('polyr', [[2000, 2000], [2000, 2000], [640, 1136]]),
    alt: 'Black and white striped polygon shapes tiled across the frame',
  },
  {
    kind: 'image',
    title: 'Coral',
    description: 'A rendered growth of knotted, coral-like forms in pink and white.',
    tags: ['Still', 'Generative'],
    images: art('fract', [[2000, 1109]]),
    alt: 'Pink and white coral-like fractal growth against black',
  },
  {
    kind: 'image',
    title: 'Molten',
    description: 'A cavernous surface mottled in electric blue, violet, and ember orange.',
    tags: ['Still', 'Generative'],
    images: art('22', square(1)),
    alt: 'Smooth cave-like surface textured in blue, violet, and orange',
  },
  {
    kind: 'image',
    title: 'Tendrils',
    description: 'Beaded, segmented tendrils curling in from every side toward a bright core.',
    tags: ['Still', 'Generative'],
    images: art('t123', [[800, 600]]),
    alt: 'Pink, green, and purple beaded tendrils spiraling toward a center',
  },
  {
    kind: 'image',
    title: 'Facets',
    description: 'Angular solids hanging over swirling bands of red, violet, and deep blue.',
    tags: ['Still', 'Generative'],
    images: art('5421', square(1, 600)),
    alt: 'Faceted brown and red solids over swirling red and blue bands',
  },
  {
    kind: 'image',
    title: 'Terraces',
    description: 'Columns of stepped gray ridges, like stacked strata seen side on.',
    tags: ['Still', 'Generative'],
    images: art('12', square(1, 1250)),
    alt: 'Vertical columns of stepped gray ridges',
  },
  {
    kind: 'image',
    title: 'Contours',
    description: 'Inked outlines of soft cells, shaded in pale lilac and dark red.',
    tags: ['Still', 'Generative'],
    images: art('test', [[1366, 758]]),
    alt: 'Black outlined blob shapes shaded in lilac and red on white',
  },
  // Add audio items like this:
  // {
  //   kind: 'audio',
  //   title: 'Drone I',
  //   description: 'Evolving drone built from additive synthesis and slow LFO modulation.',
  //   tags: ['Generative Audio', 'Synthesis'],
  //   audioSrc: '/audio/drone-i.mp3',
  // },
]

export const featuredItems = creativeItems.filter((item) => item.featured)
