// Cloudflare's "are you human" check (Turnstile, assets/ud/temel.js captcha): when it wants a tick, it sits in
// the middle of a dimmed page with a line saying why, never as a forgotten box at the bottom; "Vazgeç" stops
// the sign-in with its own message. Cloudflare is a stand-in here that always asks for the tick.
import { test, expect } from './yardim.mjs';

const AYAR = "window.UD_AYAR = { supabaseUrl:'', supabaseAnon:'', adminler:['test@undustit.local'], analitik:'', iletisim:'', yasal:false, yayin:'', turnstile:'deneme-anahtari' };";
const SAHTE_TURNSTILE = `window.turnstile = {
  render(yer, o){ const k = document.createElement('label'); k.className = 'sahte-ts'; k.innerHTML = '<input type="checkbox"> Gerçek kişi olduğunuzu doğrulayın';
    yer.append(k); setTimeout(() => o['before-interactive-callback'] && o['before-interactive-callback'](), 50);
    k.querySelector('input').addEventListener('change', () => o.callback('jeton-123')); return 'w1'; },
  remove(){}, reset(){} };`;

test.beforeEach(async ({ page }) => {
  await page.route('**/assets/ayar.js', r => r.fulfill({ contentType:'text/javascript', body:AYAR }));
  await page.route('https://challenges.cloudflare.com/**', r => r.fulfill({ contentType:'text/javascript', body:SAHTE_TURNSTILE }));
});

test('doğrulama kutusu ekranın ortasında açıklamasıyla çıkar; işaretlenince işlem sürer', async ({ page }) => {
  await page.goto('/giris/?mod=giris');
  await page.waitForFunction(() => window.UD);
  const jeton = page.evaluate(() => UD.captcha());
  const kutu = page.locator('.ts-kutu.acik');
  await expect(kutu).toBeVisible();
  await expect(kutu).toContainText('Son bir adım');
  // in the middle of the screen, not at its bottom edge
  const b = await kutu.locator('.ts-kart').boundingBox(), vp = page.viewportSize();
  expect(Math.abs(b.y + b.height / 2 - vp.height / 2)).toBeLessThan(vp.height / 4);
  await kutu.locator('.sahte-ts input').click();
  expect(await jeton).toBe('jeton-123');
  await expect(page.locator('.ts-kutu')).toHaveCount(0);
});

test('Vazgeç girişi durdurur ve bunu söyler; şifre yanlış demez', async ({ page }) => {
  await page.goto('/giris/?mod=giris');
  await page.fill('#kart [name=e]', 'test@undustit.local');
  await page.fill('#kart [name=s]', 'undustit');
  // sign-in asks for the check first (assets/veri.js tsJeton); locally the page then tries the company door too
  await page.evaluate(() => {
    let son = null;
    window.UDV.giris = () => window.UD.captcha().then(() => ({}), e => { son = e; throw e; });
    window.UDV.firma.giris = () => Promise.reject(son);
  });
  await page.locator('#kart [type=submit]').click();
  await page.locator('.ts-kutu.acik').getByRole('button', { name:'Vazgeç' }).click();
  await expect(page.locator('#kart .durum')).toHaveText('Doğrulama yapılmadı, işlem durduruldu.');
  await expect(page.locator('.ts-kutu')).toHaveCount(0);
});
