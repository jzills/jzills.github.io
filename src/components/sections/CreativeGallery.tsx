import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CreativeCard } from '@/components/ui/CreativeCard'
import { featuredItems as creativeItems } from '@/data/creative'

export function CreativeGallery() {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)

  if (creativeItems.length === 0) return null

  const prev = () => {
    setDir(-1)
    setIndex((i) => (i - 1 + creativeItems.length) % creativeItems.length)
  }

  const next = () => {
    setDir(1)
    setIndex((i) => (i + 1) % creativeItems.length)
  }

  if (creativeItems.length === 1) {
    return (
      <div id="creative-gallery">
        <CreativeCard item={creativeItems[0]} />
      </div>
    )
  }

  return (
    <div id="creative-gallery">
      {/* Card with arrows overlaid on the canvas area (h-48 = 12rem, center = top-32) */}
      <div className="relative group">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={index}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <CreativeCard item={creativeItems[index]} />
          </m.div>
        </AnimatePresence>

        <button
          onClick={prev}
          className="absolute left-2 top-32 -translate-y-1/2 p-1.5 rounded bg-bg/70 text-muted hover:text-fg pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 transition-all duration-200 z-10"
          aria-label="Previous"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-32 -translate-y-1/2 p-1.5 rounded bg-bg/70 text-muted hover:text-fg pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 transition-all duration-200 z-10"
          aria-label="Next"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Padding gives each small dot a comfortable tap target. */}
      <div className="flex justify-center mt-1">
        {creativeItems.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDir(i > index ? 1 : -1); setIndex(i) }}
            className="group/dot p-2"
            aria-label={`Go to item ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
          >
            <span className={`block w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-accent' : 'bg-border group-hover/dot:bg-muted'}`} />
          </button>
        ))}
      </div>
    </div>
  )
}
