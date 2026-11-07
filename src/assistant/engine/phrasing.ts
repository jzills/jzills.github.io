// Small sentence-building helpers for the answer templates.

export const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)
export const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export const endSentence = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`)

export function joinList(items: string[]) {
  if (items.length <= 1) return items.join('')
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

export const link = (label: string, href: string) => `[${label}](${href})`

// Sentences end at . ! or ? followed by a space and a capital (or the end), so
// ".NET" and "ASP.NET Core" stay whole.
export const sentencesOf = (s: string) =>
  s
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-Z0-9“"([])/)
    .map((x) => x.trim())
    .filter(Boolean)

export const firstSentence = (s: string) => sentencesOf(s)[0] ?? s.trim()

function thirdPerson(verb: string) {
  if (/(s|sh|ch|x|z|o)$/.test(verb)) return `${verb}es`
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`
  return `${verb}s`
}

// Turns a resume bullet into the predicate of a "he …" sentence. Bullets for the
// current role are written in the base form ("Build and optimize …") and become
// present tense; past-role bullets ("Led …") keep their tense.
export function asPredicate(bullet: string, present: boolean) {
  const words = bullet.trim().split(/\s+/)
  const [first] = words
  if (!first || /^[A-Z0-9]{2,}/.test(first)) return bullet
  if (present && !/(ed|s)$/.test(first)) {
    words[0] = thirdPerson(first.toLowerCase())
    // "Build and optimize" → "builds and optimizes".
    if (words[1] === 'and' && words[2] && !/(ed|s|ing)$/.test(words[2])) words[2] = thirdPerson(words[2])
  } else words[0] = first.toLowerCase()
  return words.join(' ')
}

// Picks a phrasing variant, stable for a given question so answers are repeatable.
export function variant<T>(options: T[], seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  return options[Math.abs(h) % options.length]
}

export function editDistance(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}
