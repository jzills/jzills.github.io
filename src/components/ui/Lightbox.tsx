import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, CodeXml, Copy, X } from 'lucide-react'
import { ShaderCanvas, ShaderPlayToggle } from '@/components/ui/CreativeCard'
import { highlightGlsl } from '@/lib/glsl'
import type { TokenKind } from '@/lib/glsl'
import type { ClipCredits, Credit, CreativeItem, LabImage, ShaderItem, ShaderVariant, VideoItem } from '@/data/creative'

interface Props {
  items: CreativeItem[]
  // Index into items of the open item, or null when closed.
  index: number | null
  // Variant of a series to open on, e.g. the one its card was showing.
  initialVariant?: number
  // Open a shader with its code showing, e.g. from the card's code button.
  initialCode?: boolean
  onIndexChange: (index: number | null) => void
}

// The backdrop is near-black in either theme, so the controls are dark in both.
const controlClass =
  'p-2 rounded border border-white/10 bg-zinc-900/80 text-zinc-300 hover:text-white transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent'

// How many variants an item steps through: a series has several, anything else one.
const variantCount = (item: CreativeItem) =>
  item.kind === 'image' ? item.images.length
    : item.kind === 'shader' ? item.variants.length
      : item.kind === 'video' ? item.clips.length
        : 1

// Thumbnails for picking a variant directly; shaders get numbered buttons instead.
const thumbnails = (item: CreativeItem) =>
  item.kind === 'image' ? item.images.map((image) => image.card)
    : item.kind === 'video' ? item.clips.map((clip) => clip.poster)
      : null

// Wakes a sleeping free-tier host once per page view, when its lightbox first opens.
const woken = new Set<string>()
function wake(url: string) {
  if (woken.has(url)) return
  woken.add(url)
  // Opaque no-cors request: only the side effect (the host starting up) matters.
  fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(() => {})
}

function CreditLine({ credit }: { credit: Credit }) {
  const detail = [credit.author, credit.license].filter(Boolean).join(' · ')
  return (
    <li className="leading-snug">
      {credit.url ? (
        <a href={credit.url} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-white underline-offset-2 hover:underline">
          {credit.title}
        </a>
      ) : (
        <span className="text-zinc-200">{credit.title}</span>
      )}
      {detail && <span className="text-zinc-400"> · {detail}</span>}
    </li>
  )
}

// A clip's sources, fetched the first time the section is expanded.
function Credits({ url }: { url: string }) {
  const [credits, setCredits] = useState<ClipCredits | null>(null)
  const [failed, setFailed] = useState(false)
  const load = () => {
    if (credits || failed) return
    fetch(url).then((r) => r.json()).then(setCredits).catch(() => setFailed(true))
  }
  return (
    <details onToggle={(e) => e.currentTarget.open && load()} className="mt-3 text-xs text-zinc-300">
      <summary className="cursor-pointer select-none text-zinc-200 hover:text-white">Credits</summary>
      {failed && <p className="mt-2 text-zinc-400">Couldn't load the credits.</p>}
      {credits && (
        <div className="mt-2 grid gap-4 sm:grid-cols-2 max-h-56 overflow-y-auto pr-2">
          <div>
            <p className="mb-1 font-mono uppercase tracking-widest text-[10px] text-zinc-400">Sounds</p>
            <ul className="space-y-1">{credits.sounds.map((c) => <CreditLine key={c.title + c.url} credit={c} />)}</ul>
          </div>
          <div>
            <p className="mb-1 font-mono uppercase tracking-widest text-[10px] text-zinc-400">Footage</p>
            <p className="mb-1 text-zinc-400">From the Internet Archive; the clip shows fragments of some of these.</p>
            <ul className="space-y-1">{credits.footage.map((c) => <CreditLine key={c.url ?? c.title} credit={c} />)}</ul>
          </div>
          <p className="sm:col-span-2 text-zinc-400">
            Own something here and want it removed? <a href="/#contact" className="underline underline-offset-2 hover:text-white">Get in touch</a>.
          </p>
        </div>
      )}
    </details>
  )
}

function LiveLink({ live }: { live: NonNullable<VideoItem['live']> }) {
  return (
    <p className="mt-2 text-sm">
      <a href={live.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline underline-offset-2">
        Open live <ArrowUpRight size={14} aria-hidden="true" />
      </a>
      <span className="ml-2 text-xs text-zinc-400">{live.note}</span>
    </p>
  )
}

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

  // A fixed height, so the controls below don't jump as images of different shapes come and go.
  // On portrait screens it's a square instead, like the shader canvas, so a phone doesn't spend
  // most of the screen on bands above and below the image.
  return (
    <div className="flex items-center justify-center h-[70vh] portrait:h-auto portrait:aspect-square portrait:max-h-[70vh]">
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

// The lightbox is dark in both themes, so the code colours are fixed rather than tokens.
const tokenClass: Record<TokenKind, string> = {
  comment: 'text-zinc-500 italic',
  preprocessor: 'text-pink-300',
  keyword: 'text-sky-300',
  type: 'text-violet-300',
  number: 'text-amber-300',
  builtin: 'text-emerald-300',
  function: 'text-yellow-100',
  plain: '',
}

// A shader's GLSL source. The source is the same module the canvas compiled, so loading it is free.
function ShaderCode({ variant, title }: { variant: ShaderVariant; title: string }) {
  const [source, setSource] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let cancelled = false
    variant.load().then((src) => {
      if (!cancelled) setSource(src)
    })
    return () => {
      cancelled = true
    }
  }, [variant])
  const tokens = useMemo(() => (source ? highlightGlsl(source) : []), [source])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = () => {
    if (source) navigator.clipboard?.writeText(source).then(() => setCopied(true), () => {})
  }

  return (
    <div className="relative h-[70vh] rounded border border-zinc-800 bg-zinc-950">
      {/* Focusable so the code can be scrolled from the keyboard. Long lines wrap so the code
          only scrolls vertically, which matters most on a phone. */}
      <pre tabIndex={0} aria-label={`${title} source`} className="h-full overflow-auto whitespace-pre-wrap break-words p-4 pr-12 font-mono text-xs leading-relaxed text-zinc-300 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        <code>
          {tokens.map((token, i) => (token.kind === 'plain' ? token.text : <span key={i} className={tokenClass[token.kind]}>{token.text}</span>))}
        </code>
      </pre>
      <button
        type="button"
        onClick={copy}
        disabled={!source}
        aria-label={copied ? 'Copied' : 'Copy code'}
        title={copied ? 'Copied' : 'Copy code'}
        className="absolute top-2 right-4 p-1.5 rounded bg-zinc-900/90 text-zinc-300 hover:text-white transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

// With the code open, the two sit side by side on wide screens; narrower ones show the code alone.
function LightboxShader({ item, variant, showCode }: { item: ShaderItem; variant: number; showCode: boolean }) {
  const [playing, setPlaying] = useState(true)
  const current = item.variants[variant]
  return (
    <div className={showCode ? 'grid gap-3 lg:grid-cols-2' : undefined}>
      <div className={`group/card relative ${showCode ? 'max-lg:hidden' : ''}`}>
        {/* Most shaders scale to the canvas height, so a tall portrait canvas shows only a narrow
            slice of them and looks zoomed in. On portrait screens it stays square instead. */}
        <ShaderCanvas variant={current} playing={playing} className="w-full h-[70vh] portrait:h-auto portrait:aspect-square portrait:max-h-[70vh] rounded bg-black" />
        {!current.still && (
          <ShaderPlayToggle playing={playing} onToggle={() => setPlaying((p) => !p)} title={item.title} className="bottom-3 right-3" />
        )}
      </div>
      {showCode && <ShaderCode variant={current} title={item.title} />}
    </div>
  )
}

function LightboxMedia({ item, variant, showCode }: { item: CreativeItem; variant: number; showCode: boolean }) {
  switch (item.kind) {
    case 'shader':
      // Keyed so switching shaders starts each one from its first frame, playing.
      return <LightboxShader key={`${item.title}-${variant}`} item={item} variant={variant} showCode={showCode} />
    case 'image': {
      const alt = item.images.length > 1 ? `${item.alt} (${variant + 1} of ${item.images.length})` : item.alt
      return <LightboxImage image={item.images[variant]} alt={alt} />
    }
    case 'video': {
      const clip = item.clips[variant]
      return (
        <video
          key={clip.src}
          src={clip.src}
          poster={clip.poster}
          aria-label={item.alt}
          controls
          autoPlay
          // Opened by a click, so a video with sound may start unmuted.
          muted={!item.sound}
          loop
          playsInline
          className="max-w-full max-h-[70vh] mx-auto rounded"
        />
      )
    }
    case 'audio':
    case 'music':
      return null
  }
}

// Native <dialog> gives the focus trap, Esc to close, and focus restored to the opener.
export function Lightbox({ items, index, initialVariant = 0, initialCode = false, onIndexChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // The scrolling area and the frame that centres the content in it: a click on
  // either one, outside the content, is a click on the backdrop.
  const scrollerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const item = index === null ? null : items[index]
  // The variant shown within a series, stored with the index it belongs to. Until
  // the visitor steps, it's the variant the lightbox was opened on.
  const [shown, setShown] = useState({ index: -1, variant: 0 })
  const variant = shown.index === index ? shown.variant : initialVariant
  // Stays open while stepping, so the next shader shows its code too. Null until
  // the visitor toggles it, so the lightbox opens however the card asked.
  const [codeToggled, setCodeToggled] = useState<boolean | null>(null)
  const showCode = codeToggled ?? initialCode

  // Forgets the last position, so reopening a card starts where that card is.
  const close = () => {
    setShown({ index: -1, variant: 0 })
    setCodeToggled(null)
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

  const wakeUrl = item?.kind === 'video' ? item.live?.wake : undefined
  useEffect(() => {
    if (wakeUrl) wake(wakeUrl)
  }, [wakeUrl])

  useEffect(() => {
    if (index !== null) neighborImages(items, index, variant).forEach((image) => preload(image.src))
  }, [items, index, variant])

  // Listened for on the document, not the dialog: stepping into another series
  // replaces the thumbnail that had focus, and keys would then miss the dialog.
  // Subscribes each render so the handler always sees the current position.
  useEffect(() => {
    if (!item) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      // A focused video, slider or code view uses the arrows itself.
      if (e.target instanceof HTMLElement && e.target.closest('video, input, pre')) return
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
      onClick={(e) => {
        if (e.target === e.currentTarget || e.target === scrollerRef.current || e.target === frameRef.current) close()
      }}
      aria-label={item?.title}
      // Covers the screen and never scrolls itself. The content scrolls in its own area inside,
      // and the close button and side arrows sit outside that area, so scrolling can't carry them
      // off: Safari on iPhone moved fixed-position buttons along with a scrolling dialog.
      className="m-0 h-full w-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-fg backdrop:bg-black/90 backdrop:backdrop-blur-sm"
    >
      {item && (
        <>
        {/* Scrolls when open credits or a short screen make the content taller than it. */}
        <div ref={scrollerRef} className="h-full overflow-y-auto overscroll-contain">
        {/* Centres the content when it fits. The padding keeps it clear of the close button above
            on phones, and from lg of the arrows at the sides. */}
        <div ref={frameRef} className="flex min-h-full items-center justify-center px-4 pt-16 pb-6 lg:px-[4.5rem] lg:py-4">
        <div className="relative w-full max-w-[1100px]">
          <LightboxMedia item={item} variant={variant} showCode={showCode} />

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

          {(thumbnails(item)?.length ?? 0) > 1 && (
            <div role="group" aria-label="Variants" className="mt-3 flex flex-wrap justify-center gap-2">
              {thumbnails(item)!.map((thumb, i, all) => (
                <button
                  key={thumb}
                  type="button"
                  onClick={() => setShown({ index: index!, variant: i })}
                  aria-label={`Variant ${i + 1} of ${all.length}`}
                  aria-current={i === variant ? 'true' : undefined}
                  className={`w-14 h-14 rounded overflow-hidden cursor-pointer outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent ${
                    i === variant ? 'ring-2 ring-accent' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Centred under the media. From lg the arrows are at the screen's edges instead (below),
              and only the count stays here. */}
          {canStep && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className={`${controlClass} lg:hidden`}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="min-w-16 text-center text-xs font-mono text-zinc-300 tabular-nums">
                {index! + 1} / {items.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className={`${controlClass} lg:hidden`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Stacked on phones, so the caption gets the full width rather than a column beside the button. */}
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{item.description}</p>
              {item.kind === 'video' && item.live && <LiveLink live={item.live} />}
              {item.kind === 'video' && item.clips[variant].credits && (
                // Keyed by clip so each one's credits load and collapse separately.
                <Credits key={item.clips[variant].credits} url={item.clips[variant].credits!} />
              )}
            </div>
            {item.kind === 'shader' && (
              <div className="flex shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setCodeToggled(!showCode)}
                  aria-pressed={showCode}
                  aria-label={showCode ? 'Hide code' : 'Show code'}
                  title={showCode ? 'Hide code' : 'Show code'}
                  className={`${controlClass} ${showCode ? 'text-accent!' : ''}`}
                >
                  <CodeXml size={18} />
                </button>
              </div>
            )}
          </div>

        </div>
        </div>
        </div>

        {/* Outside the scrolling area, in the screen's corner, so they never move or get clipped. */}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className={`${controlClass} absolute z-10 right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))]`}
        >
          <X size={20} />
        </button>
        {canStep && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous"
              className={`${controlClass} absolute z-10 left-6 top-1/2 -translate-y-1/2 p-3! max-lg:hidden`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next"
              className={`${controlClass} absolute z-10 right-6 top-1/2 -translate-y-1/2 p-3! max-lg:hidden`}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        </>
      )}
    </dialog>
  )
}
