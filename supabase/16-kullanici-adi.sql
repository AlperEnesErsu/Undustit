-- Undustit · migration 16: a username for the admin panel. Run after 15-basvuru.sql. Safe to run again.
-- An admin may pick a username and sign in with it instead of the e-mail address (giris/, yonetim/).
-- Supabase signs people in by e-mail, so the site first asks giris_eposta() which address a username
-- belongs to. That answer is given for admin accounts only: their addresses are already public in
-- assets/ayar.js, so nothing new is revealed; a member's address can never be looked up this way.
alter table public.profiller add column if not exists kullanici_adi text check (kullanici_adi ~ '^[a-z0-9_.]{3,24}$');
create unique index if not exists profiller_kullanici_adi on public.profiller (kullanici_adi) where kullanici_adi is not null;

-- the signed-in admin sets (or, with an empty text, removes) their own username; profiller has no write policy
create or replace function public.kullanici_adi_koy(ad text) returns text language plpgsql security definer set search_path = public as $$
declare v text := nullif(lower(btrim(coalesce(ad, ''))), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Kullanıcı adı yalnız yönetici hesapları için' using errcode = '42501';
  end if;
  if v is not null and v !~ '^[a-z0-9_.]{3,24}$' then
    raise exception 'Kullanıcı adı 3–24 karakter olmalı: harf, rakam, nokta, alt çizgi' using errcode = '22023';
  end if;
  begin
    update public.profiller set kullanici_adi = v where id = auth.uid();
  exception when unique_violation then
    raise exception 'Bu kullanıcı adı alınmış' using errcode = '23505';
  end;
  return v;
end $$;

-- which address signs in for this username: admins only, null for anything else
create or replace function public.giris_eposta(ad text) returns text language sql stable security definer set search_path = public as $$
  select u.email::text from public.profiller p join auth.users u on u.id = p.id
  where p.kullanici_adi = lower(btrim(ad)) and p.rol = 'admin'
$$;

revoke all on function public.kullanici_adi_koy(text) from public, anon;
grant execute on function public.kullanici_adi_koy(text) to authenticated;
revoke all on function public.giris_eposta(text) from public;
grant execute on function public.giris_eposta(text) to anon, authenticated;
