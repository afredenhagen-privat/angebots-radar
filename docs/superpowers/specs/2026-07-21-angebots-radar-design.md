# Angebots-Radar — Design-Spec

**Datum:** 2026-07-21
**Status:** Entwurf zur Review (nach erfolgreichem Daten-Spike)
**Repo (geplant):** `afredenhagen-privat/angebots-radar` (privat)

---

## 1. Zweck & Kurzbeschreibung

Eine private, von einem Paar **gemeinsam** genutzte App, die aktuelle Supermarkt-Angebote
für die Filialen in **Höchberg (97204)** und **Würzburg (97070)** automatisch zieht und den
Nutzern meldet, wenn Produkte von ihrer **gemeinsamen Merkliste** im Angebot sind
(„Preiswecker") — Benachrichtigung über **Telegram**.

Kernnutzen: Nicht selbst durch Prospekte blättern müssen, sondern aktiv gepingt werden,
wenn die eigenen Wunschprodukte gerade günstig sind.

## 2. Nutzer

- Zwei Personen (Verlobtes Paar), ein Haushalt.
- Zugriff von beiden Smartphones.
- **Login per Magic Link** (passwortlos, wie beim Schwesterprojekt Vorratsmonster):
  Jede Person nutzt ihre **eigene** E-Mail-Adresse. Beide Nutzer werden vorab manuell in
  Supabase angelegt, Self-Signup ist abgeschaltet. Kein Rollenmodell — die RLS-Regeln
  geben jedem eingeloggten Nutzer vollen Zugriff, dadurch sehen und bearbeiten beide
  automatisch dieselben Daten.

  > *Geändert am 2026-07-22:* ursprünglich war ein einzelnes geteiltes Haushalts-Login mit
  > Passwort vorgesehen. Magic Link passt besser (kein Passwort-Teilen, konsistent zu den
  > anderen privaten PWAs) und macht zwei persönliche Accounts sogar einfacher als einen geteilten.

## 3. Ziele / Nicht-Ziele

**Ziele (MVP):**
- Automatischer täglicher Abruf der Angebote für beide PLZ.
- Gemeinsame Merkliste (Watchlist) mit Realtime-Sync zwischen beiden Geräten.
- Preiswecker pro Eintrag: „melde wenn im Angebot" (Standard) **oder** „melde wenn Preis < X €".
- Telegram-Benachrichtigung an beide bei neuen Treffern (ohne Doppel-Pings).
- Installierbare PWA (Homescreen) auf beiden Handys, offline-lesbar (letzter Stand gecached).

**Nicht-Ziele (bewusst später / raus):**
- Web-Push / E-Mail-Wecker (Telegram reicht fürs MVP).
- Echte GPS-/Standortlogik (feste PLZ genügen).
- Mehr als ein Haushalt / mandantenfähig.
- Rollen-/Rechtemodell zwischen den beiden Nutzern (beide sehen bewusst alles).
- Native App (Kotlin/Swift/Flutter).

## 4. Gesamtarchitektur

```
┌─ Supabase (kostenloses Backend-as-a-Service) ────────────────────┐
│  • Postgres-DB (offers, watchlist, alerts_sent, telegram_subs)   │
│  • Auth: 1 geteiltes Haushalts-Login, RLS auf diesen User        │
│  • Realtime: watchlist-Änderungen syncen live zwischen Geräten   │
│  • Scheduled Edge Function (täglich, pg_cron):                    │
│      1. frische Marktguru-Keys aus Homepage ziehen               │
│      2. je Merkzettel-Begriff + kuratierte Kategorien × PLZ      │
│         abfragen, gedrosselt                                      │
│      3. Angebote normalisieren → upsert in `offers`              │
│      4. gegen `watchlist` matchen                                │
│      5. neue Treffer (nicht in `alerts_sent`) → Telegram +       │
│         in `alerts_sent` protokollieren                          │
│  • Telegram-Webhook Edge Function: /start registriert chat_id    │
└──────────────────────────────────────────────────────────────────┘
        ▲ liest/schreibt (Login)                 │ Wecker
        │                                         ▼
┌─ Vue-3-PWA (GitHub Pages, beide Handys) ─┐   ┌─ Telegram-Bot ──────┐
│  Merkzettel · Alle Angebote · Settings    │   │ "🧈 Butter (Meggle) │
│  Supabase-JS-Client, Realtime-Abo         │   │  bei Lidl 1,39 €/kg"│
└───────────────────────────────────────────┘   └─────────────────────┘
```

**Warum diese Architektur:**
- Geteilter, veränderbarer Zustand (gemeinsame Merkliste) + serverseitiger Preiswecker
  brauchen eine zentrale Datenschicht — reines Static-Hosting reicht nicht mehr.
- Supabase liefert DB + Auth + Realtime + geplanten Cron im kostenlosen Tier an *einer*
  Stelle. Postgres passt besser zu „Angebote mit Preisen filtern" als NoSQL (Firebase).
- Ein eigener Server (Fly.io/Railway) wäre Ops-Overkill für zwei Nutzer.
- Free-Tier pausiert Projekte nach ~1 Woche Inaktivität → täglicher Cron hält es wach.

## 5. Datenquelle (validiert im Spike)

**Quelle:** Marktguru inoffizielle App-/Web-API.
- Base: `https://api.marktguru.de/api/v1`, Endpoint `GET /offers/search`
- Query-Params: `as=web`, `q=<Begriff>`, `zipCode=<PLZ>`, `limit`, `offset`
- Header: `x-apikey`, `x-clientkey` — **werden pro Lauf frisch** aus dem
  `<script type="application/json">`-Block der Homepage (`config.apiKey` / `config.clientKey`)
  geparst (Keys rotieren, daher nicht hardcoden).

**Im Spike bestätigt:**
- Beide PLZ (97070, 97204) liefern HTTP 200 mit echten Daten.
- Relevante Felder pro Angebot: `product.name`, `brand.name`, `price`, `oldPrice`,
  `referencePrice`, `unit` (z.B. €/kg), `volume`, `quantity`, `advertisers[].name`
  (Händler, u.a. Lidl/Kaufland/REWE), `validityDates[].from/to`, `id` (für Bild).
- Bild-URL-Muster: `https://mg2de.b-cdn.net/api/v1/offers/{id}/images/default/0/{size}.jpg`
  (`size` ∈ small|medium|large).

**Bekannte Einschränkungen:**
- **Kein „alle Angebote"-Abruf** — leere Query = 0 Treffer. Es muss immer ein Suchbegriff
  gesetzt sein. Deshalb fragt der Cron **pro Merkzettel-Begriff** ab (deckt Kernfeature
  effizient ab) und zusätzlich eine **kuratierte Kategorienliste** für den Stöber-Tab.
- **Rate-Limit** vorhanden (HTTP 456 bei zu vielen Requests gesehen) → Requests drosseln
  (kurze Pause zwischen Calls), einmal täglich laufen.
- **Inoffizielle Quelle** → kann sich ändern und den Abruf brechen. Wartungsrisiko,
  kein Show-Stopper. Bei Bruch: Keys-/Schema-Anpassung oder Plan B (Händler-Endpunkte
  REWE/Aldi/Lidl einzeln).

## 6. Datenmodell (Supabase / Postgres)

- **`offers`** — normalisierte Angebote (vom Cron befüllt, bei jedem Lauf aktualisiert)
  - `id` (PK, aus Marktguru `id` / `externalId`), `retailer`, `product`, `brand`,
    `price` (numeric), `old_price`, `reference_price`, `unit`, `volume`, `quantity`,
    `valid_from`, `valid_to`, `zip_code`, `image_id`, `category` (der abgefragte Begriff),
    `fetched_at`.
- **`watchlist`** — gemeinsame Merkliste
  - `id` (PK), `term` (Suchbegriff, z.B. „Butter"), `target_price` (nullable — wenn gesetzt:
    Wecker nur bei Preis < Wert), `note`, `created_at`.
- **`alerts_sent`** — Dedupe für Wecker
  - `id` (PK), `watchlist_id` (FK), `offer_id` (FK), `sent_at`. Unique(`watchlist_id`,`offer_id`).
- **`telegram_subscribers`** — Empfänger der Wecker
  - `chat_id` (PK), `name`, `added_at`.

**RLS:** Alle Tabellen auf den einen Haushalts-User beschränkt. Cron/Edge Functions laufen
mit Service-Role (umgeht RLS).

## 7. Angebots-Pipeline (Cron, täglich)

1. Marktguru-Homepage laden → `apiKey` + `clientKey` extrahieren.
2. Begriffsliste bilden = `distinct(watchlist.term)` ∪ kuratierte Kategorienliste.
3. Für jeden Begriff × jede PLZ: `GET /offers/search` (gedrosselt), Ergebnisse sammeln.
4. Normalisieren → `offers` per Upsert schreiben; abgelaufene/verschwundene Angebote
   (nicht mehr in aktuellem Lauf & `valid_to` < heute) aufräumen.
5. Matching: für jeden `watchlist`-Eintrag Angebote finden, deren `product`/`brand`
   den `term` (case-insensitive Teilstring) enthält; falls `target_price` gesetzt,
   zusätzlich `price < target_price`.
6. Neue Treffer (Kombi `watchlist_id`+`offer_id` noch nicht in `alerts_sent`):
   Telegram-Nachricht an alle `telegram_subscribers`, dann in `alerts_sent` schreiben.

**Kuratierte Kategorienliste (Startwert, erweiterbar):** Butter, Käse, Milch, Joghurt,
Eier, Kaffee, Hähnchen, Hackfleisch, Wurst, Brot, Nudeln, Reis, Öl, Tomaten, Äpfel,
Bananen, Schokolade, Chips, Bier, Wasser, Spülmittel, Waschmittel, Toilettenpapier, Windeln.
*(Finale Liste im Plan/Implementierung justierbar.)*

## 8. Screens (Vue-PWA)

1. **Login** — geteiltes Haushalts-Login (Supabase Auth).
2. **Merkzettel (Start)** — Banner „N Treffer diese Woche"; Liste der Begriffe, je Eintrag
   aufklappbar mit passenden Angeboten (Händler, Preis, „statt"-Streichpreis, gültig bis).
   Pro Eintrag optionales Preiswecker-Limit setzbar. Hinzufügen/Löschen von Begriffen.
3. **Alle Angebote (Stöbern)** — Angebote aus kuratierten Kategorien, Filter nach Händler.
4. **Einstellungen** — PLZ/Märkte (Anzeige), Telegram-Verknüpfung (Bot-Link + Anleitung
   `/start`), „zuletzt aktualisiert am …".

## 9. Tech-Stack

- **Frontend:** Vue 3 + Vite + Pinia + Tailwind + vite-plugin-pwa; `@supabase/supabase-js`.
  Nur JavaScript (kein TypeScript).
- **Hosting Frontend:** GitHub Pages (`afredenhagen-privat/angebots-radar`).
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions in TypeScript/Deno,
  pg_cron für den Zeitplan).
- **Benachrichtigung:** Telegram Bot API (Bot via BotFather, Token als Supabase-Secret).

## 10. Secrets & Sicherheit

- Telegram-Bot-Token, Supabase-Service-Role-Key: nur als Supabase-Secrets / Env, **nie**
  im Frontend-Bundle.
- Frontend nutzt nur den öffentlichen Supabase-Anon-Key + Login.
- Marktguru-Keys werden zur Laufzeit geholt, nicht persistiert.
- Repo privat.

## 11. Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Marktguru ändert API/Keys/Schema | Abruf bricht | Keys pro Lauf frisch ziehen; Schema defensiv parsen; ggf. Plan B Händler-Endpunkte |
| Rate-Limit (HTTP 456) | Teilweise leere Läufe | Drosseln, 1×/Tag, Backoff |
| Free-Tier-Limits Supabase | Dienst pausiert/gedrosselt | Täglicher Cron hält wach; Datenmengen für 2 Nutzer minimal |
| Telegram-Zustellung fällt aus | Kein Wecker | In-App-Treffer bleiben als Fallback sichtbar |

## 12. Offene Punkte (im Plan zu entscheiden)

- Finale kuratierte Kategorienliste.
- Genaue Uhrzeit des Cron-Laufs (z.B. 06:00).
- UI-Feinschliff (Design/Branding der PWA).
- Telegram-Onboarding-Flow (wie /start-Registrierung dem Haushalt zugeordnet wird —
  einfachste Variante: Bot akzeptiert jeden /start und schreibt chat_id in
  `telegram_subscribers`, da privat/geteilt).

## 13. Umsetzungsreihenfolge (grob, Details im Plan)

1. ✅ **Daten-Spike** (erledigt — Quelle validiert).
2. Supabase-Projekt + Schema + RLS + Auth (geteiltes Login).
3. Cron-Edge-Function: Keys ziehen → abfragen → normalisieren → `offers` füllen.
4. Matching + `alerts_sent` + Telegram-Bot (Token, /start-Webhook, Versand).
5. Vue-PWA: Login, Merkzettel (CRUD + Realtime), Anzeige der Treffer.
6. „Alle Angebote"-Tab + Einstellungen.
7. PWA-Feinschliff (Manifest, Icons, Offline-Cache), Deploy auf GitHub Pages.
