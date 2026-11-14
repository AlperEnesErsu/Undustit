-- Undustit · migration 15: case applications. Run after 14-numune.sql. Safe to run again.
-- 1. The application form asks what a case needs anyway: size or spec, floor price, and what the company
--    offers (sales partnership, idea prize, both), plus the case page's own words (title, short description)
--    and the rest of the offer (grade, trial batch, prize). Free text, as the company writes it; the admin
--    checks it and turns it into numbers when creating the case (yonetim/vaka/?basvuru=…).
-- 2. An application points at the case it became.
-- 3. Whoever signs in with the application's e-mail reads that application, so a company can follow its
--    status in firma/ before its case exists.
alter table public.vaka_basvurulari add column if not exists olcu text not null default '' check (char_length(olcu) <= 160);
alter table public.vaka_basvurulari add column if not exists taban_fiyat text not null default '' check (char_length(taban_fiyat) <= 60);
alter table public.vaka_basvurulari add column if not exists model text not null default '' check (model in ('', 'ortaklik', 'odul', 'ikisi'));
alter table public.vaka_basvurulari add column if not exists vaka_id text references public.vakalar (id) on delete set null;
-- what the case page will say and the rest of the offer, written by the company itself
alter table public.vaka_basvurulari add column if not exists baslik text not null default '' check (char_length(baslik) <= 140);
alter table public.vaka_basvurulari add column if not exists ozet text not null default '' check (char_length(ozet) <= 300);
alter table public.vaka_basvurulari add column if not exists sinif text not null default '' check (char_length(sinif) <= 60);
alter table public.vaka_basvurulari add column if not exists deneme_adedi text not null default '' check (char_length(deneme_adedi) <= 60);
alter table public.vaka_basvurulari add column if not exists odul text not null default '' check (char_length(odul) <= 60);

-- a visitor's application always starts as "new" and unlinked
drop policy if exists basvuru_ekle on public.vaka_basvurulari;
create policy basvuru_ekle on public.vaka_basvurulari for insert to authenticated
  with check (gonderen = auth.uid() and durum = 'yeni' and vaka_id is null);

-- epostam(): the signed-in person's confirmed address, lower case (7-firma.sql); null for an anonymous visitor
drop policy if exists basvuru_kendi on public.vaka_basvurulari;
create policy basvuru_kendi on public.vaka_basvurulari for select to authenticated
  using (lower(eposta) = public.epostam());
