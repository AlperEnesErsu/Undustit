// Undustit · a shared idea's own preview (Netlify Edge Function).
// A link to one idea is fikirler/?f=<owner>:<idea id>. The page is the same plain file for every idea, so WhatsApp,
// X, LinkedIn and search engines used to see "Fikirler · Undustit" whatever was shared. Here the idea is read from
// the public list (fikir_kart: hidden ideas are never in it) and its title, demand and address are written into
// <title>, the description, og:* and the canonical link before the page goes out. Anything unexpected (no such
// idea, a slow database, a bad id) sends the plain page as it is; the visitor never waits more than 1.5 seconds.
//
// The address and the anon key are the public ones from assets/ayar.js (the anon key may be public: row level
// security guards the data). SUPABASE_URL and SUPABASE_ANON_KEY in Netlify's environment override them.

const SB_URL = 'https://azjdweynukmwxywdfewb.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amR3ZXludWttd3h5d2RmZXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTc5ODcsImV4cCI6MjEwODQzMzk4N30.WmoNnRWTC5LPg-hFiUv3AdKl54CwTGaKEo4QS4RzwnE';
const SITE = 'https://undustit.com/';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ortam = k => { try { return (globalThis.Netlify && Netlify.env.get(k)) || ''; } catch { return ''; } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const kisalt = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const tl = n => '₺' + Math.round(Number(n) || 0).toLocaleString('tr-TR');

// the idea's id from "<owner>:<id>" (the owner part is checked too: a link must name the idea's real writer)
export function anahtar(f){
  const i = String(f || '').lastIndexOf(':');
  if (i < 0) return null;
  const sahip = f.slice(0, i), id = f.slice(i + 1);
  return UUID.test(sahip) && UUID.test(id) ? { sahip, id } : null;
}

export function etiketler(fikir, adres){
  const baslik = kisalt(fikir.baslik, 90);
  const talep = Number(fikir.alici) > 0
    ? `${Number(fikir.alici).toLocaleString('tr-TR')} kişi alırdım dedi, ortalama ${tl(fikir.ort_fiyat)}.`
    : 'İlk "alırdım" diyen sen ol.';
  const aciklama = kisalt([fikir.problem, talep].filter(Boolean).join(' '), 200);
  return { title:`${baslik} · Undustit`, aciklama, adres };
}

// write the idea into the page's head; the tags are the ones fikirler/index.html carries
export function yerlestir(html, e){
  const t = esc(e.title), d = esc(e.aciklama), u = esc(e.adres);
  const icerik = (re, v) => { html = html.replace(re, (m, a, b) => a + v + b); };
  icerik(/(<title[^>]*>)[^<]*(<\/title>)/, t);
  icerik(/(<meta name="description" content=")[^"]*(")/, d);
  icerik(/(<meta property="og:title" content=")[^"]*(")/, t);
  icerik(/(<meta property="og:description" content=")[^"]*(")/, d);
  icerik(/(<meta property="og:url" content=")[^"]*(")/, u);
  icerik(/(<link rel="canonical" href=")[^"]*(")/, u);
  icerik(/(<meta property="og:type" content=")[^"]*(")/, 'article');
  // the page's own scripts put the visitor's language back into these; a crawler keeps the idea's text
  return html.replace(/(<(?:title|meta name="description"|meta property="og:(?:title|description)")[^>]*?)\s+data-ta?="[^"]*"/g, '$1');
}

// the database's names are English (assets/ud/db.js); the row comes back under the Turkish aliases used below
async function fikirOku(id, url, anon){
  const ctrl = new AbortController(); const zaman = setTimeout(() => ctrl.abort(), 1500);
  try {
    const r = await fetch(`${url}/rest/v1/idea_cards?id=eq.${id}&select=sahip:owner_id,baslik:title,problem,alici:buyers,ort_fiyat:avg_price&limit=1`,
      { headers:{ apikey:anon, Authorization:'Bearer ' + anon }, signal:ctrl.signal });
    if (!r.ok) return null;
    const satir = (await r.json())[0];
    return satir || null;
  } catch { return null; } finally { clearTimeout(zaman); }
}

export default async (request, context) => {
  const istek = new URL(request.url);
  const k = anahtar(istek.searchParams.get('f'));
  if (!k) return;                                  // not a shared idea: the plain page
  const [sayfa, fikir] = await Promise.all([context.next(), fikirOku(k.id, ortam('SUPABASE_URL') || SB_URL, ortam('SUPABASE_ANON_KEY') || SB_ANON)]);
  if (!fikir || fikir.sahip !== k.sahip || !sayfa.ok || !/text\/html/.test(sayfa.headers.get('content-type') || '')) return sayfa;
  const adres = SITE + 'fikirler/?f=' + encodeURIComponent(k.sahip + ':' + k.id);
  const html = yerlestir(await sayfa.text(), etiketler(fikir, adres));
  const basliklar = new Headers(sayfa.headers); basliklar.delete('content-length');
  return new Response(html, { status:sayfa.status, headers:basliklar });
};

export const config = { path:['/fikirler', '/fikirler/', '/fikirler/index.html'] };
