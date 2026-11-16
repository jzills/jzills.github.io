import { useEffect, useRef } from 'react'
import { drawShader, shaderTarget, subscribeShader } from '@/lib/shaderPool'
import type { ShaderProgram } from '@/lib/shaderPool'
import { coarse, watchAnimate } from '@/lib/shaderPlayback'
import { useOwnContextRunner } from '@/lib/shaderOwnContext'

type Clock = {
  start: number
  // When the animation stopped, or null while it runs. Resuming shifts start by
  // the time spent stopped, so a shader picks up on the frame it paused on.
  pausedAt: number | null
}

// Runs a shader in the card's canvas, drawn through the page's shared WebGL context (see shaderPool).
function useSharedContextRunner(
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
    const target = canvas ? shaderTarget(canvas) : null
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

// Desktop draws every shader through one shared context: each compiles once and
// nothing is created or destroyed as cards scroll past. Phones give each card its
// own context instead, which ran heavy shaders far better there. Chosen once per
// page load, so the hook a component calls never changes.
export const useShaderRunner = coarse ? useOwnContextRunner : useSharedContextRunner

// Shader cards can stay mounted after scrolling away only with the shared context;
// with a context per card, unmounting is what frees them.
export const sharedShaderContext = !coarse
