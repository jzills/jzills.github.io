import { profile } from '@/data/profile'
import { projects } from '@/data/projects'
import { LAB_URL, OSS_URL } from '@/lib/pages'

const { github, linkedin, resume } = profile.links

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
  { label: 'All open source', href: OSS_URL },
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

// The z.//s mark and the link beside it are each lifted 1px. Inter's lowercase
// sits about 1.2px below the middle of the mark's line box at 14px, and
// JetBrains Mono's about 0.9px below the middle of the link's 16px line, so
// centered on the divider both read as sitting under it. Whole pixels, not ems:
// every offset in the row is then whole, so the browser rounds it the same way
// on every site. Measured from screenshots of the row, not from the boxes.
export function Footer() {
  return (
    <footer className="relative border-t border-border pt-12 pb-6 text-sm">
      {/* An accent line fading out at both ends marks the footer as its own band. */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-7">
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

        {/* As on every zills site: the Z/LLS mark beside a link back to the hub. Contact links live in the Contact section and the More column above. */}
        <div className="mt-14 flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            {/* Clicking the mark goes to the hub too; the text link beside it is the one keyboards and screen readers get. */}
            <a href="https://zills.io/" tabIndex={-1} aria-hidden="true" className="relative top-[-1px] font-sans text-sm font-extrabold tracking-[-0.03em] text-fg transition-opacity hover:opacity-80">z<span aria-hidden="true" className="mx-[0.05em] inline-block h-[0.17em] w-[0.17em] rounded-full bg-accent" /><span className="mr-[0.08em] font-bold tracking-[-0.12em] opacity-55">//</span>s</a>
            <span aria-hidden="true" className="h-3.5 w-px bg-border" />
            <a href="https://zills.io/" className={`relative top-[-1px] font-mono text-[11px] leading-4 ${linkClass}`}>zills.io <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
