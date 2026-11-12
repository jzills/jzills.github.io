import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, m, useInView } from 'framer-motion'
import { ArrowUpRight, Briefcase, FolderGit2 } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { experience } from '@/data/experience'
import { projects } from '@/data/projects'
import { skillGroups } from '@/data/skills'
import { slug } from '@/lib/anchors'
import { revealOnScroll, rise } from '@/lib/motion'
import { flashTo } from '@/lib/pages'
import { evidenceCount, evidenceFor, type SkillEvidence } from '@/lib/skillEvidence'

// Worked out once: which jobs and projects back each skill.
const evidence = new Map<string, SkillEvidence>(
  skillGroups.flatMap((g) => g.skills).map((skill) => [skill, evidenceFor(skill, experience, projects)]),
)

const linkClass = 'inline-flex items-center gap-1.5 text-left text-fg hover:text-accent transition-colors cursor-pointer'

function EvidencePanel({ skill, id }: { skill: string; id: string }) {
  const e = evidence.get(skill)!
  const empty = evidenceCount(e) === 0

  return (
    <m.div
      id={id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded border border-accent/30 bg-surface p-4 text-sm">
        <p className="mb-3 font-mono text-xs text-muted">
          <span className="text-accent">{skill}</span>
          {e.since !== null && <> · professionally since {e.since}</>}
        </p>
        {empty ? (
          <p className="text-muted">Part of my everyday toolkit; no project here shows it off yet.</p>
        ) : (
          <div className="space-y-3">
            {e.jobs.length > 0 && (
              <ul className="space-y-1.5">
                {e.jobs.map((job) => (
                  <li key={job.id}>
                    <button type="button" onClick={() => flashTo(job.id)} className={linkClass}>
                      <Briefcase size={13} className="shrink-0 text-muted" />
                      <span>
                        {job.role} <span className="text-muted">@</span> {job.company}
                        <span className="ml-2 font-mono text-xs text-muted">{job.period}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {e.projects.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {e.projects.map((p) => (
                  <li key={p.name}>
                    {p.id ? (
                      <button type="button" onClick={() => flashTo(p.id!)} className={`${linkClass} font-mono text-xs`}>
                        <FolderGit2 size={13} className="shrink-0 text-muted" />
                        {p.name}
                      </button>
                    ) : (
                      <a href={p.href} target="_blank" rel="noopener noreferrer" className={`${linkClass} font-mono text-xs`}>
                        <FolderGit2 size={13} className="shrink-0 text-muted" />
                        {p.name}
                        <ArrowUpRight size={11} className="text-muted" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </m.div>
  )
}

export function Skills() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  // One skill open at a time across the section.
  const [open, setOpen] = useState<string | null>(null)
  const baseId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

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
            subheading="Technologies I use day-to-day across platform, backend, and tooling work. Tap one to see where I've used it."
          />

          <m.div {...revealOnScroll} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {skillGroups.map((group) => {
              const openHere = open && group.skills.includes(open) ? open : null
              const panelId = `${baseId}-${slug(group.label)}`
              return (
                <m.div key={group.label} variants={rise} id={`skills-${slug(group.label)}`}>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.skills.map((skill) => {
                      const count = evidenceCount(evidence.get(skill)!)
                      const selected = open === skill
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => setOpen(selected ? null : skill)}
                          aria-expanded={selected}
                          aria-controls={selected ? panelId : undefined}
                          className={`skill-chip inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono border rounded cursor-pointer transition-[color,border-color,background-color,transform] duration-200 motion-safe:hover:scale-[1.06] ${
                            selected ? 'border-accent text-accent bg-accent/10' : 'border-border text-fg bg-surface hover:border-accent/50'
                          }`}
                        >
                          {skill}
                          {count > 0 && (
                            <span aria-label={`, ${count} ${count === 1 ? 'place' : 'places'} used`} className={`text-[10px] ${selected ? 'text-accent' : 'text-muted'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <AnimatePresence initial={false}>
                    {openHere && <EvidencePanel key={openHere} skill={openHere} id={panelId} />}
                  </AnimatePresence>
                </m.div>
              )
            })}
          </m.div>
        </m.div>
      </div>
    </section>
  )
}
