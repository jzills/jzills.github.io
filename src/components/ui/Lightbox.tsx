import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
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

function LightboxMedia({ item }: { item: CreativeItem }) {
  switch (item.kind) {
    case 'shader':
      // Keyed so switching shaders builds a fresh WebGL program instead of reusing the last one.
      return <ShaderCanvas key={item.title} fragmentShader={item.fragmentShader} className="w-full h-[70vh] rounded bg-black" />
    case 'image':
      return <img src={item.src} alt={item.alt} className="max-w-full max-h-[75vh] mx-auto rounded object-contain" />
    case 'video':
      return (
        <video
          key={item.src}
          src={item.src}
          poster={item.poster}
          aria-label={item.alt}
          controls
          autoPlay
          muted
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

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])

  const step = (delta: number) => {
    if (index === null) return
    onIndexChange((index + delta + items.length) % items.length)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'ArrowRight') step(1)
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onIndexChange(null)}
      onKeyDown={onKeyDown}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && onIndexChange(null)}
      aria-label={item?.title}
      className="m-auto w-[min(1100px,calc(100vw-2rem))] max-h-none bg-transparent p-0 text-fg backdrop:bg-black/90 backdrop:backdrop-blur-sm"
    >
      {item && (
        <div className="relative">
          <LightboxMedia item={item} />

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{item.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {items.length > 1 && (
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
