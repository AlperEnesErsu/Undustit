-- Undustit · migration 2: the public site's ideas, "alırdım", scores and comments move to Postgres.
-- Run once in the Supabase SQL editor, after sema.sql. Safe to run again (every step checks first).
--
-- Visitors have no account: the site signs each browser in anonymously on its first write
-- (Authentication > Sign In / Providers > "Allow anonymous sign-ins" must be ON). Anonymous users
-- are 'authenticated' to RLS, so the existing "own rows only" policies apply to them unchanged.

-- ------------------------------------------------------------ comments carry the display name
alter table public.yorumlar add column if not exists ad text not null default '';

-- ------------------------------------------------------------ the form's limits, enforced by the database too
do $$ begin
  alter table public.fikirler add constraint fikirler_sinirlar check (
    char_length(problem) <= 400 and char_length(cozum) <= 400 and char_length(ad) <= 30
    and char_length(kategori) <= 40 and coalesce(array_length(ozellikler, 1), 0) <= 3
    and char_length(baslik) >= 10);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.yorumlar add constraint yorumlar_ad_sinir check (char_length(ad) <= 30);
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ the 1-5 scores on design, market, feasibility
create table if not exists public.puanlar (
  fikir_id uuid not null references public.fikirler (id) on delete cascade,
  uye uuid not null references auth.users (id) on delete cascade,
  olcut text not null check (olcut in ('d','m','u')),
  puan smallint not null check (puan between 1 and 5),
  zaman timestamptz not null default now(),
  primary key (fikir_id, uye, olcut)
);
alter table public.puanlar enable row level security;
drop policy if exists puanlar_oku on public.puanlar;
create policy puanlar_oku on public.puanlar for select using (true);
drop policy if exists puanlar_yaz on public.puanlar;
create policy puanlar_yaz on public.puanlar for insert to authenticated with check (uye = auth.uid());
drop policy if exists puanlar_guncelle on public.puanlar;
create policy puanlar_guncelle on public.puanlar for update to authenticated using (uye = auth.uid()) with check (uye = auth.uid());
drop policy if exists puanlar_sil on public.puanlar;
create policy puanlar_sil on public.puanlar for delete to authenticated using (uye = auth.uid());

-- ------------------------------------------------------------ an owner can withdraw their own idea
drop policy if exists fikirler_sahip_sil on public.fikirler;
create policy fikirler_sahip_sil on public.fikirler for delete to authenticated using (sahip = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ the server owns the clock and the pace
-- A client can't backdate or postdate a row (the 30 days count from here), and one person can't flood
-- the list: at most 10 ideas and 60 comments a day each.
create or replace function public.sunucu_zamani() returns trigger language plpgsql as $$
begin new.zaman := now(); return new; end $$;

create or replace function public.fikir_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.fikirler where sahip = new.sahip and zaman > now() - interval '1 day') >= 10 then
    raise exception 'Bugün için fikir sınırına ulaştın (10).' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.yorum_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.yorumlar where uye = new.uye and zaman > now() - interval '1 day') >= 60 then
    raise exception 'Bugün için yorum sınırına ulaştın (60).' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists fikirler_zaman on public.fikirler;
create trigger fikirler_zaman before insert on public.fikirler for each row execute function public.sunucu_zamani();
drop trigger if exists fikirler_hiz on public.fikirler;
create trigger fikirler_hiz before insert on public.fikirler for each row execute function public.fikir_hizi();
drop trigger if exists yorumlar_zaman on public.yorumlar;
create trigger yorumlar_zaman before insert on public.yorumlar for each row execute function public.sunucu_zamani();
drop trigger if exists yorumlar_hiz on public.yorumlar;
create trigger yorumlar_hiz before insert on public.yorumlar for each row execute function public.yorum_hizi();
drop trigger if exists talepler_zaman on public.talepler;
create trigger talepler_zaman before insert or update on public.talepler for each row execute function public.sunucu_zamani();
drop trigger if exists puanlar_zaman on public.puanlar;
create trigger puanlar_zaman before insert or update on public.puanlar for each row execute function public.sunucu_zamani();
