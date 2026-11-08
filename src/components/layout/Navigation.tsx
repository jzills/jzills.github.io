import { useEffect, useState } from 'react'
import { FlaskConical, Menu, X } from 'lucide-react'
import { SearchBox } from '@/components/layout/SearchBox'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LAB_PATH, homeHref, isLabPage } from '@/lib/pages'

// About sits right under the hero and Creative is a teaser for the Lab, so neither
// gets a link; the footer still lists every section.
const navLinks = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
]

const labLink = { label: 'Lab', href: LAB_PATH }

// Every section is observed, linked or not, so scrolling into one without a link
// (or back to the hero) clears the highlight instead of leaving the previous one lit.
const sectionIds = ['hero', 'about', 'experience', 'projects', 'skills', 'creative', 'contact']

function useActiveSection() {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    // A section counts as active while it crosses a line just above mid-viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -55% 0px' },
    )
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return active
}

export function Navigation() {
  const [open, setOpen] = useState(false)
  const active = useActiveSection()
  const onLab = isLabPage()
  // The Creative section previews the Lab, so the Lab link lights up there too.
  const labLit = onLab || active === 'creative'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
      <nav className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
        <a href={homeHref('#hero')} className="font-mono text-accent font-medium text-sm tracking-tight hover:text-accent-dim transition-colors">
          jz.
        </a>

        <div className="hidden md:flex items-center gap-5 lg:gap-6">
          {navLinks.map((link) => {
            const isActive = active === link.href.slice(1)
            return (
              <a
                key={link.href}
                href={homeHref(link.href)}
                aria-current={isActive ? 'location' : undefined}
                className={`text-sm hover:text-fg transition-colors duration-200 relative group ${isActive ? 'text-fg' : 'text-muted'}`}
              >
                {link.label}
                <span className={`absolute -bottom-px left-0 h-px bg-accent transition-all duration-200 group-hover:w-full ${isActive ? 'w-full' : 'w-0'}`} />
              </a>
            )
          })}
          {/* The divider and icon mark Lab as its own page rather than another section. */}
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <a
            href={labLink.href}
            aria-current={onLab ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 text-sm hover:text-fg transition-colors duration-200 relative group ${labLit ? 'text-fg' : 'text-muted'}`}
          >
            <FlaskConical size={14} aria-hidden="true" />
            {labLink.label}
            <span className={`absolute -bottom-px left-0 h-px bg-accent transition-all duration-200 group-hover:w-full ${labLit ? 'w-full' : 'w-0'}`} />
          </a>
          <SearchBox primary className="w-36 lg:w-52" />
          {/* Negative margin offsets the button padding so the visible gap matches its neighbors. */}
          <ThemeToggle className="-mx-2" />
          <a
            href="https://docs.google.com/document/d/1Cn8XP9f3FjcqYxIxBOgPaePRyFFD69YliEm-djYhK0k/export?format=pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 rounded border border-accent/40 text-fg hover:border-accent hover:text-accent transition-all duration-200"
          >
            Resume
          </a>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          {/* A shortcut to the Lab so it's one tap away on phones; the menu still lists it too. */}
          <a
            href={labLink.href}
            aria-label={labLink.label}
            title={labLink.label}
            aria-current={onLab ? 'page' : undefined}
            className={`p-2 hover:text-fg transition-colors ${labLit ? 'text-accent' : 'text-muted'}`}
          >
            <FlaskConical size={20} aria-hidden="true" />
          </a>
          <button
            className="p-2 text-muted hover:text-fg transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border bg-bg/95 backdrop-blur-sm">
          <div className="max-w-[1100px] mx-auto px-6 py-4 flex flex-col gap-4">
            <SearchBox onNavigate={() => setOpen(false)} />
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={homeHref(link.href)}
                aria-current={active === link.href.slice(1) ? 'location' : undefined}
                className={`text-sm hover:text-fg transition-colors ${active === link.href.slice(1) ? 'text-fg' : 'text-muted'}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href={labLink.href}
              aria-current={onLab ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 border-t border-border pt-4 text-sm hover:text-fg transition-colors ${labLit ? 'text-fg' : 'text-muted'}`}
              onClick={() => setOpen(false)}
            >
              <FlaskConical size={14} aria-hidden="true" />
              {labLink.label}
            </a>
            <a
              href="https://docs.google.com/document/d/1Cn8XP9f3FjcqYxIxBOgPaePRyFFD69YliEm-djYhK0k/export?format=pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm w-fit px-3 py-1.5 rounded border border-accent/40 text-fg"
              onClick={() => setOpen(false)}
            >
              Resume
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
