import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Play, Pause, Maximize2, Layers, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { LazyMount } from '@/components/ui/LazyMount'
import { useShaderRunner } from '@/lib/useShaderRunner'
import type { AudioItem, CreativeItem, ImageItem, ShaderItem, VideoItem } from '@/data/creative'

const shellClass = 'h-full bg-surface border border-border rounded overflow-hidden transition-all duration-200 hover:border-accent/40 hover:ring-1 hover:ring-accent/15'

export function ShaderCanvas({ fragmentShader, playing = true, className = '' }: { fragmentShader: string; playing?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useShaderRunner(canvasRef, fragmentShader, playing)
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
export function AutoplayVideo({ item, className = '' }: { item: VideoItem; className?: string }) {
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
      src={item.src}
      poster={item.poster}
      aria-label={item.alt}
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

function ShaderCard({ item, onOpen, paused }: { item: ShaderItem; onOpen?: () => void; paused?: boolean }) {
  const [playing, setPlaying] = useState(true)
  return (
    <div className={shellClass}>
      {/* The toggle sits beside the media button rather than inside it: buttons can't nest. */}
      <div className="group/card relative">
        <Media item={item} onOpen={onOpen}>
          {/* The black backdrop stands in while the canvas is unmounted off-screen. */}
          <LazyMount className="absolute inset-0 bg-black" enabled={!paused}>
            <ShaderCanvas fragmentShader={item.fragmentShader} playing={playing} className="absolute inset-0 w-full h-full" />
          </LazyMount>
        </Media>
        <ShaderPlayToggle playing={playing} onToggle={() => setPlaying((p) => !p)} title={item.title} className="bottom-2 left-2" />
      </div>
      <CardText item={item} />
    </div>
  )
}

const badgeClass = 'absolute flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg/75 text-[11px] font-mono text-fg'

// Shown on hover with a mouse, always on touch screens.
const arrowClass = 'absolute top-1/2 -translate-y-1/2 z-10 p-1.5 rounded bg-bg/70 text-muted hover:text-fg pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent'

function ImageCard({ item, onOpen }: { item: ImageItem; onOpen?: (variant: number) => void }) {
  const [variant, setVariant] = useState(0)
  const count = item.images.length
  const image = item.images[variant]
  const step = (delta: number) => setVariant((v) => (v + delta + count) % count)

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
          {count > 1 && (
            <span className={`${badgeClass} bottom-2 left-2`}>
              <Layers size={12} aria-hidden="true" />
              {variant + 1} / {count}
            </span>
          )}
        </Media>
        {count > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label={`Previous ${item.title} variant`} className={`${arrowClass} left-2`}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={`Next ${item.title} variant`} className={`${arrowClass} right-2`}>
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      <CardText item={item} />
    </div>
  )
}

// Sits on the video's dark gradient in either theme, so it's always white.
const controlClass = 'p-1.5 rounded text-white hover:text-accent transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent'

// A video with sound never autoplays: the visitor starts it, and the controls
// stay on screen so it's clear there's audio before pressing play.
function SoundVideo({ item, onOpen, paused }: { item: VideoItem; onOpen?: () => void; paused?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
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
      <div className="relative h-64 bg-black">
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster}
          aria-label={item.alt}
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
        </div>
      </div>
      <CardText item={item} />
    </div>
  )
}

function VideoCard({ item, onOpen, paused }: { item: VideoItem; onOpen?: () => void; paused?: boolean }) {
  if (item.sound) return <SoundVideo item={item} onOpen={onOpen} paused={paused} />
  return (
    <div className={shellClass}>
      <Media item={item} onOpen={onOpen}>
        <AutoplayVideo item={item} className="absolute inset-0 w-full h-full object-cover" />
      </Media>
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

interface CreativeCardProps {
  item: CreativeItem
  // Makes the media clickable (the lab page opens a lightbox); audio plays inline instead.
  // A series passes the variant on show, so the lightbox opens on the same image.
  onOpen?: (variant?: number) => void
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
  }
}
