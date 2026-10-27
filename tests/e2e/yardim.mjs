// Shared setup: every page runs in local mode (ayar.js replaced in the browser, no network to Supabase or
// Plausible), and any JS error fails the test. Helpers seed the local preview store the way the site writes it.
import { test as base, expect } from '@playwright/test';

export const ADMIN = 'test@undustit.local';
export const ADMIN_SIFRE = 'undustit';   // the local preview's admin password (assets/veri.js), never a real one
const AYAR = `window.UD_AYAR = { supabaseUrl:'', supabaseAnon:'', adminler:['${ADMIN}'], analitik:'', iletisim:'', yasal:false, yayin:'' };`;

export const test = base.extend({
  page: async ({ page }, use) => {
    const hatalar = [];
    // an error a test throws on purpose carries "[beklenen]" and does not count
    page.on('pageerror', e => { if (!String(e).includes('[beklenen]')) hatalar.push(String(e)); });
    await page.route('**/assets/ayar.js', r => r.fulfill({ contentType:'text/javascript', body:AYAR }));
    await use(page);
    expect(hatalar, 'JS hatası').toEqual([]);
  }
});
export { expect };

const simdi = () => new Date().toISOString();
const fikir = (k, title, cat = 'Mutfak', extra = {}) => ({ k, title, cat, problem:'', solution:'', feats:[], handle:'deneme', at:simdi(), ...extra });

// six ideas from others with rising demand, so ranking and the Thursday five are visible
export function tohum({ benimkiler = [] } = {}){
  const ideas = { 'u-x': { items: [0, 1, 2, 3, 4, 5].map(n => fikir('x' + n, `Başka bir fikir numara ${n}`)) } };
  if (benimkiler.length) ideas.local = { items: benimkiler.map((t, i) => fikir('m' + i, t, i === 0 ? 'Vaka 01 · Cıvata' : 'Mutfak', i === 0 ? { caseId:'vaka-01' } : {})) };
  const votes = {};
  for (let n = 0; n < 6; n++) for (let v = 0; v < 2 + n; v++) (votes['v' + v] = votes['v' + v] || { buy:{}, rate:{} }).buy['u-x:x' + n] = 100 + n * 20;
  return { ideas, votes, notes:{} };
}

export async function hazirla(page, veri){
  await page.goto('/');
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); if (v) localStorage.setItem('ud-store-v1', JSON.stringify(v)); }, veri || null);
}

export async function yoneticiGiris(page){
  await page.goto('/yonetim/');
  await page.evaluate(([e, s]) => UDV.giris(e, s), [ADMIN, ADMIN_SIFRE]);
}
