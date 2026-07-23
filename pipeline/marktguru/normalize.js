// pipeline/marktguru/normalize.js
import { productKey } from '../../shared/productKey.js'

/**
 * Grundpreis je Einheit (€/kg, €/l, €/Stk).
 *
 * WICHTIG: `price` ist der Packungspreis, NICHT der Preis je Einheit.
 * Marktguru liefert den Grundpreis separat als `referencePrice`
 * (Beispiel: Kerrygold 1,99 € Packung = 24,88 €/kg).
 *
 * Nur der Grundpreis ist über verschiedene Gebindegrößen hinweg
 * vergleichbar — sonst landen Einzelflasche und Kasten desselben Produkts
 * im selben Vergleich und die Statistik wird unbrauchbar.
 */
function grundpreis(raw) {
  return raw.referencePrice ?? raw.price ?? null
}

/**
 * Der frühere Grundpreis, abgeleitet aus dem Streichpreis.
 * Der Faktor Packungspreis -> Grundpreis gilt für beide Preise gleich.
 */
function alterGrundpreis(raw) {
  const alt = raw.oldPrice
  if (alt == null) return null
  if (raw.referencePrice == null || !raw.price) return alt
  return Number((alt * (raw.referencePrice / raw.price)).toFixed(2))
}

export function normalizeOffer(raw, { zipCode, term }) {
  const advertiser = raw.advertisers?.[0]
  const validity = raw.validityDates?.[0]
  const category = raw.categories?.[0]
  const product = raw.product?.name ?? raw.description ?? null
  const brand = raw.brand?.name ?? null
  return {
    id: String(raw.id),
    retailer: advertiser?.name ?? null,
    product,
    brand,
    // Gruppierungsschlüssel für die Preisstatistik (typischer Preis / Tiefpreis).
    product_key: productKey(brand, product),
    price: raw.price ?? null,
    old_price: raw.oldPrice ?? null,
    reference_price: raw.referencePrice ?? null,
    // Vergleichsbasis für alle Statistiken und Urteile.
    unit_price: grundpreis(raw),
    unit_old_price: alterGrundpreis(raw),
    unit: raw.unit?.shortName ?? null,
    // Kategorie für den Lebensmittel-Filter (siehe pipeline/foodCategories.js).
    category_id: category?.id ?? null,
    category_parent_id: category?.parentId ?? null,
    valid_from: validity?.from ?? null,
    valid_to: validity?.to ?? null,
    zip_code: String(zipCode),
    image_id: String(raw.id),
    category: term,
  }
}
