# Devir el kitabı

Undustit'i devralacak kişi ya da şirket için: neler devredilir, gizli bilgiler nerede durur, ne kadar tutar ve
devir adım adım nasıl yapılır. Rakamlar ve fiyatlar yaklaşıktır; devir günü güncelini kontrol edin.

## 1. Devredilecek varlıklar

| Varlık | Nerede | Devir yolu | Durum |
|---|---|---|---|
| Kaynak kod | GitHub `AlperEnesErsu/Undustit` | Depo aktarımı (Settings › Transfer) | Hazır |
| Yayın | GitHub Pages (`main`, kök) | Depoyla birlikte gelir | Hazır |
| Veritabanı, kimlik, fonksiyonlar | Supabase projesi `azjdweynukmwxywdfewb` | Projeyi alıcının organizasyonuna aktarma | Hazır |
| Alan adı | Kayıt firması | Aktarma kodu (EPP) ya da firma içi devir | Alındı, bağlanmadı |
| E-posta gönderimi | Resend | Hesap ya da alan adı doğrulaması alıcıya | Kurulacak |
| Ölçüm | Plausible | Site sahipliği aktarma | Kurulacak |
| İçerik ve marka | "Undustit" adı, logo, metinler, çizimler | Satış sözleşmesinde fikri mülkiyet maddesi | Sözleşmede |
| Topluluk verisi | Fikirler, talepler, yorumlar, e-postalar | KVKK'ya uygun devir (aydınlatmada belirtilmeli) | Avukat |

## 2. Gizli bilgiler nerede

| Bilgi | Yer | Not |
|---|---|---|
| Supabase anon anahtarı | `assets/ayar.js` | Herkese açık olması tasarım gereği; koruma RLS'te |
| Supabase service_role anahtarı | Yalnız Supabase panelinde ve Edge Function ortamında | Kodda yok; devirden sonra yenilenmeli |
| Resend API anahtarı, `WEBHOOK_SECRET` | Supabase › Edge Functions › Secrets | Devirden sonra yenilenmeli |
| Yönetici hesapları | Supabase › Authentication › Users + `profiller.rol` | Aşağıda nasıl değiştirileceği |
| Veritabanı şifresi | Supabase panelinde | Devirden sonra yenilenmeli |

Kodda gerçek bir şifre ya da gizli anahtar yoktur. `assets/veri.js` içindeki deneme şifresi yalnız Supabase
bağlı değilken (yerel önizleme) geçerlidir.

## 3. Aylık maliyet (yaklaşık, Ekim 2026)

| Hizmet | Bugün | Büyüyünce |
|---|---|---|
| GitHub + Pages | Ücretsiz | Ücretsiz |
| Supabase | Ücretsiz katman | Pro plan (aylık sabit + kullanım) |
| Resend | Ücretsiz katman (aylık birkaç bin e-posta) | Ücretli plan |
| Plausible | Deneme / en küçük plan | Trafiğe göre |
| Alan adı | Yıllık yenileme | Yıllık yenileme |

## 4. Devir adımları

1. **Hazırlık:** kontroller yeşil (GitHub Actions "Kontrol"), `supabase/KURULUM.md` güncel, yönetim panelinden vaka
   CSV'leri ve Supabase'den tam yedek alınır (Database › Backups ya da `pg_dump`).
2. **Kod:** depo alıcıya aktarılır. GitHub Pages ayarı (Settings › Pages › `main` / kök) kontrol edilir.
3. **Supabase:** proje alıcının organizasyonuna aktarılır. Ardından service_role ve veritabanı şifresi yenilenir;
   yeni anon anahtar `assets/ayar.js`'e yazılırsa site yeniden yayınlanır.
4. **Yöneticiler:** alıcının hesabı yönetici yapılır, eskiler kaldırılır:
   ```sql
   update public.profiller set rol = 'admin' where email = 'yeni@alici.com';
   update public.profiller set rol = 'uye'   where email = 'eski@satici.com';
   ```
   `assets/ayar.js` içindeki `adminler` listesi de güncellenir.
5. **E-posta ve ölçüm:** Resend ve Plausible alıcının alan adı ve hesabıyla yeniden bağlanır (KURULUM §8–10).
6. **Alan adı:** aktarılır; canonical, og ve `sitemap.xml` adresleri yeni alan adına çevrilir.
7. **Son kontrol:** canlıda bir fikir, bir "alırdım", bir başvuru; yönetim panelinde görünmeli.

## 5. Teknik inceleme için kısa özet

- **Mimari:** statik HTML/CSS/JS (derleme yok) + Supabase (Postgres, anonim ve e-posta kimlik, RLS, Edge Function).
- **Güvenlik:** her tablo RLS'li; ziyaretçi yalnız kendi satırını yazar; e-posta, başvuru ve mesajları yalnız sahibi
  ve yönetici okur; günlük sınırlar trigger'da; tarih sunucuda yazılır.
- **Kontroller:** Playwright (15 sayfa + ana akışlar, masaüstü ve telefon), SQL testleri (migration'lar ve erişim
  kuralları), sözlük denetimi; hepsi her PR'da.
- **Erişilebilirlik ve hız:** axe ciddi ihlal 0, mobil LCP ~2 sn (jüri 4. tur), hareketi azalt desteği.
- **Bilinen sınırlar:** `docs/yol-haritasi.md` (ödeme yok, fikir başına paylaşım önizlemesi alan adını bekliyor,
  `ud.js` tek dosya).
