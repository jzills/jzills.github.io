import { describe, expect, it } from 'vitest'
import favicon from '../../public/favicon.svg?raw'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Footer } from '@/components/layout/Footer'

// The family footer: the Z/LLS mark with the copyright under it, and a visible link back to the hub.
describe('Footer mark', () => {
  const html = renderToString(createElement(Footer))
  const text = html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')

  it('links the Z/LLS mark to zills.io', () => {
    expect(html).toMatch(/<a[^>]*href="https:\/\/zills\.io\/"[^>]*>z<span[^>]*><\/span><span[^>]*>\/\/<\/span>s<\/a>/)
    expect(html).toMatch(/<span[^>]*class="[^"]*bg-accent[^"]*"[^>]*><\/span><span[^>]*>\/\/<\/span>/)
  })

  it('links back to zills.io by its domain, right beside the mark, with the copyright under them', () => {
    expect(html).toMatch(/<a[^>]*href="https:\/\/zills\.io\/"[^>]*>zills\.io <span aria-hidden="true">↗<\/span><\/a>/)
    expect(text).toMatch(/z\/\/szills\.io ↗$/)
    expect(text).not.toContain('©')
  })

  it('leaves contact to the Contact section and the More column, with no repeat row', () => {
    expect(text).not.toContain("Let's connect")
    expect(html).not.toContain('href="mailto:')
  })
})

describe('favicon', () => {
  // The family favicon: a bold z drawn as a shape (favicons can't load web fonts) and the site's dot.
  it('is the z. symbol with this site\'s dot', () => {
    expect(favicon).toMatch(/<path[^>]*d="[^"]+"/)
    expect(favicon).not.toContain('<text')
    expect(favicon).toMatch(/<circle[^>]*fill="#22d3ee"/)
  })
})
