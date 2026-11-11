import type { HTMLAttributes, PointerEvent, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

// Hover cards carry a soft accent glow that follows the cursor (.card-spotlight
// in index.css). The position is written straight to CSS variables, so moving
// the mouse never re-renders React.
const trackPointer = (e: PointerEvent<HTMLDivElement>) => {
  if (e.pointerType !== 'mouse') return
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--my', `${e.clientY - rect.top}px`)
}

export function Card({ children, hover = false, className = '', onPointerMove, ...props }: Props) {
  return (
    <div
      className={`
        bg-surface border border-border rounded p-5
        ${hover ? 'card-spotlight transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:ring-1 hover:ring-accent/15' : ''}
        ${className}
      `}
      onPointerMove={hover ? (e) => { trackPointer(e); onPointerMove?.(e) } : onPointerMove}
      {...props}
    >
      {children}
    </div>
  )
}
