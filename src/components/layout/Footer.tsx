import { Mail } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons'

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-[1100px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted font-mono">© 2026 Joshua Zillwood</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/jzills"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-muted hover:text-fg transition-colors"
          >
            <GitHubIcon size={16} />
          </a>
          <a
            href="https://linkedin.com/in/jzillss"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-muted hover:text-fg transition-colors"
          >
            <LinkedInIcon size={16} />
          </a>
          <a
            href="mailto:joshua.zillwood@gmail.com"
            aria-label="Email"
            className="text-muted hover:text-fg transition-colors"
          >
            <Mail size={16} />
          </a>
        </div>
      </div>
    </footer>
  )
}
