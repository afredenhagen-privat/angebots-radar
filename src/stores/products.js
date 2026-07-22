// src/stores/products.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

const MIGRATION_HINT = 'Preisdaten sind noch nicht eingerichtet (Migration 002 ausstehend).'

export const useProducts = defineStore('products', () => {
  const error = ref(null)

  async function search(query) {
    const q = query.trim()
    if (q.length < 2) return []
    try {
      const { data, error: err } = await supabase
        .from('product_stats')
        .select('*')
        .or(`product.ilike.%${q}%,brand.ilike.%${q}%`)
        .order('observations', { ascending: false })
        .limit(30)
      if (err) throw err
      error.value = null
      return data
    } catch (e) {
      error.value = MIGRATION_HINT
      return []
    }
  }

  async function byKey(productKey) {
    try {
      const { data, error: err } = await supabase
        .from('product_stats')
        .select('*')
        .eq('product_key', productKey)
        .maybeSingle()
      if (err) throw err
      error.value = null
      return data
    } catch (e) {
      error.value = MIGRATION_HINT
      return null
    }
  }

  async function history(productKey) {
    try {
      const { data, error: err } = await supabase
        .from('offers')
        .select('*')
        .eq('product_key', productKey)
        .order('valid_from', { ascending: false })
        .limit(100)
      if (err) throw err
      error.value = null
      return data
    } catch (e) {
      error.value = MIGRATION_HINT
      return []
    }
  }

  return { error, search, byKey, history }
})
