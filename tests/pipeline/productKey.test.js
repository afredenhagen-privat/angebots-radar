import { describe, it, expect } from 'vitest'
import { productKey } from '../../shared/productKey.js'

describe('productKey', () => {
  it('normalisiert Gross-/Kleinschreibung und Leerraum', () => {
    expect(productKey('Kerrygold', 'Original Irische  Butter')).toBe(
      'kerrygold|original irische butter',
    )
    expect(productKey('  MEGGLE ', ' Feine Butter ')).toBe('meggle|feine butter')
  })

  it('gruppiert dasselbe Produkt trotz Schreibweise gleich', () => {
    expect(productKey('Kerrygold', 'Feine Butter')).toBe(productKey('kerrygold', 'FEINE  BUTTER'))
  })

  it('trennt unterschiedliche Marken', () => {
    expect(productKey('Kerrygold', 'Butter')).not.toBe(productKey('Meggle', 'Butter'))
  })

  it('verkraftet fehlende Marke', () => {
    expect(productKey(null, 'Butter')).toBe('|butter')
  })

  it('liefert null, wenn beides leer ist', () => {
    expect(productKey(null, null)).toBeNull()
    expect(productKey('', '   ')).toBeNull()
  })
})
