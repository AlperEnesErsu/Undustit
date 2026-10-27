// Every public page opens without JS errors, has a heading and a title, and never scrolls sideways.
import { test, expect } from './yardim.mjs';

const SAYFALAR = ['/', '/fikir/', '/fikirler/', '/vakalar/', '/vaka-01/', '/vaka/?id=vaka-01', '/nasil/', '/hikaye/',
  '/persembe/', '/iletisim/', '/benim/', '/kvkk/', '/kosullar/', '/yonetim/', '/yonetim/rapor/', '/firma/', '/giris/', '/olmayan-sayfa/'];

for (const yol of SAYFALAR){
  test(`açılıyor: ${yol}`, async ({ page }) => {
    const r = await page.goto(yol);
    expect(r.status()).toBe(yol === '/olmayan-sayfa/' ? 404 : 200);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).toHaveTitle(/Undustit/);
    const tasma = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(tasma, 'yatay taşma').toBeLessThanOrEqual(1);
  });
}

// English is complete where people sign in: no Turkish word left on the sign-in page or the company panel's door
test('giriş sayfası ve firma paneli İngilizcede tamamen İngilizce', async ({ page }) => {
  for (const yol of ['/giris/?dil=en', '/giris/?dil=en&mod=kayit', '/firma/?dil=en']){
    await page.goto(yol);
    await expect(page.locator('main h1')).not.toHaveText(/Yükleniyor/);
    const metin = await page.locator('main').innerText();
    expect(metin, yol).not.toMatch(/[ğışçöüĞİŞÇÖÜ]|Giriş|Kayıt|Firma|vaka/);
  }
});

test('İngilizce sayfa metni İngilizce', async ({ page }) => {
  await page.goto('/vakalar/?dil=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).not.toContainText('Fazla stok');
});

test('yasal sayfalar arama motorlarına kapalı ve alt bilgide yok', async ({ page }) => {
  await page.goto('/kvkk/');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
  await page.goto('/');
  await expect(page.locator('footer a[href$="kvkk/"]')).toHaveCount(0);
  await expect(page.locator('footer a[href$="iletisim/"]')).toHaveCount(1);
});
