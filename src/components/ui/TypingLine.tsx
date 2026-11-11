import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { initialTypeState, typewriterStep } from '@/lib/textEffects'

interface Props {
  phrases: readonly string[]
  label: string
  className?: string
}

// A terminal-style line that types, holds and deletes each phrase in turn. The
// first phrase is rendered in full on the server, so there is never an empty
// line before JavaScript runs; typing starts after hydration. Screen readers get
// one static sentence instead of every keystroke.
export function TypingLine({ phrases, label, className = '' }: Props) {
  const reduce = useReducedMotion()
  const [state, setState] = useState(() => initialTypeState(phrases))

  useEffect(() => {
    if (reduce || phrases.length < 2) return
    let current = initialTypeState(phrases)
    let timer: number
    const tick = (delay: number) => {
      timer = window.setTimeout(() => {
        // Skip work while the tab is hidden; pick up where it left off.
        if (document.hidden) return tick(500)
        const next = typewriterStep(current, phrases)
        current = next.state
        setState(current)
        // A little jitter makes the typing read as human.
        tick(current.phase === 'typing' ? next.delay * (0.6 + Math.random() * 0.8) : next.delay)
      }, delay)
    }
    tick(2200)
    return () => window.clearTimeout(timer)
  }, [reduce, phrases])

  const text = phrases[state.index].slice(0, state.length)

  return (
    <p className={`font-mono whitespace-nowrap ${className}`}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        <span className="text-muted select-none">{'> '}</span>
        {text}
        <span className="typing-caret" />
      </span>
    </p>
  )
}
