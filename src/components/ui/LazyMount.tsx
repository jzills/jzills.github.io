import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  // Distance from the viewport at which children mount (and beyond which they unmount).
  rootMargin?: string
  // False forces children unmounted, e.g. while a lightbox covers them.
  enabled?: boolean
}

// Mounts children only near the viewport. Shader cards use it so a page of shaders
// holds only a handful of WebGL contexts at once; browsers drop the oldest past ~16.
export function LazyMount({ children, className = '', rootMargin = '300px 0px', enabled = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin })
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={ref} className={className}>
      {near && enabled ? children : null}
    </div>
  )
}
