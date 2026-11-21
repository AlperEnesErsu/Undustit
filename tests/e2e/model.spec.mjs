// The product's 3D model (.glb, supabase/23-model.sql): the admin or the case's company uploads one, the case
// page shows it turnable in the photo's frame with the photo as its poster. The viewer itself (<model-viewer>,
// jsDelivr) is replaced by a stand-in here: no network in tests; what is checked is what the site hands it.
import { test, expect, hazirla, yoneticiGiris } from './yardim.mjs';

// the smallest valid glTF binary: header + a JSON chunk with an empty scene
function glb(){
  let json = Buffer.from(JSON.stringify({ asset:{ version:'2.0' }, scene:0, scenes:[{ nodes:[] }] }));
  json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const bas = Buffer.alloc(12), parca = Buffer.alloc(8);
  bas.write('glTF', 0, 'ascii'); bas.writeUInt32LE(2, 4); bas.writeUInt32LE(12 + 8 + json.length, 8);
  parca.writeUInt32LE(json.length, 0); parca.write('JSON', 4, 'ascii');
  return Buffer.concat([bas, parca, json]);
}
const MODEL = { name:'urun.glb', mimeType:'model/gltf-binary', buffer:glb() };
const SAHTE = { name:'urun.glb', mimeType:'model/gltf-binary', buffer:Buffer.from('bu bir model degil') };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    customElements.define('model-viewer', class extends HTMLElement {});
  });
});

test('yönetici 3D model yükler; vaka sayfasında fotoğrafın yerinde döner, yanlış dosya reddedilir', async ({ page }) => {
  await hazirla(page);
  await yoneticiGiris(page);
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('#f-model3d').setInputFiles(SAHTE);
  await expect(page.locator('#f-model3d-h')).toContainText('.glb');
  await page.locator('#f-model3d').setInputFiles(MODEL);
  await expect(page.locator('[data-model-onizleme] model-viewer')).toHaveAttribute('src', /^data:model\/gltf-binary;base64,/);
  await expect(page.locator('[data-model-sil]')).toBeVisible();
  await page.locator('#vaka-form [type=submit]').click();
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('udv-v1')).vakalar['vaka-01'].model3d || '').slice(0, 25)))
    .toBe('data:model/gltf-binary;ba');

  await page.goto('/vaka-01/');
  const fig = page.locator('#foy-gorsel');
  await expect(fig).toHaveClass(/model3d/);
  const mv = fig.locator('model-viewer');
  await expect(mv).toHaveAttribute('camera-controls', '');
  await expect(mv).toHaveAttribute('ar', '');
  await expect(fig.locator('.model-ipucu')).toContainText('3D');

  // "Kaldır" + "Kaydet": the photo frame is back
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('[data-model-sil]').click();
  await page.locator('#vaka-form [type=submit]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('udv-v1')).vakalar['vaka-01'].model3d)).toBe('');
  await page.goto('/vaka-01/');
  await expect(page.locator('#foy-gorsel model-viewer')).toHaveCount(0);
});

test('başka bir vakanın sayfasında da model fotoğrafın çerçevesine gelir, fotoğraf poster olur', async ({ page }) => {
  await hazirla(page);
  await page.evaluate(() => {
    const m = 'data:model/gltf-binary;base64,Z2xURg==', f = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    localStorage.setItem('udv-v1', JSON.stringify({ vakalar:{ 'mentese':{ id:'mentese', baslik:'Kırk bin menteşe', ozet:'', aciklama:'', stok:'menteşe', adet:40000,
      durum:'acik', model3d:m, gorsel:f, ortaklik:true, odul:0, olusturma:'2026-11-01T00:00:00Z' } }, gecmis:{}, gizli:{} }));
  });
  await page.goto('/vaka/?id=mentese');
  const mv = page.locator('#vaka-foto model-viewer');
  await expect(mv).toHaveAttribute('src', /^data:model\/gltf-binary/);
  await expect(mv).toHaveAttribute('poster', /^data:image\/png/);
  await expect(mv).toHaveAttribute('alt', 'Kırk bin menteşe');
});

test('firma kendi vakasına 3D model yükler ve kaldırır', async ({ page }) => {
  await hazirla(page);
  await yoneticiGiris(page);
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('#t-firma').click();
  await page.fill('#firma-form [name=eposta]', 'satis@firma.test');
  await page.locator('#firma-form [type=submit]').click();
  await expect(page.locator('#firmalar')).toContainText('satis@firma.test');
  await page.evaluate(() => UDV.cikis());
  await page.goto('/giris/?mod=giris');
  await page.fill('#kart [name=e]', 'satis@firma.test');
  await page.fill('#kart [name=s]', 'herhangi');
  await page.locator('#kart [type=submit]').click();
  await expect(page).toHaveURL(/\/firma\/$/);
  await expect(page.locator('#model .foy-gorsel')).toHaveClass(/yok/);
  await page.locator('#f-model').setInputFiles(MODEL);
  await expect(page.locator('#model model-viewer')).toHaveAttribute('src', /^data:model\/gltf-binary/);
  await page.goto('/vaka-01/');
  await expect(page.locator('#foy-gorsel model-viewer')).toHaveCount(1);
  await page.goto('/firma/');
  await page.locator('[data-model-sil]').click();
  await expect(page.locator('#model .foy-gorsel')).toHaveClass(/yok/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('udv-v1')).vakalar['vaka-01'].model3d)).toBe('');
});
