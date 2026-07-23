// pipeline/run.js
import { admin } from './supabaseAdmin.js'
import { fetchKeys, fetchCategories, searchOffers, sleep } from './marktguru/client.js'
import { normalizeOffer } from './marktguru/normalize.js'
import { offerMatchesEntry } from '../shared/matching.js'
import { dedupeOffers } from '../shared/dedupe.js'
import { formatDigest, sendMessage, harvestChatIds } from './telegram.js'
import { CATEGORIES } from './categories.js'
import { istRelevant, FOOD_PARENT_IDS, AUSGESCHLOSSENE_HAENDLER_NAMEN, AUSGESCHLOSSENE_KATEGORIEN } from './foodCategories.js'

const ZIPS = (process.env.ZIP_CODES ?? '97204,97070').split(',').map((z) => z.trim())
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
// Optionale Positivliste, z.B. RETAILERS="Lidl,Kaufland,REWE". Leer = alle.
const RETAILERS = (process.env.RETAILERS ?? '').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean)

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

  // 2. Begriffsliste aufbauen.
  //
  // Die API kann nur Volltextsuche — wir bekommen also ausschliesslich das,
  // wonach wir fragen. Eine handgepflegte Liste laesst zwangslaeufig Luecken
  // (so fehlten z.B. "Vegane Frikadellen"). Deshalb zusaetzlich Marktgurus
  // eigene Kategorieliste, die sich von selbst aktuell haelt.
  const keys = await fetchKeys()
  let apiKategorien = []
  try {
    apiKategorien = await fetchCategories(keys)
    console.log(`Marktguru-Kategorien geladen: ${apiKategorien.length}`)
  } catch (e) {
    console.warn(`Kategorien nicht ladbar (${e.message}) — nur kuratierte Liste`)
  }
  const terms = [...new Set([
    ...watchlist.map((w) => w.term),
    ...CATEGORIES,
    ...apiKategorien,
  ].map((t) => String(t).trim()).filter((t) => t.length >= 2))]
  console.log(`Suchbegriffe: ${terms.length} × ${ZIPS.length} PLZ`)

  // 3. Angebote ziehen (gedrosselt, mit Rate-Limit-Backoff)
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
      await sleep(300) // Rate-Limit schonen (Backoff faengt 456er ab)
    }
  }
  const nowIso = new Date().toISOString()
  // Erst über die ID entdoppeln (dasselbe Angebot bei mehreren Suchbegriffen),
  // dann inhaltlich (dasselbe Angebot je abgefragter PLZ mit eigener ID).
  const roh = dedupeOffers([...offersById.values()])

  // Non-Food aussortieren: Discounter mischen Werkzeug-, Möbel- und
  // Kleidungswochen in dieselbe Antwort.
  const essbar = roh.filter(istRelevant)

  // Optionale Händler-Positivliste. Leer = alle Händler behalten.
  const gefiltert = RETAILERS.length
    ? essbar.filter((o) => o.retailer && RETAILERS.includes(o.retailer.toLowerCase()))
    : essbar

  const offers = gefiltert.map((o) => ({ ...o, fetched_at: nowIso }))
  console.log(
    `Angebote: ${roh.length} gesammelt` +
      ` → ${essbar.length} nach Non-Food-Filter` +
      (RETAILERS.length ? ` → ${offers.length} nach Händlerfilter` : ''),
  )

  // 4. Upsert in offers
  if (offers.length) {
    const { error } = await admin.from('offers').upsert(offers, { onConflict: 'id' })
    if (error) throw error
  }

  // 4b. Altbestand nach den HEUTIGEN Filterregeln bereinigen.
  //
  // Der Filter oben wirkt nur auf neu geschriebene Zeilen. Was frühere Läufe
  // hereingeholt haben, bliebe sonst für immer stehen — und bei jeder
  // Regeländerung bräuchte es eine neue Migration von Hand. Betrifft
  // ausschliesslich aktuell gültige Angebote; abgelaufene sind die Historie.
  const jetztIso = new Date().toISOString()
  const aufraeumen = [
    admin.from('offers').delete().gte('valid_to', jetztIso).in('retailer', AUSGESCHLOSSENE_HAENDLER_NAMEN),
    admin.from('offers').delete().gte('valid_to', jetztIso).in('category_id', AUSGESCHLOSSENE_KATEGORIEN),
    admin.from('offers').delete().gte('valid_to', jetztIso).not('category_parent_id', 'in', `(${[...FOOD_PARENT_IDS].join(',')})`),
  ]
  for (const p of aufraeumen) {
    const { error: e } = await p
    if (e) console.warn(`Aufräumen fehlgeschlagen: ${e.message}`)
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
  //
  // Gemeldet wird nur, was JETZT noch gültig ist. Marktguru liefert auch
  // Angebote, deren Zeitraum bereits abgelaufen ist — ohne diesen Filter
  // bekämst du eine Meldung zu einem Angebot, das es nicht mehr gibt (und das
  // die App zu Recht gar nicht erst anzeigt).
  const jetzt = new Date().toISOString()
  const aktuelle = offers.filter((o) => !o.valid_to || o.valid_to >= jetzt)
  if (aktuelle.length !== offers.length) {
    console.log(`${offers.length - aktuelle.length} abgelaufene Angebote von der Meldung ausgenommen`)
  }

  const { data: sentData, error: asErr } = await admin.from('alerts_sent').select('watchlist_id, offer_id')
  if (asErr) throw asErr
  const alreadySent = sentData ?? []
  const sentKey = new Set(alreadySent.map((a) => `${a.watchlist_id}:${a.offer_id}`))

  for (const watch of watchlist) {
    // Alle neuen Treffer dieses Eintrags sammeln und in EINER Nachricht
    // melden. Pro Treffer zu senden macht den Wecker bei breiten Eintraegen
    // zur Spam-Quelle.
    const treffer = aktuelle.filter((o) => offerMatchesEntry(o, watch))
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
