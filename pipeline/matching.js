// pipeline/matching.js
export function offerMatchesTerm(offer, term) {
  const hay = `${offer.product ?? ''} ${offer.brand ?? ''}`.toLowerCase()
  return hay.includes(String(term).trim().toLowerCase())
}

export function offerMatchesWatch(offer, watch) {
  if (!offerMatchesTerm(offer, watch.term)) return false
  if (watch.target_price != null) {
    return offer.price != null && Number(offer.price) < Number(watch.target_price)
  }
  return true
}
