import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

// Must match the key read by public/theme-init.js, which applies the
// theme before first paint so light-mode visitors never see a dark flash.
const STORAGE_KEY = 'theme'

const systemQuery = window.matchMedia('(prefers-color-scheme: light)')
const listeners = new Set<() => void>()

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  listeners.forEach((listener) => listener())
}

// Follow the OS setting until the visitor picks a theme explicitly.
systemQuery.addEventListener('change', () => {
  if (!readStored()) apply(systemQuery.matches ? 'light' : 'dark')
})

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
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

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}
