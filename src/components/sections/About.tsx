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
              I'm a Senior DevOps Engineer and Software Developer with a focus on
              platform engineering, cloud infrastructure, and developer experience.
              My work centers on making engineering teams faster and more confident —
              through reliable CI/CD pipelines, well-designed Kubernetes clusters,
              and automation that gets out of the way.
            </p>
            <p>
              Over the years I've led Kubernetes adoption across engineering organizations,
              authored Helm chart libraries, built Terraform modules for Azure infrastructure,
              and introduced GitOps workflows with ArgoCD. I also write software — primarily
              in C# and TypeScript — and have published several open source libraries across
              .NET and DevOps tooling.
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
