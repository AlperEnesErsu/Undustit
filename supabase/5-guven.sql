-- Undustit · migration 5: contact messages and idea reports. Run once in the Supabase SQL editor,
-- after 4-acilis.sql. Safe to run again. Until it runs, the contact form and "Bildir" say they could
-- not send; the rest of the site is unaffected.

-- ------------------------------------------------------------ contact form (iletisim/)
-- Anyone can write (the site signs the browser in anonymously first); only admins read.
create table if not exists public.iletisim_mesajlari (
  id uuid primary key default gen_random_uuid(),
  gonderen uuid default auth.uid() references auth.users (id) on delete set null,
  ad text not null default '' check (char_length(ad) <= 80),
  eposta text not null check (eposta ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(eposta) <= 160),
  konu text not null default 'genel' check (konu in ('genel','basin','yatirim','ortaklik')),
  mesaj text not null check (char_length(mesaj) between 10 and 2000),
  durum text not null default 'yeni' check (durum in ('yeni','yanitlandi','kapandi')),
  zaman timestamptz not null default now()
);
alter table public.iletisim_mesajlari enable row level security;
drop policy if exists mesaj_ekle on public.iletisim_mesajlari;
create policy mesaj_ekle on public.iletisim_mesajlari for insert to authenticated with check (gonderen = auth.uid());
drop policy if exists mesaj_admin on public.iletisim_mesajlari;
create policy mesaj_admin on public.iletisim_mesajlari for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.mesaj_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.iletisim_mesajlari where gonderen = new.gonderen and zaman > now() - interval '1 day') >= 5 then
    raise exception 'Bugün için mesaj sınırına ulaştın (5).' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists mesaj_zaman on public.iletisim_mesajlari;
create trigger mesaj_zaman before insert on public.iletisim_mesajlari for each row execute function public.sunucu_zamani();
drop trigger if exists mesaj_hiz on public.iletisim_mesajlari;
create trigger mesaj_hiz before insert on public.iletisim_mesajlari for each row execute function public.mesaj_hizi();

-- ------------------------------------------------------------ "Bildir": a visitor flags an idea
-- One report per person per idea; admins see them grouped by idea and either hide the idea or dismiss.
create table if not exists public.fikir_bildirimleri (
  id uuid primary key default gen_random_uuid(),
  fikir_id uuid not null references public.fikirler (id) on delete cascade,
  uye uuid not null default auth.uid() references auth.users (id) on delete cascade,
  neden text not null check (neden in ('spam','uygunsuz','kopya','yaniltici','diger')),
  aciklama text not null default '' check (char_length(aciklama) <= 300),
  durum text not null default 'acik' check (durum in ('acik','gizlendi','yok_sayildi')),
  zaman timestamptz not null default now(),
  unique (fikir_id, uye)
);
alter table public.fikir_bildirimleri enable row level security;
drop policy if exists bildir_ekle on public.fikir_bildirimleri;
create policy bildir_ekle on public.fikir_bildirimleri for insert to authenticated with check (uye = auth.uid());
drop policy if exists bildir_kendi on public.fikir_bildirimleri;
create policy bildir_kendi on public.fikir_bildirimleri for select to authenticated using (uye = auth.uid() or public.is_admin());
drop policy if exists bildir_admin on public.fikir_bildirimleri;
create policy bildir_admin on public.fikir_bildirimleri for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.bildir_hizi() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.fikir_bildirimleri where uye = new.uye and zaman > now() - interval '1 day') >= 20 then
    raise exception 'Bugün için bildirim sınırına ulaştın (20).' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists bildir_zaman on public.fikir_bildirimleri;
create trigger bildir_zaman before insert on public.fikir_bildirimleri for each row execute function public.sunucu_zamani();
drop trigger if exists bildir_hiz on public.fikir_bildirimleri;
create trigger bildir_hiz before insert on public.fikir_bildirimleri for each row execute function public.bildir_hizi();
create index if not exists fikir_bildirimleri_acik on public.fikir_bildirimleri (durum, fikir_id);
