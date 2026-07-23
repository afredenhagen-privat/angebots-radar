// tests/pipeline/normalize.test.js
import { describe, it, expect } from 'vitest'
import { normalizeOffer } from '../../pipeline/marktguru/normalize.js'
import raw from './fixtures/offer.json' with { type: 'json' }

describe('normalizeOffer', () => {
  it('mappt die relevanten Felder in unser DB-Schema', () => {
    const n = normalizeOffer(raw, { zipCode: '97070', term: 'Butter' })
    expect(n).toEqual({
      id: '24087872',
      retailer: 'Lidl',
      product: 'Feine Butter',
      brand: 'Meggle',
      product_key: 'meggle|feine butter',
      price: 1.39,
      old_price: 1.79,
      reference_price: 1.39,
      unit_price: 1.39,
      unit_old_price: 1.79,
      unit: 'kg',
      category_id: null,
      category_parent_id: null,
      valid_from: '2026-07-22T22:00:00Z',
      valid_to: '2026-07-25T21:59:00Z',
      zip_code: '97070',
      image_id: '24087872',
      category: 'Butter',
    })
  })

  it('nimmt den Grundpreis als Vergleichsbasis, nicht den Packungspreis', () => {
    // Echter Fall: Kerrygold 1,99 € je Packung = 24,88 €/kg.
    // Ohne diese Unterscheidung vergleicht die Statistik Packungsgrößen.
    const n = normalizeOffer(
      { id: 1, price: 1.99, oldPrice: 2.49, referencePrice: 24.88, unit: { shortName: 'kg' } },
      { zipCode: '97070', term: 'Butter' },
    )
    expect(n.price).toBe(1.99)
    expect(n.unit_price).toBe(24.88)
    // Streichpreis mit demselben Faktor umgerechnet: 2,49 * (24,88/1,99)
    expect(n.unit_old_price).toBeCloseTo(31.13, 2)
  })

  it('fällt auf den Packungspreis zurück, wenn kein Grundpreis geliefert wird', () => {
    const n = normalizeOffer({ id: 2, price: 0.99, oldPrice: 1.49 }, { zipCode: '97070', term: 'x' })
    expect(n.unit_price).toBe(0.99)
    expect(n.unit_old_price).toBe(1.49)
  })

  it('übernimmt die Kategorie für den Lebensmittel-Filter', () => {
    const n = normalizeOffer(
      { id: 3, categories: [{ id: 166, name: 'Butter', parentId: 107 }] },
      { zipCode: '97070', term: 'Butter' },
    )
    expect(n.category_id).toBe(166)
    expect(n.category_parent_id).toBe(107)
  })

  it('verkraftet fehlende Felder ohne zu crashen', () => {
    const n = normalizeOffer({ id: 5 }, { zipCode: '97204', term: 'Käse' })
    expect(n.id).toBe('5')
    expect(n.retailer).toBeNull()
    expect(n.product).toBeNull()
    expect(n.product_key).toBeNull()
    expect(n.unit_price).toBeNull()
  })
})
