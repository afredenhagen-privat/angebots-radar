// tests/pipeline/keys.test.js
import { describe, it, expect } from 'vitest'
import { extractKeys } from '../../pipeline/marktguru/keys.js'

const HTML = `<html><head></head><body>
<script type="application/json">{"config":{"apiHostAddress":"api.marktguru.de","apiKey":"AAA123","clientKey":"BBB456"},"other":true}</script>
</body></html>`

describe('extractKeys', () => {
  it('parst apiKey, clientKey und host aus dem Config-Script-Block', () => {
    expect(extractKeys(HTML)).toEqual({
      apiKey: 'AAA123',
      clientKey: 'BBB456',
      host: 'api.marktguru.de',
    })
  })

  it('wirft, wenn kein Config-Block da ist', () => {
    expect(() => extractKeys('<html></html>')).toThrow(/config/i)
  })
})
