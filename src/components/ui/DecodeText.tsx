import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { scrambleFrame } from '@/lib/textEffects'

const DURATION = 700
const FRAME = 45

// Text that flickers through noise and settles into place the first time it
// scrolls into view, and again whenever it's hovered or tapped. Renders the real text on the server and before reveal, so
// the prerendered HTML and hydration are unaffected; screen readers get the real
// text only. It runs under reduced motion: nothing
// moves, the characters just change in place.
export function DecodeText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const [display, setDisplay] = useState(text)
  // Bumped to replay; a run already going finishes before another can start.
  const [run, setRun] = useState(0)
  const running = useRef(false)

  useEffect(() => {
    if (!inView) return
    running.current = true
    const start = performance.now()
    const timer = window.setInterval(() => {
      const progress = (performance.now() - start) / DURATION
      setDisplay(scrambleFrame(text, progress))
      if (progress >= 1) {
        window.clearInterval(timer)
        running.current = false
      }
    }, FRAME)
    return () => {
      window.clearInterval(timer)
      running.current = false
      setDisplay(text)
    }
  }, [inView, text, run])

  const replay = () => {
    if (!inView || running.current) return
    running.current = true
    setRun((n) => n + 1)
  }

  return (
    <span ref={ref} onPointerEnter={replay} onPointerDown={replay}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{display}</span>
    </span>
  )
}
