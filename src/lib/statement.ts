// The hero sets its statement in two tones: the lead in full colour, the rest muted.
// Splits at the first comma, which stays on the lead.
export function splitStatement(text: string): { lead: string; rest: string } {
  const at = text.indexOf(',')
  if (at === -1) return { lead: text, rest: '' }
  return { lead: text.slice(0, at + 1), rest: text.slice(at + 1).trim() }
}
