import { projects } from '@/data/projects'
import { experience } from '@/data/experience'
import { skillGroups } from '@/data/skills'
import { creativeItems } from '@/data/creative'
import readmes from '@/data/generated/readmes.json'
import { LAB_PATH } from '@/lib/pages'

export type SearchKind = 'Project' | 'Experience' | 'Skill' | 'Creative' | 'Section' | 'Docs'

export interface SearchRecord {
  kind: SearchKind
  title: string
  subtitle?: string
  tags: string[]
  body: string
  // Element id to scroll to.
  target: string
  // Page the target lives on; defaults to the home page.
  path?: string
  // External URL opened in a new tab instead of scrolling to target.
  href?: string
}

export interface SearchResult {
  record: SearchRecord
  score: number
  // A body excerpt centred on the first body match, or the body's opening.
  snippet?: string
}

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Anchor id of a creative item's card on the lab page.
export const labId = (title: string) => `lab-${slug(title)}`

const records: SearchRecord[] = [
  ...projects.map((p): SearchRecord => ({
    kind: 'Project',
    title: p.name,
    tags: [...p.tags, ...(p.keywords ?? []), ...(p.packages?.map((pkg) => pkg.registry) ?? [])],
    body: p.description,
    target: `project-${slug(p.name)}`,
  })),
  ...experience.map((e): SearchRecord => ({
    kind: 'Experience',
    title: e.role,
    subtitle: `${e.company} · ${e.period}`,
    tags: [],
    body: e.bullets.join(' '),
    target: `exp-${slug(e.company)}`,
  })),
  ...skillGroups.flatMap((g) =>
    g.skills.map((skill): SearchRecord => ({
      kind: 'Skill',
      title: skill,
      subtitle: g.label,
      tags: [],
      body: '',
      target: `skills-${slug(g.label)}`,
    })),
  ),
  ...creativeItems.map((c): SearchRecord => ({
    kind: 'Creative',
    title: c.title,
    tags: [c.kind, ...c.tags],
    body: c.description,
    target: labId(c.title),
    path: LAB_PATH,
  })),
  ...readmes.map((r): SearchRecord => ({
    kind: 'Docs',
    title: r.heading,
    subtitle: r.project,
    tags: [],
    body: r.body,
    target: `project-${slug(r.project)}`,
    href: r.url,
  })),
  {
    kind: 'Section',
    title: 'About',
    tags: [],
    body: 'Platform engineering, CI/CD pipelines, Kubernetes clusters, automation. Background in .NET software development. Creative coding: generative audio, image processing.',
    target: 'about',
  },
  {
    kind: 'Section',
    title: 'Contact',
    tags: ['GitHub', 'LinkedIn', 'Email'],
    body: 'Get in touch by email, GitHub or LinkedIn. Resume.',
    target: 'contact',
  },
]

function excerpt(text: string, at: number, radius = 60) {
  const start = Math.max(0, at - radius)
  const end = Math.min(text.length, start + radius * 2)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

export function tokenize(query: string) {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

// README sections are long, so plain substring matching would let "go" hit
// "algorithm". Their terms must start a word, and short terms must be the whole word.
function wordAt(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}${term.length < 3 ? '(?![\\p{L}\\p{N}])' : ''}`, 'u')
  return text.search(re)
}

// README hits fill gaps; they score lower and take at most this many slots.
const DOCS_WEIGHT = 0.3
const DOCS_LIMIT = 3

// Every term must appear somewhere in the record (AND). Hits in the title
// outrank tags, tags outrank the subtitle, and the subtitle outranks the body.
export function search(query: string, limit = 8): SearchResult[] {
  const terms = tokenize(query)
  if (terms.length === 0) return []

  const results: SearchResult[] = []
  for (const record of records) {
    const title = record.title.toLowerCase()
    const tags = record.tags.map((t) => t.toLowerCase())
    const subtitle = record.subtitle?.toLowerCase() ?? ''
    const body = record.body.toLowerCase()
    const docs = record.kind === 'Docs'
    const find = (text: string, term: string) => (docs ? wordAt(text, term) : text.indexOf(term))

    let score = 0
    let bodyHit = -1
    let matchedAll = true
    for (const term of terms) {
      let s = 0
      const inTitle = find(title, term)
      if (inTitle >= 0) s += inTitle === 0 ? 15 : 10
      if (tags.some((t) => t.includes(term))) s += 6
      if (find(subtitle, term) >= 0) s += 4
      const at = find(body, term)
      if (at >= 0) {
        s += 1
        if (bodyHit < 0) bodyHit = at
      }
      if (s === 0) {
        matchedAll = false
        break
      }
      score += s
    }
    if (!matchedAll) continue

    results.push({
      record,
      score: docs ? score * DOCS_WEIGHT : score,
      snippet: record.body ? excerpt(record.body, Math.max(bodyHit, 0)) : undefined,
    })
  }

  let docsLeft = DOCS_LIMIT
  return results
    .sort((a, b) => b.score - a.score)
    .filter((r) => r.record.kind !== 'Docs' || docsLeft-- > 0)
    .slice(0, limit)
}
