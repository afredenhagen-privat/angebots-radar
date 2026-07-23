-- supabase/migrations/006_remove_stale_non_food.sql
-- Einmalig im Supabase SQL-Editor ausführen.
--
-- Räumt Non-Food auf, das noch aus Läufen VOR dem Kategorie-Filter stammt
-- (Zangen-Sets, Mülleimer, Plüschfiguren aus den Aktionswochen der
-- Discounter). Der Filter in der Pipeline wirkt nur auf neu geschriebene
-- Zeilen — die alten blieben stehen und tauchten weiter in der App auf.
--
-- Erkennungsmerkmal: Zeilen aus der Zeit vor dem Filter haben keine
-- Kategorie gespeichert (`category_parent_id is null`), weil es die Spalte
-- damals noch nicht gab.
--
-- Bewusst NUR aktuell gültige Angebote löschen. Abgelaufene Zeilen sind die
-- Preishistorie; die richtet keinen Schaden an und soll erhalten bleiben.
-- Aktuell gültige Lebensmittel holt der nächste Lauf ohnehin sofort wieder
-- herein — diesmal mit Kategorie.

delete from offers
where category_parent_id is null
  and valid_to >= now();

-- Kontrolle: sollte 0 sein.
select count(*) as verbliebene_ohne_kategorie
from offers
where category_parent_id is null
  and valid_to >= now();
