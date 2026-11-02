import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LabPage } from './pages/LabPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LabPage />
  </StrictMode>,
)
