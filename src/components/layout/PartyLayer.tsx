import { useEffect, useRef, useState } from 'react'
import { SHOCKWAVE_EVENT } from '@/lib/events'
import {
  BANANA_PALETTE, BANANA_SPRITE, MARK_TAP_EVENT, SHOWER, bananaAt, makeShower, makeSparkle, nextShowerDelay,
  recordTap, stepSparkle, tapCount, tickerItems, type Banana, type Sparkle,
} from '@/lib/party'
import { getTheme, setTheme, useTheme } from '@/lib/theme'

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

// The banana sprite as a tiny canvas, drawn scaled up with sharp pixels.
function bananaSprite(): HTMLCanvasElement {
  const h = BANANA_SPRITE.length, w = BANANA_SPRITE[0].length
  const sprite = document.createElement('canvas')
  sprite.width = w
  sprite.height = h
  const sctx = sprite.getContext('2d')
  if (!sctx) return sprite
  const img = sctx.createImageData(w, h)
  BANANA_SPRITE.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const rgb = BANANA_PALETTE[row[x]]
      if (!rgb) continue
      img.data.set([...rgb, 255], (y * w + x) * 4)
    }
  })
  sctx.putImageData(img, 0, 0)
  return sprite
}

// Every 20 to 40 seconds, and on every blast, a shower of spinning pixel
// bananas falls down the screen. The loop runs only while one is falling.
function BananaRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || reducedMotion()) return
    const sprite = bananaSprite()
    const sw = sprite.width, sh = sprite.height

    // Each shower keeps its own clock, so a blast can start one mid-shower.
    let showers: { start: number; bananas: Banana[] }[] = []
    let raf = 0, timer = 0

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const frame = (now: number) => {
      const W = window.innerWidth, H = window.innerHeight
      ctx.clearRect(0, 0, W, H)
      ctx.imageSmoothingEnabled = false
      showers = showers.filter((shower) => {
        const t = (now - shower.start) / 1000
        let falling = false
        for (const b of shower.bananas) {
          const at = bananaAt(b, t, H)
          if (at.gone) continue
          falling = true
          if (t < b.delay) continue
          ctx.save()
          ctx.translate(at.x, at.y)
          ctx.rotate(at.angle)
          ctx.drawImage(sprite, (-sw * b.scale) / 2, (-sh * b.scale) / 2, sw * b.scale, sh * b.scale)
          ctx.restore()
        }
        return falling
      })
      raf = showers.length ? requestAnimationFrame(frame) : 0
    }

    const shower = () => {
      showers.push({ start: performance.now(), bananas: makeShower(window.innerWidth) })
      if (!raf) raf = requestAnimationFrame(frame)
    }

    // Skipped while the tab is hidden; the next one is scheduled either way.
    const schedule = (seconds: number) => {
      timer = window.setTimeout(() => {
        if (!document.hidden) shower()
        schedule(nextShowerDelay())
      }, seconds * 1000)
    }

    resize()
    schedule(SHOWER.first)
    window.addEventListener('resize', resize)
    window.addEventListener(SHOCKWAVE_EVENT, shower)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      window.removeEventListener('resize', resize)
      window.removeEventListener(SHOCKWAVE_EVENT, shower)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[65]" aria-hidden="true" />
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
// mounted, so it can count the hero mark's taps and switch the mode on.
export function PartyLayer() {
  const theme = useTheme()
  const [count, setCount] = useState(tapCount)
  const [announce, setAnnounce] = useState(false)

  useEffect(() => {
    const onTap = () => {
      const entersParty = recordTap(getTheme() !== 'party')
      setCount(tapCount())
      if (!entersParty) return
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
      <BananaRain />
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
