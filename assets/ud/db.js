/* Database names. The database speaks English (supabase/20-english-names.sql); the site's own code keeps its
   Turkish field names. Every query goes through UD_DB.from(sb, 'fikirler') / UD_DB.rpc(sb, 'alirdim', …), which
   turns table, column, function and argument names into the database's names and asks for every column under
   its Turkish alias (title → baslik), so rows come back in the shape the code already uses.
   One map, used three ways: here at run time, by tools/db-adlar.mjs to write the rename migration, and by
   tests/edge/db.test.mjs. Loaded before assets/ud/temel.js on every page. */
(function(root){
'use strict';
// Turkish table (as the code says it) → [English table, { Turkish column: English column }]
const TABLES = {
  fikirler: ['ideas', { id:'id', vaka_id:'case_id', sahip:'owner_id', baslik:'title', kategori:'category', problem:'problem', cozum:'solution',
    ozellikler:'features', ad:'display_name', gizli:'hidden', zaman:'created_at' }],
  talepler: ['demands', { fikir_id:'idea_id', uye:'member_id', fiyat:'price', zaman:'updated_at' }],
  puanlar: ['ratings', { fikir_id:'idea_id', uye:'member_id', olcut:'criterion', puan:'score', zaman:'updated_at' }],
  yorumlar: ['comments', { id:'id', fikir_id:'idea_id', uye:'member_id', tur:'kind', metin:'body', zaman:'created_at', ad:'display_name', gizli:'hidden' }],
  cihaz_izleri: ['device_marks', { fikir_id:'idea_id', cihaz:'device', tur:'kind', uye:'member_id', zaman:'created_at' }],
  haber_istekleri: ['notify_requests', { id:'id', uye:'member_id', eposta:'email', fikir_id:'idea_id', tur:'kind', gonderildi:'sent_at', zaman:'created_at' }],
  fikir_bildirimleri: ['idea_reports', { id:'id', fikir_id:'idea_id', uye:'member_id', neden:'reason', aciklama:'details', durum:'status', zaman:'created_at' }],
  iletisim_mesajlari: ['contact_messages', { id:'id', gonderen:'sender_id', ad:'name', eposta:'email', konu:'topic', mesaj:'message', durum:'status', zaman:'created_at' }],
  numune_talepleri: ['product_requests', { id:'id', gonderen:'sender_id', vaka_id:'case_id', amac:'purpose', tur:'requester_type', ad:'name', eposta:'email',
    telefon:'phone', sehir:'city', adet:'quantity', notlar:'notes', durum:'status', zaman:'created_at' }],
  hata_kayitlari: ['error_logs', { id:'id', zaman:'created_at', sayfa:'page', mesaj:'message', kaynak:'source', satir:'line', tarayici:'user_agent', uye:'member_id', durum:'status' }],
  profiller: ['profiles', { id:'id', email:'email', rol:'role', kullanici_adi:'username' }],
  vakalar: ['cases', { id:'id', baslik:'title', ozet:'summary', aciklama:'description', firma:'company', stok:'stock', adet:'quantity', olcu:'size_spec',
    sinif:'grade', taban_fiyat:'floor_price', deneme_adedi:'trial_quantity', sure_gun:'duration_days', gorsel:'image_url', model3d:'model_url', durum:'status',
    acilis:'opened_at', kapanis:'closed_at', kazanan:'winner_idea_id', olusturan:'created_by', olusturma:'created_at', guncelleme:'updated_at',
    ortaklik:'partnership', odul:'prize' }],
  vaka_basvurulari: ['case_applications', { id:'id', gonderen:'sender_id', firma:'company', kisi:'contact_name', eposta:'email', telefon:'phone', stok:'stock',
    adet:'quantity', notlar:'notes', durum:'status', zaman:'created_at', gorsel:'image_url', olcu:'size_spec', taban_fiyat:'floor_price', model:'offer_model',
    vaka_id:'case_id', baslik:'title', ozet:'summary', sinif:'grade', deneme_adedi:'trial_quantity', odul:'prize' }],
  vaka_firmalari: ['case_companies', { vaka_id:'case_id', eposta:'email', eklenme:'added_at', davet:'invited_at' }],
  vaka_gecmis: ['case_history', { id:'id', vaka_id:'case_id', durum:'status', not:'note', kim:'actor', zaman:'created_at' }],
  etkinlikler: ['events', { id:'id', baslik:'title', aciklama:'description', baslangic:'starts_at', bitis:'ends_at', baglanti:'link', olusturma:'created_at' }],
  yasak_sozler: ['banned_words', { soz:'word', tam:'exact_match', eklenme:'added_at' }],
  kaynaklar: ['sources', { id:'id', baslik:'title', hedef:'target', olusturma:'created_at' }],
  kagit_fikirler: ['paper_ideas', { fikir_id:'idea_id', iletisim:'contact', kaynak:'source_id', not:'note', giren:'entered_by', zaman:'created_at' }],
  // views
  fikir_kart: ['idea_cards', { id:'id', sahip:'owner_id', vaka_id:'case_id', baslik:'title', kategori:'category', problem:'problem', cozum:'solution',
    ozellikler:'features', ad:'display_name', zaman:'created_at', alici:'buyers', ort_fiyat:'avg_price', puanci:'raters',
    puan_d:'score_d', puan_m:'score_m', puan_u:'score_u', yorum:'comments' }],
  fikir_ozet: ['idea_summary', { fikir_id:'idea_id', vaka_id:'case_id', alici:'buyers', ort_fiyat:'avg_price', yorum:'comments' }]
};
const VIEWS = ['fikir_kart', 'fikir_ozet'];
// functions the site calls: Turkish → [English, { Turkish argument: English argument }, table its rows are (for aliases)]
const RPC = {
  alirdim: ['place_demand', { f:'p_idea_id', fiyat:'p_price', cihaz:'p_device' }],
  fikir_cihazi: ['mark_idea_device', { f:'p_idea_id', cihaz:'p_device' }],
  firma_gorsel: ['set_case_image', { v:'p_case_id', adres:'p_url' }],
  firma_model: ['set_case_model', { v:'p_case_id', adres:'p_url' }],
  giris_eposta: ['sign_in_email', { ad:'p_username' }],
  kullanici_adi_koy: ['set_username', { ad:'p_username' }],
  vaka_tam: ['cases_full', { v:'p_case_id' }, 'vakalar'],
  kaynak_ziyaret: ['log_source_visit', { kaynak:'p_source', cihaz:'p_device' }],
  kaynak_raporu: ['source_report', {}],
  kagit_fikir_ekle: ['add_paper_idea', { vaka:'p_case_id', kategori:'p_category', baslik:'p_title', problem:'p_problem', cozum:'p_solution',
    ad:'p_display_name', iletisim:'p_contact', kaynak:'p_source', not:'p_note' }],
  is_admin: ['is_admin', {}]
};

const tablo = t => TABLES[t] || [t, {}];
const sutun = (t, c) => (tablo(t)[1][c]) || c;
const anahtarlar = (t, o) => {
  if (Array.isArray(o)) return o.map(x => anahtarlar(t, x));
  if (!o || typeof o !== 'object') return o;
  const out = {}; for (const k in o) out[sutun(t, k)] = o[k]; return out;
};
// split on commas that are not inside parentheses
function parca(s){
  const out = []; let d = 0, cur = '';
  for (const ch of s){ if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d){ out.push(cur); cur = ''; } else cur += ch; }
  if (cur.trim()) out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}
// '*' → every known column under its Turkish alias; 'baslik' → 'baslik:title'; 'fikirler(baslik)' → 'fikirler:ideas(baslik:title)'
function secim(t, s){
  const cols = tablo(t)[1];
  return parca(s == null ? '*' : String(s)).map(p => {
    const g = p.match(/^([a-z_]+)\((.*)\)$/);
    if (g) return g[1] + ':' + tablo(g[1])[0] + '(' + secim(g[1], g[2]) + ')';
    if (p === '*') return Object.keys(cols).length ? Object.keys(cols).map(k => k === cols[k] ? k : k + ':' + cols[k]).join(',') : '*';
    if (p.includes(':')) return p;
    const en = cols[p];
    return en && en !== p ? p + ':' + en : p;
  }).join(',');
}
const SUTUN_ILK = ['eq','neq','gt','gte','lt','lte','like','ilike','is','in','contains','containedBy','not','filter','order','textSearch','overlaps','likeAllOf','likeAnyOf','ilikeAllOf','ilikeAnyOf'];
function argumanlar(t, ad, a){
  a = a.slice();
  if (ad === 'select') a[0] = secim(t, a[0]);
  else if (ad === 'insert' || ad === 'upsert' || ad === 'update'){
    a[0] = anahtarlar(t, a[0]);
    if (a[1] && a[1].onConflict) a[1] = { ...a[1], onConflict: a[1].onConflict.split(',').map(c => sutun(t, c.trim())).join(',') };
  } else if (ad === 'match') a[0] = anahtarlar(t, a[0]);
  else if (SUTUN_ILK.includes(ad) && typeof a[0] === 'string') a[0] = sutun(t, a[0]);
  return a;
}
// a query builder that speaks Turkish to the code and English to the database
function sar(b, t){
  if (!b || typeof b !== 'object') return b;
  return new Proxy(b, { get(h, ad){
    const v = h[ad];
    if (typeof v !== 'function') return v;
    if (ad === 'then' || ad === 'catch' || ad === 'finally') return v.bind(h);
    return (...a) => { const r = v.apply(h, argumanlar(t, ad, a)); return r && typeof r === 'object' && typeof r.then === 'function' ? sar(r, t) : r; };
  } });
}
function rpcAd(ad){ return (RPC[ad] || [ad])[0]; }
function rpcArg(ad, a){ const m = (RPC[ad] || [ad, {}])[1]; const out = {}; for (const k in (a || {})) out[m[k] || k] = a[k]; return out; }
const DB = {
  TABLES, VIEWS, RPC, tablo, sutun, secim, anahtarlar,
  ad: t => tablo(t)[0],
  from: (sb, t) => sar(sb.from(tablo(t)[0]), t),
  // rows of a table-returning function come back under the Turkish aliases too
  rpc: (sb, ad, a, o) => { const q = sb.rpc(rpcAd(ad), rpcArg(ad, a), o); const t = (RPC[ad] || [])[2]; return t ? sar(q, t).select('*') : q; },
  rpcAd, rpcArg
};
root.UD_DB = DB;
if (typeof module === 'object' && module.exports) module.exports = DB;
})(typeof window !== 'undefined' ? window : globalThis);
