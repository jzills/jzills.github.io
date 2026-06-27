import type { ExperienceEntry } from '@/data/experience'

interface Props {
  entries: ExperienceEntry[]
}

export function Timeline({ entries }: Props) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />
      <div className="space-y-12">
        {entries.map((entry, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[33px] top-[9px] w-2 h-2 rounded-full bg-accent" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-3">
              <div>
                <span className="text-lg font-semibold text-fg">{entry.role}</span>
                <span className="text-muted mx-2">@</span>
                <span className="text-accent">{entry.company}</span>
              </div>
              <span className="text-xs font-mono text-muted sm:ml-auto shrink-0">{entry.period}</span>
            </div>
            <ul className="space-y-2">
              {entry.bullets.map((bullet, j) => (
                <li key={j} className="text-muted text-sm leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[0.7em] before:w-1 before:h-px before:bg-muted">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
