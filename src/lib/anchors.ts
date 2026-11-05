// Element ids that search results scroll to. Kept apart from the search index
// so pages can build them without pulling the index into their bundle.

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Anchor id of a creative item's card on the lab page.
export const labId = (title: string) => `lab-${slug(title)}`
