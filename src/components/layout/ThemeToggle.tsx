import { Moon, PartyPopper, Sun } from 'lucide-react'
import { nextTheme, setTheme, useTheme } from '@/lib/theme'

// Outside party mode, shows the theme a click switches to (dark or light).
// In party mode it shows the party hat, and a click leaves to dark. Party
// mode itself is only entered by blasting the page.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme()
  const next = nextTheme(theme)
  const label = theme === 'party' ? 'Leave party mode' : `Switch to ${next} theme`
  const Icon = theme === 'party' ? PartyPopper : next === 'light' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={`p-2 rounded text-muted hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer ${className}`}
    >
      <Icon size={16} />
    </button>
  )
}
