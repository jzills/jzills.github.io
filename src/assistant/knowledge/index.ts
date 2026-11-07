import { buildKnowledgeBase } from './build'
import { siteEntries } from './site'

// Every Markdown file under ./entries, bundled as text.
const files = import.meta.glob<string>('./entries/**/*.md', { query: '?raw', import: 'default', eager: true })

export const loadKnowledgeBase = () => buildKnowledgeBase(siteEntries(), files)

export type { KnowledgeBase, KnowledgeEntry, EntryType, EntryLink } from './types'
