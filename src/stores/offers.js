// src/stores/offers.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

export const useOffers = defineStore('offers', () => {
  const items = ref([])

  async function load() {
    const { data, error } = await supabase
      .from('offers').select('*').order('retailer')
    if (error) throw error
    items.value = data
  }

  // Client-seitiges Matching für die Anzeige (gleiche Logik wie Pipeline).
  function forTerm(term, targetPrice = null) {
    const t = term.trim().toLowerCase()
    return items.value.filter((o) => {
      const hay = `${o.product ?? ''} ${o.brand ?? ''}`.toLowerCase()
      if (!hay.includes(t)) return false
      if (targetPrice != null) return o.price != null && Number(o.price) < Number(targetPrice)
      return true
    })
  }

  return { items, load, forTerm }
})
