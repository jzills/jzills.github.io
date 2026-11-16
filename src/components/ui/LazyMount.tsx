import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  // Distance from the viewport at which children mount (and beyond which they unmount).
  rootMargin?: string
  // False forces children unmounted, e.g. while a lightbox covers them.
  enabled?: boolean
  // Once mounted, stay mounted after scrolling away.
  keep?: boolean
}

// Mounts children only near the viewport. Shader cards use it so a shader compiles
// only as its card comes near, and keep it so the still survives scrolling away.
export function LazyMount({ children, className = '', rootMargin = '100px 0px', enabled = true, keep = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting || keep)
        if (entry.isIntersecting && keep) observer.disconnect()
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [keep, rootMargin])

  return (
    <div ref={ref} className={className}>
      {near && enabled ? children : null}
    </div>
  )
}
