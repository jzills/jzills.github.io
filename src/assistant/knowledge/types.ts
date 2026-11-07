// The portfolio assistant's knowledge base schema. See docs/assistant-knowledge-base.md
// for how entries are written and maintained.

export const entryTypes = [
  'overview',
  'experience',
  'skill',
  'project',
  'project-doc',
  'education',
  'certification',
  'faq',
  'contact',
] as const

export type EntryType = (typeof entryTypes)[number]

export interface EntryLink {
  label: string
  // An absolute http(s) or mailto URL, or a "#section" anchor on the home page.
  href: string
}

export interface EntrySection {
  heading: string
  text: string
}

export interface KnowledgeEntry {
  // Stable, unique, "type/slug" by convention, e.g. "experience/corient".
  id: string
  type: EntryType
  title: string
  // The lead statement answers open with. Third person, a complete sentence or fragment.
  summary: string
  // Supporting statements, each one able to stand alone in an answer.
  facts: string[]
  // Joshua's own first-person words; always shown in quotation marks.
  quotes: string[]
  // Named detail sections (Architecture, Features, Decisions, …).
  sections: EntrySection[]
  technologies: string[]
  tags: string[]
  // Synonyms and alternate phrasings. Searched, never shown.
  keywords: string[]
  // FAQ entries: the questions they answer, in a few phrasings.
  questions: string[]
  // Ids of related entries.
  related: string[]
  links: EntryLink[]
  // Portfolio anchor the entry lives at, e.g. "#exp-corient".
  anchor?: string
  experience?: { company: string; role: string; period: string; start?: number; current: boolean }
  skill?: { category: string; level?: string; members?: string[] }
  project?: { name: string; githubUrl?: string; docsUrl?: string }
  // Placeholders mark gaps to fill in. They are validated but never indexed or used in answers.
  placeholder: boolean
  origin: 'site' | 'extra'
}

// A partial entry from a Markdown file that adds to an existing entry instead of
// standing alone, e.g. extra architecture notes for a site project.
export interface EntryExtension {
  extends: string
  file: string
  facts: string[]
  quotes: string[]
  sections: EntrySection[]
  technologies: string[]
  tags: string[]
  keywords: string[]
  related: string[]
  links: EntryLink[]
}

export interface KnowledgeBase {
  entries: KnowledgeEntry[]
  byId: Map<string, KnowledgeEntry>
}
