import { useRef } from 'react'

const SPIN_MS = 1400

// A heading's text split into letters, so party mode can ripple them like a
// 90s homepage and spin them all once on hover or tap (index.css). In every
// other theme the letters stay inline and the text lays out as before. Screen
// readers get the plain text, not one letter at a time.
export function WavyText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const timer = useRef(0)

  const spin = () => {
    const el = ref.current
    if (!el || el.classList.contains('wavy-spin')) return
    el.classList.add('wavy-spin')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => el.classList.remove('wavy-spin'), SPIN_MS)
  }

  let index = 0
  return (
    <span ref={ref} className="wavy" onPointerEnter={spin} onPointerDown={spin}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((word, w) => (
          <span key={w}>
            {w > 0 && ' '}
            <span className="whitespace-nowrap">
              {[...word].map((ch) => {
                const i = index++
                return (
                  <span key={i} className="wavy-letter" style={{ '--i': i } as React.CSSProperties}>
                    {ch}
                  </span>
                )
              })}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
