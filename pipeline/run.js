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
  const { data: watchlistData, error: wErr } = await admin.from('watchlist').select('*')
  if (wErr) throw wErr
  const watchlist = watchlistData ?? []

  // 2. Begriffsliste = Merkzettel-Begriffe ∪ Kategorien
  const terms = [...new Set([...watchlist.map((w) => w.term), ...CATEGORIES])]

  // 3. Angebote ziehen (gedrosselt, mit Rate-Limit-Backoff)
  const keys = await fetchKeys()
  const offersById = new Map()
  let rateLimitStreak = 0
  let aborted = false
  for (const zip of ZIPS) {
    if (aborted) break
    for (const term of terms) {
      try {
        const raw = await searchOffers(keys, term, zip)
        for (const o of raw) {
          const n = normalizeOffer(o, { zipCode: zip, term })
          offersById.set(n.id, n) // dedupe über Begriffe/PLZ hinweg
        }
        rateLimitStreak = 0
      } catch (e) {
        console.warn(`skip ${term}@${zip}: ${e.message}`)
        if (e.message.includes('456')) {
          rateLimitStreak++
          if (rateLimitStreak >= 5) { console.warn('marktguru rate-limited repeatedly, aborting fetch'); aborted = true; break }
          await sleep(5000)
        }
      }
      await sleep(400) // Rate-Limit schonen
    }
  }
  const nowIso = new Date().toISOString()
  const offers = [...offersById.values()].map((o) => ({ ...o, fetched_at: nowIso }))
  console.log(`Angebote gesammelt: ${offers.length}`)

  // 4. Upsert in offers
  if (offers.length) {
    const { error } = await admin.from('offers').upsert(offers, { onConflict: 'id' })
    if (error) throw error
  }

  // 5. Abgelaufene Angebote entfernen
  const { error: delErr } = await admin.from('offers').delete().lt('valid_to', new Date().toISOString())
  if (delErr) console.warn(`expired cleanup fail: ${delErr.message}`)

  // 6. Telegram-Empfänger aktualisieren
  if (TOKEN) {
    const subs = await harvestChatIds(TOKEN)
    if (subs.length) await admin.from('telegram_subscribers').upsert(subs, { onConflict: 'chat_id' })
  }
  const { data: subsData, error: subErr } = await admin.from('telegram_subscribers').select('*')
  if (subErr) throw subErr
  const subscribers = subsData ?? []

  // 7. Matching + Alerts
  const { data: sentData, error: asErr } = await admin.from('alerts_sent').select('watchlist_id, offer_id')
  if (asErr) throw asErr
  const alreadySent = sentData ?? []
  const sentKey = new Set(alreadySent.map((a) => `${a.watchlist_id}:${a.offer_id}`))

  for (const watch of watchlist) {
    for (const offer of offers) {
      const key = `${watch.id}:${offer.id}`
      if (sentKey.has(key)) continue
      if (!offerMatchesWatch(offer, watch)) continue

      // Nur als "gesendet" markieren, wenn wirklich zugestellt wurde.
      let delivered = false
      if (TOKEN && subscribers.length) {
        for (const sub of subscribers) {
          try {
            await sendMessage(TOKEN, sub.chat_id, formatAlert(watch, offer))
            delivered = true
          } catch (e) {
            console.warn(`telegram fail ${sub.chat_id}: ${e.message}`)
          }
        }
      }
      if (!delivered) continue // kein erfolgreicher Versand -> beim nächsten Lauf erneut versuchen

      const { error: insErr } = await admin
        .from('alerts_sent')
        .upsert({ watchlist_id: watch.id, offer_id: offer.id },
                { onConflict: 'watchlist_id,offer_id', ignoreDuplicates: true })
      if (insErr) { console.warn(`alerts_sent insert fail: ${insErr.message}`); continue }
      sentKey.add(key)
    }
  }
  console.log('Pipeline fertig.')
}

main().catch((e) => { console.error(e); process.exit(1) })
