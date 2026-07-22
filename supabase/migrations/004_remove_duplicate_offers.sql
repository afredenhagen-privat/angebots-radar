-- supabase/migrations/004_remove_duplicate_offers.sql
-- Einmalig im Supabase SQL-Editor ausführen.
--
-- Räumt inhaltliche Dubletten auf, die entstanden sind, weil dasselbe Angebot
-- je abgefragter PLZ (97204 und 97070) mit einer eigenen Marktguru-ID geliefert
-- wird. Sie standen doppelt in der Liste und zählten doppelt als Beobachtung
-- in der Preisstatistik ("Basis: 2 Beobachtungen", obwohl es eine ist).
--
-- Die Pipeline entdoppelt seit shared/dedupe.js selbst — das hier bereinigt
-- den Altbestand. Es bleibt jeweils die zuerst eingefügte Zeile stehen.

with dubletten as (
  select ctid,
         row_number() over (
           partition by product_key, retailer, price, valid_from, valid_to
           order by fetched_at, id
         ) as rang
  from offers
)
delete from offers o
using dubletten d
where o.ctid = d.ctid
  and d.rang > 1;

-- Kontrolle: sollte 0 Zeilen liefern.
select product_key, retailer, price, valid_to, count(*)
from offers
group by product_key, retailer, price, valid_from, valid_to
having count(*) > 1;
