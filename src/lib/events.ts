// Window events the hero mark fires, kept apart from its component so other
// pages can listen without bundling it.

// The mark has burst: the page blast and the waveform's ripple start here.
export const SHOCKWAVE_EVENT = 'hero-shockwave'
export type ShockwaveDetail = { clientX: number; clientY: number }
