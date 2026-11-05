import { LazyMotion } from 'framer-motion'
import type { ReactNode } from 'react'

const loadFeatures = () => import('@/lib/motionFeatures').then((mod) => mod.default)

// Pages use the lightweight `m` components; their animation code arrives in a
// separate chunk. `strict` throws if a full `motion` component sneaks back in.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
