import { describe, expect, it } from 'vitest'
import { initialTypeState, scrambleFrame, typewriterStep, type TypeState } from './textEffects'

describe('scrambleFrame', () => {
  const noise = () => '#'

  it('is all noise at the start, keeping spaces', () => {
    expect(scrambleFrame('Open Source', 0, noise)).toBe('#### ######')
  })

  it('resolves characters left to right', () => {
    expect(scrambleFrame('Career', 0.5, noise)).toBe('Car###')
  })

  it('is the real text once finished, and clamps past 1', () => {
    expect(scrambleFrame('Stack', 1, noise)).toBe('Stack')
    expect(scrambleFrame('Stack', 3, noise)).toBe('Stack')
  })
})

describe('typewriterStep', () => {
  const phrases = ['ab', 'xyz']

  it('starts holding the first phrase in full', () => {
    expect(initialTypeState(phrases)).toEqual({ index: 0, length: 2, phase: 'holding' })
  })

  it('deletes, moves to the next phrase, types it, then holds', () => {
    let state: TypeState = initialTypeState(phrases)
    const seen: string[] = []
    for (let i = 0; i < 6; i++) {
      state = typewriterStep(state, phrases).state
      seen.push(`${phrases[state.index].slice(0, state.length)}|${state.phase}`)
    }
    expect(seen).toEqual(['a|deleting', '|typing', 'x|typing', 'xy|typing', 'xyz|holding', 'xy|deleting'])
  })

  it('wraps back to the first phrase', () => {
    const { state } = typewriterStep({ index: 1, length: 1, phase: 'deleting' }, phrases)
    expect(state).toEqual({ index: 0, length: 0, phase: 'typing' })
  })
})
