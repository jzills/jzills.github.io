import { describe, expect, it } from 'vitest'
import { highlightGlsl } from './glsl'

const kinds = (source: string) => highlightGlsl(source).filter((t) => t.kind !== 'plain').map((t) => [t.kind, t.text])

describe('highlightGlsl', () => {
  it('round-trips the source', () => {
    const source = '#define AA 2\nuniform float u_time; // seconds\nvoid main() {\n  gl_FragColor = vec4(fract(1.5e-3), .5, 0.0, 1.0);\n}\n'
    expect(highlightGlsl(source).map((t) => t.text).join('')).toBe(source)
  })

  it('classifies the token kinds', () => {
    expect(kinds('#define PI 3.14\nuniform vec2 u_res; /* note */\nfloat sdf(vec3 p) { return length(p) - 1.0; }')).toEqual([
      ['preprocessor', '#define PI 3.14'],
      ['keyword', 'uniform'],
      ['type', 'vec2'],
      ['comment', '/* note */'],
      ['type', 'float'],
      ['function', 'sdf'],
      ['type', 'vec3'],
      ['keyword', 'return'],
      ['builtin', 'length'],
      ['number', '1.0'],
    ])
  })

  it('keeps numbers inside identifiers and swizzles as plain text', () => {
    expect(kinds('vec2 p2 = q.xy;')).toEqual([['type', 'vec2']])
  })

  it('highlights a preprocessor line only at the start of a line', () => {
    expect(kinds('  #ifdef GL_ES\nfloat a; // #not')).toEqual([
      ['preprocessor', '  #ifdef GL_ES'],
      ['type', 'float'],
      ['comment', '// #not'],
    ])
  })
})
