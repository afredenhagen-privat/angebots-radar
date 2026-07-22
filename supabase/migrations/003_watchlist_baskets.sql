-- supabase/migrations/003_watchlist_baskets.sql
-- Einmalig im Supabase SQL-Editor ausführen.
--
-- Macht aus einem Merkzettel-Eintrag einen benannten Korb konkreter Produkte.
-- Damit lassen sich Eigenmarken verschiedener Händler zusammenfassen
-- ("Hafermilch" = Vemondo bei Lidl + K-Bio bei Kaufland) und es wird exakt
-- über den Produkt-Schlüssel gematcht statt per Teilstring — Fehltreffer wie
-- "Rama mit Butter" bei der Suche nach Butter fallen damit weg.

alter table watchlist
  add column if not exists product_keys text[] not null default '{}';

-- `term` bleibt bestehen und dient jetzt als Anzeigename des Korbs.
-- Bestehende Einträge ohne Produkte matchen weiterhin per Teilstring,
-- damit nichts still aufhört zu funktionieren.
comment on column watchlist.term is 'Anzeigename des Korbs (früher: Freitext-Suchbegriff)';
comment on column watchlist.product_keys is 'Produkt-Schlüssel im Korb; leer = alte Freitext-Logik';
