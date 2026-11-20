import { useSyncExternalStore } from 'react'
import { Mail } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'
import { profile } from '@/data/profile'
import { projects } from '@/data/projects'
import { LAB_URL } from '@/lib/pages'

const { email, github, linkedin, resume } = profile.links

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
  { label: 'Lab', href: LAB_URL },
  { label: 'Contact', href: '#contact' },
]

// The projects with docs sites, linked the same way their cards are.
const projectLinks: FooterLink[] = [
  ...projects.filter((p) => p.docsUrl).map((p) => ({ label: p.name, href: p.docsUrl! })),
  { label: 'All repositories', href: `${github}?tab=repositories` },
]

const moreLinks: FooterLink[] = [
  { label: 'Resume', href: resume },
  { label: 'LinkedIn', href: linkedin },
  { label: 'GitHub', href: github },
  { label: 'Source for this site', href: `${github}/jzills.github.io` },
]

const columns = [
  { heading: 'Site', links: siteLinks },
  { heading: 'Projects', links: projectLinks },
  { heading: 'More', links: moreLinks },
]

const linkClass = 'text-muted hover:text-fg transition-colors'

// The prerendered HTML carries the build's year. Hydration renders that same
// year (the server snapshot) so the markup matches, then React re-renders with
// the visitor's year if the calendar has moved on since the build.
const noSubscribe = () => () => {}
const currentYear = () => new Date().getFullYear()
const buildYear = () => __BUILD_YEAR__

function useCurrentYear() {
  return useSyncExternalStore(noSubscribe, currentYear, buildYear)
}

export function Footer() {
  const year = useCurrentYear()

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
              Platform and software engineer building developer platforms and cloud infrastructure,
              with a focus on AI-assisted engineering.
            </p>
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

        <div className="mt-14 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          {/* The family mark, as on every zills site, with the copyright under it. */}
          <div className="flex flex-col gap-1">
            <span className="font-sans text-sm font-extrabold tracking-[-0.03em] text-fg">Z<span className="font-semibold opacity-55">/</span>LLS</span>
            <p className="text-[11px] text-muted font-mono">© {year} {profile.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-muted">
            <span className="text-xs font-semibold">Let's connect</span>
            <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={linkClass}>
              <GitHubIcon size={16} />
            </a>
            <a href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={linkClass}>
              <LinkedInIcon size={16} />
            </a>
            <a href={`mailto:${email}`} aria-label="Email" className={linkClass}>
              <Mail size={16} />
            </a>
            {/* Every zills site's footer links back to the hub by its domain. */}
            <span aria-hidden="true" className="h-4 w-px bg-border" />
            <a href="https://zills.io/" className={`font-mono text-[11px] ${linkClass}`}>zills.io <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
