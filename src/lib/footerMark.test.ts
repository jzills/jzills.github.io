import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Footer } from '@/components/layout/Footer'

// The family footer: the Z/LLS mark links back to the zills.io hub, with the copyright under it.
describe('Footer mark', () => {
  const html = renderToString(createElement(Footer))
  const text = html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')

  it('shows the Z/LLS mark, linked to zills.io', () => {
    expect(html).toMatch(/<a[^>]*href="https:\/\/zills\.io\/"[^>]*>Z<span[^>]*>\/<\/span>LLS<\/a>/)
    expect(text).not.toContain('ZILLS')
  })

  it('puts the copyright under it', () => {
    expect(text).toMatch(/Z\/LLS© \d{4} Joshua Zillwood/)
  })
})
