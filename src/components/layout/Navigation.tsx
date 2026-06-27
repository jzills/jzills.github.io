import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
]

export function Navigation() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-sm">
      <nav className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
        <a href="#hero" className="font-mono text-accent font-medium text-sm tracking-tight hover:text-accent-dim transition-colors">
          jz.
        </a>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-fg transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute -bottom-px left-0 w-0 h-px bg-accent transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
          <a
            href="https://docs.google.com/document/d/1Cn8XP9f3FjcqYxIxBOgPaePRyFFD69YliEm-djYhK0k/export?format=pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 rounded border border-accent/40 text-fg hover:border-accent hover:text-accent transition-all duration-200"
          >
            Resume
          </a>
        </div>

        <button
          className="md:hidden p-2 text-muted hover:text-fg transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border bg-bg/95 backdrop-blur-sm">
          <div className="max-w-[1100px] mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted hover:text-fg transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
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
