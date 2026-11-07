import { describe, expect, it } from 'vitest'
import { createAssistant } from './assistant'
import type { Answer } from './assistant'
import { parseQuestion } from './intent'
import { asPredicate, editDistance, joinList, sentencesOf } from './phrasing'
import { categories } from '../knowledge/vocabulary'
import { emptyContext } from '../context'
import type { ConversationContext } from '../context'
import { fixtureKb } from '../test/fixture'

const assistant = createAssistant(fixtureKb(), { now: () => new Date('2026-06-01') })
const lexicon = { text: assistant.text, categories, projects: assistant.retriever.entries.filter((e) => e.type === 'project') }
const parse = (q: string) => parseQuestion(q, lexicon)
const ids = (q: string, options?: Parameters<typeof assistant.retriever.search>[1]) => assistant.retriever.search(q, options).map((h) => h.entry.id)

// Everything an answer says, flattened, for "does it mention X" checks.
const said = (a: Answer) => a.blocks.map((b) => (b.kind === 'list' ? b.items.join('\n') : b.text)).join('\n')
const ask = (q: string, ctx: ConversationContext = emptyContext()) => assistant.ask(q, ctx)

// Runs a conversation, returning every answer.
function converse(...questions: string[]) {
  let ctx = emptyContext()
  return questions.map((q) => {
    const r = assistant.ask(q, ctx)
    ctx = r.context
    return r.answer
  })
}

describe('retrieval', () => {
  it('ranks title and technology matches first', () => {
    expect(ids('widgetctl')[0]).toBe('project/widgetctl')
    expect(ids('cachet redis')[0]).toBe('project/cachet')
  })

  it('finds entries through synonyms', () => {
    expect(ids('k8s')).toEqual(expect.arrayContaining(['experience/acme', 'project/widgetctl', 'skill/kubernetes']))
  })

  it('finds entries through implied terms', () => {
    // SignalR and ASP.NET Core are .NET; neither entry says ".NET".
    expect(ids('.NET')).toEqual(expect.arrayContaining(['experience/globex', 'project/cachet']))
  })

  it('tolerates typos and partial words', () => {
    expect(ids('kuberntes')).toContain('skill/kubernetes')
    expect(ids('databr')).toContain('experience/acme')
    const hit = assistant.retriever.search('kuberntes')[0]
    expect(hit.exact).toBe(false)
  })

  it('reports coverage of the question', () => {
    const [hit] = assistant.retriever.search('helm argocd')
    expect(hit.entry.id).toBe('experience/acme')
    expect(hit.coverage).toBe(1)
    expect(hit.exact).toBe(true)
  })

  it('filters by type', () => {
    expect(ids('kubernetes', { types: ['project'] })).toEqual(['project/widgetctl'])
  })

  it('never returns placeholders', () => {
    expect(assistant.retriever.entries.some((e) => e.placeholder)).toBe(false)
    expect(ids('education')).not.toContain('education/degree')
  })

  it('returns nothing for stopwords only', () => {
    expect(ids('what is the')).toEqual([])
  })
})

describe('intent detection', () => {
  it.each([
    ['What is his Kubernetes experience?', 'tech', ['kubernetes']],
    ['Has he worked with Azure?', 'tech', ['azure']],
    ['Does he have experience with .NET?', 'tech', ['.net']],
    ['Has he worked with data pipelines?', 'tech', ['data_pipelines']],
    ['Has he used GitHub Actions?', 'tech', ['github_actions']],
    ['Has he used managed Kubernetes?', 'tech', ['kubernetes']],
    ['Tell me about his open-source projects.', 'projects', []],
    ['Which projects use Go?', 'projects', ['golang']],
    ['What is his current role?', 'current_role', []],
    ['Where does he work?', 'current_role', []],
    ['What makes him a good platform engineer?', 'fit', ['platform_engineering']],
    ['What is his professional background?', 'background', []],
    ['Where has he worked?', 'career', []],
    ['How many years of experience does he have?', 'years', []],
    ['Has he led teams?', 'leadership', []],
    ['Where did he go to college?', 'education', []],
    ['Any certifications?', 'certifications', []],
    ['How can I contact him?', 'contact', []],
    ['Is he open to remote work?', 'personal', []],
    ['What cloud and DevOps technologies does he use?', 'skills', []],
    ['hello', 'greeting', []],
    ['thanks!', 'thanks', []],
    ['tell me more', 'more', []],
  ])('%s → %s', (q, intent, subjects) => {
    const parsed = parse(q)
    expect(parsed.intent).toBe(intent)
    expect(parsed.subjects.map((s) => s.token)).toEqual(subjects)
  })

  it('finds named projects, even inside rule words', () => {
    expect(parse('Tell me about widgetctl').intent).toBe('project_detail')
    expect(parse('What are the features of widget ctl?')).toMatchObject({ intent: 'project_detail', aspect: 'features' })
  })

  it('separates categories from technologies', () => {
    expect(parse('What cloud and DevOps technologies does he use?').categories.map((c) => c.name)).toEqual(['Cloud platforms', 'DevOps and infrastructure'])
  })

  it('flags technologies the knowledge base does not cover', () => {
    expect(parse('Has he used AWS?')).toMatchObject({ intent: 'tech', subjects: [], unlisted: [expect.objectContaining({ name: 'AWS' })] })
    expect(parse('Does he know Rust?').unlisted[0]?.name).toBe('Rust')
    expect(parse('Has he worked with Fortran?')).toMatchObject({ intent: 'tech', unknownSubject: 'fortran' })
  })

  it('does not mistake everyday words for skills', () => {
    expect(parse('Has he worked on high availability systems?').intent).toBe('tech')
    expect(parse("Let's go through his projects").subjects).toEqual([])
  })

  it('notices references back to the conversation', () => {
    expect(parse('What about Terraform?').shifts).toBe(true)
    expect(parse('Where did he use it?').refersBack).toBe(true)
  })
})

describe('phrasing', () => {
  it('turns resume bullets into predicates', () => {
    expect(asPredicate('Build and optimize pipelines', true)).toBe('builds and optimizes pipelines')
    expect(asPredicate('Modernize the platform', true)).toBe('modernizes the platform')
    expect(asPredicate('Led Kubernetes adoption', false)).toBe('led Kubernetes adoption')
    expect(asPredicate('SFTP pipelines', true)).toBe('SFTP pipelines')
  })

  it('splits sentences without breaking .NET', () => {
    expect(sentencesOf('Built with ASP.NET Core. Runs on .NET 8. Done!')).toEqual(['Built with ASP.NET Core.', 'Runs on .NET 8.', 'Done!'])
  })

  it('joins lists and measures distance', () => {
    expect(joinList(['a'])).toBe('a')
    expect(joinList(['a', 'b'])).toBe('a and b')
    expect(joinList(['a', 'b', 'c'])).toBe('a, b, and c')
    expect(editDistance('kuberentes', 'kubernetes')).toBe(2)
  })
})

describe('answer composition', () => {
  it('answers a technology question from roles, projects and skills, with sources', () => {
    const { answer } = ask('Tell me about his Kubernetes experience.')
    expect(answer.support).toBe('supported')
    expect(said(answer)).toMatch(/As Platform Engineer at Acme \(2024 – Present\), he runs Kubernetes clusters on Azure/)
    expect(said(answer)).toMatch(/\[widgetctl\]\(https:\/\/github\.com\/example\/widgetctl\)/)
    expect(said(answer)).toMatch(/He lists Kubernetes under Platform & Cloud in his skills/)
    expect(answer.sources.map((s) => s.label)).toEqual(expect.arrayContaining(['Experience · Acme', 'widgetctl', 'Technical skills']))
  })

  it('uses past tense for past roles and present tense for the current one', () => {
    expect(said(ask('What is his current role?').answer)).toMatch(/Avery is currently Platform Engineer at \[Acme\]\(#exp-acme\)[\s\S]*He runs Kubernetes clusters/)
    expect(said(ask('Has he used SignalR?').answer)).toMatch(/he built ASP\.NET Core APIs with SignalR/)
  })

  it('does not repeat a statement within an answer', () => {
    const items = ask('Has he worked with Azure?').answer.blocks.flatMap((b) => (b.kind === 'list' ? b.items : []))
    expect(new Set(items).size).toBe(items.length)
  })

  it('groups category answers by technology with where each is used', () => {
    const text = said(ask('What DevOps technologies does he use?').answer)
    expect(text).toMatch(/Kubernetes — Acme, widgetctl/)
    expect(text).toMatch(/Helm — Acme/)
  })

  it('lists projects with links', () => {
    const { answer } = ask('What open-source projects has he built?')
    expect(said(answer)).toMatch(/He maintains 2 open-source projects/)
    expect(answer.sources.map((s) => s.id)).toEqual(['project/widgetctl', 'project/cachet'])
  })

  it('uses hand-written sections for project questions', () => {
    expect(said(ask('What is the architecture of widgetctl?').answer)).toMatch(/Architecture: A thin client over the Kubernetes API/)
  })

  it('answers FAQ entries from their questions', () => {
    const { answer } = ask('Does he do incident response?')
    expect(said(answer)).toMatch(/on-call rotation/)
    expect(answer.sources[0].id).toBe('faq/on-call')
  })

  it('works out years of experience from the dates, and says so', () => {
    expect(said(ask('How many years of experience does he have?').answer)).toMatch(/go back to 2019.*Based on those dates, that's about 7 years/)
  })

  it('frames fit questions as evidence, not a verdict', () => {
    const { answer } = ask('What makes him a good platform engineer?')
    expect(said(answer)).toMatch(/^That's a judgment for you to make/)
    expect(said(answer)).toMatch(/Kubernetes clusters/)
  })
})

describe('low confidence and missing information', () => {
  it('says plainly when a technology is not covered', () => {
    for (const q of ['Has he used AWS?', 'Does he know Rust?', 'Has he worked with Fortran?']) {
      const { answer } = ask(q)
      expect(answer.support).toBe('unavailable')
      expect(said(answer)).toMatch(/doesn't mention/)
      expect(answer.sources).toEqual([])
    }
  })

  it('points to related questions for unlisted technologies', () => {
    expect(ask('Has he used AWS?').answer.suggestions[0]).toBe('What cloud platforms does he use?')
  })

  it('never answers from placeholders', () => {
    const { answer } = ask('Where did he go to college?')
    expect(answer.support).toBe('unavailable')
    expect(said(answer)).not.toMatch(/PLACEHOLDER/)
    expect(said(answer)).toMatch(/isn't listed in his portfolio/)
  })

  it('declines personal questions and points to contact', () => {
    const { answer } = ask("What's his salary expectation?")
    expect(answer.support).toBe('unavailable')
    expect(said(answer)).toMatch(/mailto:avery@example\.com/)
  })

  it('handles questions with no matches at all', () => {
    const { answer } = ask('What is the capital of France?')
    expect(answer.support).toBe('unavailable')
    expect(answer.suggestions.length).toBeGreaterThan(0)
  })

  it('asks for a rephrase when matches are weak', () => {
    const { answer } = ask('zzz widgets yyy quux')
    expect(answer.support).toBe('clarify')
    expect(answer.suggestions).toContain('Tell me about widgetctl')
  })

  it('reads a misspelt technology as the known one and says so', () => {
    const { answer } = ask('kuberentes')
    expect(answer.support).toBe('supported')
    expect(said(answer)).toMatch(/^\(Reading that as Kubernetes\.\)/)
  })

  it('marks evidence found only in project docs as related', () => {
    // "cluster" appears only in widgetctl's README section.
    const { answer } = ask('Has he worked with any cluster?')
    expect(['related', 'supported']).toContain(answer.support)
  })

  it('handles empty input', () => {
    expect(ask('   ').answer.support).toBe('chat')
  })
})

describe('follow-up questions', () => {
  it('carries the question over to a new technology', () => {
    const [, azure] = converse('Tell me about his Kubernetes experience.', 'What about Terraform?')
    expect(azure.support).toBe('supported')
    expect(said(azure)).toMatch(/Terraform/)
  })

  it('resolves "it" to the previous project', () => {
    const [, features] = converse('Tell me about widgetctl', 'What are its features?')
    expect(said(features)).toMatch(/Index-based selection of widgets/)
  })

  it('continues with "tell me more" without repeating itself', () => {
    const [first, more, end] = converse('Has he worked with Azure?', 'tell me more', 'tell me more')
    const items = (a: Answer) => a.blocks.flatMap((b) => (b.kind === 'list' ? b.items : []))
    for (const item of items(more)) expect(items(first)).not.toContain(item)
    expect(said(end)).toMatch(/That's everything/)
  })

  it('keeps context through small talk', () => {
    const [, , after] = converse('Tell me about widgetctl', 'thanks', 'What are its features?')
    expect(said(after)).toMatch(/Index-based selection/)
  })

  it('starts fresh on an unrelated question', () => {
    const [, role] = converse('Tell me about widgetctl', 'What is his current role?')
    expect(said(role)).toMatch(/currently Platform Engineer at/)
  })

  it('returns a serializable context', () => {
    const { context } = ask('Tell me about his Kubernetes experience.')
    expect(JSON.parse(JSON.stringify(context))).toEqual(context)
    expect(context).toMatchObject({ intent: 'tech', subjects: ['kubernetes'] })
  })
})
