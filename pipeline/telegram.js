// pipeline/telegram.js
const eur = (n) => Number(n).toFixed(2).replace('.', ',')

export function escapeMd(s) {
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
}

export function formatAlert(watch, offer) {
  const priceUnit = offer.unit ? `/${offer.unit}` : ''
  const price = offer.price != null ? `${eur(offer.price)} €${priceUnit}` : 'Preis?'
  const was = offer.old_price != null ? ` (statt ${eur(offer.old_price)} €)` : ''
  let until = ''
  if (offer.valid_to) {
    const d = offer.valid_to
    until = ` – gültig bis ${d.slice(8, 10)}.${d.slice(5, 7)}.`
  }
  const title = escapeMd(offer.product ?? watch.term)
  const brand = offer.brand ? ` \\(${escapeMd(offer.brand)}\\)` : ''
  const retailer = escapeMd(offer.retailer ?? '')
  return `🛒 *${title}*${brand}\n${retailer}: ${price}${was}${until}`
}
