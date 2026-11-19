import { describe, expect, it } from 'vitest'
import { splitStatement } from './statement'
import { profile } from '@/data/profile'

describe('splitStatement', () => {
  it('splits at the first comma, keeping the comma on the lead', () => {
    expect(splitStatement('Building developer platforms and cloud infrastructure, with a focus on AI-assisted engineering.')).toEqual({
      lead: 'Building developer platforms and cloud infrastructure,',
      rest: 'with a focus on AI-assisted engineering.',
    })
  })

  it('keeps the whole text as the lead when there is no comma', () => {
    expect(splitStatement('Building platforms.')).toEqual({ lead: 'Building platforms.', rest: '' })
  })

  it("splits the profile's tagline into two non-empty parts", () => {
    const { lead, rest } = splitStatement(profile.tagline)
    expect(lead.length).toBeGreaterThan(0)
    expect(rest.length).toBeGreaterThan(0)
  })
})

describe('profile.discipline', () => {
  it('is the line shown above the hero statement', () => {
    expect(profile.discipline).toBe('Platform & Software Engineering')
  })
})
