import { describe, expect, it } from 'vitest'
import { Normalizer, toToken } from './text'
import { terms } from './knowledge/vocabulary'

const text = new Normalizer([...terms, { name: 'Middleware', weak: true }, { name: 'AWS', listed: false, category: 'Cloud platforms' }])

describe('normalization', () => {
  it('folds aliases into one token', () => {
    expect(text.tokenize('k8s')).toEqual(['kubernetes'])
    expect(text.tokenize('Kube and K8S')).toEqual(['kubernetes', 'kubernetes'])
    expect(text.tokenize('dotnet')).toEqual(['.net'])
    expect(text.tokenize('C Sharp')).toEqual(['c#'])
    expect(text.tokenize('Infrastructure as Code')).toEqual(['infrastructure_as_code'])
    expect(text.tokenize('continuous integration')).toEqual(['ci/cd'])
  })

  it('prefers the longest name', () => {
    expect(text.tokenize('ASP.NET Core')).toEqual(['asp.net_core'])
    expect(text.tokenize('Azure DevOps')).toEqual(['azure_devops'])
    expect(text.tokenize('GitHub Actions workflows')).toEqual(['github_actions', 'workflows'])
  })

  it('keeps symbols that belong to names', () => {
    expect(text.tokenize('.NET, C# and CI/CD.')).toEqual(['.net', 'c#', 'ci/cd'])
  })

  it('splits hyphenated words that are not names', () => {
    expect(text.tokenize('Terraform-based automation')).toEqual(['terraform', 'based', 'automation'])
  })

  it('drops stopwords and possessives', () => {
    expect(text.tokenize("What is Joshua's experience with Helm?")).toEqual(['helm'])
  })

  it('reads "Go" as the language only where it is one', () => {
    expect(text.tokenize('Does he know Go?')).toContain('golang')
    expect(text.tokenize('does he know go')).toContain('golang')
    expect(text.tokenize('golang')).toEqual(['golang'])
    expect(text.tokenize("Let's go through his projects")).not.toContain('golang')
    expect(text.tokenize('Go to the projects section')).not.toContain('golang')
  })

  it('does not match a name inside a longer word', () => {
    expect(text.tokenize('kubernetes')).toEqual(['kubernetes'])
    expect(text.termsIn('docker scout')).toHaveLength(1)
    expect(text.termsIn('hosts')).toEqual([])
  })
})

describe('terms', () => {
  it('finds the terms a sentence mentions, once each, in order', () => {
    expect(text.termsIn('Helm charts for Kubernetes, then more Helm').map((t) => t.name)).toEqual(['Helm', 'Kubernetes'])
  })

  it('resolves implications transitively', () => {
    expect(text.expand('signalr')).toEqual(expect.arrayContaining(['signalr', 'asp.net_core', '.net']))
    expect(text.expand('argocd')).toEqual(expect.arrayContaining(['gitops', 'kubernetes']))
  })

  it('marks weak and unlisted terms', () => {
    expect(text.term('middleware')?.weak).toBe(true)
    expect(text.term('aws')).toMatchObject({ listed: false, category: 'Cloud platforms' })
  })

  it('merges a repeated name into the existing term', () => {
    const merged = new Normalizer([{ name: 'Go', aliases: ['golang'], token: 'golang' }, { name: 'Go' }, { name: 'Kubernetes', aliases: ['k8s'] }, { name: 'k8s', weak: true }])
    expect(merged.terms.filter((t) => t.name === 'Go')).toHaveLength(1)
    expect(merged.term('kubernetes')?.weak).toBe(false)
    expect(merged.terms).toHaveLength(2)
    expect(toToken('GitHub Actions')).toBe('github_actions')
  })
})
