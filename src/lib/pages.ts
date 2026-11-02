export const HOME_PATH = '/'
export const LAB_PATH = '/lab/'

export const isLabPage = () => window.location.pathname.startsWith('/lab')

export const currentPath = () => (isLabPage() ? LAB_PATH : HOME_PATH)

// Section anchors live on the home page; from any other page they need the path too.
export const homeHref = (hash: string) => (isLabPage() ? `${HOME_PATH}${hash}` : hash)

// Scrolls an element into view and briefly rings it (see .search-flash in index.css).
export function flashTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
