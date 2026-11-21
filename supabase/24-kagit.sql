-- Undustit · migration 24: ideas written on paper (the brochure: "write it on paper, drop it in the box").
-- Run after 23-model.sql. Safe to run again.
--
-- The admin types each paper into the case (yonetim > vaka > Fikirler > "Kâğıttan fikir ekle"). It becomes an
-- ordinary idea on the site (it can get "alırdım", it is in the ranking); its owner_id is the admin who typed it,
-- the name shown is what the writer wants shown. What the writer wrote to be reached by (e-mail, LinkedIn, phone)
-- stays in paper_ideas, which only admins read: never on the site, never in the idea row.
-- Ne kadar çalıştı counts them under their source (the brochure).

create table if not exists public.paper_ideas (
  idea_id uuid primary key references public.ideas (id) on delete cascade,
  contact text not null default '' check (char_length(contact) <= 200),
  source_id text references public.sources (id) on delete set null,
  note text not null default '' check (char_length(note) <= 500),
  entered_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.paper_ideas is 'Ideas handed in on paper and typed in by an admin: the writer''s contact (admin only) and the source.';
alter table public.paper_ideas enable row level security;
drop policy if exists paper_ideas_admin on public.paper_ideas;
create policy paper_ideas_admin on public.paper_ideas for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.paper_ideas from anon;
grant select, update, delete on public.paper_ideas to authenticated;

-- an admin typing up a box of papers is not one person writing ten ideas a day
create or replace function public.ideas_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if (select count(*) from public.ideas where owner_id = new.owner_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Bugün için fikir sınırına ulaştın (10).' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- one call: the idea and its private card together
create or replace function public.add_paper_idea(p_case_id text, p_category text, p_title text, p_problem text, p_solution text,
  p_display_name text, p_contact text, p_source text, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare yeni uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_title, ''))) < 10 then raise exception 'Fikir en az 10 harf olmalı' using errcode = '22023'; end if;
  insert into public.ideas (owner_id, case_id, title, category, problem, solution, features, display_name)
  values (auth.uid(), nullif(p_case_id, ''), left(btrim(p_title), 140), left(coalesce(p_category, ''), 40), left(coalesce(p_problem, ''), 400),
          left(coalesce(p_solution, ''), 400), '{}', left(btrim(coalesce(p_display_name, '')), 30))
  returning id into yeni;
  insert into public.paper_ideas (idea_id, contact, source_id, note, entered_by)
  values (yeni, left(btrim(coalesce(p_contact, '')), 200), (select id from public.sources where id = p_source), left(coalesce(p_note, ''), 500), auth.uid());
  return yeni;
end $$;
revoke all on function public.add_paper_idea(text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.add_paper_idea(text, text, text, text, text, text, text, text, text) to authenticated;

-- Ne kadar çalıştı: paper ideas per source, next to the visits from the link
drop function if exists public.source_report();
create function public.source_report()
returns table (source_id text, title text, target text, created_at timestamptz, visitors bigint,
               idea_writers bigint, ideas bigint, demanders bigint, demands bigint, last_visit timestamptz, paper_ideas bigint)
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
    where m.kind = 'sahip' or exists (select 1 from public.demands d where d.idea_id = m.idea_id and d.member_id = m.member_id)
  )
  select s.id, s.title, s.target, s.created_at,
    (select count(*) from public.source_visits v where v.source_id = s.id),
    (select count(distinct x.device) from sonra x where x.source_id = s.id and x.kind = 'sahip'),
    (select count(distinct x.idea_id) from sonra x where x.source_id = s.id and x.kind = 'sahip'),
    (select count(distinct x.device) from sonra x where x.source_id = s.id and x.kind = 'talep'),
    (select count(*) from sonra x where x.source_id = s.id and x.kind = 'talep'),
    (select max(v.created_at) from public.source_visits v where v.source_id = s.id),
    (select count(*) from public.paper_ideas p join public.ideas i on i.id = p.idea_id and not i.hidden where p.source_id = s.id)
  from public.sources s
  order by s.created_at;
end $$;
revoke all on function public.source_report() from public, anon;
grant execute on function public.source_report() to authenticated;
