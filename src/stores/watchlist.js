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
    items.value = data
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

  async function add(term, targetPrice = null) {
    const { error } = await supabase.from('watchlist').insert({ term, target_price: targetPrice })
    if (error) throw error
  }
  async function remove(id) {
    const { error } = await supabase.from('watchlist').delete().eq('id', id)
    if (error) throw error
  }
  async function setTarget(id, targetPrice) {
    const { error } = await supabase.from('watchlist').update({ target_price: targetPrice }).eq('id', id)
    if (error) throw error
  }

  return { items, load, subscribe, unsubscribe, add, remove, setTarget }
})
