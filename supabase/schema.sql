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
