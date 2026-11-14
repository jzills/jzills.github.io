import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExperienceEntry } from '@/data/experience'
import { m, useMotionValueEvent, useScroll } from 'framer-motion'
import { slug } from '@/lib/anchors'
import { revealOnScroll, rise } from '@/lib/motion'

interface Props {
  entries: ExperienceEntry[]
}

// Where on screen the line's tip sits as it draws: 70% of the way down.
const TIP = 0.7
// The dot's centre, measured from the top of its entry.
const DOT_OFFSET = 13
// The line runs from the first dot's centre to this far above the bottom.
const LINE_BOTTOM = 8

export function Timeline({ entries }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const entryRefs = useRef<(HTMLDivElement | null)[]>([])
  const [lit, setLit] = useState(0)

  // 0 when the timeline's top reaches the tip line, 1 when its bottom does. The
  // drawn line's tip is progress of the way along the line. Kept under reduced
  // motion: the line only tracks the scroll the reader is doing.
  const { scrollYProgress } = useScroll({ target: ref, offset: [`start ${TIP * 100}%`, `end ${TIP * 100}%`] })

  const update = useCallback((progress: number) => {
    const el = ref.current
    if (!el) return
    const tip = DOT_OFFSET + progress * (el.offsetHeight - DOT_OFFSET - LINE_BOTTOM)
    const count = entryRefs.current.filter((entry) => entry && entry.offsetTop + DOT_OFFSET < tip).length
    setLit(count)
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', update)
  // Arriving mid-page (a #hash or a reload) lights what's already scrolled past.
  useEffect(() => update(scrollYProgress.get()), [update, scrollYProgress])

  return (
    <div ref={ref} className="relative pl-8">
      <div className="absolute left-0 top-[13px] bottom-2 w-px bg-border" />
      <m.div
        aria-hidden="true"
        className="absolute left-0 top-[13px] bottom-2 w-px bg-accent origin-top shadow-[0_0_8px] shadow-accent/60"
        style={{ scaleY: scrollYProgress }}
      />
      <m.div {...revealOnScroll} className="space-y-12">
        {entries.map((entry, i) => {
          const on = i < lit
          return (
            <m.div
              key={i}
              ref={(el: HTMLDivElement | null) => { entryRefs.current[i] = el }}
              variants={rise}
              id={`exp-${slug(entry.company)}`}
              className="relative"
            >
              <div
                // Centred on the line: the line's middle is 31.5px left of the entry.
                className={`absolute -left-[31.5px] -translate-x-1/2 top-[9px] w-2 h-2 rounded-full transition-all duration-500 ${
                  on ? 'bg-accent scale-125 shadow-[0_0_0_4px] shadow-accent/20' : 'bg-border'
                }`}
              />
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-3">
                <div>
                  <span className="text-lg font-semibold text-fg">{entry.role}</span>
                  <span className="text-muted mx-2">@</span>
                  <span className="text-accent">{entry.company}</span>
                </div>
                <span className="text-xs font-mono text-muted sm:ml-auto shrink-0">{entry.period}</span>
              </div>
              <ul className="space-y-2">
                {entry.bullets.map((bullet, j) => (
                  <li key={j} className="text-muted text-sm leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[0.7em] before:w-1 before:h-px before:bg-muted">
                    {bullet}
                  </li>
                ))}
              </ul>
            </m.div>
          )
        })}
      </m.div>
    </div>
  )
}
