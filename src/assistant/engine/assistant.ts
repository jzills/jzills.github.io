import type { KnowledgeBase, KnowledgeEntry } from '../knowledge/types'
import { categories as categoryDefs, terms as termDefs, unlistedTerms } from '../knowledge/vocabulary'
import type { CategoryDefinition } from '../knowledge/vocabulary'
import { Normalizer } from '../text'
import type { Term, TermSource } from '../text'
import { parseQuestion } from './intent'
import type { Aspect, Intent, ParsedQuestion } from './intent'
import { Retriever } from './retrieval'
import { emptyContext } from '../context'
import type { ConversationContext } from '../context'
import type { Hit } from './retrieval'
import { asPredicate, editDistance, endSentence, firstSentence, joinList, link, lowerFirst, sentencesOf, upperFirst, variant } from './phrasing'

// ---------------------------------------------------------------------------
// Answers

// How well the knowledge base backs the answer. "related" means the answer
// shows nearby information that doesn't settle the question.
export type Support = 'supported' | 'related' | 'unavailable' | 'clarify' | 'chat'

// Text may carry inline [label](href) links.
export type Block = { kind: 'p'; text: string } | { kind: 'list'; items: string[] } | { kind: 'quote'; text: string }

export interface Source {
  id: string
  label: string
  href?: string
}

export interface Answer {
  support: Support
  blocks: Block[]
  sources: Source[]
  suggestions: string[]
}

export const STARTER_QUESTIONS = [
  'What is his professional background?',
  'Tell me about his Kubernetes experience.',
  'What open-source projects has he built?',
  'What is his experience with .NET?',
  'What cloud and DevOps technologies does he use?',
]

export interface AssistantOptions {
  // Injected for tests; "years of experience" counts to the current year.
  now?: () => Date
}

// ---------------------------------------------------------------------------

interface Evidence {
  entry: KnowledgeEntry
  key: string
  text: string
  rank: number
}

interface Turn {
  q: ParsedQuestion
  shown: Set<string>
  continuing: boolean
  used: string[]
}

const LIST_LIMIT = 4

// Terms whose evidence speaks to each kind of role, for "what makes him a good X?".
const ROLE_EVIDENCE: Record<string, { label: string; terms: string[] }> = {
  platform_engineering: { label: 'platform engineering', terms: ['Platform Engineering', 'Kubernetes', 'Terraform', 'CI/CD', 'Infrastructure as Code', 'GitOps', 'Helm'] },
  devops: { label: 'DevOps', terms: ['Kubernetes', 'CI/CD', 'Terraform', 'Docker', 'GitHub Actions', 'Azure DevOps', 'GitOps'] },
  data: { label: 'data engineering', terms: ['Data Pipelines', 'Databricks', 'dbt', 'Prefect'] },
  '.net': { label: '.NET development', terms: ['.NET', 'C#', 'ASP.NET Core', 'SignalR'] },
  ai: { label: 'AI-assisted engineering', terms: ['AI', 'MCP', 'Claude Code', 'Azure OpenAI'] },
  cloud: { label: 'cloud engineering', terms: ['Azure', 'Terraform', 'Kubernetes'] },
  software: { label: 'software engineering', terms: ['.NET', 'C#', 'TypeScript', 'Go', 'SignalR', 'Caching'] },
}

const LEADERSHIP = /\b(led|lead|leads|leading|mentor\w*|across engineering teams|championed|drove)\b/i

export class Assistant {
  readonly text: Normalizer
  readonly retriever: Retriever
  private readonly kb: KnowledgeBase
  private readonly now: () => Date
  private readonly projects: KnowledgeEntry[]
  private readonly roles: KnowledgeEntry[]

  constructor(kb: KnowledgeBase, { now = () => new Date() }: AssistantOptions = {}) {
    this.kb = kb
    this.now = now
    const live = kb.entries.filter((e) => !e.placeholder)

    // Every technology the site names becomes a term, so it is folded and matched
    // the same way in questions and entries. Keywords are searchable but weak.
    const sources: TermSource[] = [
      ...termDefs,
      ...unlistedTerms.map((t) => ({ ...t, listed: false })),
      ...live.flatMap((e) => [
        ...(e.type === 'project' ? e.tags.filter((t) => !['project', 'open source'].includes(t)) : e.technologies).map((name) => ({ name })),
        ...(e.type === 'project' ? e.technologies.filter((t) => !e.tags.includes(t)).map((name) => ({ name, weak: true })) : []),
      ]),
    ]
    this.text = new Normalizer(sources)

    // Roles don't list their technologies; read them from the bullets.
    for (const e of kb.entries) {
      if (e.type === 'experience' && e.technologies.length === 0) e.technologies = this.text.termsIn(e.facts.join(' ')).map((t) => t.name)
    }

    this.retriever = new Retriever(kb, this.text)
    this.projects = this.retriever.entries.filter((e) => e.type === 'project')
    this.roles = this.retriever.entries
      .filter((e) => e.type === 'experience')
      .sort((a, b) => Number(b.experience!.current) - Number(a.experience!.current) || (b.experience!.start ?? 0) - (a.experience!.start ?? 0))
  }

  get starterQuestions() {
    return STARTER_QUESTIONS
  }

  ask(question: string, context: ConversationContext = emptyContext()): { answer: Answer; context: ConversationContext } {
    const trimmed = question.trim()
    if (!trimmed) return { answer: this.help(), context }

    let q = parseQuestion(trimmed, { text: this.text, categories: categoryDefs, projects: this.projects })
    q = this.correctTypos(q)
    const { q: resolved, continuing } = this.resolveFollowUp(q, context)
    q = resolved

    const sameTopic = continuing
    const turn: Turn = { q, shown: new Set(sameTopic ? context.shown : []), continuing, used: [] }
    const answer = this.compose(turn)

    const next: ConversationContext = {
      intent: q.intent,
      subjects: q.subjects.map((t) => t.token),
      projects: q.projects.map((p) => p.id),
      categories: q.categories.map((c) => c.name),
      aspect: q.aspect,
      role: q.role,
      unknownSubject: q.unknownSubject,
      shown: [...turn.shown, ...turn.used],
    }
    // Small talk doesn't change the topic.
    return { answer, context: answer.support === 'chat' ? { ...context } : next }
  }

  // -------------------------------------------------------------------------
  // Understanding the question

  // "kuberentes" → Kubernetes, when the vocabulary has a close match.
  private correctTypos(q: ParsedQuestion): ParsedQuestion {
    if (q.subjects.length || q.unlisted.length || q.projects.length || q.categories.length) return q
    if (q.intent !== 'tech' && q.intent !== 'search') return q
    const words = q.unknownSubject ? [q.unknownSubject] : this.text.tokenize(q.raw).filter((w) => !this.text.term(w))
    for (const word of words) {
      if (word.length < 4 || word.includes(' ')) continue
      let best: { term: Term; d: number } | undefined
      for (const term of this.text.terms) {
        if (term.weak) continue
        const d = editDistance(word, term.name.toLowerCase())
        if (d > 0 && d <= (word.length >= 7 ? 2 : 1) && (!best || d < best.d)) best = { term, d }
      }
      if (!best) continue
      const fixed = { ...q, intent: 'tech' as const, unknownSubject: undefined, corrected: best.term.name }
      return best.term.listed ? { ...fixed, subjects: [best.term] } : { ...fixed, unlisted: [best.term] }
    }
    return q
  }

  private resolveFollowUp(q: ParsedQuestion, ctx: ConversationContext): { q: ParsedQuestion; continuing: boolean } {
    const prevSubjects = ctx.subjects.map((t) => this.text.term(t)).filter((t): t is Term => !!t)
    const prevProjects = ctx.projects.map((id) => this.retriever.byId(id)).filter((e): e is KnowledgeEntry => !!e)
    const prevCategories = categoryDefs.filter((c) => ctx.categories.includes(c.name))
    const named = q.subjects.length || q.unlisted.length || q.projects.length || q.categories.length || q.unknownSubject

    if (q.intent === 'more') {
      if (named) return { q: { ...q, intent: q.projects.length ? 'project_detail' : q.categories.length ? 'skills' : 'tech' }, continuing: false }
      if (!ctx.intent) return { q, continuing: false }
      return {
        q: { ...q, intent: ctx.intent, subjects: prevSubjects, projects: prevProjects, categories: prevCategories, aspect: ctx.aspect, role: ctx.role, unknownSubject: ctx.unknownSubject },
        continuing: true,
      }
    }
    if (!ctx.intent) return { q, continuing: false }

    // "What about Azure?" / "And Terraform?" / a bare "Helm?" after a technology question.
    const bare = named && q.raw.split(/\s+/).length <= 3 && q.intent === 'tech'
    if (named && (q.shifts || bare)) {
      if (q.projects.length) return { q: { ...q, intent: 'project_detail' }, continuing: false }
      if (q.categories.length) return { q: { ...q, intent: 'skills' }, continuing: false }
      if (ctx.intent === 'projects') return { q: { ...q, intent: 'projects' }, continuing: false }
      return { q: { ...q, intent: 'tech' }, continuing: false }
    }

    // "What are its features?", "Where did he use it?", "Which projects use that?"
    if (!named && (q.refersBack || q.aspect || q.intent === 'search')) {
      if (prevProjects.length && (q.aspect || q.refersBack || q.intent === 'search')) {
        return { q: { ...q, intent: 'project_detail', projects: prevProjects }, continuing: false }
      }
      if (prevSubjects.length && q.refersBack) {
        const intent: Intent = q.intent === 'projects' ? 'projects' : q.intent === 'years' ? 'tech' : q.intent === 'search' ? 'tech' : q.intent
        return { q: { ...q, intent, subjects: prevSubjects }, continuing: false }
      }
    }
    return { q, continuing: false }
  }

  // -------------------------------------------------------------------------
  // Composing answers

  private compose(t: Turn): Answer {
    switch (t.q.intent) {
      case 'greeting':
        return this.chat([`Hi! I can answer questions about ${this.first}'s experience, skills and open-source projects, using what's on this site.`])
      case 'thanks':
        return this.chat(['Glad to help. Ask anything else about his work whenever you like.'])
      case 'help':
        return this.help()
      case 'more':
        return this.chat(['Happy to go further. What would you like to know more about?'])
      case 'contact':
        return this.contact()
      case 'personal':
        return this.personal(t)
      case 'education':
        return this.credentials(t, 'education', 'His education')
      case 'certifications':
        return this.credentials(t, 'certification', 'Certifications')
      case 'years':
        return this.years(t)
      case 'current_role':
        return this.currentRole(t)
      case 'career':
        return this.career(t)
      case 'fit':
        return this.fit(t)
      case 'leadership':
        return this.leadership(t)
      case 'background':
        return this.background(t)
      case 'projects':
        return this.projectList(t)
      case 'project_detail':
        return this.projectDetail(t)
      case 'skills':
        return this.skills(t)
      case 'tech':
        return this.tech(t)
      default:
        return this.search(t)
    }
  }

  private get first() {
    return this.kb.byId.get('overview/summary')?.summary.split(' ')[0] ?? 'Joshua'
  }

  private chat(paragraphs: string[], suggestions: string[] = []): Answer {
    return { support: 'chat', blocks: paragraphs.map((text) => ({ kind: 'p', text })), sources: [], suggestions }
  }

  private help(): Answer {
    return this.chat(
      [
        `I answer questions about ${this.first}'s professional experience, technical skills, career history and open-source projects. Everything I say comes from this portfolio, and when it doesn't cover something I'll tell you.`,
      ],
      STARTER_QUESTIONS.slice(0, 4),
    )
  }

  private answer(support: Support, blocks: Block[], entries: KnowledgeEntry[], suggestions: string[] = []): Answer {
    const sources: Source[] = []
    for (const e of entries) {
      const s = this.sourceOf(e)
      if (!sources.some((x) => x.label === s.label)) sources.push(s)
    }
    return { support, blocks: blocks.filter((b) => (b.kind === 'list' ? b.items.length > 0 : b.text)), sources, suggestions }
  }

  private sourceOf(e: KnowledgeEntry): Source {
    switch (e.type) {
      case 'experience':
        return { id: e.id, label: `Experience · ${e.experience!.company}`, href: e.anchor }
      case 'project':
        return { id: e.id, label: e.title, href: e.anchor }
      case 'project-doc':
        return { id: e.id, label: `${e.project!.name} README`, href: e.links[0]?.href }
      case 'skill':
        return { id: e.id, label: 'Technical skills', href: e.anchor }
      case 'overview':
        return { id: e.id, label: 'About', href: e.anchor }
      case 'contact':
        return { id: e.id, label: 'Contact', href: e.anchor }
      default:
        return { id: e.id, label: e.title, href: e.anchor ?? e.links[0]?.href }
    }
  }

  private unavailable(text: string, suggestions: string[] = STARTER_QUESTIONS.slice(0, 3)): Answer {
    return this.answer('unavailable', [{ kind: 'p', text }], [], suggestions)
  }

  private askHimDirectly() {
    const contact = this.kb.byId.get('contact/links')
    const email = contact?.links.find((l) => l.href.startsWith('mailto:'))
    const linkedin = contact?.links.find((l) => l.label === 'LinkedIn')
    const ways = [email && link('email', email.href), linkedin && link('LinkedIn', linkedin.href)].filter(Boolean) as string[]
    return ways.length ? `The best way to find out is to ask him directly by ${joinList(ways).replace(' and ', ' or ')}.` : ''
  }

  // "As Senior DevOps Engineer at New American Funding (2025 – 2026), he led …"
  private roleSentence(e: KnowledgeEntry, fact: string, continued: boolean) {
    const x = e.experience
    const extra = e.origin === 'extra' && /^(he|his|joshua)\b/i.test(fact)
    if (!x || extra) return endSentence(fact)
    const predicate = endSentence(asPredicate(fact, x.current))
    if (continued) return `He also ${predicate}`
    return `As ${x.role} at ${x.company} (${x.period}), he ${predicate}`
  }

  // The project's first sentence, plus the one that mentions the technology asked about.
  private projectLine(e: KnowledgeEntry, token?: string) {
    const name = e.project?.githubUrl ? link(e.title, e.project.githubUrl) : e.title
    const sentences = sentencesOf(e.summary)
    const relevant = token ? sentences.find((s) => this.retriever.statementMentions(s, token)) : undefined
    const text = relevant && relevant !== sentences[0] ? `${sentences[0]} ${relevant}` : sentences[0] ?? e.summary
    return `${name}: ${endSentence(text)}`
  }

  // The sentences of a quote that mention the term, so a quote stays short and on topic.
  private quoteAbout(quote: string, token: string) {
    return sentencesOf(quote).find((s) => this.retriever.statementMentions(s, token)) ?? firstSentence(quote)
  }

  private docLine(e: KnowledgeEntry) {
    const heading = e.sections[0]?.heading ?? e.title
    const url = e.links[0]?.href
    const label = url ? link(`“${heading}”`, url) : `“${heading}”`
    return e.summary ? `The ${e.project!.name} README's ${label} section: ${endSentence(e.summary)}` : `The ${e.project!.name} README's ${label} section covers this in detail.`
  }

  // Everything that mentions a technology, strongest first.
  private evidence(token: string): { items: Evidence[]; listing?: KnowledgeEntry; docs: Evidence[]; quotes: Evidence[] } {
    const items: Evidence[] = []
    const docs: Evidence[] = []
    const quotes: Evidence[] = []
    let listing: KnowledgeEntry | undefined
    let implied: KnowledgeEntry | undefined
    const mentions = (s: string) => this.retriever.statementMentions(s, token)

    for (const e of this.retriever.entriesMentioning(token)) {
      switch (e.type) {
        case 'experience': {
          const order = this.roles.indexOf(e)
          const facts = e.facts.filter(mentions)
          if (facts.length) facts.forEach((f, i) => items.push({ entry: e, key: `${e.id}#${f}`, text: this.roleSentence(e, f, i > 0), rank: order }))
          else items.push({ entry: e, key: e.id, text: `His role as ${e.experience!.role} at ${e.experience!.company} (${e.experience!.period}).`, rank: order })
          break
        }
        case 'project':
          items.push({ entry: e, key: e.id, text: this.projectLine(e, token), rank: 10 })
          break
        case 'project-doc':
          docs.push({ entry: e, key: e.id, text: this.docLine(e), rank: 20 })
          break
        case 'skill':
          if (e.skill?.members) break
          if (this.text.termFor(e.title)?.token === token) listing = e
          else implied ??= e
          break
        case 'overview':
          for (const quote of e.quotes.filter(mentions)) quotes.push({ entry: e, key: `${e.id}#${quote}`, text: this.quoteAbout(quote, token), rank: 30 })
          break
        default: {
          const facts = [e.summary, ...e.facts].filter((f) => f && mentions(f))
          for (const f of facts.length ? facts : [e.summary]) items.push({ entry: e, key: `${e.id}#${f}`, text: endSentence(f), rank: 5 })
        }
      }
    }
    items.sort((a, b) => a.rank - b.rank)
    return { items, listing: listing ?? implied, docs, quotes }
  }

  private take(t: Turn, items: Evidence[], limit = LIST_LIMIT) {
    const fresh = items.filter((i) => !t.shown.has(i.key))
    const shown = fresh.slice(0, limit)
    t.used.push(...shown.map((i) => i.key))
    // A role's follow-on sentence ("He also …") loses its subject when the first is cut.
    const texts = shown.map((i, n) => {
      const prev = shown[n - 1]
      if (i.text.startsWith('He also ') && prev?.entry !== i.entry) {
        const fact = i.key.slice(i.entry.id.length + 1)
        return this.roleSentence(i.entry, fact, false)
      }
      return i.text
    })
    return { texts, shown, remaining: fresh.length - shown.length }
  }

  private tech(t: Turn): Answer {
    const { q } = t
    if (!q.subjects.length) {
      const name = q.unlisted[0]?.name ?? q.unknownSubject
      if (!name) return this.search(t)
      // An unfamiliar word may still be in the text (a README, a keyword) even if it isn't a known technology.
      if (!q.unlisted.length) {
        const hits = this.retriever.search(name).filter((h) => h.exact && h.coverage === 1)
        if (hits.length) return this.fromHits(t, hits, `His portfolio doesn't list ${name} as a skill, but it does come up here:`, 'related')
      }
      const category = q.unlisted[0]?.category
      const categoryQuestion = category ? `What ${category.toLowerCase()} does he use?` : undefined
      return this.unavailable(
        `His portfolio doesn't mention ${name}, so I can't say whether he has worked with it. ${this.askHimDirectly()}`.trim(),
        [categoryQuestion, ...STARTER_QUESTIONS.slice(1, 3)].filter((s): s is string => !!s),
      )
    }

    const blocks: Block[] = []
    const entries: KnowledgeEntry[] = []
    let support: Support = 'unavailable'
    let more = 0

    for (const term of q.subjects.slice(0, 2)) {
      const ev = this.evidence(term.token)
      const { texts, shown, remaining } = this.take(t, ev.items, q.subjects.length > 1 ? 3 : LIST_LIMIT)
      more += remaining
      entries.push(...shown.map((s) => s.entry))
      const listingText = ev.listing && !t.continuing ? (this.text.termFor(ev.listing.title)?.token === term.token ? `He lists ${term.name} under ${ev.listing.skill!.category} in his skills.` : `${term.name} isn't listed as a skill on its own, but his skills include ${ev.listing.title} (${ev.listing.skill!.category}).`) : undefined
      if (ev.listing && !t.continuing) entries.push(ev.listing)

      if (texts.length) {
        support = 'supported'
        blocks.push({
          kind: 'p',
          text: t.continuing
            ? `Here's more on his ${term.name} work:`
            : variant([`Yes. Here's where his portfolio mentions ${term.name}:`, `Yes — here's what his portfolio says about ${term.name}:`], q.raw + term.token),
        })
        blocks.push({ kind: 'list', items: texts })
        if (listingText) blocks.push({ kind: 'p', text: listingText })
        if (q.intent === 'tech' && /\b(how (many|long)|years)\b/i.test(q.raw)) {
          const periods = [...new Set(shown.filter((s) => s.entry.experience).map((s) => `${s.entry.experience!.company} (${s.entry.experience!.period})`))]
          if (periods.length) blocks.push({ kind: 'p', text: `The portfolio doesn't give a number of years for ${term.name} specifically. The roles that mention it are dated ${joinList(periods)}.` })
        }
        const quote = ev.quotes.find((x) => !t.shown.has(x.key))
        if (quote && !t.continuing) {
          blocks.push({ kind: 'quote', text: quote.text })
          t.used.push(quote.key)
          entries.push(quote.entry)
        }
      } else if (listingText) {
        support = 'supported'
        blocks.push({ kind: 'p', text: `${listingText} The portfolio doesn't describe specific work with it beyond that.` })
      } else if (ev.docs.some((d) => !t.shown.has(d.key))) {
        const docs = this.take(t, ev.docs, 2)
        {
          support = support === 'supported' ? support : 'related'
          blocks.push({
            kind: 'p',
            text: t.continuing ? `${upperFirst(term.name)} also comes up in his project documentation:` : `${upperFirst(term.name)} isn't listed in his skills or roles, but it comes up in his project documentation:`,
          })
          blocks.push({ kind: 'list', items: docs.texts })
          entries.push(...docs.shown.map((s) => s.entry))
        }
      } else if (t.continuing) {
        blocks.push({ kind: 'p', text: `That's everything his portfolio has on ${term.name}.` })
        support = support === 'unavailable' ? 'supported' : support
      } else {
        blocks.push({ kind: 'p', text: `His portfolio doesn't mention ${term.name}.` })
      }
    }

    for (const term of q.unlisted) blocks.push({ kind: 'p', text: `His portfolio doesn't mention ${term.name}.` })
    if (more > 0) blocks.push({ kind: 'p', text: `There's more — ask “tell me more” to see it.` })
    if (support === 'unavailable') blocks.push({ kind: 'p', text: this.askHimDirectly() })

    if (q.corrected && blocks[0]?.kind === 'p') blocks[0] = { kind: 'p', text: `(Reading that as ${q.corrected}.) ${blocks[0].text}` }
    const suggestions = this.relatedQuestions(q.subjects, entries)
    return this.answer(support, blocks, entries, suggestions)
  }

  private relatedQuestions(subjects: Term[], entries: KnowledgeEntry[]) {
    const asked = new Set(subjects.map((s) => s.token))
    const out: string[] = []
    const project = entries.find((e) => e.type === 'project')
    if (project) out.push(`Tell me about ${project.title}`)
    const role = entries.find((e) => e.type === 'experience')
    // Suggest a neighbouring skill from the same role, one the skills section lists.
    const tech = role?.technologies
      .map((n) => this.text.termFor(n))
      .find((term) => term && !asked.has(term.token) && !term.weak && this.retriever.entriesMentioning(term.token, ['skill']).some((s) => !s.skill?.members))
    if (tech) out.push(`What about ${tech.name}?`)
    if (out.length < 3) out.push('What open-source projects has he built?')
    return out.slice(0, 3)
  }

  private contact(): Answer {
    const contact = this.kb.byId.get('contact/links')
    if (!contact) return this.unavailable("The portfolio doesn't list contact details.")
    const links = contact.links.map((l) => link(l.label, l.href))
    return this.answer('supported', [{ kind: 'p', text: `You can reach ${this.first} through any of these: ${joinList(links)}.` }], [contact])
  }

  private faqHits(t: Turn) {
    return this.retriever.search(t.q.raw, { types: ['faq'] }).filter((h) => h.exact && h.coverage >= 0.5)
  }

  private personal(t: Turn): Answer {
    const hits = this.faqHits(t)
    if (hits.length) return this.fromHits(t, hits.slice(0, 1), '', 'supported')
    return this.unavailable(`That isn't something his portfolio covers. ${this.askHimDirectly()}`, ['What is his current role?', 'What is his professional background?'])
  }

  private credentials(t: Turn, type: 'education' | 'certification', label: string): Answer {
    const entries = this.retriever.entries.filter((e) => e.type === type)
    if (!entries.length) {
      const resume = this.kb.byId.get('contact/links')?.links.find((l) => /resume/i.test(l.label))
      return this.unavailable(
        `${label} ${type === 'education' ? "isn't" : "aren't"} listed in his portfolio yet, so I can't tell you about ${type === 'education' ? 'it' : 'them'}.${resume ? ` His ${link('resume', resume.href)} may have more detail.` : ''}`,
        ['What is his professional background?', 'What is his current role?'],
      )
    }
    const items = entries.flatMap((e) => (e.facts.length ? e.facts : [e.summary]).map((f) => ({ entry: e, key: `${e.id}#${f}`, text: endSentence(f), rank: 0 })))
    const { texts } = this.take(t, items, 6)
    return this.answer('supported', [{ kind: 'p', text: entries[0].summary && entries[0].facts.length ? entries[0].summary : `${label}:` }, { kind: 'list', items: texts }], entries)
  }

  private years(t: Turn): Answer {
    // "How long did he work at Corient?"
    const role = this.companyIn(t.q.raw)
    if (role) {
      const x = role.experience!
      return this.answer(
        'supported',
        [{ kind: 'p', text: `${x.current ? 'He has been' : 'He was'} ${x.role} at ${link(x.company, role.anchor!)} for the period listed as ${x.period}.` }],
        [role],
        [`What did he do at ${x.company}?`, 'How many years of experience does he have?'],
      )
    }
    const dated = this.roles.filter((r) => r.experience!.start)
    if (!dated.length) return this.unavailable("The portfolio doesn't give dates for his roles, so I can't work out his years of experience.")
    const earliest = dated.reduce((a, b) => (a.experience!.start! <= b.experience!.start! ? a : b))
    const years = this.now().getFullYear() - earliest.experience!.start!
    return this.answer(
      'supported',
      [
        {
          kind: 'p',
          text: `The roles on his portfolio go back to ${earliest.experience!.start} (${earliest.experience!.role} at ${earliest.experience!.company}). Based on those dates, that's about ${years} years of professional experience.`,
        },
        { kind: 'list', items: this.roles.map((r) => `${r.experience!.role} at ${link(r.experience!.company, r.anchor!)} (${r.experience!.period})`) },
      ],
      this.roles,
      ['What is his current role?', 'Tell me about his Kubernetes experience.'],
    )
  }

  private currentRole(t: Turn): Answer {
    const role = this.roles.find((r) => r.experience!.current) ?? this.roles[0]
    if (!role) return this.unavailable("The portfolio doesn't list his current role.")
    const x = role.experience!
    const items = role.facts.map((f) => ({ entry: role, key: `${role.id}#${f}`, text: `He ${endSentence(asPredicate(f, x.current))}`, rank: 0 }))
    const { texts } = this.take(t, items, 5)
    return this.answer(
      'supported',
      [{ kind: 'p', text: x.current ? `${this.first} is currently ${x.role} at ${link(x.company, role.anchor!)} (${x.period}).` : `His most recent listed role is ${x.role} at ${link(x.company, role.anchor!)} (${x.period}).` }, { kind: 'list', items: texts }],
      [role],
      ['Where has he worked before?', 'What open-source projects has he built?'],
    )
  }

  private career(t: Turn): Answer {
    if (!this.roles.length) return this.unavailable("The portfolio doesn't list his work history.")
    const overview = this.kb.byId.get('overview/summary')
    const quote = overview?.quotes.find((x) => /came to|moving|moved|career/i.test(x))
    const blocks: Block[] = [
      { kind: 'p', text: `His portfolio lists ${this.roles.length} roles, most recent first:` },
      {
        kind: 'list',
        // Each role's first bullet, up to its first dash, as a one-line gist.
        items: this.roles.map((r) => `${r.experience!.role} at ${link(r.experience!.company, r.anchor!)} (${r.experience!.period}): ${endSentence(asPredicate((r.facts[0] ?? '').split(' — ')[0], r.experience!.current))}`),
      },
    ]
    if (quote && !t.continuing) blocks.push({ kind: 'p', text: 'On how his career has moved, in his own words:' }, { kind: 'quote', text: firstSentence(quote) })
    return this.answer('supported', blocks, [...this.roles, ...(quote && overview ? [overview] : [])], ['What is his current role?', 'How many years of experience does he have?'])
  }

  private background(t: Turn): Answer {
    const overview = this.kb.byId.get('overview/summary')
    if (!overview) return this.career(t)
    const current = this.roles.find((r) => r.experience!.current)
    const lead = `${overview.summary}${current ? ` He's currently ${current.experience!.role} at ${link(current.experience!.company, current.anchor!)}.` : ''}`
    const blocks: Block[] = [{ kind: 'p', text: lead }]
    if (overview.facts[0]) blocks.push({ kind: 'p', text: endSentence(overview.facts[0]) })
    if (this.roles.length > 1) {
      blocks.push({ kind: 'p', text: 'His career so far:' })
      blocks.push({ kind: 'list', items: this.roles.map((r) => `${r.experience!.role} at ${r.experience!.company} (${r.experience!.period})`) })
    }
    if (overview.quotes[0]) blocks.push({ kind: 'quote', text: overview.quotes[0].split(/(?<=\.)\s/).slice(0, 2).join(' ') })
    return this.answer('supported', blocks, [overview, ...this.roles], ['What is his current role?', 'What open-source projects has he built?', 'What cloud and DevOps technologies does he use?'])
  }

  private fit(t: Turn): Answer {
    const role = ROLE_EVIDENCE[t.q.role ?? 'platform_engineering'] ?? ROLE_EVIDENCE.platform_engineering
    const tokens = role.terms.map((n) => this.text.termFor(n)?.token).filter((x): x is string => !!x)
    const scored = this.roles.flatMap((r) =>
      r.facts.map((f) => ({ entry: r, key: `${r.id}#${f}`, text: '', fact: f, rank: -tokens.filter((tok) => this.retriever.statementMentions(f, tok)).length }))
    )
    const relevant = scored.filter((s) => s.rank < 0).sort((a, b) => a.rank - b.rank || this.roles.indexOf(a.entry) - this.roles.indexOf(b.entry))
    for (const [i, s] of relevant.entries()) s.text = this.roleSentence(s.entry, s.fact, relevant[i - 1]?.entry === s.entry)
    const { texts, shown } = this.take(t, relevant, LIST_LIMIT)
    if (!texts.length) return this.unavailable(`His portfolio doesn't have much that speaks to ${role.label} specifically. ${this.askHimDirectly()}`)

    const projects = this.projects.filter((p) => tokens.some((tok) => this.retriever.mentions(p, tok))).slice(0, 3)
    const overview = this.kb.byId.get('overview/summary')
    const quote = overview?.quotes.find((x) => tokens.some((tok) => this.retriever.statementMentions(x, tok)))
    const blocks: Block[] = [
      { kind: 'p', text: `That's a judgment for you to make, but here's what his portfolio shows that's relevant to ${role.label}:` },
      { kind: 'list', items: texts },
    ]
    if (projects.length && !t.continuing) blocks.push({ kind: 'p', text: `Related open-source work: ${joinList(projects.map((p) => link(p.title, p.project?.githubUrl ?? p.anchor!)))}.` })
    if (quote && !t.continuing) blocks.push({ kind: 'quote', text: firstSentence(quote) })
    return this.answer('supported', blocks, [...shown.map((s) => s.entry), ...projects, ...(quote && overview ? [overview] : [])], ['Tell me about his Kubernetes experience.', 'What is his current role?'])
  }

  private leadership(t: Turn): Answer {
    const faq = this.faqHits(t)
    const facts = this.roles.flatMap((r) => r.facts.filter((f) => LEADERSHIP.test(f)).map((f) => ({ entry: r, key: `${r.id}#${f}`, text: '', fact: f, rank: this.roles.indexOf(r) })))
    for (const [i, s] of facts.entries()) s.text = this.roleSentence(s.entry, s.fact, facts[i - 1]?.entry === s.entry)
    if (faq.length) return this.fromHits(t, faq.slice(0, 1), '', 'supported')
    const { texts, shown } = this.take(t, facts, LIST_LIMIT)
    if (!texts.length) return this.unavailable(`His portfolio doesn't say much about leadership or collaboration. ${this.askHimDirectly()}`)
    return this.answer(
      'related',
      [
        { kind: 'p', text: "His portfolio doesn't have a section on leadership, but these points from his roles touch on it:" },
        { kind: 'list', items: texts },
        { kind: 'p', text: `For more on how he leads and works with teams, ${lowerFirst(this.askHimDirectly())}` },
      ],
      shown.map((s) => s.entry),
    )
  }

  private projectList(t: Turn): Answer {
    const { q } = t
    let projects = this.projects
    let lead = `He maintains ${projects.length} open-source projects:`
    if (q.subjects.length) {
      const term = q.subjects[0]
      projects = projects.filter((p) => this.retriever.mentions(p, term.token))
      if (!projects.length) return this.tech({ ...t, q: { ...q, intent: 'tech' } })
      lead = projects.length === 1 ? `One of his projects involves ${term.name}:` : `${projects.length} of his projects involve ${term.name}:`
    }
    const items = projects.map((p) => ({ entry: p, key: p.id, text: this.projectLine(p), rank: 0 }))
    const { texts, shown } = this.take(t, items, 8)
    if (!texts.length) return this.chat(['Those are all of his projects. Ask about any of them by name for details.'], this.projects.slice(0, 3).map((p) => `Tell me about ${p.title}`))
    return this.answer(
      'supported',
      [{ kind: 'p', text: lead }, { kind: 'list', items: texts }, { kind: 'p', text: 'Ask about any of them by name for features, architecture or how to install it.' }],
      shown.map((s) => s.entry),
      shown.slice(0, 3).map((p) => `Tell me about ${p.entry.title}`),
    )
  }

  private docsFor(project: KnowledgeEntry) {
    return this.retriever.entries.filter((e) => e.type === 'project-doc' && e.related.includes(project.id))
  }

  private static ASPECT_HEADINGS: Record<Aspect, RegExp> = {
    features: /feature|command|usage|what it does/i,
    architecture: /architect|design|how it works|kubernetes|mesh|library|client|summary/i,
    install: /install|quickstart|getting started|setup|usage/i,
    why: /why|summary|motivation|problem/i,
    technologies: /$^/,
  }

  private projectDetail(t: Turn): Answer {
    const { q } = t
    const project = q.projects[0]
    if (!project) return this.projectList(t)
    const blocks: Block[] = []
    const entries: KnowledgeEntry[] = [project]
    const docs = this.docsFor(project)

    if (!t.continuing) blocks.push({ kind: 'p', text: this.projectLine(project) })

    if (q.aspect === 'technologies') {
      // One name per technology ("k8s" is Kubernetes), and no generic keywords.
      const terms = project.technologies.map((n) => this.text.termFor(n)).filter((x): x is Term => !!x && !x.weak)
      const tech = [...new Set(terms.map((x) => x.name))]
      blocks.push({ kind: 'p', text: `Its listed technologies: ${joinList(tech)}.` })
    } else {
      // Hand-written sections (Architecture, Decisions, …) first, then README sections.
      const extra = project.sections.map((s) => ({ entry: project, key: `${project.id}#${s.heading}`, text: `${s.heading}: ${endSentence(s.text)}`, rank: 0 }))
      const facts = project.facts.map((f) => ({ entry: project, key: `${project.id}#${f}`, text: endSentence(f), rank: 0 }))
      const all: Evidence[] = docs.map((d) => ({ entry: d, key: d.id, text: this.docLine(d), rank: 1 }))
      const re = q.aspect ? Assistant.ASPECT_HEADINGS[q.aspect] : /summary|feature/i
      const onAspect = (e: Evidence) => re.test(e.entry === project ? e.text.split(':')[0] : (e.entry.sections[0]?.heading ?? ''))
      const searched = q.aspect
        ? this.retriever.search(q.raw, { types: ['project-doc'], filter: (e) => e.related.includes(project.id), limit: 2 }).flatMap((h) => all.filter((d) => d.entry === h.entry))
        : []
      const focused = [...extra.filter(onAspect), ...all.filter(onAspect)]
      // An aspect question shows what matches it (or what search finds for it);
      // "tell me more" carries on through the rest.
      const pool = [...new Set(q.aspect && !t.continuing ? (focused.length ? focused : searched) : [...facts, ...focused, ...searched, ...extra, ...all])]
      const { texts, shown, remaining: left } = this.take(t, pool, 2)
      const remaining = Math.max(left, docs.filter((d) => !t.shown.has(d.id) && !shown.some((s) => s.entry === d)).length)
      entries.push(...shown.map((s) => s.entry))
      if (texts.length) blocks.push({ kind: 'list', items: texts })
      else if (t.continuing) blocks.push({ kind: 'p', text: `That's everything I have on ${project.title}. Its README on GitHub goes deeper.` })
      else if (q.aspect) blocks.push({ kind: 'p', text: `I couldn't find anything specific about its ${q.aspect} in the knowledge base.` })
      if (remaining > 0) {
        const headings = docs.filter((d) => !t.shown.has(d.id) && !shown.some((s) => s.entry === d)).map((d) => d.sections[0]?.heading).filter(Boolean)
        if (headings.length) blocks.push({ kind: 'p', text: `Its README also covers ${joinList(headings.slice(0, 5).map((h) => `“${h}”`))}. Ask “tell me more” or about any of those.` })
      }
    }

    if (!t.continuing) {
      const links = project.links.map((l) => link(l.label, l.href))
      if (links.length) blocks.push({ kind: 'p', text: `Links: ${links.join(' · ')}` })
    }
    return this.answer('supported', blocks, entries, [`What are ${project.title}'s features?`, `What technologies does ${project.title} use?`, 'What other projects has he built?'])
  }

  private skills(t: Turn): Answer {
    const { q } = t
    const groups = this.retriever.entries.filter((e) => e.type === 'skill' && e.skill?.members)
    if (!q.categories.length) {
      return this.answer(
        'supported',
        [{ kind: 'p', text: 'Here are the skills he lists, by area:' }, { kind: 'list', items: groups.map((g) => `${g.skill!.category}: ${g.skill!.members!.join(', ')}`) }],
        groups,
        ['Tell me about his Kubernetes experience.', 'What is his experience with .NET?', 'What databases has he worked with?'],
      )
    }

    const blocks: Block[] = []
    const entries: KnowledgeEntry[] = []
    for (const c of q.categories.slice(0, 3)) {
      const block = this.categoryItems(c)
      entries.push(...block.entries)
      if (block.items.length) {
        blocks.push({ kind: 'p', text: `${c.name}:` }, { kind: 'list', items: block.items })
      } else blocks.push({ kind: 'p', text: `His portfolio doesn't mention any ${c.name.toLowerCase()}.` })
    }
    const supported = blocks.some((b) => b.kind === 'list')
    if (supported) blocks.unshift({ kind: 'p', text: q.categories.length > 1 ? 'From his skills, roles and projects:' : `Here's what his portfolio shows for ${q.categories[0].name.toLowerCase()}:` })
    return this.answer(supported ? 'supported' : 'unavailable', blocks, entries, ['Tell me about his Kubernetes experience.', 'What open-source projects has he built?'])
  }

  // Each member with where it shows up: "Kubernetes — New American Funding, kx, hmac-manager".
  private categoryItems(c: CategoryDefinition) {
    const group = c.skillGroup ? this.retriever.entries.find((e) => e.skill?.members && e.skill.category === c.skillGroup) : undefined
    const members = group?.skill?.members ?? c.members
    const items: string[] = []
    const entries: KnowledgeEntry[] = group ? [group] : []
    for (const name of members) {
      const term = this.text.termFor(name)
      if (!term) continue
      const where = this.retriever
        .entriesMentioning(term.token, ['experience', 'project'])
        .sort((a, b) => (a.type === b.type ? this.roles.indexOf(a) - this.roles.indexOf(b) : a.type === 'experience' ? -1 : 1))
      const listed = this.retriever.entriesMentioning(term.token, ['skill']).length > 0
      if (!where.length && !listed && !group) continue
      entries.push(...where.slice(0, 3))
      const names = where.slice(0, 3).map((e) => (e.type === 'experience' ? e.experience!.company : e.title))
      items.push(names.length ? `${upperFirst(term.name)} — ${names.join(', ')}` : `${upperFirst(term.name)} (listed in his skills)`)
    }
    return { items, entries }
  }

  // Free-form fallback: retrieval, then a confidence check.
  private search(t: Turn): Answer {
    const { q } = t
    // "What did he do at Corient?"
    const company = this.companyIn(q.raw)
    if (company) return this.roleAnswer(t, company)

    const hits = this.retriever.search(q.raw)
    if (!hits.length) {
      return this.unavailable(
        "I couldn't find anything about that in his portfolio. I can answer questions about his experience, skills, career and open-source projects.",
        STARTER_QUESTIONS.slice(0, 3),
      )
    }
    const top = hits[0]
    if (!top.exact || top.coverage < 0.5) {
      return this.answer(
        'clarify',
        [{ kind: 'p', text: "I'm not sure I found the right thing. Could you rephrase, or try one of these?" }],
        [],
        [...new Set(hits.slice(0, 4).map((h) => this.questionFor(h.entry)))].slice(0, 3),
      )
    }
    const strong = hits.filter((h) => h.exact && h.coverage >= 0.5 && h.score >= top.score * 0.35)
    return this.fromHits(t, strong, top.coverage === 1 ? "Here's what his portfolio says:" : "Here's the closest information in his portfolio:", top.coverage === 1 ? 'supported' : 'related')
  }

  private companyIn(question: string) {
    const q = question.toLowerCase()
    return this.roles.find((r) => q.includes(r.experience!.company.toLowerCase()))
  }

  private roleAnswer(t: Turn, role: KnowledgeEntry): Answer {
    const x = role.experience!
    const items = role.facts.map((f) => ({ entry: role, key: `${role.id}#${f}`, text: `He ${endSentence(asPredicate(f, x.current))}`, rank: 0 }))
    const { texts } = this.take(t, items, 5)
    return this.answer(
      'supported',
      [{ kind: 'p', text: `${x.current ? 'He is' : 'He was'} ${x.role} at ${link(x.company, role.anchor!)} (${x.period}).` }, { kind: 'list', items: texts }],
      [role],
      ['What is his current role?', 'Where else has he worked?'],
    )
  }

  private questionFor(e: KnowledgeEntry) {
    switch (e.type) {
      case 'experience':
        return `What did he do at ${e.experience!.company}?`
      case 'project':
        return `Tell me about ${e.title}`
      case 'project-doc':
        return `Tell me about ${e.project!.name}`
      case 'skill':
        return e.skill?.members ? `What ${e.skill.category.toLowerCase()} does he use?` : `What is his ${e.title} experience?`
      case 'contact':
        return 'How can I contact him?'
      default:
        return upperFirst(e.questions[0] ?? `Tell me about his ${e.title.toLowerCase()}`)
    }
  }

  private describe(e: KnowledgeEntry, query: string): Evidence {
    const tokens = this.text.tokenize(query)
    const overlap = (s: string) => {
      const own = new Set(this.text.tokenize(s).flatMap((x) => this.text.expand(x)))
      return tokens.filter((x) => own.has(x)).length
    }
    const best = (list: string[]) => [...list].sort((a, b) => overlap(b) - overlap(a))[0]
    switch (e.type) {
      case 'experience': {
        const fact = best(e.facts)
        return { entry: e, key: `${e.id}#${fact}`, text: this.roleSentence(e, fact, false), rank: 0 }
      }
      case 'project':
        return { entry: e, key: e.id, text: this.projectLine(e), rank: 0 }
      case 'project-doc':
        return { entry: e, key: e.id, text: this.docLine(e), rank: 0 }
      case 'overview': {
        const quote = best(e.quotes)
        return quote && overlap(quote) > 0
          ? { entry: e, key: `${e.id}#${quote}`, text: `In his own words: “${firstSentence(quote)}”`, rank: 0 }
          : { entry: e, key: e.id, text: endSentence(e.summary), rank: 0 }
      }
      case 'contact':
        return { entry: e, key: e.id, text: `${e.summary} ${joinList(e.links.map((l) => link(l.label, l.href)))}.`, rank: 0 }
      default: {
        const text = [e.summary, ...e.facts.filter((f) => overlap(f) > 0)].filter(Boolean).map(endSentence).join(' ')
        return { entry: e, key: e.id, text, rank: 0 }
      }
    }
  }

  private fromHits(t: Turn, hits: Hit[], lead: string, support: Support): Answer {
    const items: Evidence[] = []
    const seen = new Set<string>()
    for (const h of hits) {
      const ev = this.describe(h.entry, t.q.raw)
      if (seen.has(ev.text)) continue
      seen.add(ev.text)
      items.push(ev)
    }
    const { texts, shown } = this.take(t, items, 3)
    if (!texts.length) return this.chat(["That's everything I found on that."], STARTER_QUESTIONS.slice(0, 3))
    const blocks: Block[] = []
    if (lead) blocks.push({ kind: 'p', text: lead })
    blocks.push(texts.length === 1 && !lead ? { kind: 'p', text: texts[0] } : { kind: 'list', items: texts })
    return this.answer(support, blocks, shown.map((s) => s.entry), [...new Set(shown.map((s) => this.questionFor(s.entry)))].slice(0, 2))
  }
}

export function createAssistant(kb: KnowledgeBase, options?: AssistantOptions) {
  return new Assistant(kb, options)
}
