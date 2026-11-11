import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { scrambleFrame } from '@/lib/textEffects'

const DURATION = 700
const FRAME = 45

// Text that flickers through noise and settles into place the first time it
// scrolls into view. Renders the real text on the server and before reveal, so
// the prerendered HTML and hydration are unaffected; screen readers get the real
// text only. Like the hero's typing line, it runs under reduced motion: nothing
// moves, the characters just change in place.
export function DecodeText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const timer = window.setInterval(() => {
      const progress = (performance.now() - start) / DURATION
      setDisplay(scrambleFrame(text, progress))
      if (progress >= 1) window.clearInterval(timer)
    }, FRAME)
    return () => {
      window.clearInterval(timer)
      setDisplay(text)
    }
  }, [inView, text])

  return (
    <span ref={ref}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{display}</span>
    </span>
  )
}
