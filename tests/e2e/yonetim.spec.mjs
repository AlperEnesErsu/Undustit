// What reaches only the admin: a report, a contact message, a case application; and hiding a reported idea.
import { test, expect, hazirla, tohum, yoneticiGiris } from './yardim.mjs';

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
  await f.locator('[name=onay]').check();
  await f.locator('[type=submit]').click();
  await expect(page.locator('.basvuru-tamam')).toBeVisible();
  await yoneticiGiris(page);
  const satir = page.locator('#basvurular-tbody tr', { hasText:'Örnek Metal' });
  await satir.locator('select').selectOption('incelendi');
  await expect.poll(() => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('udv-vaka_basvurulari')))[0].durum)).toBe('incelendi');
});
