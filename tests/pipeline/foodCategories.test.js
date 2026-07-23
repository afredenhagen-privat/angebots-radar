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

  it('wirft Angebote ohne Kategorie raus', () => {
    // Gemessen über 728 Angebote: kein einziges kommt ohne Kategorie. Wer
    // hier keine hat, ist ein Ausreisser — kein schuetzenswertes Lebensmittel.
    expect(istRelevant({ category_parent_id: null })).toBe(false)
    expect(istRelevant({})).toBe(false)
  })

  it('wirft Hausrat raus, der unter einer erlaubten Elternkategorie hängt', () => {
    // Elternkategorie 50 enthält Spülmittel (wollen wir) UND Küchenzubehör
    // (wollen wir nicht) — darüber kamen Salatschleudern und Brotkörbe rein.
    expect(istRelevant({ category_parent_id: 50, category_id: 418 })).toBe(true) // Spülmittel
    expect(istRelevant({ category_parent_id: 50, category_id: 419 })).toBe(true) // Waschmittel
    expect(istRelevant({ category_parent_id: 50, category_id: 250 })).toBe(false) // Küchenzubehör
    expect(istRelevant({ category_parent_id: 50, category_id: 251 })).toBe(false) // Küchentextilien
  })

  it('wirft Möbelhäuser komplett raus', () => {
    // Deren "Lebensmittel" sind Restaurantangebote, keine Einkäufe.
    expect(istRelevant({ retailer: 'XXXLutz', category_parent_id: 70 })).toBe(false)
    expect(istRelevant({ retailer: 'Opti Wohnwelt', category_parent_id: 107 })).toBe(false)
    // Die Tankstelle bleibt: dort gibt es echte Getränkeangebote.
    expect(istRelevant({ retailer: 'RAN Tankstelle', category_parent_id: 69 })).toBe(true)
  })

  it('deckt die wichtigsten Lebensmittelgruppen ab', () => {
    for (const id of [103, 104, 106, 107, 149, 191, 193]) {
      expect(FOOD_PARENT_IDS.has(id)).toBe(true)
    }
  })
})
