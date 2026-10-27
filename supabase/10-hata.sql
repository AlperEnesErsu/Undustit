-- Undustit · migration 10: a small error log, so a broken page is noticed without an outside service.
-- Run after 9-saglam.sql. Safe to run again.
--
-- The site sends an uncaught browser error here (at most a few per page view); the admin reads them in yonetim/.
-- Anyone may write (a visitor without a session too, the error may be the reason there is none), nobody but the
-- admin reads. Lengths are capped, and past 300 rows in ten minutes new rows are dropped, so the table cannot be
-- flooded.

create table if not exists public.hata_kayitlari (
  id bigserial primary key,
  zaman timestamptz not null default now(),
  sayfa text not null default '' check (char_length(sayfa) <= 300),
  mesaj text not null check (char_length(mesaj) between 1 and 500),
  kaynak text not null default '' check (char_length(kaynak) <= 300),
  satir integer,
  tarayici text not null default '' check (char_length(tarayici) <= 300),
  uye uuid default auth.uid(),
  durum text not null default 'yeni' check (durum in ('yeni','cozuldu'))
);
alter table public.hata_kayitlari enable row level security;
drop policy if exists hata_ekle on public.hata_kayitlari;
create policy hata_ekle on public.hata_kayitlari for insert to anon, authenticated with check (durum = 'yeni');
drop policy if exists hata_admin on public.hata_kayitlari;
create policy hata_admin on public.hata_kayitlari for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.hata_kayitlari from anon;
grant insert (sayfa, mesaj, kaynak, satir, tarayici) on public.hata_kayitlari to anon, authenticated;
grant select, update, delete on public.hata_kayitlari to authenticated;
do $$ begin
  if exists (select 1 from pg_class where relname = 'hata_kayitlari_id_seq') then
    grant usage on sequence public.hata_kayitlari_id_seq to anon, authenticated;
  end if;
end $$;

-- a flood guard: the server's clock, and no more than 300 rows in ten minutes
create or replace function public.hata_sel() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.hata_kayitlari where zaman > now() - interval '10 minutes') >= 300 then return null; end if;
  new.zaman := now();
  return new;
end $$;
revoke execute on function public.hata_sel() from public, anon, authenticated;
drop trigger if exists hata_sel on public.hata_kayitlari;
create trigger hata_sel before insert on public.hata_kayitlari for each row execute function public.hata_sel();
create index if not exists hata_kayitlari_zaman on public.hata_kayitlari (zaman desc);
