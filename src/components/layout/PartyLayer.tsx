import { useEffect, useRef, useState } from 'react'
import { SHOCKWAVE_EVENT } from '@/lib/events'
import { MARK_TAP_EVENT, makeSparkle, recordTap, stepSparkle, tapCount, tickerItems, type Sparkle } from '@/lib/party'
import { setTheme, unlockParty, useTheme } from '@/lib/theme'

// Fonts only party mode uses, fetched the first time it switches on.
const PARTY_FONTS = 'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap'

function loadPartyFonts() {
  if (document.querySelector(`link[href="${PARTY_FONTS}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = PARTY_FONTS
  document.head.appendChild(link)
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Sparkles trailing the mouse or finger, 90s cursor-trail style. The loop runs
// only while sparkles are alive.
function SparkleTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || reducedMotion()) return

    const sparkles: Sparkle[] = []
    let made = 0, raf = 0, last = 0, lastX = -1e4, lastY = -1e4

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // A four-pointed twinkle.
    const star = (s: Sparkle) => {
      const k = 1 - s.age / s.life
      const r = s.size * (0.4 + 0.6 * k)
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.spin)
      ctx.globalAlpha = Math.min(1, k * 1.5)
      ctx.fillStyle = s.color
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const d = i % 2 === 0 ? r : r * 0.28
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d)
      }
      ctx.fill()
      ctx.restore()
    }

    const frame = (now: number) => {
      const f = Math.min(3, (now - last) / (1000 / 60))
      last = now
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      for (let i = sparkles.length - 1; i >= 0; i--) {
        if (stepSparkle(sparkles[i], f)) star(sparkles[i])
        else sparkles.splice(i, 1)
      }
      raf = sparkles.length ? requestAnimationFrame(frame) : 0
    }

    const emit = (x: number, y: number, n: number) => {
      for (let i = 0; i < n && sparkles.length < 240; i++) sparkles.push(makeSparkle(x, y, made++))
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    // One sparkle per ~14px travelled, so slow and fast moves trail evenly.
    const trail = (x: number, y: number) => {
      const d = Math.hypot(x - lastX, y - lastY)
      if (d > 200) {
        lastX = x
        lastY = y
        return
      }
      if (d < 14) return
      emit(x, y, Math.min(3, Math.floor(d / 14)))
      lastX = x
      lastY = y
    }

    const onPointerMove = (e: PointerEvent) => trail(e.clientX, e.clientY)
    // Touches turn into scrolling, which cancels pointer events, so follow the finger directly.
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) trail(t.clientX, t.clientY)
    }
    const onPointerDown = (e: PointerEvent) => {
      lastX = e.clientX
      lastY = e.clientY
      emit(e.clientX, e.clientY, 10)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[70]" aria-hidden="true" />
}

function Ticker({ count }: { count: number }) {
  const items = tickerItems(count)
  // Two copies side by side, so sliding one width left loops seamlessly.
  const run = (copy: number) => (
    <span className="party-ticker-run" aria-hidden={copy > 0 || undefined}>
      {items.map((item) => (
        <span key={item} className="px-6">
          <span className="party-blink">★</span> {item}
        </span>
      ))}
    </span>
  )

  return (
    <div className="party-ticker fixed top-14 inset-x-0 z-40 flex items-center h-7">
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <div className="party-ticker-track">
          {run(0)}
          {run(1)}
        </div>
      </div>
      <button type="button" onClick={() => setTheme('dark')} className="party-exit shrink-0 h-full px-3">
        ✕ EXIT PARTY
      </button>
    </div>
  )
}

// Everything party mode adds on top of the theme's CSS (index.css). Always
// mounted, so it can count the hero mark's taps and unlock the mode.
export function PartyLayer() {
  const theme = useTheme()
  const [count, setCount] = useState(tapCount)
  const [announce, setAnnounce] = useState(false)

  useEffect(() => {
    const onTap = () => {
      const unlocksNow = recordTap()
      setCount(tapCount())
      if (!unlocksNow) return
      unlockParty()
      const go = () => {
        setTheme('party')
        setAnnounce(true)
      }
      // The burst itself reveals party mode. Under reduced motion there is no
      // burst (the figure just fades), so switch straight away.
      if (reducedMotion()) go()
      else window.addEventListener(SHOCKWAVE_EVENT, go, { once: true })
    }
    window.addEventListener(MARK_TAP_EVENT, onTap)
    return () => window.removeEventListener(MARK_TAP_EVENT, onTap)
  }, [])

  useEffect(() => {
    if (theme === 'party') loadPartyFonts()
  }, [theme])

  useEffect(() => {
    if (!announce) return
    const timer = window.setTimeout(() => setAnnounce(false), 2600)
    return () => window.clearTimeout(timer)
  }, [announce])

  if (theme !== 'party') return null

  return (
    <>
      <Ticker count={count} />
      <SparkleTrail />
      {announce && (
        <div role="status" className="party-unlocked fixed inset-0 z-[80] grid place-items-center pointer-events-none">
          <p>
            PARTY MODE
            <br />
            UNLOCKED!!!
          </p>
        </div>
      )}
    </>
  )
}
