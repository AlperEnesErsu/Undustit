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
- Süreç animasyonu kaydırmaya bağlı değil ve dört adımdır: Yaz → Alırdım → Ön satış → Kazan.
  Ekrana girince yaklaşık 5,5 sn'de bir kez oynar, ürün (katlanır kesme tahtası) gerçekten
  çizilir, sonunda "Tekrar oynat". Reduced motion'da doğrudan son kare.
- "Vakanı aç" şimdilik bilgi amaçlı; başvuru kanalı (e-posta, form) seçilince bağlanmalı.

## Stiller: aynı site, dört görünüm (22 Ekim 2026)

Ürün sahibi aynı siteyi farklı tarzlarda görmek istedi. İçerik, sayfalar ve akış tek; yalnız
görünüm değişir. Her stil ayrı bir site gibi açılır:

| Stil | Bağlantı | Dosya | Özü |
|---|---|---|---|
| Kâğıt | `/` | (varsayılan, `ud.css`) | Sıcak kâğıt, editoryal serif, mavi yalnız eylemde |
| Oyuncu | `/?stil=oyuncu` | `assets/stil/oyuncu.css` | Krem zemin, Bricolage Grotesque, mürekkep çerçeve + sert gölge, mor eylem, sarı işaretleyici |
| Teknik çizim | `/?stil=teknik` | `assets/stil/teknik.css` | Mavi pafta + ızgara, IBM Plex Condensed büyük harf, mono etiketler, kesikli çizgi, sarı eylem |
| Yumuşak | `/?stil=yumusak` | `assets/stil/yumusak.css` | Warm Soft-SaaS: sıcak beyaz + pastel bölümler, Nunito 800–900, kendi renginin koyu tonuna oturan ve basınca gömülen hap düğmeler, mercan eylem, turkuaz ilerleme |

- `assets/stil.js` her sayfanın `<head>`'inde çalışır: `?stil=` değerini okur, stil dosyasını
  sayfa çizilmeden yükler ve bütün iç bağlantılara aynı `?stil=` değerini ekler. Stil tarayıcıya
  kaydedilmez; bu yüzden dört stil ayrı sekmelerde yan yana açılabilir, birbirini etkilemez.
- `stiller/` dördünü canlı önizlemeyle gösterir ve her birini yeni sekmede açar. Ürün sahibine
  gönderilecek bağlantı bu. Her sayfanın alt bilgisinde de stiller arası geçiş satırı var.
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
- 404 sayfası linkleri kök (`/`) varsayar; site bir alt klasörde yayınlanırsa güncellenmeli.
- Sayfalar yalnız Türkçe; eski Vaka 01'deki TR/EN seçimi taşınmadı.
