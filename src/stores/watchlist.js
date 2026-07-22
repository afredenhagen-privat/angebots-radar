// src/stores/watchlist.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

let channel = null

export const useWatchlist = defineStore('watchlist', () => {
  const items = ref([])

  async function load() {
    const { data, error } = await supabase.from('watchlist').select('*').order('created_at')
    if (error) throw error
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

  // Nach Änderungen direkt neu laden statt auf den Realtime-Rückweg zu warten —
  // sonst wirkt das Antippen eines Vorschlags folgenlos.

  /** Legt einen neuen Korb an, benannt nach dem ersten Produkt. */
  async function addBasket(label, productKey = null) {
    const { error } = await supabase.from('watchlist').insert({
      term: label,
      product_keys: productKey ? [productKey] : [],
    })
    if (error) throw error
    await load()
  }

  /** Nimmt ein weiteres Produkt in einen bestehenden Korb auf. */
  async function addProduct(id, productKey) {
    const entry = items.value.find((i) => i.id === id)
    if (!entry) return
    const keys = entry.product_keys ?? []
    if (keys.includes(productKey)) return
    const { error } = await supabase
      .from('watchlist')
      .update({ product_keys: [...keys, productKey] })
      .eq('id', id)
    if (error) throw error
    await load()
  }

  async function removeProduct(id, productKey) {
    const entry = items.value.find((i) => i.id === id)
    if (!entry) return
    const { error } = await supabase
      .from('watchlist')
      .update({ product_keys: (entry.product_keys ?? []).filter((k) => k !== productKey) })
      .eq('id', id)
    if (error) throw error
    await load()
  }

  async function rename(id, label) {
    const { error } = await supabase.from('watchlist').update({ term: label }).eq('id', id)
    if (error) throw error
    await load()
  }

  async function remove(id) {
    const { error } = await supabase.from('watchlist').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  async function setTarget(id, targetPrice) {
    const { error } = await supabase.from('watchlist').update({ target_price: targetPrice }).eq('id', id)
    if (error) throw error
    await load()
  }

  return {
    items, load, subscribe, unsubscribe,
    addBasket, addProduct, removeProduct, rename, remove, setTarget,
  }
})
