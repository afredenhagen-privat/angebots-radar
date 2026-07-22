// shared/dedupe.js

/**
 * Inhaltliche Signatur eines Angebots — unabhängig von seiner Marktguru-ID.
 */
function signatur(o) {
  return [
    o.product_key ?? `${o.brand ?? ''}|${o.product ?? ''}`,
    o.retailer ?? '',
    o.price ?? '',
    o.valid_from ?? '',
    o.valid_to ?? '',
  ].join('#')
}

/**
 * Entfernt inhaltliche Dubletten.
 *
 * Wir fragen mehrere Postleitzahlen ab, und Marktguru liefert dasselbe
 * Angebot je PLZ unter einer eigenen ID. Eine Entdopplung nur über die ID
 * lässt diese durch: Das Angebot erscheint doppelt in der Liste und zählt
 * doppelt in der Preisstatistik.
 *
 * Die erste Fundstelle gewinnt, die Reihenfolge bleibt erhalten.
 */
export function dedupeOffers(offers) {
  const gesehen = new Set()
  const raus = []
  for (const o of offers ?? []) {
    const sig = signatur(o)
    if (gesehen.has(sig)) continue
    gesehen.add(sig)
    raus.push(o)
  }
  return raus
}
