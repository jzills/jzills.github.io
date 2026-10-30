import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { CREATIVE_SHOW_EVENT, search, tokenize } from '@/lib/searchIndex'
import type { SearchRecord, SearchResult } from '@/lib/searchIndex'

interface Props {
  // Only one instance should own the global "/" and Ctrl/⌘K shortcuts and the ?q= param.
  primary?: boolean
  // Called after a result is chosen, e.g. to close the mobile menu.
  onNavigate?: () => void
  className?: string
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function highlight(text: string, terms: string[]): ReactNode {
  if (terms.length === 0) return text
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-accent/20 text-fg rounded-sm">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function reveal(record: SearchRecord) {
  if (record.creativeIndex !== undefined) {
    window.dispatchEvent(new CustomEvent(CREATIVE_SHOW_EVENT, { detail: record.creativeIndex }))
  }
  const el = document.getElementById(record.target)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // Restart the animation if the same element is chosen twice in a row.
  el.classList.remove('search-flash')
  void el.offsetWidth
  el.classList.add('search-flash')
  window.setTimeout(() => el.classList.remove('search-flash'), 1600)
}

// Results grouped by kind, groups ordered by their best match.
function group(results: SearchResult[]) {
  const groups = new Map<string, SearchResult[]>()
  for (const r of results) {
    const list = groups.get(r.record.kind) ?? []
    list.push(r)
    groups.set(r.record.kind, list)
  }
  return [...groups.entries()]
}

export function SearchBox({ primary = false, onNavigate, className = '' }: Props) {
  const [query, setQuery] = useState(() =>
    primary ? (new URLSearchParams(window.location.search).get('q') ?? '') : '',
  )
  const [open, setOpen] = useState(() => query !== '')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => search(query), [query])
  const grouped = useMemo(() => group(results), [results])
  // Flattened in display order so arrow keys follow what is on screen.
  const ordered = useMemo(() => grouped.flatMap(([, list]) => list), [grouped])
  const terms = useMemo(() => tokenize(query), [query])

  useEffect(() => {
    if (!primary) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [primary])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const choose = (result: SearchResult | undefined) => {
    if (!result) return
    setOpen(false)
    inputRef.current?.blur()
    onNavigate?.()
    reveal(result.record)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, ordered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(ordered[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showPanel = open && query.trim() !== ''

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 h-8 px-2.5 rounded border border-border bg-surface/60 text-muted focus-within:border-accent/60 transition-colors">
        <Search size={14} className="shrink-0" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          aria-label="Search the site"
          aria-expanded={showPanel}
          aria-controls="search-results"
          role="combobox"
          className="w-full min-w-0 bg-transparent text-sm text-fg placeholder:text-muted outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {primary && (
          <kbd className="hidden lg:inline-flex shrink-0 items-center px-1.5 h-5 text-[10px] font-mono text-muted border border-border rounded">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        )}
      </div>

      {showPanel && (
        <div
          id="search-results"
          role="listbox"
          className="absolute right-0 mt-2 w-full md:w-[380px] max-h-[70vh] overflow-y-auto rounded border border-border bg-bg/95 backdrop-blur-sm shadow-xl shadow-black/40 light:shadow-black/10 z-50"
        >
          {ordered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted text-center">No results for “{query.trim()}”</p>
          ) : (
            grouped.map(([kind, list]) => (
              <div key={kind} className="py-1">
                <p className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted">{kind}</p>
                {list.map((result) => {
                  const index = ordered.indexOf(result)
                  const { record, snippet } = result
                  return (
                    <button
                      key={`${record.kind}-${record.title}-${record.target}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(result)}
                      className={`block w-full text-left px-3 py-2 transition-colors ${index === active ? 'bg-surface' : ''}`}
                    >
                      <p className="text-sm text-fg">
                        {highlight(record.title, terms)}
                        {record.subtitle && (
                          <span className="ml-2 text-xs text-muted">{highlight(record.subtitle, terms)}</span>
                        )}
                      </p>
                      {snippet && (
                        <p className="mt-0.5 text-xs text-muted leading-relaxed line-clamp-2">{highlight(snippet, terms)}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
