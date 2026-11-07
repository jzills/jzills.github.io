import MiniSearch from 'minisearch'
import type { KnowledgeBase, KnowledgeEntry, EntryType } from '../knowledge/types'
import type { Normalizer } from '../text'

export interface Hit {
  entry: KnowledgeEntry
  score: number
  // Share of the question's meaningful tokens this entry matched.
  coverage: number
  // At least one token matched exactly, not just by prefix or typo tolerance.
  exact: boolean
}

export interface SearchOptions {
  types?: EntryType[]
  filter?: (entry: KnowledgeEntry) => boolean
  limit?: number
}

const FIELDS = ['title', 'technologies', 'tags', 'keywords', 'questions', 'summary', 'facts', 'quotes', 'sections', 'implied'] as const
type Field = (typeof FIELDS)[number]

const BOOST: Record<Field, number> = {
  title: 4,
  technologies: 3,
  tags: 2.5,
  keywords: 2.5,
  questions: 3,
  summary: 2,
  facts: 1.5,
  quotes: 1,
  sections: 0.6,
  implied: 0.8,
}

// README sections are long and numerous; they back up the main entries rather than lead.
const TYPE_WEIGHT: Partial<Record<EntryType, number>> = { 'project-doc': 0.45 }

export class Retriever {
  private readonly index: MiniSearch<Record<Field | 'id', string>>
  private readonly tokens = new Map<string, Set<string>>()
  readonly entries: KnowledgeEntry[]
  readonly text: Normalizer

  constructor(kb: KnowledgeBase, text: Normalizer) {
    this.text = text
    // Placeholders mark gaps; they never answer anything.
    this.entries = kb.entries.filter((e) => !e.placeholder)
    this.index = new MiniSearch({
      fields: [...FIELDS],
      storeFields: [],
      tokenize: (s) => text.tokenize(s),
      processTerm: (t) => t,
      searchOptions: { boost: BOOST },
    })

    const docs = this.entries.map((e) => {
      const fields: Record<Field, string> = {
        title: e.title,
        technologies: e.technologies.join(' | '),
        tags: e.tags.join(' | '),
        keywords: e.keywords.join(' | '),
        questions: e.questions.join(' | '),
        summary: e.summary,
        facts: e.facts.join(' '),
        quotes: e.quotes.join(' '),
        sections: e.sections.map((s) => `${s.heading}. ${s.text}`).join(' '),
        implied: '',
      }
      const own = new Set(FIELDS.flatMap((f) => text.tokenize(fields[f])))
      const implied = [...own].flatMap((t) => text.expand(t).slice(1)).filter((t) => !own.has(t))
      fields.implied = implied.join(' ')
      this.tokens.set(e.id, new Set([...own, ...implied]))
      return { id: e.id, ...fields }
    })
    this.index.addAll(docs)
  }

  byId(id: string) {
    return this.entries.find((e) => e.id === id)
  }

  // Whether the entry mentions the term, directly or through something that implies it.
  mentions(entry: KnowledgeEntry, token: string) {
    return this.tokens.get(entry.id)?.has(token) ?? false
  }

  // Whether one statement mentions the term.
  statementMentions(statement: string, token: string) {
    return this.text.tokenize(statement).some((t) => this.text.expand(t).includes(token))
  }

  entriesMentioning(token: string, types?: EntryType[]) {
    return this.entries.filter((e) => (!types || types.includes(e.type)) && this.mentions(e, token))
  }

  search(query: string, { types, filter, limit = 6 }: SearchOptions = {}): Hit[] {
    const queryTokens = [...new Set(this.text.tokenize(query))]
    if (queryTokens.length === 0) return []

    const results = this.index.search(queryTokens.join(' '), {
      // Typo tolerance and prefixes only for longer words, so "go" doesn't match "google".
      fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
      prefix: (term) => term.length >= 4,
      combineWith: 'OR',
      filter: (r) => {
        const e = this.byId(r.id as string)
        return !!e && (!types || types.includes(e.type)) && (!filter || filter(e))
      },
    })

    return results
      .map((r) => {
        const entry = this.byId(r.id as string)!
        const matched = new Set(r.queryTerms)
        return {
          entry,
          score: r.score * (TYPE_WEIGHT[entry.type] ?? 1),
          coverage: matched.size / queryTokens.length,
          exact: r.terms.some((t) => queryTokens.includes(t)),
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}
