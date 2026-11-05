import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import './index.css'
import { LabPage } from './pages/LabPage.tsx'

// The page is prerendered at build time (scripts/prerender.ts); attach to that markup.
hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <LabPage />
  </StrictMode>,
)
