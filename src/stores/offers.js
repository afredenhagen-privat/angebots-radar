// src/stores/offers.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'
import { offerMatchesEntry } from '../../shared/matching.js'
import { dedupeOffers } from '../../shared/dedupe.js'

const BROWSE_LIMIT = 1000

export const useOffers = defineStore('offers', () => {
  const items = ref([])
  const gesamt = ref(0) // wie viele es insgesamt gäbe (für den Stöber-Tab)
  const error = ref(null)

  const jetzt = () => new Date().toISOString()

  /**
   * Lädt gezielt die aktuell gültigen Angebote zu bestimmten Produkten.
   *
   * Der Merkzettel MUSS vollständig sein — würde er wie der Stöber-Tab
   * einfach "alle" laden, griffe die serverseitige Zeilenobergrenze und es
   * fehlten Treffer, ohne dass irgendwo ein Fehler auftaucht. Genau das ist
   * schon passiert: Angebote von Händlern am Ende des Alphabets verschwanden.
   */
  async function loadForEntries(entries = []) {
    const acc = new Map()
    const keys = [...new Set(entries.flatMap((e) => e.product_keys ?? []).filter(Boolean))]

    if (keys.length) {
      const { data, error: err } = await supabase
        .from('offers')
        .select('*')
        .in('product_key', keys)
        .gte('valid_to', jetzt())
        .order('price')
      if (err) {
        error.value = 'Angebote konnten nicht geladen werden.'
        throw err
      }
      for (const o of data ?? []) acc.set(o.id, o)
    }

    // Alte Freitext-Einträge haben keine Produkte — für sie serverseitig
    // suchen, damit sie nicht stillschweigend leer bleiben, während die
    // Pipeline dafür weiterhin Alarme verschickt.
    for (const e of entries.filter((x) => !(x.product_keys ?? []).length)) {
      const q = String(e.term ?? '').replace(/[,()*%\\]/g, ' ').trim()
      if (q.length < 2) continue
      const { data, error: err } = await supabase
        .from('offers')
        .select('*')
        .or(`product.ilike.%${q}%,brand.ilike.%${q}%`)
        .gte('valid_to', jetzt())
        .limit(200)
      if (err) {
        error.value = 'Angebote konnten nicht geladen werden.'
        throw err
      }
      for (const o of data ?? []) acc.set(o.id, o)
    }

    error.value = null
    // Auch anzeigeseitig entdoppeln: Dubletten, die vor dem Pipeline-Fix in
    // die Datenbank gelaufen sind, verschwinden damit sofort.
    items.value = dedupeOffers([...acc.values()])
  }

  /**
   * Lädt Angebote zum Stöbern — bewusst gedeckelt. `gesamt` sagt, wie viele
   * es insgesamt gäbe, damit die Anzeige ehrlich bleibt statt stillschweigend
   * abzuschneiden.
   */
  async function loadBrowse() {
    const { data, error: err, count } = await supabase
      .from('offers')
      .select('*', { count: 'exact' })
      .gte('valid_to', jetzt())
      .order('retailer')
      .limit(BROWSE_LIMIT)
    if (err) {
      error.value = 'Angebote konnten nicht geladen werden.'
      throw err
    }
    error.value = null
    items.value = dedupeOffers(data ?? [])
    gesamt.value = count ?? items.value.length
  }

  /**
   * Durchsucht die aktuell gültigen Angebote serverseitig.
   *
   * Bewusst NICHT im Browser filtern: Der Stöber-Tab lädt nur einen gedeckelten
   * Ausschnitt, eine lokale Filterung würde also nur diesen Ausschnitt
   * durchsuchen und den Rest stillschweigend übersehen.
   */
  async function searchCurrent(q) {
    const term = String(q ?? '').replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim()
    if (term.length < 2) return loadBrowse()
    const { data, error: err, count } = await supabase
      .from('offers')
      .select('*', { count: 'exact' })
      .or(`product.ilike.%${term}%,brand.ilike.%${term}%`)
      .gte('valid_to', jetzt())
      .order('price')
      .limit(200)
    if (err) {
      error.value = 'Suche fehlgeschlagen.'
      throw err
    }
    error.value = null
    items.value = dedupeOffers(data ?? [])
    gesamt.value = count ?? items.value.length
  }

  /** Treffer für einen Merkzettel-Eintrag (Korb oder alter Freitext). */
  function forEntry(entry) {
    return items.value.filter((o) => offerMatchesEntry(o, entry))
  }

  return { items, gesamt, error, loadForEntries, loadBrowse, searchCurrent, forEntry }
})
