import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Experience } from '@/components/sections/Experience'
import { Projects } from '@/components/sections/Projects'
import { Skills } from '@/components/sections/Skills'
import { Creative } from '@/components/sections/Creative'
import { Contact } from '@/components/sections/Contact'

export default function App() {
  return (
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
    </div>
  )
}
