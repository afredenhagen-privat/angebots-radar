# Angebots-Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine gemeinsam genutzte PWA, die täglich Supermarkt-Angebote (PLZ 97204 + 97070) aus Marktguru zieht, gegen eine geteilte Merkliste matcht und Treffer per Telegram meldet.

**Architecture:** Ein Node.js-Pipeline-Skript läuft als GitHub-Actions-Cron (täglich): es holt Marktguru-Angebote, normalisiert sie, schreibt sie in eine Supabase-Postgres-DB, matcht gegen die Merkliste und verschickt neue Treffer per Telegram (Empfänger via `getUpdates` geharvestet, Doppel-Pings via `alerts_sent` verhindert). Eine Vue-3-PWA (GitHub Pages) liest die Daten aus Supabase (ein geteiltes Haushalts-Login), pflegt die Merkliste mit Realtime-Sync und zeigt Treffer & alle Angebote an.

**Tech Stack:** Node.js (Pipeline, JS), Vitest (Tests), Supabase (Postgres/Auth/Realtime), Vue 3 + Vite + Pinia + Tailwind + vite-plugin-pwa, `@supabase/supabase-js`, Telegram Bot API, GitHub Actions, GitHub Pages. **Durchgehend JavaScript, kein TypeScript.**

**Deviation vom Spec:** Pipeline läuft als GitHub-Actions-Cron (Node) statt Supabase-Edge-Function — bessere JS-only-Treue und Testbarkeit; Supabase bleibt Datenschicht. Telegram-Empfänger werden per `getUpdates`-Polling im Cron erfasst (kein Webhook-Server).

---

## File Structure

```
angebots-radar/
├─ package.json                      # deps + scripts (dev, build, test)
├─ vite.config.js                    # Vite + vite-plugin-pwa
├─ vitest.config.js                  # Test-Runner
├─ tailwind.config.js / postcss.config.js
├─ .env.example                      # dokumentiert benötigte Secrets
├─ index.html
├─ supabase/
│  └─ schema.sql                     # Tabellen + RLS (im Dashboard-SQL-Editor auszuführen)
├─ pipeline/                         # Node-Cron-Logik (reine, testbare JS-Module)
│  ├─ marktguru/
│  │  ├─ keys.js                     # extractKeys(html)
│  │  ├─ client.js                   # fetchKeys(), searchOffers()
│  │  └─ normalize.js                # normalizeOffer(raw, ctx)
│  ├─ matching.js                    # offerMatchesTerm/Watch
│  ├─ telegram.js                    # formatAlert(), harvestChatIds(), sendMessage()
│  ├─ categories.js                  # kuratierte Kategorienliste
│  ├─ run.js                         # Orchestrierung (der Cron-Einstiegspunkt)
│  └─ supabaseAdmin.js               # Service-Role-Client für die Pipeline
├─ tests/pipeline/                   # Vitest-Specs + Fixtures
│  ├─ keys.test.js
│  ├─ normalize.test.js
│  ├─ matching.test.js
│  ├─ telegram.test.js
│  └─ fixtures/
├─ src/                              # Vue-PWA-Frontend
│  ├─ main.js
│  ├─ App.vue
│  ├─ supabase.js                    # Anon-Client
│  ├─ stores/watchlist.js            # Pinia: Merkliste + Realtime
│  ├─ stores/offers.js               # Pinia: Angebote laden
│  ├─ stores/auth.js                 # Login-State
│  ├─ views/LoginView.vue
│  ├─ views/MerkzettelView.vue
│  ├─ views/AngeboteView.vue
│  ├─ views/SettingsView.vue
│  └─ components/OfferCard.vue
└─ .github/workflows/pipeline.yml    # Cron-Workflow
```

---

## Phase 0 — Projekt-Scaffolding

### Task 0.1: Repo & package.json

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`

- [ ] **Step 1: package.json anlegen**

```json
{
  "name": "angebots-radar",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "pipeline": "node pipeline/run.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "pinia": "^2.2.0",
    "vue": "^3.4.0",
    "vue-router": "^4.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: .gitignore anlegen**

```
node_modules
dist
.env
.env.local
*.log
```

- [ ] **Step 3: .env.example anlegen** (dokumentiert alle Secrets; echte `.env` bleibt lokal/ungetrackt)

```
# Frontend (öffentlich, ins Bundle)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Pipeline (nur GitHub-Actions-Secrets, NIE ins Frontend)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
ZIP_CODES=97204,97070
```

- [ ] **Step 4: Dependencies installieren**

Run: `npm install`
Expected: `node_modules` entsteht, kein Fehler.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore .env.example
git commit -m "chore: scaffold project (package.json, gitignore, env template)"
```

### Task 0.2: Vitest-Konfiguration

**Files:**
- Create: `vitest.config.js`

- [ ] **Step 1: vitest.config.js anlegen**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
```

- [ ] **Step 2: Smoke-Test, dass Vitest läuft**

Run: `npx vitest run`
Expected: „No test files found" (kein Crash) — bestätigt, dass Vitest installiert ist.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.js
git commit -m "chore: add vitest config"
```

---

## Phase 1 — Marktguru-Client (reine Logik, TDD)

### Task 1.1: API-Keys aus Homepage extrahieren

**Files:**
- Create: `pipeline/marktguru/keys.js`
- Test: `tests/pipeline/keys.test.js`

- [ ] **Step 1: Failing Test schreiben**

```js
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/pipeline/keys.test.js`
Expected: FAIL — `extractKeys` ist nicht definiert.

- [ ] **Step 3: Minimal-Implementierung**

```js
// pipeline/marktguru/keys.js
export function extractKeys(html) {
  const blocks = [...html.matchAll(/<script type="application\/json">([\s\S]*?)<\/script>/g)]
  for (const [, json] of blocks) {
    let parsed
    try { parsed = JSON.parse(json) } catch { continue }
    const cfg = parsed?.config
    if (cfg?.apiKey && cfg?.clientKey) {
      return {
        apiKey: cfg.apiKey,
        clientKey: cfg.clientKey,
        host: cfg.apiHostAddress ?? 'api.marktguru.de',
      }
    }
  }
  throw new Error('marktguru: config block with apiKey/clientKey not found')
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npx vitest run tests/pipeline/keys.test.js`
Expected: PASS (beide Tests grün).

- [ ] **Step 5: Commit**

```bash
git add pipeline/marktguru/keys.js tests/pipeline/keys.test.js
git commit -m "feat(pipeline): extract marktguru api keys from homepage"
```

### Task 1.2: Angebot normalisieren

**Files:**
- Create: `pipeline/marktguru/normalize.js`
- Test: `tests/pipeline/normalize.test.js`, `tests/pipeline/fixtures/offer.json`

- [ ] **Step 1: Fixture aus echter Spike-Struktur anlegen**

```json
// tests/pipeline/fixtures/offer.json
{
  "id": 24087872,
  "product": { "name": "Feine Butter" },
  "brand": { "name": "Meggle" },
  "description": "Feine Butter",
  "price": 1.39,
  "oldPrice": 1.79,
  "referencePrice": 1.39,
  "unit": { "shortName": "kg", "name": "Kilogramm" },
  "advertisers": [{ "uniqueName": "lidl", "name": "Lidl" }],
  "validityDates": [{ "from": "2026-07-22T22:00:00Z", "to": "2026-07-25T21:59:00Z" }]
}
```

- [ ] **Step 2: Failing Test schreiben**

```js
// tests/pipeline/normalize.test.js
import { describe, it, expect } from 'vitest'
import { normalizeOffer } from '../../pipeline/marktguru/normalize.js'
import raw from './fixtures/offer.json' assert { type: 'json' }

describe('normalizeOffer', () => {
  it('mappt die relevanten Felder in unser DB-Schema', () => {
    const n = normalizeOffer(raw, { zipCode: '97070', term: 'Butter' })
    expect(n).toEqual({
      id: '24087872',
      retailer: 'Lidl',
      product: 'Feine Butter',
      brand: 'Meggle',
      price: 1.39,
      old_price: 1.79,
      reference_price: 1.39,
      unit: 'kg',
      valid_from: '2026-07-22T22:00:00Z',
      valid_to: '2026-07-25T21:59:00Z',
      zip_code: '97070',
      image_id: '24087872',
      category: 'Butter',
    })
  })

  it('verkraftet fehlende Felder ohne zu crashen', () => {
    const n = normalizeOffer({ id: 5 }, { zipCode: '97204', term: 'Käse' })
    expect(n.id).toBe('5')
    expect(n.retailer).toBeNull()
    expect(n.product).toBeNull()
  })
})
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/pipeline/normalize.test.js`
Expected: FAIL — `normalizeOffer` nicht definiert.

- [ ] **Step 4: Implementierung**

```js
// pipeline/marktguru/normalize.js
export function normalizeOffer(raw, { zipCode, term }) {
  const advertiser = raw.advertisers?.[0]
  const validity = raw.validityDates?.[0]
  return {
    id: String(raw.id),
    retailer: advertiser?.name ?? null,
    product: raw.product?.name ?? raw.description ?? null,
    brand: raw.brand?.name ?? null,
    price: raw.price ?? null,
    old_price: raw.oldPrice ?? null,
    reference_price: raw.referencePrice ?? null,
    unit: raw.unit?.shortName ?? null,
    valid_from: validity?.from ?? null,
    valid_to: validity?.to ?? null,
    zip_code: String(zipCode),
    image_id: String(raw.id),
    category: term,
  }
}
```

- [ ] **Step 5: Test laufen lassen, Erfolg prüfen**

Run: `npx vitest run tests/pipeline/normalize.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/marktguru/normalize.js tests/pipeline/normalize.test.js tests/pipeline/fixtures/offer.json
git commit -m "feat(pipeline): normalize marktguru offer to db schema"
```

### Task 1.3: HTTP-Client (Keys holen + Offers suchen)

**Files:**
- Create: `pipeline/marktguru/client.js`

*(Netzwerk-I/O — nicht unit-getestet, wird im echten Cron-Lauf in Task 5.2 verifiziert. Logikkerne sind bereits durch 1.1/1.2 abgedeckt.)*

- [ ] **Step 1: client.js implementieren**

```js
// pipeline/marktguru/client.js
import { extractKeys } from './keys.js'

const HOME = 'https://www.marktguru.de/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

export async function fetchKeys() {
  const res = await fetch(HOME, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`marktguru homepage ${res.status}`)
  return extractKeys(await res.text())
}

export async function searchOffers({ apiKey, clientKey, host }, term, zipCode, limit = 200) {
  const url = `https://${host}/api/v1/offers/search?as=web&q=${encodeURIComponent(term)}&zipCode=${zipCode}&limit=${limit}&offset=0`
  const res = await fetch(url, {
    headers: { 'x-apikey': apiKey, 'x-clientkey': clientKey, 'User-Agent': UA, Accept: 'application/json' },
  })
  if (res.status === 456) throw new Error('marktguru rate-limited (456)')
  if (!res.ok) throw new Error(`marktguru search ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
```

- [ ] **Step 2: Manueller Live-Check (throwaway)**

Run:
```bash
node -e "import('./pipeline/marktguru/client.js').then(async m => { const k = await m.fetchKeys(); const o = await m.searchOffers(k, 'butter', '97070', 3); console.log(o.length, o[0]?.product?.name, o[0]?.advertisers?.[0]?.name) })"
```
Expected: eine Zahl > 0 und ein Produkt-/Händlername (z.B. `29 "Feine Butter" "Lidl"`). Bei `456` kurz warten und erneut.

- [ ] **Step 3: Commit**

```bash
git add pipeline/marktguru/client.js
git commit -m "feat(pipeline): marktguru http client (fetchKeys, searchOffers)"
```

### Task 1.4: Kuratierte Kategorienliste

**Files:**
- Create: `pipeline/categories.js`

- [ ] **Step 1: categories.js anlegen**

```js
// pipeline/categories.js
// Startwert für den Stöber-Tab; jederzeit erweiterbar.
export const CATEGORIES = [
  'Butter', 'Käse', 'Milch', 'Joghurt', 'Eier', 'Kaffee', 'Hähnchen',
  'Hackfleisch', 'Wurst', 'Brot', 'Nudeln', 'Reis', 'Öl', 'Tomaten',
  'Äpfel', 'Bananen', 'Schokolade', 'Chips', 'Bier', 'Wasser',
  'Spülmittel', 'Waschmittel', 'Toilettenpapier', 'Windeln',
]
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/categories.js
git commit -m "feat(pipeline): curated category list for browse tab"
```

---

## Phase 2 — Supabase-Datenschicht

### Task 2.1: Supabase-Projekt & Schema (manuell + SQL)

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Supabase-Projekt anlegen** (manuell, im Dashboard)
  - Auf https://supabase.com neues Projekt „angebots-radar" erstellen (Region EU).
  - Aus *Project Settings → API* notieren: `Project URL`, `anon`-Key, `service_role`-Key.

- [ ] **Step 2: Geteilten Haushalts-User anlegen** (manuell)
  - *Authentication → Users → Add user*: eine gemeinsame E-Mail + Passwort. „Auto-confirm" aktivieren.
  - Die User-UUID notieren (wird für RLS-Checks nicht zwingend gebraucht, aber gut zu kennen).

- [ ] **Step 3: schema.sql schreiben**

```sql
-- supabase/schema.sql
-- Ausführen im Supabase SQL-Editor.

create table if not exists offers (
  id text primary key,
  retailer text,
  product text,
  brand text,
  price numeric,
  old_price numeric,
  reference_price numeric,
  unit text,
  valid_from timestamptz,
  valid_to timestamptz,
  zip_code text,
  image_id text,
  category text,
  fetched_at timestamptz not null default now()
);

create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  target_price numeric,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists alerts_sent (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references watchlist(id) on delete cascade,
  offer_id text references offers(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (watchlist_id, offer_id)
);

create table if not exists telegram_subscribers (
  chat_id text primary key,
  name text,
  added_at timestamptz not null default now()
);

-- RLS: eingeloggte (authenticated) Nutzer dürfen alles lesen/schreiben.
-- Da es nur EIN geteiltes Haushalts-Login gibt, ist "authenticated" = unser Haushalt.
alter table offers enable row level security;
alter table watchlist enable row level security;
alter table alerts_sent enable row level security;
alter table telegram_subscribers enable row level security;

create policy "household read/write offers" on offers
  for all to authenticated using (true) with check (true);
create policy "household read/write watchlist" on watchlist
  for all to authenticated using (true) with check (true);
create policy "household read alerts" on alerts_sent
  for select to authenticated using (true);
create policy "household read subs" on telegram_subscribers
  for select to authenticated using (true);

-- Realtime für die Merkliste aktivieren.
alter publication supabase_realtime add table watchlist;
```

- [ ] **Step 4: SQL ausführen** (manuell, SQL-Editor) und prüfen, dass die 4 Tabellen unter *Table Editor* erscheinen.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(db): supabase schema, RLS and realtime for watchlist"
```

### Task 2.2: Service-Role-Client für die Pipeline

**Files:**
- Create: `pipeline/supabaseAdmin.js`

- [ ] **Step 1: supabaseAdmin.js anlegen**

```js
// pipeline/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen')

// Service-Role umgeht RLS — nur serverseitig (Cron), nie im Frontend.
export const admin = createClient(url, key, { auth: { persistSession: false } })
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/supabaseAdmin.js
git commit -m "feat(pipeline): supabase service-role client"
```

---

## Phase 3 — Matching & Telegram (reine Logik, TDD)

### Task 3.1: Match-Prädikate

**Files:**
- Create: `pipeline/matching.js`
- Test: `tests/pipeline/matching.test.js`

- [ ] **Step 1: Failing Test schreiben**

```js
// tests/pipeline/matching.test.js
import { describe, it, expect } from 'vitest'
import { offerMatchesTerm, offerMatchesWatch } from '../../pipeline/matching.js'

const offer = { product: 'Feine Butter', brand: 'Meggle', price: 1.39 }

describe('offerMatchesTerm', () => {
  it('matcht case-insensitive gegen Produkt + Marke', () => {
    expect(offerMatchesTerm(offer, 'butter')).toBe(true)
    expect(offerMatchesTerm(offer, 'MEGGLE')).toBe(true)
    expect(offerMatchesTerm(offer, 'kaffee')).toBe(false)
  })
})

describe('offerMatchesWatch', () => {
  it('ohne target_price: Treffer sobald Begriff passt', () => {
    expect(offerMatchesWatch(offer, { term: 'butter', target_price: null })).toBe(true)
  })
  it('mit target_price: nur wenn Preis darunter', () => {
    expect(offerMatchesWatch(offer, { term: 'butter', target_price: 1.5 })).toBe(true)
    expect(offerMatchesWatch(offer, { term: 'butter', target_price: 1.0 })).toBe(false)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/pipeline/matching.test.js`
Expected: FAIL — Funktionen nicht definiert.

- [ ] **Step 3: Implementierung**

```js
// pipeline/matching.js
export function offerMatchesTerm(offer, term) {
  const hay = `${offer.product ?? ''} ${offer.brand ?? ''}`.toLowerCase()
  return hay.includes(String(term).trim().toLowerCase())
}

export function offerMatchesWatch(offer, watch) {
  if (!offerMatchesTerm(offer, watch.term)) return false
  if (watch.target_price != null) {
    return offer.price != null && Number(offer.price) < Number(watch.target_price)
  }
  return true
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npx vitest run tests/pipeline/matching.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/matching.js tests/pipeline/matching.test.js
git commit -m "feat(pipeline): watchlist match predicates"
```

### Task 3.2: Telegram — Nachricht formatieren

**Files:**
- Create: `pipeline/telegram.js` (Teil 1: `formatAlert` + `escapeMd`)
- Test: `tests/pipeline/telegram.test.js`

- [ ] **Step 1: Failing Test schreiben**

```js
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/pipeline/telegram.test.js`
Expected: FAIL — `formatAlert` nicht definiert.

- [ ] **Step 3: Implementierung (Teil 1 von telegram.js)**

```js
// pipeline/telegram.js
const eur = (n) => Number(n).toFixed(2).replace('.', ',')

export function escapeMd(s) {
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
}

export function formatAlert(watch, offer) {
  const priceUnit = offer.unit ? `/${offer.unit}` : ''
  const price = offer.price != null ? `${eur(offer.price)} €${priceUnit}` : 'Preis?'
  const was = offer.old_price != null ? ` (statt ${eur(offer.old_price)} €)` : ''
  let until = ''
  if (offer.valid_to) {
    const d = offer.valid_to
    until = ` – gültig bis ${d.slice(8, 10)}.${d.slice(5, 7)}.`
  }
  const title = escapeMd(offer.product ?? watch.term)
  const brand = offer.brand ? ` \\(${escapeMd(offer.brand)}\\)` : ''
  const retailer = escapeMd(offer.retailer ?? '')
  return `🛒 *${title}*${brand}\n${retailer}: ${escapeMd(price)}${escapeMd(was)}${escapeMd(until)}`
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npx vitest run tests/pipeline/telegram.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipeline/telegram.js tests/pipeline/telegram.test.js
git commit -m "feat(pipeline): format telegram alert message"
```

### Task 3.3: Telegram — Versand & Empfänger-Harvest

**Files:**
- Modify: `pipeline/telegram.js` (Teil 2: `sendMessage`, `harvestChatIds`)

*(Netzwerk-I/O gegen die Telegram-API — im echten Lauf in Task 5.2 verifiziert.)*

- [ ] **Step 1: sendMessage + harvestChatIds ergänzen**

```js
// pipeline/telegram.js  (an die bestehende Datei anhängen)
const API = (token) => `https://api.telegram.org/bot${token}`

export async function sendMessage(token, chatId, text) {
  const res = await fetch(`${API(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
  })
  if (!res.ok) throw new Error(`telegram sendMessage ${res.status}: ${await res.text()}`)
}

// Liest neue /start-Nachrichten via getUpdates und liefert {chat_id, name}[].
export async function harvestChatIds(token) {
  const res = await fetch(`${API(token)}/getUpdates`)
  if (!res.ok) throw new Error(`telegram getUpdates ${res.status}`)
  const { result = [] } = await res.json()
  const found = new Map()
  for (const u of result) {
    const chat = u.message?.chat
    if (chat?.id) {
      found.set(String(chat.id), chat.first_name ?? chat.title ?? null)
    }
  }
  return [...found.entries()].map(([chat_id, name]) => ({ chat_id, name }))
}
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/telegram.js
git commit -m "feat(pipeline): telegram send + harvest chat ids via getUpdates"
```

---

## Phase 4 — Pipeline-Orchestrierung

### Task 4.1: run.js — der Cron-Einstiegspunkt

**Files:**
- Create: `pipeline/run.js`

- [ ] **Step 1: run.js implementieren**

```js
// pipeline/run.js
import { admin } from './supabaseAdmin.js'
import { fetchKeys, searchOffers, sleep } from './marktguru/client.js'
import { normalizeOffer } from './marktguru/normalize.js'
import { offerMatchesWatch } from './matching.js'
import { formatAlert, sendMessage, harvestChatIds } from './telegram.js'
import { CATEGORIES } from './categories.js'

const ZIPS = (process.env.ZIP_CODES ?? '97204,97070').split(',').map((z) => z.trim())
const TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function main() {
  // 1. Merkliste laden
  const { data: watchlist = [], error: wErr } = await admin.from('watchlist').select('*')
  if (wErr) throw wErr

  // 2. Begriffsliste = Merkzettel-Begriffe ∪ Kategorien
  const terms = [...new Set([...watchlist.map((w) => w.term), ...CATEGORIES])]

  // 3. Angebote ziehen (gedrosselt)
  const keys = await fetchKeys()
  const offersById = new Map()
  for (const zip of ZIPS) {
    for (const term of terms) {
      try {
        const raw = await searchOffers(keys, term, zip)
        for (const o of raw) {
          const n = normalizeOffer(o, { zipCode: zip, term })
          offersById.set(n.id, n) // dedupe über Begriffe/PLZ hinweg
        }
      } catch (e) {
        console.warn(`skip ${term}@${zip}: ${e.message}`)
      }
      await sleep(400) // Rate-Limit schonen
    }
  }
  const offers = [...offersById.values()]
  console.log(`Angebote gesammelt: ${offers.length}`)

  // 4. Upsert in offers
  if (offers.length) {
    const { error } = await admin.from('offers').upsert(offers, { onConflict: 'id' })
    if (error) throw error
  }

  // 5. Abgelaufene Angebote entfernen
  await admin.from('offers').delete().lt('valid_to', new Date().toISOString())

  // 6. Telegram-Empfänger aktualisieren
  if (TOKEN) {
    const subs = await harvestChatIds(TOKEN)
    if (subs.length) await admin.from('telegram_subscribers').upsert(subs, { onConflict: 'chat_id' })
  }
  const { data: subscribers = [] } = await admin.from('telegram_subscribers').select('*')

  // 7. Matching + Alerts
  const { data: alreadySent = [] } = await admin.from('alerts_sent').select('watchlist_id, offer_id')
  const sentKey = new Set(alreadySent.map((a) => `${a.watchlist_id}:${a.offer_id}`))

  for (const watch of watchlist) {
    for (const offer of offers) {
      const key = `${watch.id}:${offer.id}`
      if (sentKey.has(key)) continue
      if (!offerMatchesWatch(offer, watch)) continue

      if (TOKEN) {
        for (const sub of subscribers) {
          try { await sendMessage(TOKEN, sub.chat_id, formatAlert(watch, offer)) }
          catch (e) { console.warn(`telegram fail ${sub.chat_id}: ${e.message}`) }
        }
      }
      await admin.from('alerts_sent').insert({ watchlist_id: watch.id, offer_id: offer.id })
      sentKey.add(key)
    }
  }
  console.log('Pipeline fertig.')
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/run.js
git commit -m "feat(pipeline): orchestrate fetch, upsert, match and telegram alerts"
```

### Task 4.2: Telegram-Bot anlegen (manuell)

- [ ] **Step 1: Bot erstellen**
  - In Telegram mit **@BotFather** chatten: `/newbot`, Namen + Username vergeben.
  - Den **Bot-Token** notieren (kommt später als GitHub-Secret `TELEGRAM_BOT_TOKEN`).

- [ ] **Step 2: Beide Nutzer verbinden**
  - Adrian und Verlobte öffnen den Bot-Link und schicken je einmal `/start`.
  - (Der nächste Pipeline-Lauf harvestet die chat_ids automatisch.)

*(Kein Commit — reine Einrichtung.)*

---

## Phase 5 — GitHub Actions Cron

### Task 5.1: Workflow anlegen

**Files:**
- Create: `.github/workflows/pipeline.yml`

- [ ] **Step 1: Secrets im GitHub-Repo hinterlegen** (manuell)
  - *Settings → Secrets and variables → Actions*: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`.

- [ ] **Step 2: Workflow schreiben**

```yaml
# .github/workflows/pipeline.yml
name: angebots-pipeline
on:
  schedule:
    - cron: '0 4 * * *'   # täglich 04:00 UTC (~06:00 DE)
  workflow_dispatch: {}    # manuell auslösbar

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          ZIP_CODES: '97204,97070'
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pipeline.yml
git commit -m "ci: daily github-actions cron for the offer pipeline"
```

### Task 5.2: End-to-End-Lauf verifizieren

- [ ] **Step 1: Merkzettel-Testeintrag setzen** (Supabase Table Editor): Zeile in `watchlist` mit `term = 'Butter'`.

- [ ] **Step 2: Workflow manuell auslösen**
  - GitHub → *Actions → angebots-pipeline → Run workflow*.

- [ ] **Step 3: Ergebnis prüfen**
  - Actions-Log: „Angebote gesammelt: N" (N > 0), „Pipeline fertig."
  - Supabase `offers`: gefüllt. `telegram_subscribers`: enthält beide chat_ids (falls `/start` gesendet).
  - Telegram: beide bekommen die Butter-Treffer-Nachricht.
  - Expected: alle vier Punkte erfüllt. Bei `456` erneut auslösen (Rate-Limit).

*(Kein Commit — Verifikation.)*

---

## Phase 6 — Vue-PWA-Frontend

### Task 6.1: Vite + Vue + Tailwind Grundgerüst

**Files:**
- Create: `vite.config.js`, `index.html`, `src/main.js`, `src/App.vue`, `tailwind.config.js`, `postcss.config.js`, `src/style.css`

- [ ] **Step 1: vite.config.js** (PWA-Plugin kommt in Task 6.7 dazu — hier erst Basis)

```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/angebots-radar/', // GitHub Pages Repo-Pfad
  plugins: [vue()],
})
```

- [ ] **Step 2: index.html**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Angebots-Radar</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Tailwind konfigurieren**

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: { extend: {} },
  plugins: [],
}
```
```js
// postcss.config.js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```
```css
/* src/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: main.js + App.vue (Platzhalter)**

```js
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router.js'
import App from './App.vue'
import './style.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```
```vue
<!-- src/App.vue -->
<template>
  <router-view />
</template>
```

- [ ] **Step 5: Dev-Server startet ohne Fehler** — via `preview_start` (Name `dev`, siehe launch.json in Task 6.6) oder `npm run dev`; leere Seite ohne Konsolenfehler genügt vorerst.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js index.html src/main.js src/App.vue tailwind.config.js postcss.config.js src/style.css
git commit -m "feat(ui): vite + vue + tailwind base scaffold"
```

### Task 6.2: Supabase-Client & Auth-Store

**Files:**
- Create: `src/supabase.js`, `src/stores/auth.js`

- [ ] **Step 1: supabase.js (Anon-Client)**

```js
// src/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

- [ ] **Step 2: auth-Store**

```js
// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

export const useAuth = defineStore('auth', () => {
  const session = ref(null)

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    supabase.auth.onAuthStateChange((_e, s) => { session.value = s })
  }
  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  async function logout() { await supabase.auth.signOut() }

  return { session, init, login, logout }
})
```

- [ ] **Step 3: .env lokal befüllen** (aus `.env.example`, mit den Supabase-Werten aus Task 2.1). Nicht committen.

- [ ] **Step 4: Commit**

```bash
git add src/supabase.js src/stores/auth.js
git commit -m "feat(ui): supabase anon client and auth store"
```

### Task 6.3: Router + Login-Guard

**Files:**
- Create: `src/router.js`, `src/views/LoginView.vue`

- [ ] **Step 1: router.js**

```js
// src/router.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from './stores/auth.js'
import MerkzettelView from './views/MerkzettelView.vue'
import AngeboteView from './views/AngeboteView.vue'
import SettingsView from './views/SettingsView.vue'
import LoginView from './views/LoginView.vue'

const routes = [
  { path: '/', component: MerkzettelView },
  { path: '/angebote', component: AngeboteView },
  { path: '/settings', component: SettingsView },
  { path: '/login', component: LoginView },
]

const router = createRouter({ history: createWebHashHistory('/angebots-radar/'), routes })

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!auth.session) await auth.init()
  if (!auth.session && to.path !== '/login') return '/login'
  if (auth.session && to.path === '/login') return '/'
})

export default router
```

- [ ] **Step 2: LoginView.vue**

```vue
<!-- src/views/LoginView.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth.js'

const email = ref('')
const password = ref('')
const err = ref('')
const auth = useAuth()
const router = useRouter()

async function submit() {
  err.value = ''
  try { await auth.login(email.value, password.value); router.push('/') }
  catch (e) { err.value = e.message }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <form class="w-full max-w-sm space-y-4 bg-white p-6 rounded-2xl shadow" @submit.prevent="submit">
      <h1 class="text-xl font-bold">Angebots-Radar</h1>
      <input v-model="email" type="email" placeholder="E-Mail" class="w-full border rounded-lg p-3" />
      <input v-model="password" type="password" placeholder="Passwort" class="w-full border rounded-lg p-3" />
      <p v-if="err" class="text-red-600 text-sm">{{ err }}</p>
      <button class="w-full bg-emerald-600 text-white rounded-lg p-3 font-semibold">Anmelden</button>
    </form>
  </div>
</template>
```

- [ ] **Step 3: Verifizieren** — Dev-Server neu laden; ohne Login landet man auf `/login`; falscher Login zeigt Fehlermeldung; richtiger Login (Haushalts-User aus Task 2.1) leitet auf `/` weiter. Prüfen via `read_page`/`read_console_messages`.

- [ ] **Step 4: Commit**

```bash
git add src/router.js src/views/LoginView.vue
git commit -m "feat(ui): router with auth guard and login view"
```

### Task 6.4: Merkzettel-Store (CRUD + Realtime) & Offers-Store

**Files:**
- Create: `src/stores/watchlist.js`, `src/stores/offers.js`

- [ ] **Step 1: watchlist-Store**

```js
// src/stores/watchlist.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

export const useWatchlist = defineStore('watchlist', () => {
  const items = ref([])

  async function load() {
    const { data, error } = await supabase.from('watchlist').select('*').order('created_at')
    if (error) throw error
    items.value = data
  }

  function subscribe() {
    supabase.channel('watchlist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, load)
      .subscribe()
  }

  async function add(term, targetPrice = null) {
    const { error } = await supabase.from('watchlist').insert({ term, target_price: targetPrice })
    if (error) throw error
  }
  async function remove(id) {
    const { error } = await supabase.from('watchlist').delete().eq('id', id)
    if (error) throw error
  }
  async function setTarget(id, targetPrice) {
    const { error } = await supabase.from('watchlist').update({ target_price: targetPrice }).eq('id', id)
    if (error) throw error
  }

  return { items, load, subscribe, add, remove, setTarget }
})
```

- [ ] **Step 2: offers-Store**

```js
// src/stores/offers.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase.js'

export const useOffers = defineStore('offers', () => {
  const items = ref([])

  async function load() {
    const { data, error } = await supabase
      .from('offers').select('*').order('retailer')
    if (error) throw error
    items.value = data
  }

  // Client-seitiges Matching für die Anzeige (gleiche Logik wie Pipeline).
  function forTerm(term, targetPrice = null) {
    const t = term.trim().toLowerCase()
    return items.value.filter((o) => {
      const hay = `${o.product ?? ''} ${o.brand ?? ''}`.toLowerCase()
      if (!hay.includes(t)) return false
      if (targetPrice != null) return o.price != null && Number(o.price) < Number(targetPrice)
      return true
    })
  }

  return { items, load, forTerm }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/watchlist.js src/stores/offers.js
git commit -m "feat(ui): watchlist (realtime) and offers pinia stores"
```

### Task 6.5: OfferCard, Merkzettel-, Angebote- & Settings-View

**Files:**
- Create: `src/components/OfferCard.vue`, `src/views/MerkzettelView.vue`, `src/views/AngeboteView.vue`, `src/views/SettingsView.vue`

- [ ] **Step 1: OfferCard.vue**

```vue
<!-- src/components/OfferCard.vue -->
<script setup>
const props = defineProps({ offer: Object })
const eur = (n) => n == null ? '' : Number(n).toFixed(2).replace('.', ',') + ' €'
const bis = (iso) => iso ? `${iso.slice(8,10)}.${iso.slice(5,7)}.` : ''
</script>

<template>
  <div class="flex justify-between items-center border rounded-xl p-3 bg-white">
    <div>
      <p class="font-medium">{{ offer.product }} <span class="text-slate-400">{{ offer.brand }}</span></p>
      <p class="text-sm text-slate-500">{{ offer.retailer }} · gültig bis {{ bis(offer.valid_to) }}</p>
    </div>
    <div class="text-right">
      <p class="font-bold text-emerald-700">{{ eur(offer.price) }}<span v-if="offer.unit" class="text-xs">/{{ offer.unit }}</span></p>
      <p v-if="offer.old_price" class="text-xs text-slate-400 line-through">{{ eur(offer.old_price) }}</p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: MerkzettelView.vue**

```vue
<!-- src/views/MerkzettelView.vue -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useWatchlist } from '../stores/watchlist.js'
import { useOffers } from '../stores/offers.js'
import OfferCard from '../components/OfferCard.vue'
import NavBar from '../components/NavBar.vue'

const wl = useWatchlist()
const offers = useOffers()
const newTerm = ref('')

onMounted(async () => {
  await Promise.all([wl.load(), offers.load()])
  wl.subscribe()
})

const hitsByItem = computed(() =>
  wl.items.map((it) => ({ it, hits: offers.forTerm(it.term, it.target_price) })))
const totalHits = computed(() => hitsByItem.value.reduce((s, x) => s + x.hits.length, 0))

async function addTerm() {
  if (!newTerm.value.trim()) return
  await wl.add(newTerm.value.trim())
  newTerm.value = ''
}
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-4">
    <div class="bg-emerald-600 text-white rounded-2xl p-4">
      <p class="text-2xl font-bold">{{ totalHits }} Treffer diese Woche</p>
      <p class="text-emerald-100 text-sm">auf deiner Merkliste</p>
    </div>

    <form class="flex gap-2" @submit.prevent="addTerm">
      <input v-model="newTerm" placeholder="Produkt hinzufügen (z.B. Butter)" class="flex-1 border rounded-lg p-3" />
      <button class="bg-emerald-600 text-white px-4 rounded-lg">+</button>
    </form>

    <details v-for="{ it, hits } in hitsByItem" :key="it.id" class="border rounded-xl bg-white" open>
      <summary class="flex justify-between items-center p-3 cursor-pointer">
        <span class="font-semibold">{{ it.term }}
          <span v-if="it.target_price" class="text-xs text-slate-400">&lt; {{ it.target_price }} €</span>
        </span>
        <span class="flex items-center gap-3">
          <span class="text-sm px-2 py-0.5 rounded-full" :class="hits.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'">{{ hits.length }}</span>
          <button class="text-red-500 text-sm" @click.prevent="wl.remove(it.id)">✕</button>
        </span>
      </summary>
      <div class="p-3 pt-0 space-y-2">
        <OfferCard v-for="o in hits" :key="o.id" :offer="o" />
        <p v-if="!hits.length" class="text-sm text-slate-400">Diese Woche kein Angebot.</p>
      </div>
    </details>

    <NavBar />
  </div>
</template>
```

- [ ] **Step 3: AngeboteView.vue** (Stöber-Tab mit Händlerfilter)

```vue
<!-- src/views/AngeboteView.vue -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useOffers } from '../stores/offers.js'
import OfferCard from '../components/OfferCard.vue'
import NavBar from '../components/NavBar.vue'

const offers = useOffers()
const retailer = ref('')

onMounted(() => offers.load())

const retailers = computed(() => [...new Set(offers.items.map((o) => o.retailer).filter(Boolean))].sort())
const filtered = computed(() => retailer.value ? offers.items.filter((o) => o.retailer === retailer.value) : offers.items)
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-3">
    <h1 class="text-xl font-bold">Alle Angebote</h1>
    <select v-model="retailer" class="w-full border rounded-lg p-3">
      <option value="">Alle Händler</option>
      <option v-for="r in retailers" :key="r" :value="r">{{ r }}</option>
    </select>
    <OfferCard v-for="o in filtered" :key="o.id + o.category" :offer="o" />
    <NavBar />
  </div>
</template>
```

- [ ] **Step 4: SettingsView.vue**

```vue
<!-- src/views/SettingsView.vue -->
<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../supabase.js'
import { useAuth } from '../stores/auth.js'
import NavBar from '../components/NavBar.vue'

const auth = useAuth()
const lastUpdate = ref(null)

onMounted(async () => {
  const { data } = await supabase.from('offers').select('fetched_at').order('fetched_at', { ascending: false }).limit(1)
  lastUpdate.value = data?.[0]?.fetched_at ?? null
})
</script>

<template>
  <div class="max-w-xl mx-auto p-4 pb-24 space-y-4">
    <h1 class="text-xl font-bold">Einstellungen</h1>
    <div class="bg-white border rounded-xl p-4 space-y-2">
      <p><span class="text-slate-500">Märkte:</span> Höchberg (97204) & Würzburg (97070)</p>
      <p><span class="text-slate-500">Zuletzt aktualisiert:</span> {{ lastUpdate ? new Date(lastUpdate).toLocaleString('de-DE') : '–' }}</p>
    </div>
    <div class="bg-white border rounded-xl p-4">
      <p class="font-semibold mb-1">Telegram-Wecker</p>
      <p class="text-sm text-slate-500">Öffnet den Bot und sendet einmal <code>/start</code>, damit ihr Benachrichtigungen bekommt.</p>
    </div>
    <button class="text-red-500" @click="auth.logout()">Abmelden</button>
    <NavBar />
  </div>
</template>
```

- [ ] **Step 5: NavBar.vue** (Bottom-Tabs)

```vue
<!-- src/components/NavBar.vue -->
<template>
  <nav class="fixed bottom-0 inset-x-0 bg-white border-t flex justify-around py-2">
    <router-link to="/" class="text-sm" active-class="text-emerald-600 font-semibold">Merkzettel</router-link>
    <router-link to="/angebote" class="text-sm" active-class="text-emerald-600 font-semibold">Angebote</router-link>
    <router-link to="/settings" class="text-sm" active-class="text-emerald-600 font-semibold">Mehr</router-link>
  </nav>
</template>
```

- [ ] **Step 6: End-to-End im Browser verifizieren** (`preview_start` → `read_page`/`computer`):
  - Login → Merkzettel; „Butter" hinzufügen erscheint sofort in der Liste (Realtime), Treffer-Badge zeigt Zahl aus `offers`.
  - Angebote-Tab listet Angebote, Händlerfilter funktioniert.
  - Settings zeigt „zuletzt aktualisiert".
  - `read_console_messages`: keine Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/components src/views
git commit -m "feat(ui): merkzettel, angebote and settings views with navbar"
```

### Task 6.6: Dev-Server-Konfig für Preview

**Files:**
- Create: `.claude/launch.json`

- [ ] **Step 1: launch.json anlegen** (damit `preview_start` den Vite-Server kennt)

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add .claude/launch.json
git commit -m "chore: add dev server launch config for preview"
```

### Task 6.7: PWA aktivieren (Manifest, Service Worker, Icons)

**Files:**
- Modify: `vite.config.js`
- Create: `public/icon-192.png`, `public/icon-512.png`

- [ ] **Step 1: Icons ablegen** — zwei quadratische PNGs (192×192, 512×512) unter `public/` (einfaches Einkaufskorb-Motiv genügt fürs MVP).

- [ ] **Step 2: vite.config.js um PWA erweitern**

```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/angebots-radar/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Angebots-Radar',
        short_name: 'Angebote',
        start_url: '/angebots-radar/',
        scope: '/angebots-radar/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#059669',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 3: Build & PWA-Check**

Run: `npm run build`
Expected: `dist/` entsteht mit `manifest.webmanifest` und `sw.js`.

- [ ] **Step 4: Commit**

```bash
git add vite.config.js public/icon-192.png public/icon-512.png
git commit -m "feat(ui): enable installable PWA (manifest, service worker, icons)"
```

---

## Phase 7 — Deployment (GitHub Pages)

### Task 7.1: Pages-Deploy-Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Frontend-Secrets als Build-Env** (manuell): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` als GitHub-*Actions*-Secrets (Anon-Key ist unkritisch/öffentlich, aber so bleibt die URL zentral gepflegt).

- [ ] **Step 2: deploy.yml schreiben**

```yaml
# .github/workflows/deploy.yml
name: deploy-pages
on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Pages aktivieren** (manuell): Repo *Settings → Pages → Source: GitHub Actions*.

- [ ] **Step 4: Commit & Push**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: build and deploy PWA to github pages"
git push -u origin main
```

- [ ] **Step 5: Deployment verifizieren**
  - Actions „deploy-pages" grün.
  - `https://afredenhagen-privat.github.io/angebots-radar/` öffnet die App; Login funktioniert; Merkzettel lädt Daten.
  - Auf beiden Handys „Zum Startbildschirm hinzufügen" → App startet standalone.
  - Expected: alle Punkte erfüllt.

---

## Self-Review (vom Autor durchgeführt)

**Spec-Abdeckung:**
- Täglicher Abruf beide PLZ → Task 4.1 + 5.1 ✅
- Gemeinsame Merkliste + Realtime → Task 2.1 (publication) + 6.4 ✅
- Preiswecker mit `target_price` → 3.1 (Logik) + 6.4 (`setTarget`) ✅
- Telegram-Wecker an beide, ohne Doppel-Pings → 3.2/3.3 + 4.1 (`alerts_sent`) ✅
- Geteiltes Haushalts-Login → 2.1 (User) + 6.2/6.3 (Auth+Guard) ✅
- Installierbare PWA / GitHub Pages → 6.7 + 7.1 ✅
- Kein „alle Angebote"-Abruf → Cron über Begriffe+Kategorien (4.1) ✅
- Rate-Limit/Keys-Rotation → 1.1 (Keys/Lauf) + 1.3 (456-Handling) + 4.1 (`sleep`) ✅
- Kein-TypeScript-Vorgabe → durchgehend `.js`/`.vue` ✅

**Placeholder-Scan:** keine TBD/TODO in den Code-Steps; alle Funktionen mit vollständigem Code.

**Typ-Konsistenz:** DB-Feldnamen (`old_price`, `valid_to`, `target_price`, `chat_id`) identisch in `normalize.js`, `schema.sql`, `matching.js`, Stores und Views; Store-Methoden (`wl.add/remove/setTarget/subscribe/load`, `offers.load/forTerm`) konsistent verwendet.

**Bekannte MVP-Vereinfachung:** Task 6.7 nennt Icons als abzulegende Assets (keine Generierung im Plan) — bewusst, da reine Design-Assets.
