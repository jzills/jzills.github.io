import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ShaderCanvas, ShaderPlayToggle } from '@/components/ui/CreativeCard'
import type { CreativeItem, LabImage, ShaderItem } from '@/data/creative'

interface Props {
  items: CreativeItem[]
  // Index into items of the open item, or null when closed.
  index: number | null
  // Variant of a series to open on, e.g. the one its card was showing.
  initialVariant?: number
  onIndexChange: (index: number | null) => void
}

const navButtonClass = 'p-2 rounded bg-bg/70 text-muted hover:text-fg transition-colors cursor-pointer'

// How many variants an item steps through: a series has several, anything else one.
const variantCount = (item: CreativeItem) =>
  item.kind === 'image' ? item.images.length : item.kind === 'shader' ? item.variants.length : 1

// Starts downloading an image so it's cached by the time it's shown.
const preload = (src: string) => {
  new Image().src = src
}

// The full-size image that an arrow press would show next in each direction.
function neighborImages(items: CreativeItem[], index: number, variant: number): LabImage[] {
  const out: LabImage[] = []
  const item = items[index]
  for (const delta of [1, -1]) {
    const next = variant + delta
    if (item.kind === 'image' && next >= 0 && next < item.images.length) {
      out.push(item.images[next])
      continue
    }
    const neighbor = items[(index + delta + items.length) % items.length]
    if (neighbor.kind === 'image') out.push(neighbor.images[delta > 0 ? 0 : neighbor.images.length - 1])
  }
  return out
}

// Keeps the current image on screen until the next one has decoded, so stepping
// never flashes an empty frame or the browser's alt text in its place. The box has
// a fixed height so the caption below doesn't jump between images of different shapes.
function LightboxImage({ image, alt }: { image: LabImage; alt: string }) {
  const [shown, setShown] = useState({ image, alt })

  useEffect(() => {
    if (shown.image.src === image.src) return
    let cancelled = false
    const next = new Image()
    next.src = image.src
    // decode() rejects for a broken image; show it anyway rather than stall.
    next.decode().catch(() => {}).then(() => {
      if (!cancelled) setShown({ image, alt })
    })
    return () => {
      cancelled = true
    }
  }, [image, alt, shown.image.src])

  return (
    <div className="flex items-center justify-center h-[70vh]">
      <img
        src={shown.image.src}
        alt={shown.alt}
        width={shown.image.width}
        height={shown.image.height}
        // Transparent text hides the alt text while the first image loads.
        className="w-auto h-auto max-w-full max-h-full rounded object-contain text-transparent"
      />
    </div>
  )
}

function LightboxShader({ item, variant }: { item: ShaderItem; variant: number }) {
  const [playing, setPlaying] = useState(true)
  const current = item.variants[variant]
  return (
    <div className="group/card relative">
      <ShaderCanvas variant={current} playing={playing} className="w-full h-[70vh] rounded bg-black" />
      {!current.still && (
        <ShaderPlayToggle playing={playing} onToggle={() => setPlaying((p) => !p)} title={item.title} className="bottom-3 right-3" />
      )}
    </div>
  )
}

function LightboxMedia({ item, variant }: { item: CreativeItem; variant: number }) {
  switch (item.kind) {
    case 'shader':
      // Keyed so switching shaders builds a fresh WebGL program instead of reusing the
      // last one, and starts each one playing.
      return <LightboxShader key={`${item.title}-${variant}`} item={item} variant={variant} />
    case 'image': {
      const alt = item.images.length > 1 ? `${item.alt} (${variant + 1} of ${item.images.length})` : item.alt
      return <LightboxImage image={item.images[variant]} alt={alt} />
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
export function Lightbox({ items, index, initialVariant = 0, onIndexChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const item = index === null ? null : items[index]
  // The variant shown within a series, stored with the index it belongs to. Until
  // the visitor steps, it's the variant the lightbox was opened on.
  const [shown, setShown] = useState({ index: -1, variant: 0 })
  const variant = shown.index === index ? shown.variant : initialVariant

  // Forgets the last position, so reopening a card starts where that card is.
  const close = () => {
    setShown({ index: -1, variant: 0 })
    onIndexChange(null)
  }

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

  useEffect(() => {
    if (index !== null) neighborImages(items, index, variant).forEach((image) => preload(image.src))
  }, [items, index, variant])

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
      onClose={close}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && close()}
      aria-label={item?.title}
      className="m-auto w-[min(1100px,calc(100vw-2rem))] max-h-none bg-transparent p-0 text-fg backdrop:bg-black/90 backdrop:backdrop-blur-sm"
    >
      {item && (
        <div className="relative">
          <LightboxMedia item={item} variant={variant} />

          {item.kind === 'shader' && item.variants.length > 1 && (
            <div role="group" aria-label="Variants" className="mt-3 flex flex-wrap justify-center gap-2">
              {item.variants.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setShown({ index: index!, variant: i })}
                  aria-label={`Variant ${i + 1} of ${item.variants.length}`}
                  aria-current={i === variant ? 'true' : undefined}
                  className={`w-9 h-9 rounded border font-mono text-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    i === variant ? 'border-accent text-accent' : 'border-zinc-600 text-zinc-300 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

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
              <button type="button" onClick={close} aria-label="Close" className={navButtonClass}>
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
