// src/stores/products.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

const MIGRATION_HINT = 'Preisdaten sind noch nicht eingerichtet (Migration 002 ausstehend).'
const GENERIC_HINT = 'Preisdaten konnten gerade nicht geladen werden.'

/**
 * Unterscheidet "View fehlt noch" von echten Fehlern. Sonst behaupten wir bei
 * jedem Netzwerkaussetzer, die Migration fehle — und der Nutzer sucht am
 * falschen Ende.
 */
function describe(e) {
  const msg = String(e?.message ?? '')
  if (e?.code === '42P01' || e?.code === 'PGRST205' || /product_stats|schema cache|does not exist/i.test(msg)) {
    return MIGRATION_HINT
  }
  return GENERIC_HINT
}

/**
 * Entschärft Zeichen, die die PostgREST-Filtersyntax zerlegen würden.
 * Ein Komma oder eine Klammer im Suchbegriff macht den or()-Ausdruck sonst
 * ungültig — die Suche schlüge scheinbar grundlos fehl.
 */
function sanitize(q) {
  return q.replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

export const useProducts = defineStore('products', () => {
  const error = ref(null)

  async function search(query) {
    const q = sanitize(String(query ?? '').trim())
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
      return data ?? []
    } catch (e) {
      error.value = describe(e)
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
      error.value = describe(e)
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
      return data ?? []
    } catch (e) {
      error.value = describe(e)
      return []
    }
  }

  /**
   * Statistik zu mehreren Produkten auf einmal — damit die Trefferliste die
   * Preislage anzeigen kann, ohne pro Karte eine eigene Abfrage zu feuern.
   * Liefert eine Map product_key -> Statistik.
   */
  async function statsForKeys(keys) {
    const unique = [...new Set((keys ?? []).filter(Boolean))].slice(0, 200)
    if (!unique.length) return new Map()
    try {
      const { data, error: err } = await supabase
        .from('product_stats')
        .select('*')
        .in('product_key', unique)
      if (err) throw err
      error.value = null
      return new Map((data ?? []).map((r) => [r.product_key, r]))
    } catch (e) {
      error.value = describe(e)
      return new Map()
    }
  }

  return { error, search, byKey, history, statsForKeys }
})
