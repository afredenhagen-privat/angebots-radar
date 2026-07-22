// src/lib/preislage.js

/**
 * Ordnet einen aktuellen Preis zwischen beobachtetem Tiefpreis und Normalpreis
 * ein — die Antwort auf "ist das gerade günstig?".
 *
 * Liefert null, wenn die Datenlage kein Urteil hergibt (fehlende Werte oder
 * Normalpreis nicht über dem Tiefpreis). Lieber keine Aussage als eine falsche.
 */
export function preislage(current, low, normal) {
  if (current == null || low == null || normal == null) return null
  const c = Number(current)
  const l = Number(low)
  const n = Number(normal)
  if (!Number.isFinite(c) || !Number.isFinite(l) || !Number.isFinite(n) || n <= l) return null

  const pct = Math.min(100, Math.max(0, ((c - l) / (n - l)) * 100))
  if (c <= l) return { pct, urteil: 'Bestpreis', gut: true }
  if (pct <= 33) return { pct, urteil: 'Sehr günstig', gut: true }
  if (pct <= 66) return { pct, urteil: 'Normal für ein Angebot', gut: false }
  return { pct, urteil: 'Eher teuer', gut: false }
}
