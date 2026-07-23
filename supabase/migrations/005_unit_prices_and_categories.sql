-- supabase/migrations/005_unit_prices_and_categories.sql
-- Einmalig im Supabase SQL-Editor ausführen.
--
-- Drei Korrekturen auf einmal:
--
-- 1) GRUNDPREIS als Vergleichsbasis. `price` ist der Packungspreis, nicht der
--    Preis je Einheit (Kerrygold: 1,99 € Packung = 24,88 €/kg). Statistiken auf
--    dem Packungspreis vergleichen verschiedene Gebindegrößen desselben
--    Produkts miteinander und sind dadurch wertlos.
--
-- 2) KATEGORIE mitführen, um Non-Food auszusortieren (Werkzeug- und
--    Möbelwochen der Discounter landen in derselben API-Antwort).
--
-- 3) TIEFPREIS aus abgeschlossenen Zeiträumen. Bisher enthielt der Tiefpreis
--    das laufende Angebot selbst — dadurch war jedes aktuelle Angebot
--    automatisch "Bestpreis". Verglichen wird jetzt nur mit Zeiträumen, die
--    bereits geendet haben.

alter table offers add column if not exists unit_price numeric;
alter table offers add column if not exists unit_old_price numeric;
alter table offers add column if not exists category_id integer;
alter table offers add column if not exists category_parent_id integer;

-- Altbestand nachziehen: Grundpreis, sonst Packungspreis.
update offers
set unit_price = coalesce(reference_price, price)
where unit_price is null;

update offers
set unit_old_price = case
      when old_price is null then null
      when reference_price is null or price is null or price = 0 then old_price
      else round((old_price * (reference_price / price))::numeric, 2)
    end
where unit_old_price is null and old_price is not null;

create index if not exists offers_unit_price_idx on offers (unit_price);

-- Erst löschen: "create or replace view" kann Spalten weder umbenennen noch
-- verschieben, und wir fügen `unit` in die Mitte ein. Ein View hält keine
-- Daten, das Löschen ist also gefahrlos.
drop view if exists product_stats;

create view product_stats
with (security_invoker = on) as
select
  o.product_key,
  (array_agg(o.product order by o.valid_from desc nulls last))[1] as product,
  (array_agg(o.brand   order by o.valid_from desc nulls last))[1] as brand,
  (array_agg(o.unit    order by o.valid_from desc nulls last))[1] as unit,
  count(*)::int                                               as observations,
  min(o.valid_from)                                           as first_seen,
  max(o.valid_to)                                             as last_valid_to,
  min(o.unit_price)                                           as lowest_price,
  -- Nur abgeschlossene Zeiträume: sonst vergleicht sich das laufende
  -- Angebot mit sich selbst und ist zwangsläufig immer "Bestpreis".
  min(o.unit_price) filter (where o.valid_to < now())         as lowest_price_past,
  percentile_cont(0.5) within group (order by o.unit_price)     as typical_price,
  percentile_cont(0.5) within group (order by o.unit_old_price) as regular_price,
  bool_or(o.valid_to >= now())                                as currently_active,
  min(o.unit_price) filter (where o.valid_to >= now())        as current_price,
  min(o.price)      filter (where o.valid_to >= now())        as current_pack_price
from offers o
where o.product_key is not null
  and o.unit_price is not null
  and o.valid_from >= now() - interval '365 days'
group by o.product_key;

grant select on product_stats to authenticated;
