import { describe, expect, it } from 'vitest'
import lightboxSource from '@/components/ui/Lightbox.tsx?raw'
import { creativeItems } from './creative'

describe('lab items in the lightbox', () => {
  // The lightbox caption has a fixed height (three lines on a phone), so the whole lightbox fits the
  // screen without scrolling. 110 characters fits three lines on a 375px-wide phone with room to spare.
  it('keeps descriptions short enough for the lightbox caption', () => {
    const tooLong = creativeItems.filter((item) => item.description.length > 110).map((item) => `${item.title} (${item.description.length})`)
    expect(tooLong).toEqual([])
  })

  // Safari's vh is the screen height with its toolbars hidden, so vh sizes overflow the screen while
  // they show. The lightbox sizes itself with dvh (see .lightbox in index.css).
  it('sizes the lightbox with dvh, not vh', () => {
    expect(lightboxSource).toContain('--lb-media-h')
    expect(lightboxSource.match(/\d+vh\b/g) ?? []).toEqual([])
  })
})
