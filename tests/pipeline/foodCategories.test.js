import { describe, it, expect } from 'vitest'
import { istRelevant, FOOD_PARENT_IDS } from '../../pipeline/foodCategories.js'

describe('istRelevant', () => {
  it('behält Lebensmittel', () => {
    expect(istRelevant({ category_parent_id: 107 })).toBe(true) // Molkerei
    expect(istRelevant({ category_parent_id: 147 })).toBe(true) // Gemüse
    expect(istRelevant({ category_parent_id: 16 })).toBe(true) // u.a. Veganes
  })

  it('behält Drogerie und Tierfutter', () => {
    expect(istRelevant({ category_parent_id: 415 })).toBe(true) // Haushaltsverbrauch
    expect(istRelevant({ category_parent_id: 85 })).toBe(true) // Katzenfutter
  })

  it('wirft Non-Food raus', () => {
    // Genau der Grund für den Filter: Discounter mischen Aktionswochen mit
    // Werkzeug, Möbeln und Kleidung in dieselbe API-Antwort.
    expect(istRelevant({ category_parent_id: 382 })).toBe(false) // Elektrowerkzeug
    expect(istRelevant({ category_parent_id: 97 })).toBe(false) // Möbel
    expect(istRelevant({ category_parent_id: 427 })).toBe(false) // Damenmode
    expect(istRelevant({ category_parent_id: 124 })).toBe(false) // Unterhaltungselektronik
  })

  it('behält Angebote ohne Kategorie', () => {
    // Lieber ein Ausreisser zu viel als ein echtes Lebensmittel verlieren.
    expect(istRelevant({ category_parent_id: null })).toBe(true)
    expect(istRelevant({})).toBe(true)
  })

  it('deckt die wichtigsten Lebensmittelgruppen ab', () => {
    for (const id of [103, 104, 106, 107, 149, 191, 193]) {
      expect(FOOD_PARENT_IDS.has(id)).toBe(true)
    }
  })
})
