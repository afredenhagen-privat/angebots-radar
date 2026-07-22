// pipeline/run.js
import { admin } from './supabaseAdmin.js'
import { fetchKeys, searchOffers, sleep } from './marktguru/client.js'
import { normalizeOffer } from './marktguru/normalize.js'
import { offerMatchesEntry } from '../shared/matching.js'
import { formatDigest, sendMessage, harvestChatIds } from './telegram.js'
import { CATEGORIES } from './categories.js'

const ZIPS = (process.env.ZIP_CODES ?? '97204,97070').split(',').map((z) => z.trim())
const TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function main() {
  // 1. Merkliste laden
  const { data: watchlistData, error: wErr } = await admin.from('watchlist').select('*')
  if (wErr) throw wErr
  const watchlist = watchlistData ?? []
  console.log(`Merkliste: ${watchlist.length} Eintrag/Einträge`)
  for (const w of watchlist) {
    const n = (w.product_keys ?? []).length
    console.log(`  · "${w.term}": ${n ? `${n} Produkt(e) im Korb` : 'Freitext'}${w.target_price != null ? `, Limit ${w.target_price} €` : ''}`)
  }

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

  // 5. Historie BEHALTEN. Abgelaufene Angebote bleiben stehen — sie *sind* die
  //    Preishistorie (typischer Preis / Tiefpreis / Preisverlauf). "Aktuell im
  //    Angebot" ist nur noch die Abfrage valid_to >= jetzt.
  //    Weggeräumt wird ausschliesslich Uraltes, damit die Tabelle nicht ewig waechst.
  const PRUNE_DAYS = 730
  const cutoff = new Date(Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { error: delErr } = await admin.from('offers').delete().lt('valid_to', cutoff)
  if (delErr) console.warn(`history prune fail: ${delErr.message}`)

  // 6. Telegram-Empfänger aktualisieren
  if (!TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN fehlt — es werden keine Alerts verschickt.')
  } else {
    const subs = await harvestChatIds(TOKEN)
    console.log(`Telegram getUpdates: ${subs.length} Chat(s) gefunden`)
    if (subs.length) await admin.from('telegram_subscribers').upsert(subs, { onConflict: 'chat_id' })
  }
  const { data: subsData, error: subErr } = await admin.from('telegram_subscribers').select('*')
  if (subErr) throw subErr
  const subscribers = subsData ?? []
  console.log(`Empfänger in der Datenbank: ${subscribers.length}`)
  if (TOKEN && !subscribers.length) {
    console.warn('Niemand registriert — schickt dem Bot einmal /start, sonst gibt es keine Alerts.')
  }

  // 7. Matching + Alerts
  const { data: sentData, error: asErr } = await admin.from('alerts_sent').select('watchlist_id, offer_id')
  if (asErr) throw asErr
  const alreadySent = sentData ?? []
  const sentKey = new Set(alreadySent.map((a) => `${a.watchlist_id}:${a.offer_id}`))

  for (const watch of watchlist) {
    // Alle neuen Treffer dieses Eintrags sammeln und in EINER Nachricht
    // melden. Pro Treffer zu senden macht den Wecker bei breiten Eintraegen
    // zur Spam-Quelle.
    const treffer = offers.filter((o) => offerMatchesEntry(o, watch))
    const neu = treffer.filter((o) => !sentKey.has(`${watch.id}:${o.id}`))
    console.log(
      `"${watch.term}": ${treffer.length} Treffer, davon ${neu.length} neu` +
        (treffer.length && !neu.length ? ' (alle schon gemeldet)' : ''),
    )
    if (!neu.length) continue

    // Nur als "gesendet" markieren, wenn wirklich zugestellt wurde.
    let delivered = false
    if (TOKEN && subscribers.length) {
      const text = formatDigest(watch, neu)
      for (const sub of subscribers) {
        try {
          await sendMessage(TOKEN, sub.chat_id, text)
          delivered = true
        } catch (e) {
          console.warn(`telegram fail ${sub.chat_id}: ${e.message}`)
        }
      }
    }
    if (!delivered) continue // kein erfolgreicher Versand -> beim naechsten Lauf erneut versuchen

    const rows = neu.map((o) => ({ watchlist_id: watch.id, offer_id: o.id }))
    const { error: insErr } = await admin
      .from('alerts_sent')
      .upsert(rows, { onConflict: 'watchlist_id,offer_id', ignoreDuplicates: true })
    if (insErr) { console.warn(`alerts_sent insert fail: ${insErr.message}`); continue }
    for (const o of neu) sentKey.add(`${watch.id}:${o.id}`)
    console.log(`Alert "${watch.term}": ${neu.length} Angebot(e) gemeldet.`)
  }
  console.log('Pipeline fertig.')
}

main().catch((e) => { console.error(e); process.exit(1) })
