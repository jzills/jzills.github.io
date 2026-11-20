import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Footer } from '@/components/layout/Footer'

// The family footer: the Z/LLS mark with the copyright under it, and a visible link back to the hub.
describe('Footer mark', () => {
  const html = renderToString(createElement(Footer))
  const text = html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')

  it('shows the Z/LLS mark as plain text, not a link', () => {
    expect(html).toMatch(/<span[^>]*>Z<span[^>]*>\/<\/span>LLS<\/span>/)
    expect(text).not.toContain('ZILLS')
  })

  it('links back to zills.io by its domain, right beside the mark, with the copyright under them', () => {
    expect(html).toMatch(/<a[^>]*href="https:\/\/zills\.io\/"[^>]*>zills\.io <span aria-hidden="true">↗<\/span><\/a>/)
    expect(text).toMatch(/Z\/LLSzills\.io ↗© \d{4} Joshua Zillwood/)
  })
})
