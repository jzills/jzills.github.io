import { describe, expect, it } from 'vitest'
import { evidenceFor, evidenceCount, mentions } from './skillEvidence'
import { experience } from '@/data/experience'
import { projects } from '@/data/projects'
import { skillGroups } from '@/data/skills'

describe('mentions', () => {
  it('matches whole terms only', () => {
    expect(mentions('built on ASP.NET Core', 'ASP.NET Core')).toBe(true)
    expect(mentions('built on ASP.NET Core', '.NET')).toBe(false)
    expect(mentions('years building .NET applications', '.NET')).toBe(true)
    expect(mentions('C# and Go', 'C#')).toBe(true)
    expect(mentions('going further', 'Go')).toBe(false)
    expect(mentions('Helm charts, Helm', 'Helm')).toBe(true)
  })

  it('treats regex characters in skill names literally', () => {
    expect(mentions('C++ code', 'C#')).toBe(false)
    expect(mentions('a.NET', '.NET')).toBe(false)
  })
})

describe('evidenceFor', () => {
  it('finds the jobs and projects behind a skill, with the earliest year', () => {
    const k8s = evidenceFor('Kubernetes', experience, projects)
    expect(k8s.jobs.length).toBeGreaterThan(0)
    expect(k8s.projects.map((p) => p.name)).toContain('kx')
    expect(k8s.since).not.toBeNull()
    for (const job of k8s.jobs) expect(job.id).toMatch(/^exp-/)
    for (const p of k8s.projects) expect(p.id).toMatch(/^project-/)
  })

  it('has nothing for a skill the site never mentions', () => {
    const none = evidenceFor('COBOL', experience, projects)
    expect(evidenceCount(none)).toBe(0)
    expect(none.since).toBeNull()
  })

  it('counts this site for what it is built with, and nothing else', () => {
    expect(evidenceFor('React', experience, projects).projects).toEqual([{ name: 'This site', href: 'https://github.com/jzills/jzills.github.io' }])
    expect(evidenceFor('Python', experience, projects).projects).toEqual([])
  })

  it('backs most listed skills with a job or project', () => {
    const all = skillGroups.flatMap((g) => g.skills)
    const backed = all.filter((s) => evidenceCount(evidenceFor(s, experience, projects)) > 0)
    expect(backed.length / all.length).toBeGreaterThan(0.7)
  })
})
