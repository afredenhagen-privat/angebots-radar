// src/stores/watchlist.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

let channel = null

/** Übersetzt Datenbankfehler in etwas, das im Zweifel weiterhilft. */
function beschreibe(e) {
  const msg = String(e?.message ?? '')
  if (e?.code === '42703' || e?.code === 'PGRST204' || /product_keys/i.test(msg)) {
    return 'Die Merkliste ist in der Datenbank noch nicht aktualisiert (Migration 003 ausstehend).'
  }
  return 'Änderung konnte nicht gespeichert werden.'
}

export const useWatchlist = defineStore('watchlist', () => {
  const items = ref([])
  const error = ref('')

  /**
   * Führt eine Änderung aus und macht Fehlschläge sichtbar.
   * Ohne das scheitert z.B. das Anlegen lautlos — die App wirkt kaputt,
   * ohne zu sagen warum.
   */
  async function guard(fn) {
    error.value = ''
    try {
      await fn()
      await load()
    } catch (e) {
      error.value = beschreibe(e)
    }
  }

  async function load() {
    const { data, error: err } = await supabase.from('watchlist').select('*').order('created_at')
    if (err) throw err
    items.value = data ?? []
  }

  function subscribe() {
    if (channel) return
    channel = supabase.channel('watchlist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, load)
      .subscribe()
  }
  function unsubscribe() {
    if (channel) { supabase.removeChannel(channel); channel = null }
  }

  // Nach Änderungen direkt neu laden (in guard) statt auf den Realtime-Rückweg
  // zu warten — sonst wirkt das Antippen eines Vorschlags folgenlos.

  /** Legt einen neuen Korb an, benannt nach dem ersten Produkt. */
  function addBasket(label, productKey = null) {
    return guard(async () => {
      const { error: err } = await supabase.from('watchlist').insert({
        term: label,
        product_keys: productKey ? [productKey] : [],
      })
      if (err) throw err
    })
  }

  /** Nimmt ein weiteres Produkt in einen bestehenden Korb auf. */
  function addProduct(id, productKey) {
    return guard(async () => {
      const entry = items.value.find((i) => i.id === id)
      if (!entry) return
      const keys = entry.product_keys ?? []
      if (keys.includes(productKey)) return
      const { error: err } = await supabase
        .from('watchlist')
        .update({ product_keys: [...keys, productKey] })
        .eq('id', id)
      if (err) throw err
    })
  }

  function removeProduct(id, productKey) {
    return guard(async () => {
      const entry = items.value.find((i) => i.id === id)
      if (!entry) return
      const { error: err } = await supabase
        .from('watchlist')
        .update({ product_keys: (entry.product_keys ?? []).filter((k) => k !== productKey) })
        .eq('id', id)
      if (err) throw err
    })
  }

  function rename(id, label) {
    return guard(async () => {
      const { error: err } = await supabase.from('watchlist').update({ term: label }).eq('id', id)
      if (err) throw err
    })
  }

  function remove(id) {
    return guard(async () => {
      const { error: err } = await supabase.from('watchlist').delete().eq('id', id)
      if (err) throw err
    })
  }

  function setTarget(id, targetPrice) {
    return guard(async () => {
      const { error: err } = await supabase
        .from('watchlist')
        .update({ target_price: targetPrice })
        .eq('id', id)
      if (err) throw err
    })
  }

  return {
    items, error, load, subscribe, unsubscribe,
    addBasket, addProduct, removeProduct, rename, remove, setTarget,
  }
})
