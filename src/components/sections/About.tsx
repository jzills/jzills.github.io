import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { SectionHeading } from '@/components/ui/SectionHeading'

export function About() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="about" ref={ref} className="py-24 px-6">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading label="Background" heading="About" />

          <div className="max-w-2xl space-y-5 text-muted leading-relaxed">
            <p>
              I build the platforms engineering teams ship on. My work centers on
              making teams faster and more confident — reliable CI/CD pipelines,
              well-designed Kubernetes clusters, and automation that gets out of
              the way.
            </p>
            <p>
              I came to platform work from software development — years building
              .NET applications before moving into infrastructure — and I still
              write a lot of code across the stack. My open source
              projects live where those worlds overlap: HMAC auth tooling that
              extends into the service mesh, caching libraries for ASP.NET Core,
              CLI utilities for Kubernetes workflows.
            </p>
            <p>
              Outside of platform work I'm drawn to creative coding: generative audio systems,
              image processing pipelines, and experimental software that sits at the edge of
              engineering and media. I find the same instincts apply in both spaces — precision,
              good abstraction, and attention to what the system is actually doing.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
