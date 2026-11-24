-- Undustit · migration 26: our own analytics, in place of Plausible. Run after 25-bildirim.sql. Safe to run again.
--
-- Every public page sends what happens on it with the browser's random id (the ud_cihaz cookie, supabase/17-oy.sql):
--   log_page_view(path, referrer host)       a page opened
--   log_click(path, section, target)         a link or button pressed, and the part of the page it was in
--   log_event(name, detail, path)            the site's own moments ("Fikir gönderildi", "Alırdım", "Paylaş"…)
-- One row per happening (site_events), nothing about the person: no IP, no name, no address. Whether that browser
-- later wrote an idea or said "alırdım" comes from device_marks, which already holds it. Admin pages are never
-- counted; a browser writes at most 600 rows an hour; rows older than 180 days are dropped as new ones come in.
-- The admin reads it in /yonetim/analiz/ through site_report(), site_visitors() and site_journey().
--
-- The first version of this file kept daily totals (site_counts). It never went live with the site and held no rows.
drop function if exists public.site_count_add(text, text, text, text);
drop function if exists public.log_event(text, text, text);
drop table if exists public.site_counts;

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  device text not null check (device ~ '^[a-z0-9]{16,40}$'),
  kind text not null check (kind in ('page', 'click', 'event')),
  path text not null check (char_length(path) between 1 and 140),   -- the page: /fikir/?vaka=vaka-01
  name text not null default '' check (char_length(name) <= 80),     -- click: what was pressed; event: its name
  detail text not null default '' check (char_length(detail) <= 100) -- page: the other site; click: the section; event: details
);
create index if not exists site_events_at on public.site_events (at);
create index if not exists site_events_device on public.site_events (device, at);
comment on table public.site_events is 'Page views, clicks and site events per browser (ud_cihaz id). Written only by log_page_view(), log_click() and log_event().';
alter table public.site_events enable row level security;   -- no policies: nobody reads or writes it directly
revoke all on public.site_events from anon, authenticated;

-- the one way in for the three below: a well-formed browser id, a site page (not the admin), and not too often
create or replace function public.site_event_add(p_device text, p_kind text, p_path text, p_name text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
declare yol text := lower(coalesce(p_path, ''));
begin
  if coalesce(p_device, '') !~ '^[a-z0-9]{16,40}$' then return; end if;
  if yol !~ '^/[a-z0-9/_.-]{0,100}(\?vaka=[a-z0-9-]{1,30})?$' or yol ~ '^/yonetim(/|$)' then return; end if;
  if (select count(*) from public.site_events where device = p_device and at > now() - interval '1 hour') >= 600 then return; end if;
  insert into public.site_events (device, kind, path, name, detail)
  values (p_device, p_kind, yol, left(coalesce(p_name, ''), 80), left(coalesce(p_detail, ''), 100));
  if random() < 0.01 then   -- now and then, the old ones go
    delete from public.site_events where at < now() - interval '180 days';
  end if;
end $$;
revoke all on function public.site_event_add(text, text, text, text, text) from public, anon, authenticated;

create or replace function public.log_page_view(p_path text, p_ref text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
declare ref text := regexp_replace(lower(coalesce(p_ref, '')), '^www\.', '');
begin
  if ref !~ '^[a-z0-9.-]{1,100}$' or ref in ('undustit.com', 'localhost', '127.0.0.1') then ref := ''; end if;
  perform public.site_event_add(p_device, 'page', p_path, '', ref);
end $$;
revoke all on function public.log_page_view(text, text, text) from public;
grant execute on function public.log_page_view(text, text, text) to anon, authenticated;

-- section: the part of the page (an element id such as "form" or "case", or nav/footer); target: a link's path or
-- host, a button's text key, or its first words
create or replace function public.log_click(p_path text, p_section text, p_target text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
declare bolum text := lower(coalesce(p_section, '')); hedef text := btrim(regexp_replace(coalesce(p_target, ''), '\s+', ' ', 'g'));
begin
  if bolum !~ '^[a-z0-9_-]{1,40}$' then bolum := 'sayfa'; end if;
  if hedef = '' then return; end if;
  perform public.site_event_add(p_device, 'click', p_path, left(hedef, 80), bolum);
end $$;
revoke all on function public.log_click(text, text, text, text) from public;
grant execute on function public.log_click(text, text, text, text) to anon, authenticated;

create or replace function public.log_event(p_name text, p_detail text, p_path text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_name not in ('Fikir gönderildi', 'Alırdım', 'Paylaş', 'Haber ver', 'Google ile devam', 'Hesap bağla',
                    'Numune formu', 'Numune talebi', 'Bildir') then return; end if;
  perform public.site_event_add(p_device, 'event', p_path, p_name, btrim(coalesce(p_detail, '')));
end $$;
revoke all on function public.log_event(text, text, text, text) from public;
grant execute on function public.log_event(text, text, text, text) to anon, authenticated;

create or replace function public.site_admin_check() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
end $$;
revoke all on function public.site_admin_check() from public, anon, authenticated;

-- the last p_days days, today included (Istanbul time): totals, the way from a visit to an idea, per day, pages,
-- referring sites, sections and targets clicked, events
create or replace function public.site_report(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare bugun date := (now() at time zone 'Europe/Istanbul')::date; ilk date; bas timestamptz; out jsonb;
begin
  perform public.site_admin_check();
  ilk := bugun - (greatest(1, least(coalesce(p_days, 30), 180)) - 1);
  bas := ilk::timestamp at time zone 'Europe/Istanbul';
  with e as (select *, (at at time zone 'Europe/Istanbul')::date as gun from public.site_events where at >= bas),
       s as (select * from e where kind = 'page'),
       k as (select * from e where kind = 'click'),
       z as (select distinct device from s),
       m as (select m.device, m.kind from public.device_marks m join public.ideas i on i.id = m.idea_id and not i.hidden
             where m.created_at >= bas and m.device in (select device from z)
               and (m.kind = 'sahip' or exists (select 1 from public.demands d where d.idea_id = m.idea_id and d.member_id = m.member_id)))
  select jsonb_build_object(
    'from', ilk, 'to', bugun,
    'views', (select count(*) from s),
    'visitors', (select count(*) from z),
    'funnel', jsonb_build_object(
      'visitors', (select count(*) from z),
      'browsed', (select count(*) from (select device from s group by device having count(*) >= 2) x),
      'clicked', (select count(distinct device) from k),
      'wrote', (select count(distinct device) from m where kind = 'sahip'),
      'demanded', (select count(distinct device) from m where kind = 'talep')),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', g.d::date,
               'views', (select count(*) from s where s.gun = g.d::date),
               'visitors', (select count(distinct device) from s where s.gun = g.d::date)) order by g.d), '[]')
             from generate_series(ilk, bugun, interval '1 day') g(d)),
    'pages', (select coalesce(jsonb_agg(x order by x.views desc, x.path), '[]') from (
               select path, count(*) as views, count(distinct device) as visitors from s
               group by path order by count(*) desc, path limit 20) x),
    'referrers', (select coalesce(jsonb_agg(x order by x.visitors desc, x.site), '[]') from (
               select detail as site, count(distinct device) as visitors from s where detail <> ''
               group by detail order by count(distinct device) desc, detail limit 15) x),
    'sections', (select coalesce(jsonb_agg(x order by x.clicks desc, x.section), '[]') from (
               select detail as section, count(*) as clicks, count(distinct device) as visitors from k
               group by detail order by count(*) desc, detail limit 12) x),
    'targets', (select coalesce(jsonb_agg(x order by x.clicks desc, x.target), '[]') from (
               select path, detail as section, name as target, count(*) as clicks, count(distinct device) as visitors from k
               group by path, detail, name order by count(*) desc, name limit 25) x),
    'events', (select coalesce(jsonb_agg(x order by x.hits desc, x.name), '[]') from (
               select name, count(*) as hits, count(distinct device) as devices from e where kind = 'event'
               group by name order by count(*) desc, name) x)
  ) into out;
  return out;
end $$;
revoke all on function public.site_report(integer) from public, anon;
grant execute on function public.site_report(integer) to authenticated;

-- the browsers seen in the period, latest first: when, how much, where from, and whether they wrote or demanded
create or replace function public.site_visitors(p_days integer default 30, p_limit integer default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare bas timestamptz;
begin
  perform public.site_admin_check();
  bas := ((now() at time zone 'Europe/Istanbul')::date - (greatest(1, least(coalesce(p_days, 30), 180)) - 1))::timestamp at time zone 'Europe/Istanbul';
  return (select coalesce(jsonb_agg(x order by x.last desc), '[]') from (
    select e.device, min(e.at) as first, max(e.at) as last,
      count(*) filter (where e.kind = 'page') as pages,
      count(*) filter (where e.kind = 'click') as clicks,
      (select f.detail from public.site_events f where f.device = e.device and f.kind = 'page' and f.at >= bas order by f.at limit 1) as referrer,
      (select f.path from public.site_events f where f.device = e.device and f.kind = 'page' and f.at >= bas order by f.at limit 1) as landing,
      (select v.source_id from public.source_visits v where v.device = e.device order by v.created_at limit 1) as source,
      (select count(distinct m.idea_id) from public.device_marks m join public.ideas i on i.id = m.idea_id and not i.hidden
        where m.device = e.device and m.kind = 'sahip') as ideas,
      (select count(distinct m.idea_id) from public.device_marks m
        where m.device = e.device and m.kind = 'talep' and exists (select 1 from public.demands d where d.idea_id = m.idea_id and d.member_id = m.member_id)) as demands
    from public.site_events e where e.at >= bas
    group by e.device order by max(e.at) desc limit greatest(1, least(coalesce(p_limit, 100), 500))) x);
end $$;
revoke all on function public.site_visitors(integer, integer) from public, anon;
grant execute on function public.site_visitors(integer, integer) to authenticated;

-- one browser's way through the site, oldest first, with the ideas it wrote and the "alırdım"s it said in between
create or replace function public.site_journey(p_device text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.site_admin_check();
  return (select coalesce(jsonb_agg(x order by x.at), '[]') from (
    (select e.at, e.kind, e.path, e.name, e.detail from public.site_events e where e.device = p_device order by e.at desc limit 500)
    union all
    (select m.created_at, case m.kind when 'sahip' then 'idea' else 'demand' end, '', i.title, ''
       from public.device_marks m join public.ideas i on i.id = m.idea_id and not i.hidden
       where m.device = p_device and (m.kind = 'sahip' or exists (select 1 from public.demands d where d.idea_id = m.idea_id and d.member_id = m.member_id)))
  ) x);
end $$;
revoke all on function public.site_journey(text) from public, anon;
grant execute on function public.site_journey(text) to authenticated;
