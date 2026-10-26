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
// an idea's label: its case (when it has one), then its own category; older case ideas carry only the case
function etiket(i){
  const vk = i.caseId && (CASES.find(c => c.id === i.caseId) || (i.caseId === V01.id ? V01 : null));
  const parts = [];
  if (vk) parts.push(catName(vk.short));
  if (i.cat && (!vk || i.cat !== vk.short)) parts.push(catName(i.cat));
  return parts.join(' · ');
}
function sortIdeas(list, by){
  const c = list.slice();
  if (by === 'new') c.sort((a,b) => String(b.at).localeCompare(String(a.at)));
  else c.sort((a,b) => b.buyers - a.buyers || b.avg - a.avg || String(b.at).localeCompare(String(a.at)));
  return c;
}
// Turkish writes the percent sign first (%10), English after (10%)
const pct = v => LANG === 'en' ? v + '%' : '%' + v;
const tl = n => LANG === 'en' ? '₺' + Math.round(n).toLocaleString(LOCALE) : Math.round(n).toLocaleString(LOCALE) + ' ₺';

window.UD_IC = { html, ROOT, reduce, METIN, LANG, LOCALE, T, applyText, $, $$, el, ICON, TERMS, CATS, CASES, V01, caseOf, openCases, inCase, catName, CRIT, EXAMPLES, DAY, fmtDate, fmtDay, nextLive, liveNow, daysLeft, homeHref, STIL, withStil, toast, yazmaHatasi, uyariEl, veriUyari, sbClient, ANALITIK, olcu, esc, etiket, sortIdeas, pct, tl };
})();
