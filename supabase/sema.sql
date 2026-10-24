-- Undustit veri şeması (Supabase / Postgres). Supabase SQL Editor'da bir kez çalıştırın.
-- Kurulum adımları: supabase/KURULUM.md

-- ------------------------------------------------------------ tablolar

-- Kullanıcı profili: her auth kullanıcısının bir satırı (trigger ile oluşur). rol 'admin' ise yönetici.
create table public.profiller (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  rol text not null default 'uye' check (rol in ('admin','uye'))
);

-- Vakalar. Alan adları ürün sözleşmesiyle (docs/urun-sozlesmesi.md §2) aynıdır.
create table public.vakalar (
  id text primary key,
  baslik text not null check (char_length(baslik) between 1 and 140),
  ozet text not null default '',
  aciklama text not null default '',
  firma text not null default '',
  stok text not null default '',
  adet integer not null check (adet > 0),
  olcu text not null default '',
  sinif text not null default '',
  taban_fiyat numeric(12,2) not null default 0 check (taban_fiyat >= 0),
  deneme_adedi integer not null default 0 check (deneme_adedi >= 0),
  sure_gun integer not null default 30 check (sure_gun > 0),
  gorsel text not null default '',
  durum text not null default 'taslak'
    check (durum in ('taslak','acik','degerlendirme','kazanan','uretim','kapali')),
  acilis timestamptz,
  kapanis timestamptz,
  kazanan uuid,                       -- fikirler.id; FK aşağıda, fikirler tablosundan sonra eklenir
  olusturan text,
  olusturma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);

-- Durum geçmişi (zaman çizelgesi). "not" sütunu SQL anahtar sözcüğü olduğu için tırnaklıdır.
create table public.vaka_gecmis (
  id bigserial primary key,
  vaka_id text not null references public.vakalar (id) on delete cascade,
  durum text not null check (durum in ('taslak','acik','degerlendirme','kazanan','uretim','kapali')),
  "not" text not null default '',
  kim text,
  zaman timestamptz not null default now()
);

-- Fikirler. vaka_id null ise vakadan bağımsız fikir.
create table public.fikirler (
  id uuid primary key default gen_random_uuid(),
  vaka_id text references public.vakalar (id) on delete set null,
  sahip uuid references auth.users (id) on delete cascade,
  baslik text not null check (char_length(baslik) <= 140),
  kategori text not null default '',
  problem text not null default '',
  cozum text not null default '',
  ozellikler text[] not null default '{}',
  ad text not null default '',
  gizli boolean not null default false,
  zaman timestamptz not null default now()
);

alter table public.vakalar
  add constraint vakalar_kazanan_fk foreign key (kazanan) references public.fikirler (id) on delete set null;

-- Talepler: bir üyenin bir fikre ödemeye hazır olduğu fiyat (oy değil, satın alma niyeti).
create table public.talepler (
  fikir_id uuid not null references public.fikirler (id) on delete cascade,
  uye uuid not null references auth.users (id) on delete cascade,
  fiyat integer not null check (fiyat > 0 and fiyat <= 100000),
  zaman timestamptz not null default now(),
  primary key (fikir_id, uye)
);

-- Yorumlar: yorum, öneri ya da endişe.
create table public.yorumlar (
  id uuid primary key default gen_random_uuid(),
  fikir_id uuid not null references public.fikirler (id) on delete cascade,
  uye uuid not null references auth.users (id) on delete cascade,
  tur text not null default 'yorum' check (tur in ('yorum','oneri','endise')),
  metin text not null check (char_length(metin) between 1 and 500),
  zaman timestamptz not null default now()
);

-- ------------------------------------------------------------ yardımcılar ve trigger

-- Yönetici mi? security definer: profiller'in kendi RLS'ini atlayıp döngüye girmeden okur.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol = 'admin');
$$;

-- Yeni auth kullanıcısı için profil satırı. Rol her zaman 'uye' başlar; yükseltme yalnız SQL Editor'dan.
create or replace function public.profil_olustur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiller (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_kullanici_profil on auth.users;
create trigger auth_kullanici_profil
  after insert on auth.users
  for each row execute function public.profil_olustur();

-- ------------------------------------------------------------ fikir toplamları (alıcı, ortalama fiyat, yorum sayısı)
-- security_invoker: görünüm, sorgu yapanın RLS'i ile çalışır (gizli fikirler sızmaz).
create or replace view public.fikir_ozet
with (security_invoker = true) as
select
  f.id as fikir_id,
  f.vaka_id,
  count(t.uye) as alici,
  coalesce(round(avg(t.fiyat)::numeric, 2), 0) as ort_fiyat,
  (select count(*) from public.yorumlar y where y.fikir_id = f.id) as yorum
from public.fikirler f
left join public.talepler t on t.fikir_id = f.id
group by f.id, f.vaka_id;

-- ------------------------------------------------------------ Row Level Security

alter table public.profiller enable row level security;
alter table public.vakalar enable row level security;
alter table public.vaka_gecmis enable row level security;
alter table public.fikirler enable row level security;
alter table public.talepler enable row level security;
alter table public.yorumlar enable row level security;

-- profiller: kullanıcı kendi satırını, yönetici hepsini okur. Yazma politikası yok (rol değişmez).
create policy profiller_oku on public.profiller for select
  using (id = auth.uid() or public.is_admin());

-- vakalar: herkes taslak dışını okur; yönetici her şeyi yapar.
create policy vakalar_herkes_oku on public.vakalar for select
  using (durum <> 'taslak');
create policy vakalar_admin on public.vakalar for all
  using (public.is_admin()) with check (public.is_admin());

-- vaka_gecmis: yalnız yönetici.
create policy vaka_gecmis_admin on public.vaka_gecmis for all
  using (public.is_admin()) with check (public.is_admin());

-- fikirler: gizli olmayanlar herkese; yönetici hepsini görür. Üye yalnız kendi adına ekler;
-- gizlilik değiştirmek yalnız yönetici.
create policy fikirler_oku on public.fikirler for select
  using (not gizli or public.is_admin());
create policy fikirler_ekle on public.fikirler for insert
  to authenticated with check (sahip = auth.uid());
create policy fikirler_gizle on public.fikirler for update
  using (public.is_admin()) with check (public.is_admin());

-- talepler ve yorumlar: herkes okur; yalnız kendi satırını ekler, değiştirir, siler.
create policy talepler_oku on public.talepler for select using (true);
create policy talepler_yaz on public.talepler for insert to authenticated
  with check (uye = auth.uid());
create policy talepler_guncelle on public.talepler for update to authenticated
  using (uye = auth.uid()) with check (uye = auth.uid());
create policy talepler_sil on public.talepler for delete to authenticated
  using (uye = auth.uid());

create policy yorumlar_oku on public.yorumlar for select using (true);
create policy yorumlar_yaz on public.yorumlar for insert to authenticated
  with check (uye = auth.uid());
create policy yorumlar_guncelle on public.yorumlar for update to authenticated
  using (uye = auth.uid()) with check (uye = auth.uid());
create policy yorumlar_sil on public.yorumlar for delete to authenticated
  using (uye = auth.uid());

-- ------------------------------------------------------------ seed: Vaka 01 (yerel modla aynı)

insert into public.vakalar (id, baslik, ozet, firma, stok, adet, olcu, sinif, taban_fiyat, deneme_adedi, sure_gun, durum, acilis, olusturan)
values ('vaka-01', 'Bir milyon cıvata', 'Bir milyon cıvata için fikir yarışı.', 'Örnek Fabrika',
        'M10 × 90 flanşlı cıvata + flanşlı somun', 1000000, 'M10 × 90', '8.8', 2, 1000, 30, 'acik', now(), 'admin@undustit.local')
on conflict (id) do nothing;

insert into public.vaka_gecmis (vaka_id, durum, "not", kim)
select 'vaka-01', 'acik', 'Vaka 01 açıldı', 'admin@undustit.local'
where not exists (select 1 from public.vaka_gecmis where vaka_id = 'vaka-01');

-- Trigger'dan önce açılmış kullanıcılar için eksik profil satırları (çalıştırması zararsız):
insert into public.profiller (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ------------------------------------------------------------ yönetici yapmak
-- Önce yönetici hesabı Authentication > Users ekranından oluşturulur (e-posta + şifre), sonra:
--
-- update public.profiller set rol = 'admin' where email = 'admin@undustit.local';
