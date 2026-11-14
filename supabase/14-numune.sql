-- Undustit · migration 14: product requests. Run after 13-moderasyon.sql. Safe to run again.
-- "Ürünü görmek istiyorum" on a case page: a visitor who wants to see, try or buy the stock itself leaves
-- a name and a way to reach them. It is a request, not an order: nothing is paid. Anyone can send one (the
-- site signs the browser in anonymously first); only admins read them (yonetim/ > Ürün talepleri).
create table if not exists public.numune_talepleri (
  id uuid primary key default gen_random_uuid(),
  gonderen uuid default auth.uid() references auth.users (id) on delete set null,
  vaka_id text not null references public.vakalar (id) on delete cascade,
  amac text not null default 'gormek' check (amac in ('gormek','denemek','satin')),
  tur text not null default 'bireysel' check (tur in ('bireysel','firma')),
  ad text not null check (char_length(ad) between 2 and 80),
  eposta text not null check (eposta ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(eposta) <= 160),
  telefon text not null default '' check (char_length(telefon) <= 40),
  sehir text not null default '' check (char_length(sehir) <= 60),
  adet text not null default '' check (char_length(adet) <= 60),
  notlar text not null default '' check (char_length(notlar) <= 500),
  durum text not null default 'yeni' check (durum in ('yeni','arandi','gonderildi','kapandi')),
  zaman timestamptz not null default now()
);
create index if not exists numune_vaka on public.numune_talepleri (vaka_id, zaman desc);
create index if not exists numune_gonderen on public.numune_talepleri (gonderen);

alter table public.numune_talepleri enable row level security;
drop policy if exists numune_ekle on public.numune_talepleri;
create policy numune_ekle on public.numune_talepleri for insert to authenticated with check (gonderen = auth.uid() and durum = 'yeni');
drop policy if exists numune_admin on public.numune_talepleri;
create policy numune_admin on public.numune_talepleri for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.numune_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.numune_talepleri where gonderen = new.gonderen and zaman > now() - interval '1 day') >= 5 then
    raise exception 'Bugün için talep sınırına ulaştın (5).' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists numune_zaman on public.numune_talepleri;
create trigger numune_zaman before insert on public.numune_talepleri for each row execute function public.sunucu_zamani();
drop trigger if exists numune_hiz on public.numune_talepleri;
create trigger numune_hiz before insert on public.numune_talepleri for each row execute function public.numune_hizi();

-- not an API (see 9-saglam.sql)
revoke execute on function public.numune_hizi() from public, anon, authenticated;
