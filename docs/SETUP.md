# Angebots-Radar — Einrichtung Schritt für Schritt

Diese Anleitung führt dich von „Code liegt im Repo" bis „App läuft auf beiden Handys und der Telegram-Wecker meldet sich".

**Zeitbedarf:** ca. 30–45 Minuten.
**Reihenfolge ist wichtig** — Schritt 4 und 5 setzen voraus, dass die Secrets aus Schritt 3 schon gesetzt sind.

Am Ende jedes Schritts steht ein ✅ **Check** — geh erst weiter, wenn der stimmt.

---

## Schritt 1 — Supabase-Projekt anlegen

Supabase ist eure Datenbank (geteilte Merkliste + Angebote) und euer Login.

1. Geh auf **https://supabase.com** und melde dich an (Login mit GitHub geht am schnellsten — nimm dafür deinen privaten Account `afredenhagen-privat`).
2. Klick auf **New project**.
3. Fülle aus:
   - **Name:** `angebots-radar`
   - **Database Password:** Klick auf *Generate a password* und **speichere es dir ab** (z.B. im Passwortmanager). Du brauchst es zwar für unsere App nicht, aber ohne kommst du später nicht mehr direkt an die DB.
   - **Region:** `Central EU (Frankfurt)` — kurze Wege, DSGVO-freundlich.
4. **Create new project** klicken und ca. 2 Minuten warten, bis das Projekt bereitsteht.

✅ **Check:** Das Projekt-Dashboard lädt und zeigt oben nicht mehr „Setting up project".

---

## Schritt 2 — Datenbank-Tabellen anlegen

1. Öffne im linken Menü den **SQL Editor** (Icon mit `>_`).
2. Klick auf **New query**.
3. Öffne in deinem Projektordner die Datei `supabase/schema.sql`, **kopiere den kompletten Inhalt** und füge ihn ins Abfragefenster ein.
4. Klick unten rechts auf **Run** (oder `Strg+Enter`).

Du solltest „Success. No rows returned" sehen.

✅ **Check:** Im linken Menü unter **Table Editor** existieren jetzt genau diese vier Tabellen:
`offers`, `watchlist`, `alerts_sent`, `telegram_subscribers`.

> **Falls Fehler:** Wenn eine Meldung wie `relation "watchlist" already exists` kommt, hast du das Skript schon mal laufen lassen — das ist unkritisch, das Skript nutzt `create table if not exists`.

---

## Schritt 3 — Euren gemeinsamen Haushalts-Login anlegen

Ihr teilt euch **einen** Login — das ist bewusst so, damit ihr automatisch dieselbe Merkliste seht.

1. Linkes Menü → **Authentication** → **Users**.
2. Klick auf **Add user** → **Create new user**.
3. Fülle aus:
   - **Email:** eine Adresse, die ihr beide kennt (z.B. eine gemeinsame oder deine).
   - **Password:** ein Passwort, das ihr beide bekommt. **Merk es dir** — damit loggt ihr euch später in der App ein.
   - **Auto Confirm User:** ✅ **anhaken** (sonst müsst ihr erst eine Bestätigungsmail klicken).
4. **Create user** klicken.

✅ **Check:** Der User steht in der Liste und hat in der Spalte *Last sign in* noch nichts, aber ist bestätigt (kein „Waiting for verification").

---

## Schritt 4 — Supabase-Zugangsdaten kopieren

Diese drei Werte brauchst du gleich in Schritt 6.

1. Linkes Menü → **Project Settings** (Zahnrad) → **API**
   *(In neueren Supabase-Versionen heißt der Punkt **API Keys** bzw. **Data API**.)*
2. Notiere dir (am besten in einen Notizzettel, gleich brauchst du sie):

   | Was | Wo es steht | Sieht aus wie |
   |---|---|---|
   | **Project URL** | ganz oben unter *Project URL* | `https://abcdefgh.supabase.co` |
   | **anon public key** | unter *Project API keys* → `anon` `public` | langer Text, beginnt mit `eyJ...` |
   | **service_role key** | unter *Project API keys* → `service_role` `secret` (musst du per *Reveal* einblenden) | langer Text, beginnt mit `eyJ...` |

> ⚠️ **Wichtig:** Der `service_role`-Key umgeht alle Sicherheitsregeln. Der gehört **nur** in die GitHub-Secrets (Schritt 6) und **niemals** ins Frontend oder in eine Datei im Repo. Der `anon`-Key dagegen ist unkritisch und darf öffentlich sein.

✅ **Check:** Du hast drei Werte notiert.

---

## Schritt 5 — Telegram-Bot anlegen

Der Bot ist euer Preiswecker-Kanal.

1. Öffne **Telegram** und suche nach **@BotFather** (der mit dem blauen Haken).
2. Schreib ihm `/newbot`.
3. Er fragt nach dem **Namen** — das ist der Anzeigename, z.B. `Angebots-Radar`.
4. Er fragt nach dem **Username** — der muss **eindeutig sein und auf `bot` enden**, z.B. `angebots_radar_wue_bot`. Wenn er schon vergeben ist, probier eine Variante.
5. BotFather antwortet mit einem **Token** in der Form:
   ```
   8123456789:AAEexampleTokenXyZ...
   ```
   **Kopier dir den Token** — den brauchst du in Schritt 6.
6. **Jetzt wichtig:** BotFather nennt dir auch den Link `t.me/<dein_bot_username>`.
   **Du UND deine Verlobte** öffnet diesen Link jeweils auf eurem eigenen Handy und drückt **Start** (bzw. schickt `/start`).

> **Warum das nötig ist:** Telegram lässt Bots nur Leute anschreiben, die den Chat vorher selbst eröffnet haben. Unsere Pipeline liest beim Lauf die neuen `/start`-Nachrichten aus und merkt sich eure Chats.
>
> ⚠️ **Timing:** Telegram hält diese ungelesenen Nachrichten nur **ca. 24 Stunden** vor. Schickt das `/start` also am besten kurz bevor du in Schritt 8 die Pipeline startest — oder wiederholt es einfach, falls ihr später keine Nachrichten bekommt.

✅ **Check:** Ihr habt beide den Bot-Chat offen und jeweils „Start" gedrückt. Du hast den Token notiert.

---

## Schritt 6 — GitHub-Secrets setzen

Hier kommen alle Zugangsdaten sicher hinterlegt rein.

1. Öffne **https://github.com/afredenhagen-privat/angebots-radar**
   *(Falls du nicht reinkommst: du bist im Browser evtl. mit dem Arbeits-Account angemeldet. Das Repo gehört `afredenhagen-privat`.)*
2. Geh auf **Settings** (oben im Repo) → links **Secrets and variables** → **Actions**.
3. Klick **New repository secret** und lege **nacheinander diese fünf** an — Namen **exakt** so schreiben:

   | Name | Wert |
   |---|---|
   | `SUPABASE_URL` | die Project URL aus Schritt 4 |
   | `SUPABASE_SERVICE_ROLE_KEY` | der `service_role`-Key aus Schritt 4 |
   | `TELEGRAM_BOT_TOKEN` | der Bot-Token aus Schritt 5 |
   | `VITE_SUPABASE_URL` | **dieselbe** Project URL wie oben |
   | `VITE_SUPABASE_ANON_KEY` | der `anon public`-Key aus Schritt 4 |

   > Ja, die URL kommt zweimal rein — einmal für die Pipeline (`SUPABASE_URL`) und einmal für den App-Build (`VITE_...`). Das ist Absicht.

✅ **Check:** Unter *Repository secrets* stehen genau diese fünf Einträge.

---

## Schritt 7 — GitHub Pages aktivieren

Damit die App überhaupt eine Adresse bekommt.

1. Im selben Repo: **Settings** → links **Pages**.
2. Unter **Build and deployment** → **Source** wähle **GitHub Actions** (nicht „Deploy from a branch"!).
3. Speichern (passiert meist automatisch).

✅ **Check:** Unter *Source* steht „GitHub Actions".

---

## Schritt 8 — Pull Request mergen (startet den Deploy)

1. Öffne **https://github.com/afredenhagen-privat/angebots-radar/pull/1**
2. Klick **Merge pull request** → **Confirm merge**.
3. Optional: **Delete branch** klicken, der Branch wird nicht mehr gebraucht.

Der Merge auf `main` löst automatisch den Deploy-Workflow aus.

4. Geh auf den Tab **Actions** und schau dem Lauf **deploy-pages** zu (dauert ~1–2 Minuten).

✅ **Check:** Der Workflow **deploy-pages** ist grün ✅. Unter *Settings → Pages* steht jetzt deine Adresse:
**https://afredenhagen-privat.github.io/angebots-radar/**

> **Falls rot:** Klick den Lauf an und schau in den Schritt `npm run build`. Fehlt einer der `VITE_...`-Secrets, bricht er hier ab — dann Schritt 6 nachholen und den Workflow über *Re-run jobs* neu starten.

---

## Schritt 9 — Erste Angebote ziehen

Jetzt füllen wir die Datenbank zum ersten Mal.

1. Lege zuerst einen Test-Eintrag auf die Merkliste, damit es auch etwas zu melden gibt:
   - Supabase → **Table Editor** → Tabelle **`watchlist`** → **Insert** → **Insert row**
   - Feld **`term`**: `Butter` — alle anderen Felder leer lassen (die füllen sich automatisch).
   - **Save**.
2. Geh zu GitHub → **Actions** → links auf **angebots-pipeline** → rechts **Run workflow** → **Run workflow**.
3. Warte, bis der Lauf durch ist (1–3 Minuten), und öffne ihn.

✅ **Check — drei Dinge:**
- Im Log steht eine Zeile wie `Angebote gesammelt: 312` (die Zahl ist egal, Hauptsache > 0) und am Ende `Pipeline fertig.`
- Supabase → Table Editor → **`offers`** ist gefüllt.
- **Ihr bekommt beide eine Telegram-Nachricht** in der Art:
  ```
  🛒 Feine Butter (Meggle)
  Lidl: 1,39 €/kg (statt 1,79 €) – gültig bis 25.07.
  ```

> **Falls keine Telegram-Nachricht kommt:** Prüf in Supabase die Tabelle **`telegram_subscribers`** — stehen da eure zwei Chats drin?
> - **Leer?** Dann war euer `/start` zu lange her (>24 h) oder noch gar nicht passiert. Schickt dem Bot nochmal `/start` und startet den Workflow erneut.
> - **Gefüllt, aber nichts kommt an?** Schau im Actions-Log nach Zeilen mit `telegram fail` — dort steht der Grund.
>
> **Falls `Angebote gesammelt: 0`:** Wahrscheinlich hat Marktguru gerade gebremst (Rate-Limit). Im Log stehen dann `456`-Meldungen. Einfach 10 Minuten warten und den Workflow nochmal starten.

---

## Schritt 10 — App auf beiden Handys installieren

1. Öffnet auf **beiden** Handys **https://afredenhagen-privat.github.io/angebots-radar/**
2. Loggt euch mit der **E-Mail und dem Passwort aus Schritt 3** ein (beide dieselben Daten).
3. Ihr solltet den Merkzettel mit „Butter" und den Treffern sehen.
4. **Zum Startbildschirm hinzufügen:**
   - **Android (Chrome):** Menü ⋮ oben rechts → *App installieren* bzw. *Zum Startbildschirm hinzufügen*
   - **iPhone (Safari):** Teilen-Symbol unten → *Zum Home-Bildschirm*

✅ **Check — der Realtime-Test:** Füge auf **einem** Handy einen Begriff hinzu (z.B. `Kaffee`). Er muss **innerhalb weniger Sekunden von selbst** auf dem anderen Handy auftauchen, ohne Neuladen. Klappt das, funktioniert die gemeinsame Nutzung.

---

## Fertig 🎉

Ab jetzt läuft alles automatisch:
- **Täglich um 06:00 Uhr** (04:00 UTC) zieht die Pipeline neue Angebote für Höchberg und Würzburg.
- Alles, was auf eurer gemeinsamen Merkliste steht und neu im Angebot ist, kommt als **Telegram-Nachricht bei euch beiden** an.
- Jeder Treffer wird nur **einmal** gemeldet.

### Was ihr im Alltag noch tun könnt
- **Merkliste pflegen:** In der App Begriffe hinzufügen/löschen — wirkt sofort für euch beide.
- **Preiswecker setzen:** Ein Eintrag kann ein Limit haben („nur melden wenn unter 1,50 €"). Das Feld `target_price` in der `watchlist`-Tabelle.

---

## Bekannte Baustellen

| Thema | Was zu tun ist |
|---|---|
| **App-Icons sind Platzhalter** | `public/icon-192.png` und `public/icon-512.png` sind derzeit 1×1-Pixel-Platzhalter. Auf dem Homescreen sieht das kaputt aus — ersetz sie durch echte quadratische PNGs (192×192 und 512×512) und pushe. |
| **Push zum Repo schlägt fehl** | Vorher `gh auth switch --user afredenhagen-privat` ausführen. Nur der private Account hat den `workflow`-Scope, den `.github/workflows/` braucht. |
| **Datenquelle ist inoffiziell** | Marktguru kann seine API ändern; dann bricht der Abruf und muss nachgezogen werden. Merkst du daran, dass die Pipeline `Angebote gesammelt: 0` meldet oder rot wird. |
| **Supabase Free-Tier** | Pausiert Projekte nach ~1 Woche ohne Aktivität. Der tägliche Cron hält es wach — solange der läuft, passiert nichts. |
