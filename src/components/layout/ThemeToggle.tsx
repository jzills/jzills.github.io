import { Moon, Sun } from 'lucide-react'
import { nextTheme, setTheme, useTheme } from '@/lib/theme'

// Shows the theme a click switches to (dark or light).
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme()
  const next = nextTheme(theme)
  const label = `Switch to ${next} theme`
  const Icon = next === 'light' ? Sun : Moon

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
