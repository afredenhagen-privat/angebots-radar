// tests/pipeline/matching.test.js
import { describe, it, expect } from 'vitest'
import { offerMatchesTerm, offerMatchesWatch } from '../../pipeline/matching.js'

const offer = { product: 'Feine Butter', brand: 'Meggle', price: 1.39 }

describe('offerMatchesTerm', () => {
  it('matcht case-insensitive gegen Produkt + Marke', () => {
    expect(offerMatchesTerm(offer, 'butter')).toBe(true)
    expect(offerMatchesTerm(offer, 'MEGGLE')).toBe(true)
    expect(offerMatchesTerm(offer, 'kaffee')).toBe(false)
  })
})

describe('offerMatchesWatch', () => {
  it('ohne target_price: Treffer sobald Begriff passt', () => {
    expect(offerMatchesWatch(offer, { term: 'butter', target_price: null })).toBe(true)
  })
  it('mit target_price: nur wenn Preis darunter', () => {
    expect(offerMatchesWatch(offer, { term: 'butter', target_price: 1.5 })).toBe(true)
    expect(offerMatchesWatch(offer, { term: 'butter', target_price: 1.0 })).toBe(false)
  })
})
