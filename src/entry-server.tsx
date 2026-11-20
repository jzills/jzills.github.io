import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

const pages: Record<string, () => ReactNode> = {
  '/': () => <App />,
}

export const paths = Object.keys(pages)

export function render(path: string) {
  return renderToString(<StrictMode>{pages[path]()}</StrictMode>)
}
