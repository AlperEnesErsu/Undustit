-- Undustit · migration 21: the "haber ver" webhook. Run after 20-english-names.sql. Safe to run again.
-- Every new "alırdım" (a row in demands) calls the haber-gonder Edge Function, which e-mails the idea's owner
-- about the first one (supabase/functions/haber-gonder). This takes the place of a Dashboard "Database Webhook":
-- the signature the function checks (x-undustit-imza) lives in Supabase Vault, so it is never written in this
-- file, in a function body or in the function's secrets.
--
-- The secret is made here, inside the database, once: nobody has to see or copy it. The function reads the same
-- value through haber_webhook_imza(), which only the service role may call.

create extension if not exists pg_net;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'haber_gonder_webhook') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'haber_gonder_webhook', 'x-undustit-imza for the haber-gonder Edge Function');
  end if;
end $$;

-- the Edge Function's way to the secret (service role only)
create or replace function public.haber_webhook_imza() returns text language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'haber_gonder_webhook' limit 1
$$;
revoke all on function public.haber_webhook_imza() from public, anon, authenticated;
grant execute on function public.haber_webhook_imza() to service_role;

create or replace function public.notify_demand_webhook() returns trigger language plpgsql security definer set search_path = public as $$
declare imza text;
begin
  select decrypted_secret into imza from vault.decrypted_secrets where name = 'haber_gonder_webhook' limit 1;
  if imza is null then return new; end if;
  -- the same body a Dashboard webhook sends: { type, table, schema, record, old_record }
  perform net.http_post(
    url := 'https://azjdweynukmwxywdfewb.supabase.co/functions/v1/haber-gonder',
    body := jsonb_build_object('type', 'INSERT', 'table', 'demands', 'schema', 'public', 'record', to_jsonb(new), 'old_record', null),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-undustit-imza', imza),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  return new;   -- a failed notice never fails the "alırdım"
end $$;
revoke all on function public.notify_demand_webhook() from public, anon, authenticated;

drop trigger if exists demands_notify_owner on public.demands;
create trigger demands_notify_owner after insert on public.demands for each row execute function public.notify_demand_webhook();
comment on function public.notify_demand_webhook() is 'Calls the haber-gonder Edge Function for each new demand (signature from Vault: haber_gonder_webhook).';
