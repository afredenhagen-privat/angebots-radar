// tests/pipeline/telegram.test.js
import { describe, it, expect } from 'vitest'
import { formatAlert } from '../../pipeline/telegram.js'

const offer = {
  product: 'Feine Butter', brand: 'Meggle', retailer: 'Lidl',
  price: 1.39, old_price: 1.79, unit: 'kg', valid_to: '2026-07-25T21:59:00Z',
}

describe('formatAlert', () => {
  it('baut eine lesbare Nachricht mit Preis, Streichpreis und Gültigkeit', () => {
    const msg = formatAlert({ term: 'Butter' }, offer)
    expect(msg).toContain('Feine Butter')
    expect(msg).toContain('Meggle')
    expect(msg).toContain('Lidl')
    expect(msg).toContain('1,39')
    expect(msg).toContain('statt 1,79')
    expect(msg).toContain('25.07.')
  })
})
