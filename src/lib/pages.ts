import { slug } from '@/lib/anchors'

// The Lab moved out to its own site; public/lab/index.html redirects old links there.
export const LAB_URL = 'https://lab.zills.io/'

// The full catalogue of open-source work; the Projects section shows a selection.
export const OSS_URL = 'https://oss.zills.io/'

// A Lab piece's own page, slugged from its title the same way lab.zills.io slugs it.
export const labPieceUrl = (title: string) => `${LAB_URL}${slug(title)}/`

// Scrolls an element into view and briefly rings it (see .search-flash in index.css).
// A whole section, or anything taller than the viewport, is aligned to its top as
// the browser's own #hash jump does (centring it lands partway down, or tucks its
// heading under the nav), and isn't ringed, since the ring would sit off screen.
export function flashTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const toTop = el.tagName === 'SECTION' || el.getBoundingClientRect().height > window.innerHeight
  el.scrollIntoView({ behavior: 'smooth', block: toTop ? 'start' : 'center' })
  if (toTop) return
  // Restart the animation if the same element is chosen twice in a row.
  el.classList.remove('search-flash')
  void el.offsetWidth
  el.classList.add('search-flash')
  window.setTimeout(() => el.classList.remove('search-flash'), 1600)
}

// Content renders after load, so the browser's own jump to #hash finds nothing; redo it once mounted.
export function scrollToHash() {
  const id = decodeURIComponent(window.location.hash.slice(1))
  if (id) window.requestAnimationFrame(() => flashTo(id))
}
