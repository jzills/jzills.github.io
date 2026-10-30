import type { Variants } from 'framer-motion'

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// Spread onto a motion container; children using `rise` fade in one after another
// the first time the container scrolls into view.
export const revealOnScroll = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, margin: '-10% 0px' },
  variants: stagger,
} as const
