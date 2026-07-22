// pipeline/marktguru/normalize.js
export function normalizeOffer(raw, { zipCode, term }) {
  const advertiser = raw.advertisers?.[0]
  const validity = raw.validityDates?.[0]
  return {
    id: String(raw.id),
    retailer: advertiser?.name ?? null,
    product: raw.product?.name ?? raw.description ?? null,
    brand: raw.brand?.name ?? null,
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
