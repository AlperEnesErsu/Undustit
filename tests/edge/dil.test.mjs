// node --test tests/edge/: the English head (netlify/edge-functions/dil.js) without Netlify.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fn, { sozlukCoz, ingilizce } from '../../netlify/edge-functions/dil.js';

const oku = y => fs.readFileSync(new URL('../../' + y, import.meta.url), 'utf8');
const s = sozlukCoz(oku('assets/metin/en.js'));
const sayfa = oku('nasil/index.html');

test('İngilizce sözlük dosyası okunur', () => {
  assert.ok(s && Object.keys(s).length > 500);
  assert.equal(sozlukCoz('bozuk'), null);
});

test('?dil=en sayfasının başı İngilizce ve kendi adresini gösterir', () => {
  const h = ingilizce(sayfa, '/nasil/', s);
  assert.match(h, /<html[^>]* lang="en"/);
  assert.ok(h.includes('<link rel="canonical" href="https://undustit.com/nasil/?dil=en">'));
  assert.ok(h.includes('<meta property="og:url" content="https://undustit.com/nasil/?dil=en">'));
  assert.ok(h.includes('<meta property="og:locale" content="en_GB">'));
  assert.match(h, /<title data-t="nasil.title.1">How it works · Undustit<\/title>/);
  assert.match(h, /<meta name="description" content="From idea to shelf/);
  // hreflang stays as the file says: both languages named, Turkish the default
  assert.ok(h.includes('hreflang="tr" href="https://undustit.com/nasil/"'));
  assert.ok(h.includes('hreflang="x-default" href="https://undustit.com/nasil/"'));
  // the body is untouched
  assert.equal(h.slice(h.indexOf('</head>')), sayfa.slice(sayfa.indexOf('</head>')));
});

test('Türkçe adrese dokunulmaz; sözlük yoksa sayfa olduğu gibi gider', async () => {
  const baglam = { next: async () => new Response(sayfa, { headers:{ 'content-type':'text/html; charset=utf-8' } }) };
  assert.equal(await fn(new Request('https://undustit.com/nasil/'), baglam), undefined);
  globalThis.fetch = async () => new Response('', { status:404 });
  const r = await fn(new Request('https://undustit.com/nasil/?dil=en'), baglam);
  assert.equal(await r.text(), sayfa);
});

test('sözlükle ?dil=en isteği İngilizce baş döner', async () => {
  globalThis.fetch = async () => new Response(oku('assets/metin/en.js'));
  const baglam = { next: async () => new Response(sayfa, { headers:{ 'content-type':'text/html; charset=utf-8' } }) };
  const h = await (await fn(new Request('https://undustit.com/nasil/?dil=en'), baglam)).text();
  assert.match(h, /<title data-t="nasil.title.1">How it works · Undustit<\/title>/);
});
