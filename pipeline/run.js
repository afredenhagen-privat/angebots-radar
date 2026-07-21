// pipeline/run.js
import { admin } from './supabaseAdmin.js'
import { fetchKeys, searchOffers, sleep } from './marktguru/client.js'
import { normalizeOffer } from './marktguru/normalize.js'
import { offerMatchesWatch } from './matching.js'
import { formatAlert, sendMessage, harvestChatIds } from './telegram.js'
import { CATEGORIES } from './categories.js'

const ZIPS = (process.env.ZIP_CODES ?? '97204,97070').split(',').map((z) => z.trim())
const TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function main() {
  // 1. Merkliste laden
  const { data: watchlist = [], error: wErr } = await admin.from('watchlist').select('*')
  if (wErr) throw wErr

  // 2. Begriffsliste = Merkzettel-Begriffe ∪ Kategorien
  const terms = [...new Set([...watchlist.map((w) => w.term), ...CATEGORIES])]

  // 3. Angebote ziehen (gedrosselt)
  const keys = await fetchKeys()
  const offersById = new Map()
  for (const zip of ZIPS) {
    for (const term of terms) {
      try {
        const raw = await searchOffers(keys, term, zip)
        for (const o of raw) {
          const n = normalizeOffer(o, { zipCode: zip, term })
          offersById.set(n.id, n) // dedupe über Begriffe/PLZ hinweg
        }
      } catch (e) {
        console.warn(`skip ${term}@${zip}: ${e.message}`)
      }
      await sleep(400) // Rate-Limit schonen
    }
  }
  const offers = [...offersById.values()]
  console.log(`Angebote gesammelt: ${offers.length}`)

  // 4. Upsert in offers
  if (offers.length) {
    const { error } = await admin.from('offers').upsert(offers, { onConflict: 'id' })
    if (error) throw error
  }

  // 5. Abgelaufene Angebote entfernen
  await admin.from('offers').delete().lt('valid_to', new Date().toISOString())

  // 6. Telegram-Empfänger aktualisieren
  if (TOKEN) {
    const subs = await harvestChatIds(TOKEN)
    if (subs.length) await admin.from('telegram_subscribers').upsert(subs, { onConflict: 'chat_id' })
  }
  const { data: subscribers = [] } = await admin.from('telegram_subscribers').select('*')

  // 7. Matching + Alerts
  const { data: alreadySent = [] } = await admin.from('alerts_sent').select('watchlist_id, offer_id')
  const sentKey = new Set(alreadySent.map((a) => `${a.watchlist_id}:${a.offer_id}`))

  for (const watch of watchlist) {
    for (const offer of offers) {
      const key = `${watch.id}:${offer.id}`
      if (sentKey.has(key)) continue
      if (!offerMatchesWatch(offer, watch)) continue

      if (TOKEN) {
        for (const sub of subscribers) {
          try { await sendMessage(TOKEN, sub.chat_id, formatAlert(watch, offer)) }
          catch (e) { console.warn(`telegram fail ${sub.chat_id}: ${e.message}`) }
        }
      }
      await admin.from('alerts_sent').insert({ watchlist_id: watch.id, offer_id: offer.id })
      sentKey.add(key)
    }
  }
  console.log('Pipeline fertig.')
}

main().catch((e) => { console.error(e); process.exit(1) })
