// Events (yonetim/ adds them): the admin adds one, the pill counts down to it, it reads "now" while it runs,
// the events page offers the calendar, and with no event planned the pill is not there at all.
import { test, expect, hazirla, yoneticiGiris } from './yardim.mjs';

// one event in the local preview store, the way the admin panel writes it
async function etkinlik(page, e){
  await page.evaluate(x => {
    const d = JSON.parse(localStorage.getItem('udv-v1') || 'null') || { vakalar:{}, gecmis:{}, gizli:{}, oturum:null };
    d.etkinlikler = { e1: { id:'e1', aciklama:'', baglanti:'', bitis:null, ...x } };
    localStorage.setItem('udv-v1', JSON.stringify(d));
  }, e);
}

test('etkinlik yokken hap görünmez, sayfa bunu söyler', async ({ page }) => {
  await hazirla(page);
  await page.goto('/fikirler/');
  await expect(page.locator('#thu')).toBeHidden();
  await page.goto('/persembe/');
  await expect(page.locator('#bos')).toBeVisible();
  await expect(page.locator('#sayac')).toBeHidden();
});

test('pazartesi 09:00 UTC: perşembe 17:00Z etkinliğine geri sayım, takvim dosyası', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T09:00:00Z'));
  await hazirla(page);
  await etkinlik(page, { baslik:'Ekim değerlendirmesi', baslangic:'2026-10-29T17:00:00.000Z', baglanti:'https://ornek.example/yayin' });
  await page.goto('/fikirler/');
  await expect(page.locator('#thu')).toContainText('Ekim değerlendirmesi');
  await expect(page.locator('#thu b')).toHaveText('3g 8s 00dk');
  await page.goto('/persembe/');
  await expect(page.locator('#ad')).toHaveText('Ekim değerlendirmesi');
  await expect(page.locator('#kalan')).toHaveText('3g 8s 00dk');
  await expect(page.locator('#eylem a.btn.sig')).toHaveAttribute('href', 'https://ornek.example/yayin');
  const ics = decodeURIComponent((await page.locator('#eylem a[download]').getAttribute('href')).split(',')[1]);
  expect(ics).toContain('DTSTART:20261029T170000Z');
  expect(ics).toContain('DTEND:20261029T190000Z');   // no end given: two hours
  expect(ics).toContain('SUMMARY:Ekim değerlendirmesi');
});

test('etkinlik sürerken hap ve sayfa "şimdi" der', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-29T17:30:00Z'));
  await hazirla(page);
  await etkinlik(page, { baslik:'Atölye', baslangic:'2026-10-29T17:00:00.000Z', bitis:'2026-10-29T18:30:00.000Z' });
  await page.goto('/fikirler/');
  await expect(page.locator('#thu')).toHaveClass(/on/);
  await expect(page.locator('#thu')).toContainText('Şimdi: Atölye');
  await page.goto('/persembe/');
  await expect(page.locator('#sayac')).toHaveClass(/on/);
  await expect(page.locator('#kalan')).toHaveText('Şimdi');
});

test('yönetici etkinlik ekler, sitede görünür; siler, kaybolur', async ({ page }) => {
  await hazirla(page);
  await yoneticiGiris(page);
  await page.goto('/yonetim/');
  const f = page.locator('#et-form');
  await f.locator('[name=baslik]').fill('Kasım atölyesi');
  await f.locator('[name=baslangic]').fill('2099-11-05T19:00');
  await f.locator('[name=baglanti]').fill('http://guvensiz.example');
  await f.locator('[type=submit]').click();
  await expect(page.locator('.bildirim, .toast, [role=status]').filter({ hasText:'https' }).first()).toBeVisible();
  await f.locator('[name=baglanti]').fill('https://ornek.example/kayit');
  await f.locator('[type=submit]').click();
  await expect(page.locator('#et-liste')).toContainText('Kasım atölyesi');
  await page.goto('/persembe/');
  await expect(page.locator('#ad')).toHaveText('Kasım atölyesi');
  await page.goto('/yonetim/');
  await page.locator('[data-et-sil]').first().click();
  await page.locator('dialog [data-tamam]').click();
  await expect(page.locator('#et-liste')).toContainText('Henüz etkinlik yok');
  await page.goto('/persembe/');
  await expect(page.locator('#bos')).toBeVisible();
});
