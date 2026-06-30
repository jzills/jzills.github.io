import { useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { useShaderRunner } from '@/lib/useShaderRunner'
import type { CreativeItem } from '@/data/creative'

function ShaderCard({ item }: { item: Extract<CreativeItem, { kind: 'shader' }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useShaderRunner(canvasRef, item.fragmentShader, true)

  return (
    <div
      className="bg-surface border border-border rounded overflow-hidden transition-all duration-200 hover:border-accent/40 hover:ring-1 hover:ring-accent/15"
    >
      <div className="relative h-64">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-fg mb-1">{item.title}</p>
        <p className="text-xs text-muted mb-3 leading-relaxed">{item.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map(tag => <Chip key={tag} label={tag} />)}
        </div>
      </div>
    </div>
  )
}

function AudioCard({ item }: { item: Extract<CreativeItem, { kind: 'audio' }> }) {
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
    <div
      className="relative bg-surface border border-border rounded overflow-hidden cursor-pointer transition-all duration-200 hover:border-accent/40 hover:ring-1 hover:ring-accent/15 select-none"
      onClick={toggle}
    >
      <audio
        ref={audioRef}
        src={item.audioSrc}
        onEnded={() => setPlaying(false)}
      />
      <div className="h-48 bg-gradient-to-br from-accent/15 via-surface to-surface flex items-center justify-center">
        <div className="p-4 rounded-full border border-accent/40 bg-bg/60 text-accent transition-transform duration-150 active:scale-95">
          {playing ? <Pause size={24} /> : <Play size={24} />}
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-fg mb-1">{item.title}</p>
        <p className="text-xs text-muted mb-3 leading-relaxed">{item.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map(tag => <Chip key={tag} label={tag} />)}
        </div>
      </div>
    </div>
  )
}

export function CreativeCard({ item }: { item: CreativeItem }) {
  if (item.kind === 'shader') return <ShaderCard item={item} />
  return <AudioCard item={item} />
}
