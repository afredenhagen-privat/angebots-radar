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

## Schritt 3 — Login einrichten (Magic Link)

Der Login läuft **passwortlos per Magic Link**: Ihr gebt eure E-Mail ein, bekommt eine Mail, klickt den Link — fertig. Ihr nutzt beide **eure gemeinsame E-Mail-Adresse**, also reicht **ein** Nutzer.

> **Voraussetzung:** Das gemeinsame Postfach muss auf **beiden Handys** abrufbar sein — jeder muss den Magic Link auf seinem eigenen Gerät antippen können. Ist das nicht der Fall, leg stattdessen zwei Nutzer an (siehe Kasten unten).

### 3a — Euren Nutzer anlegen

1. Linkes Menü → **Authentication** → **Users**.
2. **Add user** → **Create new user**. Fülle aus:
   - **Email:** eure gemeinsame E-Mail-Adresse.
   - **Password:** irgendein zufälliges Passwort (wird nie gebraucht, der Login läuft über den Magic Link — trag einfach was Langes ein).
   - **Auto Confirm User:** ✅ **anhaken**.
3. **Create user** klicken.

> **Alternative — zwei getrennte Nutzer:** Wenn ihr lieber jeder mit eurer eigenen Adresse rein wollt, leg den Schritt einfach zweimal an (einmal pro E-Mail). Am Verhalten der App ändert das nichts: Die Zugriffsregeln unterscheiden nicht nach Person, ihr seht so oder so dieselbe Merkliste. Das lässt sich auch später jederzeit nachholen, ohne dass am Code etwas geändert werden muss.

### 3b — Self-Signup abschalten ⚠️ (wichtig!)

Ohne diesen Schritt könnte sich **jede beliebige E-Mail-Adresse** einen Magic Link schicken lassen und käme an eure Daten — denn die Sicherheitsregeln geben jedem eingeloggten Nutzer vollen Zugriff.

1. **Authentication** → **Sign In / Providers** (in manchen Versionen: **Providers** → **Email**).
2. Schalte **„Allow new users to sign up"** (bzw. *Enable Sign Ups*) **aus**.

> Die App schickt zusätzlich `shouldCreateUser: false` mit — doppelt gesichert. Wer nicht in Schritt 3a angelegt wurde, bekommt die Meldung „Diese E-Mail ist nicht freigeschaltet".

### 3c — Redirect-URL freigeben ⚠️ (sonst funktioniert der Magic Link nicht!)

Supabase leitet nach dem Klick nur auf Adressen weiter, die vorher freigegeben sind.

1. **Authentication** → **URL Configuration**.
2. **Site URL** setzen auf:
   ```
   https://afredenhagen-privat.github.io/angebots-radar/
   ```
3. Unter **Redirect URLs** → **Add URL** dieselbe Adresse eintragen. Ergänze zusätzlich für lokales Testen:
   ```
   http://localhost:5173/angebots-radar/
   ```

✅ **Check:** Unter *Users* stehen **zwei** bestätigte Nutzer, Sign-Ups sind aus, und unter *URL Configuration* stehen Site-URL und Redirect-URL.

---

## Schritt 4 — Supabase-Zugangsdaten kopieren

Diese drei Werte brauchst du gleich in Schritt 6.

> ⚠️ **Die häufigste Fehlerquelle im ganzen Setup.** Nimm die **nackte Project-URL**, *nicht* die „Data API"-URL. Die endet nämlich auf `/rest/v1/` — damit baut die App Adressen wie `.../rest/v1/auth/v1/otp` und du bekommst beim Login **„Invalid path specified in request URL"**.
>
> ✅ richtig: `https://abcdefgh.supabase.co`
> ❌ falsch: `https://abcdefgh.supabase.co/rest/v1/`
>
> *(Die App räumt so eine URL inzwischen selbst auf und warnt in der Browser-Konsole — sauber eintragen ist trotzdem besser.)*

**Project URL:** Linkes Menü → **Data API**. Ganz oben steht **Project URL**. Alternativ aus der Adresszeile ableiten: die Zeichenkette nach `/project/` ist deine Projekt-ID, die URL lautet dann `https://<projekt-id>.supabase.co`.

**Die beiden Keys:** Linkes Menü → **API Keys**.

Supabase hat hier ein neues Key-System — du siehst oben zwei Reiter. **Nimm den Reiter „Legacy anon, service_role API keys"**, denn unsere `supabase-js`-Version ist älter als das neue Format:

   | Was | Wo es steht | Sieht aus wie |
   |---|---|---|
   | **anon public key** | Legacy-Reiter → `anon` `public` | langer Text, beginnt mit `eyJ...` |
   | **service_role key** | Legacy-Reiter → `service_role` `secret` (per Auge einblenden) | langer Text, beginnt mit `eyJ...` |

> Die neuen Keys (`sb_publishable_…` / `sb_secret_…`) sind die Nachfolger von `anon` bzw. `service_role`. Auf die kann später umgestellt werden — dann muss vorher die Bibliothek aktualisiert werden.

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

### Optional: Fehler-Alarm einrichten

Damit du eine Telegram-Nachricht bekommst, wenn der tägliche Lauf fehlschlägt (sonst merkst du wochenlang nicht, dass keine Angebote mehr kommen):

- Lege ein **sechstes** Secret an: `TELEGRAM_ALERT_CHAT_ID` mit **deiner** Telegram-Chat-ID.
- **Wie du deine Chat-ID findest:** Am einfachsten nach dem ersten erfolgreichen Pipeline-Lauf (Schritt 9) — dann steht sie in Supabase in der Tabelle `telegram_subscribers`. Alternativ schreibst du in Telegram dem Bot **@userinfobot**, der antwortet dir mit deiner ID (eine Zahl wie `123456789`).
- Ohne dieses Secret wird der Alarm-Schritt einfach übersprungen — der Workflow läuft trotzdem normal.

> GitHub schickt dir bei fehlgeschlagenen Workflows ohnehin eine E-Mail. Der Telegram-Alarm ist die auffälligere Variante.

✅ **Check:** Unter *Repository secrets* stehen mindestens die fünf Pflicht-Einträge (plus optional `TELEGRAM_ALERT_CHAT_ID`).

---

## Schritt 7 — GitHub Pages aktivieren

Damit die App überhaupt eine Adresse bekommt.

> ⚠️ **Voraussetzung: Das Repo muss öffentlich sein.** GitHub Pages gibt es im kostenlosen Plan nur für öffentliche Repos — bei einem privaten siehst du stattdessen „Upgrade or make this repository public to enable Pages".
>
> Das ist unkritisch: Im Repo liegen **keine Geheimnisse** (Tokens stecken in den GitHub-Secrets, `.env` ist ausgeschlossen, der `anon`-Key ist ohnehin öffentlich). Geschützt werden eure Daten durch den Login und die abgeschalteten Signups — nicht durch die Sichtbarkeit des Codes. Und die veröffentlichte App ist über ihre URL sowieso erreichbar.
>
> Umstellen unter **Settings → General → ganz unten „Change repository visibility"**. Wer den Code privat halten will, nutzt stattdessen Cloudflare Pages oder Vercel (deployen auch aus privaten Repos kostenlos, brauchen aber eine Anpassung des Basis-Pfads).
>
> Bonus: Bei öffentlichen Repos sind GitHub-Actions-Minuten unbegrenzt frei — der tägliche Cron kostet damit nie etwas.

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
2. **Einloggen per Magic Link** — jeder auf seinem eigenen Handy:
   - Eure gemeinsame E-Mail-Adresse eintippen (die aus Schritt 3a) → **Magic-Link senden**.
   - Die Mail von Supabase im gemeinsamen Postfach öffnen — **wichtig: auf demselben Handy**, auf dem du dich einloggen willst.
   - Auf den Link tippen → die App öffnet sich und du bist angemeldet. Kein Passwort nötig.

   > Macht das **nacheinander**, nicht gleichzeitig: Jeder fordert seinen Link an, klickt ihn, und erst dann ist der Nächste dran. So landet nicht der Link des einen versehentlich beim anderen.

   > **Kommt keine Mail?** Schau im Spam-Ordner. Supabase' eingebauter Mailversand ist im Free-Tier limitiert (wenige Mails pro Stunde) — bei mehreren Versuchen hintereinander einfach kurz warten.
   >
   > Kommt „Diese E-Mail ist nicht freigeschaltet", hast du eine Adresse benutzt, die in Schritt 3a nicht angelegt wurde.
   >
   > **Link führt auf eine Fehlerseite?** Dann fehlt die Redirect-URL aus Schritt 3c.
   >
   > **Du klickst den Link, aber die Homescreen-App bleibt ausgeloggt (v.a. iPhone):** Das ist kein Fehler in der App. Eine installierte PWA hat auf iOS einen **eigenen Speicher**, getrennt von Safari — der Link öffnet aber immer in Safari, also landet die Anmeldung dort statt in der App. Auf Android tritt das normalerweise nicht auf.
   >
   > **Auswege:** Nutz die App auf dem betroffenen Handy einfach über **Safari** (Lesezeichen statt Homescreen-Icon) — funktional identisch. Oder sag Claude Bescheid: Der Passwort-Login lässt sich mit wenig Aufwand als Alternative nachrüsten (der Code liegt noch in der Git-History).
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
