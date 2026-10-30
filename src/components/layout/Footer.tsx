import { useState } from 'react'
import { Check, Copy, Mail } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'
import { experience } from '@/data/experience'
import { projects } from '@/data/projects'

const email = 'joshua.zillwood@gmail.com'

interface FooterLink {
  label: string
  href: string
}

const siteLinks: FooterLink[] = [
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Creative', href: '#creative' },
  { label: 'Contact', href: '#contact' },
]

// The projects with docs sites, linked the same way their cards are.
const projectLinks: FooterLink[] = [
  ...projects.filter((p) => p.docsUrl).map((p) => ({ label: p.name, href: p.docsUrl! })),
  { label: 'All repositories', href: 'https://github.com/jzills?tab=repositories' },
]

const moreLinks: FooterLink[] = [
  { label: 'Resume', href: 'https://docs.google.com/document/d/1Cn8XP9f3FjcqYxIxBOgPaePRyFFD69YliEm-djYhK0k/export?format=pdf' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/jzillss' },
  { label: 'GitHub', href: 'https://github.com/jzills' },
  { label: 'Source for this site', href: 'https://github.com/jzills/jzills.github.io' },
]

const columns = [
  { heading: 'Site', links: siteLinks },
  { heading: 'Projects', links: projectLinks },
  { heading: 'More', links: moreLinks },
]

const linkClass = 'text-muted hover:text-fg transition-colors'

function CopyEmail() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      window.location.href = `mailto:${email}`
    }
  }

  return (
    <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded border border-border bg-surface pl-3 pr-1.5 py-1.5">
      <code className="truncate text-xs font-mono text-fg">{email}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Email copied' : 'Copy email address'}
        className={`shrink-0 p-1.5 rounded transition-colors ${copied ? 'text-accent' : 'text-muted hover:text-fg'}`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

export function Footer() {
  const current = experience[0]

  return (
    <footer className="relative border-t border-border pt-12 pb-10 text-sm">
      {/* An accent line fading out at both ends marks the footer as its own band. */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-16">
          <div className="max-w-sm">
            <a href="#hero" className="font-mono text-2xl font-medium text-accent hover:text-accent-dim transition-colors">
              jz.
            </a>
            <p className="mt-4 text-muted leading-relaxed">
              Platform &amp; Software Engineer building developer platforms and cloud infrastructure,
              with a focus on AI-assisted engineering.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs font-mono text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {current.role} @ {current.company}
            </p>
            <CopyEmail />
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-16">
            {columns.map(({ heading, links }) => (
              <div key={heading}>
                <h2 className="mb-3 text-sm font-semibold text-fg">{heading}</h2>
                <ul className="space-y-2">
                  {links.map(({ label, href }) => {
                    const external = href.startsWith('http')
                    return (
                      <li key={label}>
                        <a
                          href={href}
                          className={linkClass}
                          {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
                        >
                          {label}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div aria-hidden="true" className="mt-14 text-3xl font-extrabold tracking-[0.12em] leading-none text-muted/60 select-none">
          ZILLS
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <p className="text-xs text-muted font-mono">© {new Date().getFullYear()} Joshua Zillwood</p>
          <div className="flex items-center gap-4 text-muted">
            <span className="text-xs font-semibold">Let's connect</span>
            <a href="https://github.com/jzills" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={linkClass}>
              <GitHubIcon size={16} />
            </a>
            <a href="https://linkedin.com/in/jzillss" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={linkClass}>
              <LinkedInIcon size={16} />
            </a>
            <a href={`mailto:${email}`} aria-label="Email" className={linkClass}>
              <Mail size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
