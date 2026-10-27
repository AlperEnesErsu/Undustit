// What reaches only the admin: a report, a contact message, a case application (with its photo); hiding a
// reported idea; and the case photo the admin uploads, shown in the technical sheet.
import { test, expect, hazirla, tohum, yoneticiGiris, ADMIN, ADMIN_SIFRE } from './yardim.mjs';

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

test('yönetici firma ekler; firma panelde kendi vakasını, talepleri ve fiyat dağılımını görür, fotoğraf yükler', async ({ page }) => {
  const veri = tohum({ benimkiler:['Cıvatalı bisiklet askısı'] });
  veri.votes.v0.buy['local:m0'] = 250; veri.votes.v1.buy['local:m0'] = 400;
  await hazirla(page, veri);
  // a stranger cannot get in
  await page.goto('/firma/');
  await page.fill('main [name=eposta]', 'kimse@firma.test');
  await page.locator('main [type=submit]').click();
  await expect(page.locator('main .durum')).toHaveText('Bu e-postaya bağlı vaka yok');
  await yoneticiGiris(page);
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('#t-firma').click();
  await page.fill('#firma-form [name=eposta]', 'Satis@Firma.test');
  await page.locator('#firma-form [type=submit]').click();
  await expect(page.locator('#firmalar')).toContainText('satis@firma.test');
  await page.evaluate(() => UDV.cikis());
  await page.goto('/firma/');
  await page.fill('main [name=eposta]', 'satis@firma.test');
  await page.locator('main [type=submit]').click();
  await expect(page.locator('main h1')).toHaveText('Bir milyon cıvata');
  const istat = ad => page.locator('.istat', { has: page.locator('span', { hasText: new RegExp('^' + ad + '$') }) }).locator('b');
  await expect(istat('Fikir')).toHaveText('1');
  await expect(istat('Alırdım')).toHaveText('2');
  await expect(istat('Ortalama fiyat')).toHaveText('325 ₺');
  await expect(page.locator('#dagilim tbody tr')).toHaveCount(2);
  await expect(page.locator('#fikirler tbody tr').first()).toContainText('Cıvatalı bisiklet askısı');
  // only the other ideas' owners' case is untouched: the six non-case ideas are not listed
  await expect(page.locator('#fikirler tbody tr')).toHaveCount(1);
  await page.locator('#f-foto').setInputFiles(FOTO);
  await expect(page.locator('#foto img')).toHaveAttribute('src', /^data:image\/jpeg/);
  await page.goto('/vaka-01/');
  await expect(page.locator('#foy-gorsel img')).toHaveAttribute('src', /^data:image\/jpeg/);
});

test('kişi simgesi giriş sayfasını açar; yönetici yönetime, firma firma paneline geçer', async ({ page }) => {
  await hazirla(page);
  await page.goto('/');
  await page.locator('header a.ben').click();
  await expect(page).toHaveURL(/\/giris\/$/);
  // sign-in is the first tab; sign-up is one tap away
  await expect(page.locator('#kart h1')).toHaveText('Tekrar hoş geldin.');
  await expect(page.locator('#kart [role=tab]').first()).toHaveText('Giriş yap');
  await page.locator('[data-mod=kayit]').click();
  await expect(page.locator('#kart h1')).toHaveText('Hesabını aç.');
  // the local preview opens no member accounts and says so
  await page.fill('#kart [name=e]', 'uye@ornek.test');
  await page.fill('#kart [name=s]', 'uzunbirsifre');
  await page.locator('#kart [type=submit]').click();
  await expect(page.locator('#kart .durum')).toContainText('Yerel önizlemede');
  await page.locator('[data-mod=giris]').click();
  await page.fill('#kart [name=e]', ADMIN);
  await page.fill('#kart [name=s]', 'yanlis');
  await page.locator('#kart [type=submit]').click();
  await expect(page.locator('#kart .durum')).toHaveClass(/bad/);
  await page.fill('#kart [name=s]', ADMIN_SIFRE);
  await page.locator('#kart [type=submit]').click();
  await expect(page).toHaveURL(/\/yonetim\/$/);
  // a company: the admin adds its e-mail, then it signs in from the same door
  await page.evaluate(() => UDV.firma.ekle('vaka-01', 'satis@firma.test'));
  await page.evaluate(() => UDV.cikis());
  await page.goto('/giris/?mod=giris');
  await page.fill('#kart [name=e]', 'satis@firma.test');
  await page.fill('#kart [name=s]', 'herhangi');
  await page.locator('#kart [type=submit]').click();
  await expect(page).toHaveURL(/\/firma\/$/);
  await expect(page.locator('main h1')).toHaveText('Bir milyon cıvata');
});

test('rapor toplamları, vaka satırları ve en çok istenen fikri verir', async ({ page }) => {
  // tohum: altı fikir, n. fikre 2+n kişi 100+20n ₺ der → 27 alırdım, 7 kişi, 4.400 ₺; benim fikrim Vaka 01'de
  await hazirla(page, tohum({ benimkiler:['Cıvatalı bisiklet askısı'] }));
  await yoneticiGiris(page);
  await page.goto('/yonetim/rapor/');
  const istat = ad => page.locator('.istat', { has: page.locator('span', { hasText: new RegExp('^' + ad + '$') }) });
  await expect(istat('Fikir').locator('b')).toHaveText('7');
  await expect(istat('Alırdım').locator('b')).toHaveText('27');
  await expect(istat('Alırdım')).toContainText('7 kişi');
  await expect(istat('Talep tutarı').locator('b')).toHaveText('4.400 ₺');
  await expect(page.locator('#vakalar tbody tr', { hasText:'Bir milyon cıvata' }).locator('td').nth(1)).toHaveText('1');
  await expect(page.locator('#vakalar tbody tr', { hasText:'Vakadan bağımsız' }).locator('td').nth(2)).toHaveText('27');
  await expect(page.locator('#fikirler tbody tr').first()).toContainText('Başka bir fikir numara 5');
  const indirme = page.waitForEvent('download');
  await page.locator('[data-csv]').click();
  expect((await indirme).suggestedFilename()).toMatch(/^undustit-fikirler-\d{4}-\d\d-\d\d\.csv$/);
});
