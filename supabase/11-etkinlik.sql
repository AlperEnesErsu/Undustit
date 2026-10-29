-- Undustit · migration 11: events, managed from yonetim/ (they replace the fixed Thursday stream). Run after
-- 10-hata.sql. Safe to run again. Until it runs, the site simply shows no event.
--
-- An event: a title, when it starts (and ends), a few words, and a link (the stream, the meeting room, the sign-up).
-- Everyone reads them; only the admin writes. An event with no end counts as two hours long.

create table if not exists public.etkinlikler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (char_length(baslik) between 1 and 120),
  aciklama text not null default '' check (char_length(aciklama) <= 600),
  baslangic timestamptz not null,
  bitis timestamptz,
  baglanti text not null default '' check (baglanti = '' or (baglanti ~ '^https://' and char_length(baglanti) <= 500)),
  olusturma timestamptz not null default now(),
  check (bitis is null or bitis > baslangic)
);
alter table public.etkinlikler enable row level security;
drop policy if exists etkinlik_oku on public.etkinlikler;
create policy etkinlik_oku on public.etkinlikler for select using (true);
drop policy if exists etkinlik_admin on public.etkinlikler;
create policy etkinlik_admin on public.etkinlikler for all to authenticated using (public.is_admin()) with check (public.is_admin());
create index if not exists etkinlikler_baslangic on public.etkinlikler (baslangic);
