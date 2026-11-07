import type { Aspect, Intent } from './engine/intent'

// What the previous turn was about, so "what about Azure?" and "tell me more" work.
// Plain data, so the widget can keep it in sessionStorage, and kept apart from the
// engine so the widget can hold one without loading the knowledge base.
export interface ConversationContext {
  intent?: Intent
  subjects: string[]
  projects: string[]
  categories: string[]
  aspect?: Aspect
  role?: string
  unknownSubject?: string
  // Statements already shown on the current topic, so "tell me more" doesn't repeat them.
  shown: string[]
}

export const emptyContext = (): ConversationContext => ({ subjects: [], projects: [], categories: [], shown: [] })
