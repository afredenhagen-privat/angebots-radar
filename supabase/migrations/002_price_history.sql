-- supabase/migrations/002_price_history.sql
-- Einmalig im Supabase SQL-Editor ausführen.
--
-- Macht aus der "offers"-Tabelle (bisher: nur aktueller Schnappschuss) die
-- Preishistorie und legt die Statistik-Sicht für Suche und Preisverlauf an.

-- 1) Gruppierungsschlüssel pro konkretem Produkt (Marke + Produktname).
alter table offers add column if not exists product_key text;

-- 2) Bestehende Zeilen nachziehen. Muss identisch zu shared/productKey.js sein:
--    kleinschreiben, Leerraum vereinheitlichen, mit "|" verbinden.
update offers
set product_key = nullif(
      btrim(lower(regexp_replace(coalesce(brand, ''), '\s+', ' ', 'g'))) || '|' ||
      btrim(lower(regexp_replace(coalesce(product, ''), '\s+', ' ', 'g'))),
      '|')
where product_key is null;

-- 3) Indizes für Statistik-Gruppierung und "aktuell im Angebot"-Abfragen.
create index if not exists offers_product_key_idx on offers (product_key);
create index if not exists offers_valid_to_idx on offers (valid_to);

-- 4) Statistik je Produkt über die letzten 365 Tage.
--    security_invoker => die RLS-Regeln der offers-Tabelle greifen weiterhin.
create or replace view product_stats
with (security_invoker = on) as
select
  o.product_key,
  (array_agg(o.product order by o.valid_from desc nulls last))[1] as product,
  (array_agg(o.brand   order by o.valid_from desc nulls last))[1] as brand,
  count(*)::int                                          as observations,
  min(o.valid_from)                                      as first_seen,
  max(o.valid_to)                                        as last_valid_to,
  min(o.price)                                           as lowest_price,
  percentile_cont(0.5) within group (order by o.price)     as typical_price,
  percentile_cont(0.5) within group (order by o.old_price) as regular_price,
  bool_or(o.valid_to >= now())                           as currently_active,
  min(o.price) filter (where o.valid_to >= now())        as current_price
from offers o
where o.product_key is not null
  and o.price is not null
  and o.valid_from >= now() - interval '365 days'
group by o.product_key;

grant select on product_stats to authenticated;
