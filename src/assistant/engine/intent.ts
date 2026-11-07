import type { CategoryDefinition } from '../knowledge/vocabulary'
import type { KnowledgeEntry } from '../knowledge/types'
import { STOPWORDS } from '../text'
import type { Normalizer, Term } from '../text'

// Classifies a question by what kind of answer it wants. The patterns pick the
// answer's shape; what goes in it always comes from retrieval, so phrasings
// nobody wrote a pattern for still get answered by search.

export type Intent =
  | 'greeting'
  | 'thanks'
  | 'help'
  | 'more'
  | 'contact'
  | 'personal'
  | 'education'
  | 'certifications'
  | 'years'
  | 'current_role'
  | 'career'
  | 'fit'
  | 'leadership'
  | 'background'
  | 'projects'
  | 'project_detail'
  | 'skills'
  | 'tech'
  | 'search'

export type Aspect = 'features' | 'architecture' | 'install' | 'technologies' | 'why'

export interface ParsedQuestion {
  raw: string
  intent: Intent
  // Technologies the knowledge base covers that the question names.
  subjects: Term[]
  // Technologies named that the knowledge base deliberately doesn't cover (AWS, Java, …).
  unlisted: Term[]
  // A subject the vocabulary doesn't know at all, as the visitor wrote it.
  unknownSubject?: string
  // Set when a misspelling was read as a known term, so the answer can say so.
  corrected?: string
  categories: CategoryDefinition[]
  projects: KnowledgeEntry[]
  aspect?: Aspect
  // For "what makes him a good X": the role X, as a term token where there is one.
  role?: string
  // Refers back to the previous answer ("it", "that project", "what about…").
  refersBack: boolean
  shifts: boolean
}

export interface Lexicon {
  text: Normalizer
  categories: CategoryDefinition[]
  projects: KnowledgeEntry[]
}

const RULES: [Intent, RegExp][] = [
  ['greeting', /^(hi|hello|hey|hiya|yo|howdy|greetings|good (morning|afternoon|evening))\b[\s\w]{0,12}[!.?]*$/],
  ['thanks', /^(thanks|thank you|thx|ty|cheers|great|awesome|perfect|cool|nice|got it|ok(ay)?)\b[\s\w!.]{0,16}$/],
  ['help', /\b(what can (you|i) (do|ask)|how does this work|who are you|what are you|what do you know)\b|^(help|\?+)[\s!.?]*$/],
  ['more', /^(tell me more|more|go on|continue|elaborate|anything else|what else|more details?|keep going)\b[\s\w]{0,20}[?.!]*$|\b(tell me more|more about (that|it|this|them)|go deeper)\b/],
  ['contact', /\b(contact|reach (him|out)|get in touch|e-?mail|linkedin|resume|cv|phone|connect with|hire him|message him)\b/],
  [
    'personal',
    /\b(salary|pay|compensation|hourly rate|how old|age|married|wife|husband|kids|children|family|visa|sponsorship|citizen\w*|relocat\w*|remote|hybrid|on-?site|(?<!high )availab\w*|notice period|start date|open to (new )?(roles|opportunities|work|offers)|looking for (a )?(new )?(job|role|work)|job hunting|hobbies|religio\w*|politic\w*)\b/,
  ],
  ['education', /\b(education|degree|university|college|school|studied|study|major(ed)?|graduat\w*|bachelor\w*|master'?s|phd|bootcamp|academic)\b/],
  ['certifications', /\b(certif\w*|certs?|credentials?)\b/],
  ['years', /\b(how (many|long)|years of|yoe|how much experience|how senior|seniority)\b/],
  [
    'current_role',
    /\b(current(ly)?|right now|nowadays|these days|at present|today)\b.*\b(role|job|position|title|work\w*|doing|company|employer)\b|\b(role|job|position|title|company|employer)\b.*\b(current(ly)?|now)\b|\bwhere does he work\b|\bwho does he work for\b|\bwhat does he do\b/,
  ],
  ['career', /\b(career|work history|employment|previous (jobs|roles|companies|employers|positions)|past (jobs|roles|positions)|where has he worked|companies|employers|progression|jobs|roles has he|positions)\b/],
  [
    'fit',
    /\b(what makes him|why (should|would|might) (we|i|you|anyone|someone|a company) (hire|consider|choose)|why hire|good fit|great fit|right fit|strong (candidate|fit)|strengths?|stand out|stands out|qualif\w+|good (at|platform|devops|software|engineer|candidate|developer)|great (platform|devops|software|engineer|developer|candidate)|best at|why him)\b/,
  ],
  ['leadership', /\b(lead(er|ers|ership|s|ing)?|led|mentor\w*|manage(d|r|rs|s|ment)?|teamwork|team player|collaborat\w*|stakeholders?|cross-functional|soft skills|communicat\w*|work with (other )?teams)\b/],
  ['background', /\b(background|summary|summarize|overview|about him|who is (he|joshua)|tell me about (him|joshua)|introduce|introduction|bio|profile|speciali[sz]\w*|focus|expertise|elevator pitch)\b|^(who|what) is (joshua|he)\b/],
  ['projects', /\b(open[- ]?source|projects?|repos|repositories|side projects?|oss|github|packages|libraries he|tools he (built|made|wrote)|what has he built|has he built|did he build|portfolio)\b/],
]

const ASPECTS: [Aspect, RegExp][] = [
  ['why', /\b(why|problem|problems|motivation|purpose|decision|decisions|instead of|compared|versus|vs\.?)\b/],
  ['architecture', /\b(architect\w*|design(ed)?|how does it work|how it works|under the hood|internals|structure|works internally)\b/],
  ['install', /\b(install\w*|set ?up|get started|getting started|quickstart|how (do|can) i use|usage)\b/],
  ['features', /\b(features?|capabilit\w*|what (can|does) it do|what it does|functionality|commands?)\b/],
  ['technologies', /\b(tech(nolog(y|ies))?|stack|built (with|in|using)|written in|languages?|made with)\b/],
]

const SKILLS_CUE = /\b(skills?|tech(nical)? stack|stack|technologies|tools|toolbox|toolkit|proficien\w*|strongest|what does he (use|know)|what can he)\b/
const TECH_CUE = /\b(experience|experienced|worked|work|familiar|know|knows|knowledge|used|use|uses|using|skilled|proficient|background in|expert|expertise|done|built|written|wrote)\b|^(does|has|is|can|did) he\b/
const UNKNOWN_AFTER_CUE = /\b(?:with|in|of|know|knows|use|uses|used|using|about|on)\s+(?:his\s+|the\s+|any\s+)?([\w.#+/ -]{2,40}?)\s*(?:experience|skills?|work)?\s*[?.!]*$/
const REFERS_BACK = /\b(it|its|that|this|those|these|them|there|that project|that role|the project|the role|same)\b/
const SHIFT = /^(what|how) about\b|^and\b|^also\b|^what of\b|^same (for|with)\b/

const ROLES: [string, RegExp][] = [
  ['platform_engineering', /\bplatform\b/],
  ['devops', /\bdevops\b|\bsre\b|\bsite reliability\b/],
  ['data', /\bdata\b/],
  ['.net', /(\.net|dotnet|c#)/],
  ['ai', /\bai\b/],
  ['cloud', /\bcloud\b/],
  ['software', /\b(software|backend|back-end|full[- ]?stack|developer|programmer)\b/],
]

// Words that are terms only because a project lists them as keywords.
const GENERIC = new Set(['skills', 'plugins', 'plugin', 'agents', 'workflow', 'api', 'terminal'])

const hasPhrase = (text: string, phrase: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}_])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'u').test(text)

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// The name as written, with spaces or run together, plus any keyword that is just
// another spelling of it ("HmacManager", "widget ctl").
const nameForms = (p: KnowledgeEntry) => {
  const name = p.title.toLowerCase()
  const respellings = p.keywords.filter((k) => compact(k) === compact(name)).map((k) => k.toLowerCase())
  return [...new Set([name, name.replace(/-/g, ' '), name.replace(/-/g, ''), ...respellings])]
}

function findProjects(q: string, projects: KnowledgeEntry[]) {
  return projects.filter((p) => {
    const name = p.title.toLowerCase()
    if (nameForms(p).some((f) => hasPhrase(q, f))) return true
    // Long names ("serilog-sinks-aspnetcore-app-signalr") match on two distinctive parts.
    const parts = name.split('-').filter((part) => part.length > 3)
    // "sink" finds "sinks".
    return parts.length >= 3 && parts.filter((part) => hasPhrase(q, part) || hasPhrase(q, part.replace(/s$/, ''))).length >= 2
  })
}

export function parseQuestion(raw: string, { text, categories, projects }: Lexicon): ParsedQuestion {
  const q = raw.toLowerCase().replace(/[‘’]/g, "'").trim()
  const normalized = text.normalize(raw)
  // The rules read the question with multi-word names folded away, so "GitHub
  // Actions" doesn't look like a question about GitHub projects.
  let plain = normalized.replace(/[\w.#+]*_[\w.#+_]*/g, (t) => (t === 'platform_engineering' ? 'platform engineer' : 'TERM'))

  const categoriesFound = categories.filter((c) => c.aliases.some((a) => hasPhrase(normalized, a)))
  const categoryTokens = new Set(categoriesFound.flatMap((c) => c.aliases.map((a) => a.replace(/\s+/g, '_'))))
  const named = findProjects(q, projects)
  // Project names can contain rule words ("hmac-manager" is not about managing).
  for (const p of named) for (const form of nameForms(p)) plain = plain.split(form).join('PROJECT')
  const projectTokens = new Set(named.flatMap((p) => text.tokenize(p.title)))

  const mentioned = text.termsIn(raw).filter((t) => !categoryTokens.has(t.token) && !projectTokens.has(t.token))
  const listed = mentioned.filter((t) => t.listed)
  const strong = listed.filter((t) => !t.weak)
  // Generic project keywords ("Middleware") only become the subject when nothing more specific is named.
  const subjects = strong.length ? strong : listed.filter((t) => !GENERIC.has(t.token))
  const unlisted = mentioned.filter((t) => !t.listed)

  let intent: Intent = RULES.find(([, re]) => re.test(plain))?.[0] ?? 'search'
  // A named project or technology narrows the broad intents.
  if (named.length && (intent === 'projects' || intent === 'search' || intent === 'background' || intent === 'fit')) intent = 'project_detail'
  if (intent === 'fit' && subjects.length && !ROLES.some(([, re]) => re.test(plain))) intent = 'tech'
  // "Did he lead the Kubernetes rollout?", "managed Kubernetes", "cron jobs": the technology is the topic.
  if ((intent === 'leadership' || intent === 'career') && (subjects.length || unlisted.length)) intent = 'tech'
  if (intent === 'search' || intent === 'background') {
    if (categoriesFound.length) intent = 'skills'
    else if (subjects.length || unlisted.length) intent = 'tech'
    else if (SKILLS_CUE.test(q)) intent = 'skills'
  }
  if (intent === 'skills' && subjects.length && !categoriesFound.length) intent = 'tech'
  if (intent === 'years' && (subjects.length || unlisted.length)) intent = 'tech'

  let unknownSubject: string | undefined
  if ((intent === 'search' || intent === 'tech') && !subjects.length && !unlisted.length && !named.length && TECH_CUE.test(q)) {
    const m = q.match(UNKNOWN_AFTER_CUE)
    const words = m?.[1].split(/\s+/).filter((w) => w && !STOPWORDS.has(w))
    if (words?.length && words.length <= 3 && !categoriesFound.length) {
      unknownSubject = words.join(' ')
      intent = 'tech'
    }
  }

  const role = intent === 'fit' ? ROLES.find(([, re]) => re.test(plain))?.[0] : undefined

  return {
    raw,
    intent,
    subjects,
    unlisted,
    unknownSubject,
    categories: categoriesFound,
    projects: named,
    aspect: ASPECTS.find(([, re]) => re.test(plain))?.[0],
    role,
    refersBack: REFERS_BACK.test(plain),
    shifts: SHIFT.test(plain),
  }
}
