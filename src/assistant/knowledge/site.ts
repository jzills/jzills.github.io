import { experience } from '@/data/experience'
import { projects } from '@/data/projects'
import type { PackageRegistry } from '@/data/projects'
import { skillGroups } from '@/data/skills'
import { about, profile } from '@/data/profile'
import readmes from '@/data/generated/readmes.json'
import { slug } from '@/lib/anchors'
import { sentencesOf } from '../engine/phrasing'
import type { KnowledgeEntry } from './types'

// The site layer: entries built from the data the portfolio already renders, so
// the page and the assistant can't drift apart. Hand-written entries in
// ./entries add to these; see docs/assistant-knowledge-base.md.

const blank = (e: Pick<KnowledgeEntry, 'id' | 'type' | 'title' | 'summary'> & Partial<KnowledgeEntry>): KnowledgeEntry => ({
  facts: [],
  quotes: [],
  sections: [],
  technologies: [],
  tags: [],
  keywords: [],
  questions: [],
  related: [],
  links: [],
  placeholder: false,
  origin: 'site',
  ...e,
})

const registryNames: Record<PackageRegistry, string> = {
  nuget: 'NuGet',
  pypi: 'PyPI',
  npm: 'npm',
  dockerhub: 'Docker Hub',
  artifacthub: 'Artifact Hub',
  krew: 'Krew',
}

const experienceId = (company: string) => `experience/${slug(company)}`
const projectId = (name: string) => `project/${slug(name)}`
const skillId = (name: string) => `skill/${slug(name)}`

// README text arrives flattened, tables included. The first sentence or two
// that read as prose make the summary.
export function readmeSummary(body: string, max = 320) {
  const sentences = sentencesOf(body)
  let out = ''
  for (const raw of sentences) {
    const s = raw.trim()
    if (!s || s.includes('---') || s.length > max) {
      if (out) break
      continue
    }
    if (out && out.length + s.length > max) break
    out = out ? `${out} ${s}` : s
  }
  if (out) return out
  // Tables flatten into noise; leave those without a summary.
  if (body.includes('---')) return ''
  // No prose sentence (a list): an excerpt cut at a word.
  const cut = body.slice(0, max).replace(/\s+\S*$/, '')
  return cut.length < body.length ? `${cut}…` : cut
}

export function siteEntries(): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = []
  const current = experience[0]

  entries.push(
    blank({
      id: 'overview/summary',
      type: 'overview',
      title: 'Professional summary',
      summary: `${profile.firstName} is a ${profile.headline}.`,
      facts: [`His portfolio describes his focus as ${profile.tagline[0].toLowerCase()}${profile.tagline.slice(1)}`],
      quotes: about,
      tags: ['background', 'summary', 'overview', 'career', 'about'],
      keywords: ['who is he', 'introduction', 'bio', 'profile', 'specialization', 'focus'],
      related: experience.map((e) => experienceId(e.company)),
      anchor: '#about',
      links: [{ label: 'About', href: '#about' }],
    }),
    blank({
      id: 'contact/links',
      type: 'contact',
      title: 'Contact',
      summary: `${profile.firstName} can be reached by email, on LinkedIn or on GitHub, and his resume is available as a PDF.`,
      tags: ['contact', 'email', 'linkedin', 'github', 'resume'],
      keywords: ['reach', 'hire', 'get in touch', 'cv', 'message', 'connect'],
      anchor: '#contact',
      links: [
        { label: 'Email', href: `mailto:${profile.links.email}` },
        { label: 'LinkedIn', href: profile.links.linkedin },
        { label: 'GitHub', href: profile.links.github },
        { label: 'Resume (PDF)', href: profile.links.resume },
      ],
    }),
  )

  for (const e of experience) {
    const start = Number(e.period.match(/\d{4}/)?.[0]) || undefined
    entries.push(
      blank({
        id: experienceId(e.company),
        type: 'experience',
        title: `${e.role} at ${e.company}`,
        summary: `${e.role} at ${e.company} (${e.period}).`,
        facts: e.bullets,
        tags: ['experience', 'career', 'role', 'job'],
        keywords: [e.company, e.role],
        experience: { company: e.company, role: e.role, period: e.period, start, current: e === current },
        anchor: `#exp-${slug(e.company)}`,
        links: [{ label: e.company, href: `#exp-${slug(e.company)}` }],
      }),
    )
  }

  for (const g of skillGroups) {
    entries.push(
      blank({
        id: `skill/group-${slug(g.label)}`,
        type: 'skill',
        title: `${g.label} skills`,
        summary: `He lists these under ${g.label}: ${g.skills.join(', ')}.`,
        tags: ['skills', g.label],
        keywords: g.skills,
        skill: { category: g.label, members: g.skills },
        anchor: `#skills-${slug(g.label)}`,
        links: [{ label: 'Skills', href: `#skills-${slug(g.label)}` }],
      }),
    )
    for (const skill of g.skills) {
      entries.push(
        blank({
          id: skillId(skill),
          type: 'skill',
          title: skill,
          summary: `He lists ${skill} under ${g.label} in his skills.`,
          technologies: [skill],
          tags: ['skills'],
          skill: { category: g.label },
          related: [`skill/group-${slug(g.label)}`],
          anchor: `#skills-${slug(g.label)}`,
          links: [{ label: 'Skills', href: `#skills-${slug(g.label)}` }],
        }),
      )
    }
  }

  for (const p of projects) {
    const docs = readmes.filter((r) => r.project === p.name)
    entries.push(
      blank({
        id: projectId(p.name),
        type: 'project',
        title: p.name,
        summary: p.description,
        technologies: [...p.tags, ...(p.keywords ?? [])],
        tags: ['project', 'open source', ...p.tags],
        // "hmacmanager" and "hmac manager" both find hmac-manager.
        keywords: [p.name.replace(/-/g, ' '), p.name.replace(/-/g, ''), ...(p.packages?.map((pkg) => pkg.registry) ?? [])],
        project: { name: p.name, githubUrl: p.githubUrl, docsUrl: p.docsUrl },
        sections: p.packages?.some((pkg) => pkg.title)
          ? [{ heading: 'Install', text: p.packages.filter((pkg) => pkg.title).map((pkg) => `${registryNames[pkg.registry]}: ${pkg.title!.replace(/\n/g, ' && ')}`).join(' · ') }]
          : [],
        related: docs.map((r) => `project-doc/${slug(p.name)}/${slug(r.heading)}`),
        anchor: `#project-${slug(p.name)}`,
        links: [
          { label: 'GitHub', href: p.githubUrl },
          ...(p.docsUrl ? [{ label: 'Docs', href: p.docsUrl }] : []),
          ...(p.demoUrl ? [{ label: 'Demo', href: p.demoUrl }] : []),
          ...(p.packages ?? []).map((pkg) => ({ label: registryNames[pkg.registry], href: pkg.url })),
        ],
      }),
    )
    for (const r of docs) {
      entries.push(
        blank({
          id: `project-doc/${slug(p.name)}/${slug(r.heading)}`,
          type: 'project-doc',
          title: `${p.name}: ${r.heading}`,
          summary: readmeSummary(r.body),
          sections: [{ heading: r.heading, text: r.body }],
          tags: [r.heading],
          keywords: [p.name.replace(/-/g, ' ')],
          project: { name: p.name, githubUrl: p.githubUrl, docsUrl: p.docsUrl },
          related: [projectId(p.name)],
          links: [{ label: `${p.name} README`, href: r.url }],
        }),
      )
    }
  }

  return entries
}
