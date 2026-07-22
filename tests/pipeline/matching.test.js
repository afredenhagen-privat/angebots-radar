// tests/pipeline/matching.test.js
import { describe, it, expect } from 'vitest'
import { offerMatchesTerm, offerMatchesEntry } from '../../shared/matching.js'

const hafer = { product: 'Haferdrink', brand: 'Vemondo', product_key: 'vemondo|haferdrink', price: 1.09 }
const kaufland = { product: 'Haferdrink', brand: 'K-Bio', product_key: 'k-bio|haferdrink', price: 1.29 }
const kekse = { product: 'Haferkekse', brand: 'Bahlsen', product_key: 'bahlsen|haferkekse', price: 1.49 }

describe('offerMatchesTerm', () => {
  it('matcht case-insensitive gegen Produkt + Marke', () => {
    expect(offerMatchesTerm(hafer, 'hafer')).toBe(true)
    expect(offerMatchesTerm(hafer, 'VEMONDO')).toBe(true)
    expect(offerMatchesTerm(hafer, 'butter')).toBe(false)
  })
})

describe('offerMatchesEntry — Korb aus konkreten Produkten', () => {
  const korb = {
    term: 'Hafermilch',
    product_keys: ['vemondo|haferdrink', 'k-bio|haferdrink'],
    target_price: null,
  }

  it('nimmt genau die Produkte im Korb', () => {
    expect(offerMatchesEntry(hafer, korb)).toBe(true)
    expect(offerMatchesEntry(kaufland, korb)).toBe(true)
  })

  it('schliesst Namensverwandte aus, die nicht im Korb liegen', () => {
    // Genau der Fehlalarm, den eine Freitextsuche nach "Hafer" produziert hätte.
    expect(offerMatchesEntry(kekse, korb)).toBe(false)
  })

  it('ignoriert Angebote ohne Produkt-Schlüssel', () => {
    expect(offerMatchesEntry({ product: 'Haferdrink', price: 1 }, korb)).toBe(false)
  })

  it('beachtet das Preislimit', () => {
    const limitiert = { ...korb, target_price: 1.2 }
    expect(offerMatchesEntry(hafer, limitiert)).toBe(true)
    expect(offerMatchesEntry(kaufland, limitiert)).toBe(false)
  })
})

describe('offerMatchesEntry — Rückfallebene Freitext', () => {
  const alt = { term: 'Hafer', product_keys: [], target_price: null }

  it('matcht weiterhin per Teilstring, wenn kein Korb gefüllt ist', () => {
    expect(offerMatchesEntry(hafer, alt)).toBe(true)
    expect(offerMatchesEntry(kekse, alt)).toBe(true)
  })

  it('beachtet auch dort das Preislimit', () => {
    expect(offerMatchesEntry(kekse, { ...alt, target_price: 1.2 })).toBe(false)
  })
})
