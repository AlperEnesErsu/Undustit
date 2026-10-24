# Ürün sözleşmesi: tasarım sistemi, veri katmanı, yönetim paneli

Bu belge üç parçanın birbirine nasıl bağlandığını sabitler; her parça ayrı yazılabilir. Sınıf adları,
fonksiyon adları ve alanlar burada yazdığı gibi kullanılır. Değişmesi gerekirse önce bu belge değişir.

Proje statik bir site: GitHub Pages, derleme adımı yok, düz HTML + CSS + tarayıcı JS (ES2020, modül yok,
`(function(){ ... })()` içinde). Her sayfa `<html lang="tr" data-root="../" data-page="...">` ile başlar,
`<head>`'de `assets/fonts/base.css`, `assets/ud.css`, `assets/stil.js` yükler (stil.js Oyuncu görünümünü
ve sözlükleri getirir), gövde sonunda `assets/ud.js`. Yeni dosyalar:

| Dosya | Sahibi |
|---|---|
| `assets/bilesen.css`, `tasarim/index.html`, `assets/stil/oyuncu.css` sonuna eklenen bileşen bölümü | Tasarım sistemi |
| `assets/ayar.js`, `assets/veri.js`, `supabase/sema.sql`, `supabase/KURULUM.md` | Veri katmanı |
| `yonetim/index.html`, `yonetim/vaka/index.html`, `yonetim/yonetim.js`, `vaka/index.html` | Yönetim paneli |

Kimse başkasının dosyasını değiştirmez. `assets/ud.css`, `assets/ud.js`, `assets/stil.js` ve `assets/metin/*`
yalnız koordinatörün.

## 1. Tasarım dili: Oyun (Oyuncu)

Mevcut tokenlar (`assets/ud.css` `:root`, Oyuncu'da `assets/stil/oyuncu.css` `:root` üstüne yazar):
`--bg --bg-2 --bg-3 --line --line-2 --ink --ink-2 --muted --hint --accent --accent-hover --accent-active
--accent-ink --accent-soft --accent-line --brand --ok --ok-soft --warn --err --f-serif --f-body --f-mono
--r-sm --r-md --r-lg --dur-fast --dur-base --dur-mod --ease-out --shadow`. Oyuncu ayrıca: `--sun --pink
--pop --hard`. Yeni bileşenler yalnız bu değişkenleri kullanır, sabit renk yazmaz (beyaz/siyah hariç).

Mevcut bileşenler (dokunma, yeniden kullan): `.btn` (`.sig` birincil, `.alt` ikincil, `.sm` küçük),
`.chip` (`aria-pressed`), `.eyebrow`, `.lead`, `.link`, `.iform`, `.icard`, `.vote`, `.case-band`, `.cb-art`,
`.thu`, `.empty`, `.slot`, `.wrap`, `.sec`, `.phead`.

Yeni bileşenler (`assets/bilesen.css`; her iki stilde çalışır, Oyuncu'ya özgü kalın çerçeve/sert gölge
`oyuncu.css` sonuna):

| Sınıf | İşaretleme | Not |
|---|---|---|
| `.alan` | `<label class="alan"><span>Etiket <small>ipucu</small></span><input …></label>` | input, textarea, select aynı görünür; `.alan.hata` + `<em class="alan-hata">mesaj</em>` |
| `.alan-iki` | iki `.alan`'ı yan yana dizen kapsayıcı (telefonda alt alta) | |
| `.anahtar` | `<label class="anahtar"><input type="checkbox"><span>Etiket</span></label>` | aç/kapa |
| `.rozet` | `<span class="rozet" data-durum="taslak">Taslak</span>` | `data-durum`: `taslak acik degerlendirme kazanan uretim kapali`; ayrıca `.rozet.gri/.yesil/.sari/.kirmizi/.mor` |
| `.tablo` | `<div class="tablo-kap"><table class="tablo">…</table></div>` | yoğun satırlar, `th` yapışkan, satır hover, `td.sayi` sağa yaslı tablo rakamı, telefonda yatay kaydırma |
| `.arac-cubugu` | `<div class="arac-cubugu"><div class="sol">…</div><div class="sag">…</div></div>` | arama, filtre çipleri, düğmeler |
| `.sekme` | `<div class="sekmeler" role="tablist"><button role="tab" aria-selected="true">…</button></div>` | |
| `.panel` | `<section class="panel"><header class="panel-bas"><h2>…</h2><div>…</div></header><div class="panel-ic">…</div></section>` | yönetim kartı |
| `.istat` | `<div class="istatlar"><div class="istat"><span>Etiket</span><b>1.240</b><small>+12 bugün</small></div>…</div>` | sayı kartları ızgarası |
| `.ilerleme` | `<div class="ilerleme" style="--oran:.42"><i></i></div>` | 0–1 |
| `.bildirim` | `<div class="bildirimler" aria-live="polite"><div class="bildirim ok">Kaydedildi</div></div>` | `ok`, `hata`, `bilgi`; sağ altta, 4 sn |
| `.bos` | `<div class="bos"><b>Başlık</b><p>Metin</p><a class="btn sig sm">Eylem</a></div>` | boş durum |
| `.zaman-cizelgesi` | `<ol class="zaman-cizelgesi"><li><b>Açık</b><span>24 Eki 2026 · admin@…</span><p>not</p></li></ol>` | vaka geçmişi |
| `.diyalog` | `<dialog class="diyalog"><header>…</header><div class="ic">…</div><footer>…</footer></dialog>` | onay ve formlar |
| `.yonetim` | `<body class="yonetim">` sayfa iskeleti: `<header class="y-bas">` + `<div class="y-govde"><nav class="y-yan">…</nav><main class="y-ana">…</main></div>` | solda menü (telefonda üstte), ana alan geniş |
| `.damga` | `<span class="damga">ALIRDIM!</span>` | Oyuncu'nun lastik damgası, bileşen olarak |

## 2. Veri katmanı: `window.UDV` (`assets/veri.js`)

`assets/ayar.js` önce yüklenir: `window.UD_AYAR = { supabaseUrl:'', supabaseAnon:'', adminler:['admin@undustit.local'] }`.
`supabaseUrl` boşsa **yerel mod** (localStorage, anahtar `udv-v1`), doluysa **supabase modu**
(`@supabase/supabase-js@2.45.4` UMD, `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js`).
İki modda da aynı arayüz; her fonksiyon Promise döner, hata `Error` fırlatır (`err.message` Türkçe).

```
UDV.mod                      'yerel' | 'supabase'
UDV.hazir                    Promise (oturum yüklendi)
UDV.oturum()                 { id, email, rol } | null           rol: 'admin' | 'uye'
UDV.onOturum(fn)             oturum değişince fn(oturum); abonelikten çıkmak için fonksiyon döner
UDV.giris(email, sifre)      yerel modda: email adminler listesindeyse ve sifre 'undustit' ise admin oturumu
                             supabase modunda: e-posta + şifre ile giriş
UDV.baglantiGonder(email)    supabase: sihirli bağlantı; yerel: hata 'Yerel modda e-posta gönderilmez'
UDV.cikis()

UDV.vakalar.liste({ durum?, ara? })   Vaka[] (admin hepsini, herkes taslak dışını görür) en yeni önce
UDV.vakalar.al(id)                    Vaka | null
UDV.vakalar.olustur(alanlar)          Vaka   (durum 'taslak', id = slug(baslik) benzersiz)
UDV.vakalar.guncelle(id, alanlar)     Vaka
UDV.vakalar.durum(id, yeniDurum, not) Vaka   (geçerli geçişler aşağıda; gecmis'e satır yazar)
UDV.vakalar.sil(id)                   yalnız 'taslak' silinir
UDV.vakalar.gecmis(id)                [{ durum, not, kim, zaman }] eskiden yeniye
UDV.fikirler.vaka(id)                 [{ id, baslik, problem, cozum, ozellikler[], ad, gizli, zaman, alici, ortFiyat, yorum }]
UDV.fikirler.gizle(fikirId, gizli)    fikir moderasyonu
UDV.fikirler.kazanan(vakaId, fikirId) vaka.kazanan = fikirId ve durum 'kazanan'
UDV.ozet()                            { vaka:{toplam, acik}, fikir, alici }  (yönetim ana sayfası)
UDV.csv(vakaId)                       string (UTF-8 BOM'lu, ; ayraçlı; Excel Türkçe açar)
UDV.DURUMLAR                          ['taslak','acik','degerlendirme','kazanan','uretim','kapali']
UDV.DURUM_ADI                         { taslak:'Taslak', acik:'Açık', degerlendirme:'Değerlendirmede', kazanan:'Kazanan seçildi', uretim:'Üretimde', kapali:'Kapandı' }
UDV.GECIS                             { taslak:['acik'], acik:['degerlendirme','kapali'], degerlendirme:['kazanan','acik','kapali'], kazanan:['uretim','kapali'], uretim:['kapali'], kapali:[] }
```

**Vaka** alanları: `id` (slug), `baslik`, `ozet` (kısa açıklama), `aciklama` (uzun), `firma`, `stok` (ne
olduğu, ör. "M10 × 90 flanşlı cıvata + somun"), `adet` (sayı), `olcu`, `sinif`, `taban_fiyat` (₺, sayı),
`deneme_adedi` (sayı), `sure_gun` (fikir süresi, varsayılan 30), `gorsel` (URL ya da boş), `durum`,
`acilis` (ISO, açılınca), `kapanis` (ISO), `kazanan` (fikir id ya da null), `olusturan` (email),
`olusturma`, `guncelleme` (ISO).

Yerel modda ilk açılışta **Vaka 01** hazır gelir: id `vaka-01`, baslik "Bir milyon cıvata", firma
"Örnek Fabrika", stok "M10 × 90 flanşlı cıvata + flanşlı somun", adet 1000000, olcu "M10 × 90", sinif "8.8",
taban_fiyat 2, deneme_adedi 1000, durum 'acik'. Yerel modda fikirler mevcut sitenin deposundan okunur
(`localStorage['ud-store-v1']`, `ideas` içinde `cat === 'Vaka 01 · Cıvata'` olanlar; `votes` içindeki
`buy` fiyatlarından alıcı sayısı ve ortalama). Yeni yerel vakaların fikri yoktur.

## 3. Yönetim paneli

- `yonetim/index.html`: giriş kutusu (oturum yoksa); oturum admin değilse "Bu alan yalnız yöneticiler
  için" boş durumu; admin ise `.istatlar` özeti + vaka tablosu (başlık, firma, durum rozeti, adet, fikir
  sayısı, açılış, güncelleme), durum filtre çipleri, arama, "Yeni vaka" düğmesi.
- `yonetim/vaka/index.html?id=…` (yoksa yeni vaka formu): sekmeler **Bilgiler** (tüm alanlar, kaydet),
  **Fikirler** (tablo: başlık, alıcı, ort. fiyat, yorum, gizli anahtarı, "Kazanan seç"), **Geçmiş**
  (zaman çizelgesi), **Dışa aktar** (CSV indir). Üstte durum rozeti + yalnız `UDV.GECIS`'e uyan durum
  düğmeleri; her geçiş not isteyen bir `.diyalog` açar. Taslak silinebilir. Sayfada "Sitede gör"
  bağlantısı `../../vaka/?id=…`.
- `vaka/index.html?id=…`: herkese açık, veriden beslenen vaka sayfası (Vaka 01'in yapısı: başlık, açıklama,
  adet/ölçü/sınıf, taban fiyat yok, deneme partisi, "Bu vakaya fikir yaz" → `../fikir/?vaka=<id>`).
  Taslak ya da bulunamayan vaka için `.bos`.
- Yönetim sayfaları yalnız Türkçe (iç araç); `<meta name="robots" content="noindex">`.
- Her yönetim sayfası `assets/ayar.js`, `assets/veri.js`, `assets/bilesen.css` yükler.
