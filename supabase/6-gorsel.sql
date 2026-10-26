-- Undustit · migration 6: product photos. Run once in the Supabase SQL editor, after 5-guven.sql.
-- Safe to run again. Until it runs, photo uploads say they could not send; everything else works.
--
-- One public bucket, "gorseller":
--   vaka/<uid>/...      the case photo shown in the technical sheet; only admins upload here
--   basvuru/<uid>/...   a photo a company attaches to its "Vakanı aç" application; the visitor's own folder,
--                       at most 5 a day. Paths carry a random part, so only the admin panel links to them.
-- The site shrinks every photo in the browser first (long side 1600px, JPEG), so 5 MB is a generous ceiling.

alter table public.vaka_basvurulari add column if not exists gorsel text not null default ''
  check (gorsel = '' or (gorsel ~ '^https://' and char_length(gorsel) <= 500));

-- how many photos this person stored today (security definer: visitors cannot read storage.objects)
create or replace function public.gorsel_hakki() returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from storage.objects where owner = auth.uid() and created_at > now() - interval '1 day') < 5
$$;

do $$ begin
  if to_regnamespace('storage') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('gorseller', 'gorseller', true, 5242880, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  drop policy if exists gorsel_basvuru on storage.objects;
  create policy gorsel_basvuru on storage.objects for insert to authenticated
    with check (bucket_id = 'gorseller' and (storage.foldername(name))[1] = 'basvuru'
      and (storage.foldername(name))[2] = auth.uid()::text and public.gorsel_hakki());
  drop policy if exists gorsel_admin on storage.objects;
  create policy gorsel_admin on storage.objects for all to authenticated
    using (bucket_id = 'gorseller' and public.is_admin()) with check (bucket_id = 'gorseller' and public.is_admin());
end $$;
