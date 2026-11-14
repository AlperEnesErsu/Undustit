-- Undustit · migration 17: fair demand. Run after 16-kullanici-adi.sql. Safe to run again.
-- "Alırdım" is the site's ranking, so two easy ways of inflating one's own idea are closed:
-- 1. Nobody says "alırdım" to, or scores, their own idea (a rule of the tables themselves).
-- 2. One browser counts once per idea. The site keeps a random id in a cookie (ud_cihaz) and sends it with
--    "alırdım"; signing out and coming back as a new visitor on the same browser no longer adds a second one,
--    and the browser an idea was written on cannot vote for it under another identity.
-- This stops the casual cases. A private window or a second browser is a new device; only confirmed accounts
-- can close that, and the id is a random string that says nothing about the person.

-- ------------------------------------------------------------ 1. not your own idea
create or replace function public.kendi_oyu() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.fikirler where id = new.fikir_id and sahip = new.uye) then
    raise exception 'Kendi fikrine alırdım diyemez, puan veremezsin.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists talepler_kendi on public.talepler;
create trigger talepler_kendi before insert on public.talepler for each row execute function public.kendi_oyu();
drop trigger if exists puanlar_kendi on public.puanlar;
create trigger puanlar_kendi before insert on public.puanlar for each row execute function public.kendi_oyu();

-- ------------------------------------------------------------ 2. one browser, one "alırdım" per idea
-- Which browser wrote an idea ('sahip') and which said "alırdım" to it ('talep'). Nobody reads this table:
-- row level security is on with no policy, only the two functions below touch it.
create table if not exists public.cihaz_izleri (
  fikir_id uuid not null references public.fikirler (id) on delete cascade,
  cihaz text not null check (cihaz ~ '^[a-z0-9]{16,40}$'),
  tur text not null check (tur in ('sahip', 'talep')),
  uye uuid references auth.users (id) on delete cascade,
  zaman timestamptz not null default now(),
  primary key (fikir_id, cihaz, tur)
);
alter table public.cihaz_izleri enable row level security;
revoke all on public.cihaz_izleri from anon, authenticated;
create index if not exists cihaz_izleri_uye on public.cihaz_izleri (uye);

-- the site calls this right after an idea is written: the browser it was written on
create or replace function public.fikir_cihazi(f uuid, cihaz text) returns void language plpgsql security definer set search_path = public as $$
begin
  if cihaz is null or cihaz !~ '^[a-z0-9]{16,40}$' then return; end if;
  if not exists (select 1 from public.fikirler where id = f and sahip = auth.uid()) then return; end if;
  insert into public.cihaz_izleri (fikir_id, cihaz, tur, uye) values (f, cihaz, 'sahip', auth.uid())
    on conflict on constraint cihaz_izleri_pkey do nothing;
end $$;

-- "alırdım" at a price (or a new price for the one already given)
create or replace function public.alirdim(f uuid, fiyat integer, cihaz text) returns void language plpgsql security definer set search_path = public as $$
declare ben uuid := auth.uid(); c text := case when cihaz ~ '^[a-z0-9]{16,40}$' then cihaz end;
begin
  if ben is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  -- the browser check is for a new "alırdım" only: changing a price already given is always allowed
  if c is not null and not exists (select 1 from public.talepler t where t.fikir_id = f and t.uye = ben) then
    if exists (select 1 from public.cihaz_izleri z where z.fikir_id = f and z.cihaz = c and z.tur = 'sahip' and z.uye is distinct from ben) then
      raise exception 'Bu fikir bu cihazdan yazıldı; kendi fikrine alırdım diyemezsin.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.cihaz_izleri z join public.talepler t on t.fikir_id = z.fikir_id and t.uye = z.uye
               where z.fikir_id = f and z.cihaz = c and z.tur = 'talep' and z.uye is distinct from ben) then
      raise exception 'Bu cihazdan bu fikre zaten alırdım dendi.' using errcode = 'P0001';
    end if;
  end if;
  insert into public.talepler (fikir_id, uye, fiyat) values (f, ben, fiyat)
    on conflict (fikir_id, uye) do update set fiyat = excluded.fiyat;
  if c is not null then
    insert into public.cihaz_izleri (fikir_id, cihaz, tur, uye) values (f, c, 'talep', ben)
      on conflict on constraint cihaz_izleri_pkey do update set uye = excluded.uye, zaman = now();
  end if;
end $$;

revoke all on function public.alirdim(uuid, integer, text) from public, anon;
grant execute on function public.alirdim(uuid, integer, text) to authenticated;
revoke all on function public.fikir_cihazi(uuid, text) from public, anon;
grant execute on function public.fikir_cihazi(uuid, text) to authenticated;
-- not an API (see 9-saglam.sql)
revoke execute on function public.kendi_oyu() from public, anon, authenticated;
