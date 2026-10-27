# Undustit

> **In English:** Undustit is a community product workshop in Turkish and English. People write a product idea in one
> sentence; others say "I'd buy" and name their price; the five most wanted ideas are discussed live every
> Thursday; enough pre-orders put a product into production and everyone who helped shares the sales. Companies
> open their unsold stock as "cases" and the community finds it a new use. Static site (GitHub Pages) + Supabase
> (Postgres, auth, row-level security). No build step. Checks: Playwright, SQL tests, CI.

Fikrini tek cümleyle yaz; topluluk "alırdım" der ve fiyat yazar. En çok istenen beş fikir her perşembe canlı yayında
konuşulur, ön satış eşiği dolunca üretilir, satıştan katkı veren herkes pay alır. Firmalar satamadıkları stoğu
"vaka" olarak açar; topluluk o stoğa yeni bir iş bulur. İlk vaka: **Vaka 01 · Boltun**, bir milyon M10 cıvata.

Canlı: https://alperenesersu.github.io/Undustit/

## Neler var

| Bölüm | Sayfa | Ne yapar |
|---|---|---|
| Ana sayfa | `/` | Form, "eskizden rafa" animasyonu, açık vaka, canlı sayılar, üç tur |
| Fikir yaz | `/fikir/` | Cümle + kategori yeter; detay isteğe bağlı |
| Fikirler | `/fikirler/` | Talep sıralaması, "alırdım" + hazır fiyatlar, üç ölçüt puanı, yorum, paylaş, bildir |
| Vakalar | `/vakalar/`, `/vaka-01/`, `/vaka/?id=` | Fazla stok çağrıları, vakaya fikir, "Vakanı aç" başvurusu |
| Perşembe | `/persembe/` | Sonraki yayın, takvime ekle, bu haftanın beş adayı |
| Benim | `/benim/` | Kişinin fikirleri, talebi, "alırdım"ları, e-posta bağlama (isteğe bağlı hesap) |
| Nasıl işler, Hikâye | `/nasil/`, `/hikaye/` | Model, paylar (genel %10–30, vakalarda kârın %40 + %10'u) |
| İletişim, yasal | `/iletisim/`, `/kvkk/`, `/kosullar/` | Form; yasal metinler taslak, `ayar.js` ile açılır |
| Firma paneli | `/firma/` | Vaka açan firma, yöneticinin eklediği e-postayla girer; kendi vakasının fikirleri, talepleri, fiyat dağılımı, CSV, ürün fotoğrafı |
| Yönetim | `/yonetim/`, `/yonetim/rapor/` | Vakalar (oluştur, durum, kazanan, görsel, CSV), başvurular, mesajlar, bildirilen fikirler; rapor: talep tutarı, haftalık etkinlik, vaka bazında ilgi |

## Klasörler

```
index.html, fikir/, fikirler/, …   sayfalar (her sayfa düz HTML; metinler data-t ile sözlükten gelir)
assets/ud/          ortak betik, sırayla yüklenen dört dosya:
  temel.js          metinler, ticari şartlar (TERMS), tarihler, yardımcılar, Supabase istemcisi, hata bildirimleri, ölçüm
  depo.js           veri deposu (Store): fikirler, talepler, puanlar, yorumlar (Supabase / yerel)
  arayuz.js         menü, form, kartlar, fikir penceresi, vaka bandı, paylaş, bildir
  hareket.js        "eskizden rafa" animasyonu, kaydırma hareketleri; window.UD'yi kurar
assets/veri.js      yönetim paneli veri katmanı (window.UDV)
assets/anlatim.js   Vakalar, Fikirler, Hikâye sayfalarındaki anlatıcı animasyonlar
assets/ayar.js      ayarlar (aşağıda)
assets/metin/       tr.js ve en.js: sitedeki her yazı (anahtar → metin)
assets/stil/        görünümler (Oyuncu varsayılan, Kâğıt ?stil=kagit); stil.js seçer
supabase/           şema ve migration'lar (sırayla 1–8), Edge Function, KURULUM.md
tools/metin.py      metin aracı (etiketle, yaz, denetle)
tests/              Playwright testleri (e2e/), SQL testleri (sql/), test sunucusu
docs/               ürün sözleşmesi, açılış içerik kiti, yol haritası, devir el kitabı
DESIGN.md           tasarım ve ürün kararları, tarihleriyle
```

## Stiller: hangi dosya neyi belirler

Sıra önemlidir; sonra gelen öncekini ezer.

| Dosya | Görevi |
|---|---|
| `assets/ud.css` | Tasarım belirteçleri (renk, yazı, boşluk) ve bütün bileşenlerin temel hali |
| `assets/bilesen.css` | Yönetim bileşenleri (alan, rozet, tablo, sekme, panel…) |
| `assets/stil/oyuncu.css` | Varsayılan görünüm "Oyuncu": belirteçleri ve yalnız görünüşü ezer (kenarlık, gölge, hover). Davranış ve yerleşim ud.css'te kalır |
| `assets/anlatim.css` | Yalnız Vakalar, Fikirler, Hikâye animasyonları |
| sayfanın kendi `<style>`'ı | O sayfaya özgü yerleşim |

Bir bileşenin görünüşünü değiştirmek için önce `oyuncu.css`'e, yapısını değiştirmek için `ud.css`'e bakın.

## Yerelde çalıştırma

Derleme yok. Klasörü herhangi bir statik sunucuyla açın:

```bash
python -m http.server 4317
```

ya da `npm run sunucu` (http://127.0.0.1:4455). `assets/ayar.js` içinde `supabaseUrl` boşsa site **yerel modda**
çalışır: veri tarayıcının deposunda durur, yönetim paneline `ayar.js`'teki `adminler` listesindeki bir e-posta ve
yerel deneme şifresiyle girilir (`assets/veri.js`). Doluysa Supabase'e bağlanır.

## Ayarlar (`assets/ayar.js`)

| Alan | Ne işe yarar |
|---|---|
| `supabaseUrl`, `supabaseAnon` | Supabase projesi. Anon anahtar herkese açık olabilir; veriyi RLS kuralları korur. **service_role asla buraya girmez.** |
| `adminler` | Yönetim paneline girebilecek e-postalar (Supabase'de ayrıca `profiller.rol = 'admin'`) |
| `analitik` | Plausible alan adı; boşken ölçüm yüklenmez |
| `iletisim` | Herkese açık iletişim e-postası; boşken yalnız form |
| `yasal` | `true` olunca KVKK ve koşullar alt bilgide ve formlarda görünür |
| `yayin` | Perşembe yayınının adresi; doluyken "Yayına git" çıkar |

Ticari oranlar (ücret, gün, paylar, eşik, yayın saati) `assets/ud/temel.js` içindeki `TERMS` sabitinde, tek yerde.

## Veritabanı

`supabase/KURULUM.md` adım adım anlatır. Sıra: `sema.sql`, `2-fikirler.sql`, `3-hiz.sql`, `4-acilis.sql`,
`5-guven.sql`, `6-gorsel.sql`, `7-firma.sql`, `8-gizli.sql` (hepsi yeniden çalıştırılabilir). Ürün görselleri Supabase Storage'da, `gorseller` kovasında. Ziyaretçi anonim oturumla yazar; satır düzeyinde güvenlik (RLS)
herkesin yalnız kendi satırlarını değiştirmesine izin verir, günlük sınırlar trigger'larla. E-posta bildirimi:
`supabase/functions/haber-gonder` (Resend).

## Metinler ve diller

Her yazı `assets/metin/tr.js` ve `en.js` sözlüklerinde. `?dil=en` İngilizce açar.

```bash
python tools/metin.py denetle          # eksik, kullanılmayan, boş anahtarlar
python tools/metin.py yaz              # tr.js'teki metni sayfaların HTML'ine yaz (arama motorları için)
```

## Kontroller

```bash
npm ci && npx playwright install chromium
npm test                               # sayfalar ve akışlar, masaüstü + telefon, yerel modda
npm run test:metin                     # sözlük denetimi (hata varsa başarısız)
bash tests/sql/calistir.sh             # migration'lar + erişim kuralları (psql ve PG* değişkenleri gerekir)
```

Aynı üçü her PR'da GitHub Actions ile çalışır (`.github/workflows/kontrol.yml`). Testler canlı veritabanına dokunmaz.

## Yayın

GitHub Pages, `main` dalının kökünden yayınlar; birleştirilen her PR birkaç dakikada canlıdadır. Alan adına geçince
canonical, og ve `sitemap.xml` adresleri güncellenmeli (yol haritası).

## Belgeler

- `DESIGN.md`: tasarım ve ürün kararları, nedenleriyle
- `docs/yol-haritasi.md`: satışa giden beş faz
- `docs/devir.md`: projeyi devralacak kişi için hesaplar, anahtarlar, maliyetler, adımlar
- `docs/acilis-icerik.md`: açılış içerik kiti
- `docs/urun-sozlesmesi.md`: bileşen, veri ve yönetim sözleşmesi
