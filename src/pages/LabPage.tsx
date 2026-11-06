import { useEffect, useMemo, useState } from 'react'
import { m } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { MotionProvider } from '@/components/layout/MotionProvider'
import { CreativeCard } from '@/components/ui/CreativeCard'
import { Lightbox } from '@/components/ui/Lightbox'
import { creativeItems } from '@/data/creative'
import type { CreativeItem } from '@/data/creative'
import { labId } from '@/lib/anchors'
import { revealOnScroll, rise } from '@/lib/motion'
import { scrollToHash } from '@/lib/pages'

type Kind = CreativeItem['kind']

const kindLabels: Record<Kind, string> = {
  shader: 'Shaders',
  image: 'Images',
  video: 'Video',
  audio: 'Audio',
  music: 'Music',
}

// One chip is active at a time, across both rows: All, a kind, or a technique tag.
type Filter = { id: string; label: string; matches: (item: CreativeItem) => boolean }

const all: Filter = { id: 'all', label: 'All', matches: () => true }

// Only kinds that have work get a chip, so the row grows as the lab does.
// Anything you can listen to: audio and Bandcamp cards, and videos with a soundtrack.
const hasSound = (item: CreativeItem) =>
  item.kind === 'audio' || item.kind === 'music' || (item.kind === 'video' && item.sound === true)

// Audio and music kinds fold into the one Audio chip below.
const soundKinds: Kind[] = ['audio', 'music']
const kindFilters: Filter[] = [
  ...[...new Set(creativeItems.map((item) => item.kind))]
    .filter((kind) => !soundKinds.includes(kind))
    .map((kind): Filter => ({ id: kind, label: kindLabels[kind], matches: (item) => item.kind === kind })),
  ...(creativeItems.some(hasSound) ? [{ id: 'sound', label: 'Audio', matches: hasSound }] : []),
]

// Tags that name a technique, in display order. Only those some item carries get a chip.
const techniqueFilters: Filter[] = ['Ray Marching', '2D', 'Noise', 'Voronoi', 'Fractal', 'Terrain']
  .filter((tag) => creativeItems.some((item) => item.tags.includes(tag)))
  .map((tag) => ({ id: `tag:${tag}`, label: tag, matches: (item) => item.tags.includes(tag) }))

const rows: { label: string; filters: Filter[] }[] = [
  { label: 'Filter by type', filters: kindFilters.length > 1 ? [all, ...kindFilters] : [] },
  { label: 'Filter by technique', filters: techniqueFilters },
].filter((row) => row.filters.length > 0)

const countOf = (filter: Filter) => creativeItems.filter(filter.matches).length

// Grid cells in display order. Music cards are short (a player and chips), so
// consecutive ones pair up and two stack into one cell.
function toCells(items: CreativeItem[]): CreativeItem[][] {
  const cells: CreativeItem[][] = []
  for (const item of items) {
    const last = cells[cells.length - 1]
    if (item.kind === 'music' && last?.length === 1 && last[0].kind === 'music') last.push(item)
    else cells.push([item])
  }
  return cells
}

export function LabPage() {
  const [filter, setFilter] = useState<Filter>(all)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [openVariant, setOpenVariant] = useState(0)

  useEffect(scrollToHash, [])

  const visible = useMemo(() => creativeItems.filter(filter.matches), [filter])
  // Audio and music play inline, so the lightbox steps through everything else.
  const openable = useMemo<CreativeItem[]>(() => visible.filter((item) => item.kind !== 'audio' && item.kind !== 'music'), [visible])

  return (
    <MotionProvider>
      <div className="min-h-screen bg-bg">
        <Navigation />
        <main className="max-w-[1100px] mx-auto px-6 pt-32 pb-24">
          <header className="page-rise mb-12">
            <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">Creative &amp; Experimental</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-fg tracking-tight mb-4">Lab</h1>
            <p className="text-muted text-base max-w-2xl leading-relaxed">
              Shaders, computer vision experiments, and other generative work. The shaders run live in
              your browser. Select any piece to view it full-size.
            </p>
          </header>

          <div className="flex flex-col gap-3 mb-8">
            {rows.map((row) => (
              <div key={row.label} role="group" aria-label={row.label} className="flex flex-wrap gap-2">
                {row.filters.map((f) => {
                  const selected = filter.id === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f)}
                      aria-pressed={selected}
                      className={`px-3 py-1 rounded-full border text-sm transition-colors cursor-pointer ${
                        selected ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:text-fg'
                      }`}
                    >
                      {f.label} <span className="font-mono text-xs opacity-70">{countOf(f)}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Keyed by filter so the stagger replays when the selection changes. */}
          <m.div key={filter.id} {...revealOnScroll} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toCells(visible).map((cell) => (
              // A music pair splits the cell's height, which the row's tallest card sets.
              <m.div key={cell[0].title} variants={rise} className="flex flex-col gap-4">
                {cell.map((item) => {
                  const lightboxIndex = openable.indexOf(item)
                  return (
                    <div key={item.title} id={labId(item.title)} className="flex-1">
                      <CreativeCard
                        item={item}
                        onOpen={
                          lightboxIndex >= 0
                            ? (variant = 0) => {
                                setOpenVariant(variant)
                                setOpenIndex(lightboxIndex)
                              }
                            : undefined
                        }
                        paused={openIndex !== null}
                      />
                    </div>
                  )
                })}
              </m.div>
            ))}
          </m.div>
        </main>
        <Footer />

        <Lightbox items={openable} index={openIndex} initialVariant={openVariant} onIndexChange={setOpenIndex} />
      </div>
    </MotionProvider>
  )
}
