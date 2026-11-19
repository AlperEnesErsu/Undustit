// node --test tests/edge/: the shared idea's preview (netlify/edge-functions/fikir-onizleme.js) without Netlify.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fn, { anahtar } from '../../netlify/edge-functions/fikir-onizleme.js';

const SAHIP = '11111111-2222-3333-4444-555555555555', ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const sayfa = fs.readFileSync(new URL('../../fikirler/index.html', import.meta.url), 'utf8');
const baglam = { next: async () => new Response(sayfa, { headers:{ 'content-type':'text/html; charset=utf-8' } }) };
let sonAdres = '';
const veri = satirlar => { globalThis.fetch = async u => (sonAdres = String(u), new Response(JSON.stringify(satirlar), { headers:{ 'content-type':'application/json' } })); };
const iste = f => fn(new Request('https://undustit.com/fikirler/?f=' + encodeURIComponent(f)), baglam);

test('anahtar yalnız sahip:id kabul eder', () => {
  assert.deepEqual(anahtar(SAHIP + ':' + ID), { sahip:SAHIP, id:ID });
  for (const k of ['', 'x', ID, SAHIP + ':1 or 1=1', 'a:' + ID]) assert.equal(anahtar(k), null);
});

test('paylaşılan fikrin başlığı, talebi ve adresi sayfaya yazılır, metin kaçışlanır', async () => {
  veri([{ sahip:SAHIP, baslik:'Cıvatadan <b>"çit"</b> direği', problem:'Bahçe çiti çabuk yıkılıyor.', alici:3, ort_fiyat:420 }]);
  const html = await (await iste(SAHIP + ':' + ID)).text();
  assert.match(html, /<title>Cıvatadan &lt;b&gt;&quot;çit&quot;&lt;\/b&gt; direği · Undustit<\/title>/);
  assert.match(html, /property="og:description" content="Bahçe çiti çabuk yıkılıyor\. 3 kişi alırdım dedi, ortalama ₺420\."/);
  assert.ok(html.includes(`rel="canonical" href="https://undustit.com/fikirler/?f=${SAHIP}%3A${ID}"`));
  assert.match(html, /property="og:type" content="article"/);
  // the database's English view, read under the Turkish names the page uses
  assert.match(sonAdres, /\/rest\/v1\/idea_cards\?id=eq\.[^&]+&select=sahip:owner_id,baslik:title,problem,alici:buyers,ort_fiyat:avg_price&/);
  assert.doesNotMatch(html, /og:title" content="[^"]*" data-ta/);
});

test('fikir yoksa, sahip tutmazsa ya da anahtar bozuksa sayfa olduğu gibi gider', async () => {
  veri([]);
  assert.match(await (await iste(SAHIP + ':' + ID)).text(), /<title data-t="fikirler.title.1">Fikirler · Undustit<\/title>/);
  veri([{ sahip:ID, baslik:'Başkasının', alici:0 }]);
  assert.match(await (await iste(SAHIP + ':' + ID)).text(), /Fikirler · Undustit<\/title>/);
  assert.equal(await iste('bozuk'), undefined);
});
