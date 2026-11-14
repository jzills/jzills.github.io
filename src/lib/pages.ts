export const HOME_PATH = '/'
export const LAB_PATH = '/lab/'

// Prerendering has no window, so the prerender script names the page it is rendering.
let prerenderPath = HOME_PATH
export const setPrerenderPath = (path: string) => {
  prerenderPath = path
}

const pathname = () => (typeof window === 'undefined' ? prerenderPath : window.location.pathname)

export const isLabPage = () => pathname().startsWith('/lab')

export const currentPath = () => (isLabPage() ? LAB_PATH : HOME_PATH)

// Section anchors live on the home page; from any other page they need the path too.
export const homeHref = (hash: string) => (isLabPage() ? `${HOME_PATH}${hash}` : hash)

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
