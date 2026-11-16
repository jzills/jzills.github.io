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

// A clip's sources, shown over the media box so opening them never makes the lightbox taller.
// Fetched when the panel first opens.
function CreditsPanel({ url }: { url: string }) {
  const [credits, setCredits] = useState<ClipCredits | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((r) => r.json())
      .then((c) => !cancelled && setCredits(c))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [url])
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain rounded bg-zinc-950/95 p-4 text-xs text-zinc-300">
      {failed && <p className="text-zinc-400">Couldn't load the credits.</p>}
      {!credits && !failed && <p className="text-zinc-400">Loading credits…</p>}
      {credits && (
        <div className="grid gap-4 sm:grid-cols-2">
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
    </div>
  )
}

function LiveLink({ live }: { live: NonNullable<VideoItem['live']> }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <a href={live.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-accent hover:underline underline-offset-2">
        Open live <ArrowUpRight size={14} aria-hidden="true" />
      </a>
      <span className="truncate text-xs text-zinc-400">{live.note}</span>
    </span>
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
// never flashes an empty frame or the browser's alt text in its place.
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

  // Fills the media box (see the Lightbox), which keeps one height across images of
  // different shapes, so the controls below don't jump while stepping.
  return (
    <div className="flex h-full w-full items-center justify-center">
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
    <div className="relative h-full rounded border border-zinc-800 bg-zinc-950">
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
    // Fills the media box, so every shader shows at the same size. With the code open, one row the
    // height of the box; the code scrolls inside it.
    <div className={`grid h-full w-full grid-rows-[minmax(0,1fr)] ${showCode ? 'gap-3 lg:grid-cols-2' : ''}`}>
      <div className={`group/card relative h-full w-full ${showCode ? 'max-lg:hidden' : ''}`}>
        <ShaderCanvas variant={current} playing={playing} className="block h-full w-full rounded bg-black" />
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
          className="max-h-full max-w-full rounded"
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
  // The clip whose credits are open over the media, so stepping to another clip closes them.
  const [creditsFor, setCreditsFor] = useState<string | null>(null)

  // Forgets the last position, so reopening a card starts where that card is.
  const close = () => {
    setShown({ index: -1, variant: 0 })
    setCodeToggled(null)
    setCreditsFor(null)
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
  const creditsUrl = item?.kind === 'video' ? item.clips[variant].credits : undefined

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
      className="lightbox m-0 h-full w-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-fg backdrop:bg-black/90 backdrop:backdrop-blur-sm"
    >
      {item && (
        <>
        {/* Everything fits by construction (see .lightbox in index.css); this only scrolls if the
            screen is shorter than the layout allows for, e.g. a phone held sideways. On phones it
            starts below the close button, so nothing passes behind it. */}
        <div
          ref={scrollerRef}
          className="absolute inset-x-0 bottom-0 top-[var(--lb-above)] overflow-y-auto overscroll-contain lg:top-0"
        >
        <div ref={frameRef} className="flex min-h-full flex-col items-center px-4 pb-4 lg:px-0 lg:py-4">
        {/* Fixed widths and heights throughout, so every item lines up and the media is the same size. */}
        {/* The column is the screen's width on phones, so the caption has room even when a short
            screen makes the square smaller; from lg it's the media's width. */}
        <div className="my-auto flex w-full max-w-[1100px] flex-col lg:w-[var(--lb-media-w)]">
          <div className="relative mx-auto h-[var(--lb-media-h)] w-[var(--lb-media-w)] shrink-0">
            <div className="flex h-full w-full items-center justify-center">
              <LightboxMedia item={item} variant={variant} showCode={showCode} />
            </div>
            {creditsUrl && creditsFor === creditsUrl && <CreditsPanel url={creditsUrl} />}
          </div>

          {/* Variants: numbered buttons for a shader series, thumbnails for images and clips. Always
              there, empty for a single piece, and one row that scrolls sideways if it's long. */}
          <div className="mt-3 h-14 shrink-0 overflow-x-auto">
            <div role="group" aria-label="Variants" className="mx-auto flex h-full w-max items-center gap-2 px-1">
              {item.kind === 'shader' && item.variants.length > 1 &&
                item.variants.map((_, i) => (
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
              {(thumbnails(item)?.length ?? 0) > 1 &&
                thumbnails(item)!.map((thumb, i, all) => (
                  <button
                    key={thumb}
                    type="button"
                    onClick={() => setShown({ index: index!, variant: i })}
                    aria-label={`Variant ${i + 1} of ${all.length}`}
                    aria-current={i === variant ? 'true' : undefined}
                    className={`w-12 h-12 shrink-0 rounded overflow-hidden cursor-pointer outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent ${
                      i === variant ? 'ring-2 ring-accent' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
            </div>
          </div>

          {/* Paging under the media on phones; from lg the arrows are at the screen's edges and only
              the count is here. */}
          <div className="mt-3 flex h-11 shrink-0 items-center justify-center gap-3 lg:h-6">
            {canStep && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous" className={`${controlClass} lg:hidden`}>
                  <ChevronLeft size={20} />
                </button>
                <span className="min-w-16 text-center text-xs font-mono text-zinc-300 tabular-nums">
                  {index! + 1} / {items.length}
                </span>
                <button type="button" onClick={() => step(1)} aria-label="Next" className={`${controlClass} lg:hidden`}>
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {/* A fixed-height caption: the title on one line and the description on at most three
              (two from lg); descriptions are kept short enough to fit (see creative.test.ts). */}
          <div className="mt-3 flex h-[7.75rem] shrink-0 items-start justify-between gap-3 overflow-hidden lg:h-[6.5rem]">
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-white">{item.title}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-300 lg:line-clamp-2">{item.description}</p>
              {item.kind === 'video' && (item.live || creditsUrl) && (
                <div className="mt-2 flex h-5 items-center gap-4 text-sm">
                  {item.live && <LiveLink live={item.live} />}
                  {creditsUrl && (
                    <button
                      type="button"
                      onClick={() => setCreditsFor(creditsFor === creditsUrl ? null : creditsUrl)}
                      aria-expanded={creditsFor === creditsUrl}
                      className="shrink-0 cursor-pointer text-zinc-200 underline-offset-2 hover:text-white hover:underline"
                    >
                      {creditsFor === creditsUrl ? 'Hide credits' : 'Credits'}
                    </button>
                  )}
                </div>
              )}
            </div>
            {item.kind === 'shader' && (
              <button
                type="button"
                onClick={() => setCodeToggled(!showCode)}
                aria-pressed={showCode}
                aria-label={showCode ? 'Hide code' : 'Show code'}
                title={showCode ? 'Hide code' : 'Show code'}
                className={`${controlClass} shrink-0 ${showCode ? 'text-accent!' : ''}`}
              >
                <CodeXml size={18} />
              </button>
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
