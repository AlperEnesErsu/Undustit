// Undustit · the English page as its own page for search engines (Netlify Edge Function).
// Every page is one Turkish file; ?dil=en makes it English in the browser (assets/stil.js). Search engines read the
// file before any script runs, so the English address used to say "canonical: the Turkish page" in Turkish, and
// Google folded the two into one, sometimes showing the English text under the Turkish address to Turkish searchers.
// Here, for ?dil=en only, the head is written in English before the page goes out: <html lang>, the canonical link
// and og:url (with ?dil=en), og:locale, and every head tag that carries a text key (<title data-t>, description and
// og:* data-ta) from assets/metin/en.js. The body is still filled in by the page's own script, as before.
// Anything unexpected (no dictionary, not HTML) sends the page as it is. The Turkish address is never touched.

const SITE = 'https://undustit.com';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const duz = s => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();   // a dictionary value may hold markup

// assets/metin/en.js is UD_METIN.ekle('en', { ...JSON... }); read once per edge instance, again after ten minutes
let sozluk = null, alindi = 0;
export function sozlukCoz(metin){
  const a = metin.indexOf('{'), b = metin.lastIndexOf('}');
  if (a < 0 || b < a) return null;
  try { return JSON.parse(metin.slice(a, b + 1)); } catch { return null; }
}
async function sozlukOku(adres){
  if (sozluk && Date.now() - alindi < 600000) return sozluk;
  const ctrl = new AbortController(); const zaman = setTimeout(() => ctrl.abort(), 1500);
  try {
    const r = await fetch(new URL('/assets/metin/en.js', adres), { signal:ctrl.signal });
    const o = r.ok ? sozlukCoz(await r.text()) : null;
    if (o){ sozluk = o; alindi = Date.now(); }
    return o || sozluk;
  } catch { return sozluk; } finally { clearTimeout(zaman); }
}

// the English head; only <head> changes, and only what the page itself marks or names
export function ingilizce(html, yol, s){
  const i = html.indexOf('</head>');
  if (i < 0) return html;
  let bas = html.slice(0, i);
  const adres = SITE + yol + '?dil=en';
  bas = bas.replace(/<html([^>]*)\slang="tr"/, '<html$1 lang="en"');
  bas = bas.replace(/(<link rel="canonical" href=")[^"]*(")/, '$1' + esc(adres) + '$2');
  bas = bas.replace(/(<meta property="og:url" content=")[^"]*(")/, '$1' + esc(adres) + '$2');
  bas = bas.replace(/(<meta property="og:locale" content=")tr_TR(")/, '$1en_GB$2');
  // <title data-t="key">…</title>
  bas = bas.replace(/(<title[^>]*\sdata-t="([^"]+)"[^>]*>)[^<]*(<\/title>)/, (m, ac, k, kapa) => k in s ? ac + esc(duz(s[k])) + kapa : m);
  // <meta … content="…" data-ta="content:key">
  bas = bas.replace(/<meta\b[^>]*\sdata-ta="([^"]+)"[^>]*>/g, (etiket, spec) => {
    spec.split(';').forEach(p => {
      const [ad, k] = p.split(':');
      if (ad && k in s) etiket = etiket.replace(new RegExp('(\\s' + ad + '=")[^"]*(")'), '$1' + esc(duz(s[k])).replace(/\$/g, '$$$$') + '$2');
    });
    return etiket;
  });
  return bas + html.slice(i);
}

export default async (request, context) => {
  const istek = new URL(request.url);
  if (istek.searchParams.get('dil') !== 'en') return;   // the Turkish page: as it is
  const [sayfa, s] = await Promise.all([context.next(), sozlukOku(istek)]);
  if (!s || !sayfa.ok || !/text\/html/.test(sayfa.headers.get('content-type') || '')) return sayfa;
  const yol = istek.pathname.replace(/index\.html$/, '');
  const html = ingilizce(await sayfa.text(), yol, s);
  const basliklar = new Headers(sayfa.headers); basliklar.delete('content-length');
  return new Response(html, { status:sayfa.status, headers:basliklar });
};

export const config = { path:'/*', excludedPath:['/assets/*', '/yonetim/*', '/netlify/*', '/*.ico', '/*.png', '/*.svg', '/*.xml', '/*.txt', '/*.webmanifest'] };
