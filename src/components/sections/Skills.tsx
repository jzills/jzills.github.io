import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { m, useInView, type Variants } from 'framer-motion'
import { Blocks, Cloud, CodeXml, Database, Sparkles, Wrench, type LucideIcon } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { skillGroups } from '@/data/skills'
import type { SkillIcon } from '@/data/skillIcons'
import { slug } from '@/lib/anchors'
import { revealOnScroll } from '@/lib/motion'
import { useCenterFocus } from '@/lib/useCenterFocus'

const groupIcons: Record<string, LucideIcon> = {
  Languages: CodeXml,
  'Platform & Cloud': Cloud,
  Frameworks: Blocks,
  Data: Database,
  Tooling: Wrench,
  AI: Sparkles,
}

// Each card rises in, then its chips pop in one after another.
const card: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.04, delayChildren: 0.15 },
  },
}

const pop: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } },
}

type Icons = { skillIcons: Record<string, SkillIcon>; fallbackSkillIcon: SkillIcon }

// The logos are mostly path data that compresses poorly, and the section is
// well down the page, so they load in their own chunk after first paint.
function useSkillIcons() {
  const [icons, setIcons] = useState<Icons | null>(null)
  useEffect(() => {
    let live = true
    import('@/data/skillIcons').then((mod) => live && setIcons(mod))
    return () => {
      live = false
    }
  }, [])
  return icons
}

// The logo, grey until its card is hovered (or, on phones, centred), then in
// the brand's colour. An empty slot of the same size holds its place until the
// logos load, so the chips don't change width.
function SkillLogo({ skill, icons }: { skill: string; icons: Icons | null }) {
  if (!icons) return <span aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
  const icon = icons.skillIcons[skill] ?? icons.fallbackSkillIcon
  const style = { '--brand': icon.color ?? 'var(--color-fg)' } as CSSProperties
  const className =
    'w-3.5 h-3.5 shrink-0 text-muted transition-colors duration-300 group-hover/card:text-[var(--brand)] group-data-[lit=true]/card:text-[var(--brand)]'

  if ('Icon' in icon) return <icon.Icon aria-hidden="true" className={className} style={style} strokeWidth={2.25} />
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d={icon.path} />
    </svg>
  )
}

export function Skills() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  // On phones, where the cards stack, the one in the middle of the screen
  // lights up its logos, since touch has no hover.
  const { focused, itemRef } = useCenterFocus('(max-width: 639px)')
  const icons = useSkillIcons()

  return (
    <section id="skills" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading
            label="Stack"
            heading="Skills"
            subheading="Technologies I use day-to-day across platform, backend, and tooling work."
          />

          <m.div {...revealOnScroll} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skillGroups.map((group, index) => {
              const GroupIcon = groupIcons[group.label] ?? Blocks
              const lit = focused === index
              return (
                <m.div
                  key={group.label}
                  ref={itemRef(index)}
                  variants={card}
                  id={`skills-${slug(group.label)}`}
                  data-lit={lit}
                  className={`group/card bg-surface border rounded p-5 transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:ring-1 hover:ring-accent/15 ${
                    lit ? 'border-accent/40 ring-1 ring-accent/15' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <GroupIcon size={15} aria-hidden="true" className="text-accent" />
                    <h3 className="text-xs font-mono text-muted uppercase tracking-widest">{group.label}</h3>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {group.skills.map((skill) => (
                      <m.li
                        key={skill}
                        variants={pop}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-fg bg-bg border border-border rounded"
                      >
                        <SkillLogo skill={skill} icons={icons} />
                        {skill}
                      </m.li>
                    ))}
                  </ul>
                </m.div>
              )
            })}
          </m.div>
        </m.div>
      </div>
    </section>
  )
}
