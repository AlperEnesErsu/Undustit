// Undustit · sign-in details for an accepted company (Supabase Edge Function, Deno).
// The admin panel calls this right after a case opens from an application, and again from "Firma erişimi" >
// "Giriş bilgisi gönder". It e-mails the company's username (its e-mail address) and a one-time link that sets
// its password: an invite link for a new account, a reset link for one that exists. No password ever goes into
// an e-mail. The time it went out is kept on case_companies.invited_at (supabase/19-davet.sql, 20-english-names.sql).
// Setup: supabase/KURULUM.md, section 23 "Firma giriş bilgileri".
//
// Secrets (Edge Functions > Secrets): RESEND_API_KEY, HABER_GONDEREN, SITE_URL (with the trailing slash), the same
// ones haber-gonder uses. SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// Deploy WITH JWT verification (the default): only a signed-in admin may call it, which is checked again below.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const env = (k: string) => Deno.env.get(k) ?? '';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const cevap = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export function epostaMetni(o: { firma: string; vaka: string; eposta: string; link: string; giris: string; yeni: boolean }) {
  const dugme = (t: string) =>
    `<p><a href="${esc(o.link)}" style="display:inline-block;background:#1F2F86;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${t}</a></p>`;
  return {
    subject: o.yeni ? 'Başvurunuz kabul edildi: Undustit firma paneli' : 'Undustit firma paneli: yeni vakanız açıldı',
    html:
      `<p>Merhaba${o.firma ? ' ' + esc(o.firma) : ''},</p>` +
      `<p><b>${esc(o.vaka)}</b> vakanız Undustit'te açıldı. Firma panelinde bu vakanın fikirlerini, taleplerini ve fiyat dağılımını görebilir, ürün fotoğrafını yükleyebilirsiniz.</p>` +
      `<p><b>Kullanıcı adınız:</b> ${esc(o.eposta)}</p>` +
      (o.yeni
        ? `<p>Şifrenizi aşağıdaki bağlantıyla siz belirleyin. Bağlantı tek kullanımlıktır ve bir süre sonra geçersiz olur.</p>${dugme('Şifremi belirle')}`
        : `<p>Bu adresle zaten bir hesabınız var: <a href="${esc(o.giris)}">giriş sayfasından</a> mevcut şifrenizle girin. Şifrenizi hatırlamıyorsanız bu bağlantıyla yenisini belirleyin:</p>${dugme('Yeni şifre belirle')}`) +
      `<p>Sonraki girişlerde: <a href="${esc(o.giris)}">${esc(o.giris)}</a>, kullanıcı adı ve şifrenizle.</p>` +
      `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">` +
      `<p style="color:#555;font-size:13px">Your case <b>${esc(o.vaka)}</b> is open on Undustit. Username: ${esc(o.eposta)}. ` +
      `Use the button above to ${o.yeni ? 'set' : 'reset'} your password (one-time link), then sign in at ${esc(o.giris)}.</p>` +
      `<p style="color:#888;font-size:12px">Bu e-postayı Undustit'e yaptığınız vaka başvurusu kabul edildiği için aldınız. Şifrenizi biz bilmiyoruz ve hiçbir zaman sormayız.</p>`,
  };
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return cevap({ hata: 'method' }, 405);

  // only an admin: the caller's own token, checked against the database's is_admin()
  const yetki = req.headers.get('Authorization') ?? '';
  const kisi = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: yetki } }, auth: { persistSession: false } });
  const { data: admin } = await kisi.rpc('is_admin');
  if (admin !== true) return cevap({ hata: 'yetki' }, 403);

  const body = await req.json().catch(() => null);
  const vakaId = String(body?.vaka_id ?? '').trim();
  const eposta = String(body?.eposta ?? '').trim().toLowerCase();
  if (!vakaId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) return cevap({ hata: 'eksik' }, 400);
  for (const k of ['RESEND_API_KEY', 'HABER_GONDEREN', 'SITE_URL']) if (!env(k)) return cevap({ hata: 'ayar', eksik: k }, 500);

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  // the address must already have access to this case: the function never widens access by itself
  const { data: erisim } = await db.from('case_companies').select('email').eq('case_id', vakaId).eq('email', eposta).maybeSingle();
  if (!erisim) return cevap({ hata: 'erisim-yok' }, 404);
  const { data: vaka } = await db.from('cases').select('title, company').eq('id', vakaId).maybeSingle();
  if (!vaka) return cevap({ hata: 'vaka-yok' }, 404);

  const giris = env('SITE_URL') + 'giris/';
  // a new account gets an invite (confirms the address and signs in once); an existing one a reset link
  let yeni = true;
  let r = await db.auth.admin.generateLink({ type: 'invite', email: eposta, options: { redirectTo: giris } });
  if (r.error) {
    yeni = false;
    r = await db.auth.admin.generateLink({ type: 'recovery', email: eposta, options: { redirectTo: giris } });
  }
  const link = r.data?.properties?.action_link;
  if (r.error || !link) return cevap({ hata: 'baglanti', mesaj: r.error?.message }, 500);

  const m = epostaMetni({ firma: vaka.company ?? '', vaka: vaka.title ?? vakaId, eposta, link, giris, yeni });
  const g = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('HABER_GONDEREN'), to: [eposta], subject: m.subject, html: m.html }),
  });
  if (!g.ok) return cevap({ hata: 'gonderim', durum: g.status }, 502);

  const zaman = new Date().toISOString();
  await db.from('case_companies').update({ invited_at: zaman }).eq('case_id', vakaId).eq('email', eposta);
  return cevap({ gitti: true, yeni, zaman });
});
