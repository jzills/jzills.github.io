import { useEffect, useRef, useState } from 'react'

// Which of a list's items sits in the middle of the screen, for lists stacked
// in one column on phones. Items register through `itemRef(index)`. Only
// tracked while `query` matches; null otherwise. Crossing the gap between two
// items keeps the last one, so the focus doesn't flicker off between cards.
export function useCenterFocus(query: string) {
  const items = useRef<(HTMLElement | null)[]>([])
  const [focused, setFocused] = useState<number | null>(null)

  useEffect(() => {
    const media = window.matchMedia(query)
    let observer: IntersectionObserver | null = null

    const start = () => {
      observer?.disconnect()
      observer = null
      setFocused(null)
      if (!media.matches) return
      // A thin band across the middle of the viewport.
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setFocused(items.current.indexOf(entry.target as HTMLElement))
          }
        },
        { rootMargin: '-45% 0px -45% 0px' },
      )
      items.current.forEach((el) => el && observer?.observe(el))
    }

    start()
    media.addEventListener('change', start)
    return () => {
      media.removeEventListener('change', start)
      observer?.disconnect()
    }
  }, [query])

  const itemRef = (index: number) => (el: HTMLElement | null) => {
    items.current[index] = el
  }

  return { focused, itemRef }
}
