// Loaded on demand by the chat widget: building the index needs the whole
// knowledge base, which the page shouldn't pay for until someone asks.
import { loadKnowledgeBase } from './knowledge'
import { createAssistant } from './engine/assistant'

export const assistant = createAssistant(loadKnowledgeBase())

export { STARTER_QUESTIONS } from './engine/assistant'
export { emptyContext } from './context'
export type { ConversationContext } from './context'
export type { Answer, Block, Source, Support } from './engine/assistant'
