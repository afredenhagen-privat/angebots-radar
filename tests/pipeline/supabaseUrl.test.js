import { describe, it, expect } from 'vitest'
import { normalizeSupabaseUrl } from '../../shared/supabaseUrl.js'

describe('normalizeSupabaseUrl', () => {
  const clean = 'https://zpazkazqlaionvcpefjm.supabase.co'

  it('lässt eine korrekte Project-URL unverändert', () => {
    expect(normalizeSupabaseUrl(clean)).toBe(clean)
  })

  it('entfernt Trailing-Slashes', () => {
    expect(normalizeSupabaseUrl(clean + '/')).toBe(clean)
    expect(normalizeSupabaseUrl(clean + '///')).toBe(clean)
  })

  it('entfernt eine versehentlich kopierte Data-API-URL (/rest/v1)', () => {
    expect(normalizeSupabaseUrl(clean + '/rest/v1')).toBe(clean)
    expect(normalizeSupabaseUrl(clean + '/rest/v1/')).toBe(clean)
  })

  it('entfernt auch andere API-Pfade', () => {
    expect(normalizeSupabaseUrl(clean + '/auth/v1/')).toBe(clean)
    expect(normalizeSupabaseUrl(clean + '/storage/v1')).toBe(clean)
  })

  it('trimmt Leerzeichen', () => {
    expect(normalizeSupabaseUrl('  ' + clean + '  ')).toBe(clean)
  })

  it('verkraftet leere Werte', () => {
    expect(normalizeSupabaseUrl('')).toBe('')
    expect(normalizeSupabaseUrl(undefined)).toBe(undefined)
  })
})
