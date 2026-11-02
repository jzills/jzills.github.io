import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SearchBox } from '@/components/layout/SearchBox'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LAB_PATH, homeHref, isLabPage } from '@/lib/pages'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Creative', href: '#creative' },
  { label: 'Contact', href: '#contact' },
]

const labLink = { label: 'Lab', href: LAB_PATH }

// The hero is observed too so no link stays highlighted after scrolling back to the top.
const sectionIds = ['hero', ...navLinks.map((link) => link.href.slice(1))]

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
      <nav className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
        <a href={homeHref('#hero')} className="font-mono text-accent font-medium text-sm tracking-tight hover:text-accent-dim transition-colors">
          jz.
        </a>

        <div className="hidden lg:flex items-center gap-6">
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
          <a
            href={labLink.href}
            aria-current={onLab ? 'page' : undefined}
            className={`text-sm hover:text-fg transition-colors duration-200 relative group ${onLab ? 'text-fg' : 'text-muted'}`}
          >
            {labLink.label}
            <span className={`absolute -bottom-px left-0 h-px bg-accent transition-all duration-200 group-hover:w-full ${onLab ? 'w-full' : 'w-0'}`} />
          </a>
          <SearchBox primary className="w-52" />
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

        <div className="lg:hidden flex items-center gap-1">
          <ThemeToggle />
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
        <div className="lg:hidden border-t border-border bg-bg/95 backdrop-blur-sm">
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
              className={`text-sm hover:text-fg transition-colors ${onLab ? 'text-fg' : 'text-muted'}`}
              onClick={() => setOpen(false)}
            >
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
