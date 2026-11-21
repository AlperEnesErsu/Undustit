// The brochure's QR (undustit.com/brosur): it lands on the case's idea page with the printed poster on top, the
// visit is counted once for "brosur", and the admin's "Ne kadar çalıştı?" shows who came and who then wrote an idea.
import { test, expect, hazirla, yoneticiGiris } from './yardim.mjs';

test('/brosur vakanın fikir sayfasına yönlendirir', async ({ request }) => {
  for (const yol of ['/brosur', '/brosur/']){
    const r = await request.get(yol, { maxRedirects:0 });
    expect(r.status(), yol).toBe(302);
    expect(r.headers()['location']).toBe('/fikir/?vaka=vaka-01&k=brosur');
  }
});

test('QR ile gelen afişi görür, kapatır; adres temizlenir, geliş bir kez sayılır', async ({ page }) => {
  await hazirla(page);
  await page.goto('/brosur');
  await expect(page).toHaveURL(/\/fikir\/\?vaka=vaka-01$/);
  const afis = page.locator('dialog.afis-dlg');
  await expect(afis).toBeVisible();
  await expect(afis.locator('img')).toHaveAttribute('alt', /Challenge #001/);
  expect(await afis.locator('img').evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  await afis.getByRole('button', { name:'Kapat' }).click();
  await expect(afis).toHaveCount(0);
  const ilk = await page.evaluate(() => JSON.parse(localStorage.getItem('ud-kaynak-ziyaret')).brosur);
  expect(ilk).toBeTruthy();
  // a reload (the k is gone) opens the page alone; a second scan does not move the first visit
  await page.reload();
  await expect(page.locator('dialog.afis-dlg')).toHaveCount(0);
  await page.goto('/brosur');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.afis-dlg')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ud-kaynak-ziyaret')).brosur)).toBe(ilk);
});

test('Ne kadar çalıştı: gelen ve sonra fikir yazan sayılır; yeni bağlantı kaydedilir', async ({ page }) => {
  await hazirla(page);
  await page.goto('/brosur');
  await page.locator('dialog.afis-dlg').getByRole('button', { name:'Kapat' }).click();
  // one idea from before the visit (not counted), one after it
  await page.evaluate(() => {
    const ilk = JSON.parse(localStorage.getItem('ud-kaynak-ziyaret')).brosur;
    const once = new Date(Date.parse(ilk) - 60000).toISOString(), sonra = new Date(Date.parse(ilk) + 60000).toISOString();
    const it = (k, at) => ({ k, title:'Fikir ' + k, cat:'Vaka 01 · Cıvata', caseId:'vaka-01', problem:'', solution:'', feats:[], handle:'d', at });
    localStorage.setItem('ud-store-v1', JSON.stringify({ ideas:{ local:{ items:[it('a', once), it('b', sonra)] } }, votes:{}, notes:{} }));
  });
  await yoneticiGiris(page);
  await page.locator('.y-yan a', { hasText:'Ne kadar çalıştı' }).click();
  const satir = page.locator('tr[data-id="brosur"]');
  await expect(satir).toContainText('Broşür QR');
  await expect(satir).toContainText('https://undustit.com/fikir/?vaka=vaka-01&k=brosur');
  await expect(satir.locator('[data-sutun="gelen"]')).toHaveText('1');
  await expect(satir.locator('[data-sutun="yazan"]')).toContainText('100%');
  await expect(satir.locator('[data-sutun="fikir"]')).toHaveText('1');

  const form = page.locator('#k-form');
  await form.locator('[name=ad]').fill('Afiş');
  await form.locator('[name=baslik]').fill('Kampüs afişi');
  await form.locator('[type=submit]').click();
  await expect(page.locator('tr[data-id="afis"]')).toHaveCount(0);   // "ş" is refused, nothing saved
  await form.locator('[name=ad]').fill('afis-kampus');
  await form.locator('[type=submit]').click();
  await expect(page.locator('#k-sonuc')).toContainText('https://undustit.com/fikir/?vaka=vaka-01&k=afis-kampus');
  await expect(page.locator('tr[data-id="afis-kampus"]')).toContainText('Kampüs afişi');
});
