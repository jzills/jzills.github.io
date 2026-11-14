import { describe, expect, it } from 'vitest'
import { skillGroups } from './skills'
import { skillIcons } from './skillIcons'

describe('skill icons', () => {
  it('gives every listed skill its own icon', () => {
    const missing = skillGroups.flatMap((g) => g.skills).filter((skill) => !skillIcons[skill])
    expect(missing).toEqual([])
  })

  it('leaves out colours too dark for the dark theme', () => {
    for (const { color } of Object.values(skillIcons)) {
      if (!color) continue
      const n = parseInt(color.slice(1), 16)
      const luminance = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
      expect(luminance).toBeGreaterThanOrEqual(0.2)
    }
  })
})
