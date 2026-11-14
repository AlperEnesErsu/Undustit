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
  await satir.locator('[data-kaydet]').click();
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('udv-v1')).gizli).length)).toBe(1);
  // the row is read back: it says the idea is hidden, and nothing waits any more
  await expect(satir.locator('.rozet')).toHaveText('Gizli');
  await expect(page.locator('#bekleyen')).toContainText('bekleyen iş yok');
  // deciding otherwise puts the idea back on the site
  await satir.locator('select').selectOption('yok_sayildi');
  await expect(satir.locator('.rozet')).toHaveText('Gizli');   // nothing changes until "Kaydet"
  await satir.locator('[data-kaydet]').click();
  await expect(satir.locator('.rozet')).toHaveText('Yayında');
});

test('iletişim formu doğrular, gönderir, yönetimde görünür', async ({ page }) => {
  await hazirla(page);
  await page.goto('/iletisim/');
  await page.locator('.ilet-f [type=submit]').click();
  // an empty field is pointed at under the field itself (no red line), and typing clears the note
  await expect(page.locator('.ilet-f [name=eposta]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.ilet-f .alan-not')).toBeVisible();
  await expect(page.locator('.ilet-f .durum')).not.toHaveClass(/bad/);
  await page.fill('.ilet-f [name=eposta]', 'deneme@example.test');
  await expect(page.locator('.ilet-f .alan-not')).toHaveCount(0);
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
  await page.goto('/nasil/');
  await page.locator('#basvuru button').click();
  const f = page.locator('form.basvuru');
  await f.locator('[name=firma]').fill('Örnek Metal A.Ş.');
  await f.locator('[name=stok]').fill('20.000 paslanmaz menteşe');
  await f.locator('[name=adet]').fill('20.000 adet');
  await f.locator('[name=olcu]').fill('40 × 40 mm');
  await f.locator('[name=taban_fiyat]').fill('adedi 2,5 ₺');
  // the prize amount is asked only once a prize is on offer
  await expect(f.locator('[name=odul]')).toBeHidden();
  await f.locator('label.chip', { hasText:'Fikir ödülü' }).click();
  await f.locator('[name=odul]').fill('5.000 ₺');
  await f.locator('[name=baslik]').fill('Yirmi bin menteşe');
  await f.locator('[name=ozet]').fill('Depoda bekleyen menteşelere yeni bir iş arıyoruz.');
  await f.locator('[name=sinif]').fill('A kalite');
  await f.locator('[name=deneme_adedi]').fill('1.000');
  await f.locator('[name=eposta]').fill('satis@example.test');
  await f.locator('[name=gorsel]').setInputFiles(FOTO);
  await f.locator('[name=onay]').check();
  await f.locator('[type=submit]').click();
  await expect(page.locator('.basvuru-tamam')).toBeVisible();
  await yoneticiGiris(page);
  const satir = page.locator('#basvurular-tbody tr', { hasText:'Örnek Metal' });
  await expect(satir.locator('img.b-gorsel')).toHaveAttribute('src', /^data:image\/jpeg/);
  await satir.locator('select').selectOption('incelendi');
  await satir.locator('[data-kaydet]').click();
  await expect.poll(() => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('udv-vaka_basvurulari')))[0].durum)).toBe('incelendi');
  await expect(satir).toContainText('40 × 40 mm');
  await expect(satir).toContainText('Fikir ödülü');
  // the company sees where its application stands before any case exists
  await page.evaluate(() => UDV.cikis());
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('udv-v1')); d.oturum = { id:'yerel:satis@example.test', email:'satis@example.test', rol:'uye' }; localStorage.setItem('udv-v1', JSON.stringify(d)); });
  await page.goto('/firma/');
  await expect(page.locator('.f-basvuru li')).toContainText('İncelendi');
  // "Vaka oluştur": the case form opens filled in; creating it accepts the application and lets the company in
  await yoneticiGiris(page);
  await page.locator('#basvurular-tbody tr', { hasText:'Örnek Metal' }).getByRole('link', { name:'Vaka oluştur' }).click();
  await expect(page.locator('#vaka-form [name=firma]')).toHaveValue('Örnek Metal A.Ş.');
  await expect(page.locator('#vaka-form [name=adet]')).toHaveValue('20000');
  await expect(page.locator('#vaka-form [name=taban_fiyat]')).toHaveValue('2.5');
  await expect(page.locator('#vaka-form [name=ortaklik]')).not.toBeChecked();
  // what the company wrote about its own case is already there: the admin only checks and creates
  await expect(page.locator('#vaka-form [name=baslik]')).toHaveValue('Yirmi bin menteşe');
  await expect(page.locator('#vaka-form [name=ozet]')).toHaveValue(/yeni bir iş arıyoruz/);
  await expect(page.locator('#vaka-form [name=sinif]')).toHaveValue('A kalite');
  await expect(page.locator('#vaka-form [name=deneme_adedi]')).toHaveValue('1000');
  await expect(page.locator('#vaka-form [name=odul]')).toHaveValue('5000');
  await page.locator('#vaka-form [type=submit]').click();
  await expect(page).toHaveURL(/\?id=yirmi-bin-mentese/);
  const son = await page.evaluate(() => ({ b:Object.values(JSON.parse(localStorage.getItem('udv-vaka_basvurulari')))[0], f:JSON.parse(localStorage.getItem('udv-v1')).firmalar }));
  expect(son.b.durum).toBe('kabul');
  expect(son.b.vaka_id).toBe('yirmi-bin-mentese');
  expect(son.f['yirmi-bin-mentese']).toEqual(['satis@example.test']);
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
  // the panel sends a stranger to the one sign-in door, and that door does not let an unknown address in
  await page.goto('/firma/');
  await page.locator('main a.btn.sig').click();
  await expect(page).toHaveURL(/\/giris\/\?mod=giris$/);
  await page.fill('#kart [name=e]', 'kimse@firma.test');
  await page.fill('#kart [name=s]', 'herhangi');
  await page.locator('#kart [type=submit]').click();
  await expect(page.locator('#kart .durum')).toHaveClass(/bad/);
  await expect(page).toHaveURL(/\/giris\//);
  await yoneticiGiris(page);
  await page.goto('/yonetim/vaka/?id=vaka-01');
  await page.locator('#t-firma').click();
  await page.fill('#firma-form [name=eposta]', 'Satis@Firma.test');
  await page.locator('#firma-form [type=submit]').click();
  await expect(page.locator('#firmalar')).toContainText('satis@firma.test');
  await page.evaluate(() => UDV.cikis());
  await page.goto('/giris/?mod=giris');
  await page.fill('#kart [name=e]', 'satis@firma.test');
  await page.fill('#kart [name=s]', 'herhangi');
  await page.locator('#kart [type=submit]').click();
  await expect(page).toHaveURL(/\/firma\/$/);
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
  await page.waitForFunction(() => window.UDV);   // the redirect has landed, the page's scripts may still be loading
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

test('içerik: vakasız fikir ve yorum yönetimde görünür, gizlenince siteden kalkar', async ({ page }) => {
  const veri = tohum();
  veri.notes = { 'u-y': { items:[{ k:'n1', idea:'u-x:x4', kind:'yorum', text:'Bu yorum gizlenecek', handle:'biri', at:new Date().toISOString() }] } };
  await hazirla(page, veri);
  await yoneticiGiris(page);
  // the summary counts every idea, not only the ones written for a case
  const fikirSayisi = page.locator('.istat', { has: page.locator('span', { hasText:/^Fikir$/ }) });
  await expect(fikirSayisi.locator('b')).toHaveText('6');
  await page.goto('/yonetim/icerik/');
  await expect(page.locator('#fikir-tbody tr')).toHaveCount(6);
  await page.locator('#fikir-tbody tr', { hasText:'numara 5' }).locator('button[data-gizle]').click();
  await expect(page.locator('#fikir-tbody tr', { hasText:'numara 5' }).locator('.rozet')).toHaveText('Gizli');
  await expect(page.locator('#fikir-sayac')).toContainText('1 gizli');
  await page.locator('#yorum-tbody tr', { hasText:'gizlenecek' }).locator('button[data-gizle]').click();
  await expect(page.locator('#yorum-sayac')).toContainText('1 gizli');
  await page.locator('[data-filtre="fikir"][data-gizli="1"]').click();
  await expect(page.locator('#fikir-tbody tr')).toHaveCount(1);
  // on the site: the hidden idea is gone from the list, the hidden comment from its idea
  await page.goto('/fikirler/');
  await expect(page.locator('.icard').first()).toBeVisible();
  await expect(page.locator('.icard', { hasText:'numara 5' })).toHaveCount(0);
  await page.locator('.icard .t a', { hasText:'numara 4' }).click();
  await expect(page.locator('dialog .notes')).not.toContainText('gizlenecek');
  // and the summary says one is hidden
  await page.goto('/yonetim/');
  await expect(fikirSayisi).toContainText('1 gizli');
  await expect(fikirSayisi.locator('b')).toHaveText('5');
});

test('ürün talebi: vaka sayfasından gönderilir, yönetimde durumuyla görünür', async ({ page }) => {
  await hazirla(page);
  await page.goto('/vaka-01/');
  await page.locator('.numune button').click();
  const f = page.locator('form.numune-f');
  await f.locator('[type=submit]').click();
  await expect(f.locator('[name=ad]')).toHaveAttribute('aria-invalid', 'true');
  await f.locator('label', { hasText:'Satın almak istiyorum' }).click();
  await f.locator('[name=ad]').fill('Deneme Kişi');
  await f.locator('[name=eposta]').fill('alici@example.test');
  await f.locator('[name=adet]').fill('20 adet');
  await f.locator('[name=onay]').check();
  await f.locator('[type=submit]').click();
  await expect(page.locator('.numune-tamam')).toContainText('alici@example.test');
  await yoneticiGiris(page);
  const satir = page.locator('#numuneler-tbody tr', { hasText:'Deneme Kişi' });
  await expect(satir).toContainText('Satın almak');
  await expect(satir).toContainText('20 adet');
  await satir.locator('select').selectOption('arandi');
  await satir.locator('[data-kaydet]').click();
  await expect.poll(() => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('udv-numune_talepleri')))[0].durum)).toBe('arandi');
});

test('yönetici kullanıcı adı oluşturur; e-posta yerine onunla giriş yapar', async ({ page }) => {
  await hazirla(page);
  await yoneticiGiris(page);
  await page.goto('/yonetim/');
  await expect(page.locator('#ka-durum')).toContainText('Henüz kullanıcı adın yok');
  await page.locator('#ka-form [name=ad]').fill('Alper.Y');
  await page.locator('#ka-form [type=submit]').click();
  await expect(page.locator('#ka-durum')).toContainText('alper.y kullanıcı adıyla');
  await page.evaluate(() => UDV.cikis());
  // the one door for everyone takes the username too
  await page.goto('/giris/?mod=giris');
  await page.fill('#kart [name=e]', 'yanlis.ad');
  await page.fill('#kart [name=s]', ADMIN_SIFRE);
  await page.locator('#kart [type=submit]').click();
  await expect(page.locator('#kart .durum')).toHaveClass(/bad/);
  await page.fill('#kart [name=e]', 'alper.y');
  await page.locator('#kart [type=submit]').click();
  await expect(page).toHaveURL(/\/yonetim\/$/);
  // and so does the admin panel's own sign-in box
  await page.waitForFunction(() => window.UDV);
  await page.evaluate(() => UDV.cikis());
  await page.locator('.y-giris [name=email]').fill('alper.y');
  await page.locator('.y-giris [name=sifre]').fill(ADMIN_SIFRE);
  await page.locator('.y-giris [type=submit]').click();
  await expect(page.locator('#ka-durum')).toContainText(ADMIN);
});
