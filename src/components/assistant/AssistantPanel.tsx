import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowUp, RotateCcw, X } from 'lucide-react'
import { assistant, STARTER_QUESTIONS } from '@/assistant'
import type { Answer, Block } from '@/assistant'
import { AnswerLink, RichText } from './RichText'
import type { Conversation } from './conversation'

interface Props {
  conversation: Conversation
  onChange: (next: Conversation) => void
  onClose: () => void
  onClear: () => void
}

const iconButton = 'p-1.5 rounded text-muted hover:text-fg hover:bg-fg/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default'
const chipClass =
  'text-left text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-muted hover:text-fg hover:border-accent/50 transition-colors cursor-pointer'

// Search is instant; a short pause reads as the assistant looking rather than a canned reply.
const THINKING_MS = 380

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isPhone = () => window.matchMedia('(max-width: 639px)').matches
// Focusing a field on a touch screen opens the keyboard over the suggestions, so
// the input waits for a tap there.
const isTouch = () => window.matchMedia('(pointer: coarse)').matches

// Eases the log to a scroll position. Done by hand because iOS Safari often drops
// scrollTo's smooth behavior and jumps. Stops if the reader touches or scrolls,
// and jumps straight there when they've asked for reduced motion. Returns a canceller.
function glide(el: HTMLElement, target: number, duration = 420) {
  const to = Math.max(0, Math.min(target, el.scrollHeight - el.clientHeight))
  const from = el.scrollTop
  if (prefersReducedMotion() || Math.abs(to - from) < 2) {
    el.scrollTop = to
    return () => {}
  }
  let frame = 0
  const start = performance.now()
  const stop = () => {
    cancelAnimationFrame(frame)
    el.removeEventListener('touchstart', stop)
    el.removeEventListener('wheel', stop)
  }
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    el.scrollTop = from + (to - from) * (1 - (1 - t) ** 3)
    if (t < 1) frame = requestAnimationFrame(step)
    else stop()
  }
  el.addEventListener('touchstart', stop, { passive: true })
  el.addEventListener('wheel', stop, { passive: true })
  frame = requestAnimationFrame(step)
  return stop
}

const supportLabel: Partial<Record<Answer['support'], string>> = {
  related: 'Related, not a direct match',
  unavailable: 'Not in the portfolio',
}

function AnswerBlock({ block, onNavigate }: { block: Block; onNavigate: () => void }) {
  if (block.kind === 'list') {
    return (
      <ul className="space-y-1.5">
        {block.items.map((item) => (
          <li key={item} className="relative pl-4 before:absolute before:left-0.5 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-accent/70">
            <RichText text={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    )
  }
  if (block.kind === 'quote') {
    return (
      <blockquote className="border-l-2 border-accent/50 pl-3 text-muted italic">
        “<RichText text={block.text} onNavigate={onNavigate} />”
        <span className="not-italic text-xs font-mono"> — Joshua, on the About section</span>
      </blockquote>
    )
  }
  return (
    <p>
      <RichText text={block.text} onNavigate={onNavigate} />
    </p>
  )
}

function Suggestions({ items, onPick, label }: { items: string[]; onPick: (q: string) => void; label: string }) {
  if (!items.length) return null
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((q) => (
        <button key={q} type="button" onClick={() => onPick(q)} className={chipClass}>
          {q}
        </button>
      ))}
    </div>
  )
}

function AssistantMessage({ answer, onNavigate }: { answer: Answer; onNavigate: () => void }) {
  const badge = supportLabel[answer.support]
  return (
    <div className="space-y-2.5 text-sm text-fg/90 leading-relaxed">
      {badge && (
        <p className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${answer.support === 'related' ? 'bg-accent/60' : 'bg-muted'}`} aria-hidden="true" />
          {badge}
        </p>
      )}
      {answer.blocks.map((block, i) => (
        <AnswerBlock key={i} block={block} onNavigate={onNavigate} />
      ))}
      {answer.sources.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">Sources</p>
          <ul className="flex flex-wrap gap-1.5">
            {answer.sources.map((s) => (
              <li key={s.id}>
                {s.href ? (
                  <AnswerLink
                    href={s.href}
                    onNavigate={onNavigate}
                    className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-muted border border-border rounded hover:text-fg hover:border-accent/50 transition-colors"
                  >
                    {s.label}
                  </AnswerLink>
                ) : (
                  <span className="inline-flex px-2 py-0.5 text-[11px] font-mono text-muted border border-border rounded">{s.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AssistantPanel({ conversation, onChange, onClose, onClear }: Props) {
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { messages } = conversation
  // Read inside the reply timer, so a reply never lands on a conversation cleared meanwhile.
  const latest = useRef(conversation)
  useEffect(() => {
    latest.current = conversation
  }, [conversation])

  useEffect(() => {
    if (!isTouch()) inputRef.current?.focus()
  }, [])

  // While searching, show the question and the typing dots at the bottom. Once the
  // answer lands, bring its question to the top so the answer reads from its start
  // instead of from its end.
  useLayoutEffect(() => {
    const log = logRef.current
    if (!log) return
    const last = messages[messages.length - 1]
    const question = last?.role === 'assistant' ? [...log.querySelectorAll<HTMLElement>('[data-question]')].pop() : undefined
    return glide(log, question ? question.offsetTop - 16 : log.scrollHeight)
  }, [messages, thinking])

  // Grow the textarea with its content, up to its max height.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  const ask = (question: string) => {
    const text = question.trim()
    if (!text || thinking) return
    const asked = { ...conversation, messages: [...messages, { id: Date.now(), role: 'user' as const, text }] }
    onChange(asked)
    setDraft('')
    setThinking(true)
    window.setTimeout(() => {
      const current = latest.current
      if (current.messages.length === 0) return setThinking(false)
      const { answer, context } = assistant.ask(text, current.context)
      onChange({ messages: [...current.messages, { id: Date.now() + 1, role: 'assistant', answer }], context })
      setThinking(false)
    }, prefersReducedMotion() ? 0 : THINKING_MS)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      ask(draft)
    }
  }

  const onPanelKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  const clear = () => {
    onClear()
    setThinking(false)
    if (!isTouch()) inputRef.current?.focus()
  }

  // Following a section link on a phone closes the full-screen panel so the section shows.
  const onNavigate = () => {
    if (isPhone()) onClose()
  }

  const lastAnswer = [...messages].reverse().find((m) => m.role === 'assistant')

  return (
    <div
      id="assistant-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={onPanelKeyDown}
      className="assistant-pop fixed inset-0 z-50 flex flex-col bg-bg sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[408px] sm:h-[min(640px,calc(100dvh-8rem))] sm:rounded-xl sm:border sm:border-border sm:bg-bg/95 sm:backdrop-blur-md sm:shadow-2xl sm:shadow-black/50 light:sm:shadow-black/15 overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold text-fg">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          Ask
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={clear} disabled={messages.length === 0} className={iconButton} aria-label="Clear conversation" title="Clear conversation">
            <RotateCcw size={15} />
          </button>
          <button type="button" onClick={onClose} className={iconButton} aria-label="Close" title="Close (Esc)">
            <X size={17} />
          </button>
        </div>
      </header>

      <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
        <div className="space-y-3 text-sm text-fg/90 leading-relaxed">
          <p>
            Hi — I answer questions about Joshua's experience, skills and open-source projects, using only what's on this site. If the
            portfolio doesn't cover something, I'll say so.
          </p>
          {messages.length === 0 && <Suggestions items={STARTER_QUESTIONS} onPick={ask} label="Suggested questions" />}
        </div>

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} data-question className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-fg">
                <span className="sr-only">You: </span>
                {m.text}
              </p>
            </div>
          ) : (
            <div key={m.id} className="space-y-3">
              <span className="sr-only">Assistant:</span>
              <AssistantMessage answer={m.answer} onNavigate={onNavigate} />
              {m === lastAnswer && !thinking && <Suggestions items={m.answer.suggestions} onPick={ask} label="Follow-up questions" />}
            </div>
          ),
        )}

        {thinking && (
          <div className="flex items-center gap-1.5 text-muted" aria-label="Searching the portfolio">
            <span className="assistant-dot" />
            <span className="assistant-dot [animation-delay:0.15s]" />
            <span className="assistant-dot [animation-delay:0.3s]" />
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent/60 transition-colors">
          <label htmlFor="assistant-input" className="sr-only">
            Ask a question about Joshua's work
          </label>
          {/* 16px on phones: iOS Safari zooms the page into any smaller field it focuses. */}
          <textarea
            id="assistant-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Ask about his experience, skills, projects…"
            maxLength={500}
            className="flex-1 resize-none bg-transparent text-base sm:text-sm text-fg placeholder:text-muted outline-none max-h-32 leading-relaxed py-0.5"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking}
            className="shrink-0 p-1.5 rounded-md bg-accent text-bg hover:bg-accent-dim disabled:bg-border disabled:text-muted transition-colors cursor-pointer disabled:cursor-default"
            aria-label="Send"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
