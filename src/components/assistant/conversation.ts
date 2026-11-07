import type { Answer } from '@/assistant'
import { emptyContext } from '@/assistant/context'
import type { ConversationContext } from '@/assistant/context'

export type ChatMessage = { id: number; role: 'user'; text: string } | { id: number; role: 'assistant'; answer: Answer }

export interface Conversation {
  messages: ChatMessage[]
  context: ConversationContext
}

export const emptyConversation = (): Conversation => ({ messages: [], context: emptyContext() })

// Kept per tab, so the conversation survives moving between the home page and the lab.
const KEY = 'portfolio-assistant:v1'

export function loadConversation(): Conversation {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Conversation | null
    if (saved && Array.isArray(saved.messages) && saved.context) return saved
  } catch {
    // Unavailable or corrupt storage: start fresh.
  }
  return emptyConversation()
}

export function saveConversation(c: Conversation) {
  try {
    if (c.messages.length) sessionStorage.setItem(KEY, JSON.stringify(c))
    else sessionStorage.removeItem(KEY)
  } catch {
    // Storage full or blocked; the conversation still works for this page view.
  }
}
