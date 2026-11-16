import { useEffect, useRef } from 'react'
import { animateInRow } from '@/lib/animateRow'
import { drawShader, subscribeShader } from '@/lib/shaderPool'
import type { ShaderProgram } from '@/lib/shaderPool'

// Guarded for prerendering, which has no window; the hook itself only runs in the browser.
const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// On touch devices only the middle band of the screen animates, so a page of
// shaders runs about one at a time; on desktop it's the grid row most on screen.
const animateBand = '-35% 0px -35% 0px'

// With a mouse, a shader given a hover target plays only while the pointer is over
// it or focus is inside it, so a grid of them runs one at a time.
function watchHover(target: HTMLElement, onChange: (on: boolean) => void) {
  let hovered = false
  let focused = false
  const update = () => onChange(hovered || focused)
  const enter = () => { hovered = true; update() }
  const leave = () => { hovered = false; update() }
  const focusIn = () => { focused = true; update() }
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
  focused = target.contains(document.activeElement)
  update()
  return () => {
    target.removeEventListener('pointerenter', enter)
    target.removeEventListener('pointerleave', leave)
    target.removeEventListener('focusin', focusIn)
    target.removeEventListener('focusout', focusOut)
  }
}

function watchAnimate(el: HTMLElement, onChange: (on: boolean) => void, hoverTarget?: HTMLElement | null) {
  if (!coarse && hoverTarget) return watchHover(hoverTarget, onChange)
  if (!coarse) return animateInRow(el, onChange)
  const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { rootMargin: animateBand })
  observer.observe(el)
  return () => observer.disconnect()
}

type Clock = {
  start: number
  // When the animation stopped, or null while it runs. Resuming shifts start by
  // the time spent stopped, so a shader picks up on the frame it paused on.
  pausedAt: number | null
}

// Runs a shader in a 2D canvas, drawn through the page's shared WebGL context (see shaderPool).
export function useShaderRunner(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  // Empty until the source has loaded; nothing is drawn before then.
  fragmentShader: string,
  // False holds the current frame, e.g. when the visitor pauses the shader.
  active: boolean,
  // For shaders that don't use u_time: draw one frame and never start the loop.
  still = false,
  // With a mouse, play only while this element is hovered or holds focus (see watchHover).
  hoverTargetRef?: React.RefObject<HTMLElement | null>
) {
  // Starts paused at t = 0, so a shader that waits outside the animating ones picks
  // up from the still it has been showing instead of jumping ahead by however long it waited.
  const clockRef = useRef<Clock | null>(null)

  useEffect(() => {
    if (!active || !fragmentShader) return
    const canvas = canvasRef.current
    const target = canvas?.getContext('2d')
    if (!canvas || !target) return

    const now = performance.now()
    const clock = (clockRef.current ??= { start: now, pausedAt: now })
    let program: ShaderProgram | null = null
    let visible = false
    let running = false
    let raf = 0

    const render = () => {
      if (program) drawShader(program, target, ((clock.pausedAt ?? performance.now()) - clock.start) / 1000)
    }

    const play = () => {
      if (still || running || !visible || !program) return
      running = true
      if (clock.pausedAt !== null) {
        clock.start += performance.now() - clock.pausedAt
        clock.pausedAt = null
      }
      const loop = () => {
        render()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    const pause = () => {
      if (running) clock.pausedAt = performance.now()
      running = false
      cancelAnimationFrame(raf)
    }

    // Sized to the canvas's CSS box. Resizing clears it, so a paused shader redraws its still.
    const resize = () => {
      const width = Math.max(1, Math.round(canvas.offsetWidth))
      const height = Math.max(1, Math.round(canvas.offsetHeight))
      if (canvas.width === width && canvas.height === height) return
      canvas.width = width
      canvas.height = height
      if (!running) render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    // Draws a still as soon as the shader compiles, so the ones not animating still show something.
    const unsubscribe = subscribeShader(fragmentShader, (ready) => {
      program = ready
      if (!ready) return pause()
      render()
      play()
    })

    // Animate only a few at a time (see watchAnimate): ray-marching several
    // canvases every frame stutters. Paused canvases keep their last frame.
    const stopWatching = watchAnimate(
      canvas,
      (on) => {
        visible = on
        if (on) play()
        else pause()
      },
      hoverTargetRef?.current,
    )

    return () => {
      pause()
      observer.disconnect()
      unsubscribe()
      stopWatching()
    }
  }, [active, canvasRef, fragmentShader, hoverTargetRef, still])
}
