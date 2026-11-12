import { useSyncExternalStore } from 'react'

// Party is a hidden third theme: a loud 90s homepage. Five blasts of the hero
// mark switch it on (src/lib/party.ts); its banner's exit button, or the
// theme toggle, switch it off. The toggle itself only offers dark and light.
export type Theme = 'light' | 'dark' | 'party'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark' || value === 'party'

// Must match the key read by public/theme-init.js, which applies the
// theme before first paint so light-mode visitors never see a dark flash.
const STORAGE_KEY = 'theme'

// Absent while prerendering, which has no window.
const systemQuery = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: light)')
const listeners = new Set<() => void>()

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  listeners.forEach((listener) => listener())
}

// Follow the OS setting until the visitor picks a theme explicitly.
systemQuery?.addEventListener('change', () => {
  if (!readStored()) apply(systemQuery.matches ? 'light' : 'dark')
})

export function getTheme(): Theme {
  const value = document.documentElement.dataset.theme
  return isTheme(value) ? value : 'dark'
}

// What the toggle switches to: dark and light alternate, and party leaves to dark.
export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this page view.
  }
  apply(theme)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Prerendered HTML is built as dark; light-mode visitors switch over once hydrated.
const getServerTheme = (): Theme => 'dark'

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, getServerTheme)
}
