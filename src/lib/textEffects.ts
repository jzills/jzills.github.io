// Pure frame logic behind the hero's typing line and the section labels' decode
// effect, kept free of React and timers so it can be unit tested.

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*+='

export const randomScrambleChar = () =>
  SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]

// One frame of the decode effect: characters resolve left to right as progress
// runs from 0 to 1; the rest show noise. Spaces stay put so word shapes hold.
export function scrambleFrame(text: string, progress: number, randChar = randomScrambleChar): string {
  const resolved = Math.floor(Math.max(0, Math.min(1, progress)) * text.length)
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    out += i < resolved || ch === ' ' ? ch : randChar()
  }
  return out
}

export interface TypeState {
  index: number
  length: number
  phase: 'typing' | 'holding' | 'deleting'
}

export const TYPE_TIMING = {
  type: 70,
  delete: 35,
  hold: 2200,
  pause: 350,
}

// Starts with the first phrase fully typed, matching the prerendered HTML.
export const initialTypeState = (phrases: readonly string[]): TypeState => ({
  index: 0,
  length: phrases[0]?.length ?? 0,
  phase: 'holding',
})

// Advances the typewriter one step; `delay` is how long to wait before the next.
export function typewriterStep(state: TypeState, phrases: readonly string[]): { state: TypeState; delay: number } {
  const phrase = phrases[state.index]
  switch (state.phase) {
    case 'typing': {
      const length = state.length + 1
      return length >= phrase.length
        ? { state: { ...state, length: phrase.length, phase: 'holding' }, delay: TYPE_TIMING.hold }
        : { state: { ...state, length }, delay: TYPE_TIMING.type }
    }
    case 'holding':
      return { state: { ...state, length: state.length - 1, phase: 'deleting' }, delay: TYPE_TIMING.delete }
    case 'deleting': {
      const length = state.length - 1
      return length <= 0
        ? { state: { index: (state.index + 1) % phrases.length, length: 0, phase: 'typing' }, delay: TYPE_TIMING.pause }
        : { state: { ...state, length }, delay: TYPE_TIMING.delete }
    }
  }
}
