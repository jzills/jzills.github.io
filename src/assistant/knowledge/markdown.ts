import { entryTypes } from './types'
import type { EntryExtension, EntryLink, EntrySection, EntryType, KnowledgeEntry } from './types'

// Parses the hand-written entries in ./entries. A file is a small front-matter
// block followed by a Markdown body:
//
//   ---
//   id: faq/leadership
//   type: faq
//   title: Leadership and collaboration
//   tags: [leadership, teams]
//   links:
//     - Experience | #experience
//   ---
//   The summary paragraph.
//
//   - A fact.
//   > A first-person quote.
//
//   ## A detail section
//   Its text.
//
// Front matter supports `key: value`, `key: [a, b]` and indented `- item` lists,
// which is all the schema needs; it is not a YAML parser.

export type FrontMatter = Record<string, string | string[]>

export interface ParsedFile {
  entry?: KnowledgeEntry
  extension?: EntryExtension
  errors: string[]
}

const unquote = (s: string) => s.trim().replace(/^(['"])(.*)\1$/, '$2')

function splitList(inner: string) {
  // Commas inside quotes stay in the item.
  const items: string[] = []
  let current = ''
  let quote = ''
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = ''
      current += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
    } else if (ch === ',') {
      items.push(current)
      current = ''
    } else current += ch
  }
  items.push(current)
  return items.map(unquote).filter(Boolean)
}

export function parseFrontMatter(block: string): { data: FrontMatter; errors: string[] } {
  const data: FrontMatter = {}
  const errors: string[] = []
  let listKey: string | undefined
  for (const raw of block.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const item = raw.match(/^\s+-\s+(.*)$/)
    if (item) {
      if (!listKey) errors.push(`list item outside a list: "${raw.trim()}"`)
      else (data[listKey] as string[]).push(unquote(item[1]))
      continue
    }
    const pair = raw.match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (!pair) {
      errors.push(`unreadable front-matter line: "${raw.trim()}"`)
      continue
    }
    const [, key, value] = pair
    listKey = undefined
    if (value === '') {
      data[key] = []
      listKey = key
    } else if (value.startsWith('[') && value.endsWith(']')) data[key] = splitList(value.slice(1, -1))
    else data[key] = unquote(value)
  }
  return { data, errors }
}

interface Body {
  summary: string
  facts: string[]
  quotes: string[]
  sections: EntrySection[]
}

export function parseBody(md: string): Body {
  const body: Body = { summary: '', facts: [], quotes: [], sections: [] }
  const intro: string[] = []
  let section: { heading: string; lines: string[] } | undefined
  const closeSection = () => {
    if (section) body.sections.push({ heading: section.heading, text: section.lines.join(' ').trim() })
  }

  for (const raw of md.split('\n')) {
    const line = raw.trim()
    const heading = line.match(/^#{2,6}\s+(.*)$/)
    if (heading) {
      closeSection()
      section = { heading: heading[1].trim(), lines: [] }
      continue
    }
    if (section) {
      if (line) section.lines.push(line.replace(/^[-*]\s+/, ''))
      continue
    }
    if (/^[-*]\s+/.test(line)) body.facts.push(line.replace(/^[-*]\s+/, ''))
    else if (line.startsWith('>')) body.quotes.push(line.replace(/^>\s?/, ''))
    else if (line && !line.startsWith('# ')) intro.push(line)
  }
  closeSection()
  body.summary = intro.join(' ').trim()
  return body
}

const asList = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v])
const asString = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : v)

export function parseLinks(items: string[], errors: string[]): EntryLink[] {
  return items.flatMap((item) => {
    const [label, href] = item.split('|').map((s) => s.trim())
    if (!label || !href) {
      errors.push(`link "${item}" should be "Label | URL"`)
      return []
    }
    return [{ label, href }]
  })
}

export function parseEntryFile(file: string, source: string): ParsedFile {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { errors: [`${file}: missing the --- front-matter block`] }

  const { data, errors: fmErrors } = parseFrontMatter(match[1])
  const errors = fmErrors.map((e) => `${file}: ${e}`)
  const body = parseBody(match[2])
  const linkErrors: string[] = []
  const links = parseLinks(asList(data.links), linkErrors)
  errors.push(...linkErrors.map((e) => `${file}: ${e}`))

  const shared = {
    facts: body.facts,
    quotes: body.quotes,
    sections: body.sections,
    technologies: asList(data.technologies),
    tags: asList(data.tags),
    keywords: asList(data.keywords),
    related: asList(data.related),
    links,
  }

  const extendsId = asString(data.extends)
  if (extendsId) return { extension: { extends: extendsId, file, ...shared }, errors }

  const type = asString(data.type) as EntryType
  if (!entryTypes.includes(type)) errors.push(`${file}: type "${type ?? ''}" is not one of ${entryTypes.join(', ')}`)

  const company = asString(data.company)
  const role = asString(data.role)
  const period = asString(data.period) ?? ''
  const category = asString(data.category)
  const project = asString(data.project)

  const entry: KnowledgeEntry = {
    id: asString(data.id) ?? '',
    type,
    title: asString(data.title) ?? '',
    summary: body.summary,
    questions: asList(data.questions),
    ...shared,
    anchor: asString(data.anchor),
    experience: company && role ? { company, role, period, start: Number(period.match(/\d{4}/)?.[0]) || undefined, current: /present/i.test(period) } : undefined,
    skill: category ? { category, level: asString(data.level) } : undefined,
    project: project ? { name: project, githubUrl: asString(data.github), docsUrl: asString(data.docs) } : undefined,
    placeholder: asString(data.placeholder) === 'true',
    origin: 'extra',
  }
  return { entry, errors }
}
