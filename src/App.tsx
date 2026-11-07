import { useEffect } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { MotionProvider } from '@/components/layout/MotionProvider'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Experience } from '@/components/sections/Experience'
import { Projects } from '@/components/sections/Projects'
import { Skills } from '@/components/sections/Skills'
import { Creative } from '@/components/sections/Creative'
import { Contact } from '@/components/sections/Contact'
import { AssistantWidget } from '@/components/assistant/AssistantWidget'
import { scrollToHash } from '@/lib/pages'

export default function App() {
  // Arriving from another page (e.g. /lab) with a #section hash.
  useEffect(scrollToHash, [])

  return (
    <MotionProvider>
      <div className="min-h-screen bg-bg">
        <Navigation />
        <main>
          <Hero />
          <About />
          <Experience />
          <Projects />
          <Skills />
          <Creative />
          <Contact />
        </main>
        <Footer />
        <AssistantWidget />
      </div>
    </MotionProvider>
  )
}
