-- Checks for supabase/26-olcum.sql (run by tests/sql/calistir.sh after kontrol.sql, so users B and D exist and D is
-- the admin). A visitor writes only through log_page_view()/log_click()/log_event() and reads nothing back; only the
-- admin reads the report, the visitor list and a visitor's journey.
-- The CI chain stops at 18 (Turkish table names); 26 reads the English ones of 20 and 22, so small stand-ins are made
-- here when they are missing.
create table if not exists public.ideas (id uuid primary key, title text not null, hidden boolean not null default false);
create table if not exists public.demands (idea_id uuid, member_id uuid);
create table if not exists public.device_marks (idea_id uuid, device text, kind text, member_id uuid, created_at timestamptz not null default now());
create table if not exists public.source_visits (source_id text, device text, created_at timestamptz not null default now());
insert into public.ideas (id, title) values ('99999999-9999-9999-9999-999999999999', 'Analiz deneme fikri') on conflict do nothing;
insert into public.device_marks (idea_id, device, kind, member_id) values
  ('99999999-9999-9999-9999-999999999999', 'aaaaaaaaaaaaaaaa01', 'sahip', '00000000-0000-0000-0000-00000000000b');

set role anon;
select public.log_page_view('/fikir/', 'https://www.google.com', 'aaaaaaaaaaaaaaaa01');   -- not a bare host: counted, no referrer
select public.log_page_view('/fikir/', 'www.google.com', 'aaaaaaaaaaaaaaaa01');            -- the page sends the host; www. drops
select public.log_page_view('/fikir/', 'google.com', 'aaaaaaaaaaaaaaaa01');
select public.log_page_view('/fikir/?vaka=vaka-01', '', 'bbbbbbbbbbbbbbbb01');
select public.log_page_view('/', 'undustit.com', 'bbbbbbbbbbbbbbbb01');
select public.log_page_view('/yonetim/analiz/', '', 'bbbbbbbbbbbbbbbb01');       -- admin pages: not counted
select public.log_page_view('/<script>', '', 'bbbbbbbbbbbbbbbb01');               -- not a path: not counted
select public.log_page_view('/', '', 'kısa');                                    -- not a browser id: not counted
select public.log_click('/', 'form', 'anasayfa.btn.1', 'aaaaaaaaaaaaaaaa01');
select public.log_click('/', 'form', 'anasayfa.btn.1', 'bbbbbbbbbbbbbbbb01');
select public.log_click('/', 'Bir <b>şey</b>', '/fikirler/', 'bbbbbbbbbbbbbbbb01');  -- an odd section becomes "sayfa"
select public.log_click('/', 'form', '   ', 'bbbbbbbbbbbbbbbb01');                  -- nothing pressed: not counted
select public.log_event('Alırdım', 'yazarak', '/fikir/', 'aaaaaaaaaaaaaaaa01');
select public.log_event('Alırdım', 'yazarak', '/fikir/', 'aaaaaaaaaaaaaaaa01');
select public.log_event('Herhangi bir şey', '', '/', 'aaaaaaaaaaaaaaaa01');          -- not one of the site's events

do $$ begin
  perform 1 from public.site_events;
  raise exception 'anon site_events okuyabiliyor';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.site_event_add('aaaaaaaaaaaaaaaa01', 'page', '/', '', '');
  raise exception 'anon site_event_add çağırabiliyor';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.site_report(30);
  raise exception 'anon site_report çağırabiliyor';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  perform public.site_visitors(30, 50);
  raise exception 'üye site_visitors okuyabiliyor';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.site_journey('aaaaaaaaaaaaaaaa01');
  raise exception 'üye site_journey okuyabiliyor';
exception when insufficient_privilege then null; end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ declare r jsonb := public.site_report(7); begin
  if (r->>'views')::int <> 5 then raise exception 'görüntüleme 5 olmalı: %', r; end if;
  if (r->>'visitors')::int <> 2 then raise exception 'ziyaretçi 2 olmalı: %', r; end if;
  if r->'funnel' <> '{"visitors":2,"browsed":2,"clicked":2,"wrote":1,"demanded":0}'::jsonb then raise exception 'huni yanlış: %', r->'funnel'; end if;
  if jsonb_array_length(r->'days') <> 7 or (r->'days'->6->>'views')::int <> 5 then raise exception 'günler yanlış: %', r->'days'; end if;
  if r->'pages'->0->>'path' <> '/fikir/' or (r->'pages'->0->>'views')::int <> 3 or (r->'pages'->0->>'visitors')::int <> 1 then
    raise exception 'sayfalar yanlış: %', r->'pages'; end if;
  if jsonb_array_length(r->'referrers') <> 1 or r->'referrers'->0->>'site' <> 'google.com' then raise exception 'siteler yanlış: %', r->'referrers'; end if;
  if r->'sections'->0->>'section' <> 'form' or (r->'sections'->0->>'clicks')::int <> 2 or (r->'sections'->0->>'visitors')::int <> 2
     or r->'sections'->1->>'section' <> 'sayfa' then raise exception 'bölümler yanlış: %', r->'sections'; end if;
  if r->'targets'->0->>'target' <> 'anasayfa.btn.1' then raise exception 'tıklananlar yanlış: %', r->'targets'; end if;
  if jsonb_array_length(r->'events') <> 1 or (r->'events'->0->>'hits')::int <> 2 then raise exception 'olaylar yanlış: %', r->'events'; end if;
end $$;
do $$ declare v jsonb := public.site_visitors(7, 50); a jsonb; begin
  if jsonb_array_length(v) <> 2 then raise exception 'ziyaretçi listesi 2 olmalı: %', v; end if;
  select x into a from jsonb_array_elements(v) x where x->>'device' = 'aaaaaaaaaaaaaaaa01';
  if (a->>'pages')::int <> 3 or (a->>'clicks')::int <> 1 or (a->>'ideas')::int <> 1 or a->>'landing' <> '/fikir/' then
    raise exception 'ziyaretçi a yanlış: %', a; end if;
end $$;
do $$ declare j jsonb := public.site_journey('aaaaaaaaaaaaaaaa01'); begin
  if jsonb_array_length(j) <> 7 then raise exception 'yolculuk 7 adım olmalı (3 sayfa, 1 tık, 2 olay, 1 fikir): %', j; end if;
  if not exists (select 1 from jsonb_array_elements(j) x where x->>'kind' = 'idea' and x->>'name' = 'Analiz deneme fikri') then
    raise exception 'yolculukta fikir yok: %', j; end if;
end $$;
reset role;

select 'ölçüm kontrolleri tamam' as sonuc;
