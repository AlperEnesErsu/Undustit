-- Undustit · migration 3: a pace for scores and "alırdım", and ideas linked to their case.
-- Run once in the Supabase SQL editor, after 2-fikirler.sql. Safe to run again.
--
-- Ideas and comments already have a daily cap (2-fikirler.sql); scores and demand did not, so one
-- browser could score or price every idea in seconds. Changing a score or a price you already gave
-- is never limited: only new rows count.

-- ------------------------------------------------------------ daily caps per person
-- 150 scores a day is 50 ideas rated on all three criteria; 100 new "alırdım" a day.
create or replace function public.puan_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.puanlar where fikir_id = new.fikir_id and uye = new.uye and olcut = new.olcut) then
    return new;   -- an upsert that only changes an existing score
  end if;
  if (select count(*) from public.puanlar where uye = new.uye and zaman > now() - interval '1 day') >= 150 then
    raise exception 'Bugün için puanlama sınırına ulaştın (150).' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.talep_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.talepler where fikir_id = new.fikir_id and uye = new.uye) then
    return new;   -- changing the price you already wrote
  end if;
  if (select count(*) from public.talepler where uye = new.uye and zaman > now() - interval '1 day') >= 100 then
    raise exception 'Bugün için talep sınırına ulaştın (100).' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists puanlar_hiz on public.puanlar;
create trigger puanlar_hiz before insert on public.puanlar for each row execute function public.puan_hizi();
drop trigger if exists talepler_hiz on public.talepler;
create trigger talepler_hiz before insert on public.talepler for each row execute function public.talep_hizi();

-- the caps count rows per person and day; these indexes keep that count cheap
create index if not exists puanlar_uye_zaman on public.puanlar (uye, zaman);
create index if not exists talepler_uye_zaman on public.talepler (uye, zaman);
create index if not exists fikirler_vaka on public.fikirler (vaka_id);

-- ------------------------------------------------------------ ideas sent before the site wrote vaka_id
-- The site used to leave vaka_id empty and keep only the case's label as the category.
update public.fikirler set vaka_id = 'vaka-01'
where vaka_id is null and kategori = 'Vaka 01 · Cıvata'
  and exists (select 1 from public.vakalar where id = 'vaka-01');
