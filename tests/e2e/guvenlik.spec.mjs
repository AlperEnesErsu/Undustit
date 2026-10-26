// Hostile content stays text: ideas, names, comments, messages and applications full of HTML are shown on
// every page that lists them (public pages and the admin tables) without running anything.
// And when the data cannot load, the visitor is told so instead of looking at an empty list.
import { test, expect, hazirla, yoneticiGiris } from './yardim.mjs';

const KOTU = {
  baslik: 'Kötü fikir <img src=x onerror="window.__xss=1"> deneme',
  ad: '<script>window.__xss=2</script>',
  yorum: '"><svg onload="window.__xss=3"></svg>',
  firma: '<img src=y onerror="window.__xss=4">'
};
const simdi = new Date().toISOString();
const veri = {
  ideas: { local: { items: [{ k:'h1', title:KOTU.baslik, cat:'Mutfak', caseId:'vaka-01', problem:KOTU.yorum, solution:KOTU.ad, feats:[KOTU.firma], handle:KOTU.ad, at:simdi }] } },
  votes: {},
  notes: { 'u-z': { items: [{ k:'n1', idea:'local:h1', kind:'yorum', text:KOTU.yorum, handle:KOTU.ad, at:simdi }] } }
};

async function temiz(page){
  expect(await page.evaluate(() => window.__xss), 'betik çalıştı').toBeUndefined();
  await expect(page.locator('img[src="x"], img[src="y"], svg[onload]')).toHaveCount(0);
}

test('kötü niyetli metin her yerde metin olarak kalır', async ({ page }) => {
  await hazirla(page, veri);
  for (const yol of ['/', '/fikirler/', '/benim/', '/vaka-01/']){
    await page.goto(yol);
    await temiz(page);
  }
  await page.goto('/fikirler/');
  await page.locator('.icard .t a').first().click();
  await expect(page.locator('dialog h2')).toContainText('<img src=x');
  await expect(page.locator('dialog .note p')).toContainText('<svg onload');
  await temiz(page);
  // the same strings through the forms, into the admin tables
  await page.goto('/iletisim/');
  await page.fill('.ilet-f [name=ad]', KOTU.ad.slice(0, 30));
  await page.fill('.ilet-f [name=eposta]', 'kotu@example.test');
  await page.fill('.ilet-f [name=mesaj]', KOTU.firma);
  await page.check('.ilet-f [name=onay]');
  await page.locator('.ilet-f [type=submit]').click();
  await page.goto('/vakalar/');
  await page.locator('#basvuru button').click();
  await page.fill('form.basvuru [name=firma]', KOTU.firma);
  await page.fill('form.basvuru [name=stok]', KOTU.yorum);
  await page.fill('form.basvuru [name=eposta]', 'kotu@example.test');
  await page.check('form.basvuru [name=onay]');
  await page.locator('form.basvuru [type=submit]').click();
  await yoneticiGiris(page);
  await expect(page.locator('#basvurular-tbody')).toContainText('onerror');
  await expect(page.locator('#mesajlar-tbody')).toContainText('onerror');
  await temiz(page);
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('[role=tab]', { hasText:'Fikirler' }).click();
  await expect(page.locator('main')).toContainText('Kötü fikir');
  await temiz(page);
});

test('veri yüklenemezse görünür uyarı ve yeniden dene çıkar', async ({ page }) => {
  // a database address that refuses the connection (the client library still loads from its CDN)
  await page.route('**/assets/ayar.js', r => r.fulfill({ contentType:'text/javascript',
    body:"window.UD_AYAR = { supabaseUrl:'http://127.0.0.1:9', supabaseAnon:'x', adminler:[], analitik:'', iletisim:'', yasal:false, yayin:'' };" }));
  await page.goto('/fikirler/');
  const uyari = page.locator('.veri-uyari');
  await expect(uyari).toBeVisible({ timeout:15000 });
  await expect(uyari.locator('button')).toBeEnabled();
});
