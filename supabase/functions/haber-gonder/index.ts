// Undustit · "haber ver" e-mails (Supabase Edge Function, Deno).
// The demands_notify_owner trigger (supabase/21-haber-webhook.sql) calls this on every new row in public.demands. If the idea's owner asked to hear
// about the first "alırdım" (notify_requests, kind 'fikrim') and has not been told yet, one e-mail goes
// out through Resend and the request is marked sent, so nobody gets the same news twice.
// Setup: supabase/KURULUM.md, section "E-posta bildirimleri".
//
// Secrets (Edge Functions > Secrets): RESEND_API_KEY, HABER_GONDEREN ("Undustit <haber@alanadin.com>"),
// SITE_URL (with the trailing slash). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// The signature the trigger sends (x-undustit-imza) lives only in Supabase Vault; this reads it through
// public.haber_webhook_imza(), which only the service role may call. Deploy with --no-verify-jwt.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const env = (k: string) => Deno.env.get(k) ?? '';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data: imza } = await db.rpc('haber_webhook_imza');
  const gelen = req.headers.get('x-undustit-imza') ?? '';
  if (typeof imza !== 'string' || imza.length < 32 || gelen !== imza) return new Response('imza', { status: 401 });
  const body = await req.json().catch(() => null);
  const fikirId: string | undefined = body?.record?.idea_id;
  if (body?.type !== 'INSERT' || body?.table !== 'demands' || !fikirId) return new Response('yok sayıldı');
  const { data: istekler, error } = await db.from('notify_requests')
    .select('id, email').eq('idea_id', fikirId).eq('kind', 'fikrim').is('sent_at', null);
  if (error) return new Response(error.message, { status: 500 });
  if (!istekler?.length) return new Response('istek yok');

  const { data: fikir } = await db.from('ideas').select('id, owner_id, title').eq('id', fikirId).maybeSingle();
  if (!fikir) return new Response('fikir yok');
  const link = env('SITE_URL') + 'fikirler/?f=' + encodeURIComponent(fikir.owner_id + ':' + fikir.id);

  let gitti = 0;
  for (const istek of istekler) {
    // claim the row first: if two webhooks race, only one of them sends
    const { data: alindi } = await db.from('notify_requests').update({ sent_at: new Date().toISOString() })
      .eq('id', istek.id).is('sent_at', null).select('id');
    if (!alindi?.length) continue;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env('HABER_GONDEREN'),
        to: [istek.email],
        subject: 'Fikrine ilk “alırdım” geldi',
        html: `<p>Biri <b>${esc(fikir.title)}</b> için “alırdım” dedi ve fiyatını yazdı.</p>` +
          `<p><a href="${esc(link)}">Fikrini gör</a>: kaç kişinin hangi fiyata alacağı, puanlar ve yorumlar orada.</p>` +
          `<p style="color:#666;font-size:13px">Bu e-postayı Undustit'te bu fikir için “haber ver” dediğin için aldın. Her fikir için yalnız bir kez yazarız.</p>`,
      }),
    });
    if (r.ok) gitti++;
    else await db.from('notify_requests').update({ sent_at: null }).eq('id', istek.id);   // try again next time
  }
  return new Response(JSON.stringify({ gitti }), { headers: { 'Content-Type': 'application/json' } });
});
