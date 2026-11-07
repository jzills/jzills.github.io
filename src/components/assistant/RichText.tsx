import type { MouseEvent, ReactNode } from 'react'
import { flashTo, homeHref, isLabPage } from '@/lib/pages'

// Answer text carries [label](href) links. They are parsed into elements, never
// injected as HTML.
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

export const linkClass = 'text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent transition-colors'

interface LinkProps {
  href: string
  className?: string
  children: ReactNode
  // Called after an on-page section link is followed, e.g. to close the panel on phones.
  onNavigate?: () => void
}

export function AnswerLink({ href, className = linkClass, children, onNavigate }: LinkProps) {
  if (href.startsWith('#')) {
    const onClick = (e: MouseEvent) => {
      // On the home page, scroll to and ring the section; elsewhere follow the link home.
      if (isLabPage()) return
      e.preventDefault()
      onNavigate?.()
      history.replaceState(null, '', href)
      flashTo(href.slice(1))
    }
    return (
      <a href={homeHref(href)} onClick={onClick} className={className}>
        {children}
      </a>
    )
  }
  const external = !href.startsWith('mailto:')
  return (
    <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}

export function RichText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <AnswerLink key={m.index} href={m[2]} onNavigate={onNavigate}>
        {m[1]}
      </AnswerLink>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
