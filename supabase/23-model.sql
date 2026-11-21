-- Undustit · migration 23: a 3D model of the product (.glb) next to its photo. Run after 22-kaynak.sql.
-- Safe to run again. Plan: docs/denetim-raporu.md §4, stage 1 (who has a 3D file uploads it).
--
-- cases.model_url: the public address of the .glb. The case page and the technical sheet show it turnable and
-- zoomable (<model-viewer>), the photo stays as its poster; on a phone "AR'da gör" puts it in the room.
-- Storage: its own public bucket "modeller", .glb only, 20 MB (the photo bucket stays at 5 MB, images only):
--   vaka/<uid>/...   the admin, or a case's company (same rule and daily limit as the photo, 7-firma.sql)

alter table public.cases add column if not exists model_url text not null default ''
  check (model_url = '' or (model_url ~ '^https://' and char_length(model_url) <= 500));
comment on column public.cases.model_url is 'Public address of the product''s 3D model (.glb, bucket "modeller"); empty = none.';
-- visitors read open cases column by column (8-gizli.sql): the model is public like the photo
grant select (model_url) on public.cases to anon, authenticated;

-- the case's company sets its own model, like set_case_image()
create or replace function public.set_case_model(p_case_id text, p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_case_company(p_case_id) then raise exception 'Bu vaka için yetkin yok' using errcode = '42501'; end if;
  if coalesce(p_url, '') <> '' and (p_url !~ '^https://' or char_length(p_url) > 500) then
    raise exception 'Model adresi https ile başlamalı' using errcode = '22023';
  end if;
  update public.cases set model_url = coalesce(p_url, ''), updated_at = now() where id = p_case_id;
end $$;
revoke all on function public.set_case_model(text, text) from public, anon;
grant execute on function public.set_case_model(text, text) to authenticated;

do $$ begin
  if to_regnamespace('storage') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('modeller', 'modeller', true, 20971520, array['model/gltf-binary'])
    on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  drop policy if exists models_admin on storage.objects;
  create policy models_admin on storage.objects for all to authenticated
    using (bucket_id = 'modeller' and public.is_admin()) with check (bucket_id = 'modeller' and public.is_admin());
  drop policy if exists models_company_upload on storage.objects;
  create policy models_company_upload on storage.objects for insert to authenticated
    with check (bucket_id = 'modeller' and (storage.foldername(name))[1] = 'vaka'
      and (storage.foldername(name))[2] = auth.uid()::text and public.is_any_company() and public.can_upload_image());
end $$;
