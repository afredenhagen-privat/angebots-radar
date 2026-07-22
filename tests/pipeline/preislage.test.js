import { describe, it, expect } from 'vitest'
import { preislage } from '../../src/lib/preislage.js'

describe('preislage', () => {
  it('erkennt den Bestpreis', () => {
    expect(preislage(1.79, 1.79, 2.79)).toMatchObject({ urteil: 'Bestpreis', gut: true })
    expect(preislage(1.5, 1.79, 2.79)).toMatchObject({ urteil: 'Bestpreis', gut: true })
  })

  it('stuft im unteren Drittel als sehr günstig ein', () => {
    expect(preislage(2.0, 1.79, 2.79)).toMatchObject({ urteil: 'Sehr günstig', gut: true })
  })

  it('stuft im oberen Bereich als eher teuer ein', () => {
    expect(preislage(2.7, 1.79, 2.79)).toMatchObject({ urteil: 'Eher teuer', gut: false })
  })

  it('urteilt lieber gar nicht, wenn die Datenlage es nicht hergibt', () => {
    expect(preislage(null, 1.79, 2.79)).toBeNull()
    expect(preislage(2.0, null, 2.79)).toBeNull()
    expect(preislage(2.0, 1.79, null)).toBeNull()
    // Normalpreis nicht über dem Tiefpreis -> keine sinnvolle Skala
    expect(preislage(2.0, 2.79, 2.79)).toBeNull()
    expect(preislage(2.0, 3.0, 2.79)).toBeNull()
  })

  it('deckelt Ausreisser auf 0..100', () => {
    expect(preislage(9.99, 1.79, 2.79).pct).toBe(100)
  })
})
