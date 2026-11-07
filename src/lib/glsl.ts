// A small GLSL highlighter for the lab's code view: enough to colour the
// shaders on the site, not a parser. Tokens concatenate back to the source.

export type TokenKind = 'comment' | 'preprocessor' | 'keyword' | 'type' | 'number' | 'builtin' | 'function' | 'plain'
export type Token = { kind: TokenKind; text: string }

const keywords = new Set([
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return', 'discard', 'struct',
  'uniform', 'attribute', 'varying', 'const', 'in', 'out', 'inout', 'precision',
  'highp', 'mediump', 'lowp', 'true', 'false',
])

const types = new Set([
  'void', 'bool', 'int', 'float',
  'vec2', 'vec3', 'vec4', 'bvec2', 'bvec3', 'bvec4', 'ivec2', 'ivec3', 'ivec4',
  'mat2', 'mat3', 'mat4', 'sampler2D', 'samplerCube',
])

const builtins = new Set([
  'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pow', 'exp', 'log',
  'exp2', 'log2', 'sqrt', 'inversesqrt', 'abs', 'sign', 'floor', 'ceil', 'fract', 'mod',
  'min', 'max', 'clamp', 'mix', 'step', 'smoothstep', 'length', 'distance', 'dot', 'cross',
  'normalize', 'faceforward', 'reflect', 'refract', 'matrixCompMult', 'lessThan',
  'lessThanEqual', 'greaterThan', 'greaterThanEqual', 'equal', 'notEqual', 'any', 'all',
  'not', 'texture2D', 'textureCube', 'dFdx', 'dFdy', 'fwidth',
  'gl_FragColor', 'gl_FragCoord', 'gl_Position',
])

// One alternative per token class, tried in order at each position.
const pattern = new RegExp(
  [
    String.raw`(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))`, // comment
    String.raw`(^[ \t]*#[^\n]*)`, // preprocessor line
    String.raw`(\b(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?\b|\.\d+\b)`, // number
    String.raw`([A-Za-z_]\w*)`, // identifier
  ].join('|'),
  'gm',
)

export function highlightGlsl(source: string): Token[] {
  const tokens: Token[] = []
  const push = (kind: TokenKind, text: string) => {
    const last = tokens[tokens.length - 1]
    if (kind === 'plain' && last?.kind === 'plain') last.text += text
    else if (text) tokens.push({ kind, text })
  }

  let at = 0
  for (const match of source.matchAll(pattern)) {
    const index = match.index
    push('plain', source.slice(at, index))
    const [text, comment, preprocessor, number, word] = match
    if (comment) push('comment', text)
    else if (preprocessor) push('preprocessor', text)
    else if (number) push('number', text)
    else if (word) {
      if (keywords.has(word)) push('keyword', word)
      else if (types.has(word)) push('type', word)
      else if (builtins.has(word)) push('builtin', word)
      else if (/^\s*\(/.test(source.slice(index + word.length))) push('function', word)
      else push('plain', word)
    }
    at = index + text.length
  }
  push('plain', source.slice(at))
  return tokens
}
