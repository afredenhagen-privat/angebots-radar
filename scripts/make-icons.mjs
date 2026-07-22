// scripts/make-icons.mjs
//
// Erzeugt die App-Icons (public/icon-192.png, icon-512.png) ohne externe
// Bildbibliothek — nur mit Node-Bordmitteln (zlib). Dadurch bleiben die Icons
// reproduzierbar und das Projekt frei von schweren nativen Abhängigkeiten.
//
//   npm run icons
//
// Motiv: ein Preisschild — das Thema der App auf die einfachste Form gebracht.
// Palette identisch zu tailwind.config.js.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(HERE, '..', 'public')

const DEEP = [0x1b, 0x3a, 0x6b] // Struktur-Blau
const PAPER = [0xed, 0xef, 0xf2] // Prospektpapier
const SIGNAL = [0xd7, 0x26, 0x3d] // Aktionsrot

// ---------------------------------------------------------------- PNG-Encoder

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // Filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ------------------------------------------------------------------- Zeichnen

/** Punkt-in-Polygon (even-odd), für die Preisschild-Silhouette. */
function inPolygon(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Farbe an einer Position (Koordinaten 0..1). Wird 4-fach übersampelt,
 * damit die Kanten glatt werden.
 */
function shade(u, v) {
  // Preisschild: Rechteck mit abgeschrägter linker Spitze, leicht gedreht.
  const cx = 0.5
  const cy = 0.5
  const a = (-12 * Math.PI) / 180
  const dx = u - cx
  const dy = v - cy
  const x = dx * Math.cos(a) - dy * Math.sin(a) + cx
  const y = dx * Math.sin(a) + dy * Math.cos(a) + cy

  // Breiter als hoch, damit die Form als Preisschild und nicht als Haus liest.
  const tag = [
    [0.22, 0.50], // Spitze links
    [0.39, 0.31],
    [0.81, 0.31],
    [0.81, 0.69],
    [0.39, 0.69],
  ]

  if (inPolygon(x, y, tag)) {
    // Loch nahe der Spitze
    const hx = x - 0.425
    const hy = y - 0.5
    if (Math.hypot(hx, hy) < 0.042) return DEEP
    // Roter Balken als Preisstrich
    if (x > 0.53 && x < 0.76 && y > 0.445 && y < 0.555) return SIGNAL
    return PAPER
  }
  return DEEP
}

function render(size) {
  const SS = 4 // Supersampling
  const buf = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size
          const v = (py + (sy + 0.5) / SS) / size
          const c = shade(u, v)
          r += c[0]; g += c[1]; b += c[2]
        }
      }
      const n = SS * SS
      const o = (py * size + px) * 4
      buf[o] = Math.round(r / n)
      buf[o + 1] = Math.round(g / n)
      buf[o + 2] = Math.round(b / n)
      buf[o + 3] = 255
    }
  }
  return encodePng(size, size, buf)
}

mkdirSync(PUBLIC, { recursive: true })
for (const size of [192, 512]) {
  const file = resolve(PUBLIC, `icon-${size}.png`)
  writeFileSync(file, render(size))
  console.log(`geschrieben: ${file}`)
}
