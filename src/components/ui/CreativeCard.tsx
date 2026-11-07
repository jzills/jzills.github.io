import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Play, Pause, Maximize2, Layers, Volume2, VolumeX, ChevronLeft, ChevronRight, CodeXml } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { LazyMount } from '@/components/ui/LazyMount'
import { useShaderRunner } from '@/lib/useShaderRunner'
import { useTheme } from '@/lib/theme'
import type { AudioItem, CreativeItem, ImageItem, MusicItem, ShaderItem, ShaderVariant, VideoClip, VideoItem } from '@/data/creative'

const shellClass = 'h-full bg-surface border border-border rounded overflow-hidden transition-all duration-200 hover:border-accent/40 hover:ring-1 hover:ring-accent/15'

// Key it by variant: a canvas builds its WebGL program once, from the first source it gets.
export function ShaderCanvas({ variant, playing = true, className = '' }: { variant: ShaderVariant; playing?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [source, setSource] = useState('')
  useEffect(() => {
    let cancelled = false
    variant.load().then((src) => {
      if (!cancelled) setSource(src)
    })
    return () => {
      cancelled = true
    }
  }, [variant])
  useShaderRunner(canvasRef, source, playing, variant.still)
  return <canvas ref={canvasRef} className={className} />
}

// Pauses and resumes a shader. Like the series arrows it shows on hover with a
// mouse and always on touch screens, and stays up while paused so a still frame
// doesn't read as broken.
export function ShaderPlayToggle({ playing, onToggle, title, className = '' }: { playing: boolean; onToggle: () => void; title: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${playing ? 'Pause' : 'Play'} ${title}`}
      aria-pressed={!playing}
      className={`absolute z-10 p-1.5 rounded bg-bg/70 text-muted hover:text-fg transition-opacity cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:opacity-100 ${
        playing ? 'pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100' : ''
      } ${className}`}
    >
      {playing ? <Pause size={14} /> : <Play size={14} />}
    </button>
  )
}

// Plays only while on screen, like the shaders, so off-screen videos don't decode in the background.
export function AutoplayVideo({ clip, alt, className = '' }: { clip: VideoClip; alt: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const visibility = new IntersectionObserver(([entry]) => {
      // play() rejects when autoplay is blocked; the poster then stays up, which is fine.
      if (entry.isIntersecting) video.play().catch(() => {})
      else video.pause()
    })
    visibility.observe(video)
    return () => visibility.disconnect()
  }, [])

  return (
    <video
      ref={videoRef}
      src={clip.src}
      poster={clip.poster}
      aria-label={alt}
      muted
      loop
      playsInline
      preload="none"
      className={className}
    />
  )
}

function CardText({ item }: { item: CreativeItem }) {
  return (
    <div className="p-4">
      <p className="text-sm font-medium text-fg mb-1">{item.title}</p>
      <p className="text-xs text-muted mb-3 leading-relaxed">{item.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {item.tags.map(tag => <Chip key={tag} label={tag} />)}
      </div>
    </div>
  )
}

// Media area of a visual card; becomes a button when the card can open in a lightbox.
function Media({ item, onOpen, children }: { item: CreativeItem; onOpen?: () => void; children: ReactNode }) {
  if (!onOpen) return <div className="relative h-64">{children}</div>

  return (
    <button
      type="button"
      onClick={() => onOpen()}
      aria-label={`Open ${item.title}`}
      className="group/media relative block w-full h-64 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
    >
      {children}
      <span className="absolute top-2 right-2 p-1.5 rounded bg-bg/70 text-muted opacity-0 group-hover/media:opacity-100 group-focus-visible/media:opacity-100 transition-opacity">
        <Maximize2 size={14} />
      </span>
    </button>
  )
}

const badgeClass = 'absolute flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg/75 text-[11px] font-mono text-fg'

// Shown on hover with a mouse, always on touch screens.
const overlayClass = 'absolute z-10 p-1.5 rounded bg-bg/70 text-muted hover:text-fg pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent'
const arrowClass = `${overlayClass} top-1/2 -translate-y-1/2`

// A series card's position, e.g. "2 / 5". Goes inside the media.
function SeriesBadge({ variant, count }: { variant: number; count: number }) {
  if (count < 2) return null
  return (
    <span className={`${badgeClass} bottom-2 left-2`}>
      <Layers size={12} aria-hidden="true" />
      {variant + 1} / {count}
    </span>
  )
}

// Steps a series card through its variants. Goes beside the media button, since buttons can't nest.
function SeriesArrows({ title, count, onStep }: { title: string; count: number; onStep: (delta: number) => void }) {
  if (count < 2) return null
  return (
    <>
      <button type="button" onClick={() => onStep(-1)} aria-label={`Previous ${title} variant`} className={`${arrowClass} left-2`}>
        <ChevronLeft size={16} />
      </button>
      <button type="button" onClick={() => onStep(1)} aria-label={`Next ${title} variant`} className={`${arrowClass} right-2`}>
        <ChevronRight size={16} />
      </button>
    </>
  )
}

function useSeries(count: number) {
  const [variant, setVariant] = useState(0)
  const step = (delta: number) => setVariant((v) => (v + delta + count) % count)
  return [variant, step] as const
}

function ShaderCard({ item, onOpen, paused }: { item: ShaderItem; onOpen?: (variant: number, code?: boolean) => void; paused?: boolean }) {
  const [playing, setPlaying] = useState(true)
  const count = item.variants.length
  const [variant, step] = useSeries(count)
  const current = item.variants[variant]
  return (
    <div className={shellClass}>
      {/* The controls sit beside the media button rather than inside it: buttons can't nest. */}
      <div className="group/card relative">
        <Media item={item} onOpen={onOpen && (() => onOpen(variant))}>
          {/* The black backdrop stands in while the canvas is unmounted off-screen. */}
          <LazyMount className="absolute inset-0 bg-black" enabled={!paused}>
            <ShaderCanvas key={variant} variant={current} playing={playing} className="absolute inset-0 w-full h-full" />
          </LazyMount>
          <SeriesBadge variant={variant} count={count} />
        </Media>
        <SeriesArrows title={item.title} count={count} onStep={step} />
        {!current.still && (
          <ShaderPlayToggle playing={playing} onToggle={() => setPlaying((p) => !p)} title={item.title} className="bottom-2 right-2" />
        )}
        {/* Opens the lightbox with the code showing. Beside the play toggle, or in its place on a still. */}
        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen(variant, true)}
            aria-label={`Show ${item.title} code`}
            title="Show code"
            className={`${overlayClass} bottom-2 ${current.still ? 'right-2' : 'right-10'}`}
          >
            <CodeXml size={14} />
          </button>
        )}
      </div>
      <CardText item={item} />
    </div>
  )
}

function ImageCard({ item, onOpen }: { item: ImageItem; onOpen?: (variant: number) => void }) {
  const count = item.images.length
  const [variant, step] = useSeries(count)
  const image = item.images[variant]

  return (
    <div className={shellClass}>
      {/* The arrows sit beside the media button rather than inside it: buttons can't nest. */}
      <div className="group/card relative">
        <Media item={item} onOpen={onOpen && (() => onOpen(variant))}>
          <img
            src={image.card}
            alt={count > 1 ? `${item.alt} (${variant + 1} of ${count})` : item.alt}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <SeriesBadge variant={variant} count={count} />
        </Media>
        <SeriesArrows title={item.title} count={count} onStep={step} />
      </div>
      <CardText item={item} />
    </div>
  )
}

// Sits on the video's dark gradient in either theme, so it's always white.
const controlClass = 'p-1.5 rounded text-white hover:text-accent transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent'

// A video with sound never autoplays: the visitor starts it, and the controls
// stay on screen so it's clear there's audio before pressing play.
interface SoundVideoProps {
  item: VideoItem
  clip: VideoClip
  onOpen?: () => void
  paused?: boolean
  // Series arrows, drawn over the video.
  nav?: ReactNode
  // Position in a series, e.g. "2 / 7", shown in the control bar.
  position?: string
  // Start playing on mount: set when stepping to the next clip while one plays.
  autoStart?: boolean
  onPlayingChange?: (playing: boolean) => void
}

function SoundVideo({ item, clip, onOpen, paused, nav, position, autoStart, onPlayingChange }: SoundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlayingState] = useState(false)
  const setPlaying = (p: boolean) => {
    setPlayingState(p)
    onPlayingChange?.(p)
  }

  useEffect(() => {
    if (autoStart) videoRef.current?.play().catch(() => {})
  }, [autoStart])
  const [muted, setMuted] = useState(false)
  // Mirrors the element, which starts at full volume.
  const [volume, setVolume] = useState(1)

  // Opening the lightbox (which plays its own copy) pauses the card.
  useEffect(() => {
    if (paused) videoRef.current?.pause()
  }, [paused])

  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  const setLevel = (level: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = level
    video.muted = level === 0
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    // Unmuting at zero would stay silent; bring the level back up.
    if (!video.muted && video.volume === 0) video.volume = 0.8
  }

  const silent = muted || volume === 0

  return (
    <div className={shellClass}>
      <div className="group/card relative h-64 bg-black">
        <video
          ref={videoRef}
          src={clip.src}
          poster={clip.poster}
          aria-label={position ? `${item.alt} (${position.replace(' / ', ' of ')})` : item.alt}
          loop
          playsInline
          preload="none"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onVolumeChange={(e) => {
            setMuted(e.currentTarget.muted)
            setVolume(e.currentTarget.volume)
          }}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        />

        <span className={`${badgeClass} top-2 left-2`}>
          <Volume2 size={12} aria-hidden="true" />
          Sound
        </span>

        {onOpen && (
          <button
            type="button"
            onClick={() => onOpen()}
            aria-label={`Open ${item.title}`}
            className="absolute top-2 right-2 p-1.5 rounded bg-bg/70 text-muted hover:text-fg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Maximize2 size={14} />
          </button>
        )}

        {!playing && (
          <button
            type="button"
            onClick={toggle}
            aria-label={`Play ${item.title} with sound`}
            className="group/play absolute inset-0 m-auto w-fit h-fit p-4 rounded-full border border-accent/40 bg-bg/60 text-accent cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Play size={24} className="transition-transform duration-150 group-active/play:scale-95" />
          </button>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
          <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className={controlClass}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" onClick={toggleMute} aria-label={silent ? 'Unmute' : 'Mute'} aria-pressed={silent} className={controlClass}>
            {silent ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={silent ? 0 : volume}
            onChange={(e) => setLevel(Number(e.target.value))}
            aria-label="Volume"
            className="w-24 accent-accent cursor-pointer"
          />
          {position && (
            <span className="ml-auto flex items-center gap-1 pr-1 text-[11px] font-mono text-white/80">
              <Layers size={12} aria-hidden="true" />
              {position}
            </span>
          )}
        </div>
        {nav}
      </div>
      <CardText item={item} />
    </div>
  )
}

function VideoCard({ item, onOpen, paused }: { item: VideoItem; onOpen?: (variant: number) => void; paused?: boolean }) {
  const count = item.clips.length
  const [variant, step] = useSeries(count)
  const clip = item.clips[variant]
  // Whether the clip on show is playing, so stepping on keeps the music going.
  const playingRef = useRef(false)
  const [autoStart, setAutoStart] = useState(false)
  const open = onOpen && (() => onOpen(variant))
  const stepClip = (delta: number) => {
    setAutoStart(playingRef.current)
    step(delta)
  }

  if (item.sound) {
    return (
      <SoundVideo
        // Remounts per clip, so its playing state and controls start fresh.
        key={variant}
        item={item}
        clip={clip}
        onOpen={open}
        paused={paused}
        nav={<SeriesArrows title={item.title} count={count} onStep={stepClip} />}
        position={count > 1 ? `${variant + 1} / ${count}` : undefined}
        autoStart={autoStart}
        onPlayingChange={(p) => {
          playingRef.current = p
        }}
      />
    )
  }
  return (
    <div className={shellClass}>
      <div className="group/card relative">
        <Media item={item} onOpen={open}>
          <AutoplayVideo key={variant} clip={clip} alt={item.alt} className="absolute inset-0 w-full h-full object-cover" />
          <SeriesBadge variant={variant} count={count} />
        </Media>
        <SeriesArrows title={item.title} count={count} onStep={step} />
      </div>
      <CardText item={item} />
    </div>
  )
}

function AudioCard({ item }: { item: AudioItem }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  return (
    <div className={`relative select-none ${shellClass}`}>
      <audio
        ref={audioRef}
        src={item.audioSrc}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={`${playing ? 'Pause' : 'Play'} ${item.title}`}
        aria-pressed={playing}
        className="group/play w-full h-48 bg-gradient-to-br from-accent/15 via-surface to-surface flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="p-4 rounded-full border border-accent/40 bg-bg/60 text-accent transition-transform duration-150 group-active/play:scale-95">
          {playing ? <Pause size={24} /> : <Play size={24} />}
        </span>
      </button>
      <CardText item={item} />
    </div>
  )
}

// Bandcamp's player takes its colours in the URL, so they follow the site's theme
// tokens by hand (--color-surface and --color-accent in index.css).
const bandcampColors = {
  dark: { bg: '111113', link: '22d3ee' },
  light: { bg: 'ffffff', link: '0e7490' },
}

function MusicCard({ item }: { item: MusicItem }) {
  const theme = useTheme()
  const { bg, link } = bandcampColors[theme]
  const { album, track } = item.bandcamp
  const src =
    'https://bandcamp.com/EmbeddedPlayer/' +
    (album ? `album=${album}/` : '') +
    `size=large/bgcol=${bg}/linkcol=${link}/tracklist=false/artwork=small/track=${track}/transparent=true/`

  // The player already names the album and track, so the card adds only its chips.
  return (
    <div className={`${shellClass} flex flex-col`}>
      {/* Bandcamp's standard player with small artwork is 120px tall. Loads only near the viewport.
          No fallback link inside: iframe children are parsed as text, which breaks hydration. */}
      <iframe
        title={`${item.title} on Bandcamp`}
        src={src}
        loading="lazy"
        className="block w-full h-[120px] border-0 shrink-0"
      />
      <div className="mt-auto flex flex-wrap gap-1.5 p-4">
        {item.tags.map((tag) => <Chip key={tag} label={tag} />)}
      </div>
    </div>
  )
}

interface CreativeCardProps {
  item: CreativeItem
  // Makes the media clickable (the lab page opens a lightbox); audio plays inline instead.
  // A series passes the variant on show, so the lightbox opens on the same image.
  // Shaders can also ask for their code to show.
  onOpen?: (variant?: number, code?: boolean) => void
  // Unmounts a shader's canvas and pauses a playing video, e.g. while a lightbox covers the grid.
  paused?: boolean
}

export function CreativeCard({ item, onOpen, paused }: CreativeCardProps) {
  switch (item.kind) {
    case 'shader':
      return <ShaderCard item={item} onOpen={onOpen} paused={paused} />
    case 'image':
      return <ImageCard item={item} onOpen={onOpen} />
    case 'video':
      return <VideoCard item={item} onOpen={onOpen} paused={paused} />
    case 'audio':
      return <AudioCard item={item} />
    case 'music':
      return <MusicCard item={item} />
  }
}
