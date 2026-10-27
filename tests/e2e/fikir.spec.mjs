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

test('paylaş: görsel kart hazırlanır, ağ bağlantıları fikrin adresini taşır', async ({ page }, info) => {
  await hazirla(page, tohum());
  await page.goto('/fikirler/');
  await page.locator('.icard', { hasText:'numara 5' }).locator('.t a').click();
  await page.locator('dialog.idlg .sh').click();
  const panel = page.locator('dialog.paylas-dlg');
  await expect(panel).toBeVisible();
  const gorsel = panel.locator('.pl-kart img');
  await expect(gorsel).toHaveAttribute('src', /^blob:/);
  // the card is a real 4:5 picture, not an empty canvas
  expect(await gorsel.evaluate(i => i.decode().then(() => [i.naturalWidth, i.naturalHeight]))).toEqual([1080, 1350]);
  await expect(panel.locator('.pl-indir')).toBeVisible();
  // every network gets the idea's own address; the ones that take text also get the sentence
  const href = async ag => decodeURIComponent(await panel.locator(`[data-ag=${ag}]`).getAttribute('href'));
  const wa = await href('whatsapp'), x = await href('x'), li = await href('linkedin'), fb = await href('facebook');
  expect(wa).toMatch(/^https:\/\/wa\.me\/\?text=Bunu alır mıydın\? “Başka bir fikir numara 5”.*fikirler\/\?f=/);
  expect(x).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=.*numara 5.*&url=http.*fikirler\/\?f=/);
  expect(li).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=http.*fikirler\/\?f=/);
  expect(fb).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=http.*fikirler\/\?f=/);
  expect(await href('reddit')).toMatch(/^https:\/\/www\.reddit\.com\/submit\?url=http.*fikirler\/\?f=.*&title=Bunu alır mıydın\? “Başka bir fikir numara 5” Fiyatını yaz$/);
  for (const ag of ['whatsapp', 'x', 'linkedin', 'facebook', 'reddit']) await expect(panel.locator(`[data-ag=${ag}]`)).toHaveAttribute('target', '_blank');
  // the link that is shared really opens this idea
  const adres = await panel.locator('.pl-link input').inputValue();
  await page.goto(adres);
  await expect(page.locator('dialog.idlg h2')).toContainText('numara 5');
  if (process.env.KART_GORSEL) await gorsel.screenshot({ path: process.env.KART_GORSEL + '-' + info.project.name + '.png' });
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
