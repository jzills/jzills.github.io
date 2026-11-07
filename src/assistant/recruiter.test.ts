import { describe, expect, it } from 'vitest'
import { assistant, emptyContext } from './index'
import type { Answer, ConversationContext, Support } from './index'

// Representative recruiter questions against the real knowledge base. When the
// portfolio's content changes, these show whether the right entries still come back.

const said = (a: Answer) => a.blocks.map((b) => (b.kind === 'list' ? b.items.join('\n') : b.text)).join('\n')
const sourceIds = (a: Answer) => a.sources.map((s) => s.id)

const cases: { q: string; support: Support; sources?: string[]; mentions?: RegExp }[] = [
  { q: 'What is his professional background?', support: 'supported', sources: ['overview/summary', 'experience/corient'] },
  { q: 'Tell me about his Kubernetes experience.', support: 'supported', sources: ['experience/new-american-funding', 'project/kx'] },
  { q: 'What open-source projects has he built?', support: 'supported', sources: ['project/hmac-manager', 'project/kx', 'project/snoop', 'project/action-cache'] },
  { q: 'What is his experience with .NET?', support: 'supported', sources: ['experience/information-technology-partners', 'project/hmac-manager'] },
  { q: 'What cloud and DevOps technologies does he use?', support: 'supported', mentions: /Azure — [\s\S]*Kubernetes — [\s\S]*Terraform — /m },
  { q: 'Has he worked with Azure?', support: 'supported', sources: ['experience/corient', 'experience/new-american-funding'] },
  { q: 'Does he have experience with .NET?', support: 'supported', sources: ['experience/information-technology-partners'] },
  { q: 'What is his current role?', support: 'supported', sources: ['experience/corient'], mentions: /currently Senior Platform Engineer/ },
  { q: 'Has he worked with data pipelines?', support: 'supported', sources: ['experience/corient'], mentions: /data pipelines with Prefect, Databricks, and dbt/ },
  { q: 'What makes him a good platform engineer?', support: 'supported', sources: ['experience/new-american-funding'], mentions: /judgment for you to make/ },
  { q: 'Is he familiar with k8s?', support: 'supported', sources: ['experience/new-american-funding'] },
  { q: 'Does he know Go?', support: 'supported', sources: ['project/kx', 'project/snoop'] },
  { q: 'Has he used Terraform?', support: 'supported', sources: ['experience/corient', 'experience/new-american-funding'] },
  { q: 'What CI/CD tools has he used?', support: 'supported', mentions: /GitHub Actions/ },
  { q: 'Has he built anything with AI?', support: 'supported', sources: ['project/snoop'] },
  { q: 'Tell me about hmac-manager', support: 'supported', sources: ['project/hmac-manager'] },
  { q: 'How do I install kx?', support: 'supported', sources: ['project/kx'], mentions: /pip install kx-cli|krew/ },
  { q: 'What did he do at New American Funding?', support: 'supported', sources: ['experience/new-american-funding'] },
  { q: 'How many years of experience does he have?', support: 'supported', mentions: /go back to 2018/ },
  { q: 'Where has he worked?', support: 'supported', sources: ['experience/corient', 'experience/new-american-funding', 'experience/information-technology-partners'] },
  { q: 'How can I reach him?', support: 'supported', sources: ['contact/links'] },
  { q: 'Has he used AWS?', support: 'unavailable' },
  { q: 'Does he know Java?', support: 'unavailable' },
  { q: 'Where did he go to college?', support: 'unavailable' },
  { q: 'Does he have any certifications?', support: 'unavailable' },
  { q: 'Is he open to relocation?', support: 'unavailable' },
  { q: 'Has he led teams?', support: 'related', sources: ['experience/new-american-funding'] },
]

describe('recruiter questions', () => {
  it.each(cases)('$q', ({ q, support, sources, mentions }) => {
    const { answer } = assistant.ask(q, emptyContext())
    expect(answer.support).toBe(support)
    if (sources) expect(sourceIds(answer)).toEqual(expect.arrayContaining(sources))
    if (mentions) expect(said(answer)).toMatch(mentions)
    // Every link points somewhere real: a section anchor, the web, or email.
    for (const m of said(answer).matchAll(/\]\(([^)]+)\)/g)) expect(m[1]).toMatch(/^(#|https?:\/\/|mailto:)/)
  })

  it('never claims experience with something it reports as unavailable', () => {
    for (const q of ['Has he used AWS?', 'Does he know Rust?', 'Has he worked with Kafka?', 'Has he used Pulumi?']) {
      const text = said(assistant.ask(q, emptyContext()).answer)
      expect(text).not.toMatch(/^Yes/)
      expect(text).toMatch(/doesn't mention/)
    }
  })

  it('follows a conversation', () => {
    let ctx: ConversationContext = emptyContext()
    const turn = (q: string) => {
      const r = assistant.ask(q, ctx)
      ctx = r.context
      return r.answer
    }
    expect(sourceIds(turn('Tell me about his Kubernetes experience.'))).toContain('experience/new-american-funding')
    expect(said(turn('What about Azure?'))).toMatch(/Azure/)
    expect(said(turn('tell me more'))).toMatch(/Information Technology Partners/)
    expect(sourceIds(turn('Tell me about hmac-manager'))).toContain('project/hmac-manager')
    expect(said(turn('What are its features?'))).toMatch(/Features/)
  })
})
