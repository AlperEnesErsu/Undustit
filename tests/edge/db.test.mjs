// node --test tests/edge/db.test.mjs: the Turkish → English database name layer (assets/ud/db.js) without Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const DB = createRequire(import.meta.url)('../../assets/ud/db.js');

// a stand-in for supabase-js: records each call, every method returns the builder, awaiting it gives the calls
function sahte(){
  const kayit = [];
  const b = new Proxy({}, { get(_, ad){
    if (ad === 'then') return ok => ok({ data:kayit, error:null });
    return (...a) => { kayit.push([ad, ...a]); return b; };
  } });
  return { kayit, sb: { from: t => (kayit.push(['from', t]), b), rpc: (n, a) => (kayit.push(['rpc', n, a]), b) } };
}

test('tablo, filtre ve sıralama İngilizceye çevrilir; seçim Türkçe takma adla gelir', async () => {
  const { sb, kayit } = sahte();
  await DB.from(sb, 'fikirler').select('id,baslik,sahip').eq('vaka_id', 'v1').order('zaman', { ascending:false }).limit(5);
  assert.deepEqual(kayit, [['from', 'ideas'], ['select', 'id,baslik:title,sahip:owner_id'], ['eq', 'case_id', 'v1'],
    ['order', 'created_at', { ascending:false }], ['limit', 5]]);
});

test("'*' her sütunu takma adıyla ister, gömülü tablo da çevrilir", () => {
  assert.equal(DB.secim('vaka_firmalari', '*'), 'vaka_id:case_id,eposta:email,eklenme:added_at,davet:invited_at');
  assert.equal(DB.secim('yorumlar', 'id, fikirler(baslik,sahip)'), 'id,fikirler:ideas(baslik:title,sahip:owner_id)');
});

test('yazılan satırın anahtarları ve onConflict çevrilir', async () => {
  const { sb, kayit } = sahte();
  await DB.from(sb, 'puanlar').upsert({ fikir_id:'f', uye:'u', olcut:'d', puan:4 }, { onConflict:'fikir_id,uye,olcut' });
  assert.deepEqual(kayit[1], ['upsert', { idea_id:'f', member_id:'u', criterion:'d', score:4 }, { onConflict:'idea_id,member_id,criterion' }]);
});

test('fonksiyon adı ve argümanları çevrilir; tablo döndüren fonksiyon takma adla okunur', async () => {
  const { sb, kayit } = sahte();
  await DB.rpc(sb, 'alirdim', { f:'id1', fiyat:300, cihaz:'abc' });
  assert.deepEqual(kayit[0], ['rpc', 'place_demand', { p_idea_id:'id1', p_price:300, p_device:'abc' }]);
  const b = sahte();
  await DB.rpc(b.sb, 'vaka_tam', { v:'vaka-01' });
  assert.deepEqual(b.kayit[0], ['rpc', 'cases_full', { p_case_id:'vaka-01' }]);
  assert.match(b.kayit[1][1], /^id,baslik:title,ozet:summary,/);
});

test('her tablo ve sütun adı İngilizce ve tekil', () => {
  const tr = /[çğıöşü]|^(fikir|vaka|talep|puan|yorum|cihaz|haber|hata|iletisim|numune|profiller|etkinlik|yasak)/;
  for (const [t, [en, cols]] of Object.entries(DB.TABLES)){
    assert.doesNotMatch(en, tr, t);
    const degerler = Object.values(cols);
    assert.equal(new Set(degerler).size, degerler.length, t + ' içinde iki sütun aynı ada gidiyor');
    for (const c of degerler) assert.match(c, /^[a-z][a-z0-9_]*$/, t + '.' + c);
  }
});
