// Decides which shaders animate on desktop: only those in the grid row with the
// most of itself on screen, so the lab runs one row of three at a time instead of
// everything visible. The row keeps playing until another row shows more of
// itself; the rest hold a still frame.

type Listener = (on: boolean) => void

const listeners = new Map<HTMLElement, Listener>()
const active = new Set<HTMLElement>()
let frame = 0

function update() {
  frame = 0
  const vh = window.innerHeight
  // Cards in one grid row share a top edge; sum what each row shows.
  const rows = new Map<number, { shown: number; els: HTMLElement[] }>()
  for (const el of listeners.keys()) {
    const rect = el.getBoundingClientRect()
    const shown = Math.min(rect.bottom, vh) - Math.max(rect.top, 0)
    if (shown <= 0 || rect.width === 0) continue
    const top = Math.round(rect.top)
    const row = rows.get(top) ?? { shown: 0, els: [] }
    row.shown = Math.max(row.shown, shown)
    row.els.push(el)
    rows.set(top, row)
  }

  // The playing row wins ties, so it hands over only once another shows more.
  let best: { shown: number; els: HTMLElement[] } | undefined
  for (const row of rows.values()) {
    const playing = row.els.some((el) => active.has(el))
    if (!best || row.shown > best.shown || (row.shown === best.shown && playing)) best = row
  }

  const next = new Set(best?.els)
  for (const el of active) if (!next.has(el)) listeners.get(el)?.(false)
  for (const el of next) if (!active.has(el)) listeners.get(el)?.(true)
  active.clear()
  for (const el of next) active.add(el)
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(update)
}

let resizeObserver: ResizeObserver | undefined

// Calls onChange(true) when el's row should animate and onChange(false) when it
// should stop. Returns the unsubscribe.
export function animateInRow(el: HTMLElement, onChange: Listener) {
  if (listeners.size === 0) {
    // Captured, so a scrolling element (the fullscreen gallery) counts as well as the page.
    document.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    // Layout shifts (a filter change, images loading) move rows without a scroll.
    resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(document.body)
  }
  listeners.set(el, onChange)
  schedule()

  return () => {
    listeners.delete(el)
    active.delete(el)
    if (listeners.size === 0) {
      document.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      resizeObserver?.disconnect()
      cancelAnimationFrame(frame)
      frame = 0
    } else schedule()
  }
}
