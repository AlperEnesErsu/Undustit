// The main act: an idea in one sentence, demand with one tap, and the person's own page.
import { test, expect, hazirla, tohum } from './yardim.mjs';

test('vaka sayfasında cümle + Enter fikri vakaya gönderir', async ({ page }) => {
  await hazirla(page);
  await page.goto('/vaka-01/');
  const cumle = page.locator('#form .if-pitch');
  await cumle.fill('Cıvatalardan katlanır bisiklet duvar askısı');
  await cumle.press('Enter');
  await expect(page.locator('#form .if-done')).toBeVisible();
  await expect(page.locator('#board .icard .t')).toContainText('bisiklet duvar askısı');
  const kayit = await page.evaluate(() => JSON.parse(localStorage.getItem('ud-store-v1')).ideas.local.items[0]);
  expect(kayit.caseId).toBe('vaka-01');
  await page.goto('/benim/');
  await expect(page.locator('#fikirlerim .icard .t')).toContainText('bisiklet duvar askısı');
});

test('kategorisiz cümle Enter ile gönderilmez, kategoriye gider', async ({ page }) => {
  await hazirla(page);
  await page.goto('/fikir/');
  const cumle = page.locator('#form .if-pitch');
  await cumle.fill('Tencere kapaklarını dik tutan çekmece rafı');
  await cumle.press('Enter');
  await expect(page.locator('#form .if-done')).toBeHidden();
  await expect(page.locator('#form .if-cats .chip').first()).toBeFocused();
});

test('vaka ve kategori ayrı seçilir; kart ikisini de gösterir', async ({ page }) => {
  await hazirla(page);
  await page.goto('/fikir/');
  await page.locator('#form .if-pitch').fill('Cıvatalarla kurulan duvara monte halter rafı');
  await page.locator('#form .if-vaka .chip', { hasText:'Boltun' }).click();
  await page.locator('#form .if-cats .chip', { hasText:'Fitness' }).click();
  await page.locator('#form [type=submit]').click();
  await expect(page.locator('#form .if-done')).toBeVisible();
  const kayit = await page.evaluate(() => JSON.parse(localStorage.getItem('ud-store-v1')).ideas.local.items[0]);
  expect([kayit.caseId, kayit.cat]).toEqual(['vaka-01', 'Fitness']);
  await page.goto('/fikirler/');
  const kart = page.locator('#board .icard', { hasText:'halter rafı' });
  await expect(kart.locator('.m .vk')).toHaveText('Vaka 01 · Boltun');
  await expect(kart.locator('.m .c')).toHaveText('Fitness');
  // the two filters work together: case, then category
  await page.locator('#vakalar .chip', { hasText:'Vakadan bağımsız' }).click();
  await expect(kart).toHaveCount(0);
  await page.locator('#vakalar .chip', { hasText:'Boltun' }).click();
  await expect(kart).toHaveCount(1);
  await page.locator('#cats .chip', { hasText:'Mutfak' }).click();
  await expect(kart).toHaveCount(0);
  await page.locator('#cats .chip', { hasText:'Fitness' }).click();
  await expect(kart).toHaveCount(1);
});

test('vaka sayfasında vaka sırası görünmez, kategori isteğe bağlıdır', async ({ page }) => {
  await hazirla(page);
  await page.goto('/vaka-01/');
  await page.locator('#form .if-pitch').fill('x'.repeat(3));
  await expect(page.locator('#form .if-vaka-alan')).toBeHidden();
});

test('alırdım: hazır fiyat tek dokunuşta kaydeder, Perşembe uzaklığı görünür', async ({ page }) => {
  await hazirla(page, tohum({ benimkiler:['Kablo düğümünü önleyen masa altı makarası'] }));
  await page.goto('/fikirler/');
  const kart = page.locator('.icard', { hasText:'numara 0' });
  await kart.locator('.vote').click();
  await kart.locator('.buy-q .chip').nth(1).click();
  await expect(kart.locator('.buy-mine')).toBeVisible();
  await page.goto('/benim/');
  await expect(page.locator('#alirdim .icard')).toHaveCount(1);
  await expect(page.locator('#fikirlerim .hedef')).toContainText('kişi daha');
});

test('örnek kartta alırdım ne olduğunu söyler', async ({ page }) => {
  await hazirla(page);
  await page.goto('/');
  await page.locator('#r1 .icard .vote').first().click();
  await expect(page.locator('#r1 .buy-ex')).toBeVisible();
});

test('ana sayfada fikir aynı sayfada pencerede açılır, ?f= bağlantısı çalışır', async ({ page }) => {
  await hazirla(page, tohum());
  await page.goto('/');
  await page.locator('#r1 .icard .t a').first().click();
  await expect(page.locator('dialog.idlg')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  const adres = page.url();
  await page.goto(adres);
  await expect(page.locator('dialog.idlg')).toBeVisible();
});
