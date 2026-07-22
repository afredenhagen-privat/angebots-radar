// shared/matching.js
// Gemeinsame Matching-Logik für Pipeline (Telegram-Alerts) und Frontend
// (Trefferanzeige). Bewusst an einer Stelle, damit beide nie auseinanderlaufen.

/** Rückfallebene für alte Freitext-Einträge: Teilstring über Produkt + Marke. */
export function offerMatchesTerm(offer, term) {
  const hay = `${offer.product ?? ''} ${offer.brand ?? ''}`.toLowerCase()
  return hay.includes(String(term ?? '').trim().toLowerCase())
}

/**
 * Passt ein Angebot zu einem Merkzettel-Eintrag?
 *
 * Ein Eintrag ist ein benannter Korb konkreter Produkte (`product_keys`).
 * Dann wird EXAKT über den Produkt-Schlüssel gematcht — keine Fehltreffer
 * mehr wie "Rama mit Butter" bei der Suche nach Butter.
 *
 * Einträge ohne Produkte stammen noch aus der Freitext-Zeit und matchen
 * weiterhin per Teilstring, damit nichts still aufhört zu funktionieren.
 *
 * Ein gesetztes `target_price` wirkt in beiden Fällen als Obergrenze.
 */
export function offerMatchesEntry(offer, entry) {
  const keys = entry?.product_keys ?? []

  if (keys.length) {
    if (!offer.product_key || !keys.includes(offer.product_key)) return false
  } else if (!offerMatchesTerm(offer, entry?.term)) {
    return false
  }

  if (entry?.target_price != null) {
    return offer.price != null && Number(offer.price) < Number(entry.target_price)
  }
  return true
}
