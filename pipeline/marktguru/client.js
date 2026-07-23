// pipeline/marktguru/client.js
import { extractKeys } from './keys.js'

const HOME = 'https://www.marktguru.de/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

export async function fetchKeys() {
  const res = await fetch(HOME, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`marktguru homepage ${res.status}`)
  return extractKeys(await res.text())
}

export async function searchOffers({ apiKey, clientKey, host }, term, zipCode, limit = 200) {
  const url = `https://${host}/api/v1/offers/search?as=web&q=${encodeURIComponent(term)}&zipCode=${zipCode}&limit=${limit}&offset=0`
  const res = await fetch(url, {
    headers: { 'x-apikey': apiKey, 'x-clientkey': clientKey, 'User-Agent': UA, Accept: 'application/json' },
  })
  if (res.status === 456) throw new Error('marktguru rate-limited (456)')
  if (!res.ok) throw new Error(`marktguru search ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

/**
 * Marktguru pflegt eine eigene Kategorieliste (~500 Einträge). Die als
 * Suchbegriffe mitzunehmen erweitert die Abdeckung erheblich und bleibt
 * automatisch aktuell — anders als eine handgepflegte Liste.
 *
 * Hinweis: Die API kann NICHT nach Kategorie filtern (getestet: categoryId
 * und categoryIds werden ignoriert, ohne `q` kommen 0 Treffer). Sie kann nur
 * Volltext. Deshalb nutzen wir die Namen als Suchbegriffe, nicht als Filter.
 */
export async function fetchCategories({ apiKey, clientKey, host }) {
  const res = await fetch(`https://${host}/api/v1/categories?as=web`, {
    headers: { 'x-apikey': apiKey, 'x-clientkey': clientKey, 'User-Agent': UA, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`marktguru categories ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map((c) => c.name).filter(Boolean)
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
