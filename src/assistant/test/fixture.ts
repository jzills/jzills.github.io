import { buildKnowledgeBase } from '../knowledge/build'
import type { KnowledgeEntry } from '../knowledge/types'

// A small, fixed knowledge base so engine tests don't change when the site's
// content does. The real knowledge base has its own suite (recruiter.test.ts).

export const entry = (e: Pick<KnowledgeEntry, 'id' | 'type' | 'title' | 'summary'> & Partial<KnowledgeEntry>): KnowledgeEntry => ({
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

export const fixtureEntries = (): KnowledgeEntry[] => [
  entry({
    id: 'overview/summary',
    type: 'overview',
    title: 'Professional summary',
    summary: 'Avery is a Platform Engineer.',
    facts: ['His portfolio describes his focus as building internal platforms.'],
    quotes: ['I build paved roads for engineering teams. Before that I wrote .NET services for years.'],
    anchor: '#about',
  }),
  entry({
    id: 'contact/links',
    type: 'contact',
    title: 'Contact',
    summary: 'Avery can be reached by email.',
    links: [
      { label: 'Email', href: 'mailto:avery@example.com' },
      { label: 'LinkedIn', href: 'https://linkedin.com/in/example' },
      { label: 'Resume (PDF)', href: 'https://example.com/resume.pdf' },
    ],
    anchor: '#contact',
  }),
  entry({
    id: 'experience/acme',
    type: 'experience',
    title: 'Platform Engineer at Acme',
    summary: 'Platform Engineer at Acme (2024 – Present).',
    facts: ['Run Kubernetes clusters on Azure with Helm and ArgoCD.', 'Build data pipelines with dbt and Databricks.'],
    experience: { company: 'Acme', role: 'Platform Engineer', period: '2024 – Present', start: 2024, current: true },
    anchor: '#exp-acme',
  }),
  entry({
    id: 'experience/globex',
    type: 'experience',
    title: 'Software Developer at Globex',
    summary: 'Software Developer at Globex (2019 – 2024).',
    facts: ['Built ASP.NET Core APIs with SignalR.', 'Led the move to GitHub Actions across engineering teams.'],
    experience: { company: 'Globex', role: 'Software Developer', period: '2019 – 2024', start: 2019, current: false },
    anchor: '#exp-globex',
  }),
  entry({
    id: 'skill/group-platform',
    type: 'skill',
    title: 'Platform skills',
    summary: 'He lists these under Platform: Kubernetes, Terraform.',
    skill: { category: 'Platform & Cloud', members: ['Kubernetes', 'Terraform'] },
    anchor: '#skills-platform',
  }),
  entry({ id: 'skill/kubernetes', type: 'skill', title: 'Kubernetes', summary: 'He lists Kubernetes under Platform & Cloud in his skills.', technologies: ['Kubernetes'], skill: { category: 'Platform & Cloud' }, anchor: '#skills-platform' }),
  entry({ id: 'skill/terraform', type: 'skill', title: 'Terraform', summary: 'He lists Terraform under Platform & Cloud in his skills.', technologies: ['Terraform'], skill: { category: 'Platform & Cloud' }, anchor: '#skills-platform' }),
  entry({
    id: 'project/widgetctl',
    type: 'project',
    title: 'widgetctl',
    summary: 'A kubectl plugin for widgets. Written in Go.',
    technologies: ['Go', 'Kubernetes', 'CLI'],
    tags: ['project', 'open source', 'Go', 'Kubernetes', 'CLI'],
    keywords: ['widgetctl', 'widget ctl'],
    project: { name: 'widgetctl', githubUrl: 'https://github.com/example/widgetctl' },
    related: ['project-doc/widgetctl/features'],
    links: [{ label: 'GitHub', href: 'https://github.com/example/widgetctl' }],
    anchor: '#project-widgetctl',
  }),
  entry({
    id: 'project-doc/widgetctl/features',
    type: 'project-doc',
    title: 'widgetctl: Features',
    summary: 'Index-based selection of widgets. Works with any cluster.',
    sections: [{ heading: 'Features', text: 'Index-based selection of widgets. Works with any cluster.' }],
    project: { name: 'widgetctl', githubUrl: 'https://github.com/example/widgetctl' },
    related: ['project/widgetctl'],
    links: [{ label: 'widgetctl README', href: 'https://github.com/example/widgetctl#features' }],
  }),
  entry({
    id: 'project/cachet',
    type: 'project',
    title: 'cachet',
    summary: 'A caching library for ASP.NET Core.',
    technologies: ['C#', 'ASP.NET Core', 'Redis'],
    tags: ['project', 'open source', 'C#', 'ASP.NET Core', 'Caching'],
    project: { name: 'cachet', githubUrl: 'https://github.com/example/cachet' },
    links: [{ label: 'GitHub', href: 'https://github.com/example/cachet' }],
    anchor: '#project-cachet',
  }),
]

export const fixtureFiles: Record<string, string> = {
  './entries/education.md': `---
id: education/degree
type: education
title: Education
placeholder: true
---
PLACEHOLDER: fill in.
`,
  './entries/faq-oncall.md': `---
id: faq/on-call
type: faq
title: On-call experience
questions: [Has he been on call?, Does he do incident response?]
tags: [on-call, incidents, pager]
keywords: [incident response, pagerduty, outages]
related: [experience/acme]
---
Avery joined the Acme on-call rotation for the platform team.

- He wrote the runbooks for cluster upgrades.
`,
  './entries/widgetctl.md': `---
extends: project/widgetctl
keywords: [widget tool]
---
- widgetctl started as a weekend project.

## Architecture
A thin client over the Kubernetes API.
`,
}

export const fixtureKb = () => buildKnowledgeBase(fixtureEntries(), fixtureFiles)
