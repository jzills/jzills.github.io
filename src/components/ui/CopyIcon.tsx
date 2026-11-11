import { AnimatePresence, m } from 'framer-motion'
import { Check, Copy } from 'lucide-react'

// The copy glyph pops into a check mark. Both share one grid cell so the swap
// crossfades in place rather than waiting for the outgoing icon to leave.
export function CopyIcon({ copied, size = 14 }: { copied: boolean; size?: number }) {
  return (
    <span className="grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1">
      <AnimatePresence initial={false}>
        <m.span
          key={copied ? 'check' : 'copy'}
          initial={{ scale: 0.3, opacity: 0, rotate: copied ? -45 : 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 600, damping: 22 }}
          className="inline-flex"
        >
          {copied ? <Check size={size} /> : <Copy size={size} />}
        </m.span>
      </AnimatePresence>
    </span>
  )
}
