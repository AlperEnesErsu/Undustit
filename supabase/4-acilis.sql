-- Undustit · migration 4: launch readiness. Run once in the Supabase SQL editor, after 3-hiz.sql.
-- Safe to run again. The site works before this runs (it falls back to reading every row); after it,
-- each page reads one summary row per idea instead of every price, score and comment.

-- ------------------------------------------------------------ 1. one row per idea, totals computed here
-- security_invoker: the view runs with the reader's RLS, so hidden ideas stay hidden.
create or replace view public.fikir_kart
with (security_invoker = true) as
select
  f.id, f.sahip, f.vaka_id, f.baslik, f.kategori, f.problem, f.cozum, f.ozellikler, f.ad, f.zaman,
  coalesce(t.alici, 0)    as alici,
  coalesce(t.ort, 0)      as ort_fiyat,
  coalesce(p.puanci, 0)   as puanci,
  coalesce(p.d, 0)        as puan_d,
  coalesce(p.m, 0)        as puan_m,
  coalesce(p.u, 0)        as puan_u,
  coalesce(y.sayi, 0)     as yorum
from public.fikirler f
left join lateral (select count(*) as alici, round(avg(fiyat)::numeric, 2) as ort
                   from public.talepler where fikir_id = f.id) t on true
left join lateral (select count(distinct uye) as puanci,
                          round(avg(puan) filter (where olcut = 'd')::numeric, 2) as d,
                          round(avg(puan) filter (where olcut = 'm')::numeric, 2) as m,
                          round(avg(puan) filter (where olcut = 'u')::numeric, 2) as u
                   from public.puanlar where fikir_id = f.id) p on true
left join lateral (select count(*) as sayi from public.yorumlar where fikir_id = f.id) y on true;

grant select on public.fikir_kart to anon, authenticated;

create index if not exists yorumlar_fikir on public.yorumlar (fikir_id, zaman);
create index if not exists fikirler_zaman on public.fikirler (zaman desc);

-- ------------------------------------------------------------ 2. "Vakanı aç": a company applies with its stock
-- Anyone can apply (the site signs the browser in anonymously first); only admins read them.
create table if not exists public.vaka_basvurulari (
  id uuid primary key default gen_random_uuid(),
  gonderen uuid default auth.uid() references auth.users (id) on delete set null,
  firma text not null check (char_length(firma) between 2 and 120),
  kisi text not null default '' check (char_length(kisi) <= 80),
  eposta text not null check (eposta ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(eposta) <= 160),
  telefon text not null default '' check (char_length(telefon) <= 40),
  stok text not null check (char_length(stok) between 3 and 300),
  adet text not null default '' check (char_length(adet) <= 60),
  notlar text not null default '' check (char_length(notlar) <= 1000),
  durum text not null default 'yeni' check (durum in ('yeni','incelendi','kabul','red')),
  zaman timestamptz not null default now()
);
alter table public.vaka_basvurulari enable row level security;
drop policy if exists basvuru_ekle on public.vaka_basvurulari;
create policy basvuru_ekle on public.vaka_basvurulari for insert to authenticated with check (gonderen = auth.uid());
drop policy if exists basvuru_admin on public.vaka_basvurulari;
create policy basvuru_admin on public.vaka_basvurulari for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.basvuru_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.vaka_basvurulari where gonderen = new.gonderen and zaman > now() - interval '1 day') >= 3 then
    raise exception 'Bugün için başvuru sınırına ulaştın (3).' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists basvuru_zaman on public.vaka_basvurulari;
create trigger basvuru_zaman before insert on public.vaka_basvurulari for each row execute function public.sunucu_zamani();
drop trigger if exists basvuru_hiz on public.vaka_basvurulari;
create trigger basvuru_hiz before insert on public.vaka_basvurulari for each row execute function public.basvuru_hizi();

-- ------------------------------------------------------------ 3. "Haber ver": an e-mail to reach someone later
-- tur 'fikrim': the idea's owner wants to hear about its first "alırdım".
-- tur 'alirdim': a buyer wants to hear when the product goes on pre-sale.
-- E-mail addresses are private: a person sees only their own rows, admins see all.
create table if not exists public.haber_istekleri (
  id uuid primary key default gen_random_uuid(),
  uye uuid not null default auth.uid() references auth.users (id) on delete cascade,
  eposta text not null check (eposta ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(eposta) <= 160),
  fikir_id uuid not null references public.fikirler (id) on delete cascade,
  tur text not null check (tur in ('fikrim','alirdim')),
  gonderildi timestamptz,
  zaman timestamptz not null default now(),
  unique (uye, fikir_id, tur)
);
alter table public.haber_istekleri enable row level security;
drop policy if exists haber_kendi on public.haber_istekleri;
create policy haber_kendi on public.haber_istekleri for all to authenticated
  using (uye = auth.uid() or public.is_admin()) with check (uye = auth.uid() or public.is_admin());

create or replace function public.haber_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.haber_istekleri where uye = new.uye and zaman > now() - interval '1 day') >= 30 then
    raise exception 'Bugün için haber isteği sınırına ulaştın (30).' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists haber_zaman on public.haber_istekleri;
create trigger haber_zaman before insert on public.haber_istekleri for each row execute function public.sunucu_zamani();
drop trigger if exists haber_hiz on public.haber_istekleri;
create trigger haber_hiz before insert on public.haber_istekleri for each row execute function public.haber_hizi();
