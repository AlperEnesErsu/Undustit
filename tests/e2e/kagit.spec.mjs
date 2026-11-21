// Ideas written on paper (the brochure's box): the admin types each into the case; it shows on the site like any
// idea under the name chosen, the writer's contact stays in the admin panel, Ne kadar çalıştı counts it.
import { test, expect, hazirla, yoneticiGiris } from './yardim.mjs';

test('kâğıttan fikir girilir: sitede görünür, iletişim yalnız yönetimde, broşür altında sayılır', async ({ page }) => {
  await hazirla(page);
  await yoneticiGiris(page);
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('#t-fikirler').click();
  await page.locator('#kagit summary').click();
  const f = page.locator('#kagit-form');
  await expect(f.locator('[name=kaynak]')).toHaveValue('brosur');
  // too short is refused, nothing saved
  await f.locator('[name=baslik]').fill('Kısa');
  await f.locator('[type=submit]').click();
  await expect(page.locator('#fikirler tbody tr')).toHaveCount(0);
  await f.locator('[name=baslik]').fill('Cıvatalardan bisiklet park yeri');
  await f.locator('[name=ad]').fill('Ayşe K.');
  await f.locator('[name=iletisim]').fill('ayse@ornek.com');
  await f.locator('[type=submit]').click();
  await expect(page.locator('#kagit-sayac')).toHaveText('Bu oturumda 1 kâğıt girildi.');
  await expect(f.locator('[name=baslik]')).toHaveValue('');
  await expect(f.locator('[name=kaynak]')).toHaveValue('brosur');
  const satir = page.locator('#fikirler tbody tr', { hasText:'bisiklet park yeri' });
  await expect(satir.locator('.kagit-rozet')).toHaveText('Kâğıt');
  await expect(satir).toContainText('ayse@ornek.com');

  // the site: the idea under the case, the name, never the contact
  await page.goto('/vaka-01/');
  const kart = page.locator('#board', { hasText:'bisiklet park yeri' });
  await expect(kart).toContainText('Ayşe K.');
  await expect(page.locator('body')).not.toContainText('ayse@ornek.com');

  await page.goto('/yonetim/kaynak/');
  await expect(page.locator('tr[data-id="brosur"] [data-sutun="kagit"]')).toHaveText('1');
});
