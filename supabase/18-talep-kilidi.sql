-- Undustit · migration 18: "alırdım" only through alirdim(). Run after 17-oy.sql. Safe to run again.
-- 17-oy.sql added the browser check inside alirdim(), but two doors stayed open around it:
-- 1. The insert rule talepler_yaz still let a signed-in visitor write a row straight to the table through the
--    REST API, skipping the browser check altogether.
-- 2. alirdim() skipped the check when no browser id came with the call.
-- Both are closed here: a new "alırdım" needs the browser id and goes through alirdim() only. Changing a price
-- already given and taking one's "alırdım" back stay as they were (talepler_guncelle, talepler_sil).
-- 3. The highest price drops from 100,000 to 20,000 ₺: one made-up price no longer moves the demand total
--    and the average on its own (the site's TERMS.maxPrice and veri.js MAKS_FIYAT follow).

-- ------------------------------------------------------------ 1. no plain insert
drop policy if exists talepler_yaz on public.talepler;
revoke insert on public.talepler from anon, authenticated;

-- ------------------------------------------------------------ 3. price ceiling
alter table public.talepler drop constraint if exists talepler_fiyat_check;
update public.talepler set fiyat = 20000 where fiyat > 20000;
alter table public.talepler add constraint talepler_fiyat_check check (fiyat > 0 and fiyat <= 20000);

-- ------------------------------------------------------------ 2. the browser id is required for a new one
create or replace function public.alirdim(f uuid, fiyat integer, cihaz text) returns void language plpgsql security definer set search_path = public as $$
declare ben uuid := auth.uid(); c text := case when cihaz ~ '^[a-z0-9]{16,40}$' then cihaz end;
begin
  if ben is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  -- the browser check is for a new "alırdım" only: changing a price already given is always allowed
  if not exists (select 1 from public.talepler t where t.fikir_id = f and t.uye = ben) then
    if c is null then
      raise exception 'Tarayıcı kimliği eksik; sayfayı yenileyip tekrar dene.' using errcode = 'P0001';
    end if;
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
