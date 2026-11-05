// Fetches each project's README and splits it into heading sections for the
// site search. Run before every build; on a failed fetch the committed copy of
// the output is kept so an offline or rate-limited build still succeeds.
//
//   node scripts/fetch-readmes.ts

import { readFile, writeFile } from 'node:fs/promises'
import { projects } from '../src/data/projects.ts'

export interface ReadmeSection {
  project: string
  heading: string
  body: string
  url: string
}

const OUT = new URL('../src/data/generated/readmes.json', import.meta.url)

// Sections that only add noise to search results.
const SKIP = /^(license|contributing|table of contents|contents)$/i

// Markdown down to plain prose: fenced code, HTML, images and badges go;
// links and emphasis keep their text.
function plain(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>|#]/g, ' ')
    .replace(/^\s*[-+]\s+/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// A heading's rendered text: inline code and emphasis markers dropped outright.
const headingText = (md: string) =>
  md.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').trim()

// GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens.
const anchor = (heading: string) =>
  headingText(heading).toLowerCase().replace(/[^\p{L}\p{N}\- ]/gu, '').replace(/ /g, '-')

function sections(project: string, githubUrl: string, md: string): ReadmeSection[] {
  const out: ReadmeSection[] = []
  // Split on h2/h3 lines that sit outside fenced code.
  const lines = md.split('\n')
  let heading: string | null = null
  let buf: string[] = []
  let fenced = false
  const flush = () => {
    if (heading && !SKIP.test(headingText(heading))) {
      const body = plain(buf.join('\n'))
      if (body) out.push({ project, heading: headingText(heading), body, url: `${githubUrl}#${anchor(heading)}` })
    }
    buf = []
  }
  for (const line of lines) {
    if (line.startsWith('```')) fenced = !fenced
    const m = !fenced && /^#{2,3}\s+(.+?)\s*#*\s*$/.exec(line)
    if (m) {
      flush()
      heading = m[1]
    } else {
      buf.push(line)
    }
  }
  flush()
  return out
}

async function fetchReadme(githubUrl: string) {
  const repo = new URL(githubUrl).pathname.replace(/^\/|\/$/g, '')
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/README.md`)
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status}`)
  return res.text()
}

try {
  const all = await Promise.all(
    projects.map(async (p) => sections(p.name, p.githubUrl, await fetchReadme(p.githubUrl))),
  )
  const json = JSON.stringify(all.flat(), null, 2) + '\n'
  await writeFile(OUT, json)
  console.log(`fetch-readmes: wrote ${all.flat().length} sections from ${projects.length} READMEs`)
} catch (err) {
  await readFile(OUT) // No committed copy to fall back on: fail the build.
  console.warn(`fetch-readmes: ${(err as Error).message}; keeping the committed copy`)
}
