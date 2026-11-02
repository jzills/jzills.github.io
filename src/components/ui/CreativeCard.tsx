import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Play, Pause, Maximize2 } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { LazyMount } from '@/components/ui/LazyMount'
import { useShaderRunner } from '@/lib/useShaderRunner'
import type { AudioItem, CreativeItem, ImageItem, ShaderItem, VideoItem } from '@/data/creative'

const shellClass = 'h-full bg-surface border border-border rounded overflow-hidden transition-all duration-200 hover:border-accent/40 hover:ring-1 hover:ring-accent/15'

export function ShaderCanvas({ fragmentShader, className = '' }: { fragmentShader: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useShaderRunner(canvasRef, fragmentShader, true)
  return <canvas ref={canvasRef} className={className} />
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
      onClick={onOpen}
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
  return (
    <div className={shellClass}>
      <Media item={item} onOpen={onOpen}>
        {/* The black backdrop stands in while the canvas is unmounted off-screen. */}
        <LazyMount className="absolute inset-0 bg-black" enabled={!paused}>
          <ShaderCanvas fragmentShader={item.fragmentShader} className="absolute inset-0 w-full h-full" />
        </LazyMount>
      </Media>
      <CardText item={item} />
    </div>
  )
}

function ImageCard({ item, onOpen }: { item: ImageItem; onOpen?: () => void }) {
  return (
    <div className={shellClass}>
      <Media item={item} onOpen={onOpen}>
        <img
          src={item.src}
          alt={item.alt}
          width={item.width}
          height={item.height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </Media>
      <CardText item={item} />
    </div>
  )
}

function VideoCard({ item, onOpen }: { item: VideoItem; onOpen?: () => void }) {
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
  onOpen?: () => void
  // Unmounts a shader's canvas, e.g. while a lightbox covers the grid.
  paused?: boolean
}

export function CreativeCard({ item, onOpen, paused }: CreativeCardProps) {
  switch (item.kind) {
    case 'shader':
      return <ShaderCard item={item} onOpen={onOpen} paused={paused} />
    case 'image':
      return <ImageCard item={item} onOpen={onOpen} />
    case 'video':
      return <VideoCard item={item} onOpen={onOpen} />
    case 'audio':
      return <AudioCard item={item} />
  }
}
