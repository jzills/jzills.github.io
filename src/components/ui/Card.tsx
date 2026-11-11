import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

export function Card({ children, hover = false, className = '', ...props }: Props) {
  return (
    <div
      className={`
        bg-surface border border-border rounded p-5
        ${hover ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:ring-1 hover:ring-accent/15' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
