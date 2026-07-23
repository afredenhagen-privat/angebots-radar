-- supabase/schema.sql
-- Ausführen im Supabase SQL-Editor.

create table if not exists offers (
  id text primary key,
  retailer text,
  product text,
  brand text,
  price numeric,            -- Packungspreis
  old_price numeric,        -- Streichpreis (Packung)
  reference_price numeric,  -- Grundpreis je Einheit, von Marktguru
  unit_price numeric,       -- Vergleichsbasis: Grundpreis, sonst Packungspreis
  unit_old_price numeric,   -- Streichpreis auf dieselbe Basis umgerechnet
  unit text,                -- Einheit des Grundpreises (kg, l, Stk)
  category_id integer,
  category_parent_id integer,
  valid_from timestamptz,
  valid_to timestamptz,
  zip_code text,
  image_id text,
  category text,
  -- Gruppierungsschlüssel für die Preisstatistik (siehe shared/productKey.js).
  product_key text,
  fetched_at timestamptz not null default now()
);

-- offers ist die Preis-HISTORIE: abgelaufene Angebote bleiben stehen und
-- werden erst nach 2 Jahren weggeräumt. "Aktuell im Angebot" = valid_to >= now().
create index if not exists offers_product_key_idx on offers (product_key);
create index if not exists offers_valid_to_idx on offers (valid_to);

-- Ein Merkzettel-Eintrag ist ein benannter Korb konkreter Produkte:
-- `term` ist der Anzeigename, `product_keys` die enthaltenen Produkte.
-- Leerer Korb = alte Freitext-Logik (Teilstring über Produkt + Marke).
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  product_keys text[] not null default '{}',
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

-- Preisstatistik je Produkt über die letzten 365 Tage.
-- Speist Suche, Produkt-Detail und die Suchhilfe beim Hinzufügen.
-- security_invoker => die RLS-Regeln von offers greifen weiterhin.
create or replace view product_stats
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
