/* Undustit shared script: nav, data store, idea form, idea boards, Thursday countdown, the process run.
   Every page sets <html data-root="../"> (path back to the site root) and calls the parts it uses. */
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
  if (s == null) return k;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => n in v ? v[n] : m);
  return s;
}
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
const ICON = {
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  ben:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  replay:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'
};

// =========================================================== model constants
// Draft business terms from the first meeting (Quirky model). Change them here only.
const TERMS = {
  fee: { first: 99, next: 10, cur: '₺', charged: false },
  voteDays: 30, maxPrice: 100000,
  shareRetail: 10, shareDirect: 30,
  presale: [300, 750],
  // surplus-stock cases (Vaka 01 · Boltun): the profit above the stock's floor price is split, not the sale;
  // the four parts are the slot winners' 10%, the rest stays with Undustit. Changing a cost is repaid first.
  caseShare: { inventor: 40, slots: { isim: 3, gorunum: 3, ambalaj: 2, kanal: 2 } },
  liveDay: 4, liveHourUtc: 17, liveMinutes: 90 // Thursday 20:00 Istanbul (UTC+3, no DST), for about an hour and a half
};
const CATS = ['Mutfak','Ev & dekor','Fitness','Ofis & masa','Dış mekân','Teknoloji aksesuarı','Çocuk','Evcil hayvan'];
// Cases are rows of the vakalar table (opened from yonetim/); Store.cases() fills this array in place.
// Vaka 01 keeps its hand-made page and its translated text; every other case lives at vaka/?id=<id>.
const CASES = [];
const V01 = { id:'vaka-01', name:T('ud.vaka1.ad'), tag:T('ud.vaka1.etiket'), short:'Vaka 01 · Cıvata', href:'vaka-01/', durum:'acik', adet:1e6 };
function caseOf(v){
  if (v.id === V01.id) return { ...V01, durum:v.durum };
  return { id:v.id, name:v.baslik, tag:v.olcu || v.stok || '', short:String(v.baslik).slice(0, 40), href:'vaka/?id=' + encodeURIComponent(v.id),
    durum:v.durum, ozet:v.ozet || '', adet:Number(v.adet) || 0, olcu:v.olcu || '', sinif:v.sinif || '' };
}
const openCases = () => CASES.filter(c => c.durum === 'acik');
// an idea belongs to a case by its vaka_id; older ideas only carry the case's label as their category
const inCase = (i, c) => i.caseId ? i.caseId === c.id : i.cat === c.short;
// categories and case names are stored in Turkish (they are data); only what is shown is translated
const catName = c => { const v = METIN.al('ud.kat.' + c); return v == null ? c : v; };
const CRIT = [['d',T('ud.olcut.d')],['m',T('ud.olcut.m')],['u',T('ud.olcut.u')]];
const EXAMPLES = [
  { key:'ex:1', ex:true, title:T('ud.ornek.1.baslik'), cat:'Mutfak', problem:T('ud.ornek.1.problem'), solution:T('ud.ornek.1.cozum'), feats:[T('ud.ornek.1.oz1'),T('ud.ornek.1.oz2')], at:null },
  { key:'ex:2', ex:true, title:T('ud.ornek.2.baslik'), cat:'Vaka 01 · Cıvata', problem:T('ud.ornek.2.problem'), solution:T('ud.ornek.2.cozum'), feats:[T('ud.ornek.2.oz1'),T('ud.ornek.2.oz2')], at:null },
  { key:'ex:3', ex:true, title:T('ud.ornek.3.baslik'), cat:'Evcil hayvan', problem:T('ud.ornek.3.problem'), solution:T('ud.ornek.3.cozum'), feats:[T('ud.ornek.3.oz1'),T('ud.ornek.3.oz2')], at:null }
];

// =========================================================== helpers
const DAY = 864e5;
const fmtDate = d => d.toLocaleDateString(LOCALE, { day:'numeric', month:'long' });
const fmtDay = d => d.toLocaleDateString(LOCALE, { weekday:'long', day:'numeric', month:'long' });
function nextLive(now = new Date()){
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TERMS.liveHourUtc));
  let add = (TERMS.liveDay - t.getUTCDay() + 7) % 7;
  if (add === 0 && t <= now) add = 7;
  t.setUTCDate(t.getUTCDate() + add);
  return t;
}
// the stream is on from the start time for TERMS.liveMinutes; nextLive() already points at next week by then
const liveNow = (now = new Date()) => now - (nextLive(now) - 7*DAY) < TERMS.liveMinutes * 6e4;
function daysLeft(at){
  if (!at) return null;
  const end = new Date(at).getTime() + TERMS.voteDays*DAY;
  return Math.max(0, Math.ceil((end - Date.now())/DAY));
}
const homeHref = () => ROOT || './';
// stil.js (loaded in <head>) owns the ?stil= choice; without it every page is the default look
const STIL = window.UD_STIL || { list:{}, current:'oyuncu', withStil: h => h };
const withStil = h => STIL.withStil(h);

// =========================================================== nav + footer
// The legal pages (kvkk/, kosullar/) stay unlinked drafts until ayar.js sets yasal: true.
const YASAL = !!(window.UD_AYAR || {}).yasal;
const kvkkLink = () => YASAL ? ` <a class="link" href="${ROOT}kvkk/" target="_blank" rel="noopener">${T('ud.kvkk.oku')}</a>` : '';
// TR / EN switch in the bar: a link to the same page in the other language (keeps style and edit mode)
function langSwitch(extra=''){
  return `<span class="lang${extra}" role="group" aria-label="${T('ud.menu.dil')}">${Object.keys(STIL.langs || { tr:1 }).map(l =>
    `<a data-stil-link lang="${l}" hreflang="${l}" href="${STIL.withLang ? STIL.withLang(location.pathname + location.hash, l) : '#'}"${l === LANG ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('')}</span>`;
}
function mountChrome(){
  const cur = html.dataset.page || '';
  const links = [['fikirler',T('ud.menu.fikirler'),'fikirler/'],['nasil',T('ud.menu.nasil'),'nasil/'],['vakalar',T('ud.menu.vakalar'),'vakalar/'],['hikaye',T('ud.menu.hikaye'),'hikaye/']];
  const host = $('[data-ud-nav]');
  if (host){
    host.className = 'nav'; host.id = 'nav';
    host.innerHTML = `<div class="wrap"><a class="brand" lang="en" href="${homeHref()}" aria-label="${T('ud.menu.anasayfa')}"><b>Undust<i>it</i></b></a>
      <div class="nav-r"><nav class="nav-links" id="nav-links" aria-label="${T('ud.menu.ana')}">${links.map(([k,l,h])=>`<a href="${ROOT+h}"${k===cur?' aria-current="page"':''}>${l}</a>`).join('')}${langSwitch(' lang-m')}</nav>
      <a class="btn sig sm" href="${ROOT}fikir/">${T('ud.menu.yaz')}</a><a class="ben" href="${ROOT}benim/" aria-label="${T('ud.menu.benim')}" title="${T('ud.menu.benim')}"${cur === 'benim' ? ' aria-current="page"' : ''}>${ICON.ben}</a>${langSwitch()}
      <button type="button" class="menu-t" aria-expanded="false" aria-controls="nav-links" aria-label="${T('ud.menu.menu')}"><svg class="i-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg><svg class="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div></div>`;
    const btn = $('.menu-t', host);
    const set = o => { host.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); };
    btn.onclick = () => set(!host.classList.contains('open'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && host.classList.contains('open')){ set(false); btn.focus(); } });
  }
  const foot = $('[data-ud-foot]');
  const showStilBar = STIL.edit || cur === 'stiller' || /[?&]stil=/.test(location.search);
  if (foot){
    foot.className = 'foot';
    foot.innerHTML = `<div class="wrap foot-sig" aria-hidden="true">Undust<i>it</i></div><div class="wrap"><span>${T('ud.alt.prototip')} <span class="mode-badge" id="mode-badge"><i></i>${T('ud.alt.baglaniyor')}</span></span>
      <nav aria-label="${T('ud.alt.menu')}"><a href="${ROOT}fikir/">${T('ud.menu.yaz')}</a>${links.map(([k,l,h]) => `<a href="${ROOT+h}">${l}</a>`).join('')}<a href="${ROOT}iletisim/">${T('ud.menu.iletisim')}</a>${YASAL ? `<a href="${ROOT}kvkk/">${T('ud.menu.kvkk')}</a><a href="${ROOT}kosullar/">${T('ud.menu.kosullar')}</a>` : ''}</nav></div>
      ${showStilBar ? `<div class="wrap stil-bar"><span>${T('ud.alt.stil')}</span>${Object.entries(STIL.list).map(([k,l]) => `<a data-stil-link href="${STIL.withStil(location.pathname, k)}"${k === STIL.current ? ' aria-current="true"' : ''}>${T('ud.stil.' + k)}</a>`).join('')}<a href="${ROOT}stiller/">${T('ud.alt.hepsi')}</a></div>` : ''}`;
  }
}

// =========================================================== store
// One Supabase client per page, shared with veri.js (window.UD_SB), so the visitor and the admin
// panel never run two auth sessions side by side. The library loads on first use only.
function sbClient(){
  const A = window.UD_AYAR || {};
  if (!sbClient.p) sbClient.p = (window.supabase && window.supabase.createClient ? Promise.resolve(window.supabase) : new Promise((ok, no) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    sc.onload = () => window.supabase && window.supabase.createClient ? ok(window.supabase) : no(new Error('Veri servisi yüklenemedi'));
    sc.onerror = () => no(new Error('Veri servisi yüklenemedi'));
    document.head.append(sc);
  })).then(lib => lib.createClient(A.supabaseUrl, A.supabaseAnon));
  return sbClient.p;
}
window.UD_SB = sbClient;
// Live on claude.ai (db capability): ideas/<uid>, votes/<uid>, notes/<uid>, each person writes their own doc.
// A vote is purchase intent, not a like: votes/<uid>.buy maps an idea to the price that person would pay.
// Anywhere else it keeps the same shape in localStorage so the pages can be tried as a preview.
const Store = (function(){
  const subs = new Set();
  const S = { mode:'local', uid:'local', canWrite:true, ideas:{}, votes:{}, notes:{} };
  let db = null, chain = Promise.resolve();
  const emit = () => subs.forEach(f => f());
  const LS = 'ud-store-v1';
  function loadLocal(){
    let d = {}; try { d = JSON.parse(localStorage.getItem(LS) || '{}'); } catch(e){}
    S.ideas = d.ideas || {}; S.votes = d.votes || {}; S.notes = d.notes || {};
  }
  function saveLocal(){ try { localStorage.setItem(LS, JSON.stringify({ ideas:S.ideas, votes:S.votes, notes:S.notes })); } catch(e){} }
  loadLocal();
  window.addEventListener('storage', e => { if (e.key === LS && S.mode === 'local'){ loadLocal(); emit(); } });

  function write(col, value){
    S[col][S.uid] = value;
    if (S.mode === 'local'){ saveLocal(); emit(); return Promise.resolve(); }
    emit();
    return (chain = chain.then(() => db.doc(col + '/' + S.uid).set(value)));
  }
  const badge = () => {
    const b = $('#mode-badge'); if (!b) return;
    b.classList.toggle('live', S.mode !== 'local');
    b.lastChild.textContent = S.mode !== 'local' ? T('ud.alt.canli') : T('ud.alt.onizleme');
  };
  // ---- Supabase (assets/ayar.js has a URL): ideas, demand, scores and comments are rows in Postgres,
  // shared by everyone. Visitors read without an account; their first write signs the browser in
  // anonymously, so each browser is one person and RLS lets it change only its own rows. The rows are
  // poured into the same shape as the other modes, so ideas() and every view stay as they are.
  const AYAR = window.UD_AYAR || {};
  let sb = null;
  const idOf = key => key.slice(key.lastIndexOf(':') + 1);
  if (AYAR.supabaseUrl) S.mode = 'supabase';
  // With migration 4 (supabase/4-acilis.sql) a page reads one summary row per idea (fikir_kart: buyers,
  // average price, scores, comment count) plus only this person's own prices and scores; comments load
  // when an idea is opened. Without the view it falls back to reading every row of the four tables.
  let summary = true;
  const NEWEST = 1000;   // demand runs 30 days, so the newest thousand ideas is months of headroom
  const num = v => Number(v) || 0;
  async function sbLoad(){
    if (summary){
      const k = await sb.from('fikir_kart').select('*').order('zaman', { ascending:false }).limit(NEWEST);
      if (k.error){ summary = false; return sbLoad(); }
      const me = S.uid !== 'anon' ? S.uid : null;
      const [t, p] = me ? await Promise.all([sb.from('talepler').select('fikir_id,fiyat').eq('uye', me), sb.from('puanlar').select('fikir_id,olcut,puan').eq('uye', me)]) : [{}, {}];
      const keyOf = {}, ideas = {}, mine = { buy:{}, rate:{} };
      k.data.forEach(r => { keyOf[r.id] = r.sahip + ':' + r.id;
        (ideas[r.sahip] = ideas[r.sahip] || { items:[] }).items.push({ k:r.id, caseId:r.vaka_id, title:r.baslik, cat:r.kategori, problem:r.problem, solution:r.cozum, feats:r.ozellikler, handle:r.ad, at:r.zaman,
          agg:{ buyers:num(r.alici), avg:num(r.ort_fiyat), raters:num(r.puanci), crit:{ d:num(r.puan_d), m:num(r.puan_m), u:num(r.puan_u) }, notes:num(r.yorum) } }); });
      (t.data || []).forEach(r => { if (keyOf[r.fikir_id]) mine.buy[keyOf[r.fikir_id]] = r.fiyat; });
      (p.data || []).forEach(r => { const x = keyOf[r.fikir_id]; if (x) mine.rate[x] = { ...(mine.rate[x] || {}), [r.olcut]: r.puan }; });
      S.ideas = ideas; S.votes = me ? { [me]: mine } : {}; emit();
      return;
    }
    const res = await Promise.all(['fikirler', 'talepler', 'puanlar', 'yorumlar'].map(t => sb.from(t).select('*').limit(5000)));
    const bad = res.find(r => r.error); if (bad) throw bad.error;
    const [f, t, p, y] = res.map(r => r.data || []);
    const keyOf = {}, ideas = {}, votes = {}, notes = {};
    const vote = u => (votes[u] = votes[u] || { buy:{}, rate:{} });
    f.forEach(r => { keyOf[r.id] = r.sahip + ':' + r.id;
      (ideas[r.sahip] = ideas[r.sahip] || { items:[] }).items.push({ k:r.id, caseId:r.vaka_id, title:r.baslik, cat:r.kategori, problem:r.problem, solution:r.cozum, feats:r.ozellikler, handle:r.ad, at:r.zaman }); });
    t.forEach(r => { if (keyOf[r.fikir_id]) vote(r.uye).buy[keyOf[r.fikir_id]] = r.fiyat; });
    p.forEach(r => { const k = keyOf[r.fikir_id]; if (k) { const v = vote(r.uye); v.rate[k] = { ...(v.rate[k] || {}), [r.olcut]: r.puan }; } });
    y.forEach(r => { if (keyOf[r.fikir_id]) (notes[r.uye] = notes[r.uye] || { items:[] }).items.push({ k:r.id, idea:keyOf[r.fikir_id], kind:r.tur, text:r.metin, handle:r.ad, at:r.zaman }); });
    S.ideas = ideas; S.votes = votes; S.notes = notes; emit();
  }
  const sbReload = () => sbLoad().catch(() => {});
  // an idea's comments, read when its window opens (summary mode keeps only their count in the list)
  const noteCache = {};
  async function sbNotes(key){
    const r = await sb.from('yorumlar').select('id,tur,metin,ad,zaman,uye').eq('fikir_id', idOf(key)).order('zaman', { ascending:true }).limit(500);
    if (r.error) return;
    noteCache[key] = r.data.map(n => ({ k:n.id, idea:key, kind:n.tur, text:n.metin, handle:n.ad, at:n.zaman, owner:n.uye }));
    emit();
  }
  async function sbUser(){
    const { data } = await sb.auth.getSession();
    if (data && data.session) return (S.uid = data.session.user.id);
    const r = await sb.auth.signInAnonymously();
    if (r.error) throw r.error;
    return (S.uid = r.data.user.id);
  }
  // every write: make sure we are someone, do it, then read back what the database now says
  const sbDo = async fn => { await start(); await sbUser(); const r = await fn(); if (r && r.error) { sbReload(); throw r.error; } await sbLoad(); return r; };

  // Nothing is fetched until a page shows data (its first sub() or cases()), so the reading pages stay light.
  let ready = null;
  const start = () => ready || (ready = (async () => {
    if (AYAR.supabaseUrl){
      sb = await sbClient();
      S.ideas = {}; S.votes = {}; S.notes = {};
      const { data } = await sb.auth.getSession();
      S.uid = data && data.session ? data.session.user.id : 'anon';
      await sbLoad();
      // signing in elsewhere, out, or back from an e-mail link changes who "I" am: read my rows again
      sb.auth.onAuthStateChange((ev, session) => {
        const id = session ? session.user.id : 'anon';
        if (id !== S.uid){ S.uid = id; sbReload(); } else emit();
      });
      // others' demand and comments arrive on a slow tick and whenever the tab comes back
      setInterval(() => { if (document.visibilityState === 'visible') sbReload(); }, 30000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sbReload(); });
      return;
    }
    if (!(window.claude && window.claude.use)) return;
    const [d, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const id = user ? await user.id() : null;
    if (!d || !id) return;
    db = d; S.mode = 'live'; S.uid = id; S.ideas = {}; S.votes = {}; S.notes = {};
    const w = user.can ? await user.can('data.write') : null;
    if (w === false) S.canWrite = false;
    ['ideas','votes','notes'].forEach(col => {
      db.collection(col).onSnapshot(snap => {
        const next = {}; snap.docs.forEach(x => { next[x.id] = x.data() || {}; });
        S[col] = next; emit();
      }, () => {});
    });
    emit();
  })().catch(() => {}).finally(badge));
  document.addEventListener('DOMContentLoaded', badge);

  // Open and past cases (drafts never). Without the database: the admin panel's local copy, else Vaka 01.
  let casesP = null;
  async function loadCases(){
    let rows = null;
    if (AYAR.supabaseUrl){
      const c = await sbClient();
      const r = await c.from('vakalar').select('id,baslik,ozet,stok,adet,olcu,sinif,durum,olusturma').neq('durum', 'taslak').order('olusturma', { ascending:false });
      if (!r.error) rows = r.data;
    } else if (!(window.claude && window.claude.use)){
      try { const d = JSON.parse(localStorage.getItem('udv-v1') || 'null'); if (d && d.vakalar) rows = Object.values(d.vakalar).filter(v => v.durum !== 'taslak').sort((a,b) => String(b.olusturma).localeCompare(String(a.olusturma))); } catch(e){}
    }
    CASES.splice(0, CASES.length, ...(rows && rows.length ? rows.map(caseOf) : [V01]));
    emit();
    return CASES;
  }
  const cases = () => casesP || (casesP = loadCases().catch(() => { if (!CASES.length) CASES.push(V01); emit(); return CASES; }));

  // Everything below comes from other people's documents in live mode, so it is shaped before use:
  // strings are cut to the form's limits, a missing or future date never extends the 30 days.
  const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  const when = v => { const t = Date.parse(v); return isNaN(t) ? null : new Date(Math.min(t, Date.now())).toISOString(); };
  const KINDS = ['yorum','oneri','endise'];
  function clean(it, owner){
    return { k: str(String(it.k), 40), key: owner + ':' + str(String(it.k), 40), owner, caseId: str(it.caseId, 80), title: str(it.title, 140), cat: str(it.cat, 40),
      problem: str(it.problem, 400), solution: str(it.solution, 400), handle: str(it.handle, 30),
      feats: (Array.isArray(it.feats) ? it.feats : []).slice(0, 3).map(x => str(x, 80)).filter(Boolean), at: when(it.at), agg: it.agg || null };
  }
  function ideas(){
    const out = [];
    for (const [owner, doc] of Object.entries(S.ideas)){
      (Array.isArray(doc.items) ? doc.items : []).forEach(it => {
        if (it && typeof it.title === 'string' && it.k) out.push(clean(it, owner));
      });
    }
    const buy = {}, rates = {};
    for (const [voter, v] of Object.entries(S.votes)){
      Object.entries((v && v.buy) || {}).forEach(([k, p]) => { const n = Number(p); if (n > 0 && n <= TERMS.maxPrice) (buy[k] = buy[k] || {})[voter] = n; });
      Object.entries((v && v.rate) || {}).forEach(([k, r]) => { if (r && typeof r === 'object') (rates[k] = rates[k] || []).push(r); });
    }
    const notes = {};
    for (const [owner, doc] of Object.entries(S.notes)){
      (Array.isArray(doc.items) ? doc.items : []).forEach(n => { if (n && typeof n.idea === 'string' && typeof n.text === 'string') (notes[n.idea] = notes[n.idea] || []).push({ k: n.k, idea: n.idea, kind: KINDS.includes(n.kind) ? n.kind : 'yorum', text: str(n.text, 500), handle: str(n.handle, 30), at: when(n.at), owner }); });
    }
    out.forEach(i => {
      const bs = Object.values(buy[i.key] || {});
      i.myPrice = (buy[i.key] || {})[S.uid] || 0;
      i.mine = i.myPrice > 0;
      i.left = daysLeft(i.at);
      // summary mode: the database counted everyone; the rows here are only this person's own
      if (i.agg){
        i.buyers = i.agg.buyers; i.avg = i.agg.avg; i.raters = i.agg.raters; i.crit = { ...i.agg.crit };
        i.notes = noteCache[i.key] || []; i.noteCount = Math.max(i.agg.notes, i.notes.length); i.notesLoaded = !!noteCache[i.key];
        return;
      }
      i.buyers = bs.length;
      i.avg = bs.length ? bs.reduce((a,b)=>a+b,0)/bs.length : 0;
      const rs = rates[i.key] || [];
      i.raters = rs.length;
      i.crit = {}; CRIT.forEach(([c]) => { const v = rs.map(r => Number(r[c])).filter(n => n >= 1 && n <= 5); i.crit[c] = v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; });
      i.notes = (notes[i.key] || []).sort((a,b) => String(a.at).localeCompare(String(b.at)));
      i.noteCount = i.notes.length; i.notesLoaded = true;
    });
    return out;
  }
  const myItems = col => ((S[col][S.uid] || {}).items || []).slice();
  const myVotes = () => { const v = S.votes[S.uid] || {}; return { buy: { ...(v.buy || {}) }, rate: { ...(v.rate || {}) } }; };
  const key = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  return {
    get mode(){ return S.mode; }, get canWrite(){ return S.canWrite; }, get uid(){ return S.uid; },
    get ready(){ return start(); }, ideas, cases,
    sub(fn){ start(); subs.add(fn); fn(); return () => subs.delete(fn); },
    myCount(){ return myItems('ideas').length; },
    addIdea(data){
      if (S.mode === 'supabase'){
        return sbDo(() => sb.from('fikirler').insert({ sahip:S.uid, vaka_id: data.caseId || null, baslik:data.title, kategori:data.cat, problem:data.problem,
          cozum:data.solution, ozellikler:data.feats, ad:data.handle || '' }).select('id').single()).then(r => S.uid + ':' + r.data.id);
      }
      const it = { k:key(), ...data, at:new Date().toISOString() };
      return write('ideas', { items: myItems('ideas').concat([it]).slice(-40) }).then(() => S.uid + ':' + it.k);
    },
    removeIdea(key){
      if (S.mode === 'supabase') return sbDo(() => sb.from('fikirler').delete().eq('id', idOf(key)));
      const k = key.slice(key.lastIndexOf(':') + 1);
      return write('ideas', { items: myItems('ideas').filter(it => it.k !== k) });
    },
    setBuy(k, price){
      if (S.mode === 'supabase'){
        if (S.uid !== 'anon'){ const v = myVotes(); if (price) v.buy[k] = price; else delete v.buy[k]; S.votes[S.uid] = v; emit(); }
        return sbDo(() => price ? sb.from('talepler').upsert({ fikir_id:idOf(k), uye:S.uid, fiyat:price }, { onConflict:'fikir_id,uye' })
          : sb.from('talepler').delete().eq('fikir_id', idOf(k)).eq('uye', S.uid));
      }
      const v = myVotes(); if (price) v.buy[k] = price; else delete v.buy[k]; return write('votes', v); },
    rate(k, c, n){
      if (S.mode === 'supabase') return sbDo(() => sb.from('puanlar').upsert({ fikir_id:idOf(k), uye:S.uid, olcut:c, puan:n }, { onConflict:'fikir_id,uye,olcut' }));
      const v = myVotes(); v.rate[k] = { ...(v.rate[k] || {}), [c]: n }; return write('votes', v); },
    myRate(k){ return ((S.votes[S.uid] || {}).rate || {})[k] || {}; },
    // "Haber ver": an e-mail to reach this person later about one idea (tur 'fikrim' or 'alirdim').
    // The address is private: RLS lets a person read only their own rows (supabase/4-acilis.sql).
    async haberVer(eposta, key, tur){
      if (S.mode === 'supabase'){
        await start(); await sbUser();
        const r = await sb.from('haber_istekleri').upsert({ uye:S.uid, eposta, fikir_id:idOf(key), tur }, { onConflict:'uye,fikir_id,tur' });
        if (r.error) throw r.error;
        return;
      }
      let d = []; try { d = JSON.parse(localStorage.getItem('ud-haber') || '[]') || []; } catch(e){}
      d = d.filter(x => !(x.key === key && x.tur === tur)).concat([{ eposta, key, tur, at:new Date().toISOString() }]);
      try { localStorage.setItem('ud-haber', JSON.stringify(d)); } catch(e){}
    },
    // ---- account. Visitors stay anonymous until they choose otherwise. Linking an e-mail turns the
    // anonymous user into a permanent one with the same id (Supabase), so every idea, price and comment
    // stays theirs; on another device the same e-mail signs in with a link. Returns null in preview mode.
    async hesap(){
      if (S.mode !== 'supabase') return null;
      await start();
      const { data } = await sb.auth.getUser();
      const u = data && data.user;
      return { var: !!u, anonim: !u || !!u.is_anonymous, eposta: (u && u.email) || '', bekleyen: (u && u.new_email) || '' };
    },
    async epostaBagla(eposta, donus){
      await start();
      const { data } = await sb.auth.getSession();
      const u = data && data.session && data.session.user;
      const r = u && u.is_anonymous
        ? await sb.auth.updateUser({ email:eposta }, { emailRedirectTo:donus })
        : await sb.auth.signInWithOtp({ email:eposta, options:{ emailRedirectTo:donus } });
      if (r.error) throw r.error;
    },
    async girisBaglantisi(eposta, donus){
      await start();
      const r = await sb.auth.signInWithOtp({ email:eposta, options:{ shouldCreateUser:false, emailRedirectTo:donus } });
      if (r.error) throw r.error;
    },
    async cikis(){ await start(); await sb.auth.signOut(); },
    // this person's "haber ver" requests, to see and cancel them
    async haberlerim(){
      if (S.mode === 'supabase'){
        await start();
        if (S.uid === 'anon') return [];
        const r = await sb.from('haber_istekleri').select('id,eposta,fikir_id,tur,gonderildi').eq('uye', S.uid);
        if (r.error) return [];
        return r.data.map(h => ({ id:h.id, eposta:h.eposta, tur:h.tur, gonderildi:h.gonderildi, idea:(ideas().find(i => idOf(i.key) === h.fikir_id) || {}).key }));
      }
      let d = []; try { d = JSON.parse(localStorage.getItem('ud-haber') || '[]') || []; } catch(e){}
      return d.map((h, ix) => ({ id:String(ix), eposta:h.eposta, tur:h.tur, idea:h.key }));
    },
    async haberIptal(h){
      if (S.mode === 'supabase'){ await start(); const r = await sb.from('haber_istekleri').delete().eq('id', h.id); if (r.error) throw r.error; return; }
      let d = []; try { d = JSON.parse(localStorage.getItem('ud-haber') || '[]') || []; } catch(e){}
      d = d.filter(x => !(x.key === h.idea && x.tur === h.tur));
      try { localStorage.setItem('ud-haber', JSON.stringify(d)); } catch(e){}
    },
    // A row only admins read back: "Vakanı aç" applications, contact messages, idea reports
    // (vaka_basvurulari, iletisim_mesajlari, fikir_bildirimleri). The local preview keeps them under
    // udv-<table>, where the admin panel's local store (veri.js) reads them.
    async kaydet(tablo, data){
      if (S.mode === 'supabase'){
        await start(); await sbUser();
        const r = await sb.from(tablo).insert(data);
        if (r.error) throw r.error;
        return;
      }
      let d = {}; try { d = JSON.parse(localStorage.getItem('udv-' + tablo) || '{}') || {}; } catch(e){}
      const id = key(); d[id] = { id, ...data, durum: tablo === 'fikir_bildirimleri' ? 'acik' : 'yeni', zaman:new Date().toISOString() };
      try { localStorage.setItem('udv-' + tablo, JSON.stringify(d)); } catch(e){}
    },
    basvur(data){ return this.kaydet('vaka_basvurulari', data); },
    // the database wants the idea's own id; the local preview keeps the full key (that is what it hides)
    bildir(key, neden, aciklama){ return this.kaydet('fikir_bildirimleri', { fikir_id: S.mode === 'supabase' ? idOf(key) : key, neden, aciklama }); },
    loadNotes(key){ if (S.mode === 'supabase' && summary) start().then(() => sbNotes(key)).catch(() => {}); },
    addNote(idea, kind, text, handle){
      if (S.mode === 'supabase') return sbDo(() => sb.from('yorumlar').insert({ fikir_id:idOf(idea), uye:S.uid, tur:kind, metin:text, ad:handle || '' })).then(r => { if (summary) sbNotes(idea); return r; });
      return write('notes', { items: myItems('notes').concat([{ k:key(), idea, kind, text, handle, at:new Date().toISOString() }]).slice(-200) });
    }
  };
})();

// =========================================================== Thursday countdown
function mountThu(node){
  const tick = () => {
    const t = nextLive(), ms = t - Date.now();
    const d = Math.floor(ms/DAY), h = Math.floor(ms%DAY/36e5), m = Math.floor(ms%36e5/6e4);
    node.classList.toggle('on', liveNow());
    node.innerHTML = liveNow() ? `<i class="dot" aria-hidden="true"></i><b>${T('ud.persembe.simdi')}</b>`
      : `<i class="dot" aria-hidden="true"></i><span>${T('ud.persembe.canli')}</span><b>${d ? d + T('ud.persembe.g') + ' ' : ''}${h}${T('ud.persembe.s')} ${String(m).padStart(2,'0')}${T('ud.persembe.dk')}</b>`;
    node.setAttribute('title', fmtDay(t) + T('ud.persembe.saat'));
  };
  tick(); setInterval(tick, 30000);
}

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

// =========================================================== share
// An idea needs buyers, so its link is one tap away: the phone's share sheet, else the clipboard.
function shareIdea(title, key, btn){
  const url = new URL(withStil(ROOT + 'fikirler/?f=' + encodeURIComponent(key)), location.href).href;
  if (navigator.share) return navigator.share({ title, text:T('ud.paylas.metin', { baslik:title }), url }).catch(() => {});
  const back = btn.innerHTML;
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
    .then(() => { btn.textContent = T('ud.paylas.kopyalandi'); }, () => { btn.textContent = url; })
    .then(() => setTimeout(() => { btn.innerHTML = back; }, 1800));
}

// =========================================================== "haber ver"
// Optional and one field: the address is remembered on this browser so the next one is a single tap.
const mailGet = () => { try { return localStorage.getItem('ud-eposta') || ''; } catch(e){ return ''; } };
const mailSet = v => { try { localStorage.setItem('ud-eposta', v); } catch(e){} };
function haberForm(key, tur){
  const f = el('form', { class:'haber', novalidate:true, 'aria-label':T('ud.haber.' + tur) });
  const p = el('p', { text:T('ud.haber.' + tur) });
  const inp = el('input', { type:'email', autocomplete:'email', maxlength:'160', placeholder:T('ud.haber.ipucu'), 'aria-label':T('ud.haber.eposta'), value:mailGet() });
  const ok = el('button', { type:'submit', class:'btn alt sm', text:T('ud.haber.gonder') });
  const durum = el('small', { class:'haber-d', role:'status' });
  f.append(p, el('div', { class:'haber-r' }, [inp, ok]), durum);
  f.onsubmit = e => {
    e.preventDefault();
    const v = inp.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ inp.setAttribute('aria-invalid', 'true'); durum.textContent = T('ud.haber.hata.eposta'); inp.focus(); return; }
    ok.disabled = true; inp.removeAttribute('aria-invalid');
    Store.haberVer(v, key, tur).then(() => {
      mailSet(v); olcu('Haber ver', { tur });
      f.replaceChildren(el('p', { class:'haber-tamam', text:T('ud.haber.tamam', { eposta:v }) }));
    }).catch(() => { ok.disabled = false; durum.textContent = T('ud.haber.hata.genel'); });
  };
  return f;
}

// =========================================================== idea form
const handleGet = () => { try { return localStorage.getItem('ud-handle') || ''; } catch(e){ return ''; } };
const handleSet = v => { try { localStorage.setItem('ud-handle', v); } catch(e){} };
function feeLine(){
  const f = TERMS.fee, n = Store.myCount();
  const now = tl(n ? f.next : f.first);
  return T('ud.form.ucret', { ilk:tl(f.first), sonra:tl(f.next), bu:now }) + (f.charged ? '' : ' ' + T('ud.form.odemeyok'));
}
function mountForm(host, opts={}){
  const id ='f' + Math.random().toString(36).slice(2,7);
  host.innerHTML = `
  <form class="iform" novalidate aria-label="${T('ud.form.aria')}">
    <div class="if-top">
      <label for="${id}-p"><span class="eyebrow k">${opts.label || T('ud.form.etiket')}</span><span class="if-count" aria-live="polite">0 / 140</span></label>
      <textarea id="${id}-p" class="if-pitch" rows="1" maxlength="160" placeholder="${opts.placeholder || T('ud.form.ipucu')}" required></textarea>
      <button type="button" class="btn sig if-next" aria-controls="${id}-more" aria-expanded="false">${T('ud.form.devam')} ${ICON.arrow}</button>
    </div>
    <div class="if-more" id="${id}-more"><div><div class="if-body">
      <div class="if-field" role="group" aria-labelledby="${id}-cl"><span id="${id}-cl">${T('ud.form.kategori')}</span><div class="chips if-cats"></div></div>
      <details class="if-detay"><summary>${T('ud.form.detay')} <small>${T('ud.form.detay.not')}</small></summary><div class="if-detay-in">
      <div class="if-two">
        <label class="if-field"><span>${T('ud.form.problem')} <small>${T('ud.form.kisa')}</small></span><textarea name="problem" maxlength="400" placeholder="${T('ud.form.problem.ipucu')}"></textarea></label>
        <label class="if-field"><span>${T('ud.form.cozum')} <small>${T('ud.form.kisa')}</small></span><textarea name="solution" maxlength="400" placeholder="${T('ud.form.cozum.ipucu')}"></textarea></label>
      </div>
      <div class="if-field" role="group" aria-labelledby="${id}-fl"><span id="${id}-fl">${T('ud.form.ozellik')} <small>${T('ud.form.ozellik.not')}</small></span>
        <div class="feats"><input name="f1" maxlength="80" placeholder="${T('ud.form.oz1')}" aria-label="${T('ud.form.oz1')}"><input name="f2" maxlength="80" placeholder="${T('ud.form.oz2')}" aria-label="${T('ud.form.oz2.aria')}"><input name="f3" maxlength="80" placeholder="${T('ud.form.oz3')}" aria-label="${T('ud.form.oz3.aria')}"></div></div>
      </div></details>
      <label class="if-field" style="max-width:320px"><span>${T('ud.form.ad')} <small>${T('ud.form.istege')}</small></span><input name="handle" maxlength="30" autocomplete="nickname" placeholder="${T('ud.form.ad.ipucu')}"></label>
      <div class="if-foot"><p class="if-fee"></p><button type="submit" class="btn sig">${T('ud.form.gonder')} ${ICON.arrow}</button></div>
      <p class="if-status" role="status" aria-live="polite"></p>
    </div></div></div>
    <div class="if-done" tabindex="-1"></div>
  </form>`;
  const f = $('form', host), pitch = $('.if-pitch', f), count = $('.if-count', f), next = $('.if-next', f), status = $('.if-status', f);
  let cat = '';
  const cats = $('.if-cats', f);
  const pick = c => { cat = c; $$('.chip', cats).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === c))); };
  // open cases arrive from the database; the chips are drawn again then, keeping what was picked
  const paintCats = () => {
    cats.replaceChildren();
    openCases().map(c => [c.short, true]).concat(CATS.map(c => [c, false])).forEach(([c, isCase]) =>
      cats.append(el('button', { type:'button', class:'chip' + (isCase ? ' case' : ''), 'aria-pressed': String(c === cat), 'data-cat':c, text:catName(c), onclick(){ pick(c); } })));
  };
  paintCats();
  Store.cases().then(() => {
    const pre = opts.caseId && openCases().find(c => c.id === opts.caseId);
    if (pre && !cat) cat = pre.short;
    paintCats();
  });
  f.handle.value = handleGet();
  const paintFee = () => { $('.if-fee', f).innerHTML = feeLine(); };
  Store.sub(paintFee);
  const open = () => { f.classList.add('open'); next.setAttribute('aria-expanded','true'); };
  const len = () => {
    const n = pitch.value.trim().length;
    count.textContent = n + ' / 140';
    count.classList.toggle('near', n > 120 && n <= 140); count.classList.toggle('over', n > 140);
  };
  pitch.addEventListener('input', () => { len(); if (pitch.value.trim().length >= 3 && opts.autoOpen !== false) open(); });
  // only the sentence and a category are needed: with a category already picked (a case page), Enter sends
  const toCat = () => ($('.chip[aria-pressed="true"]', cats) || $('.chip', cats)).focus();
  pitch.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); open(); if (cat && pitch.value.trim().length >= 10) f.requestSubmit(); else toCat(); } });
  next.onclick = () => { open(); if (pitch.value.trim().length < 10) pitch.focus(); else toCat(); };
  if (opts.open) open();
  const say = (t, bad) => { status.textContent = t; status.classList.toggle('bad', !!bad); };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const title = pitch.value.trim(), feats = [f.f1, f.f2, f.f3].map(x => x.value.trim()).filter(Boolean);
    const fail = (msg, node) => { say(msg, true); open(); node && node.focus(); };
    if (title.length < 10) return fail(T('ud.form.hata.kisa'), pitch);
    if (title.length > 140) return fail(T('ud.form.hata.uzun'), pitch);
    if (!cat) return fail(T('ud.form.hata.kategori'), $('.chip', cats));
    if (!Store.canWrite) return fail(T('ud.form.hata.izin'));
    const handle = f.handle.value.trim(); handleSet(handle);
    say(T('ud.form.gonderiliyor'));
    $('[type=submit]', f).disabled = true;
    const isCase = openCases().find(c => c.short === cat);
    Store.addIdea({ title, cat, caseId: isCase ? isCase.id : null, problem:f.problem.value.trim(), solution:f.solution.value.trim(), feats, handle }).then(k => {
      const end = new Date(Date.now() + TERMS.voteDays*DAY);
      const done = $('.if-done', f);
      done.innerHTML = `<span class="eyebrow k">${T('ud.gonderildi.etiket')}</span><h3>${esc(title)}</h3>
        <dl><div><dt>${T('ud.gonderildi.bitis')}</dt><dd>${fmtDate(end)}</dd></div><div><dt>${T('ud.gonderildi.ilk')}</dt><dd>${fmtDay(nextLive())}${T('ud.persembe.saat')}</dd></div><div><dt>${T('ud.gonderildi.olcut')}</dt><dd>${CRIT.map(c => c[1]).join(' · ')}</dd></div></dl>
        <p class="lead" style="font-size:15px">${T('ud.gonderildi.not')}</p>
        <div class="acts"><button type="button" class="btn sig share">${T('ud.paylas.bul')} ${ICON.arrow}</button><a class="btn alt" href="${ROOT}fikirler/?f=${encodeURIComponent(k)}">${T('ud.gonderildi.gor')}</a><button type="button" class="btn alt again">${T('ud.gonderildi.yeni')}</button></div>`;
      f.classList.add('done'); done.focus();
      const sh = $('.share', done); sh.onclick = () => { olcu('Paylaş', { yer:'gönderim' }); shareIdea(title, k, sh); };
      done.append(haberForm(k, 'fikrim'));
      olcu('Fikir gönderildi', { vaka: isCase ? isCase.id : 'yok' });
      $('.again', done).onclick = () => { f.reset(); $('.if-detay', f).open = false; f.handle.value = handleGet(); pitch.value = ''; len(); f.classList.remove('done'); $('[type=submit]', f).disabled = false; say(''); pitch.focus(); };
      opts.onSent && opts.onSent(k);
    }).catch(err => {
      $('[type=submit]', f).disabled = false;
      say(err && err.code === 'invalid_argument' ? T('ud.form.hata.izin2') : T('ud.form.hata.genel'), true);
    });
  });
  if (opts.focus) setTimeout(() => pitch.focus({ preventScroll:true }), 50);
  const useCase = id => {
    const c = openCases().find(x => x.id === id); if (!c) return;
    pick(c.short);
    open(); f.scrollIntoView({ block:'center', behavior: reduce.matches ? 'auto' : 'smooth' }); pitch.focus({ preventScroll:true });
  };
  return { focus: () => pitch.focus(), open, useCase };
}

// =========================================================== open case card
// The surplus-stock angle on the home pages: one open case, its numbers, and a one-tap way to write for it.
// The newest open case is shown; with none open the band stays hidden.
// Vaka 01 keeps its bolt drawing and text; other cases show their own numbers over a pallet of stock.
const BOLT = `<g class="cb-l"><path d="M24 52h26v46H24z"/><path d="M50 60h10v30H50z"/><path d="M60 66h150v18H60z"/>
      ${Array.from({length:12}, (_,k) => `<path class="th" d="M${120 + k*7.5} 66l4 18"/>`).join('')}
      <path d="M176 56h16v38h-16z"/><path d="M192 60h8v30h-8z"/></g>
      <path class="cb-c" d="M14 75H232" />
      <g class="cb-d"><path d="M60 108v12M210 108v12M60 116H210"/><text x="135" y="132" text-anchor="middle">l = 90</text><text x="226" y="70">M10</text></g>`;
const PALLET = `<g class="cb-l"><path d="M40 112h180v8H40z"/><path d="M48 120h14v8H48zM123 120h14v8h-14zM198 120h14v8h-14z"/>
      <path d="M50 72h74v40H50z"/><path d="M128 72h82v40h-82z"/><path d="M86 34h82v38H86z"/>
      <path class="th" d="M87 72v40M169 72v40M127 34v38M50 92h74M128 92h82"/></g>
      <path class="cb-c" d="M18 128H242"/>`;
function mountCase(host, opts={}){
  const box = host.closest('section') || host;
  box.hidden = true;
  Store.cases().then(() => {
    const c = openCases()[0];
    if (!c) return;
    const v01 = c.id === V01.id;
    box.hidden = false;
    host.classList.add('case-band');
    host.innerHTML = `
    <div class="cb-txt">
      <span class="cb-tag"><i aria-hidden="true"></i>${T('ud.vaka.acik')} · ${esc(c.tag)}</span>
      <h2 class="cb-h">${v01 ? T('ud.vaka.baslik') : esc(c.name)}</h2>
      ${v01 ? `<p>${T('ud.vaka.metin')}</p>` : c.ozet ? `<p>${esc(c.ozet)}</p>` : ''}
      <dl><div><dt>${T('ud.vaka.adet')}</dt><dd>${c.adet ? c.adet.toLocaleString(LOCALE) : '–'}</dd></div><div><dt>${T('ud.vaka.olcu')}</dt><dd>${v01 ? 'M10 × 90 · 8.8' : esc([c.olcu, c.sinif].filter(Boolean).join(' · ') || '–')}</dd></div><div><dt>${T('ud.vaka.gelen')}</dt><dd class="cb-n">0</dd></div></dl>
      <div class="cb-acts"><a class="btn sig" href="${ROOT}fikir/?vaka=${encodeURIComponent(c.id)}" data-case>${T('ud.vaka.yaz')} ${ICON.arrow}</a><a class="btn alt" href="${ROOT + c.href}">${T('ud.vaka.gor')}</a><a class="link" href="${ROOT}vakalar/">${T('ud.vaka.ac')}</a></div>
    </div>
    <figure class="cb-art" aria-hidden="true"><svg viewBox="0 0 260 150">${v01 ? BOLT : PALLET}</svg>${c.adet ? `<figcaption>× ${c.adet.toLocaleString(LOCALE)}</figcaption>` : ''}</figure>`;
    const a = $('[data-case]', host);
    if (opts.form) a.addEventListener('click', e => { e.preventDefault(); opts.form.useCase(c.id); });
    Store.sub(() => { $('.cb-n', host).textContent = String(Store.ideas().filter(i => inCase(i, c)).length); });
  });
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// =========================================================== live numbers
// Ideas, "alırdım", the money behind them and open cases, from the live data. Hidden below `min` real
// ideas, so a young site never advertises tiny numbers; the figures count up once when first shown.
function mountStats(host, opts={}){
  const min = opts.min || 5;
  const box = host.closest('section') || host;
  box.hidden = true;
  let shown = false;
  const paint = () => {
    const list = Store.ideas();
    if (list.length < min){ box.hidden = true; return; }
    const alici = list.reduce((t, i) => t + i.buyers, 0);
    const tutar = list.reduce((t, i) => t + i.buyers * i.avg, 0);
    const rows = [[list.length, T('ud.sayi.fikir'), String], [alici, T('ud.sayi.alirdim'), String], [tutar, T('ud.sayi.tutar'), tl], [openCases().length, T('ud.sayi.vaka'), String]];
    host.className = 'sayilar';
    host.innerHTML = rows.map(([n, l]) => `<div><b data-n="${Math.round(n)}">0</b><span>${l}</span></div>`).join('');
    const bs = $$('b', host);
    box.hidden = false;
    rows.forEach(([n, , fmt], ix) => {
      const to = Math.round(n), b = bs[ix];
      if (shown || reduce.matches){ b.textContent = fmt === tl ? tl(to) : to.toLocaleString(LOCALE); return; }
      const t0 = performance.now(), ms = 1100;
      const f = now => { const p = Math.min(1, (now - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - p, 3))); b.textContent = fmt === tl ? tl(v) : v.toLocaleString(LOCALE); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    shown = true;
  };
  Store.cases().then(() => Store.sub(paint));
}

// =========================================================== boards
function sortIdeas(list, by){
  const c = list.slice();
  if (by === 'new') c.sort((a,b) => String(b.at).localeCompare(String(a.at)));
  else c.sort((a,b) => b.buyers - a.buyers || b.avg - a.avg || String(b.at).localeCompare(String(a.at)));
  return c;
}
// How close an idea is to Thursday: the five open ideas with the most "alırdım" are the candidates
// (the home page's second round). Returns {aday:rank} for one of them, {eksik:n} for how many more
// "alırdım" it needs to pass the fifth, or null when demand is closed or it is an example.
function hedef(i, list = Store.ideas()){
  if (i.ex || !(i.left > 0)) return null;
  const top = sortIdeas(list.filter(x => x.left > 0 && x.buyers > 0), 'top').slice(0, 5);
  const ix = top.findIndex(x => x.key === i.key);
  if (ix > -1) return { aday: ix + 1 };
  return { eksik: top.length < 5 ? Math.max(1, 1 - i.buyers) : top[4].buyers - i.buyers + 1 };
}
const hedefMetni = h => !h ? '' : h.aday ? T('ud.hedef.aday', { n:h.aday }) : T('ud.hedef.eksik', { n:h.eksik });
// Turkish writes the percent sign first (%10), English after (10%)
const pct = v => LANG === 'en' ? v + '%' : '%' + v;
const tl = n => LANG === 'en' ? '₺' + Math.round(n).toLocaleString(LOCALE) : Math.round(n).toLocaleString(LOCALE) + ' ₺';
// "Alırdım": one tap opens a price field in place; saving it counts as purchase intent at that price.
// The card that was just saved gets .just once, so a style can celebrate it.
let justBought = null;
// rounded to steps people say out loud: 10s under 200, 50s under 1000, 100s above
const nice = n => { const st = n < 200 ? 10 : n < 1000 ? 50 : 100; return Math.max(st, Math.round(n / st) * st); };
function quickPrices(i){
  const base = i.buyers ? [.75, 1, 1.25].map(k => nice(i.avg * k)) : [150, 300, 500];
  return [...new Set(base)].filter(n => n <= TERMS.maxPrice);
}
function buyCtl(i){
  const box = el('div', { class:'buy' });
  const voting = i.left > 0;
  const paint = () => {
    box.replaceChildren();
    // the accessible name starts with the visible text ("3 alırdım") and adds the context after it
    const more = i.ex ? ' ' + T('ud.al.ornek') : i.mine ? ': ' + T('ud.al.benim', { baslik:esc(i.title), fiyat:tl(i.myPrice) }) : `: ${esc(i.title)}`;
    // an example looks like the real control; a tap says what it is instead of doing nothing
    const btn = el('button', { type:'button', class:'vote', 'aria-pressed': String(!!i.mine), disabled: !i.ex && (!voting || !Store.canWrite),
      html:`<b>${i.ex ? '–' : i.buyers}</b> <span>${T('ud.al.alirdim')}</span><span class="sr">${more}</span>` });
    btn.onclick = i.ex ? () => { if (!$('.buy-ex', box)) box.append(el('small', { class:'buy-ex', role:'status', text:T('ud.al.ornek.not') })); } : edit;
    box.append(btn);
    if (i.mine) box.append(el('small', { class:'buy-mine', text:T('ud.al.sen', { fiyat:tl(i.myPrice) }) }));
    if (justBought === i.key){ box.classList.add('just'); justBought = null; }
  };
  function edit(){
    box.replaceChildren();
    const f = el('form', { class:'buy-f', 'aria-label':T('ud.al.form') });
    const inp = el('input', { type:'text', inputmode:'decimal', placeholder:T('ud.al.ipucu'), 'aria-label':T('ud.al.aria'), value: i.myPrice ? String(i.myPrice) : '' });
    const ok = el('button', { type:'submit', class:'btn sig sm', text:T('ud.al.kaydet') });
    const no = el('button', { type:'button', class:'buy-x', 'aria-label': i.mine ? T('ud.al.geri.aria') : T('ud.al.vazgec'), text: i.mine ? T('ud.al.geri') : T('ud.al.vazgec') });
    no.onclick = () => { if (i.mine) Store.setBuy(i.key, 0).catch(()=>{}); else paint(); };
    f.onsubmit = e => {
      e.preventDefault();
      const n = Math.round(parseFloat(LANG === 'en' ? inp.value.replace(/,/g,'') : inp.value.replace(/\./g,'').replace(',', '.')));
      if (!(n > 0) || n > TERMS.maxPrice){ inp.focus(); inp.setAttribute('aria-invalid','true'); inp.placeholder = T('ud.al.fiyatyaz'); return; }
      justBought = i.key;
      olcu('Alırdım', { yol:'yazarak' });
      Store.setBuy(i.key, n).catch(()=>{});
    };
    f.append(inp, ok, no);
    // one tap: three prices around what others already said (or typical ones), typing stays possible
    const q = el('div', { class:'buy-q', role:'group', 'aria-label':T('ud.al.hizli') });
    quickPrices(i).forEach(n => q.append(el('button', { type:'button', class:'chip', text:tl(n), 'aria-pressed': String(n === i.myPrice),
      onclick(){ justBought = i.key; olcu('Alırdım', { yol:'hazır fiyat' }); Store.setBuy(i.key, n).catch(()=>{}); } })));
    box.append(q, f);
    // a price button gets the focus, so a phone does not open its keyboard unasked
    q.firstChild.focus();
  }
  paint();
  return box;
}
function card(i, ix, opts={}){
  const voting = i.left > 0;
  const meta = el('div', { class:'m' }, [
    el('span', { class:'c', text:catName(i.cat) }),
    i.ex ? el('span', { class:'ex', text:T('ud.kart.ornek') }) : el('span', { text: voting ? T('ud.kart.kaldi', { n:i.left }) : T('ud.kart.bitti') }),
    !i.ex && i.buyers ? el('span', { class:'p', text:T('ud.kart.ort', { fiyat:tl(i.avg) }) }) : null,
    !i.ex && i.noteCount ? el('span', { text: T('ud.kart.yorum', { n:i.noteCount }) }) : null,
    !i.ex && i.handle ? el('span', { text: i.handle }) : null
  ]);
  const href = i.ex ? null : `${ROOT}fikirler/?f=${encodeURIComponent(i.key)}`;
  const title = el('p', { class:'t' }, href ? el('a', { href, text:i.title, onclick(e){ if (opts.dialog){ e.preventDefault(); openIdea(i.key); } } }) : document.createTextNode(i.title));
  const body = el('div', { class:'body' }, [title, meta]);
  if (opts.hedef && hedef(i)){ const h = hedef(i); body.append(el('p', { class:'hedef' + (h.aday ? ' aday' : ''), text:hedefMetni(h) })); }
  if (!i.ex && i.at){ const bar = el('div', { class:'days', 'aria-hidden':'true' }, el('i')); bar.firstChild.style.width = (100 * (TERMS.voteDays - i.left) / TERMS.voteDays) + '%'; body.append(bar); }
  return el('article', { class:'icard' + (ix < 3 && !i.ex && i.buyers ? ' top' : '') }, [el('span', { class:'rank', 'aria-hidden':'true', text: opts.rank === false ? '' : String(ix+1) }), body, buyCtl(i)]);
}
function mountBoard(host, opts={}){
  const render = () => {
    let list = Store.ideas();
    if (opts.filter) list = list.filter(opts.filter);
    list = sortIdeas(list, opts.sort ? opts.sort() : 'top');
    if (opts.limit) list = list.slice(0, opts.limit);
    if (opts.onCount) opts.onCount(list.length);
    host.replaceChildren();
    const box = el('div', { class:'ideas' });
    if (!list.length && opts.examples === false){
      host.append(el('div', { class:'empty' }, [el('b', { text: opts.emptyTitle || T('ud.liste.bos') }), el('p', { text: opts.emptyNote || '' })]));
      return;
    }
    if (!list.length){
      EXAMPLES.slice(0, opts.limit || 3).forEach((x, ix) => box.append(card(x, ix, opts)));
      host.append(box, el('p', { class:'ex-note', text: opts.emptyNote || T('ud.liste.ornekler') }));
      return;
    }
    list.forEach((i, ix) => box.append(card(i, ix, opts)));
    host.append(box);
  };
  Store.sub(render);
  return { render };
}

// =========================================================== "Bildir"
// A quiet link at the foot of an idea: a reason, an optional note, sent once per person per idea.
// The open state and what was already sent survive the window's repaints (the store refreshes it).
const bildirildi = new Set();
let bildirAcik = null;
const NEDENLER = ['spam','uygunsuz','kopya','yaniltici','diger'];
function bildirCtl(key){
  const box = el('div', { class:'bildir' });
  if (bildirildi.has(key)){ box.append(el('p', { class:'bildir-tamam', text:T('ud.bildir.tamam') })); return box; }
  if (bildirAcik !== key){
    box.append(el('button', { type:'button', class:'link bildir-ac', text:T('ud.bildir.ac'), onclick(){ bildirAcik = key; box.replaceWith(bildirCtl(key)); $('.bildir input', dlg).focus(); } }));
    return box;
  }
  const f = el('form', { class:'bildir-f', novalidate:true, 'aria-label':T('ud.bildir.ac') });
  f.innerHTML = `<fieldset><legend>${T('ud.bildir.neden')}</legend><div class="chips">${NEDENLER.map(n =>
    `<label class="chip bildir-n"><input type="radio" name="neden" value="${n}"> ${T('ud.bildir.n.' + n)}</label>`).join('')}</div></fieldset>
    <textarea name="aciklama" maxlength="300" placeholder="${T('ud.bildir.not')}" aria-label="${T('ud.bildir.not')}"></textarea>
    <div class="row"><button type="submit" class="btn sm">${T('ud.bildir.gonder')}</button><button type="button" class="link bildir-x">${T('ud.al.vazgec')}</button></div>
    <small class="bildir-d" role="status"></small>`;
  $('.bildir-x', f).onclick = () => { bildirAcik = null; box.replaceWith(bildirCtl(key)); };
  f.onsubmit = e => {
    e.preventDefault();
    const n = f.neden.value, d = $('.bildir-d', f);
    if (!n){ d.textContent = T('ud.bildir.hata.neden'); f.querySelector('input').focus(); return; }
    $('[type=submit]', f).disabled = true;
    Store.bildir(key, n, f.aciklama.value.trim()).then(() => {
      bildirildi.add(key); bildirAcik = null; olcu('Bildir', { neden:n });
      box.replaceWith(bildirCtl(key));
    }).catch(err => {
      $('[type=submit]', f).disabled = false;
      if (err && err.code === '23505'){ bildirildi.add(key); bildirAcik = null; box.replaceWith(bildirCtl(key)); return; }
      d.textContent = err && err.code === 'P0001' ? T('ud.bildir.hata.sinir') : T('ud.bildir.hata.genel');
    });
  };
  box.append(f);
  return box;
}

// =========================================================== idea dialog (arena)
let dlg = null;
function openIdea(key, push=true){
  const i = Store.ideas().find(x => x.key === key);
  if (!i) return false;
  Store.loadNotes(key);
  if (!dlg){
    dlg = el('dialog', { class:'idlg', 'aria-labelledby':'idlg-h' });
    document.body.append(dlg);
    dlg.addEventListener('close', () => { if (location.search.includes('f=')) history.replaceState(null, '', withStil(location.pathname)); });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }
  const paint = () => {
    const it = Store.ideas().find(x => x.key === key); if (!it) return;
    const mine = Store.myRate(key);
    dlg.innerHTML = `<header><span class="eyebrow">${esc(catName(it.cat))} · ${it.left > 0 ? T('ud.pencere.topluyor', { n:it.left }) : T('ud.kart.bitti')}</span><span class="hd-r"><button type="button" class="btn alt sm sh">${T('ud.paylas')}</button><button type="button" class="x" aria-label="${T('ud.kapat')}">${ICON.x}</button></span></header>
    <div class="in">
      <div style="display:grid;gap:14px"><h2 id="idlg-h">${esc(it.title)}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center"><span class="dv"></span>
        <span class="eyebrow">${it.buyers ? T('ud.pencere.ort', { fiyat:tl(it.avg) }) + ' · ' : ''}${it.handle ? esc(it.handle) + ' · ' : ''}${it.at ? fmtDate(new Date(it.at)) : ''}</span></div>
        ${hedef(it) ? `<p class="hedef${hedef(it).aday ? ' aday' : ''}">${hedefMetni(hedef(it))}</p>` : ''}</div>
      ${it.problem || it.solution || (it.feats || []).length ? `<dl>${it.problem ? `<div><dt>${T('ud.pencere.problem')}</dt><dd>${esc(it.problem)}</dd></div>` : ''}${it.solution ? `<div><dt>${T('ud.form.cozum')}</dt><dd>${esc(it.solution)}</dd></div>` : ''}
        ${(it.feats || []).length ? `<div><dt>${T('ud.form.ozellik')}</dt><dd><ul>${it.feats.map(x => `<li>${esc(x)}</li>`).join('')}</ul></dd></div>` : ''}</dl>` : ''}
      ${it.mine && it.owner !== Store.uid ? '<div class="haber-yer"></div>' : ''}
      ${it.owner === Store.uid && Store.canWrite ? `<div class="own" aria-live="polite"><span>${T('ud.pencere.senin')}</span><button type="button" class="link own-x">${T('ud.pencere.gerial')}</button></div>` : ''}
      <section class="crit" aria-label="${T('ud.pencere.olcut')}"><span class="eyebrow">${T('ud.pencere.puan', { n:it.raters })}</span>
        ${CRIT.map(([c,l]) => `<div class="crit-row"><span>${l}</span><div class="stars" role="group" aria-label="${T('ud.pencere.puani', { olcut:l })}">${[1,2,3,4,5].map(n => `<button type="button" data-c="${c}" data-n="${n}" aria-pressed="${mine[c] === n}" ${Store.canWrite ? '' : 'disabled'}>${n}</button>`).join('')}</div><output>${it.crit[c] ? it.crit[c].toFixed(1) : '–'}</output></div>`).join('')}
      </section>
      <section style="display:grid;gap:14px" aria-labelledby="nt-h"><h3 id="nt-h" style="font-size:17px">${T('ud.pencere.yorumlar')}</h3>
        <div class="notes">${!it.notesLoaded ? `<p class="ex-note">${T('ud.not.yukleniyor')}</p>` : it.notes.length ? it.notes.map(n => `<div class="note ${n.kind}"><small>${T('ud.not.' + n.kind)} · ${esc(n.handle || T('ud.not.isimsiz'))}</small><p>${esc(n.text)}</p></div>`).join('') : `<p class="ex-note">${T('ud.not.ilk')}</p>`}</div>
        <form class="note-form"><textarea name="t" maxlength="500" placeholder="${T('ud.not.ipucu')}" aria-label="${T('ud.not.yorum')}"></textarea>
          <div class="row"><div class="chips" role="group" aria-label="${T('ud.not.tur')}">${[['yorum',T('ud.not.yorum')],['oneri',T('ud.not.oneri')],['endise',T('ud.not.endise')]].map(([k,l],x) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${x===0}">${l}</button>`).join('')}</div>
          <button type="submit" class="btn sm" ${Store.canWrite ? '' : 'disabled'}>${T('ud.not.ekle')}</button></div></form>
      </section>
      ${it.owner !== Store.uid ? '<div class="bildir-yer"></div>' : ''}
    </div>`;
    $('.x', dlg).onclick = () => dlg.close();
    const sh = $('.sh', dlg); sh.onclick = () => { olcu('Paylaş', { yer:'pencere' }); shareIdea(it.title, it.key, sh); };
    $('.dv', dlg).replaceWith(buyCtl(it));
    const hy = $('.haber-yer', dlg); if (hy) hy.replaceWith(haberForm(it.key, 'alirdim'));
    const by = $('.bildir-yer', dlg); if (by) by.replaceWith(bildirCtl(it.key));
    const own = $('.own-x', dlg);
    if (own) own.onclick = () => {
      if (own.dataset.sure){ Store.removeIdea(key).then(() => dlg.close()).catch(() => { own.textContent = T('ud.pencere.gerial.hata'); }); return; }
      own.dataset.sure = '1'; own.textContent = T('ud.pencere.gerial.emin');
    };
    $$('.stars button', dlg).forEach(b => b.onclick = () => Store.rate(key, b.dataset.c, Number(b.dataset.n)).catch(()=>{}));
    let kind = 'yorum';
    $$('.note-form .chip', dlg).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('.note-form .chip', dlg).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
    $('.note-form', dlg).onsubmit = e => { e.preventDefault(); const t = e.target.t.value.trim(); if (t.length < 3) return; Store.addNote(key, kind, t, handleGet()).catch(()=>{}); };
  };
  let unsub = Store.sub(() => { if (dlg.open){ const a = document.activeElement; const sel = a && a.matches && a.matches('.note-form textarea') ? a.value : null; paint(); if (sel != null){ const ta = $('.note-form textarea', dlg); ta.value = sel; } } });
  paint();
  dlg.addEventListener('close', () => unsub(), { once:true });
  if (!dlg.open) dlg.showModal();
  if (push) history.replaceState(null, '', withStil(location.pathname + '?f=' + encodeURIComponent(key)));
  return true;
}

// a shared link (?f=<idea>) opens that idea; the store can take a moment to arrive
function openShared(){
  const f = new URLSearchParams(location.search).get('f');
  if (!f) return;
  let tries = 0; const t = setInterval(() => { if (openIdea(f, false) || ++tries > 40) clearInterval(t); }, 250);
}

// =========================================================== the process run
// Sketch to shelf in one pass (about 7.5 s). The same drawing lives through the whole story: a rough
// pencil sketch next to the idea, price bubbles from people who would buy it, the community's notes
// pinned on while the wobbly lines straighten into a clean drawing, then wood, dimensions and the fold,
// then into a kraft box, boxes stack as pre-sales fill, and the box lands on a shelf with the payout.
// Plays once when seen, replay at the end; reduced motion shows the last frame.
function mountProc(host, opts={}){
  // a general story, not one product: "your idea", a dot row for demand (no figures that read as real data),
  // and a plain object that goes from a wobbly sketch to a clean drawing, a box and a shelf
  const text = T('ud.akis.cumle');
  const steps = [1,2,3,4,5,6].map(n => T('ud.akis.adim' + n));
  const PRE = TERMS.presale[0];
  const tag = (x, y, w, label, val, lx, ly, tx, ty, i) => `<g class="dw-tag" style="--i:${i}"><path class="dw-lead" pathLength="1" d="M${lx} ${ly} L${tx} ${ty}"/><circle class="dw-pin" cx="${tx}" cy="${ty}" r="2.2"/><rect x="${x}" y="${y}" width="${w}" height="17" rx="8.5"/><text x="${x + 9}" y="${y + 11.6}">${label} <tspan>${val}</tspan></text></g>`;
  const bub = (x, y, i) => `<g class="dw-bub" style="--i:${i}"><rect x="${x}" y="${y}" width="38" height="17" rx="8.5"/><text x="${x + 19}" y="${y + 11.8}" text-anchor="middle">₺…</text></g>`;
  host.classList.add('proc');
  host.innerHTML = `
  <p class="sr">${T('ud.akis.sr', { az:TERMS.shareRetail, cok:TERMS.shareDirect })}</p>
  <div class="pc-stage">
    <div class="pc-card" aria-hidden="true">
      <div class="h"><span class="tag">${T('ud.akis.senin')}</span><span class="pc-n">0 / 140</span></div>
      <p class="pc-txt"></p>
      <div class="pc-buy"><span class="pc-meter">${Array.from({ length:12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span><span>${T('ud.akis.talep')}</span></div>
    </div>
    <div class="pc-pay" aria-hidden="true"><span class="eb">${T('ud.akis.pay')}</span><b><em>${pct(TERMS.shareRetail + '–' + TERMS.shareDirect)}</em></b><span>${T('ud.akis.paykime')}</span></div>
    <div class="pc-draw" aria-hidden="true"><svg viewBox="0 0 320 240">
      <g class="dw-shelf"><path d="M8 170 H312"/><path d="M40 170 v14 h10 M270 170 v14 h10"/></g>
      <g class="dw-counter">
        <path class="dw-sk m1" pathLength="1" d="M18 171 C 100 166 210 175 302 168"/>
        <path class="dw-sk m2" pathLength="1" d="M22 201 C 110 198 200 204 298 199"/>
        <path class="dw-sk m3" pathLength="1" d="M19 170 C 19 180 21 190 21 201"/>
        <path class="dw-sk m4" pathLength="1" d="M301 168 C 300 180 299 190 299 199"/>
      </g>
      <g class="dw-product">
        <path class="dw-sk dw-board m5" pathLength="1" d="M118 171 C 117 139 122 113 119 95 C 141 84 177 89 199 92 C 202 113 197 141 202 171"/>
        <path class="dw-sk dw-edge m6" pathLength="1" d="M199 92 C 203 90 206 87 210 85 C 211 116 207 142 210 166"/>
        <path class="dw-sk dw-slot m7" pathLength="1" d="M147 126 C 144 115 153 109 161 111 C 170 108 176 117 173 125 C 175 133 167 140 159 137 C 151 139 145 131 147 126"/>
        <g class="dw-hatch"><path d="M130 150 l14 -14 M140 162 l20 -20 M176 160 l16 -16"/></g>
        <g class="dw-grain"><path d="M136 152 H184 M136 159 H184"/></g>
        <g class="dw-hinge"><rect x="130" y="168" width="20" height="6" rx="1.5"/><rect x="170" y="168" width="20" height="6" rx="1.5"/></g>
      </g>
      <g class="dw-dims"><path pathLength="1" d="M120 74 H200 M120 69 v10 M200 69 v10"/><text x="160" y="66" text-anchor="middle">${T('ud.akis.en')}</text>
        <path pathLength="1" d="M104 94 V170 M99 94 h10 M99 170 h10"/><text x="96" y="135" text-anchor="end">${T('ud.akis.boy')}</text></g>
      <g class="dw-bubs">${bub(222, 56, 0)}${bub(250, 92, 1)}${bub(224, 128, 2)}${bub(48, 150, 3)}</g>
      <g class="dw-tags">${tag(8, 146, 70, T('ud.akis.isim'), '✓', 78, 154, 120, 154, 0)}${tag(230, 112, 72, T('ud.akis.renk'), '✓', 230, 120, 202, 124, 1)}${tag(222, 40, 92, T('ud.akis.ambalaj'), '✓', 222, 48, 198, 92, 2)}</g>
      <g class="dw-boxes">
        <g class="dw-box b3"><path class="side" d="M246 120 L258 111 L258 160 L246 170 Z"/><path class="front" d="M190 120 H246 V170 H190 Z"/><path class="lid" d="M190 120 L202 111 L258 111 L246 120 Z"/></g>
        <g class="dw-box b2"><path class="side" d="M118 120 L130 111 L130 160 L118 170 Z"/><path class="front" d="M62 120 H118 V170 H62 Z"/><path class="lid" d="M62 120 L74 111 L130 111 L118 120 Z"/></g>
        <g class="dw-box b1"><path class="side" d="M224 104 L240 92 L240 158 L224 170 Z"/><path class="front" d="M96 104 H224 V170 H96 Z"/><path class="lid" d="M96 104 L112 92 L240 92 L224 104 Z"/>
          <g class="dw-label"><rect x="112" y="122" width="96" height="30" rx="3"/><text class="nm" x="160" y="139" text-anchor="middle">${T('ud.akis.ad')}</text><text class="by" x="160" y="148" text-anchor="middle">${T('ud.akis.mucit')}</text></g></g>
      </g>
    </svg></div>
    <div class="pc-pre" aria-hidden="true"><div class="pc-row"><span>${T('ud.akis.adim5')}</span><b class="pc-pn">0 / ${PRE}</b></div><div class="pc-bar"><i></i></div><span class="ok">${T('ud.akis.doldu')}</span></div>
    <span class="pc-ex" aria-hidden="true">${T('ud.akis.ornek')}</span>
    <button type="button" class="pc-replay">${ICON.replay}${T('ud.akis.tekrar')}</button>
  </div>
  <ol class="pc-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
  const txt = $('.pc-txt', host), n = $('.pc-n', host), pn = $('.pc-pn', host), lis = $$('.pc-steps li', host);
  let timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const count = (node, to, ms, fmt) => { const t0 = performance.now(); const f = now => { const p = Math.min(1, (now - t0)/ms); node.textContent = fmt(Math.round(to * (1 - Math.pow(1-p, 3)))); if (p < 1) timers.push(requestAnimationFrame(f)); }; requestAnimationFrame(f); };
  const step = s => lis.forEach((li, ix) => { li.classList.toggle('on', ix === s); li.classList.toggle('past', ix < s); });
  const S = ['s1','s2','s3','s4','s5','s5b','s6','end'];
  function finalState(){
    host.classList.add(...S); txt.textContent = text; n.textContent = text.length + ' / 140';
    pn.textContent = PRE + ' / ' + PRE; step(5);
  }
  function play(){
    timers.forEach(t => { clearTimeout(t); cancelAnimationFrame(t); }); timers = [];
    host.classList.remove(...S); txt.textContent = ''; n.textContent = '0 / 140'; pn.textContent = '0 / ' + PRE;
    void host.offsetWidth;
    if (reduce.matches){ finalState(); return; }
    host.classList.add('s1'); step(0);
    const per = 950 / text.length;
    for (let c = 1; c <= text.length; c++) at(c*per, () => { txt.textContent = text.slice(0, c); n.textContent = c + ' / 140'; });
    at(1700, () => { host.classList.add('s2'); step(1); });
    at(2900, () => { host.classList.add('s3'); step(2); });
    at(4100, () => { host.classList.add('s4'); step(3); });
    at(5200, () => { host.classList.add('s5'); step(4); count(pn, PRE, 1100, v => v + ' / ' + PRE); });
    at(5900, () => host.classList.add('s5b'));
    at(6600, () => { host.classList.add('s6'); step(5); });
    at(7500, () => { host.classList.add('end'); try { sessionStorage.setItem('ud-proc-seen', '1'); } catch(e){} });
  }
  $('.pc-replay', host).onclick = play;
  if (opts.manual) return { play };
  let seen = false; try { seen = sessionStorage.getItem('ud-proc-seen') === '1'; } catch(e){}
  if (reduce.matches || seen){ finalState(); return { play }; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); setTimeout(play, opts.delay || 250); } }, { threshold:.35 });
  io.observe(host);
  return { play };
}

// =========================================================== motion
// Blocks below the first screen rise in once as they reach the screen; technical drawings draw
// themselves and their quantity counts up. Each style tunes how through CSS (--in-* in stil/*.css).
// Lists that the store re-renders are left alone, so cards never replay.
const GRIDS = '.disc,.rounds,.steps,.how3,.open3,.vals,.faq,.cases,.cands';
function mountMotion(){
  if (html.dataset.page === 'stiller') return;
  if (reduce.matches || !('IntersectionObserver' in window)){ $$('.cb-art').forEach(a => a.classList.add('drawn')); return; }
  const picked = [];
  $$('main .sec .wrap > *, main.wrap > *:not(.phead):not(.compose), #case > .case-band').forEach(n => {
    if (n.matches(GRIDS) || n.querySelector(':scope > .disc, :scope > .rounds')) {
      const inner = n.matches(GRIDS) ? n : n.querySelector(':scope > .disc, :scope > .rounds');
      if (inner !== n) picked.push(n);
      Array.from(inner.children).forEach((c, i) => { c.style.setProperty('--d', Math.min(i, 6) * 90 + 'ms'); picked.push(c); });
    } else picked.push(n);
  });
  // fast travel (an anchor, End, a fling, scrollTo from a tool; smooth scrolling turns these into many
  // small steps, so it is measured as speed over the last 150 ms) skips the transition, so nothing is
  // ever caught half-faded; normal reading-speed scrolling still gets the reveal
  let samples = [[performance.now(), scrollY]], jumpT = 0;
  addEventListener('scroll', () => {
    const now = performance.now(); samples.push([now, scrollY]); samples = samples.filter(s => now - s[0] < 150);
    if (Math.abs(scrollY - samples[0][1]) > innerHeight * .5){
      html.classList.add('rv-jump'); clearTimeout(jumpT); jumpT = setTimeout(() => html.classList.remove('rv-jump'), 700);
      $$('.rv:not(.in)').forEach(n => { const r = n.getBoundingClientRect(); if (r.top < innerHeight * 1.1 && r.bottom > 0) n.classList.add('in', 'seen'); });
    }
  }, { passive:true });
  addEventListener('beforeprint', () => $$('.rv').forEach(n => n.classList.add('in')));
  // keyboard focus never waits for a reveal: the focused element's block shows at once, ring included
  addEventListener('focusin', e => {
    const r = e.target.closest && e.target.closest('.rv:not(.in)'); if (!r) return;
    html.classList.add('rv-jump'); clearTimeout(jumpT); jumpT = setTimeout(() => html.classList.remove('rv-jump'), 700);
    r.classList.add('in', 'seen');
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const n = e.target; io.unobserve(n);
    n.classList.add('in', 'seen');
    // hand the element back to its own hover and transform rules once it has arrived
    setTimeout(() => n.classList.remove('rv', 'in'), 1600 + (parseInt(n.style.getPropertyValue('--d')) || 0));
  }), { threshold:0, rootMargin:'0px 0px 12% 0px' });
  picked.forEach(n => { n.classList.add('rv'); io.observe(n); });
  // drawings: every stroke is normalised to length 1 so CSS can draw it in; the figure counts up
  const dio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const a = e.target; dio.unobserve(a); a.classList.add('drawn');
    const cap = $('figcaption', a); if (!cap) return;
    const full = cap.textContent, n = parseInt(full.replace(/\D/g, ''), 10); if (!n || !/^×/.test(full.trim())) return;
    const t0 = performance.now(), ms = 1400;
    const f = now => { const p = Math.min(1, (now - t0) / ms), v = Math.round(n * (1 - Math.pow(1 - p, 4)));
      cap.textContent = '× ' + v.toLocaleString(LOCALE); if (p < 1) requestAnimationFrame(f); else cap.textContent = full; };
    requestAnimationFrame(f);
  }), { threshold:.35 });
  $$('.cb-art').forEach(a => { $$('path', a).forEach(p => p.setAttribute('pathLength', '1')); a.classList.add('will-draw'); dio.observe(a); });
}

// =========================================================== boot
applyText();
mountChrome();
document.addEventListener('DOMContentLoaded', mountMotion);
window.UD = { T, LANG, LOCALE, pct, tl, catName, applyText, TERMS, CATS, CASES, openCases, inCase, CRIT, Store, mountForm, mountCase, mountStats, mountBoard, mountThu, mountProc, openIdea, openShared, olcu, hedef, hedefMetni, nextLive, liveNow, fmtDay, fmtDate, el, esc, ICON, ROOT, kvkkLink };
})();
