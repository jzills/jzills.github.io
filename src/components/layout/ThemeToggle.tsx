import { Moon, Sun } from 'lucide-react'
import { setTheme, useTheme } from '@/lib/theme'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`p-2 rounded text-muted hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer ${className}`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
