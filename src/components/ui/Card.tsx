import type { HTMLAttributes, ReactNode, Ref } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  // Shows the hover look without a pointer, e.g. the card centred on a phone.
  active?: boolean
  ref?: Ref<HTMLDivElement>
}

export function Card({ children, hover = false, active = false, className = '', ref, ...props }: Props) {
  return (
    <div
      ref={ref}
      className={`
        bg-surface border rounded p-5 ${active ? 'border-accent/40 ring-1 ring-accent/15' : 'border-border'}
        ${hover ? 'transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:ring-1 hover:ring-accent/15' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
