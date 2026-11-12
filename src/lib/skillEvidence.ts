import type { ExperienceEntry } from '@/data/experience'
import type { Project } from '@/data/projects'
import { slug } from '@/lib/anchors'

// Where each skill shows up in the rest of the site: the jobs whose bullets
// mention it and the projects tagged with it, so a skill chip can point at
// the work behind it rather than just naming it.

// Other names a skill goes by in the experience and project text.
const ALIASES: Record<string, string[]> = {
  Kubernetes: ['k8s', 'kubectl', 'Helm charts'],
  'Agent SDKs': ['Agent SDK', 'AI Agents'],
  'GitHub Actions': ['GitHub Action'],
  Docker: ['Docker Hub', 'container'],
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whole-term, case-sensitive: ".NET" doesn't match inside "ASP.NET", and "Go"
// doesn't match "going". Skills are proper nouns, so case is a fair signal.
export function mentions(text: string, term: string): boolean {
  return new RegExp(`(?<![\\w.#+])${escape(term)}(?![\\w#+])`).test(text)
}

const terms = (skill: string) => [skill, ...(ALIASES[skill] ?? [])]

export interface JobEvidence { company: string; role: string; period: string; id: string }
// A project card on the page (`id`), or something off the page (`href`).
export interface ProjectEvidence { name: string; id?: string; href?: string }

// This portfolio is itself evidence for what it's built with (see package.json
// and .github/workflows/deploy.yml). Only what's actually true goes here.
const THIS_SITE = {
  name: 'This site',
  href: 'https://github.com/jzills/jzills.github.io',
  uses: ['React', 'TypeScript', 'GitHub Actions'],
}

export interface SkillEvidence {
  jobs: JobEvidence[]
  projects: ProjectEvidence[]
  // Earliest year a job that mentions it started, if any.
  since: number | null
}

const startYear = (period: string) => {
  const year = period.match(/\d{4}/)
  return year ? Number(year[0]) : null
}

export function evidenceFor(skill: string, experience: readonly ExperienceEntry[], projects: readonly Project[]): SkillEvidence {
  const hit = (text: string) => terms(skill).some((term) => mentions(text, term))

  const jobs = experience
    .filter((entry) => hit([entry.role, ...entry.bullets].join('\n')))
    .map((entry) => ({ company: entry.company, role: entry.role, period: entry.period, id: `exp-${slug(entry.company)}` }))

  const projectHits = projects
    .filter((p) => [...p.tags, ...(p.keywords ?? [])].some((tag) => terms(skill).includes(tag)) || hit(p.description))
    .map((p): ProjectEvidence => ({ name: p.name, id: `project-${slug(p.name)}` }))
  if (THIS_SITE.uses.includes(skill)) projectHits.push({ name: THIS_SITE.name, href: THIS_SITE.href })

  const years = experience
    .filter((entry) => jobs.some((job) => job.company === entry.company))
    .map((entry) => startYear(entry.period))
    .filter((y): y is number => y !== null)

  return { jobs, projects: projectHits, since: years.length ? Math.min(...years) : null }
}

export const evidenceCount = (e: SkillEvidence) => e.jobs.length + e.projects.length
