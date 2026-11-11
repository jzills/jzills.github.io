import { useRef } from 'react'
import { AnimatePresence, m, useInView } from 'framer-motion'
import { Mail } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'
import { CopyIcon } from '@/components/ui/CopyIcon'
import { DecodeText } from '@/components/ui/DecodeText'
import { useCopyToClipboard } from '@/lib/useCopyToClipboard'
import { profile } from '@/data/profile'

const openMail = () => {
  window.location.href = `mailto:${profile.links.email}`
}

// Copies the address for people without a mail client set up; the mailto link
// beside it opens one for everyone else.
function CopyEmailButton() {
  const { copied, copy } = useCopyToClipboard(profile.links.email, openMail)

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Email address copied' : 'Copy email address'}
      title="Copy email address"
      className={`relative inline-flex items-center justify-center w-[42px] h-[42px] rounded border transition-all duration-200 ${
        copied ? 'border-accent/60 text-accent bg-accent/5' : 'border-border bg-surface text-muted hover:text-fg hover:border-accent/40'
      }`}
    >
      <CopyIcon copied={copied} size={15} />
      <AnimatePresence>
        {copied && (
          <m.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-accent text-bg text-xs font-mono pointer-events-none"
            aria-hidden="true"
          >
            Copied!
          </m.span>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  )
}

export function Contact() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="contact" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-4">
            <DecodeText text="Get in touch" />
          </p>
          <h2 className="text-3xl font-bold text-fg tracking-tight mb-4">Let's connect.</h2>
          <p className="text-muted leading-relaxed mb-10">
            Whether it's platform work, developer tooling, or something on the
            creative side — I'm always up for a good conversation. Email is the
            fastest way to reach me.
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
            <CopyEmailButton />
          </div>
        </m.div>
      </div>
    </section>
  )
}
