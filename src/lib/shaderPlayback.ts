// When a shader card plays: on hover or keyboard focus with a mouse (for the lab
// grid), in the middle band of the screen on touch screens, otherwise in the grid
// row most on screen. Shared by both ways of running shaders (see useShaderRunner).
import { animateInRow } from '@/lib/animateRow'

// Guarded for prerendering, which has no window; the hook itself only runs in the browser.
export const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// On touch devices only the middle band of the screen animates, so a page of
// shaders runs about one at a time; on desktop it's the grid row most on screen.
const animateBand = '-35% 0px -35% 0px'

// Whether the visitor last moved focus with the keyboard. Escape doesn't count: it
// closes things, and closing the lightbox hands focus back to the card that opened it,
// which shouldn't set that card playing for someone using a mouse.
let keyboardFocus = false
let trackingInput = false
function trackInput() {
  if (trackingInput) return
  trackingInput = true
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') keyboardFocus = true }, { capture: true })
  document.addEventListener('pointerdown', () => { keyboardFocus = false }, { capture: true })
}

// With a mouse, a shader given a hover target plays only while the pointer is over
// it or keyboard focus is inside it, so a grid of them runs one at a time.
function watchHover(target: HTMLElement, onChange: (on: boolean) => void) {
  trackInput()
  let hovered = false
  let focused = false
  const update = () => onChange(hovered || focused)
  const enter = () => { hovered = true; update() }
  const leave = () => { hovered = false; update() }
  const focusIn = () => { focused = keyboardFocus; update() }
  const focusOut = (e: FocusEvent) => {
    if (target.contains(e.relatedTarget as Node | null)) return
    focused = false
    update()
  }
  target.addEventListener('pointerenter', enter)
  target.addEventListener('pointerleave', leave)
  target.addEventListener('focusin', focusIn)
  target.addEventListener('focusout', focusOut)
  // The pointer may already be over the card when the canvas mounts.
  hovered = target.matches(':hover')
  focused = keyboardFocus && target.contains(document.activeElement)
  update()
  return () => {
    target.removeEventListener('pointerenter', enter)
    target.removeEventListener('pointerleave', leave)
    target.removeEventListener('focusin', focusIn)
    target.removeEventListener('focusout', focusOut)
  }
}

export function watchAnimate(el: HTMLElement, onChange: (on: boolean) => void, hoverTarget?: HTMLElement | null) {
  if (!coarse && hoverTarget) return watchHover(hoverTarget, onChange)
  if (!coarse) return animateInRow(el, onChange)
  const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { rootMargin: animateBand })
  observer.observe(el)
  return () => observer.disconnect()
}
