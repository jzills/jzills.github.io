import { parseEntryFile } from './markdown'
import { entryTypes } from './types'
import type { EntryExtension, KnowledgeBase, KnowledgeEntry } from './types'

export class KnowledgeBaseError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(`The assistant knowledge base has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`)
    this.problems = problems
  }
}

const validHref = (href: string) => /^(https?:\/\/|mailto:|#)/.test(href)

export function validateEntries(entries: KnowledgeEntry[]): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const e of entries) {
    const where = e.id || `"${e.title || 'untitled'}"`
    if (!e.id) problems.push(`${where}: missing id`)
    else if (ids.has(e.id)) problems.push(`${e.id}: duplicate id`)
    ids.add(e.id)
    if (!entryTypes.includes(e.type)) problems.push(`${where}: unknown type "${e.type}"`)
    if (!e.title) problems.push(`${where}: missing title`)
    // A placeholder only marks a gap, so it may be empty.
    if (!e.placeholder && !e.summary && e.facts.length === 0 && e.sections.length === 0) problems.push(`${where}: needs a summary, a fact or a section`)
    if (e.type === 'faq' && !e.placeholder && e.questions.length === 0) problems.push(`${where}: FAQ entries need questions`)
    for (const link of e.links) if (!validHref(link.href)) problems.push(`${where}: link "${link.label}" has an unsupported href "${link.href}"`)
    if (e.anchor && !e.anchor.startsWith('#')) problems.push(`${where}: anchor must start with #`)
  }
  for (const e of entries) {
    for (const r of e.related) if (!ids.has(r)) problems.push(`${e.id}: related entry "${r}" does not exist`)
  }
  return problems
}

function applyExtension(target: KnowledgeEntry, ext: EntryExtension) {
  target.facts.push(...ext.facts)
  target.quotes.push(...ext.quotes)
  target.sections.push(...ext.sections)
  target.technologies.push(...ext.technologies)
  target.tags.push(...ext.tags)
  target.keywords.push(...ext.keywords)
  target.related.push(...ext.related)
  target.links.push(...ext.links)
}

// Combines the site layer with the hand-written Markdown entries and validates
// the result. Throws with every problem at once, so one run lists them all.
export function buildKnowledgeBase(site: KnowledgeEntry[], files: Record<string, string>): KnowledgeBase {
  const problems: string[] = []
  const entries = site.map((e) => ({ ...e, facts: [...e.facts], quotes: [...e.quotes], sections: [...e.sections], technologies: [...e.technologies], tags: [...e.tags], keywords: [...e.keywords], related: [...e.related], links: [...e.links] }))
  const extensions: EntryExtension[] = []

  for (const [file, source] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const parsed = parseEntryFile(file, source)
    problems.push(...parsed.errors)
    if (parsed.entry) entries.push(parsed.entry)
    if (parsed.extension) extensions.push(parsed.extension)
  }

  const byId = new Map(entries.map((e) => [e.id, e]))
  for (const ext of extensions) {
    const target = byId.get(ext.extends)
    if (!target) problems.push(`${ext.file}: extends "${ext.extends}", which does not exist`)
    else applyExtension(target, ext)
  }

  problems.push(...validateEntries(entries))
  if (problems.length) throw new KnowledgeBaseError(problems)
  return { entries, byId }
}
