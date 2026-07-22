// shared/productKey.js
// Wird von der Pipeline (normalize.js) genutzt und vom Frontend zum Nachschlagen.

/**
 * Baut einen normalisierten Schlüssel aus Marke + Produktname.
 *
 * Damit "typischer Preis" und "Tiefpreis" pro *konkretem* Produkt gerechnet
 * werden können, brauchen wir einen stabilen Gruppierungsschlüssel. Die
 * Rohdaten schwanken in Gross-/Kleinschreibung und Leerraum, deshalb:
 * kleinschreiben, Leerraum vereinheitlichen, mit "|" verbinden.
 *
 *   productKey('Kerrygold', 'Original Irische  Butter')
 *     -> 'kerrygold|original irische butter'
 *
 * Gibt null zurück, wenn weder Marke noch Produktname brauchbar sind —
 * solche Angebote fliessen nicht in die Statistik ein.
 */
export function productKey(brand, product) {
  const norm = (s) =>
    String(s ?? '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

  const b = norm(brand)
  const p = norm(product)
  if (!b && !p) return null
  return `${b}|${p}`
}
