// Fills each built page's empty #root with its server-rendered markup, so
// crawlers and link previews read the content without running JavaScript.
// Runs after the client build and the SSR build of src/entry-server.tsx.
//
//   node scripts/prerender.ts

import { readFile, rm, writeFile } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const ssr = new URL('../dist-ssr/', import.meta.url)

const { paths, render } = await import(new URL('entry-server.js', ssr).href)

const EMPTY_ROOT = '<div id="root"></div>'

for (const path of paths as string[]) {
  const file = new URL(`.${path}index.html`, dist)
  const html = await readFile(file, 'utf8')
  if (!html.includes(EMPTY_ROOT)) throw new Error(`prerender: no empty #root in ${file.pathname}`)
  const markup = render(path) as string
  await writeFile(file, html.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`))
  console.log(`prerender: ${path} (${(markup.length / 1024).toFixed(1)} kB)`)
}

await rm(ssr, { recursive: true, force: true })
