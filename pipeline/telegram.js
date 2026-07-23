// pipeline/telegram.js
const eur = (n) => Number(n).toFixed(2).replace('.', ',')

const MAX_ZEILEN = 3

function preisZeile(offer) {
  // `price` ist der Packungspreis. Der Grundpreis kommt separat dazu — die
  // Einheit an den Packungspreis zu haengen waere schlicht falsch.
  const price = offer.price != null ? `${eur(offer.price)} €` : 'Preis?'
  const grund = offer.reference_price != null && offer.unit
    ? ` (${eur(offer.reference_price)} €/${offer.unit})`
    : ''
  const was = offer.old_price != null ? ` statt ${eur(offer.old_price)} €` : ''
  const brand = offer.brand ? ` ${offer.brand}` : ''
  const retailer = offer.retailer ? ` · ${offer.retailer}` : ''
  return `${price}${grund}${was} · ${offer.product ?? ''}${brand}${retailer}`.trim()
}

function bis(iso) {
  return iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : null
}

/**
 * Eine Nachricht je Merkzettel-Eintrag statt je Treffer.
 *
 * Ohne diese Bündelung löst ein breiter Eintrag wie "Butter" bei einem Lauf
 * dutzende Einzelnachrichten aus — der Wecker wird dann zum Spam und man
 * schaltet ihn ab.
 */
export function formatDigest(watch, offers) {
  // Nach Grundpreis sortieren, damit "guenstigstes" ueber Gebindegroessen hinweg stimmt.
  const basis = (o) => o.unit_price ?? o.price ?? Infinity
  const sorted = [...offers].sort((a, b) => basis(a) - basis(b))
  const anzahl = sorted.length
  const kopf = `🛒 ${watch.term} — ${anzahl} ${anzahl === 1 ? 'neues Angebot' : 'neue Angebote'}`

  const zeilen = sorted.slice(0, MAX_ZEILEN).map(preisZeile)
  const rest = anzahl - zeilen.length
  if (rest > 0) zeilen.push(`… und ${rest} weitere`)

  const gueltig = bis(sorted[0]?.valid_to)
  const fuss = gueltig ? `\n\nGünstigstes gültig bis ${gueltig}` : ''

  return `${kopf}\n\n${zeilen.join('\n')}${fuss}`
}

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
