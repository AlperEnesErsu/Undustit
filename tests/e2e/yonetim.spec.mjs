// What reaches only the admin: a report, a contact message, a case application (with its photo); hiding a
// reported idea; and the case photo the admin uploads, shown in the technical sheet.
import { test, expect, hazirla, tohum, yoneticiGiris } from './yardim.mjs';

// a 1×1 PNG: enough for the browser to decode, shrink and re-encode
const FOTO = { name:'urun.png', mimeType:'image/png',
  buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') };

test('bildir → yönetimde görünür → "Fikir gizlendi" fikri gizler', async ({ page }) => {
  await hazirla(page, tohum());
  await page.goto('/fikirler/');
  await page.locator('.icard .t a').first().click();
  await page.locator('dialog .bildir-ac').click();
  await page.locator('dialog .bildir-f [type=submit]').click();
  await expect(page.locator('dialog .bildir-d')).not.toBeEmpty();
  await page.locator('dialog .bildir-n', { hasText:'Spam' }).click();
  await page.locator('dialog .bildir-f [type=submit]').click();
  await expect(page.locator('dialog .bildir-tamam')).toBeVisible();
  await yoneticiGiris(page);
  const satir = page.locator('#bildirimler-tbody tr');
  await expect(satir).toHaveCount(1);
  await satir.locator('select').selectOption('gizlendi');
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('udv-v1')).gizli).length)).toBe(1);
});

test('iletişim formu doğrular, gönderir, yönetimde görünür', async ({ page }) => {
  await hazirla(page);
  await page.goto('/iletisim/');
  await page.locator('.ilet-f [type=submit]').click();
  await expect(page.locator('.ilet-f .durum')).toHaveClass(/bad/);
  await page.fill('.ilet-f [name=eposta]', 'deneme@example.test');
  await page.selectOption('.ilet-f [name=konu]', 'yatirim');
  await page.fill('.ilet-f [name=mesaj]', 'Projeyi incelemek istiyoruz, görüşelim.');
  await page.check('.ilet-f [name=onay]');
  await page.locator('.ilet-f [type=submit]').click();
  await expect(page.locator('.ilet-tamam')).toBeVisible();
  await yoneticiGiris(page);
  await expect(page.locator('#mesajlar-tbody')).toContainText('deneme@example.test');
});

test('vaka başvurusu yönetimde durumuyla görünür', async ({ page }) => {
  await hazirla(page);
  await page.goto('/vakalar/');
  await page.locator('#basvuru button').click();
  const f = page.locator('form.basvuru');
  await f.locator('[name=firma]').fill('Örnek Metal A.Ş.');
  await f.locator('[name=stok]').fill('20.000 paslanmaz menteşe');
  await f.locator('[name=eposta]').fill('satis@example.test');
  await f.locator('[name=gorsel]').setInputFiles(FOTO);
  await f.locator('[name=onay]').check();
  await f.locator('[type=submit]').click();
  await expect(page.locator('.basvuru-tamam')).toBeVisible();
  await yoneticiGiris(page);
  const satir = page.locator('#basvurular-tbody tr', { hasText:'Örnek Metal' });
  await expect(satir.locator('img.b-gorsel')).toHaveAttribute('src', /^data:image\/jpeg/);
  await satir.locator('select').selectOption('incelendi');
  await expect.poll(() => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('udv-vaka_basvurulari')))[0].durum)).toBe('incelendi');
});

test('yönetici vaka görseli yükler, teknik föyde görünür', async ({ page }) => {
  await hazirla(page);
  await page.goto('/vaka-01/');
  await expect(page.locator('#foy-gorsel')).toHaveClass(/yok/);
  await yoneticiGiris(page);
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('#f-gorsel').setInputFiles(FOTO);
  await expect(page.locator('[data-onizleme] img')).toBeVisible();
  await page.locator('#vaka-form [type=submit]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('udv-v1')).vakalar['vaka-01'].gorsel.slice(0, 15))).toBe('data:image/jpeg');
  await page.goto('/vaka-01/');
  await expect(page.locator('#foy-gorsel img')).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect(page.locator('#foy-gorsel')).not.toHaveClass(/yok/);
});
