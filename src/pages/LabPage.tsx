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

type Filter = 'all' | CreativeItem['kind']

const filterLabels: Record<Filter, string> = {
  all: 'All',
  shader: 'Shaders',
  image: 'Images',
  video: 'Video',
  audio: 'Audio',
}

// Only kinds that have work get a filter, so the bar grows as the lab does.
const kinds = [...new Set(creativeItems.map((item) => item.kind))]
const filters: Filter[] = kinds.length > 1 ? ['all', ...kinds] : []

// Tags that name a technique, in display order. Only those some item carries get a chip.
const techniques = ['Ray Marching', '2D', 'Noise', 'Voronoi', 'Fractal', 'Terrain'].filter((t) =>
  creativeItems.some((item) => item.tags.includes(t)),
)

const matchesKind = (item: CreativeItem, f: Filter) => f === 'all' || item.kind === f
const matchesTechnique = (item: CreativeItem, t: string | null) => t === null || item.tags.includes(t)

const chipClass = (selected: boolean, empty = false) =>
  `px-3 py-1 rounded-full border text-sm transition-colors ${
    selected
      ? 'border-accent text-accent bg-accent/10 cursor-pointer'
      : empty
        ? 'border-border text-muted/50 cursor-default'
        : 'border-border text-muted hover:text-fg cursor-pointer'
  }`

export function LabPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [technique, setTechnique] = useState<string | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [openVariant, setOpenVariant] = useState(0)

  useEffect(scrollToHash, [])

  const visible = useMemo(
    () => creativeItems.filter((item) => matchesKind(item, filter) && matchesTechnique(item, technique)),
    [filter, technique],
  )
  // Audio plays inline, so the lightbox steps through everything else.
  const openable = useMemo<CreativeItem[]>(() => visible.filter((item) => item.kind !== 'audio'), [visible])

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

          {/* Each row's counts reflect the other row's selection, so a count is what a tap shows.
              A chip that would show nothing stays in place, dimmed, so the rows don't reflow. */}
          <div className="flex flex-col gap-3 mb-8">
            {filters.length > 0 && (
              <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
                {filters.map((f) => {
                  const count = creativeItems.filter((i) => matchesKind(i, f) && matchesTechnique(i, technique)).length
                  const selected = filter === f
                  const empty = count === 0 && !selected
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      disabled={empty}
                      aria-pressed={selected}
                      className={chipClass(selected, empty)}
                    >
                      {filterLabels[f]} <span className="font-mono text-xs opacity-70">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {techniques.length > 0 && (
              <div role="group" aria-label="Filter by technique" className="flex flex-wrap gap-2">
                {techniques.map((t) => {
                  const count = creativeItems.filter((i) => matchesKind(i, filter) && matchesTechnique(i, t)).length
                  const selected = technique === t
                  const empty = count === 0 && !selected
                  return (
                    <button
                      key={t}
                      type="button"
                      // Tapping the chosen technique again clears it.
                      onClick={() => setTechnique(selected ? null : t)}
                      disabled={empty}
                      aria-pressed={selected}
                      className={chipClass(selected, empty)}
                    >
                      {t} <span className="font-mono text-xs opacity-70">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Keyed by the filters so the stagger replays when the selection changes. */}
          <m.div key={`${filter}-${technique}`} {...revealOnScroll} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((item) => {
              const lightboxIndex = openable.indexOf(item)
              return (
                <m.div key={item.title} variants={rise} id={labId(item.title)}>
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
                </m.div>
              )
            })}
          </m.div>
        </main>
        <Footer />

        <Lightbox items={openable} index={openIndex} initialVariant={openVariant} onIndexChange={setOpenIndex} />
      </div>
    </MotionProvider>
  )
}
