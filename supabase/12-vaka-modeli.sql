-- Undustit · migration 12: what a case offers, chosen when it is opened. Run after 11-etkinlik.sql. Safe to run again.
--
--   ortaklik  sales partnership: the most wanted idea is made in a trial batch, contributors share the profit
--             (TERMS.caseShare: 40% to the idea's owner, 10% to the chosen name, look, box and channel)
--   odul      an idea prize in Turkish lira: the company pays the chosen idea(s) this amount and keeps the
--             making and selling; 0 = no prize
-- A case offers one or both (never neither). Both are public: visitors see them on the case page.

alter table public.vakalar add column if not exists ortaklik boolean not null default true;
alter table public.vakalar add column if not exists odul numeric(12,2) not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'vakalar_model_kontrol') then
    alter table public.vakalar add constraint vakalar_model_kontrol check (odul >= 0 and (ortaklik or odul > 0));
  end if;
end $$;
-- 8-gizli.sql gives visitors the public columns one by one: these two are public too. Running 8 again resets the
-- column rights, so run this file again after it.
grant select (ortaklik, odul) on public.vakalar to anon, authenticated;
