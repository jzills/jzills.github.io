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
export type ImageItem = BaseItem & {
  kind: 'image'
  src: string
  alt: string
  width: number
  height: number
}

export type VideoItem = BaseItem & {
  kind: 'video'
  src: string
  poster: string
  alt: string
}

export type CreativeItem = ShaderItem | AudioItem | ImageItem | VideoItem

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
  // Add OpenCV stills and videos like this (files in public/lab/):
  // {
  //   kind: 'image',
  //   title: 'Edge Flow',
  //   description: 'Canny edges traced into flow lines.',
  //   tags: ['OpenCV', 'Python'],
  //   src: '/lab/edge-flow.webp',
  //   alt: 'Bright flowing edge lines on a dark background',
  //   width: 1600,
  //   height: 1067,
  // },
  // {
  //   kind: 'video',
  //   title: 'Contour Drift',
  //   description: 'Frame-by-frame contour extraction from street footage.',
  //   tags: ['OpenCV', 'Video'],
  //   src: '/lab/contour-drift.mp4',
  //   poster: '/lab/contour-drift.jpg',
  //   alt: 'Animated contour lines tracing moving shapes',
  // },
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
