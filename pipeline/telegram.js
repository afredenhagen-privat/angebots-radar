// pipeline/telegram.js
const eur = (n) => Number(n).toFixed(2).replace('.', ',')

export function formatAlert(watch, offer) {
  const priceUnit = offer.unit ? `/${offer.unit}` : ''
  const price = offer.price != null ? `${eur(offer.price)} €${priceUnit}` : 'Preis?'
  const was = offer.old_price != null ? ` (statt ${eur(offer.old_price)} €)` : ''
  let until = ''
  if (offer.valid_to) {
    const d = offer.valid_to
    until = ` – gültig bis ${d.slice(8, 10)}.${d.slice(5, 7)}.`
  }
  const title = offer.product ?? watch.term
  const brand = offer.brand ? ` (${offer.brand})` : ''
  const retailer = offer.retailer ?? ''
  return `🛒 ${title}${brand}\n${retailer}: ${price}${was}${until}`
}

// pipeline/telegram.js  (an die bestehende Datei anhängen)
const API = (token) => `https://api.telegram.org/bot${token}`

export async function sendMessage(token, chatId, text) {
  const res = await fetch(`${API(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) throw new Error(`telegram sendMessage ${res.status}: ${await res.text()}`)
}

// Liest neue /start-Nachrichten via getUpdates und liefert {chat_id, name}[].
export async function harvestChatIds(token) {
  const res = await fetch(`${API(token)}/getUpdates`)
  if (!res.ok) throw new Error(`telegram getUpdates ${res.status}`)
  const { result = [] } = await res.json()
  const found = new Map()
  for (const u of result) {
    const chat = u.message?.chat
    if (chat?.id) {
      found.set(String(chat.id), chat.first_name ?? chat.title ?? null)
    }
  }
  return [...found.entries()].map(([chat_id, name]) => ({ chat_id, name }))
}
