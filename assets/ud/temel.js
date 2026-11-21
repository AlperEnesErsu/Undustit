/* Undustit core: texts, business terms, dates, small helpers, the Supabase client, error notices, analytics.
   Loaded in order: temel, depo, arayuz, hareket (plain scripts, so pages can call UD right after them).
   Each file shares its top-level names on window.UD_IC and takes what it needs from there. */
(function(){
'use strict';
const html = document.documentElement;
const ROOT = html.dataset.root || '';
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
// =========================================================== text
// Every word the site shows comes from assets/metin/<dil>.js (loaded by stil.js). T('key', {n:3}) fills {n}.
const METIN = window.UD_METIN || { lang:'tr', al: () => undefined };
const LANG = METIN.lang;
const LOCALE = LANG === 'en' ? 'en-GB' : 'tr-TR';
function T(k, v){
  let s = METIN.al(k);
  // a missing text never shows its key ("ud.al.alirdim" once reached a search result, when the crawler's render
  // ran without the dictionary); metin.py denetle catches missing keys before they ship
  if (s == null){ if (!T.eksik[k]){ T.eksik[k] = 1; console.warn('metin yok: ' + k); } return ''; }
  if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => n in v ? v[n] : m);
  return s;
}
T.eksik = {};
// pages carry their text in place (data-t for the inside, data-ta="attr:key;attr:key" for attributes)
function applyText(root=document){
  if (root === document && LANG !== 'tr'){
    // the English page is its own page for search engines, not a copy of the Turkish one
    const c = $('link[rel=canonical]'); if (c) c.href = c.href.split('?')[0] + '?dil=' + LANG;
    const l = $('meta[property="og:locale"]'); if (l) l.content = 'en_GB';
  }
  root.querySelectorAll('[data-t]').forEach(n => { const v = METIN.al(n.dataset.t); if (v != null && n.innerHTML !== v) n.innerHTML = v; });
  if (LANG !== 'tr') root.querySelectorAll('figcaption').forEach(n => { if (/^×\s?[\d.]+$/.test(n.textContent.trim())) n.textContent = '× ' + Number(n.textContent.replace(/\D/g, '')).toLocaleString(LOCALE); });
  root.querySelectorAll('[data-ta]').forEach(n => n.dataset.ta.split(';').forEach(p => { const [a, k] = p.split(':'); const v = METIN.al(k); if (v != null) n.setAttribute(a, v); }));
}
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
function el(tag, props={}, kids=[]){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(props)){
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach(c => c != null && n.append(c));
  return n;
}
// A field that still needs something: a quiet note under it, the field marked, the focus there; the next edit clears it.
// Red stays for what went wrong (the server said no); an empty or mistyped field is a pointer, not an error.
function alanUyar(node, metin){
  if (!node) return;
  const kap = node.closest('label, fieldset, .if-field');
  const eski = (kap || node.parentElement.parentElement).querySelector('.alan-not');
  const not = eski || el('small', { class:'alan-not', id:'an-' + Math.random().toString(36).slice(2, 8) });
  not.textContent = metin;
  if (!eski){ if (kap) kap.append(not); else node.parentElement.after(not); }
  const once = node.getAttribute('aria-describedby');
  node.setAttribute('aria-invalid', 'true');
  node.setAttribute('aria-describedby', not.id);
  const temizle = () => { not.remove(); node.removeAttribute('aria-invalid'); if (once) node.setAttribute('aria-describedby', once); else node.removeAttribute('aria-describedby'); };
  const yazi = /^(INPUT|TEXTAREA)$/.test(node.tagName) && !/^(checkbox|radio|file)$/.test(node.type);
  (yazi ? node : (kap || node.parentElement)).addEventListener(yazi ? 'input' : 'click', temizle, { once:true });
  node.focus();
}
const ICON = {
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  ben:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  replay:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  // Google's own mark for "Google ile devam et", as its sign-in guidelines ask
  google:'<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>'
};

// =========================================================== model constants
// Draft business terms from the first meeting. Change them here only.
const TERMS = {
  fee: { first: 99, next: 10, cur: '₺', charged: false },
  voteDays: 30, maxPrice: 20000,   // supabase/18-talep-kilidi.sql: the database's ceiling too
  shareRetail: 10, shareDirect: 30,
  presale: [300, 750],
  // surplus-stock cases (Vaka 01 · Boltun): the profit above the stock's floor price is split, not the sale;
  // the four parts are the slot winners' 10%, the rest stays with Undustit. Changing a cost is repaid first.
  caseShare: { inventor: 40, slots: { isim: 3, gorunum: 3, ambalaj: 2, kanal: 2 } }
};
const CATS = ['Mutfak','Ev & dekor','Fitness','Ofis & masa','Dış mekân','Teknoloji aksesuarı','Çocuk','Evcil hayvan'];
// Cases are rows of the vakalar table (opened from yonetim/); Store.cases() fills this array in place.
// Vaka 01 keeps its hand-made page and its translated text; every other case lives at vaka/?id=<id>.
const CASES = [];
const V01 = { id:'vaka-01', name:T('ud.vaka1.ad'), tag:T('ud.vaka1.etiket'), short:'Vaka 01 · Cıvata', href:'vaka-01/', durum:'acik', adet:1e6 };
// a case photo: an https address (Supabase Storage) or, in the local preview, a data URL
const gorselAdresi = u => /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(u || '') ? u : '';
// a 3D model (.glb, supabase/23-model.sql): an https address or, in the local preview, a data URL
const modelAdresi = u => /^(https:\/\/|data:model\/gltf-binary;base64,)/i.test(u || '') ? u : '';
// A case's idea period: from its opening (acilis, set when it first goes "Açık") for sure_gun days. null before it
// opens. Once it has run out the case takes no new ideas (the form closes, openCases() leaves it out) until the
// admin moves it on or gives it more days; "alırdım" stays open. The same rule on every page and in the admin.
function vakaSuresi(v){
  if (!v || !v.acilis || !isFinite(Date.parse(v.acilis))) return null;
  const bitis = new Date(Date.parse(v.acilis) + (Number(v.sure_gun) || 30) * 864e5), ms = bitis - Date.now();
  return { bitis, kalanGun: Math.max(0, Math.ceil(ms / 864e5)), doldu: ms <= 0 };
}
function caseOf(v){
  // what the case offers (supabase/12-vaka-modeli.sql); older rows and the local seed are partnerships
  const model = { ortaklik: v.ortaklik !== false, odul: Number(v.odul) || 0 };
  const sure = { acilis:v.acilis || null, sure_gun:Number(v.sure_gun) || 30, kazanan:v.kazanan || null };
  if (v.id === V01.id) return { ...V01, ...model, ...sure, durum:v.durum, gorsel:gorselAdresi(v.gorsel), model3d:modelAdresi(v.model3d) };
  return { id:v.id, name:v.baslik, tag:v.olcu || v.stok || '', short:String(v.baslik).slice(0, 40), href:'vaka/?id=' + encodeURIComponent(v.id),
    durum:v.durum, ...model, ...sure, gorsel:gorselAdresi(v.gorsel), model3d:modelAdresi(v.model3d), ozet:v.ozet || '', adet:Number(v.adet) || 0, olcu:v.olcu || '', sinif:v.sinif || '' };
}
// open for ideas: "Açık" and its period not run out
const openCases = () => CASES.filter(c => c.durum === 'acik' && !(vakaSuresi(c) || {}).doldu);
// what a case offers, in words: "Sales partnership · 40% of the profit to the idea's owner", "Idea prize · ₺25,000"
const modelEtiketleri = c => [c.ortaklik !== false ? T('ud.model.ortaklik', { pay:pct(TERMS.caseShare.inventor) }) : null,
  Number(c.odul) > 0 ? T('ud.model.odul', { tutar:tl(c.odul) }) : null].filter(Boolean);
// an idea belongs to a case by its vaka_id; older ideas only carry the case's label as their category
const inCase = (i, c) => i.caseId ? i.caseId === c.id : i.cat === c.short;
// categories and case names are stored in Turkish (they are data); only what is shown is translated
const catName = c => { const v = METIN.al('ud.kat.' + c); return v == null ? c : v; };
const CRIT = [['d',T('ud.olcut.d')],['m',T('ud.olcut.m')],['u',T('ud.olcut.u')]];
const EXAMPLES = [
  { key:'ex:1', ex:true, title:T('ud.ornek.1.baslik'), cat:'Mutfak', problem:T('ud.ornek.1.problem'), solution:T('ud.ornek.1.cozum'), feats:[T('ud.ornek.1.oz1'),T('ud.ornek.1.oz2')], at:null },
  { key:'ex:2', ex:true, title:T('ud.ornek.2.baslik'), cat:'Fitness', caseId:'vaka-01', problem:T('ud.ornek.2.problem'), solution:T('ud.ornek.2.cozum'), feats:[T('ud.ornek.2.oz1'),T('ud.ornek.2.oz2')], at:null },
  { key:'ex:3', ex:true, title:T('ud.ornek.3.baslik'), cat:'Evcil hayvan', problem:T('ud.ornek.3.problem'), solution:T('ud.ornek.3.cozum'), feats:[T('ud.ornek.3.oz1'),T('ud.ornek.3.oz2')], at:null }
];

// =========================================================== helpers
const DAY = 864e5;
const fmtDate = d => d.toLocaleDateString(LOCALE, { day:'numeric', month:'long' });
const fmtDay = d => d.toLocaleDateString(LOCALE, { weekday:'long', day:'numeric', month:'long' });
function daysLeft(at){
  if (!at) return null;
  const end = new Date(at).getTime() + TERMS.voteDays*DAY;
  return Math.max(0, Math.ceil((end - Date.now())/DAY));
}
const homeHref = () => ROOT || './';
// stil.js (loaded in <head>) owns the ?stil= choice; without it every page is the default look
const STIL = window.UD_STIL || { list:{}, current:'oyuncu', withStil: h => h };
const withStil = h => STIL.withStil(h);

// =========================================================== telling the visitor something went wrong
// A load that fails leaves a strip with a retry; a write that fails says so briefly (the database's own
// reason when it is a daily limit). Nothing fails silently.
function toast(msg){
  const t = el('div', { class:'ud-toast', role:'status', text:msg });
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 4200);
}
const yazmaHatasi = err => toast(err && err.code === 'P0001' && err.message ? err.message : T('ud.hata.kayit'));
let uyariEl = null;
function veriUyari(on, yeniden){
  if (!on){ if (uyariEl){ uyariEl.remove(); uyariEl = null; } return; }
  if (uyariEl) return;
  uyariEl = el('div', { class:'veri-uyari', role:'status' }, [el('span', { text:T('ud.hata.yukleme') }),
    el('button', { type:'button', text:T('ud.hata.tekrar'), onclick(){ this.disabled = true; yeniden(); } })]);
  document.body.append(uyariEl);
}

// =========================================================== store
// One Supabase client per page, shared with veri.js (window.UD_SB), so the visitor and the admin
// panel never run two auth sessions side by side. The library loads on first use only.
function sbClient(){
  const A = window.UD_AYAR || {};
  if (!sbClient.p) sbClient.p = (window.supabase && window.supabase.createClient ? Promise.resolve(window.supabase) : new Promise((ok, no) => {
    const sc = document.createElement('script');
    // pinned to the exact file: if the CDN ever served something else, the browser refuses to run it.
    // A new version needs a new hash (README, "Supabase istemcisi"); the same pair lives in assets/veri.js.
    sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    sc.integrity = 'sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug'; sc.crossOrigin = 'anonymous';
    sc.onload = () => window.supabase && window.supabase.createClient ? ok(window.supabase) : no(new Error('Veri servisi yüklenemedi'));
    sc.onerror = () => no(new Error('Veri servisi yüklenemedi'));
    document.head.append(sc);
  })).then(lib => lib.createClient(A.supabaseUrl, A.supabaseAnon));
  return sbClient.p;
}
window.UD_SB = sbClient;

// =========================================================== 3D model
// <model-viewer> (Google, jsDelivr, fixed version and checksum) turns and zooms the product's .glb; on a phone
// "AR'da gör" puts it in the room. Loaded only on a page that has a model. The photo is its poster, and stays
// on its own if the viewer cannot load. Models must not use Draco/KTX2 compression: those decoders come from
// another host the Content-Security-Policy does not allow (supabase/KURULUM.md §26).
const MODEL_VIEWER = { src:'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js',
  sri:'sha384-sr9b4Ux0WhAUGclJ0ym0FSY2zSOMmNSn0bP/SA0e6bNCrpn/5W3QL8mm+LdlQMKw' };
let modelViewerP = null;
function modelViewerYukle(){
  if (window.customElements && customElements.get('model-viewer')) return Promise.resolve();
  return modelViewerP || (modelViewerP = new Promise((ok, no) => {
    const sc = document.createElement('script');
    sc.type = 'module'; sc.src = MODEL_VIEWER.src; sc.integrity = MODEL_VIEWER.sri; sc.crossOrigin = 'anonymous';
    sc.onload = () => customElements.whenDefined('model-viewer').then(ok);
    sc.onerror = () => { modelViewerP = null; no(new Error('model-viewer')); };
    document.head.append(sc);
  }));
}
// fig: a .foy-gorsel figure (it may already hold the photo). o: { model, poster, alt }
function model3d(fig, o){
  const src = modelAdresi(o && o.model);
  if (!fig || !src) return Promise.resolve(false);
  return modelViewerYukle().then(() => {
    const mv = document.createElement('model-viewer');
    const set = { src, alt:o.alt || T('ud.model.alt'), 'camera-controls':'', 'touch-action':'pan-y', 'shadow-intensity':'0.6',
      'interaction-prompt':'auto', ar:'', 'ar-modes':'webxr scene-viewer' };
    if (gorselAdresi(o.poster)) set.poster = o.poster;
    for (const k in set) mv.setAttribute(k, set[k]);
    // the AR button only where the phone can do it (model-viewer hides the slot otherwise)
    const ar = document.createElement('button');
    ar.type = 'button'; ar.slot = 'ar-button'; ar.className = 'btn alt sm model-ar'; ar.textContent = T('ud.model.ar');
    mv.append(ar);
    // a file the viewer cannot read: back to the photo, if there is one
    mv.addEventListener('error', () => {
      fig.classList.remove('model3d');
      if (gorselAdresi(o.poster)) fig.replaceChildren(el('img', { src:o.poster, alt:o.alt || '', decoding:'async' }));
      else { fig.classList.add('yok'); fig.replaceChildren(el('figcaption', { text:T('ud.model.hata') })); }
    });
    fig.classList.remove('yok'); fig.classList.add('model3d');
    fig.replaceChildren(mv, el('figcaption', { class:'model-ipucu', text:T('ud.model.ipucu') }));
    return true;
  }).catch(() => false);   // no viewer: whatever the figure showed (the photo) stays
}

// =========================================================== error log
// An uncaught error goes to error_logs (supabase/10-hata.sql, renamed in 20-english-names.sql) so a broken page gets noticed; the admin reads
// them in yonetim/. Each message once, five per page view at most, never what the visitor typed: the address
// without its #fragment (sign-in tokens live there), the message, where it came from, the browser. A plain REST
// insert, so it works without a session. Browser extensions' errors and the content-free "Script error." are skipped.
(function(){
  const A = window.UD_AYAR || {};
  // search engines' renderers (Googlebot, headless checkers) stop scripts half way; their errors say nothing about visitors
  if (!A.supabaseUrl || !window.fetch || /bot|crawl|spider|slurp|headless|lighthouse/i.test(navigator.userAgent)) return;
  const gorulen = new Set(); let kalan = 5;
  const gonder = (mesaj, kaynak, satir) => {
    mesaj = String(mesaj || '').trim().slice(0, 500); kaynak = String(kaynak || '');
    // a page transition the browser skipped (a fast second click, a hidden tab) rejects a promise; nothing is broken
    if (/view transition|transition was (skipped|aborted)|skipTransition/i.test(mesaj)) return;
    if (!mesaj || mesaj === 'Script error.' || /^(chrome|moz|safari)-extension:/.test(kaynak) || gorulen.has(mesaj) || kalan <= 0) return;
    gorulen.add(mesaj); kalan--;
    // error_logs (assets/ud/db.js: the database's own names)
    fetch(A.supabaseUrl + '/rest/v1/error_logs', { method:'POST',
      headers:{ apikey:A.supabaseAnon, Authorization:'Bearer ' + A.supabaseAnon, 'Content-Type':'application/json', Prefer:'return=minimal' },
      body:JSON.stringify({ page:(location.pathname + location.search).slice(0, 300), message:mesaj, source:kaynak.slice(0, 300),
        line:Number(satir) || null, user_agent:navigator.userAgent.slice(0, 300) }) }).catch(() => {});
  };
  // the error's own message: the event's adds a browser-specific "Uncaught Error: " in front
  addEventListener('error', e => { const m = (e.error && e.error.message) || e.message; if (m) gonder(m, e.filename, e.lineno); });
  addEventListener('unhandledrejection', e => { const r = e.reason; gonder(r && (r.message || String(r)), r && r.stack ? String(r.stack).split('\n')[1] : '', null); });
})();

// =========================================================== browser id
// One random id per browser, kept in a cookie and in local storage (either one restores the other). It goes
// along with "alırdım", a new idea and a visit from a tracked link, so the database counts one browser once per idea
// and knows the browser an idea was written on (supabase/17-oy.sql, 22-kaynak.sql). It says nothing about the
// person and is never shown to anyone.
function cihazId(){
  let v = '';
  try { v = (document.cookie.match(/(?:^|; )ud_cihaz=([a-z0-9]{16,40})/) || [])[1] || localStorage.getItem('ud-cihaz') || ''; } catch(e){}
  if (!/^[a-z0-9]{16,40}$/.test(v)){
    const a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a);
    v = Array.from(a, x => (x % 36).toString(36)).join('') + Date.now().toString(36);
  }
  try { localStorage.setItem('ud-cihaz', v); } catch(e){}
  try { document.cookie = 'ud_cihaz=' + v + '; Max-Age=63072000; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); } catch(e){}
  return v;
}
window.UD_CIHAZ = cihazId;

// =========================================================== the printed poster, once, for who came from it
// Someone who scans the brochure's QR first sees the brochure itself, closable (Kapat, Esc, a tap outside). Only
// on that arrival: the k leaves the address (below), so a reload or a shared link opens the page alone.
const AFISLER = {
  brosur: { src:'assets/afis/challenge-001.webp', w:1200, h:1703,
    alt:'Challenge #001: Bu cıvatalarla ne yapardın? Cıvatanın 999.999 kardeşi yeni bir hayat arıyor. Undustit atıl ürünleri ' +
      'topluluğun fikirleriyle yeni ürünlere dönüştürür; en çok talep gören fikir deneme üretimine geçer, fikir sahipleri kârdan pay alır. ' +
      'Fikirler 21.12.2026 tarihine kadar toplanır, sonra oylamaya sunulur ve sonuç undustit.com üzerinden açıklanır.' }
};
function afisGoster(k){
  const a = AFISLER[k];
  if (!a || typeof HTMLDialogElement !== 'function') return;
  // the poster starts loading at once; the window opens when it is in (no empty frame with a lone button), at most three seconds later
  const resim = new Image(a.w, a.h);
  resim.alt = a.alt;
  const yuklendi = new Promise(ok => { resim.onload = resim.onerror = ok; });
  resim.src = ROOT + a.src;
  const ac = () => {
    const d = document.createElement('dialog');
    d.className = 'afis-dlg';
    d.setAttribute('aria-label', LANG === 'en' ? 'Brochure' : 'Broşür');
    const kapat = LANG === 'en' ? 'Close' : 'Kapat';
    d.innerHTML = '<form method="dialog" class="afis-kapat"><button class="btn sig sm" value="kapat" autofocus>' + kapat + '</button></form>';
    d.append(resim);
    d.addEventListener('click', e => { if (e.target === d) d.close(); });   // a tap on the dimmed area outside
    d.addEventListener('close', () => d.remove());
    document.body.append(d);
    d.showModal();
  };
  const hazir = Promise.race([yuklendi, new Promise(ok => setTimeout(ok, 3000))]);
  const dom = new Promise(ok => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ok, { once:true }) : ok());
  Promise.all([hazir, dom]).then(ac);
}

// =========================================================== tracked links ("Ne kadar çalıştı?")
// A link with ?k=<source> (the brochure QR: undustit.com/brosur → /fikir/?vaka=vaka-01&k=brosur) counts this browser
// once for that source; the admin sees in /yonetim/kaynak/ how many came and how many then wrote an idea or said
// "alırdım" (supabase/22-kaynak.sql). The k leaves the address at once, so a link shared on from here is not counted
// as the brochure. Search engines' renderers are not counted. Locally (no database) the visit stays in this browser.
(function(){
  let k = '';
  try { k = new URLSearchParams(location.search).get('k') || ''; } catch(e){ return; }
  if (!k) return;
  try { const u = new URL(location.href); u.searchParams.delete('k'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch(e){}
  k = k.toLowerCase();
  if (!/^[a-z0-9-]{1,30}$/.test(k)) return;
  afisGoster(k);
  if (/bot|crawl|spider|slurp|headless|lighthouse/i.test(navigator.userAgent)) return;
  const A = window.UD_AYAR || {};
  if (!A.supabaseUrl){
    try {
      const z = JSON.parse(localStorage.getItem('ud-kaynak-ziyaret') || '{}') || {};
      if (!z[k]){ z[k] = new Date().toISOString(); localStorage.setItem('ud-kaynak-ziyaret', JSON.stringify(z)); }
    } catch(e){}
    return;
  }
  if (!window.fetch) return;
  // log_source_visit (assets/ud/db.js: kaynak_ziyaret); unknown sources are ignored by the database
  fetch(A.supabaseUrl + '/rest/v1/rpc/log_source_visit', { method:'POST', keepalive:true,
    headers:{ apikey:A.supabaseAnon, Authorization:'Bearer ' + A.supabaseAnon, 'Content-Type':'application/json' },
    body:JSON.stringify({ p_source:k, p_device:cihazId() }) }).catch(() => {});
})();

// =========================================================== spam protection
// Cloudflare Turnstile in front of every Supabase sign-in, the anonymous one too: every write (idea, "alırdım",
// comment, application, message) needs a session, so this one gate guards them all, and Supabase checks the
// token on its side (Auth > Attack Protection). ayar.js turnstile = the public site key; empty = off.
// A fresh widget per call (tokens are single use); people mostly see nothing, a small box only when Cloudflare asks.
const TURNSTILE = (window.UD_AYAR || {}).turnstile || '';
let tsYukle = null;
function captcha(){
  if (!TURNSTILE) return Promise.resolve(undefined);
  tsYukle = tsYukle || new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => window.turnstile ? ok(window.turnstile) : no(new Error(T('ud.captcha.hata')));
    s.onerror = () => { tsYukle = null; no(new Error(T('ud.captcha.hata'))); };
    document.head.append(s);
  });
  // Mostly nothing shows. When Cloudflare does want a tick, the page dims and the box sits in the middle with a
  // line saying why, so a sign-in never seems to hang on a box at the bottom of the screen. Retries are ours:
  // one more try after an error, then a clear message (Cloudflare's own retry ran into the removed box).
  return tsYukle.then(ts => new Promise((ok, no) => {
    const yer = el('div', { class:'ts-yer' });
    const vazgec = el('button', { type:'button', class:'btn alt sm', text:T('ud.captcha.vazgec') });
    const kutu = el('div', { class:'ts-kutu', role:'dialog', 'aria-modal':'true', 'aria-label':T('ud.captcha.baslik') }, [
      el('div', { class:'ts-kart' }, [el('b', { text:T('ud.captcha.baslik') }), el('p', { text:T('ud.captcha.not') }), yer, vazgec])]);
    document.body.append(kutu);
    let id = null, deneme = 0, bitti = false;
    const bitir = (f, v) => { if (bitti) return; bitti = true; try { if (id != null) ts.remove(id); } catch(e){} kutu.remove(); f(v); };
    const hata = () => {
      if (bitti) return;
      if (deneme++ < 1 && id != null){ try { ts.reset(id); return; } catch(e){} }
      bitir(no, Object.assign(new Error(T('ud.captcha.hata')), { code:'captcha' }));
    };
    vazgec.addEventListener('click', () => bitir(no, Object.assign(new Error(T('ud.captcha.iptal')), { code:'captcha_iptal' })));
    id = ts.render(yer, { sitekey:TURNSTILE, appearance:'interaction-only', retry:'never', 'refresh-expired':'manual', language: LANG === 'en' ? 'en' : 'tr',
      'before-interactive-callback': () => { kutu.classList.add('acik'); vazgec.focus(); },
      callback: t => bitir(ok, t), 'error-callback': hata, 'expired-callback': hata, 'timeout-callback': hata });
  }));
}
// Live on claude.ai (db capability): ideas/<uid>, votes/<uid>, notes/<uid>, each person writes their own doc.
// A vote is purchase intent, not a like: votes/<uid>.buy maps an idea to the price that person would pay.
// Anywhere else it keeps the same shape in localStorage so the pages can be tried as a preview.
// =========================================================== measuring
// Cookieless page and event counts (Plausible) only once ayar.js names the site's domain; until then
// nothing loads and olcu() does nothing. Events: idea sent, "alırdım", share, e-mail notice, application.
const ANALITIK = (window.UD_AYAR || {}).analitik || '';
if (ANALITIK){
  window.plausible = window.plausible || function(){ (window.plausible.q = window.plausible.q || []).push(arguments); };
  const sc = document.createElement('script');
  sc.defer = true; sc.dataset.domain = ANALITIK; sc.src = 'https://plausible.io/js/script.js';
  document.head.append(sc);
}
function olcu(ad, props){ if (ANALITIK && window.plausible) window.plausible(ad, props ? { props } : undefined); }

// =========================================================== shared helpers
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
// an idea's case (by its vaka_id; older case ideas carry only the case's label as their category) and its own category
function vakaOf(i){
  const byId = i.caseId && (CASES.find(c => c.id === i.caseId) || (i.caseId === V01.id ? V01 : null));
  return byId || (i.cat && (CASES.find(c => c.short === i.cat) || (i.cat === V01.short ? V01 : null))) || null;
}
function katOf(i){ const vk = vakaOf(i); return i.cat && (!vk || i.cat !== vk.short) ? i.cat : ''; }
// one line for both: "Vaka 01 · Boltun · Fitness"
function etiket(i){ const vk = vakaOf(i), k = katOf(i); return [vk && catName(vk.short), k && catName(k)].filter(Boolean).join(' · '); }
function sortIdeas(list, by){
  const c = list.slice();
  if (by === 'new') c.sort((a,b) => String(b.at).localeCompare(String(a.at)));
  else c.sort((a,b) => b.buyers - a.buyers || b.avg - a.avg || String(b.at).localeCompare(String(a.at)));
  return c;
}
// Turkish writes the percent sign first (%10), English after (10%)
const pct = v => LANG === 'en' ? v + '%' : '%' + v;
const tl = n => LANG === 'en' ? '₺' + Math.round(n).toLocaleString(LOCALE) : Math.round(n).toLocaleString(LOCALE) + ' ₺';

window.UD_IC = { alanUyar, modelEtiketleri, captcha, gorselAdresi, modelAdresi, model3d, vakaSuresi, vakaOf, katOf, html, ROOT, reduce, METIN, LANG, LOCALE, T, applyText, $, $$, el, ICON, TERMS, CATS, CASES, V01, caseOf, openCases, inCase, catName, CRIT, EXAMPLES, DAY, fmtDate, fmtDay, daysLeft, homeHref, STIL, withStil, toast, yazmaHatasi, uyariEl, veriUyari, sbClient, ANALITIK, olcu, esc, etiket, sortIdeas, pct, tl };
})();
