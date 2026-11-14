-- Undustit · migration 13: moderation. Run after 12-vaka-modeli.sql. Safe to run again.
-- 1. A word list the admin keeps (yonetim/icerik/). An idea or a comment that contains one of the words is
--    saved hidden instead of refused: it waits in the admin panel, where a wrong match is one tap to undo.
-- 2. Comments can be hidden like ideas (yorumlar.gizli), by the admin only.
-- 3. The writer keeps seeing their own hidden idea or comment (the site marks it "under review").

-- ------------------------------------------------------------ 1. the word list
-- Text is compared in a plain form: lower case, Turkish letters folded (ç→c, ğ→g, ö→o, ş→s, ü→u), the usual
-- digit and sign stand-ins turned back into letters (0→o, 1→i, 3→e, 4→a, 5→s, @→a, $→s) and repeated
-- letters collapsed ("siiktir" → "siktir"). The dotless ı stays as it is: folding it into i would catch
-- everyday words such as "sıkıştırma".
create or replace function public.soz_sade(t text) returns text language sql immutable set search_path = public as $$
  select regexp_replace(
    translate(lower(translate(coalesce(t, ''), 'ÇĞİIÖŞÜ', 'cgiıosu')), 'çğöşüâîû@$01345', 'cgosuaiuasoieas'),
    '(.)\1+', '\1', 'g');
$$;

-- soz: in the plain form above. tam: the whole word must match; otherwise the word only has to start with it,
-- which covers Turkish suffixes ("orospu" also catches "orospular").
create table if not exists public.yasak_sozler (
  soz text primary key check (soz ~ '^[a-zı]{2,40}$'),
  tam boolean not null default false,
  eklenme timestamptz not null default now()
);
alter table public.yasak_sozler enable row level security;
drop policy if exists yasak_admin on public.yasak_sozler;
create policy yasak_admin on public.yasak_sozler for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.yasak_sade() returns trigger language plpgsql set search_path = public as $$
begin new.soz := public.soz_sade(btrim(new.soz)); return new; end $$;
drop trigger if exists yasak_sade on public.yasak_sozler;
create trigger yasak_sade before insert or update on public.yasak_sozler for each row execute function public.yasak_sade();

insert into public.yasak_sozler (soz, tam) values
  ('sik', true), ('siktir', false), ('sikti', false), ('sikeyim', false), ('sikerim', false), ('sikik', false), ('sikim', false), ('sikis', false),
  ('amk', true), ('amq', true), ('aq', true), ('mk', true), ('amına', false), ('amina', true), ('aminak', false), ('amınak', false),
  ('amcık', false), ('amcik', false), ('amcuk', false), ('orospu', false), ('orosbu', false), ('pezevenk', false),
  ('yarak', false), ('yarag', false), ('dalyarak', false), ('tasak', false), ('gotveren', false), ('gotlek', false),
  ('ibne', false), ('kahpe', false), ('kaltak', false), ('serefsiz', false), ('pust', false), ('yavsak', false), ('gavat', false),
  ('pic', true), ('piclik', false), ('gerizekali', false), ('gerizekalı', false), ('sokayim', false), ('ananı', false), ('anani', false),
  ('fuck', false), ('motherfuck', false), ('shit', true), ('bulshit', true), ('bitch', false), ('ashole', false), ('cunt', true),
  ('porno', false), ('niga', true), ('fagot', true)
on conflict (soz) do nothing;

-- does the text contain a listed word?
create or replace function public.kotu_soz(t text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from regexp_split_to_table(public.soz_sade(t), '[^a-zı]+') as w
    join public.yasak_sozler y on (y.tam and w = y.soz) or (not y.tam and w like y.soz || '%')
    where w <> '');
$$;

-- ------------------------------------------------------------ 2. comments can be hidden
alter table public.yorumlar add column if not exists gizli boolean not null default false;
create index if not exists yorumlar_son on public.yorumlar (zaman desc);

drop policy if exists yorumlar_oku on public.yorumlar;
create policy yorumlar_oku on public.yorumlar for select using (not gizli or uye = auth.uid() or public.is_admin());
drop policy if exists yorumlar_admin on public.yorumlar;
create policy yorumlar_admin on public.yorumlar for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ 3. the writer still sees their own hidden idea
-- (also needed by the site: it reads the new idea's id back right after writing it)
drop policy if exists fikirler_oku on public.fikirler;
create policy fikirler_oku on public.fikirler for select using (not gizli or sahip = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ 4. the filter itself
create or replace function public.fikir_sozu() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.kotu_soz(concat_ws(' ', new.baslik, new.kategori, new.problem, new.cozum, new.ad, array_to_string(new.ozellikler, ' '))) then
    new.gizli := true;
  end if;
  return new;
end $$;
drop trigger if exists fikirler_soz on public.fikirler;
create trigger fikirler_soz before insert on public.fikirler for each row execute function public.fikir_sozu();

-- A comment's writer may edit their own row (yorumlar_guncelle), so "hidden" is kept out of their hands here:
-- only an admin changes it, and an edited text is checked again.
create or replace function public.yorum_sozu() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() then new.gizli := old.gizli; end if;
  if (tg_op = 'INSERT' or new.metin is distinct from old.metin or new.ad is distinct from old.ad)
     and public.kotu_soz(concat_ws(' ', new.metin, new.ad)) then
    new.gizli := true;
  end if;
  return new;
end $$;
drop trigger if exists yorumlar_soz on public.yorumlar;
create trigger yorumlar_soz before insert or update on public.yorumlar for each row execute function public.yorum_sozu();

-- ------------------------------------------------------------ 5. the public list never shows a hidden idea
-- Before this the admin (who may read every row) and now the writer too would still see a hidden idea on the site
-- and take it for not hidden. The same definition is in 4-acilis.sql, so running that file again changes nothing.
create or replace view public.fikir_kart
with (security_invoker = true) as
select
  f.id, f.sahip, f.vaka_id, f.baslik, f.kategori, f.problem, f.cozum, f.ozellikler, f.ad, f.zaman,
  coalesce(t.alici, 0)    as alici,
  coalesce(t.ort, 0)      as ort_fiyat,
  coalesce(p.puanci, 0)   as puanci,
  coalesce(p.d, 0)        as puan_d,
  coalesce(p.m, 0)        as puan_m,
  coalesce(p.u, 0)        as puan_u,
  coalesce(y.sayi, 0)     as yorum
from public.fikirler f
left join lateral (select count(*) as alici, round(avg(fiyat)::numeric, 2) as ort
                   from public.talepler where fikir_id = f.id) t on true
left join lateral (select count(distinct uye) as puanci,
                          round(avg(puan) filter (where olcut = 'd')::numeric, 2) as d,
                          round(avg(puan) filter (where olcut = 'm')::numeric, 2) as m,
                          round(avg(puan) filter (where olcut = 'u')::numeric, 2) as u
                   from public.puanlar where fikir_id = f.id) p on true
left join lateral (select count(*) as sayi from public.yorumlar where fikir_id = f.id) y on true
-- a hidden idea is in nobody's list, the admin's and its writer's included (the admin reads them in yonetim/icerik/)
where not f.gizli;

-- none of these is an API (see 9-saglam.sql)
revoke execute on function public.kotu_soz(text) from public, anon, authenticated;
revoke execute on function public.fikir_sozu() from public, anon, authenticated;
revoke execute on function public.yorum_sozu() from public, anon, authenticated;
revoke execute on function public.yasak_sade() from public, anon, authenticated;
