import { Moon, PartyPopper, Sun } from 'lucide-react'
import { isPartyUnlocked, nextTheme, setTheme, useTheme } from '@/lib/theme'

const icons = { light: Sun, dark: Moon, party: PartyPopper }

// Shows the theme a click switches to.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme()
  // Read at render: the toggle re-renders on every theme change, including the
  // switch into party that unlocking makes.
  const next = nextTheme(theme, isPartyUnlocked())
  const Icon = icons[next]
  const label = next === 'party' ? 'Switch to party mode' : `Switch to ${next} theme`

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
