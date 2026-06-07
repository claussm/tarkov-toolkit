const WIKI_BASE = 'https://escapefromtarkov.fandom.com/wiki'

// HideoutStation has no wikiLink in the API, so deep-link to the Hideout page with a
// best-effort section anchor (falls back to the page top if the heading doesn't match).
export function hideoutWikiUrl(stationName: string): string {
  return `${WIKI_BASE}/Hideout#${stationName.replace(/ /g, '_')}`
}
