// src/stores/offers.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'
import { offerMatchesEntry } from '../../shared/matching.js'

export const useOffers = defineStore('offers', () => {
  const items = ref([])
  const error = ref(null)

  /**
   * Lädt NUR aktuell gültige Angebote.
   *
   * Die offers-Tabelle ist die Preishistorie und wächst täglich — ohne diesen
   * Filter würde die App mit der Zeit die komplette Historie aufs Handy laden.
   * Den Verlauf einzelner Produkte holt das Produkt-Detail gezielt nach.
   */
  async function load() {
    const { data, error: err } = await supabase
      .from('offers')
      .select('*')
      .gte('valid_to', new Date().toISOString())
      .order('retailer')
    if (err) {
      error.value = 'Angebote konnten nicht geladen werden.'
      throw err
    }
    error.value = null
    items.value = data ?? []
  }

  /** Treffer für einen Merkzettel-Eintrag (Korb oder alter Freitext). */
  function forEntry(entry) {
    return items.value.filter((o) => offerMatchesEntry(o, entry))
  }

  return { items, error, load, forEntry }
})
