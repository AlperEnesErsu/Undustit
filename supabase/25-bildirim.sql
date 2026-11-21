-- Undustit · migration 25: e-mails at the steps of a case. Run after 24-kagit.sql. Safe to run again.
-- Each trigger calls the "bildirim" Edge Function (supabase/functions/bildirim) with { olay, id }, signed with the same
-- Vault secret as the "haber ver" webhook (21-haber-webhook.sql). A failed call never blocks the change itself.
--   basvuru         new row in case_applications           → confirmation to the company, notice to admins
--   basvuru_durum   case_applications.status → incelendi/red → the company hears it
--   yayinda         cases.status taslak → acik               → the case's companies get the link
--   kazanan         cases.winner_idea_id set                 → the idea's writer (if reachable) and the companies

create or replace function public.notify_event(p_olay text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare imza text;
begin
  select decrypted_secret into imza from vault.decrypted_secrets where name = 'haber_gonder_webhook' limit 1;
  if imza is null then return; end if;
  perform net.http_post(
    url := 'https://azjdweynukmwxywdfewb.supabase.co/functions/v1/bildirim',
    body := jsonb_build_object('olay', p_olay, 'id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-undustit-imza', imza),
    timeout_milliseconds := 5000);
exception when others then
  return;   -- a notice that cannot go out never stops the change
end $$;
revoke all on function public.notify_event(text, text) from public, anon, authenticated;

create or replace function public.case_applications_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_event('basvuru', new.id::text);
  elsif new.status is distinct from old.status and new.status in ('incelendi', 'red') then
    perform public.notify_event('basvuru_durum', new.id::text);
  end if;
  return new;
end $$;
revoke all on function public.case_applications_notify() from public, anon, authenticated;
drop trigger if exists case_applications_notify on public.case_applications;
create trigger case_applications_notify after insert or update of status on public.case_applications
  for each row execute function public.case_applications_notify();

create or replace function public.cases_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'taslak' and new.status = 'acik' then
    perform public.notify_event('yayinda', new.id);
  end if;
  if new.winner_idea_id is not null and new.winner_idea_id is distinct from old.winner_idea_id then
    perform public.notify_event('kazanan', new.id);
  end if;
  return new;
end $$;
revoke all on function public.cases_notify() from public, anon, authenticated;
drop trigger if exists cases_notify on public.cases;
create trigger cases_notify after update of status, winner_idea_id on public.cases
  for each row execute function public.cases_notify();
