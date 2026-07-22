// src/lib/format.js
export const eur = (n) => n == null ? '' : Number(n).toFixed(2).replace('.', ',') + ' €'
export const datum = (iso) => iso ? `${iso.slice(8,10)}.${iso.slice(5,7)}.${iso.slice(0,4)}` : ''
