// pipeline/marktguru/normalize.js
import { productKey } from '../../shared/productKey.js'

export function normalizeOffer(raw, { zipCode, term }) {
  const advertiser = raw.advertisers?.[0]
  const validity = raw.validityDates?.[0]
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
    unit: raw.unit?.shortName ?? null,
    valid_from: validity?.from ?? null,
    valid_to: validity?.to ?? null,
    zip_code: String(zipCode),
    image_id: String(raw.id),
    category: term,
  }
}
