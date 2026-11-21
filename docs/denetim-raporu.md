# Denetim raporu (19 Kasım 2026)

`DESIGN.md` > "Canlıya çıkış: eksikler" listesi koda karşı tek tek kontrol edildi. Bu turda gelen istekler ve
Google arama sonucundaki sorun da burada.

## 1. Eksik listesi: bugünkü durum

| # | Madde | Durum | Kalan |
|---|---|---|---|
| 1 | Sunucu ve veritabanı | ✅ Supabase. RLS, sunucu tarafı doğrulama ve hız sınırları var (`supabase/2-fikirler.sql`, `3-hiz.sql`, `9-saglam.sql`) | – |
| 2 | Hesap, bir kişiye bir oy | ✅ E-posta + şifre, sihirli bağlantı, Turnstile, cihaz izi (`17-oy.sql`, `18-talep-kilidi.sql`) | Gizli pencere yeni cihaz sayılır. Bunu yalnız "alırdım için doğrulanmış hesap şart" kuralı kapatır (ürün kararı) |
| 3 | Ödeme (ön satış, 99 ₺ / 10 ₺, iade, fatura) | ❌ Yok | iyzico ya da PayTR üye işyeri hesabı ve mesafeli satış metni. Bunlar olmadan kod yazılamaz |
| 4 | Hukuk (KVKK, şartlar, mesafeli satış, fikri mülkiyet) | 🟡 Sayfalar hazır, `ayar.js` > `yasal:false` | Avukat okuması, veri sorumlusu bilgileri. Mesafeli satış metni ödemeyle birlikte gelecek. Fikrin zaman damgası sunucuda tutuluyor |
| 5 | Moderasyon ("bildir", kuyruk) | ✅ `13-moderasyon.sql`, yönetim paneli | – |
| 6 | Firma başvurusu ve iletişim | ✅ Başvuru formu, iletişim sayfası, firma paneli. **Bu tur:** kabul edilen firmaya giriş bilgisi e-postası (§3) | `ayar.js` > `iletisim` adresi boş |
| 7 | Bildirim e-postaları | 🟡 Yalnız "fikrine ilk alırdım geldi" ve bu turda firma kabul e-postası | Fikre yorum geldi, eşik doldu, perşembe hatırlatması, ön satış başladı. Hepsi koddan yapılabilir, sıradaki iş bu |
| 8 | Ölçüm ve hata takibi | 🟡 Plausible bağlantısı hazır, site hataları kendi tablosunda (`10-hata.sql`) | `ayar.js` > `analitik` boş. Plausible hesabı açılınca `'undustit.com'` yazılır |
| 9 | Kendi alan adı | ✅ undustit.com (Netlify). github.io ve netlify.app adresleri yönlendiriliyor | – |

**Özet:** Koddan kapatılabilecek tek büyük madde bildirimler (7). 3 ve 4 dış hesap ve avukat bekliyor, 8 için tek bir
ayar satırı yeterli.

## 2. Google arama sonucu anlaşılmıyordu

**Görülen:** Google'da sitenin açıklaması yerine `2 ud.al.alirdim: Ürünü deneyimledim. Stres Çarkı olarak…`
yazıyordu. Ham bir metin anahtarı ve rastgele bir örnek fikir görünüyordu.

**Neden:** Google sayfayı JavaScript ile çizerken metin sözlüğü (`assets/metin/tr.js`) yüklenmemiş. Eksik metin
için `T()` anahtarın kendisini döndürüyordu, bu yüzden fikir kartında "alırdım" yerine `ud.al.alirdim` yazdı.
Google da `<meta name="description">` yerine bu kart metnini önizlemeye aldı.

**Düzeltme:**
- `assets/ud/temel.js`: eksik metin artık boş döner, anahtar asla ekrana çıkmaz (konsola bir kez uyarı yazılır).
  Eksik anahtarları yayından önce `python tools/metin.py denetle` yakalar.
- Ana sayfada canlı bölümler (sayılar, açık vaka, iki fikir listesi, akış) ve `fikirler/` panosu
  `data-nosnippet` ile işaretlendi. Google önizlemeye bunları almaz, sitenin açıklamasını ya da sabit metni kullanır.

**Sizin yapacağınız:** Google Search Console > URL denetimi > `https://undustit.com/` > "Dizine eklenmesini iste".
Önizleme Google sayfayı yeniden taradığında değişir, bu birkaç gün sürebilir. Aynı ekranda "Taranan sayfayı
görüntüle" ile Google'ın sözlüğü yükleyip yüklemediği de görülür. Yüklemiyorsa sıradaki adım sözlüğü
`document.write` yerine sayfaya sabit `<script>` olarak eklemek.

## 3. Bu turda yapılanlar

**Dil tarayıcıya göre.** Adreste `?dil=` yoksa site önce ziyaretçinin son seçimine, o da yoksa tarayıcı diline bakar:
tarayıcısı Türkçe olana Türkçe, diğer herkese İngilizce açılır. TR/EN anahtarındaki seçim tarayıcıda hatırlanır.
Arama motorları her zaman Türkçe görür, böylece `hreflang` ve canonical düzeni bozulmaz (`assets/stil.js`).

**Kabul edilen firmaya giriş bilgisi.** Yönetici bir başvurudan "Vaka oluştur" deyince firma e-postası vakaya eklenir
ve o adrese şunlar gider:
- **Kullanıcı adı:** firmanın e-posta adresi.
- **"Şifremi belirle" bağlantısı:** tek kullanımlıktır. Hesabı olmayana davet, olana şifre yenileme bağlantısı gider.

Şifre e-postaya yazılmaz, böylece posta kutusunda açık şifre kalmaz. Bağlantı giriş sayfasında şifre formunu açar,
firma şifresini koyunca doğrudan firma paneline geçer. Yönetim > vaka > "Firma erişimi" sekmesinde her adresin
yanında son gönderim zamanı ve "Giriş bilgisi gönder / Tekrar gönder" düğmesi var.
Canlıya alma: `supabase/KURULUM.md` §23 (`19-davet.sql` ve `firma-davet` fonksiyonu).

## 4. Ürün görselinde 3D (aşama 1 yapıldı, aşama 2 plan)

> 21 Kasım 2026: aşama 1 sitede (`23-model.sql`, `supabase/KURULUM.md` §26). Aşama 2 karar bekliyor.

**Aşama 1: Elinde 3D dosyası olan yüklesin (yaklaşık 1–2 gün)**
- Firma panelinde ve yönetimde fotoğrafın yanına "3D model (.glb)" alanı gelir. Supabase Storage'a yüklenir
  (`gorseller` kovası, `model/gltf-binary`, üst sınır yaklaşık 20 MB). `vakalar.model3d` sütununda adresi durur.
- Vaka sayfasında ve teknik föyde fotoğraf yerine döndürülebilir, yakınlaştırılabilir görünüm gelir
  (`@google/model-viewer`, jsDelivr'dan, mevcut CSP'ye uyar). Fotoğraf poster olarak kalır, telefonda "AR'da gör" çıkar.
- CAD'den (STEP/STL) gelen firmalar için kısa bir rehber: GLB'ye çevirme ve küçültme (Blender ya da gltf.report).

**Aşama 2: Dosyası olmayan için iki yol**
1. *Firma kendi telefonuyla tarar* (önerilen ilk yol, bize maliyeti yok): Polycam, KIRI Engine ya da iPhone'da Object
   Capture gibi uygulamalar, ürünün çevresinden 30–60 fotoğrafla GLB çıkarır. Sayfaya bunun için bir rehber konur.
2. *Fotoğrafları biz 3D'ye çeviririz:* firma ürünün her yanından 4–8 fotoğraf yükler. Yönetimde "Fotoğraflardan 3D
   üret" düğmesi bir Edge Function üzerinden çok açılı fotoğraftan 3D üreten bir servise gönderir (Meshy, Tripo,
   Stability'nin 3D modelleri, ya da kendi sunucumuzda açık kaynak Hunyuan3D). Sonuç birkaç dakikada gelir, yönetici
   önizler ve onaylarsa yayınlanır.
   - Maliyet: model başına ücretli kredi. Güncel fiyatlar servis seçilirken bakılmalı. Ücreti vaka paketine
     eklemek mantıklı ("3D'li vaka").
   - Uyarı: yapay zekâ ölçüyü uydurabilir (bir cıvatanın diş adımı gibi). Görünüm "görsel amaçlıdır, teknik ölçü
     değildir" notuyla çıkmalı. Teknik ölçü teknik föyde kalır.

**Öneri sırası:** Aşama 1 + telefonla tarama rehberi. Firmalardan talep gelirse ücretli servisle Aşama 2.
Karar gereken: hangi servis (deneme için 2–3 ürünle karşılaştırma önerilir) ve 3D'nin ücretli pakete girip girmeyeceği.
