import { spiralTunnel } from '@/data/shaders/spiralTunnel'
import { pseudoFractal } from '@/data/shaders/pseudoFractal'
import { electricRailway } from '@/data/shaders/electricRailway'

type BaseItem = {
  title: string
  description: string
  tags: string[]
  // Featured items also appear in the landing page carousel; everything appears on /lab.
  featured?: boolean
}

export type ShaderItem = BaseItem & {
  kind: 'shader'
  fragmentShader: string
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
    fragmentShader: spiralTunnel,
    featured: true,
  },
  {
    kind: 'shader',
    title: 'Pseudo Fractal #5',
    description: 'Procedural SDF generated through iterative coordinate folding, rotation, and domain repetition.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
    fragmentShader: pseudoFractal,
    featured: true,
  },
  {
    kind: 'shader',
    title: 'Electric Railway to Nowhere-Ville',
    description: 'Ray-marched infinite railway assembled from tiled signed distance fields, animated electrical arcs, and procedural atmospheric glow.',
    tags: ['GLSL', 'Ray Marching', 'Generative'],
    fragmentShader: electricRailway,
    featured: true,
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
