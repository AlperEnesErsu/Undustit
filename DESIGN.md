# Undustit tasarım notları

## Quirky modeli (22 Ekim 2026 görüşmesi sonrası)

İş modeli Quirky'ye yaklaştırıldı: kısa form (140 karakter + kategori + problem + çözüm + en
çok 3 özellik), küçük gönderim ücreti, 30 gün oylama, üç ölçüt (tasarım, pazar,
uygulanabilirlik), perşembe 20.00 canlı değerlendirme, topluluğun geliştirmeye katılması, ön satış
eşiği (300–750), satıştan pay (perakende %10, doğrudan %30).

- `ana/`: üç rakip ana sayfa. `a/` Atölye (form + animasyon yan yana), `b/` Sahne (perşembe
  şovu, alta sabit yazma çubuğu), `c/` Kâğıt (açık tema, editoryal, üç tur kolonu).
  `ana/index.html` üçünü canlı önizlemeyle karşılaştırır. Seçilen aday köke taşınacak.
- `fikir/` (form, `?vaka=vaka-01` vakayı seçili açar), `fikirler/` (arena; `?f=<id>` fikri
  açar), `nasil/` (7 adım + `#pay` tablosu), `vakalar/`, `hikaye/`.
- Ortak parçalar `assets/ud.css` ve `assets/ud.js` içinde: menü ve alt bilgi JS ile basılır,
  her sayfa `<html data-root>` ile köke giden yolu verir. Logo son ziyaret edilen ana sayfa
  adayına gider (`localStorage: ud-home`).
- Taslak ticari şartlar yalnız `ud.js` içindeki `TERMS` sabitinde (ücret, gün, paylar, eşik,
  canlı yayın saati). Havuz bölüşüm tablosu `nasil/index.html` içinde ve "taslak" etiketli.
- Veri: claude.ai'de `db` yeteneğiyle `ideas/<uid>`, `votes/<uid>`, `notes/<uid>` (herkes
  kendi belgesini yazar). Başka yerde aynı yapı `localStorage`'da tutulur ve alt bilgide
  "önizleme" rozeti görünür. Gerçek fikir yokken örnekler "örnek · oylanamaz" etiketiyle durur.
- Süreç animasyonu kaydırmaya bağlı değil: ekrana girince yaklaşık 6,5 sn'de bir kez oynar,
  sonunda "Tekrar oynat". Reduced motion'da doğrudan son kare.
- C adayı açık tema kullanıyor; bu "tek tema" kuralına bilinçli bir istisna. C seçilirse iç
  sayfalar da açık temaya taşınmalı.
- Eski `index.html` ve `vaka-01/` dokunulmadan duruyor.

Undustit bir platform: üretim fazlalarına ve sorunlara yaratıcı fikirler gelir, ürün sahibinin
dikkatini çeken fikir ortaklığa dönüşür. Cıvata yalnız ilk vaka.

- `index.html`: platform sayfası. Yöntem çizimi (fazla → fikir → ortaklık), nasıl işliyor,
  vakalar (Vaka 01 + kesikli çerçeveli "örnek vaka türü" kartları), iki taraf, "Vakanı aç"
  föyü, SSS. Form ya da fikir listesi burada yok.
- `vaka-01/`: ilk vaka sayfası (eski `kucuk-fikirler/`). Hikâye, fikir formu, liste, hesap,
  teknik föy burada. `kucuk-fikirler/` yalnız buraya yönlendirir.
- Örnek vaka kartları gerçek firma ya da açık vaka gibi gösterilmez; etiketleri ve alttaki
  not bunu açıkça söyler. Gerçek bir Vaka 02 gelince kart onunla değiştirilir.
- "Vakanı aç" föyü şimdilik bilgi amaçlı; başvuru kanalı (e-posta, form) seçilince bağlanmalı.

Sayfalar tek bir temayı paylaşır: `index.html` ve `vaka-01/`.
Her sayfa tek dosyalık bir artifact olduğu için token'lar iki dosyanın `:root` bloğunda birebir
aynı tutulur. Birinde renk, font, radius veya süre değişirse diğerinde de değişmeli.

## Tema: koyu atölye

| Rol | Token | Değer |
|---|---|---|
| Sayfa zemini | `--bg` | `#0B0C0D` |
| Yüzey / kart | `--bg-2`, `--bg-3` | `#111315`, `#171A1C` |
| Çizgi | `--line`, `--line-2` | `#22262A`, `#30353A` |
| Metin | `--ink`, `--ink-2`, `--muted` | `#EEECE7`, `#BFBDB6`, `#8F928E` |
| Tek vurgu | `--accent` (+ hover/active/ink) | `#FF6A2B` |
| Olumlu durum | `--ok` | `#86D4A6` |

Kontrast (WCAG 2.2 AA): ink/bg 16.6, muted/bg 6.2, accent/bg 6.9, accent-ink/accent 6.8.

Fontlar: Instrument Serif (başlıklar, büyük rakamlar), Geist (gövde), Geist Mono (etiket, sayı).

## Kararlar

- Ana sayfanın eski açık/koyu çelik teması (Archivo + Figtree) kaldırıldı. Tek tema kuralı
  (UI-UX kit, `redesign`) gereği iki sayfa da koyu atölye temasını kullanır.
- Marka adı "İkinci Tur" yerine **Undustit**. Logo: `Undust` + italik turuncu `it`.
- Başlıklar en fazla 3 satır. Ana sayfa hero'su 7/5 asimetrik ızgara.
- Yan yana iki bölüm aynı düzeni kullanmaz: hero split, ofsetli adım listesi, örnek + form,
  fikir panosu, hesap tablosu, iki sütunlu SSS.
- Hikâye sayfasında menü, sabit çizimin üstünde şeffaf; içerik altına girince opak olur.
- Hikâye başlıkları üst üste binmez: eski başlık 100 ms'de çıkar, yenisi ondan sonra girer.
- Her hareketin `prefers-reduced-motion` karşılığı var.
- İki sayfa aynı menü setini kullanır: Hikâye · Fikirler · Hesap · Teknik föy. 1040 px altında
  menü bir düğmenin açtığı panele (linkler + dil seçimi) taşınır, "Fikrini gönder" görünür kalır.
- Ana sayfa bölümleri pafta gibi numaralanır (01 / 04 ...). Sayfalar arası geçiş
  `@view-transition` ile; logo ve menü yerinde kalır.
- 404 sayfası aynı temada, "boş delik" çizimiyle. Linkleri kök (`/`) varsayar; site bir alt
  klasörde yayınlanırsa güncellenmeli.
- `claude.ai` üzerinden çalışan fikir formu ve liste bilinçli olarak böyle; dokunulmadı.
