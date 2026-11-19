import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import redirectPage from '../../public/lab/index.html?raw'
import { LAB_URL, labPieceUrl } from '@/lib/pages'
import { search } from '@/lib/searchIndex'
import { paths } from '@/entry-server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

// The Lab moved out to its own site; j.zills.io links there and keeps /lab/ only as a redirect.
describe('the Lab lives at lab.zills.io', () => {
  it('names the new site and its piece pages', () => {
    expect(LAB_URL).toBe('https://lab.zills.io/')
    expect(labPieceUrl('Electric Railway to Nowhere-Ville')).toBe('https://lab.zills.io/electric-railway-to-nowhere-ville/')
  })

  it('sends search results for Lab pieces to their pages there', () => {
    const creative = search('shader', 100).map((r) => r.record).filter((r) => r.kind === 'Creative')
    expect(creative.length).toBeGreaterThan(0)
    for (const r of creative) expect(r.href).toBe(labPieceUrl(r.title))
  })

  it('no longer prerenders a Lab page here', () => {
    expect(paths).toEqual(['/'])
  })

  it('links the nav and footer to the new site, never to /lab/', () => {
    for (const html of [renderToString(createElement(Navigation)), renderToString(createElement(Footer))]) {
      expect(html).toContain(`href="${LAB_URL}"`)
      expect(html).not.toContain('href="/lab/"')
    }
  })
})

describe('the /lab/ redirect page', () => {
  const script = redirectPage.match(/<script>([\s\S]*?)<\/script>/)![1]
  const follow = (hash: string) => {
    const location = { hash, replace: (to: string) => (target = to) }
    let target = ''
    new Function('location', script)(location)
    return target
  }

  it('falls back to the new Lab without JavaScript', () => {
    expect(redirectPage).toContain('<meta http-equiv="refresh" content="0; url=https://lab.zills.io/">')
    expect(redirectPage).toContain('<link rel="canonical" href="https://lab.zills.io/">')
  })

  it('sends an old #lab-<piece> link to that piece', () => {
    expect(follow('#lab-spiral-tunnel')).toBe('https://lab.zills.io/spiral-tunnel/')
  })

  it('sends anything else to the Lab home', () => {
    expect(follow('')).toBe('https://lab.zills.io/')
    expect(follow('#somewhere')).toBe('https://lab.zills.io/')
    expect(follow('#lab-../../evil')).toBe('https://lab.zills.io/')
  })
})
