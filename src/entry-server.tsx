import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'
import { LabPage } from './pages/LabPage.tsx'
import { HOME_PATH, LAB_PATH, setPrerenderPath } from './lib/pages.ts'

const pages: Record<string, () => ReactNode> = {
  [HOME_PATH]: () => <App />,
  [LAB_PATH]: () => <LabPage />,
}

export const paths = Object.keys(pages)

export function render(path: string) {
  setPrerenderPath(path)
  return renderToString(<StrictMode>{pages[path]()}</StrictMode>)
}
