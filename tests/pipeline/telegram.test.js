// tests/pipeline/telegram.test.js
import { describe, it, expect } from 'vitest'
import { formatDigest } from '../../pipeline/telegram.js'

const offer = (p, product, brand, retailer, extra = {}) => ({
  price: p,
  product,
  brand,
  retailer,
  unit: 'l',
  valid_to: '2026-07-25T21:59:00Z',
  ...extra,
})

describe('formatDigest', () => {
  const watch = { term: 'Hafermilch' }

  it('fasst mehrere Treffer in EINER Nachricht zusammen', () => {
    const msg = formatDigest(watch, [
      offer(1.29, 'Haferdrink', 'K-Bio', 'Kaufland'),
      offer(1.09, 'Haferdrink', 'Vemondo', 'Lidl'),
    ])
    expect(msg).toContain('Hafermilch — 2 neue Angebote')
    expect(msg).toContain('Vemondo')
    expect(msg).toContain('K-Bio')
    // Genau eine Nachricht — kein Spam pro Angebot.
    expect(msg.split('🛒').length - 1).toBe(1)
  })

  it('sortiert nach Preis, günstigstes zuerst', () => {
    const msg = formatDigest(watch, [
      offer(2.49, 'Barista', 'Alpro', 'REWE'),
      offer(1.09, 'Haferdrink', 'Vemondo', 'Lidl'),
    ])
    expect(msg.indexOf('1,09')).toBeLessThan(msg.indexOf('2,49'))
  })

  it('kürzt lange Listen und zählt den Rest', () => {
    const many = [1.1, 1.2, 1.3, 1.4, 1.5].map((p, i) => offer(p, `Drink ${i}`, 'Marke', 'Lidl'))
    expect(formatDigest(watch, many)).toContain('… und 2 weitere')
  })

  it('nutzt Einzahl bei genau einem Treffer', () => {
    expect(formatDigest(watch, [offer(1.09, 'Haferdrink', 'Vemondo', 'Lidl')]))
      .toContain('1 neues Angebot')
  })

  it('zeigt den Streichpreis, wenn vorhanden', () => {
    const msg = formatDigest(watch, [
      offer(1.09, 'Haferdrink', 'Vemondo', 'Lidl', { old_price: 1.79 }),
    ])
    expect(msg).toContain('statt 1,79')
  })
})
