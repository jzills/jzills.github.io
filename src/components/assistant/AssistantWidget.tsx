import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { MessagesSquare, X } from 'lucide-react'
import { emptyConversation, loadConversation, saveConversation } from './conversation'
import type { Conversation } from './conversation'

// The panel carries the search engine and the whole knowledge base, so it loads
// the first time a visitor reaches for the launcher, not with the page.
const loadPanel = () => import('./AssistantPanel')
const AssistantPanel = lazy(loadPanel)

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  // Nothing the closed launcher renders depends on this, so reading storage here
  // can't make hydration disagree with the prerendered HTML.
  const [conversation, setConversation] = useState<Conversation>(() => (typeof window === 'undefined' ? emptyConversation() : loadConversation()))
  const launcherRef = useRef<HTMLButtonElement>(null)

  const update = (next: Conversation) => {
    setConversation(next)
    saveConversation(next)
  }

  const close = () => setOpen(false)

  // Back to the launcher on close, once it's shown again (phones hide it behind the panel).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // The panel fills the screen on phones; keep the page behind it from scrolling.
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 639px)').matches) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <AssistantPanel conversation={conversation} onChange={update} onClose={close} onClear={() => update(emptyConversation())} />
        </Suspense>
      )}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        onPointerEnter={loadPanel}
        onFocus={loadPanel}
        aria-expanded={open}
        aria-controls={open ? 'assistant-panel' : undefined}
        aria-label={open ? 'Close Ask' : 'Ask about my work'}
        className={`group fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 items-center justify-center h-12 w-12 rounded-full border border-border bg-surface/90 backdrop-blur-sm text-fg shadow-lg shadow-black/40 light:shadow-black/10 hover:border-accent/50 transition-colors cursor-pointer ${open ? 'hidden sm:inline-flex' : 'inline-flex'}`}
      >
        {open ? <X size={18} aria-hidden="true" /> : <MessagesSquare size={18} className="text-accent" aria-hidden="true" />}
        {/* Shown on hover and keyboard focus; the button's label carries the same words for screen readers. */}
        {!open && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded border border-border bg-surface px-2.5 py-1 text-xs text-fg shadow-md shadow-black/30 light:shadow-black/10 opacity-0 translate-x-1 transition-all duration-150 pointer-fine:group-hover:opacity-100 pointer-fine:group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
          >
            Ask about my work
          </span>
        )}
      </button>
    </>
  )
}
