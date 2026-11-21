// Undustit · e-mails at the steps of a case (Supabase Edge Function, Deno).
// Database triggers (supabase/25-bildirim.sql) call this with { olay, id } at five moments:
//   basvuru          a company applied ("Vakanı aç"): a confirmation to the company, a notice to every admin
//   basvuru_durum    the admin marked an application "İncelendi" or "Ret": the company hears it
//   yayinda          a case went from draft to open: its companies get the link to share
//   kazanan          a winner was chosen: the idea's writer (when their account has an address) and the companies
// The texts are Turkish with one English line, like firma-davet. Nothing here decides anything: it only reads
// the rows the trigger named and sends. Until Resend's domain is verified, sending fails quietly (the trigger
// never blocks the change that called it).
//
// Secrets: RESEND_API_KEY, HABER_GONDEREN, SITE_URL (same as haber-gonder). The signature (x-undustit-imza) is
// the same Vault secret haber-gonder checks (public.haber_webhook_imza()). Deploy with --no-verify-jwt.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const env = (k: string) => Deno.env.get(k) ?? '';
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const kutu = (html: string, en: string) =>
  html + `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0"><p style="color:#555;font-size:13px">${en}</p>` +
  `<p style="color:#888;font-size:12px">Undustit · atıl ürünlere topluluğun fikirleriyle yeni hayat</p>`;
const dugme = (href: string, t: string) =>
  `<p><a href="${esc(href)}" style="display:inline-block;background:#1F2F86;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${esc(t)}</a></p>`;

export type Eposta = { to: string[]; subject: string; html: string };

// the texts, apart from the sending, so they can be read and tested on their own
export const METIN = {
  basvuruFirma: (o: { firma: string; stok: string; site: string }): Omit<Eposta, 'to'> => ({
    subject: 'Başvurunuz bize ulaştı: Undustit',
    html: kutu(`<p>Merhaba${o.firma ? ' ' + esc(o.firma) : ''},</p><p><b>${esc(o.stok)}</b> için vaka başvurunuz bize ulaştı. Stoğunuza bakıp birkaç gün içinde bu adrese döneceğiz.</p>` +
      `<p>Başvurunuz kabul edilirse vakanızı hazırlarız ve firma panelinin giriş bilgileri bu adrese gelir.</p>`,
      `We received your case application for ${esc(o.stok)} and will reply to this address within a few days.`),
  }),
  basvuruAdmin: (o: { firma: string; stok: string; adet: string; eposta: string; panel: string }): Omit<Eposta, 'to'> => ({
    subject: `Yeni vaka başvurusu: ${o.firma}`,
    html: kutu(`<p><b>${esc(o.firma)}</b> vaka başvurusu yaptı: ${esc(o.stok)}${o.adet ? ', ' + esc(o.adet) + ' adet' : ''}. İletişim: ${esc(o.eposta)}.</p>` +
      dugme(o.panel, 'Yönetimde aç'), `New case application from ${esc(o.firma)}.`),
  }),
  basvuruDurum: (o: { firma: string; stok: string; durum: 'incelendi' | 'red'; iletisim: string }): Omit<Eposta, 'to'> => o.durum === 'incelendi'
    ? { subject: 'Başvurunuzu inceliyoruz: Undustit',
        html: kutu(`<p>Merhaba${o.firma ? ' ' + esc(o.firma) : ''},</p><p><b>${esc(o.stok)}</b> başvurunuzu inceledik; ayrıntılar için kısa süre içinde size yazacağız.</p>`,
          `We have reviewed your application for ${esc(o.stok)} and will be in touch shortly.`) }
    : { subject: 'Başvurunuz hakkında: Undustit',
        html: kutu(`<p>Merhaba${o.firma ? ' ' + esc(o.firma) : ''},</p><p><b>${esc(o.stok)}</b> için bu kez vaka açamıyoruz. İlginiz için teşekkür ederiz.</p>` +
          (o.iletisim ? `<p>Ayrıntı ya da yeni bir stok için: ${esc(o.iletisim)}</p>` : '<p>Ayrıntı ya da yeni bir stok için bu e-postayı yanıtlayabilirsiniz.</p>'),
          `We can't open a case for ${esc(o.stok)} this time. Thank you for your interest.`) },
  yayinda: (o: { vaka: string; link: string; gun: number }): Omit<Eposta, 'to'> => ({
    subject: `Vakanız yayında: ${o.vaka}`,
    html: kutu(`<p><b>${esc(o.vaka)}</b> vakanız Undustit'te yayında ve ${o.gun} gün boyunca fikir topluyor.</p>` +
      `<p>Bağlantıyı müşterilerinizle, çalışanlarınızla ve sosyal medyada paylaşın: ne kadar çok kişi görürse o kadar çok fikir gelir. Gelen fikirleri ve talepleri firma panelinden izleyebilirsiniz.</p>` +
      dugme(o.link, 'Vaka sayfasını aç'), `Your case ${esc(o.vaka)} is live on Undustit for ${o.gun} days. Share the link.`),
  }),
  kazananSahip: (o: { fikir: string; vaka: string; link: string }): Omit<Eposta, 'to'> => ({
    subject: 'Fikrin kazandı: Undustit',
    html: kutu(`<p>Tebrikler! <b>${esc(o.fikir)}</b> fikrin <b>${esc(o.vaka)}</b> vakasının kazananı seçildi.</p>` +
      `<p>Kazanç payı ve sonraki adımlar için kısa süre içinde sana yazacağız; bu e-postayı yanıtlayarak da bize ulaşabilirsin.</p>` + dugme(o.link, 'Fikrini gör'),
      `Congratulations: your idea ${esc(o.fikir)} won the case ${esc(o.vaka)}. We will write to you about the next steps.`),
  }),
  kazananFirma: (o: { fikir: string; vaka: string; link: string }): Omit<Eposta, 'to'> => ({
    subject: `Kazanan seçildi: ${o.vaka}`,
    html: kutu(`<p><b>${esc(o.vaka)}</b> vakasının kazananı: <b>${esc(o.fikir)}</b>.</p><p>Deneme üretimi için sizinle iletişime geçeceğiz.</p>` + dugme(o.link, 'Vaka sayfası'),
      `The winner of ${esc(o.vaka)} is ${esc(o.fikir)}. We'll contact you about the trial batch.`),
  }),
};

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data: imza } = await db.rpc('haber_webhook_imza');
  if (typeof imza !== 'string' || imza.length < 32 || (req.headers.get('x-undustit-imza') ?? '') !== imza) return new Response('imza', { status: 401 });
  for (const k of ['RESEND_API_KEY', 'HABER_GONDEREN', 'SITE_URL']) if (!env(k)) return new Response('ayar eksik: ' + k, { status: 500 });
  const body = await req.json().catch(() => null);
  const olay = String(body?.olay ?? ''), id = String(body?.id ?? '');
  if (!id) return new Response('id yok', { status: 400 });
  const site = env('SITE_URL');
  const sayfa = (vakaId: string) => vakaId === 'vaka-01' ? site + 'vaka-01/' : site + 'vaka/?id=' + encodeURIComponent(vakaId);
  const adminler = async () => {
    const { data } = await db.from('profiles').select('id').eq('role', 'admin');
    const out: string[] = [];
    for (const p of data ?? []) { const u = await db.auth.admin.getUserById(p.id); if (u.data?.user?.email) out.push(u.data.user.email); }
    return out;
  };
  const firmalar = async (vakaId: string) => ((await db.from('case_companies').select('email').eq('case_id', vakaId)).data ?? []).map((r) => r.email);

  const gidecek: Eposta[] = [];
  if (olay === 'basvuru' || olay === 'basvuru_durum') {
    const { data: b } = await db.from('case_applications').select('company, stock, quantity, email, status').eq('id', id).maybeSingle();
    if (!b) return new Response('başvuru yok', { status: 404 });
    if (olay === 'basvuru') {
      gidecek.push({ to: [b.email], ...METIN.basvuruFirma({ firma: b.company, stok: b.stock, site }) });
      const a = await adminler();
      if (a.length) gidecek.push({ to: a, ...METIN.basvuruAdmin({ firma: b.company, stok: b.stock, adet: b.quantity ?? '', eposta: b.email, panel: site + 'yonetim/' }) });
    } else if (b.status === 'incelendi' || b.status === 'red') {
      gidecek.push({ to: [b.email], ...METIN.basvuruDurum({ firma: b.company, stok: b.stock, durum: b.status, iletisim: env('ILETISIM_EPOSTA') }) });
    }
  } else if (olay === 'yayinda' || olay === 'kazanan') {
    const { data: v } = await db.from('cases').select('id, title, duration_days, winner_idea_id').eq('id', id).maybeSingle();
    if (!v) return new Response('vaka yok', { status: 404 });
    const f = await firmalar(v.id);
    if (olay === 'yayinda') {
      if (f.length) gidecek.push({ to: f, ...METIN.yayinda({ vaka: v.title, link: sayfa(v.id), gun: v.duration_days ?? 30 }) });
    } else if (v.winner_idea_id) {
      const { data: fk } = await db.from('ideas').select('id, owner_id, title').eq('id', v.winner_idea_id).maybeSingle();
      if (fk) {
        const link = site + 'fikirler/?f=' + encodeURIComponent(fk.owner_id + ':' + fk.id);
        // the writer's own address when the account has one (anonymous accounts and paper ideas have none:
        // the admin reaches those from the contact on the paper)
        const kagit = (await db.from('paper_ideas').select('idea_id').eq('idea_id', fk.id).maybeSingle()).data;
        const sahip = kagit || !fk.owner_id ? null : (await db.auth.admin.getUserById(fk.owner_id)).data?.user?.email;
        if (sahip) gidecek.push({ to: [sahip], ...METIN.kazananSahip({ fikir: fk.title, vaka: v.title, link }) });
        if (f.length) gidecek.push({ to: f, ...METIN.kazananFirma({ fikir: fk.title, vaka: v.title, link: sayfa(v.id) }) });
      }
    }
  } else return new Response('bilinmeyen olay', { status: 400 });

  let gitti = 0;
  for (const e of gidecek) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('HABER_GONDEREN'), to: e.to, subject: e.subject, html: e.html }),
    });
    if (r.ok) gitti++;
  }
  return new Response(JSON.stringify({ olay, gidecek: gidecek.length, gitti }), { headers: { 'Content-Type': 'application/json' } });
});
