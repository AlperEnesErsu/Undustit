-- Undustit · migration 7: the company panel (firma/). Run once in the Supabase SQL editor, after 6-gorsel.sql.
-- Safe to run again. Until it runs, the panel says it has no case for you and the admin's "Firma erişimi" tab
-- cannot save; everything else works.
--
-- An admin adds a company's e-mail to a case (yonetim > vaka > Firma erişimi). Whoever signs in with that e-mail
-- (magic link) sees the case in firma/, drafts included, and may set its product photo; nothing else changes.
-- Identity is the e-mail stored on the account (auth.users), which Supabase only updates once the address is
-- confirmed when "Confirm email" is on. Keep it on: with it off, anyone could claim an address.

create table if not exists public.vaka_firmalari (
  vaka_id text not null references public.vakalar (id) on delete cascade,
  eposta text not null check (eposta = lower(eposta) and eposta ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(eposta) <= 160),
  eklenme timestamptz not null default now(),
  primary key (vaka_id, eposta)
);
alter table public.vaka_firmalari enable row level security;

-- the signed-in person's e-mail, lower-cased (security definer: auth.users is not readable by visitors)
create or replace function public.epostam() returns text language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid()
$$;
create or replace function public.firma_mi(v text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vaka_firmalari where vaka_id = v and eposta = public.epostam())
$$;
create or replace function public.firma_herhangi() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vaka_firmalari where eposta = public.epostam())
$$;

drop policy if exists firma_admin on public.vaka_firmalari;
create policy firma_admin on public.vaka_firmalari for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists firma_kendi on public.vaka_firmalari;
create policy firma_kendi on public.vaka_firmalari for select to authenticated using (eposta = public.epostam());

-- a company reads its own case even while it is a draft
drop policy if exists vakalar_firma_oku on public.vakalar;
create policy vakalar_firma_oku on public.vakalar for select to authenticated using (public.firma_mi(id));

-- the only thing a company changes: its case's product photo (an https address from the gorseller bucket, or '')
create or replace function public.firma_gorsel(v text, adres text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.firma_mi(v) then raise exception 'Bu vaka için yetkin yok' using errcode = '42501'; end if;
  if coalesce(adres, '') <> '' and (adres !~ '^https://' or char_length(adres) > 500) then
    raise exception 'Görsel adresi https ile başlamalı' using errcode = '22023';
  end if;
  update public.vakalar set gorsel = coalesce(adres, ''), guncelleme = now() where id = v;
end $$;
revoke all on function public.firma_gorsel(text, text) from public;
grant execute on function public.firma_gorsel(text, text) to authenticated;

-- and the file itself: a company stores photos under vaka/<own id>/, within the same daily limit.
-- The limit is defined again here (same body as in 6-gorsel.sql), so this file runs even where 6 did not finish.
do $$ begin
  if to_regnamespace('storage') is null then return; end if;
  create or replace function public.gorsel_hakki() returns boolean language sql stable security definer set search_path = public as $f$
    select (select count(*) from storage.objects where owner = auth.uid() and created_at > now() - interval '1 day') < 5
  $f$;
  drop policy if exists gorsel_firma on storage.objects;
  create policy gorsel_firma on storage.objects for insert to authenticated
    with check (bucket_id = 'gorseller' and (storage.foldername(name))[1] = 'vaka'
      and (storage.foldername(name))[2] = auth.uid()::text and public.firma_herhangi() and public.gorsel_hakki());
end $$;
