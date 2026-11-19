-- Undustit · migration 19: sign-in details for an accepted company. Run after 18-talep-kilidi.sql. Safe to run again.
-- When an admin opens a case from an application (or adds a company e-mail under "Firma erişimi"), the
-- firma-davet Edge Function e-mails that address its username (the address itself) and a one-time
-- "set your password" link. No password is ever written into an e-mail. This column records when the last
-- one went out, so the admin panel shows it and offers "send again".
alter table public.vaka_firmalari add column if not exists davet timestamptz;
