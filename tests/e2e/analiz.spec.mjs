// The admin's Analiz (supabase/26-olcum.sql): pages, presses and the site's moments are counted per browser, admin
// pages are not; the admin sees totals, the way from a visit to an idea, the parts of a page pressed, and one
// browser's whole way through the site.
import { test, expect, hazirla, yoneticiGiris } from './yardim.mjs';

test('Analiz: sayfalar, tıklamalar ve olaylar sayılır; yönetim sayılmaz; ziyaretçinin yolculuğu görünür', async ({ page }) => {
  await hazirla(page);
  await page.goto('/fikirler/');
  await page.goto('/fikir/?vaka=vaka-01');
  await page.goto('/');
  // a press on the home page's menu is counted with its part of the page
  await Promise.all([page.waitForURL(/\/fikirler\/$/), page.locator('a[href="fikirler/"]:visible').first().click()]);
  await page.evaluate(() => window.UD_IC.olcu('Fikir gönderildi', { vaka:'vaka-01' }));
  const kayit = await page.evaluate(() => JSON.parse(localStorage.getItem('ud-olcum')));
  const tik = kayit.find(x => x.kind === 'click');
  expect(tik && tik.path).toBe('/');
  expect(tik.name).toMatch(/^[a-z]+\.[a-z0-9.]+$|^\/fikirler\/$/);   // the link's text key, or its page
  expect(tik.detail).toMatch(/^[a-z0-9_-]+$/);

  await yoneticiGiris(page);
  await page.locator('.y-yan a', { hasText:'Analiz' }).click();
  await expect(page).toHaveURL(/\/yonetim\/analiz\/$/);
  const sayfaSayisi = kayit.filter(x => x.kind === 'page').length;
  await expect(page.locator('[data-a="goruntuleme"]')).toHaveText(String(sayfaSayisi));
  await expect(page.locator('[data-a="ziyaretci"]')).toHaveText('1');
  await expect(page.locator('[data-a="yazan"]')).toHaveText('1');
  await expect(page.locator('.a-cubuk')).toHaveCount(30);
  await expect(page.locator('#a-huni')).toContainText('Bir şeye tıkladı');
  await expect(page.locator('#a-tik .yatay li')).not.toHaveCount(0);
  await expect(page.locator('#a-tablolar')).toContainText('Fikir yaz · vaka-01');
  await expect(page.locator('#a-tablolar')).not.toContainText('/yonetim');

  // the visitor and their way through the site
  await expect(page.locator('#a-ziyaretciler tr[data-cihaz]')).toHaveCount(1);
  await page.locator('[data-yolculuk]').click();
  const d = page.locator('dialog.diyalog');
  await expect(d).toContainText('Açtı: Fikirler');
  await expect(d).toContainText('Tıkladı:');
  await expect(d).toContainText('Fikir gönderildi');
  await d.getByRole('button', { name:'Kapat' }).click();
  await expect(d).toHaveCount(0);

  await page.getByRole('tab', { name:'Son 7 gün' }).click();
  await expect(page.locator('.a-cubuk')).toHaveCount(7);
});
