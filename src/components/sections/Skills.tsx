import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Chip } from '@/components/ui/Chip'
import { skillGroups } from '@/data/skills'
import { slug } from '@/lib/anchors'
import { revealOnScroll, rise } from '@/lib/motion'

export function Skills() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="skills" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading
            label="Stack"
            heading="Skills"
            subheading="Technologies I use day-to-day across platform, backend, and tooling work."
          />

          <motion.div {...revealOnScroll} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {skillGroups.map((group) => (
              <motion.div key={group.label} variants={rise} id={`skills-${slug(group.label)}`}>
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.skills.map((skill) => (
                    <Chip key={skill} label={skill} />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
