// Text normalization shared by indexing and questions, so "k8s" in a question
// and "Kubernetes" in an entry meet on the same token.

export interface Term {
  name: string
  token: string
  // Tokens of everything this term implies, transitively.
  implies: string[]
  // False for technologies the knowledge base deliberately doesn't cover.
  listed: boolean
  // Searchable, but too generic to be the subject of a question on its own ("plugin", "terminal").
  weak: boolean
  category?: string
}

export interface TermSource {
  name: string
  aliases?: string[]
  implies?: string[]
  token?: string
  listed?: boolean
  weak?: boolean
  category?: string
}

// Joins multi-word names into one token: "GitHub Actions" → "github_actions".
export const toToken = (name: string) => name.toLowerCase().trim().replace(/\s+/g, '_')

export const STOPWORDS = new Set(
  `a an and are as at be been being but by can could did do does doing for from had has have having
  he her here hers him his how i if in into is it its just me my of on or our so some such than that
  the their them then there these they this those to too very was we were what when where which while
  who whom why will with would you your yes no not any all also about tell show give know knows
  experience experienced experiences worked work works working use used uses using done joshua zillwood
  josh mr please go much many more most kind sort type any anything something thing things get got`
    .split(/\s+/)
    .filter(Boolean),
)

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Letters, digits and the characters that live inside technology names (.net, c#, ci/cd, c++).
const WORD = String.raw`[\p{L}\p{N}_#+]`

// "Go" the language rather than the verb: capitalized and not followed by a direction,
// or lowercase right after a cue such as "with" or "know".
const GO_CAPITALIZED = /(?<![\p{L}\p{N}])Go(?![\p{L}\p{N}])(?!\s+(?:to|through|over|back|ahead|on|for|into|with)\b)/gu
const GO_AFTER_CUE = /\b(with|in|knows?|uses?|using|used|about|and|or|writes?|wrote|written)\s+go\b(?!\s+(?:to|through|over|back|ahead|on|for|into)\b)/gi

export class Normalizer {
  readonly terms: Term[]
  private readonly byToken = new Map<string, Term>()
  private readonly phrases = new Map<string, string>()
  private readonly phraseRe: RegExp

  constructor(sources: TermSource[]) {
    const merged = new Map<string, TermSource & { aliases: string[]; implies: string[] }>()
    // A name that is already a term's name or alias joins that term ("Go" → golang, "k8s" → kubernetes).
    const named = new Map<string, string>()
    for (const s of sources) {
      const token = s.token ?? named.get(s.name.toLowerCase()) ?? toToken(s.name)
      for (const phrase of [s.name, ...(s.aliases ?? [])]) if (!named.has(phrase.toLowerCase())) named.set(phrase.toLowerCase(), token)
      const existing = merged.get(token)
      if (existing) {
        existing.aliases.push(...(s.aliases ?? []))
        existing.implies.push(...(s.implies ?? []))
        // Any strong source makes the term strong.
        if (!s.weak) existing.weak = false
      } else merged.set(token, { ...s, token, aliases: [...(s.aliases ?? [])], implies: [...(s.implies ?? [])] })
    }

    const tokenOf = (name: string) => {
      const direct = merged.get(toToken(name))
      if (direct) return direct.token
      for (const s of merged.values()) if (s.name.toLowerCase() === name.toLowerCase()) return s.token
      return toToken(name)
    }

    for (const s of merged.values()) {
      const term: Term = { name: s.name, token: s.token!, implies: [], listed: s.listed ?? true, weak: s.weak ?? false, category: s.category }
      this.byToken.set(term.token, term)
      // A term with its own token (Go) is matched by its aliases only; its name is an everyday word.
      for (const phrase of [...(s.token && s.token !== toToken(s.name) ? [] : [s.name]), ...s.aliases]) this.phrases.set(phrase.toLowerCase(), term.token)
    }

    // Resolve implications transitively (SignalR → ASP.NET Core → .NET).
    for (const s of merged.values()) {
      const seen = new Set<string>()
      const stack = s.implies.map(tokenOf)
      while (stack.length) {
        const t = stack.pop()!
        if (seen.has(t) || t === s.token) continue
        seen.add(t)
        stack.push(...(merged.get(t)?.implies.map(tokenOf) ?? []))
      }
      this.byToken.get(s.token!)!.implies = [...seen]
    }

    this.terms = [...this.byToken.values()]
    // Longest first, so "asp.net core" wins over ".net" and "azure devops" over "azure".
    const alternation = [...this.phrases.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')
    this.phraseRe = new RegExp(`(?<![\\p{L}\\p{N}_.#+/])(?:${alternation})(?!${WORD})`, 'gu')
  }

  term(token: string) {
    return this.byToken.get(token)
  }

  // The term a display name refers to, e.g. "GitHub Actions" → github_actions.
  termFor(name: string) {
    return this.termsIn(name)[0]
  }

  // Lowercases and folds every known name and alias into its token.
  normalize(text: string) {
    const lowered = text
      .replace(GO_CAPITALIZED, 'golang')
      .toLowerCase()
      .replace(GO_AFTER_CUE, '$1 golang')
      .replace(/[‘’]/g, "'")
      .replace(/'s\b/g, '')
    return lowered.replace(this.phraseRe, (m) => this.phrases.get(m) ?? m)
  }

  // Normalized tokens with stopwords removed. Keeps ".net", "c#", "ci/cd".
  tokenize(text: string) {
    return this.normalize(text)
      .split(/[^\p{L}\p{N}_#+./-]+/u)
      .map((t) => t.replace(/^\.+(?![a-z])|\.+$/g, ''))
      .flatMap((t) => (this.byToken.has(t) ? [t] : t.split(/[-/]/)))
      .filter((t) => t.length > 0 && !STOPWORDS.has(t) && !/^[.#+_]+$/.test(t))
  }

  // Known terms mentioned in the text, in order of appearance.
  termsIn(text: string): Term[] {
    const found: Term[] = []
    for (const token of this.tokenize(text)) {
      const term = this.byToken.get(token)
      if (term && !found.includes(term)) found.push(term)
    }
    return found
  }

  // A term plus everything it implies.
  expand(token: string) {
    return [token, ...(this.byToken.get(token)?.implies ?? [])]
  }
}
