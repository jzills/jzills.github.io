import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { OSS_URL } from '@/lib/pages'
import { Projects } from '@/components/sections/Projects'
import { Footer } from '@/components/layout/Footer'

const text = (html: string) => html.replace(/<[^>]+>/g, '')

// The full open-source catalogue lives at oss.zills.io; the Projects section shows a selection.
describe('links to oss.zills.io', () => {
  it('names the catalogue', () => {
    expect(OSS_URL).toBe('https://oss.zills.io/')
  })

  it('ends the Projects section with "All open source"', () => {
    const html = renderToString(createElement(Projects))
    expect(html).toMatch(new RegExp(`<a[^>]*href="${OSS_URL}"[^>]*>All open source`))
  })

  it('lists it in the footer\'s Projects column instead of the GitHub repositories tab', () => {
    const html = renderToString(createElement(Footer))
    expect(html).toMatch(new RegExp(`<a[^>]*href="${OSS_URL}"[^>]*>All open source</a>`))
    expect(text(html)).not.toContain('All repositories')
  })
})
