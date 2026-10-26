# Undustit tasarım notları

## Quirky modeli (22 Ekim 2026 görüşmesi sonrası)

İş modeli Quirky'ye yaklaştırıldı: kısa form (140 karakter + kategori + problem + çözüm + en
çok 3 özellik), küçük gönderim ücreti, 30 gün "Alırdım + fiyat" ile talep toplama, üç ölçüt (tasarım, pazar,
uygulanabilirlik), perşembe 20.00 canlı değerlendirme, topluluğun geliştirmeye katılması, ön satış
eşiği (300–750), satıştan pay (perakende %10, doğrudan %30).

Undustit tek bir site: tek ana sayfa, tek form, tek fikir listesi, tek stil dosyası.
Fazla stoklar "vaka" olarak açılır; vaka fikirleri de aynı listeye ve aynı akışa girer.

| Sayfa | İçerik |
|---|---|
| `index.html` | Form ve süreç animasyonu ilk ekranda yan yana; altında açık vaka kartı, sonra üç tur kolonu (Talep topluyor · Perşembe adayları · Ön satışta), en altta iç sayfalara dört kapı. |
| `fikir/` | Formun tek başına hali; `?vaka=vaka-01` vakayı seçili açar. |
| `fikirler/` | Arena: "Alırdım + fiyat", üç ölçüt puanı, yorum. `?f=<id>` fikri açar. |
| `vakalar/` | Vaka listesi, paylaşılabilir bağlantılar, "Vakanı aç". |
| `vaka-01/` | Vaka sayfası: bilgiler, vaka seçili form, bu vakaya gelen fikirler, teknik föy, SSS. |
| `nasil/` | Yedi adım ve `#pay` tablosu. |
| `hikaye/` | Hikâye, misyon, ilkeler. |
| `404.html` | Tek dosyalık; token'ları kendi `:root` bloğunda, `ud.css` ile aynı değerlerde. |

- 22 Ekim 2026 sadeleştirmesi: üç ana sayfa adayından A seçildi, C'nin üç tur kolonları
  eklendi. B, C, aday karşılaştırma sayfası (`ana/`), eski platform sayfası, eski kaydırmalı
  Vaka 01 (kendi formu ve fikir listesiyle) ve `kucuk-fikirler/` yönlendirmesi kaldırıldı;
  hepsi git geçmişinde duruyor. Eski Vaka 01'deki "%40 fikir sahibine" pay hesabı yeni pay
  modeliyle çeliştiği için taşınmadı.
- Ortak parçalar `assets/ud.css` ve `assets/ud.js` içinde: menü ve alt bilgi JS ile basılır,
  her sayfa `<html data-root>` ile köke giden yolu verir.
- Taslak ticari şartlar yalnız `ud.js` içindeki `TERMS` sabitinde (ücret, gün, paylar, eşik,
  canlı yayın saati). Havuz bölüşüm tablosu `nasil/index.html` içinde ve "taslak" etiketli.
- Veri: claude.ai'de `db` yeteneğiyle `ideas/<uid>`, `votes/<uid>`, `notes/<uid>` (herkes
  kendi belgesini yazar). Başka yerde aynı yapı `localStorage`'da tutulur ve alt bilgide
  "önizleme" rozeti görünür. Gerçek fikir yokken örnekler "örnek · talep toplanmıyor" etiketiyle durur.
- Oy yerine "Alırdım + fiyat": `votes/<uid>.buy` her fikre o kişinin ödeyeceği fiyatı yazar.
  Sıralama kişi sayısı, sonra ortalama fiyatla yapılır. Gerekçe: Quirky'de oy verenler alıcı
  çıkmadı; fiyatlı talep ön satışın ilk tahminidir. Ürün adı ve ambalaj seçimlerinde "oylama"
  sözcüğü kalır, çünkü orada gerçekten seçim yapılır.
- Açık vaka kartı (`mountCase`): "Bu vakaya fikir yaz" sayfa değiştirmez; aynı sayfadaki
  formu vaka seçili açar.
- Süreç animasyonu "eskizden rafa" (23 Ekim 2026): kaydırmaya bağlı değil, ekrana girince yaklaşık
  7,5 sn'de bir kez oynar, sonunda "Tekrar oynat". Altı adım: Eskiz → Talep → Ortak tasarım → Prototip →
  Ön satış → Raf. Aynı çizim baştan sona yaşar: fikir yazılırken kaba bir kurşun kalem eskizi çizilir,
  çevresinde fiyat balonları belirir, topluluğun notları (isim, renk, ambalaj) iğnelenirken titrek
  çizgiler CSS `d` geçişiyle düzgün çizgiye dönüşür (Safari'de dönüşüm yok, eskiz titrek kalır), sonra
  ahşap, ölçüler ve katlanma hareketi gelir, ürün kraft kutuya girer, kutular dizilir, tezgâh rafa
  dönüşür ve pay kartı çıkar. Hareketi azalt açıkken doğrudan son kare. Eski genel animasyonda ürün
  sonradan hazır bir çizim olarak beliriyordu; fikrin ürüne dönüştüğü görünmüyordu.
- "Vakanı aç" şimdilik bilgi amaçlı; başvuru kanalı (e-posta, form) seçilince bağlanmalı.

## Ürüne geçiş: Oyun tasarım dili, veri katmanı, yönetim (24 Ekim 2026)

- **Oyuncu artık varsayılan görünüm**; Kâğıt `?stil=kagit` ile açılır. Yeni bileşenler önce Oyuncu için.
- **Sözleşme:** `docs/urun-sozlesmesi.md` bileşen sınıflarını, `window.UDV` veri arayüzünü ve yönetim
  sayfalarını sabitler; üç parça buna göre ayrı ayrı yazıldı.
- **Tasarım sistemi:** `assets/bilesen.css` (alan, anahtar, rozet, tablo, araç çubuğu, sekme, panel,
  istatistik, ilerleme, bildirim, boş durum, zaman çizelgesi, diyalog, yönetim iskeleti, damga), Oyuncu'ya
  özgü hâli `oyuncu.css` sonunda. Canlı rehber: `/tasarim/`.
- **Veri:** `assets/veri.js` + `assets/ayar.js`. Supabase bilgisi boşken yerel mod (tarayıcıda, Vaka 01
  hazır; deneme yöneticisi `admin@undustit.local` / `undustit`). Bilgi girilince Supabase. Şema ve erişim
  kuralları `supabase/sema.sql`, kurulum `supabase/KURULUM.md`.
- **Yönetim:** `/yonetim/` (özet, vaka listesi, arama, durum filtresi), `/yonetim/vaka/` (oluştur, düzenle,
  durum geçişi notlu, fikir gizleme, kazanan seçme, geçmiş, CSV). Herkese açık, veriden beslenen vaka
  sayfası `/vaka/?id=…`.
- **Fikirler veritabanında (24 Ekim 2026):** `assets/ayar.js` dolu olduğunda ana sitenin fikirleri,
  "alırdım" fiyatları, puanları ve yorumları Supabase'de (`fikirler`, `talepler`, `puanlar`, `yorumlar`).
  Ziyaretçi hesapsız okur; ilk yazışında tarayıcısı anonim oturum açar (Supabase'de "Allow anonymous
  sign-ins" açık), her tarayıcı bir kişidir ve yalnız kendi satırlarını değiştirir. Vaka 01'e yazılan
  fikir `vaka_id` ile vakaya bağlanır ve yönetim panelinde görünür. Tarihi sunucu yazar; kişi başı günde
  en çok 10 fikir, 60 yorum (`supabase/2-fikirler.sql`). Başkalarının talepleri 30 sn'de ve sekmeye
  dönünce yenilenir. Bilinen sınır: tarayıcı verisini silen biri yeniden "alırdım" diyebilir; sonraki
  adım CAPTCHA ya da e-posta.
- **Açık:** yerel moddaki deneme şifresi kodda görünür; yalnız o tarayıcının verisini etkiler ama gerçek
  koruma Supabase'e geçince başlar. Supabase modu henüz bir projeyle denenmedi.

## Metin altyapısı, İngilizce ve yazı tipi (24 Ekim 2026)

**Metin altyapısı.** Sitedeki her yazı `assets/metin/tr.js` ve `assets/metin/en.js` sözlüklerinde
(anahtar → metin). Sayfalar metnin yerini `data-t` (içerik) ve `data-ta="özellik:anahtar"` (başlık,
açıklama, aria-label, placeholder) ile işaretler; betiklerin kurduğu metinler (menü, form, kartlar,
animasyon) `T('ud.…')` ile aynı sözlükten okunur.
- **Sayfada düzenleme:** herhangi bir sayfayı `?duzenle=1` ile aç (İngilizce için `&dil=en`). Metne
  tıkla ve yaz; değişiklikler bu tarayıcıda sayfalar arasında korunur. Alttaki çubukta "Tüm metinler"
  betik metinlerini de listeler; "İndir" sözlüğün tamamını değişikliklerle birlikte indirir.
- **Yayına alma:** indirilen dosyayı `assets/metin/` içine koy, `python tools/metin.py yaz` çalıştır
  (sayfa HTML'indeki Türkçe sözlükle eşitlenir; arama motorları ve JS'siz ziyaretçi bunu okur),
  `python tools/metin.py denetle` ile eksik/fazla anahtar olmadığını gör, commit et.
- Yeni sayfa ya da bölüm: HTML'i yaz, `python tools/metin.py etiketle` etiketleri ve Türkçeyi ekler.

**İngilizce.** `?dil=en` stil gibi çalışır: tek sayfa seti, menüde TR/EN anahtarı, iç bağlantılar dili
taşır. `<html lang>` dile göre değişir; tarih, sayı ve para biçimi (`1.000 ₺` / `₺1,000`, `%10` / `10%`)
dile göre. Her sayfada `hreflang` tr/en/x-default; İngilizce sayfanın canonical'ı kendisi. Kategoriler
veri olarak Türkçe saklanır, yalnız gösterilirken çevrilir. Örnek ürün İngilizcede "Shelfie".

**Ses tonu: merak ve oyun.** Sitenin tek sorusu: *bu başka ne olabilir?* Kısa cümle, doğrudan hitap,
küçük bir espri; rakamlar, oranlar ve kurallar hiç değişmedi.

**Yazı tipleri amaca uygun mu?**
- Instrument Serif (başlık): editoryal, güven veren, Kâğıt'ın premium tonu. Türkçe ve İngilizce karakter
  seti tam (latin + latin-ext). Yalnız 400 ve italik var; kalın başlık gerekirse ikinci bir kesim alınmalı.
- Geist (gövde, arayüz) ve Geist Mono (etiket, teknik föy): okunaklı, nötr, rakamlar tablo hizalı.
  Mühendislere giden teknik föy için mono doğru seçim.
- Bricolage Grotesque (Oyuncu başlıkları): kalın, oyunbaz; italiği yok.
- Lisans: üçü de SIL Open Font License; ticari kullanım, kutu ve ambalaj baskısı serbest.
- Uygulanan kurallar: tarayıcı sahte kalın/italik üretmiyor (`font-synthesis:none`); paragraf içi vurgu
  Kâğıt'ta serif italik, Oyuncu'da kalınlık; paragraflarda `text-wrap:pretty` (tek kalan kelime yok);
  telefonda dile göre heceleme; büyük harf etiketlerde Türkçede İ, İngilizcede I; fiyat ve sayaçlar
  tablo rakamı.
- Alınması gerekenler: ürün kutusu ve fiziksel baskı için aynı ailelerin baskı dosyaları (OFL, ücretsiz);
  ileride Arapça/Kiril gibi bir dil eklenirse Instrument Serif ve Geist bu alfabeleri kapsamıyor.

## Canlıya çıkış: eksikler (24 Ekim 2026)

**Bu turda kapatılanlar**
- Başkalarının verisi güvenilmez kabul ediliyor: başlık, metin ve listeler formun sınırlarına kırpılıyor,
  geçersiz ya da ileri tarihli `at` 30 günü uzatamıyor, yorum türü beyaz listeden (`class` içine giden
  türden HTML sızıntısı kapandı).
- Fikir sahibi fikrini geri çekebiliyor (iki adımlı onay; KVKK'daki silme hakkının ön yüz tarafı).
- Paylaşım görseli mutlak adreste (sosyal ağlar göreli adresi okumaz); her sayfada canonical ve og:url,
  `sitemap.xml`, `robots.txt`. Stil sayfaları Kâğıt'ı canonical gösterir, kopya içerik sayılmaz.
- 404 GitHub Pages alt klasöründe çalışıyor.

**Canlıdan önce şart (ön yüzle çözülmez)**
1. Sunucu ve veritabanı: fikirler ve "alırdım"lar şimdi tarayıcıda. Ortak veri, sunucu tarafı doğrulama
   (140 karakter, fiyat sınırı, 30 gün) ve hız sınırı gerekir; tarayıcıdaki kontroller atlatılabilir.
2. Hesap: e-posta ya da telefonla giriş. Bir kişinin bir oyu olmalı; yoksa "alırdım" sayısı şişirilebilir.
3. Ödeme: 99 ₺ / 10 ₺ gönderim ücreti ve ön satış için ödeme altyapısı (iyzico, PayTR, Stripe),
   eşik dolmazsa iade akışı, fatura.
4. Hukuk: KVKK aydınlatma metni ve açık rıza, kullanım şartları, mesafeli satış ve ön bilgilendirme
   (ön satış için), gelir paylaşımı sözleşmesi, **fikri mülkiyet**: fikir herkese açık yayımlanınca kopyalanabilir;
   gönderim anında zaman damgası, kimin neyi önerdiğinin kaydı ve hakların kime geçtiği yazılı olmalı.
5. Moderasyon: uygunsuz, kopya ya da spam fikir için "bildir" ve yönetici paneli.
6. İletişim ve fabrika tarafı: vaka açmak isteyen firma için başvuru formu ve iletişim adresi.
7. Bildirim: perşembe yayını, fikre yorum, eşik doldu gibi anlar için e-posta.
8. Ölçüm: çerezsiz analitik (Plausible gibi) ve hata takibi.
9. Kendi alan adı: `robots.txt` GitHub Pages alt klasöründe arama motorlarınca okunmaz; alan adına
   geçince canonical, og ve sitemap adresleri tek yerden güncellenmeli.

## Karar: Kâğıt ve Oyuncu (24 Ekim 2026)

Ürün sahibiyle görüşmede Kâğıt ve Oyuncu beğenildi; proje bu ikisiyle ilerliyor. Teknik çizim,
Premium ve Yumuşak tamamen kaldırıldı (stil dosyaları, yazı tipleri, stil panosu kartları).
Eski `?stil=teknik|premium|yumusak` bağlantıları Kâğıt'a düşer.

Kâğıt'a premium katman (`ud.css` sonunda, yalnız `data-stil="kagit"`): fildişi kâğıt `#F8F6F1` ve
çok hafif kâğıt dokusu; mavi aynı kuralla (yalnız eylemde) ama varsayılan görünen `#2337C6` yerine
gece mavisi `#1F2F86`; köşeler 22→14 px; yumuşak gölge yerine kıl çizgi + çok uzak, silik gölge;
sayfa başlıkları bir boy büyük ve daha sıkı; etiketlerin önünde katalog tarzı kısa çizgi; bölümler
arası daha fazla boşluk. axe 0 ciddi sorun, CLS ≤ 0,017.

Kâğıt ikinci geçiş: kutular yerine katalog gibi çizgili sütunlar (fikir listesi, yan notlar, vaka
adımları, "Her şey açıkta"); %10 / %30 gibi rakamlar yeşilden mürekkebe; vaka etiketi sade çerçeve;
altbilgide büyük serif "Undust*it*" imzası (yalnız Kâğıt); açılış hareketi daha yavaş ve hafif
bulanıktan netleşen (1000 ms, 110 ms kademe).

Aşağıdaki bölümler beş stilli dönemin kaydıdır.

## Stiller: aynı site, dört görünüm (22 Ekim 2026)

Ürün sahibi aynı siteyi farklı tarzlarda görmek istedi. İçerik, sayfalar ve akış tek; yalnız
görünüm değişir. Her stil ayrı bir site gibi açılır:

| Stil | Bağlantı | Dosya | Özü |
|---|---|---|---|
| Kâğıt | `/` | (varsayılan, `ud.css`) | Sıcak kâğıt, editoryal serif, mavi yalnız eylemde |
| Oyuncu | `/?stil=oyuncu` | `assets/stil/oyuncu.css` | Krem zemin, Bricolage Grotesque, mürekkep çerçeve + sert gölge, mor eylem, sarı işaretleyici |
| Teknik çizim | `/?stil=teknik` | `assets/stil/teknik.css` | Mavi pafta + ızgara, IBM Plex Condensed büyük harf, mono etiketler, kesikli çizgi, sarı eylem |
| Premium | `/?stil=premium` | `assets/stil/premium.css` | Sessiz lüks: sıcak derin siyah `#0A0A0A`, Inter Tight 300 büyük başlıklar (ikinci yarı gri), geniş aralıklı mono etiketler, tek beyaz hap düğme, şampanya `#CDB892` yalnız logo/canlı nokta/odak; gölge yok |
| Yumuşak | `/?stil=yumusak` | `assets/stil/yumusak.css` | Warm Soft-SaaS: sıcak beyaz + pastel bölümler, Nunito 800–900, kendi renginin koyu tonuna oturan ve basınca gömülen hap düğmeler, mercan eylem, turkuaz ilerleme |

- `assets/stil.js` her sayfanın `<head>`'inde çalışır: `?stil=` değerini okur, stil dosyasını
  sayfa çizilmeden yükler ve bütün iç bağlantılara aynı `?stil=` değerini ekler. Stil tarayıcıya
  kaydedilmez; bu yüzden dört stil ayrı sekmelerde yan yana açılabilir, birbirini etkilemez.
- `stiller/` stil panosu: üstte sayfa seçici (7 sayfa) ve Masaüstü/Telefon anahtarı; seçilen sayfa beş
  stilde canlı önizlemeyle yan yana görünür. Önizlemeye tıklayınca tam boy ve kullanılabilir açılır,
  "Yeni sekmede aç" ayrı site olarak açar. Seçim adreste durur (`?sayfa=nasil/&cihaz=telefon`), yani
  belli bir karşılaştırma bağlantı olarak paylaşılabilir. Her sayfanın alt bilgisinde stiller arası geçiş satırı var.
- Stil dosyaları yalnız token'ları ve bileşen görünümünü ezer; düzen ve içerik `ud.css` /
  sayfalarda kalır. Yeni bir stil = yeni bir `assets/stil/<ad>.css` + `stil.js` içindeki listeye bir satır.
- Kontrast her stil dosyasının başında yazılı; metin çiftleri AA'yı geçer. Oyuncu'daki turuncu
  (`--brand`, 3.7) yalnız büyük logo harfinde ve canlı yayın noktasında kullanılır.
- Jüri turu (22 Ekim 2026, `.jury/styles/scorecard.md`): dört stil tek tek 6,8–7,1 aldı, hepsi
  "düzeltilerek kalsın". Karşılaştırma jürisi El yapımı'nı çıkardı: Kâğıt'la aynı şeyi söylüyordu ve
  el yazısı pay oranlarında ve sanayi teklifinde güveni zayıflatıyordu. Eksik kalan yumuşak/yuvarlak
  tüketici uygulaması hissi için UI-UX kit'in Warm Soft-SaaS arketipinden (Duolingo profili) Yumuşak
  eklendi. Duolingo'nun açık yeşili ve önerilen açık mercan kontrastı geçmediği için eylem rengi
  `#C93A1C` (beyaz yazı 5,1). Yumuşak'ın imzası: "Alırdım" kaydedilince düğme ezilir ve küçük bir
  konfeti patlar (`ud.js` kaydedilen kartı bir kez `.just` ile işaretler; diğer stiller bunu kullanmaz).
- Jüri sonrası ortak düzeltmeler (dört stile birden):
  - Sayfa geçişi: menü yerinde kalır, eski sayfa 220 ms'de yukarı kalkar, yenisi 420 ms'de aşağıdan
    yükselir (`::view-transition-*`). Varsayılan çapraz geçiş görünmeyecek kadar kısaydı.
  - Erişilebilirlik: "Alırdım" düğmesinin adı görünen metinle başlar, fikir adı ekran okuyucuya
    gizli metinle eklenir; animasyon sahnesi artık `role="img"` değil (içinde düğme vardı), anlatımı
    gizli bir paragrafta. Kontrollerde arada boşluklu mürekkep odak halkası; yazma alanında görünür odak.
    Tek başına duran bağlantılar 24 px dokunma yüksekliği alır.
  - Hover: seçili çip ve sıralama düğmeleri, "Alırdım", "Tekrar oynat", "Bağlantıyı kopyala" ve
    bağlantılar artık yalnız renk değiştirmiyor (kalkma, dolgu, kalınlaşan alt çizgi).
  - Kayma: başlık yazı tipleri ölçülmüş yedeklerle yüklenir (26 Ekim 2026'dan beri `display=swap`: yavaş mobilde büyük başlık saniyelerce görünmez kalıyordu; yedekler ölçülü olduğu için kayma küçük) (`size-adjust`,
    `ascent/descent-override`; Instrument Serif→Georgia %76,73, Bricolage→Arial Bold %91,58,
    Plex Condensed→Arial Bold %88,44, Nunito→Arial %101,08 / Arial Bold %101,51; iki kalın yazı tipi ilk ölçümde %13 yanlıştı, gerçek başlıklarla yeniden ölçüldü). JS'in doldurduğu
    form ve animasyon alanına baştan yer ayrılır; `main` en az bir ekran boyu, alt bilgi ilk ekranda
    başlamaz. Masaüstü CLS 0,15–0,38'den 0–0,05'e indi; Oyuncu'nun Hikâye sayfası (büyük ilk harf) 0,05.
  - Yazı tipleri: Geist 300–600'e indirildi, Yumuşak'ta Nunito 400/600 kaldırıldı.
  - Paylaşım: `assets/og.png` (1200×630) ve `og:*`, `twitter:card` her sayfada; üç uzun açıklama
    160 karakterin altına indi. **Alan adı belli olunca** `og:image` mutlak adrese çevrilmeli,
    `canonical` ve `sitemap.xml` eklenmeli (şimdi göreli olduğu için bazı platformlar görseli okumaz).
- Premium (23 Ekim 2026): ürün sahibi "sade ama ultra premium" bir seçenek istedi. UI-UX kit'ten
  Bugatti'nin tek renkli sadeliği ve Apple'ın beyaz hap düğmesi alındı. Eylem rengi beyaz (siyah yazı
  17,9), şampanya yalnız küçük dokunuşlarda; Inter Tight için ölçülmüş Arial yedeği (%95,33 / %93,77)
  kaymayı önler. Henüz jüriye girmedi.
- Hareket katmanı (23 Ekim 2026). Önceden süreç animasyonu ve hover dışında hiçbir şey oynamıyordu;
  iç sayfalar tamamen durağandı ve Teknik'in hiç kendi hareketi yoktu.
  - Ortak (`ud.js` `mountMotion`, `ud.css`): sayfa açılışında başlık/metin/form/görsel sırayla gelir;
    ilk ekranın altındaki bloklar ekrana girince bir kez belirir (ızgaralarda 90 ms kademe). Teknik
    çizimler (cıvata) ekrana girince çizilir, "× 1.000.000" sıfırdan sayar. Store'un yeniden çizdiği
    fikir listeleri bilerek dışarıda: kartlar tekrar tekrar oynamaz. Hareketi azalt açıkken hiçbiri oynamaz,
    çizimler tamamlanmış gelir. Yalnız transform/opacity/clip-path/filter kullanılır, kayma eklemez.
  - Stillere göre (`--in-*` değişkenleri + imza): Kâğıt sakin yükselme; Oyuncu eğik düşüp yaylanma,
    sarı işaretleyici soldan sağa sürülür, çıkartma etiket düşer; Teknik plotter taraması (clip-path),
    yavaş çizim, yanıp sönen işaret; Yumuşak küçükten yaylanarak büyüme; Premium bulanıktan netleşen yavaş
    yükselme, başlığın gri yarısı gecikmeli gelir.
- Sayfa başlıklarının `14ch` sınırı Oyuncu (8,32em) ve Yumuşak'ta (8,4em) em'e sabitlendi: `ch` yazı
  tipine bağlı olduğu için kutu, yazı tipi yüklenince daralıp başlığı yeniden kırıyordu.
- Telefonda kategori çipleri tek satırda yatay kayar (ekranı doldurmuyordu).
- 2. jüri turu (24 Ekim 2026, `.jury/styles/scorecard.md`): Kâğıt 7,0, Oyuncu 7,1, Premium 7,1, Yumuşak
  7,1, Teknik 6,0 (kaydırınca boş ekran hatası; düzeltildi). Karşılaştırma jürisi Yumuşak'ın çıkarılmasını
  ve bugün seçilecekse Kâğıt'ı (mavi yerine logodaki kiremit turuncusu tek vurgu olarak) önerdi; ikisi de
  ürün sahibinin kararına bırakıldı.
- Ortaya çıkış artık saydamlıkla değil kırpma maskesiyle (`clip-path`): metin hiçbir an yarı saydam
  olmaz, erişilebilirlik tarayıcıları sayfa açılışında kontrast hatası bulmaz (önce 38–57 düğüm).
  Hızlı yolculuk (bağlantı, End, savurma, araçların `scrollTo`'su) son 150 ms'deki hızla algılanır ve
  bloklar anında gösterilir; okuma hızında kaydırma animasyonlu kalır.
- Vakalar, Hikâye ve Fikirler başlıklarının sağında vaka çizimiyle aynı elden çizimler: palet üstünde
  stok, tozu alınan raf, fiyat etiketli talep kürsüsü (`.phead.has-art`, `.ph-art`).
- Yazı tipleri `assets/fonts/` altında woff2 (latin + latin-ext), stil başına başlık yazı tipi önden
  yüklenir (`stil.js`). Google'a istek yok.
- Logo `lang="en"` taşır ki büyük harf yapan stillerde "UNDUSTİT" değil "UNDUSTIT" yazsın.
- `404.html` tek dosyalık olduğu için stil almaz; her zaman Kâğıt görünür.

## Tema: kâğıt ve fikir mavisi (22 Ekim 2026)

Beyaz zemin dikkati fikri yazmaya toplar. Mavi, keşfe ve hayal gücüne dayalı görevlerle
ilişkilendirildi (Mehta ve Zhu, Science 2009). Kırmızıya yakın tonlar ise temkin ve detay
moduyla ilişkilendirildi, bu yüzden turuncu yazma alanından çekildi. Yeşil "büyüme" anlamıyla
ilerleme durumlarında (Lichtenfeld ve ark., 2012; bulgu tekrarlarda tutarsız, yön olarak
kullanıldı).

| Rol | Token | Değer |
|---|---|---|
| Sayfa zemini (sıcak kâğıt) | `--bg` | `#FAF9F6` |
| Yüzey / kart | `--bg-2`, `--bg-3` | `#FFFFFF`, `#F2F0EB` |
| Çizgi | `--line`, `--line-2` | `#E6E3DC`, `#D3CFC6` |
| Metin | `--ink`, `--ink-2`, `--muted` | `#16181D`, `#464A52`, `#6B6F76` |
| Ana vurgu, yalnız eylemler: yazma alanı, düğme, oy, odak | `--accent` (+ hover/active) | `#2337C6` (koyu ultramarin) |
| İlerleme: oy, ön satış, "geçti" | `--ok` | `#147A4E` |
| Marka ve canlı sinyal: logo "it", perşembe | `--brand` | `#C2410C` |
| Uyarı / hata | `--warn`, `--err` | `#8A5A00`, `#B42318` |

Kontrast (WCAG 2.2 AA, `--bg` üzerinde): ink 16.9, ink-2 8.5, muted 4.8, accent 8.2, ok 5.1,
brand 4.9; beyaz metin accent üzerinde 8.6.

Başlıklar ve başlık italikleri mürekkep renginde kalır; mavi yalnız kullanıcının bir şey
yapacağı yerde görünür ki "mavi = buraya yaz / tıkla" sinyali tek anlamlı olsun.

Fontlar: Instrument Serif (başlıklar, büyük rakamlar), Geist (gövde), Geist Mono (etiket, sayı).

## Kararlar

- Ana sayfanın eski açık/koyu çelik teması (Archivo + Figtree) kaldırıldı. Koyu atölye teması
  22 Ekim 2026'da yerini beyaz "kâğıt ve fikir mavisi" temasına bıraktı.
- Marka adı "İkinci Tur" yerine **Undustit**. Logo: `Undust` + italik turuncu (`--brand`) `it`.
- Menü: Fikirler · Nasıl işler · Vakalar · Hikâye + "Fikrini yaz". 900 px altında menü bir
  düğmenin açtığı panele taşınır, "Fikrini yaz" görünür kalır.
- Her hareketin `prefers-reduced-motion` karşılığı var. Sayfalar arası geçiş `@view-transition` ile.
- 404 sayfası köke göre bağlanır; GitHub Pages'te (`/Undustit/`) kökü kendisi bulur.
- Sayfalar Türkçe ve İngilizce (`?dil=en`); metinler `assets/metin/` sözlüklerinde.

## Daha az tıklama (26 Ekim 2026)

- **Kısa form:** zorunlu olan yalnız tek cümle ve kategori. Problem, çözüm ve özellikler "Detay ekle"
  altında, isteğe bağlı. Kategori zaten seçiliyken (vaka sayfası) cümleden sonra Enter fikri gönderir.
- **Hazır fiyatlar:** "Alırdım"a dokununca üç fiyat düğmesi çıkar (diğerlerinin ortalamasının %75/100/125'i,
  yuvarlanmış; talep yoksa 150/300/500 ₺). Tek dokunuş kaydeder; elle yazmak duruyor. Odak ilk düğmeye
  gider, telefon klavyesi kendiliğinden açılmaz.
- **Ana sayfada pencere:** kart başlığı fikri aynı sayfada pencerede açar; `?f=` bağlantısı ana sayfada da çalışır.
- **Paylaş:** gönderimden sonra ana düğme "Paylaş, alıcı bul"; fikir penceresinde de "Paylaş". Telefonda
  paylaşım menüsü, değilse bağlantı panoya.
- **Vaka sayfaları:** form ilk ekranda (Vaka 01'de 1.147 px'ten 635 px'e, telefonda 707 px). Nasıl ilerler,
  teknik föy ve SSS katlanır bölümlerde; dinamik vakada açıklama ve görsel "Vaka ayrıntıları" altında.

## İlk gerçek vaka: Vaka 01 · Boltun (26 Ekim 2026)

Vaka 01 örnek değil, ilk gerçek vaka (claude.ai'deki "undust · Case #001 Boltun" sayfası): 1.000.000
takım M10 × 90, 8.8 flanşlı cıvata + somun, 1.000 adetlik deneme partisi. Sitede "Boltun" adıyla geçer.
- **Pay (vakalara özel):** satış fiyatının taban fiyatın üstünde kalan kısmı bölünür: fikir sahibine %40,
  isim / görünüm / ambalaj / satış kanalı önerisi seçilenlere %10 (3 + 3 + 2 + 2), kalan %50 Undustit.
  Değişiklik masrafı bölüşmeden önce ödeyene döner. Oranlar `ud.js` `TERMS.caseShare` içinde; Vaka 01
  sayfası ve `nasil/#vaka-pay` oradan okur. Genel fikirlerdeki %10–30 (satıştan) değişmedi. Bu, 22 Ekim'de
  "%40 taşınmadı" kararını vakalar için geri alır.
- **Taban fiyat** (takım başına $0,20) bilerek sitede gösterilmiyor.

## Renk rolleri: Oyuncu sadeleşti (26 Ekim 2026)

Sarı 21 yerde beş iş yapıyordu (başlık vurgusu, rozet, hover, gölge, tablo başlığı…), bir ekranda altı renk
vardı. Oyuncu korunarak her renge tek görev verildi:
- **Mor:** tıklanan her şey ve üzerine gelme (düğme, çip, dil, sekme, yönetim menüsü hover'ı `--accent-soft`),
  açık anahtar, ilerleme çubuğu.
- **Sarı (`--sun`):** sayfa başına bir vurgu: h1 vurgusu ve üstündeki etiket. Hikâye'de misyon cümlesi,
  bir de "Alırdım" damgası ve açıkça `.rozet.sari`. h2 vurguları, vaka kartı gölgesi, tablo başlığı,
  diyalog başlığı, zaman çizelgesi noktaları sarıdan çıktı.
- **Yeşil:** para ve "açık / kazanan / üretimde" durumu. **Kırmızı-turuncu:** logo ve canlı yayın noktası.
- **Pembe (`--pink`)** kaldırıldı; "Üretimde" rozeti yeşil çerçeveli.
- Gölgeler hep mürekkep.

## Açılışa hazırlık (26 Ekim 2026)

- **Veri yükü:** `supabase/4-acilis.sql` sonrası sayfa fikir başına tek özet satırı okur (`fikir_kart`: alıcı,
  ortalama fiyat, puanlar, yorum sayısı; en yeni 1.000 fikir) ve kişinin yalnız kendi fiyat ve puanlarını
  okur; yorumlar fikir penceresi açılınca gelir. Görünüm yoksa eski yol (her satır) sürer, site bozulmaz.
- **Vakanı aç:** vakalar sayfasında açılan form (`vaka_basvurulari`): firma, stok, e-posta zorunlu, açık
  onay kutusu. Kişi başı günde 3. Yalnız yönetici okur; Özet sayfasında "Vaka başvuruları" tablosu,
  durum (Yeni / İncelendi / Kabul / Ret) satırdan değişir.
- **Haber ver:** isteğe bağlı tek e-posta alanı: fikir gönderince ("ilk alırdım gelince") ve "alırdım"
  denmiş fikrin penceresinde ("ön satışa çıkınca"). Adres tarayıcıda hatırlanır; veritabanında yalnız
  sahibi ve yönetici görür. Gönderim `supabase/functions/haber-gonder` (Resend, talepler webhook'u).
- **Ölçüm:** Plausible, `ayar.js` `analitik` boşken hiç yüklenmez. Olaylar: Fikir gönderildi, Alırdım,
  Paylaş, Haber ver, Vaka başvurusu.
- **İçerik kuralı:** açılış fikirleri gerçek kişilerden, kendi adlarıyla (`docs/acilis-icerik.md`).

## Faz 1: "gerçek şirket" görünümü (26 Ekim 2026)

Yol haritası: `docs/yol-haritasi.md`. Jüri 4. tur: eleştirmen 7,0 (`.jury/127.0.0.1-4400/scorecard.md`).
- **Jüri düzeltmeleri:**
  - **Alırdım:** Oyuncu'da birincil eylem gibi (mor etiket, mürekkep kenar, sert gölge, hover'da mor dolgu). Örnek kartlarda pasif değil; dokununca "bu bir örnek" der.
  - **Başlık animasyonu:** başlık artık kırpılarak girmiyor, yalnız yükseliyor (`ud-in-h`); kırpık başlangıç onu LCP'den saklıyordu (nasil mobilde 9,8 sn).
  - **Ana sayfa turları:** aday yokken "Talep topluyor" tam genişlik, diğer iki tur ince şerit (`.rounds.erken`).
  - **Şablon bağlantıları:** `href="${…}"` şablonları satır içi betikten çıktı.
  - **Çizim etiketleri:** nokta ızgarası etiketlerin altından geçmiyor (`--art-bg`).
  - **Hover:** nav ve metin içi bağlantılara gerçek hover.
  - **Odak:** klavye odağı gizli bloğu hemen açar.
  - **Mobil:** sıra numarası kart kenarında rozet; başlık her sayfada çizimden önce.
  - **404:** stiller `<base>`'den sonra yazılıyor.
  - **Sayfa geçişi:** Oyuncu'ya özgü sayfa geçişi.
  - **Uzun tireler** sayı aralıklarında (%10–30) doğru yazım olduğu için bırakıldı.
- **Hikâye:** "Neden varız" yeniden yazıldı, Quirky çıkarıldı (kullanıcının isteği; "Nasıl işler"deki karşılaştırma duruyor).
  Ekip bölümü yok.
- **İletişim (`iletisim/`):** form `iletisim_mesajlari` tablosuna (yalnız yönetici okur, günde 5). Herkese açık adres
  `ayar.js` `iletisim` dolunca görünür.
- **Yasal (`kvkk/`, `kosullar/`):** taslak metinler, sarı yer tutucularla. `noindex`, hiçbir yerden bağlantı yok.
  `ayar.js` `yasal: true` olunca alt bilgide bağlantılar ve formlardaki onayın yanında "Aydınlatma metni" çıkar,
  taslak uyarısı kalkar. Yayından önce avukat okumalı.
- **Canlı sayılar:** ana sayfada fikir, "alırdım", toplam talep (₺), açık vaka. En az 5 gerçek fikir olmadan görünmez.
- **Bildir:** fikir penceresinin altında; neden + not, kişi başı fikir başına bir kez, günde 20 (`fikir_bildirimleri`).
  Yönetim Özet'te "Bildirilen fikirler": "Fikir gizlendi" fikri sitede gizler.
- **Yönetim:** başvurular, mesajlar ve bildirimler aynı tablo bileşeniyle (`KAYITLAR`); veri tarafında `kayitTuru`.
- SQL: `supabase/5-guven.sql` (mesajlar, bildirimler).

## Faz 2, 1. bölüm: hesap ve "Benim" (26 Ekim 2026)

- **Hesap isteğe bağlı:** ziyaretçi anonim yazar ve "alırdım" der (sürtünme yok). "Benim" sayfasında e-posta bağlayınca
  Supabase anonim kullanıcıyı aynı kimlikle kalıcı yapar (`updateUser({ email })`), bütün satırları onda kalır.
  Başka cihazda `signInWithOtp` (`shouldCreateUser:false`) ile sihirli bağlantı; o tarayıcının bağlanmamış
  katkıları taşınmaz, sayfa bunu söyler. Oturum değişince store kendi satırlarını yeniden okur.
- **`benim/`** (noindex): üç sayı (yazdığın fikir, fikirlerine "alırdım" diyen kişi, "alırdım" dediğin fikir), hesap
  kartı (önizleme / anonim / bağlantı bekleniyor / girildi), fikirlerin (Perşembe'ye uzaklıkla), "alırdım"
  dediklerin, "haber ver" istekleri (vazgeçilebilir). Üst çubukta kişi simgesi.
- **Perşembe'ye uzaklık (`hedef`):** adaylar açık fikirlerin "alırdım"a göre ilk 5'i (ana sayfanın 2. turu). Aday
  olmayana "n kişi daha alırdım derse adaylara girer"; fikir penceresinde ve "Benim"de görünür.
- Gerçek ziyaretçiye e-posta için özel SMTP şart (KURULUM 10).

## Faz 2, 2. bölüm: Perşembe sayfası (26 Ekim 2026)

- **`persembe/`:** sonraki yayın (tarih ve sayaç), "Yayına git" (`ayar.js` `yayin` doluyken), "Takvime ekle" (haftalık
  .ics, UTC 17:00–18:30: İstanbul'da yaz saati olmadığı için hep 20:00–21:30) ve Google Takvim; bu haftanın beş
  adayı (ana sayfanın 2. turuyla aynı); yayının üç adımı.
- **Canlı durum:** `liveNow()` başlangıçtan `TERMS.liveMinutes` (90) dakika boyunca doğru. Sayaç ve sayfa "Şimdi canlı"
  der, turuncuya döner.
- **Ana sayfa ve fikirlerdeki Perşembe hapı** artık bu sayfaya giden bir bağlantı.
- **Fikir başına paylaşım önizlemesi** (WhatsApp/LinkedIn başlık ve görsel) alan adına ertelendi: GitHub Pages sunucu
  çalıştırmaz, Supabase Edge Function ise kendi alanında HTML'i düz metin olarak döndürür.

## Anlatıcı animasyonlar: Vakalar, Fikirler, Hikâye (26 Ekim 2026)

Sitenin mantığını okumadan anlatan üç kısa çizim, sayfa başlığındaki sabit çizimin yerinde (`assets/anlatim.js`,
`assets/anlatim.css`; yalnız bu üç sayfada yüklenir). Motor ana sayfadaki "eskizden rafa" ile aynı: ekrana girince
bir kez, altında adımlar, sonda "Tekrar oynat", hareketi azaltta ya da aynı oturumda ikinci ziyarette son kare.
- **Vakalar (6 adım, ~7 sn):** stok bekliyor → "VAKA 01" etiketi → üç fikir balonu → talep çubukları, en çok istenen
  dolar → deneme partisi (1.000 adet) → raf ve "%40 fikir sahibine" kartı.
- **Fikirler (4 adım, ~6 sn):** altı fikir satırı → "alırdım" sayıları ve fiyat etiketleri → liste talebe göre yeniden
  dizilir → ilk beş "Perşembe adayları" bölgesinde, altıncı geri çekilir.
- **Hikâye (5 adım, ~6 sn):** tozlu defter (fikir) → tozlu kasa (stok) → bez geçer, "un · dust · it" → ikisi aynı
  masada → rafta bir ürün, "fikir + stok = ürün".
- **Dil:** çizimdeki her öğe hangi adımda geleceğini (`data-a`), gideceğini (`data-x`) ya da çizileceğini (`data-d`)
  kendisi söyler; CSS'te adım başına tek kural var, hikâyeye özgü hareketler (sıralama, bez, masa) ayrıca.
  Girişler `--ease-out`, ekranda yer değiştirme `--ease-io`; yalnız `transform`, `opacity`, çizgi çizimi.
- **Telefon:** "Tekrar oynat" köşede yalnız simge (yazısı ekran okuyucu için duruyor), çizimin son satırını örtmesin diye.
- **Erişilebilirlik:** çizim `aria-hidden`; her hikâyenin bir cümlelik metin karşılığı `.sr` içinde.

## Ana sayfa animasyonu genelleşti (26 Ekim 2026)

"Eskizden rafa" artık tek bir ürünü (katlanır kesme tahtası "Rafla") değil her fikri anlatıyor:
- **Kart:** "Senin fikrin" etiketiyle "Günlük bir derdi çözen, tek cümlelik fikrin." yazılır. Kart köşede küçük
  (%42) ve yazıldıktan sonra %84'e çekilir; çizim sahneyi alır (genişlik %76).
- **Talep:** "131 kişi / ort. 101 ₺" gibi gerçek veri sanılacak sayılar yerine 12 noktalık bir talep sırası dolar;
  fiyat balonları "₺…".
- **Çizim:** ahşap tahta ve katlanma hareketi yerine sade bir nesne (kubbeli gövde, yan yüz, kadran). Titrek
  eskizden temiz çizgiye, mint renge, "en / boy" ölçülerine. Etiketler "İsim ✓ / Renk ✓ / Ambalaj ✓", kutuda "Ürünün".
- Ön satış eşiği `TERMS.presale[0]`'dan okunur.

## Faz 4: devredilebilirlik (26 Ekim 2026)

- **Uçtan uca testler** (`tests/e2e/`, Playwright 1.64): 15 sayfanın açılması (başlık, JS hatası yok, yatay taşma yok),
  fikir akışı (vaka sayfasında cümle + Enter, kategorisiz Enter), hazır fiyatla "alırdım", "Benim" ve Perşembe'ye
  uzaklık, örnek kart notu, pencere ve `?f=`, bildir → yönetim → gizle, iletişim, vaka başvurusu, Perşembe sayacı
  ve canlı durumu (saat sabitlenerek), hareketi azaltta son kareler. Masaüstü ve telefonda 64 test, ~7 sn.
  Testler `ayar.js`'i tarayıcıda yerel moda çevirir; canlı veritabanına dokunmaz. Akış testleri hareketi azaltla
  koşar (kaydırınca beliren bloklar tıklamayı geciktirmesin).
- **SQL testleri** (`tests/sql/`): Supabase'in `auth` şemasının taklidi, beş migration (4 ve 5 iki kez), sonra
  görünüm toplamları, gizli fikir, RLS (başvuru, mesaj, e-posta, bildirim), tekil bildirim, günlük sınırlar,
  yönetici gizlemesi. Bir kural bozulunca hata verir (denendi).
- **CI** (`.github/workflows/kontrol.yml`): her PR'da ve `main`'e her push'ta metin denetimi (`--kati`), SQL
  (Postgres 15) ve Playwright.
- **Belgeler:** `README.md` (İngilizce özetli), `docs/devir.md` (varlıklar, gizli bilgiler, maliyet, devir adımları).
- Playwright 1.48 Node 24'te test dosyalarını yüklerken takılıyordu; 1.64.0'a geçildi.

## Formda vaka ve kategori ayrıldı (26 Ekim 2026)

Vaka (hangi stok için) ile kategori (ne tür bir ürün) aynı çip sırasındaydı; Boltun'a yazılan bir fitness fikri ikisini
birden seçemiyordu. Artık iki sıra var:
- **Vaka:** açık vakalar + "Vakadan bağımsız" (varsayılan). Yalnız açık vaka varken ve vakanın kendi sayfası dışında görünür;
  vaka sayfasında vaka zaten seçili, sıra gizli.
- **Kategori:** yalnız ürün türleri. Vakasız fikirde zorunlu, vaka fikrinde isteğe bağlı (vaka sayfasında cümle + Enter
  yine gönderir).
- Veri: `caseId` vaka, `cat` kategori; kategorisiz vaka fikri eskisi gibi vakanın etiketini kategori olarak taşır.
- Kartta ve pencerede tek etiket: "Vaka 01 · Boltun · Fitness" (`etiket()`).

## Dış inceleme sonrası iyileştirmeler (26 Ekim 2026)

- **Safari:** eskizden temiz çizgiye geçiş CSS `d:` dönüşümüyle yapılıyordu (WebKit tam desteklemiyor). Artık her eskiz
  çizgisinin temiz bir ikizi var; "Ortak tasarım"da eskiz söner, temiz çizgi belirir (yalnız opacity, her tarayıcıda aynı).
- **Arka plana atılan sekme:** animasyon oynarken sekme gizlenirse zamanlayıcılar kısılıyor, adımlar kayıyordu. Artık iki
  motor da (ana sayfa ve anlatıcılar) sayacı durdurup son kareyi gösteriyor.
- **Telefonda çizim yazıları:** en küçüğü 9,9 px'ten 11,4 px'e (ölçüldü); kutudaki süs yazısı 8 px.
- **Sessiz hatalar:** veri yüklenemezse altta "Veriler şu an yüklenemedi · Yeniden dene" şeridi; "alırdım", puan, yorum
  kaydedilemezse kısa bir bildirim (günlük sınırda veritabanının kendi cümlesi). Yorumlar yüklenemezse sonsuz "yükleniyor"
  yerine aynı şerit. Tarayıcı deposu hataları bilinçli olarak sessiz (gizli pencere).
- **XSS testi:** fikir, ad, yorum, mesaj ve başvuruya `<img onerror>`, `<script>`, `<svg onload>` yazılıp herkese açık
  sayfalar ve yönetim tabloları açılır; betik çalışmamalı, metin olarak görünmeli. Pencere başlığındaki `esc()` bilerek
  kaldırılınca test kırıldı.
- **Okunan bloklar sakin:** Oyuncu'da "nasıl ilerler" ve "her şey açıkta" kartları ince çizgi, sert gölge yok; düğmeler ve
  fikir kartları cesur kalır.
- Doğru olmayanlar: mobil LCP ve boş kolonlar Faz 1'de çözülmüştü; sayfa geçişleri (View Transitions) zaten vardı.
