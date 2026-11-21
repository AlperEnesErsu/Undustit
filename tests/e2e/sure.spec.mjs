// A case's idea period (acilis + sure_gun, assets/ud/temel.js vakaSuresi): visitors see the days left; once it has
// run out the idea form gives way to a note, the admin sees the case among the pending work, and reopening a case
// does not restart its period. Publishing a draft lists what it still lacks.
import { test, expect, hazirla, yoneticiGiris } from './yardim.mjs';

const GUN = 864e5;
const vaka = (id, x) => ({ id, baslik:'Kırk bin menteşe', ozet:'Menteşe için fikir', aciklama:'', firma:'Demir AŞ', stok:'menteşe', adet:40000, olcu:'',
  sinif:'', taban_fiyat:1, deneme_adedi:500, sure_gun:30, gorsel:'', model3d:'', ortaklik:true, odul:0, durum:'acik', kapanis:null, kazanan:null,
  olusturan:'test@undustit.local', olusturma:new Date(Date.now() - 40 * GUN).toISOString(), guncelleme:new Date().toISOString(), ...x });
async function tohumla(page, vakalar){
  await hazirla(page);
  await page.evaluate(v => localStorage.setItem('udv-v1', JSON.stringify({ vakalar:v, gecmis:{}, gizli:{} })), vakalar);
}

test('süresi süren vaka kalan günü gösterir; dolan vaka fikir almaz, sayfa bunu söyler', async ({ page }) => {
  await tohumla(page, {
    'mentese': vaka('mentese', { acilis:new Date(Date.now() - 20 * GUN).toISOString() }),
    'vaka-01': vaka('vaka-01', { baslik:'Bir milyon cıvata', acilis:new Date(Date.now() - 31 * GUN).toISOString() })
  });
  await page.goto('/vaka/?id=mentese');
  await expect(page.locator('#kalan')).toContainText('10 gün kaldı');
  await expect(page.locator('#form')).toHaveCount(1);

  await page.goto('/vaka-01/');
  await expect(page.locator('#kalan')).toHaveText('Doldu');
  await expect(page.locator('#doldu')).toContainText('Fikir süresi doldu');
  await expect(page.locator('#form .if-pitch')).toHaveCount(0);

  // the brochure's page: says the case is over, the idea goes to the general ideas
  await page.goto('/fikir/?vaka=vaka-01');
  await expect(page.locator('#case-line')).toContainText('fikir süresi doldu');
});

test('yönetim: dolan vaka bekleyen işlerde; yeniden açmak süreyi baştan başlatmaz', async ({ page }) => {
  const acilis = new Date(Date.now() - 31 * GUN).toISOString();
  await tohumla(page, { 'mentese': vaka('mentese', { acilis }) });
  await yoneticiGiris(page);
  await page.goto('/yonetim/');
  await expect(page.locator('#bekleyen .chip.uyari')).toContainText('süresi doldu');
  await expect(page.locator('#tbody .v-sure.doldu')).toHaveText('Süre doldu');

  await page.goto('/yonetim/vaka/?id=mentese');
  await expect(page.locator('#v-durum .v-sure.doldu')).toContainText('yeni fikir almıyor');
  // review, then open again: the opening date stays, so the period is still over
  await page.locator('[data-gecis="degerlendirme"]').click();
  await page.locator('dialog [data-tamam]').click();
  await expect(page.locator('#v-durum .rozet')).toHaveText('Değerlendirmede');
  await page.locator('[data-gecis="acik"]').click();
  await expect(page.locator('dialog')).toContainText('baştan başlamaz');
  await page.locator('dialog [data-tamam]').click();
  await expect(page.locator('#v-durum .rozet')).toHaveText('Açık');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('udv-v1')).vakalar.mentese.acilis)).toBe(acilis);
});

test('taslağı yayına almadan önce eksikler sayılır, yine de yayına alınabilir', async ({ page }) => {
  await tohumla(page, { 'taslak-1': vaka('taslak-1', { durum:'taslak', acilis:null, ozet:'', deneme_adedi:0 }) });
  await yoneticiGiris(page);
  await page.goto('/yonetim/vaka/?id=taslak-1');
  await page.locator('[data-gecis="acik"]').click();
  const d = page.locator('dialog');
  await expect(d.locator('.onay-liste li')).toHaveCount(4);
  await expect(d).toContainText('Ürün fotoğrafı yok');
  await expect(d).toContainText('Firma erişimi yok');
  await expect(d).toContainText('30 gün');
  await d.locator('[data-tamam]').click();
  await expect(page.locator('#v-durum .rozet')).toHaveText('Açık');
  await expect(page.locator('#v-durum .v-sure')).toContainText('30 gün kaldı');
});

test('sonuç: değerlendirmede en çok talep görenler, kazanan seçilince kazanan ve sıralama', async ({ page }) => {
  await hazirla(page);
  await page.evaluate(() => {
    const at = new Date().toISOString();
    const it = (k, t) => ({ k, title:t, cat:'Kırk bin menteşe', caseId:'mentese', problem:'', solution:'', feats:[], handle:'Ayşe K.', at });
    localStorage.setItem('ud-store-v1', JSON.stringify({ ideas:{ 'u-x':{ items:[it('a', 'Menteşeli katlanır raf sistemi'), it('b', 'Menteşeden kapı tamponu yapmak')] } },
      votes:{ v1:{ buy:{ 'u-x:a':300, 'u-x:b':50 }, rate:{} }, v2:{ buy:{ 'u-x:a':200 }, rate:{} } }, notes:{} }));
  });
  const kaydet = x => page.evaluate(v => localStorage.setItem('udv-v1', JSON.stringify({ vakalar:{ mentese:v }, gecmis:{}, gizli:{} })), x);
  await kaydet(vaka('mentese', { durum:'degerlendirme', acilis:new Date(Date.now() - 31 * GUN).toISOString() }));
  await page.goto('/vaka/?id=mentese');
  const s = page.locator('#sonuc .sonuc');
  await expect(s).toContainText('Değerlendirmede');
  await expect(s.locator('.sn-liste li').first()).toContainText('katlanır raf');
  await expect(page.locator('#form')).toHaveCount(0);

  await kaydet(vaka('mentese', { durum:'kazanan', kazanan:'u-x:b', acilis:new Date(Date.now() - 31 * GUN).toISOString() }));
  await page.reload();
  await expect(s.locator('.sn-kazanan')).toContainText('kapı tamponu');
  await expect(s.locator('.sn-kazanan')).toContainText('Ayşe K. yazdı');
  await expect(s.locator('.sn-liste li')).toHaveCount(1);
  await expect(s.locator('.sn-liste li')).toContainText('katlanır raf');
});

test('vaka 01 değerlendirmeye geçince form yerine sonuç çıkar', async ({ page }) => {
  await tohumla(page, { 'vaka-01': vaka('vaka-01', { baslik:'Bir milyon cıvata', durum:'degerlendirme', acilis:new Date(Date.now() - 60 * GUN).toISOString() }) });
  await page.goto('/vaka-01/');
  await expect(page.locator('#sonuc .sonuc')).toContainText('Değerlendirmede');
  await expect(page.locator('#form')).toHaveCount(0);
});
