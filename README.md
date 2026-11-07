# jzills.github.io

Joshua Zillwood's portfolio: a static React + TypeScript site built with Vite, prerendered at build time and hosted on GitHub Pages.

## Setup

```sh
npm ci
npm run dev        # http://localhost:5173
```

Node 24 (as in CI).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload. |
| `npm run build` | Fetches project READMEs, type-checks, builds the client and SSR bundles, then prerenders each page into `dist/`. |
| `npm run preview` | Serves `dist/` locally. |
| `npm test` | Runs the unit tests (Vitest), including knowledge base validation. |
| `npm run lint` | ESLint. |

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: install, test, build, then publish `dist/` to GitHub Pages. The workflow also runs weekly so the site search and the assistant pick up README changes in the project repos.

## Structure

```
src/
  data/                 Site content: experience, projects, skills, profile, lab items
  components/           Page sections, layout, UI primitives
    assistant/          The chat widget (launcher, panel, link rendering)
  assistant/            The portfolio assistant's engine and knowledge base
    knowledge/          Schema, site adapters, Markdown entries, vocabulary
    engine/             Intent detection, retrieval (MiniSearch), answer composition
  pages/                The /lab page
  lib/                  Search index, theme, page helpers
scripts/                README fetcher and prerenderer
docs/                   Project documentation
```

## Portfolio assistant

A floating chat widget that answers recruiter questions about Joshua's experience, skills, career and open-source projects. It runs entirely in the browser:

- **No backend, API, LLM or keys.** Answers come from a local knowledge base, searched with [MiniSearch](https://github.com/lucaong/minisearch) and phrased with templates.
- **Grounded.** It only states what the knowledge base says, labels partial matches as such, and says plainly when something isn't covered.
- **Loaded on demand.** The engine and knowledge base are a separate chunk (about 27 kB gzipped), fetched when a visitor first reaches for the launcher.

The knowledge base reuses the site's own data, so updating a role or project updates the assistant too. Anything the site doesn't show goes in Markdown files under `src/assistant/knowledge/entries/`.

See **[docs/assistant-knowledge-base.md](docs/assistant-knowledge-base.md)** for the schema, how to add and update entries, placeholders, synonyms, and how answers are built.
