-- Undustit · migration 9: what Supabase's advisors flagged (27 Oct 2026). Run after 8-gizli.sql. Safe to run again.

-- ------------------------------------------------------------ 1. trigger functions are not an API
-- Triggers fire whatever EXECUTE says; only the REST API (/rest/v1/rpc/...) used these grants.
do $$ declare f text; begin
  foreach f in array array['basvuru_hizi','bildir_hizi','fikir_hizi','haber_hizi','mesaj_hizi','puan_hizi','talep_hizi',
                           'yorum_hizi','profil_olustur','sunucu_zamani'] loop
    if to_regprocedure('public.' || f || '()') is not null then
      execute format('revoke execute on function public.%I() from public, anon, authenticated', f);
    end if;
  end loop;
end $$;
-- RLS rules call these as the visitor, so they stay callable; they only answer about the caller:
-- is_admin, firma_mi, firma_herhangi, gorsel_hakki, epostam. Writes and full rows need a signed-in account.
do $$ begin
  if to_regprocedure('public.firma_gorsel(text,text)') is not null then revoke execute on function public.firma_gorsel(text, text) from anon; end if;
  if to_regprocedure('public.vaka_tam(text)') is not null then revoke execute on function public.vaka_tam(text) from anon; end if;
end $$;

-- ------------------------------------------------------------ 2. a fixed search_path
do $$ begin
  if to_regprocedure('public.sunucu_zamani()') is not null then alter function public.sunucu_zamani() set search_path = public; end if;
end $$;

-- ------------------------------------------------------------ 3. auth.uid() once per query, not once per row
-- Rewrites every public-schema rule that calls auth.uid() bare into (select auth.uid()). Same meaning, faster at scale.
do $$ declare p record; q text; c text; begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies
           where schemaname = 'public' and (qual ~ 'auth\.uid\(\)' or with_check ~ 'auth\.uid\(\)') loop
    q := regexp_replace(p.qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    c := regexp_replace(p.with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    if q is not distinct from p.qual and c is not distinct from p.with_check then continue; end if;
    if p.qual is not null then execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, q); end if;
    if p.with_check is not null then execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, c); end if;
  end loop;
end $$;

-- ------------------------------------------------------------ 4. indexes behind foreign keys
create index if not exists fikir_bildirimleri_uye on public.fikir_bildirimleri (uye);
create index if not exists fikirler_sahip on public.fikirler (sahip);
create index if not exists haber_istekleri_fikir on public.haber_istekleri (fikir_id);
create index if not exists iletisim_mesajlari_gonderen on public.iletisim_mesajlari (gonderen);
create index if not exists vaka_basvurulari_gonderen on public.vaka_basvurulari (gonderen);
create index if not exists vaka_gecmis_vaka on public.vaka_gecmis (vaka_id);
create index if not exists vakalar_kazanan on public.vakalar (kazanan);
create index if not exists yorumlar_uye on public.yorumlar (uye);
