import { describe, it, expect } from 'vitest'
import { dedupeOffers } from '../../shared/dedupe.js'

const basis = {
  product_key: 'thisisnobrand123|avocados hass',
  retailer: 'EDEKA',
  price: 1.0,
  valid_from: '2026-07-20T22:00:00Z',
  valid_to: '2026-07-25T21:59:00Z',
}

describe('dedupeOffers', () => {
  it('wirft dasselbe Angebot mit anderer ID weg', () => {
    // Genau der Fall: dieselbe Aktion, einmal je abgefragter PLZ geliefert.
    const raus = dedupeOffers([
      { ...basis, id: '111', zip_code: '97070' },
      { ...basis, id: '222', zip_code: '97204' },
    ])
    expect(raus).toHaveLength(1)
    expect(raus[0].id).toBe('111') // erste Fundstelle gewinnt
  })

  it('behält echte Unterschiede', () => {
    const raus = dedupeOffers([
      { ...basis, id: '1' },
      { ...basis, id: '2', price: 1.29 }, // anderer Preis
      { ...basis, id: '3', retailer: 'PENNY' }, // anderer Händler
      { ...basis, id: '4', valid_to: '2026-08-01T21:59:00Z' }, // anderer Zeitraum
    ])
    expect(raus).toHaveLength(4)
  })

  it('unterscheidet verschiedene Produkte', () => {
    const raus = dedupeOffers([
      { ...basis, id: '1' },
      { ...basis, id: '2', product_key: 'koelln|haferflocken' },
    ])
    expect(raus).toHaveLength(2)
  })

  it('verkraftet leere Eingaben', () => {
    expect(dedupeOffers([])).toEqual([])
    expect(dedupeOffers(undefined)).toEqual([])
  })
})
