import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Mail } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'

export function Contact() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="contact" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-4">Get in touch</p>
          <h2 className="text-3xl font-bold text-fg tracking-tight mb-4">Let's connect.</h2>
          <p className="text-muted leading-relaxed mb-10">
            Interested in platform engineering, cloud infrastructure, developer tooling, or
            creative technology? I'm always open to interesting conversations and opportunities.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/jzills"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-surface border border-border text-sm text-fg hover:border-accent/40 transition-all duration-200"
            >
              <GitHubIcon size={15} />
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/jzillss"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-surface border border-border text-sm text-fg hover:border-accent/40 transition-all duration-200"
            >
              <LinkedInIcon size={15} />
              LinkedIn
            </a>
            <a
              href="mailto:joshua.zillwood@gmail.com"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-accent/50 text-sm text-accent hover:bg-accent/5 transition-all duration-200"
            >
              <Mail size={15} />
              joshua.zillwood@gmail.com
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
