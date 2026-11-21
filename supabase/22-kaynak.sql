-- Undustit · migration 22: "Ne kadar çalıştı?" Where visitors came from (a brochure QR, a poster, a post) and what
-- they did. Run after 21-haber-webhook.sql. Safe to run again.
--
-- A source is a short name in a link: undustit.com/brosur redirects to /fikir/?vaka=vaka-01&k=brosur (_redirects).
-- The page sends the source with the browser's own random id (the ud_cihaz cookie, supabase/17-oy.sql) to
-- log_source_visit(); one row per source and browser, only for sources the admin created. Nothing about the person.
-- What they did afterwards is read from device_marks, which already says which browser wrote an idea ('sahip') and
-- which said "alırdım" ('talep'): only what happened on that browser after its first visit from the source counts.
-- The admin reads it in /yonetim/kaynak/ through source_report().

create table if not exists public.sources (
  id text primary key check (id ~ '^[a-z0-9-]{1,30}$'),
  title text not null default '' check (char_length(title) <= 80),
  target text not null default '' check (char_length(target) <= 300),
  created_at timestamptz not null default now()
);
comment on table public.sources is 'Tracked links (?k=<id>), e.g. the brochure QR. Admin only.';
alter table public.sources enable row level security;
drop policy if exists sources_admin on public.sources;
create policy sources_admin on public.sources for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.sources from anon;
grant select, insert, update, delete on public.sources to authenticated;

insert into public.sources (id, title, target) values ('brosur', 'Broşür QR', '/fikir/?vaka=vaka-01')
on conflict (id) do nothing;

create table if not exists public.source_visits (
  source_id text not null references public.sources (id) on delete cascade,
  device text not null check (device ~ '^[a-z0-9]{16,40}$'),
  created_at timestamptz not null default now(),
  primary key (source_id, device)
);
comment on table public.source_visits is 'First visit of a browser (ud_cihaz id) from a tracked link. Written only by log_source_visit().';
alter table public.source_visits enable row level security;   -- no policies: nobody reads or writes it directly
revoke all on public.source_visits from anon, authenticated;

-- the only way in: a known source, a well-formed browser id, once
create or replace function public.log_source_visit(p_source text, p_device text) returns void
language sql security definer set search_path = public as $$
  insert into public.source_visits (source_id, device)
  select s.id, p_device from public.sources s where s.id = p_source and p_device ~ '^[a-z0-9]{16,40}$'
  on conflict do nothing
$$;
revoke all on function public.log_source_visit(text, text) from public;
grant execute on function public.log_source_visit(text, text) to anon, authenticated;

-- per source: browsers that came, and of those, how many wrote an idea / said "alırdım" afterwards (hidden ideas left out)
create or replace function public.source_report()
returns table (source_id text, title text, target text, created_at timestamptz, visitors bigint,
               idea_writers bigint, ideas bigint, demanders bigint, demands bigint, last_visit timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
  with sonra as (
    select v.source_id, m.device, m.kind, m.idea_id
    from public.source_visits v
    join public.device_marks m on m.device = v.device and m.created_at >= v.created_at
    join public.ideas i on i.id = m.idea_id and not i.hidden
    -- an "alırdım" taken back leaves its mark behind; only one that still stands counts
    where m.kind = 'sahip' or exists (select 1 from public.demands d where d.idea_id = m.idea_id and d.member_id = m.member_id)
  )
  select s.id, s.title, s.target, s.created_at,
    (select count(*) from public.source_visits v where v.source_id = s.id),
    (select count(distinct x.device) from sonra x where x.source_id = s.id and x.kind = 'sahip'),
    (select count(distinct x.idea_id) from sonra x where x.source_id = s.id and x.kind = 'sahip'),
    (select count(distinct x.device) from sonra x where x.source_id = s.id and x.kind = 'talep'),
    (select count(*) from sonra x where x.source_id = s.id and x.kind = 'talep'),
    (select max(v.created_at) from public.source_visits v where v.source_id = s.id)
  from public.sources s
  order by s.created_at;
end $$;
revoke all on function public.source_report() from public, anon;
grant execute on function public.source_report() to authenticated;
