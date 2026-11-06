import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ShaderCanvas } from '@/components/ui/CreativeCard'
import type { CreativeItem } from '@/data/creative'

interface Props {
  items: CreativeItem[]
  // Index into items of the open item, or null when closed.
  index: number | null
  onIndexChange: (index: number | null) => void
}

const navButtonClass = 'p-2 rounded bg-bg/70 text-muted hover:text-fg transition-colors cursor-pointer'

// How many images an item steps through: a series has several, anything else one.
const variantCount = (item: CreativeItem) => (item.kind === 'image' ? item.images.length : 1)

function LightboxMedia({ item, variant }: { item: CreativeItem; variant: number }) {
  switch (item.kind) {
    case 'shader':
      // Keyed so switching shaders builds a fresh WebGL program instead of reusing the last one.
      return <ShaderCanvas key={item.title} fragmentShader={item.fragmentShader} className="w-full h-[70vh] rounded bg-black" />
    case 'image': {
      const image = item.images[variant]
      const alt = item.images.length > 1 ? `${item.alt} (${variant + 1} of ${item.images.length})` : item.alt
      return (
        <img
          key={image.src}
          src={image.src}
          alt={alt}
          width={image.width}
          height={image.height}
          className="w-auto h-auto max-w-full max-h-[70vh] mx-auto rounded object-contain"
        />
      )
    }
    case 'video':
      return (
        <video
          key={item.src}
          src={item.src}
          poster={item.poster}
          aria-label={item.alt}
          controls
          autoPlay
          // Opened by a click, so a video with sound may start unmuted.
          muted={!item.sound}
          loop
          playsInline
          className="max-w-full max-h-[75vh] mx-auto rounded"
        />
      )
    case 'audio':
      return null
  }
}

// Native <dialog> gives the focus trap, Esc to close, and focus restored to the opener.
export function Lightbox({ items, index, onIndexChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const item = index === null ? null : items[index]
  // The variant shown within a series. Stored with the index it belongs to, so
  // opening any card (a new index) starts at its first variant.
  const [shown, setShown] = useState({ index: -1, variant: 0 })
  const variant = shown.index === index ? shown.variant : 0

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])

  // Arrows walk through a series' variants, then on to the next item; stepping
  // back into a series lands on its last variant.
  const step = (delta: number) => {
    if (index === null || !item) return
    const next = variant + delta
    if (next >= 0 && next < variantCount(item)) {
      setShown({ index, variant: next })
      return
    }
    const nextIndex = (index + delta + items.length) % items.length
    setShown({ index: nextIndex, variant: delta < 0 ? variantCount(items[nextIndex]) - 1 : 0 })
    onIndexChange(nextIndex)
  }

  const canStep = items.length > 1 || (item !== null && variantCount(item) > 1)

  // Listened for on the document, not the dialog: stepping into another series
  // replaces the thumbnail that had focus, and keys would then miss the dialog.
  // Subscribes each render so the handler always sees the current position.
  useEffect(() => {
    if (!item) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      // A focused video or slider uses the arrows itself.
      if (e.target instanceof HTMLElement && e.target.closest('video, input')) return
      if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onIndexChange(null)}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && onIndexChange(null)}
      aria-label={item?.title}
      className="m-auto w-[min(1100px,calc(100vw-2rem))] max-h-none bg-transparent p-0 text-fg backdrop:bg-black/90 backdrop:backdrop-blur-sm"
    >
      {item && (
        <div className="relative">
          <LightboxMedia item={item} variant={variant} />

          {item.kind === 'image' && item.images.length > 1 && (
            <div role="group" aria-label="Variants" className="mt-3 flex flex-wrap justify-center gap-2">
              {item.images.map((image, i) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => setShown({ index: index!, variant: i })}
                  aria-label={`Variant ${i + 1} of ${item.images.length}`}
                  aria-current={i === variant ? 'true' : undefined}
                  className={`w-14 h-14 rounded overflow-hidden cursor-pointer outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent ${
                    i === variant ? 'ring-2 ring-accent' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={image.card} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{item.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canStep && (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous" className={navButtonClass}>
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-mono text-zinc-300 tabular-nums">
                    {index! + 1} / {items.length}
                  </span>
                  <button type="button" onClick={() => step(1)} aria-label="Next" className={navButtonClass}>
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
              <button type="button" onClick={() => onIndexChange(null)} aria-label="Close" className={navButtonClass}>
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
