# Portfolio assistant knowledge base

The chat widget answers only from this knowledge base. It has two layers:

| Layer | Where | What it holds |
| --- | --- | --- |
| **Site** | `src/data/*.ts`, `src/data/generated/readmes.json` | Everything the page already shows: roles, skills, projects, README sections, the About text. Built into entries by `src/assistant/knowledge/site.ts`. |
| **Extra** | `src/assistant/knowledge/entries/**/*.md` | Hand-written entries for what the page doesn't show: education, certifications, recruiter FAQs, deeper project notes. |

Both layers are merged and validated when the assistant loads, and by `npm test`, which the deploy workflow runs before building. A malformed entry fails the deploy with a message naming the file and the problem.

## Updating what the site already shows

Edit the site data as usual. The assistant follows automatically:

- **A new or changed role:** `src/data/experience.ts`. The first role is treated as current. Write the current role's bullets in the base form ("Build and optimize …") and past roles in the past tense ("Led …"). The assistant turns them into "he builds and optimizes …" / "he led …".
- **A new skill:** `src/data/skills.ts`.
- **A new project:** `src/data/projects.ts`. Its README is fetched by `npm run fetch-readmes` (part of every build) and each README section becomes a `project-doc` entry.
- **About text, headline, contact links:** `src/data/profile.ts`.

## Adding extra entries

Create a Markdown file anywhere under `src/assistant/knowledge/entries/`. No code changes are needed; every `.md` file there is picked up. The angle-bracket text below stands in for real content.

```md
---
id: faq/leadership
type: faq
title: Leadership and collaboration
questions: [Has he led teams?, How does he work with other teams?]
tags: [leadership, collaboration, mentoring]
keywords: [lead, mentor, stakeholders, cross-functional]
related: [experience/new-american-funding]
links:
  - Experience | #experience
---
<One or two sentences, third person: what he did and where.>

- <A supporting fact that stands on its own.>
- <Another one.>

> <Something Joshua said or wrote, in his own words.>

## <A detail section heading>
<Its text.>
```

### Body

| Part | Becomes | Used for |
| --- | --- | --- |
| Text before any list or heading | `summary` | The opening line of answers that use the entry. |
| `- bullet` lines | `facts` | Supporting statements. Each should stand alone. |
| `> quote` lines | `quotes` | Joshua's own words, always shown in quotation marks and attributed to him. |
| `## Heading` and the text under it | `sections` | Named details such as Architecture, Features, Decisions. Project questions about an aspect ("what's its architecture?") pick the matching section. |

Write summaries and facts in the **third person** ("He led …"). Use quotes for first-person text.

### Front matter

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Unique. Convention: `type/slug`, e.g. `faq/leadership`. |
| `type` | yes | `overview`, `experience`, `skill`, `project`, `project-doc`, `education`, `certification`, `faq`, `contact`. |
| `title` | yes | Shown as the source label for most types. |
| `questions` | FAQ only | The questions the entry answers, in a few phrasings. Heavily weighted in search. |
| `tags`, `keywords`, `technologies` | no | Searchable terms. `keywords` holds synonyms and alternate phrasings and is never shown. |
| `related` | no | Ids of related entries. Every id must exist. |
| `links` | no | `Label \| URL` per line. URLs must be `https://`, `mailto:` or a `#section` anchor on the home page. |
| `anchor` | no | The home-page section the entry lives at, e.g. `#experience`. Source chips link here. |
| `placeholder` | no | `true` marks a gap. See below. |
| `company`, `role`, `period` | experience | e.g. `period: 2015 – 2018`. "Present" marks it current. |
| `category`, `level` | skill | |
| `project`, `github`, `docs` | project | |

### Adding to an existing entry

To add detail to something the site already has, such as architecture notes for a project, extend it instead of repeating it:

```md
---
extends: project/hmac-manager
keywords: [request signing library]
---
- A fact appended to the project's facts.

## Architecture
Appended as a named section.
```

Facts, quotes, sections, tags, keywords, technologies, related ids and links are appended to the target entry. Site entry ids follow the data: `experience/<company-slug>`, `project/<name>`, `skill/<name-slug>`, `project-doc/<project>/<heading-slug>`, `overview/summary`, `contact/links`.

## Placeholders

`placeholder: true` marks information that is known to be missing, such as education. Placeholders are validated but **never indexed or used in answers**. Until one is filled in, the assistant says the portfolio doesn't list that information. To publish one, replace its body with real content and delete the `placeholder: true` line.

Seeded placeholders:

- `education/education.md`
- `education/certifications.md`
- `faq/leadership.md`
- `faq/work-preferences.md`

Never fill a placeholder with guesses. The assistant presents everything in the knowledge base as fact.

## Vocabulary: synonyms and related terms

`src/assistant/knowledge/vocabulary.ts` holds what the assistant knows about technology names:

- **`terms`:** aliases (`k8s` → Kubernetes, `dotnet` → .NET) and definitional implications (a SignalR project is evidence of ASP.NET Core and .NET work). Keep implications definitional. "Helm implies Kubernetes" is fine; "people who know Kubernetes usually know Docker" is not, because the assistant would present it as fact.
- **`categories`:** the groups visitors ask about ("cloud", "DevOps", "databases"). An answer lists only the members the knowledge base has evidence for.
- **`unlistedTerms`:** technologies the portfolio doesn't cover (AWS, Java, …). A question about one gets a clear "his portfolio doesn't mention it" instead of loosely related matches. If Joshua picks one up, remove it from this list and add it to the site data.

Every skill, project tag and project keyword on the site becomes a term automatically. Add a term here only to give it aliases or implications.

## How answers are built

1. **Normalize** (`src/assistant/text.ts`): lowercase, fold aliases into one token, keep `.net` / `c#` / `ci/cd` whole, drop stopwords.
2. **Classify** (`src/assistant/engine/intent.ts`): pick the answer's shape: a technology question, a project, the current role, a category, a fit question and so on. The patterns only choose the template; the content always comes from retrieval, so phrasings nobody wrote a pattern for still get searched.
3. **Retrieve** (`src/assistant/engine/retrieval.ts`): MiniSearch over every field, with boosts (titles and technologies first), prefix matching and typo tolerance. Placeholders are excluded.
4. **Compose** (`src/assistant/engine/assistant.ts`): collect the statements that mention the subject, strongest first (roles, then projects, then docs), phrase them with templates, de-duplicate, attach source chips and follow-up suggestions.

Every answer carries a support level, which the widget shows:

| Support | Meaning |
| --- | --- |
| `supported` | Backed by explicit statements in the knowledge base. |
| `related` | Nearby information that doesn't settle the question (e.g. leadership inferred from "led Kubernetes adoption" is shown as related, not as a claim). |
| `unavailable` | The knowledge base doesn't cover it. The answer says so and suggests asking Joshua directly. |
| `clarify` | Matches were too weak to trust. The answer asks for a rephrase and suggests questions. |

Follow-ups use a small, serializable conversation context: "what about Azure?" reuses the previous question with a new subject, "what are its features?" reuses the previous project, and "tell me more" continues the previous topic without repeating what was already shown.

## Testing changes

```sh
npm test                 # validation, engine and recruiter-question suites
npm run test:watch       # while editing entries
```

`src/assistant/recruiter.test.ts` asks representative recruiter questions of the real knowledge base and checks which entries come back. When you change content, update its expectations if the right answer changed.
