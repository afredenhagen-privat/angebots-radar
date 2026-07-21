// tests/pipeline/normalize.test.js
import { describe, it, expect } from 'vitest'
import { normalizeOffer } from '../../pipeline/marktguru/normalize.js'
import raw from './fixtures/offer.json' assert { type: 'json' }

describe('normalizeOffer', () => {
  it('mappt die relevanten Felder in unser DB-Schema', () => {
    const n = normalizeOffer(raw, { zipCode: '97070', term: 'Butter' })
    expect(n).toEqual({
      id: '24087872',
      retailer: 'Lidl',
      product: 'Feine Butter',
      brand: 'Meggle',
      price: 1.39,
      old_price: 1.79,
      reference_price: 1.39,
      unit: 'kg',
      valid_from: '2026-07-22T22:00:00Z',
      valid_to: '2026-07-25T21:59:00Z',
      zip_code: '97070',
      image_id: '24087872',
      category: 'Butter',
    })
  })

  it('verkraftet fehlende Felder ohne zu crashen', () => {
    const n = normalizeOffer({ id: 5 }, { zipCode: '97204', term: 'Käse' })
    expect(n.id).toBe('5')
    expect(n.retailer).toBeNull()
    expect(n.product).toBeNull()
  })
})
