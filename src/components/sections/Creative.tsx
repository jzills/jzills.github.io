import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { CreativeGallery } from '@/components/sections/CreativeGallery'

export function Creative() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="creative" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading
            label="Beyond Platform Work"
            heading="Creative & Experimental"
            subheading="Where engineering instincts meet generative media."
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-start">
            <div className="space-y-5 text-muted leading-relaxed">
              <p>
                Alongside platform and backend work, I build software that generates
                and transforms media. This includes audio synthesis systems, generative
                image pipelines, and video processing tools — work that requires the same
                precision and abstraction as infrastructure, but applied to signal and form
                rather than services and deployments.
              </p>
              <p>
                I'm drawn to the overlap between engineering rigour and creative output.
                The best systems in both spaces are minimal, composable, and produce
                outputs that feel inevitable. Whether it's a Helm chart or an audio
                processing graph, the design problems are more similar than they look.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Audio Systems', desc: 'Signal synthesis and processing' },
                  { label: 'Generative Image', desc: 'Procedural visual systems' },
                  { label: 'Video Processing', desc: 'Frame-level manipulation' },
                  { label: 'Experimental Tools', desc: 'Software as creative medium' },
                ].map((item) => (
                  <div key={item.label} className="bg-surface border border-border rounded p-3">
                    <p className="text-xs font-mono text-fg mb-1">{item.label}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <CreativeGallery />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
