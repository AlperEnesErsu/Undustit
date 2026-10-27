-- Undustit · migration 8: what a case row shows to visitors. Run once in the Supabase SQL editor, after 7-firma.sql.
-- Safe to run again. The site works before and after it (it falls back to the old reads until vaka_tam exists).
--
-- Row-level security decides which cases someone sees; it cannot hide a column. So visitors (anon and every signed-in
-- account) get SELECT on the public columns only. Three stay private:
--   firma        the company's name (the case page does not show it)
--   taban_fiyat  the stock's floor price (the product decision: never shown)
--   olusturan    the admin e-mail that created the case
-- The admin and the case's own company read the full row through vaka_tam(), which checks who is asking.

revoke select on public.vakalar from anon, authenticated;
grant select (id, baslik, ozet, aciklama, stok, adet, olcu, sinif, deneme_adedi, sure_gun, gorsel, durum,
              acilis, kapanis, kazanan, olusturma, guncelleme) on public.vakalar to anon, authenticated;

-- every case the caller may see in full (one when v is given): all of them for an admin, its own for a company
create or replace function public.vaka_tam(v text default null) returns setof public.vakalar
language sql stable security definer set search_path = public as $$
  select * from public.vakalar
  where (v is null or id = v) and (public.is_admin() or public.firma_mi(id))
  order by olusturma desc
$$;
revoke all on function public.vaka_tam(text) from public;
grant execute on function public.vaka_tam(text) to authenticated;
