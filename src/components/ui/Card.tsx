import type { HTMLAttributes, ReactNode, Ref } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  ref?: Ref<HTMLDivElement>
}

export function Card({ children, hover = false, className = '', ref, ...props }: Props) {
  return (
    <div
      ref={ref}
      className={`
        bg-surface border border-border rounded p-5
        ${hover ? 'transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:ring-1 hover:ring-accent/15' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
