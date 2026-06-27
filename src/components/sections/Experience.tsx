import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Timeline } from '@/components/ui/Timeline'
import { experience } from '@/data/experience'

export function Experience() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="experience" ref={ref} className="py-24 px-6 border-t border-[#27272a]">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading
            label="Career"
            heading="Experience"
            subheading="Platform engineering, cloud infrastructure, and software development."
          />
          <Timeline entries={experience} />
        </motion.div>
      </div>
    </section>
  )
}
