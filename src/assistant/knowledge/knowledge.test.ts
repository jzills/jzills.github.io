import { describe, expect, it } from 'vitest'
import { loadKnowledgeBase } from './index'
import { buildKnowledgeBase, KnowledgeBaseError, validateEntries } from './build'
import { parseBody, parseEntryFile, parseFrontMatter } from './markdown'
import { readmeSummary } from './site'
import { entry, fixtureEntries, fixtureFiles, fixtureKb } from '../test/fixture'

describe('the real knowledge base', () => {
  // This is the check that fails the build when an entry is malformed.
  it('loads and validates', () => {
    const kb = loadKnowledgeBase()
    expect(kb.entries.length).toBeGreaterThan(20)
    expect(new Set(kb.entries.map((e) => e.id)).size).toBe(kb.entries.length)
  })

  it('contains every content type the assistant answers from', () => {
    const types = new Set(loadKnowledgeBase().entries.map((e) => e.type))
    for (const t of ['overview', 'experience', 'skill', 'project', 'project-doc', 'contact', 'faq', 'education'] as const) expect(types).toContain(t)
  })

  it('marks the seeded gaps as placeholders', () => {
    const kb = loadKnowledgeBase()
    expect(kb.byId.get('education/degree')?.placeholder).toBe(true)
    expect(kb.byId.get('certification/list')?.placeholder).toBe(true)
  })

  it('applies extension files to site entries', () => {
    expect(loadKnowledgeBase().byId.get('project/hmac-manager')?.keywords).toContain('request signing library')
  })
})

describe('front matter', () => {
  it('reads scalars, inline lists and indented lists', () => {
    const { data, errors } = parseFrontMatter(['id: faq/x', 'title: "Quoted: title"', 'tags: [a, "b, c", d]', 'links:', '  - Docs | https://example.com', '  - Home | #about'].join('\n'))
    expect(errors).toEqual([])
    expect(data).toEqual({ id: 'faq/x', title: 'Quoted: title', tags: ['a', 'b, c', 'd'], links: ['Docs | https://example.com', 'Home | #about'] })
  })

  it('reports lines it cannot read', () => {
    expect(parseFrontMatter('just words').errors[0]).toMatch(/unreadable/)
    expect(parseFrontMatter('  - orphan').errors[0]).toMatch(/outside a list/)
  })
})

describe('markdown body', () => {
  it('splits the summary, facts, quotes and sections', () => {
    const body = parseBody(['The summary', 'continues here.', '', '- First fact.', '- Second fact.', '> In my words.', '', '## Architecture', 'A client', 'and a server.', '## Decisions', '- Chose Go.'].join('\n'))
    expect(body.summary).toBe('The summary continues here.')
    expect(body.facts).toEqual(['First fact.', 'Second fact.'])
    expect(body.quotes).toEqual(['In my words.'])
    expect(body.sections).toEqual([
      { heading: 'Architecture', text: 'A client and a server.' },
      { heading: 'Decisions', text: 'Chose Go.' },
    ])
  })

  it('parses a file into an entry or an extension', () => {
    const parsed = parseEntryFile('x.md', fixtureFiles['./entries/faq-oncall.md'])
    expect(parsed.errors).toEqual([])
    expect(parsed.entry).toMatchObject({ id: 'faq/on-call', type: 'faq', origin: 'extra', questions: ['Has he been on call?', 'Does he do incident response?'] })
    expect(parseEntryFile('y.md', fixtureFiles['./entries/widgetctl.md']).extension?.extends).toBe('project/widgetctl')
  })

  it('reads experience fields from front matter', () => {
    const parsed = parseEntryFile('r.md', '---\nid: experience/x\ntype: experience\ntitle: Role\ncompany: Initech\nrole: Engineer\nperiod: 2015 – Present\n---\nEngineer at Initech.\n')
    expect(parsed.entry?.experience).toEqual({ company: 'Initech', role: 'Engineer', period: '2015 – Present', start: 2015, current: true })
  })

  it('rejects files without front matter or with an unknown type', () => {
    expect(parseEntryFile('a.md', 'no front matter').errors[0]).toMatch(/front-matter/)
    expect(parseEntryFile('b.md', '---\nid: x/y\ntype: hobby\ntitle: T\n---\nS').errors[0]).toMatch(/type "hobby"/)
  })
})

describe('validation', () => {
  it('accepts the fixture and merges its extension', () => {
    const kb = fixtureKb()
    const widgetctl = kb.byId.get('project/widgetctl')!
    expect(widgetctl.facts).toContain('widgetctl started as a weekend project.')
    expect(widgetctl.sections.map((s) => s.heading)).toContain('Architecture')
    expect(widgetctl.keywords).toContain('widget tool')
  })

  it('does not mutate the site entries it was given', () => {
    const site = fixtureEntries()
    buildKnowledgeBase(site, fixtureFiles)
    expect(site.find((e) => e.id === 'project/widgetctl')!.facts).toEqual([])
  })

  it('lists every problem at once', () => {
    const problems = validateEntries([
      entry({ id: 'a/1', type: 'overview', title: 'A', summary: 'x', related: ['missing/1'] }),
      entry({ id: 'a/1', type: 'overview', title: 'Dup', summary: 'x' }),
      entry({ id: 'b/1', type: 'faq', title: 'FAQ', summary: 'x' }),
      entry({ id: 'c/1', type: 'overview', title: '', summary: '' }),
      entry({ id: 'd/1', type: 'overview', title: 'D', summary: 'x', links: [{ label: 'Bad', href: 'javascript:alert(1)' }] }),
    ])
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/a\/1: duplicate id/),
        expect.stringMatching(/b\/1: FAQ entries need questions/),
        expect.stringMatching(/c\/1: missing title/),
        expect.stringMatching(/c\/1: needs a summary/),
        expect.stringMatching(/d\/1: link "Bad" has an unsupported href/),
        expect.stringMatching(/a\/1: related entry "missing\/1" does not exist/),
      ]),
    )
  })

  it('lets placeholders be empty', () => {
    expect(validateEntries([entry({ id: 'e/1', type: 'education', title: 'Education', summary: '', placeholder: true })])).toEqual([])
  })

  it('throws a KnowledgeBaseError naming the bad file', () => {
    const build = () => buildKnowledgeBase(fixtureEntries(), { './entries/bad.md': '---\nextends: project/nope\n---\n- A fact.' })
    expect(build).toThrow(KnowledgeBaseError)
    expect(build).toThrow(/bad\.md: extends "project\/nope"/)
  })
})

describe('README summaries', () => {
  it('keeps .NET and ASP.NET whole and stops at the length limit', () => {
    expect(readmeSummary('Adds caching to ASP.NET Core apps. Works on .NET 8. ' + 'More text. '.repeat(40))).toMatch(/^Adds caching to ASP\.NET Core apps\. Works on \.NET 8\./)
    expect(readmeSummary('A sentence. '.repeat(60)).length).toBeLessThanOrEqual(320)
  })

  it('leaves flattened tables without a summary', () => {
    expect(readmeSummary('Plugin Description -------- ----------- foo Does a thing')).toBe('')
  })
})
