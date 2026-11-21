# Supabase kurulumu

Undustit şu an yerel modda çalışır: veri tarayıcının localStorage'ında tutulur ve `assets/ayar.js`
içindeki `supabaseUrl` boş olduğu sürece böyledir. Verinin herkes için ortak ve kalıcı olması için
aşağıdaki adımları izleyin.

## 1. Proje oluşturun

1. https://supabase.com adresinde bir hesap açın ve **New project** ile yeni bir proje oluşturun.
2. Veritabanı şifresini bir yere kaydedin. Bölge olarak size yakın olanı seçin.
3. Proje hazır olana kadar bekleyin (birkaç dakika).

## 2. Şemayı çalıştırın

1. Sol menüden **SQL Editor** > **New query** açın.
2. `supabase/sema.sql` dosyasının tüm içeriğini kopyalayıp yapıştırın ve **Run** ile çalıştırın.
3. Hata olmadığını ve **Table Editor** ekranında `vakalar`, `profiller`, `fikirler` gibi tabloları
   gördüğünüzü kontrol edin. Vaka 01 de `vakalar` tablosunda olmalı.
4. Aynı şekilde sırayla `supabase/2-fikirler.sql` (sitenin fikirleri, talepleri, puanları ve yorumları),
   `supabase/3-hiz.sql` (puan ve talep için günlük sınır, fikirleri vakalarına bağlama) ve
   `supabase/4-acilis.sql` (fikir başına özet görünümü, "Vakanı aç" başvuruları, "haber ver" e-postaları)
   dosyalarını çalıştırın. Hepsi tekrar çalıştırılabilir. 4. dosya çalışmadan site eski yoldan (her satırı
   okuyarak) çalışmaya devam eder.
5. **Authentication** > **Sign In / Providers** altında **Allow anonymous sign-ins** seçeneğini açın:
   ziyaretçiler hesap açmadan fikir yazar ve "alırdım" der.

## 3. E-posta girişini açın

1. **Authentication** > **Sign In / Providers** (ya da **Providers**) bölümüne gidin.
2. **Email** sağlayıcısının açık olduğunu doğrulayın.
3. Yönetim panelinde "şifre" ile giriş yapılacağı için **Confirm email** seçeneğini isteğinize göre
   ayarlayın. Kapalıysa yeni kullanıcılar doğrulama beklemeden giriş yapar.

## 4. Yönetici hesabını oluşturun

1. **Authentication** > **Users** > **Add user** > **Create new user** yolunu izleyin.
2. E-posta olarak `admin@undustit.local` (ya da kendi e-postanız) girin ve güçlü bir şifre belirleyin.
   Şifreyi bir parola yöneticisinde saklayın.
3. Kullanıcı listesinde kullanıcının göründüğünü doğrulayın.
4. **SQL Editor** içinde yeni bir sorgu açıp şunu çalıştırın (e-postayı kendi yöneticinizinkiyle değiştirin):

   ```sql
   update public.profiller set rol = 'admin' where email = 'admin@undustit.local';
   ```

   Bu satır profilin rolünü yönetici yapar. Bu işlemi yalnız SQL Editor'dan yapabilirsiniz; site üzerinden
   kimse kendini yönetici yapamaz.

## 5. Bağlantı bilgilerini sitenin ayar dosyasına girin

1. **Project Settings** > **API** ekranında **Project URL** ve **anon public** anahtarını kopyalayın.
2. `assets/ayar.js` dosyasını açın ve şu iki alanı doldurun:

   ```js
   window.UD_AYAR = {
     supabaseUrl: 'https://xxxxxxxx.supabase.co',
     supabaseAnon: 'eyJhbGciOi...',
     adminler: ['admin@undustit.local']
   };
   ```

3. Anon anahtarın herkese açık olması sorun değildir: verinin korunmasını **Row Level Security**
   kuralları yapar (sema.sql içinde tanımlı). Yine de **service_role** anahtarını asla bu dosyaya
   koymayın.

## 6. Yönlendirme adreslerini ayarlayın

1. **Authentication** > **URL Configuration** ekranına gidin.
2. **Site URL** alanına sitenin adresini yazın:
   `https://undustit.com/`
3. **Redirect URLs** listesine şu iki adresi ekleyin:
   - `https://undustit.com/**`
   - `https://www.undustit.com/**`
   - `http://localhost:4317/**`

   Böylece sihirli bağlantılar hem canlı sitede hem yerel geliştirmede doğru sayfaya döner.

## 7. Kontrol

1. Yerel sunucuda (`http://localhost:4317/`) yönetim sayfasını açın ve yönetici e-postası ile şifresiyle
   giriş yapın. Vaka listesinde Vaka 01 görünmeli.
2. Taslak bir vaka oluşturup durumunu değiştirin, sonra başka bir tarayıcı penceresinde (oturum açmadan)
   vakanın herkese açık sayfasını kontrol edin: taslak görünmemeli, açık vaka görünmeli.

## 8. E-posta bildirimleri ("haber ver")

Site e-posta adreslerini `notify_requests` tablosuna yazar; göndermeyi bir Edge Function yapar. Bu adım
yapılmasa da site çalışır, adresler birikir ve sonra gönderilebilir.

1. https://resend.com hesabı açın, kendi alan adınızı doğrulayın ve bir API anahtarı alın.
2. Supabase CLI ile fonksiyonu yükleyin (proje klasöründe):

   ```bash
   supabase functions deploy haber-gonder --no-verify-jwt --project-ref azjdweynukmwxywdfewb
   ```

3. **Edge Functions** > **Secrets** altında şunları ekleyin: `RESEND_API_KEY`, `HABER_GONDEREN`
   (ör. `Undustit <haber@alanadiniz.com>`) ve `SITE_URL` (`https://undustit.com/`).
4. `supabase/21-haber-webhook.sql` dosyasını çalıştırın. Her yeni "alırdım" bu fonksiyonu çağırır. İmza anahtarı
   veritabanının içinde, Vault'ta üretilir (`haber_gonder_webhook`). Kimsenin görmesi ya da kopyalaması gerekmez,
   fonksiyon anahtarı yalnız `service_role`'ün çağırabildiği `haber_webhook_imza()` ile okur. Panelden ayrıca
   bir Database Webhook kurmayın, aynı e-postayı iki kez tetikler.
5. Deneme: bir fikre "haber ver" ile kendi adresinizi bırakın, başka bir tarayıcıdan "alırdım" deyin.
   E-posta gelmeli ve `notify_requests.sent_at` dolmalı. Her fikir için yalnız bir kez yazılır.

"Ön satışa çıkınca haber ver" istekleri (`kind = 'alirdim'`) şimdilik otomatik gönderilmez; ön satış
başlayınca yönetim tarafından bu listeye yazılır.

## 9. Ölçüm (Plausible)

https://plausible.io'da siteyi ekleyin ve `assets/ayar.js` içindeki `analitik` alanına alan adını yazın
(`'undustit.com'`). Çerez kullanmaz, KVKK için onay penceresi gerekmez. Özel olaylar
(Fikir gönderildi, Alırdım, Paylaş, Haber ver, Vaka başvurusu) Plausible'da **Goals** altında aynı
adlarla eklenmelidir.

## 10. Hesaplar: e-posta bağlama ve giriş ("Benim" sayfası)

Ziyaretçi anonim kalır; "Benim" sayfasında e-postasını bağlayınca anonim kullanıcı aynı kimlikle kalıcı hesaba
döner (fikirleri, fiyatları, yorumları onda kalır). Başka cihazda aynı e-postayla sihirli bağlantıyla girer.

1. **E-posta gönderimi (şart):** Supabase'in kendi e-posta servisi yalnız proje ekibindeki adreslere ve saatte
   birkaç e-posta gönderir; gerçek ziyaretçilere ulaşmaz. **Authentication** > **Emails** > **SMTP Settings**
   altında kendi SMTP'nizi açın (Resend: host `smtp.resend.com`, port `465`, kullanıcı `resend`, şifre Resend
   API anahtarı, gönderen kendi alan adınızdan bir adres).
2. **Yönlendirme adresleri:** **Authentication** > **URL Configuration** > **Redirect URLs** listesine
   `https://undustit.com/**` ve `http://localhost:4317/**` ekleyin (e-postadaki bağlantı
   "Benim" sayfasına döner).
3. **E-posta şablonları:** **Authentication** > **Emails** > **Templates** altında "Magic Link" ve
   "Change Email Address" şablonlarını Türkçeleştirin (ör. konu: "Undustit hesabını onayla").
4. **Deneme:** kendi e-postanızla bir fikre "alırdım" deyin, "Benim" sayfasında e-postanızı bağlayın, gelen
   bağlantıya tıklayın: sayfa "… ile girdin" demeli ve fikir hâlâ "Fikirlerin" altında olmalı. Sonra başka bir
   tarayıcıda "Giriş yap" ile aynı e-postaya bağlantı isteyin.

## 11. Ürün görselleri

`6-gorsel.sql`'i SQL Editor'da bir kez çalıştırın. Herkese açık `gorseller` kovasını (en çok 5 MB, JPEG/PNG/WebP)
ve kuralları kurar: vaka görselini yalnız yönetici yükler (yönetim > vaka > Bilgiler > Ürün görseli), "Vakanı aç"
başvurusu tek bir ürün fotoğrafı ekleyebilir (kişi başı günde en çok 5). Site fotoğrafı yüklemeden önce tarayıcıda
küçültür (uzun kenar 1600 px). Kontrol: **Storage** altında `gorseller` görünmeli; bir vakaya görsel yükleyip
vaka sayfasındaki "Teknik föy"e bakın.

## 12. Firma paneli

`7-firma.sql`'i SQL Editor'da bir kez çalıştırın. Sonra yönetim > vaka > **Firma erişimi** sekmesinde firmanın
e-postasını ekleyin. Firma `firma/` sayfasında bu e-postayı yazar, gelen bağlantıyla girer ve yalnız kendi vakasını
görür (taslakken de): fikirler, "alırdım"lar, fiyat dağılımı, CSV. Tek değiştirebildiği şey vakanın ürün fotoğrafı.

İki şart: e-postaların gerçekten gitmesi için §10'daki SMTP (Resend) ayarı, ve **Authentication > Sign In / Up >
Confirm email açık** olmalı. Kapalıyken biri hesabına başka birinin e-postasını yazıp o firmanın panelini açabilir.

## 13. Gizli vaka alanları

`8-gizli.sql`'i SQL Editor'da bir kez çalıştırın. Ziyaretçiler vakanın yalnız açık alanlarını okur; `taban_fiyat`,
`firma` ve `olusturan` (vakayı açan yöneticinin e-postası) kapanır. Yönetici bütün vakaları, firma kendi vakasını
`vaka_tam()` ile tam okur. Kontrol: yönetimde bir vakayı açıp kaydedin (taban fiyat görünmeli); oturumsuz bir
tarayıcıda vaka sayfası açılmalı.

## 14. "Google ile devam et"

Düğme (Benim sayfası ve firma paneli girişi) yalnız Google girişi açıkken görünür; kurulum bitince kendiliğinden çıkar.

1. **Google Cloud Console** > APIs & Services > **OAuth consent screen**: uygulama adı "Undustit", destek e-postası,
   alan adı geldiğinde gizlilik ve koşullar bağlantıları. Yayın durumu "In production".
2. **Credentials** > Create credentials > **OAuth client ID** > Web application. "Authorized redirect URIs" altına:
   `https://azjdweynukmwxywdfewb.supabase.co/auth/v1/callback`
3. Supabase > **Authentication** > **Sign In / Providers** > **Google**: açın, Client ID ve Client Secret'ı yapıştırın.
4. Supabase > **Authentication** > **Sign In / Providers** (üstteki genel ayarlar) > **Allow manual linking** açık
   olmalı. Ziyaretçinin anonim hesabı Google'a bu sayede bağlanır; fikirleri, fiyatları, yorumları kaybolmaz.
5. Yönlendirme adresleri §10'daki gibi (`.../Undustit/**`); ek bir şey gerekmez.

Deneme: gizli pencerede bir fikre "alırdım" deyin, Benim > "Google ile devam et", hesabı seçin. Döndüğünüzde
"… ile girdin" yazmalı ve "alırdım" yerinde durmalı.

## 15. Kayıt ve giriş (`giris/`)

Sitedeki kişi simgesi `giris/` sayfasını açar: e-posta + şifreyle kayıt, giriş ve şifre yenileme. Girişten sonra
yönetici `yonetim/`, firma `firma/`, üye `benim/` sayfasına geçer.

1. **Authentication > Sign In / Providers > Email**: açık; **Confirm email** açık (kayıt e-postayla doğrulanır,
   doğrulanmamış hesap giremez).
2. **SMTP** (§10): doğrulama ve şifre yenileme e-postalarının gerçek kişilere gitmesi için şart.
3. **URL Configuration > Redirect URLs**: `http://localhost:4317/**` ve sitenin adresi (`.../**`) listede olmalı;
   doğrulama ve şifre yenileme bağlantıları `giris/` sayfasına döner.
4. İsteğe bağlı: **Password requirements** altında en az 8 karakter (site de 8 ister).

## 16. Spam koruması (Cloudflare Turnstile)

> **21 Kasım 2026: kapalı.** Yönetici girişte doğrulama kutusunu geçemediği için kapatıldı: `assets/ayar.js` >
> `turnstile: ''` ve Supabase > Authentication > Attack Protection > **Enable CAPTCHA protection kapalı**.
> İkisi birlikte kapalı olmalı: Supabase'de açık kalırsa kimse giriş yapamaz, fikir yazamaz ("Güvenlik doğrulaması
> geçilemedi"). Yerine kalan korumalar: veritabanındaki hız sınırları (kişi başı günlük fikir, bildirim, görsel),
> küfür ön filtresi, "alırdım"da tarayıcı başına bir oy. Toplu sahte hesap açmak artık daha ucuz; spam görülürse
> aşağıdaki adımlarla yeniden açılır (site anahtarı yukarıdaki ayar satırının yorumunda).

Sitede her yazma (fikir, "alırdım", yorum, başvuru, mesaj) önce bir oturum açar; anonim ziyaretçi de. Turnstile bu
oturum açılışlarının ve kayıt, giriş, e-posta bağlantısı, şifre yenileme isteklerinin önünde durur, jetonu Supabase
kendi tarafında doğrular. Gerçek ziyaretçi çoğu zaman hiçbir şey görmez.

**Sıra önemli:** önce site anahtarı sitede olmalı, sonra Supabase'de açılmalı. Tersi olursa siteye yazılamaz.

1. **Cloudflare** (ücretsiz hesap) > **Turnstile** > **Add widget**: ad "Undustit"; **Hostname**: `localhost`,
   `undustit.com`, `www.undustit.com`; **Widget mode**: Managed. **Site Key** ve **Secret Key** çıkar.
2. `assets/ayar.js` > `turnstile:` alanına **Site Key**'i yazın ve yayına alın.
3. Supabase > **Authentication** > **Attack Protection** > **Enable CAPTCHA protection** > sağlayıcı **Turnstile** >
   **Secret Key**'i yapıştırın > **Save**.
4. Deneme: gizli pencerede bir fikre "alırdım" deyin; kaydolmalı. Konsolda `captcha` hatası varsa 1'deki hostname
   listesine sitenin adresi eklenmemiştir.

## 17. Moderasyon: ön filtre ve yorum gizleme

SQL Editor'da `13-moderasyon.sql` dosyasını çalıştırın (yeniden çalıştırılabilir). Getirdikleri:

- **Ön filtre:** `yasak_sozler` listesindeki bir sözü içeren fikir ya da yorum reddedilmez, gizli kaydedilir.
  Yazarı "incelemede" notuyla görmeye devam eder, başka kimse görmez.
- **Yorum gizleme:** `yorumlar.gizli` sütunu; yalnız yönetici değiştirir.
- **Yönetim:** `/yonetim/icerik/` bütün fikirleri ve yorumları listeler, tek anahtarla gizler ya da yayına alır;
  söz listesi aynı sayfadan düzenlenir. Dosya çalışmadan önce sayfa fikirleri listeler ve gizler, yorum gizleme
  ve söz listesi çalışmaz.

Dosya yeniden çalıştırılırsa başlangıç sözleri geri eklenir; sayfadan sildiğiniz bir başlangıç sözü geri gelir.

## 18. Ürün talepleri ("Ürünü görmek istiyorum")

SQL Editor'da `14-numune.sql` dosyasını çalıştırın (yeniden çalıştırılabilir). Vaka sayfasındaki form buraya yazar:
görmek, denemek ya da satın almak isteyen kişi adını ve iletişim bilgisini bırakır. Sipariş değildir, ödeme alınmaz.
Talepleri yalnız yönetici okur (`/yonetim/` > **Ürün talepleri**); kişi başına günde 5 talep sınırı vardır.

## 19. Vaka başvurusu: yeni alanlar ve durum takibi

SQL Editor'da `15-basvuru.sql` dosyasını çalıştırın (yeniden çalıştırılabilir). Başvuru formundaki ölçü, taban fiyat
ve model (satış ortaklığı / fikir ödülü) yanıtları kendi sütunlarına yazılır; başvuru, açılan vakaya bağlanır.
Başvurudaki e-postayla giriş yapan firma, vakası açılmadan önce `/firma/` sayfasında başvurusunun durumunu görür.
Yönetimde başvuru satırındaki **Vaka oluştur**, vaka formunu başvurudan doldurur; vaka oluşunca firma e-postası
panele eklenir ve başvuru "Kabul" olur. Dosya çalışmadan önce yeni yanıtlar başvurunun not alanına yazılır.

## 20. Yönetici kullanıcı adı

SQL Editor'da `16-kullanici-adi.sql` dosyasını çalıştırın (yeniden çalıştırılabilir). Yönetici, `/yonetim/` >
**Giriş bilgileri**'nden bir kullanıcı adı seçer; sonra `/giris/` ve `/yonetim/` giriş kutularına e-posta yerine onu
yazabilir, şifre aynıdır. Kullanıcı adı yalnız yönetici hesapları içindir: girişte adın hangi adrese ait olduğu sorulur
ve bu soru yalnız yönetici hesapları için yanıtlanır, üyelerin adresi bu yolla öğrenilemez.

## 22. Talep kilidi: "alırdım" yalnız sitenin yolundan

SQL Editor'da `18-talep-kilidi.sql` dosyasını `17-oy.sql`'den sonra çalıştırın (yeniden çalıştırılabilir).

- `talepler` tablosuna doğrudan satır yazılamaz; yeni bir "alırdım" yalnız `alirdim()` fonksiyonundan geçer ve
  tarayıcı kimliği olmadan kabul edilmez. Önceden API'den doğrudan yazan biri tarayıcı kontrolünü atlayabiliyordu.
- Fiyat tavanı 100.000 ₺'den 20.000 ₺'ye iner: tek bir uydurma fiyat toplam talebi ve ortalamayı tek başına
  oynatamaz. Daha yüksek bir ürün gelirse önce bu sayı, sonra `assets/ud/temel.js` `TERMS.maxPrice` ve
  `assets/veri.js` `MAKS_FIYAT` birlikte değişir.
- Fiyat değiştirmek ve "alırdım"ı geri almak eskisi gibi.

## 21. Adil talep: kendine oy ve aynı tarayıcı

SQL Editor'da `17-oy.sql` dosyasını çalıştırın (yeniden çalıştırılabilir).

- Kimse kendi fikrine "alırdım" diyemez, puan veremez.
- Bir tarayıcı bir fikre bir kez sayılır: site rastgele bir kimliği `ud_cihaz` çerezinde (ve yerel depoda) tutar,
  "alırdım" ile birlikte gönderir. Çıkış yapıp yeni ziyaretçi olarak dönmek ikinci bir "alırdım" eklemez; fikrin
  yazıldığı tarayıcı başka bir kimlikle o fikre "alırdım" diyemez.
- Gizli pencere ya da ikinci bir tarayıcı yeni bir cihaz sayılır; bunu yalnız doğrulanmış hesap zorunluluğu kapatır.
- Çerez kişiyi tanıtmaz (rastgele bir dizgi), iki yıl durur; KVKK ve çerez metninde "kötüye kullanımı önleme" amacıyla
  anılmalıdır.

## 23. Firma giriş bilgileri (kabul e-postası)

Yönetici bir başvurudan "Vaka oluştur" deyince firma e-postası vakaya eklenir ve `firma-davet` fonksiyonu o adrese
**kullanıcı adını** (e-posta adresi) ve tek kullanımlık **şifre belirleme bağlantısını** gönderir. Hesabı olmayan
firmaya davet bağlantısı, hesabı olana şifre yenileme bağlantısı gider. Şifre hiçbir zaman e-postaya yazılmaz.
Bağlantı `giris/` sayfasında "Yeni şifreni belirle" formunu açar; firma şifresini koyunca doğrudan firma paneline geçer.
Yönetim > vaka > **Firma erişimi** sekmesinde her adresin yanında son gönderim zamanı ve "Giriş bilgisi gönder /
Tekrar gönder" düğmesi vardır.

1. `supabase/19-davet.sql` dosyasını SQL Editor'de çalıştırın (gönderim zamanı sütunu, 20'den sonra `case_companies.invited_at`).
2. Fonksiyonu yükleyin. JWT doğrulaması **açık** kalır, çünkü yalnız giriş yapmış yönetici çağırabilir:

   ```bash
   supabase functions deploy firma-davet --project-ref azjdweynukmwxywdfewb
   ```

3. Secrets: `haber-gonder` ile aynı `RESEND_API_KEY`, `HABER_GONDEREN` ve `SITE_URL` (§8). Ek bir şey gerekmez.
4. **Authentication** > **URL Configuration** > **Redirect URLs** listesinde `https://undustit.com/giris/` olmalı (§10).
5. Bağlantının geçerlilik süresi **Authentication** > **Emails** altındaki e-posta OTP süresidir (varsayılan 1 saat;
   firmalar için 24 saat önerilir). Süresi geçerse "Tekrar gönder" ya da giriş sayfasındaki "Şifremi unuttum" yeterli.
6. Deneme: kendi adresinizle bir başvuru gönderin, yönetimde "Vaka oluştur" deyin. E-posta gelmeli, bağlantı şifre
   formunu açmalı, şifreden sonra firma paneli açılmalı.

## 24. Veritabanı adları İngilizce (`20-english-names.sql`)

Veritabanına bakan herkes Türkçe bilmeden okuyabilsin diye bütün tablo, sütun, görünüm, fonksiyon, kısıt, indeks,
kural ve tetikleyici adları İngilizcedir (`fikirler` → `ideas`, `vakalar.baslik` → `cases.title`, `alirdim()` →
`place_demand()`). Durum değerleri (`'yeni'`, `'acik'`, `'kabul'`) ve ziyaretçinin okuduğu hata mesajları Türkçe kaldı.

- **Tek eşleme:** Türkçe ad → İngilizce ad listesi `assets/ud/db.js` içindedir. Sitenin kodu Türkçe alan adlarıyla
  yazmaya devam eder, her sorgu bu dosyadan geçer. Sonuç satırları da Türkçe takma adla gelir (`baslik:title`).
  Göçün yeniden adlandırma kısmı aynı listeden `node tools/db-adlar.mjs` ile üretilir.
- **Yeni sütun ya da tablo eklerken:** SQL'de İngilizce adla yazın, `assets/ud/db.js` içine Türkçe karşılığını ekleyin.
  `node --test tests/edge/db.test.mjs` adların İngilizce ve tekil olduğunu denetler.
- **Sırası:** 1–19 numaralı dosyalar eski (Türkçe) adlarla yazılmıştır. Yeni kurulumda hepsini sırayla, sonra 20'yi
  çalıştırın. 20 çalıştıktan sonra 1–19'u **tekrar çalıştırmayın**, eski adlarla yeni tablolar açarlar.
- **Canlıya alma:** göç ve sitenin yeni kodu birlikte gider. Önce PR birleşir (Netlify yayınlar), hemen ardından
  `20-english-names.sql` çalışır, sonra iki Edge Function yeniden yüklenir:

  ```bash
  supabase functions deploy firma-davet --project-ref azjdweynukmwxywdfewb
  ```

  Arada geçen bir iki dakika boyunca site veri okuyamaz, yazamaz.
- **Adı değişmeyenler:** `auth.users` üzerindeki `auth_kullanici_profil` tetikleyicisi ve `storage.objects` üzerindeki
  `gorsel_*` kuralları Supabase'in kendi rollerine aittir, proje rolü adlarını değiştiremez. Çalışmaları etkilenmez:
  tetikleyici `public.create_profile()`'ı, kurallar `public.can_upload_image()` ve `public.is_any_company()`'yi çağırır.
  Görsel kovası `gorseller` adını korur (adı değişirse yüklenmiş fotoğrafların adresleri bozulur).
- **Webhook:** `haber-gonder` artık `21-haber-webhook.sql` içindeki tetikleyiciyle çağrılır (§8).

## 25. "Ne kadar çalıştı?": broşür QR'ı ve izlenen bağlantılar

Broşürdeki QR `https://undustit.com/brosur` adresine gider. `_redirects` bu adresi
`/fikir/?vaka=vaka-01&k=brosur`'a yönlendirir (302: basılı kod değişmeden hedef değiştirilebilir). Sayfa:

- gelen kişiye broşürün kendisini kapatılabilir bir pencerede gösterir (`assets/afis/challenge-001.webp`,
  `assets/ud/temel.js` içinde `AFISLER`),
- `k`'yı adresten siler (paylaşılan bağlantı broşür sayılmaz),
- tarayıcının `ud_cihaz` kimliğini `log_source_visit()` ile bir kez kaydeder.

Yönetim > **Ne kadar çalıştı** (`/yonetim/kaynak/`) her bağlantı için gelen tarayıcıyı ve bunlardan kaçının sonra
fikir yazdığını ya da "alırdım" dediğini gösterir. Burada yeni bağlantı da eklenir (ör. bir afiş için `afis-kampus`);
kaydedince QR'a konacak adres çıkar. Yalnız kayıtlı adlar sayılır.

**Kurulum:** `22-kaynak.sql` dosyasını SQL Editor'da çalıştırın (tekrar çalıştırmak güvenli). `brosur` kaydını kendisi açar.
Yeni bir broşür ya da afiş kısa adresi (`/brosur` gibi) istenirse `_redirects`'e aynı biçimde bir satır eklenir.

## 26. Ürünün 3D modeli (.glb)

Yönetici (vaka formunda "3D model") ya da vakanın firması (firma paneli > "3D model") ürünün `.glb` dosyasını yükler.
Vaka sayfasında ve teknik föyde fotoğrafın çerçevesinde döndürülebilir, yakınlaştırılabilir görünüm çıkar; fotoğraf
poster olarak kalır, telefonda "Odanda gör (AR)" düğmesi görünür (Android'de Scene Viewer, WebXR destekleyen tarayıcılar).

- **Kurulum:** `23-model.sql` dosyasını çalıştırın. `cases.model_url` sütununu, `set_case_model()` fonksiyonunu ve
  ayrı `modeller` kovasını (herkese açık, yalnız `model/gltf-binary`, en çok 20 MB) açar. Fotoğraf kovası 5 MB'ta kalır.
- **Görüntüleyici:** Google'ın `<model-viewer>` 4.0.0'ı, jsDelivr'dan, sabit sürüm ve SRI özetiyle
  (`assets/ud/temel.js` `MODEL_VIEWER`). Yalnız modeli olan sayfada yüklenir. Sürüm değişirse özet de değişmelidir.
- **Dosya kuralları:** `.glb` (tek dosya), en çok 20 MB, **Draco/KTX2 sıkıştırması olmadan**. Bu sıkıştırmaların
  çözücüleri Google'ın başka bir adresinden gelir ve sitenin güvenlik politikası (CSP) buna izin vermez; böyle bir
  model açılmaz, sayfada fotoğraf kalır.
- **Firmaya rehber:** CAD'den (STEP, STL) gelen dosya Blender ya da gltf.report ile `.glb`'ye çevrilir. Dosyası olmayan
  telefonla tarayabilir (Polycam, KIRI Engine, iPhone'da Object Capture). Bu metin firma panelinde yazar.
- **Yerel önizleme** (ayar.js boş) modeli `data:` adresi olarak saklar; görüntüleyici bunu CSP yüzünden açamaz.
  Gerçek görünüm Supabase'e bağlı localhost'ta ya da canlıda denenir.

## 27. Kâğıda yazılan fikirler

Broşür "fikrini kâğıda yaz, kutuya bırak" diyor. `24-kagit.sql` dosyasını çalıştırın. Yönetim > vaka > **Fikirler** >
**Kâğıttan fikir ekle**: her kâğıt bir kez girilir. Fikir sitede herkesinki gibi durur ("alırdım" alır, sıralamaya
girer); kâğıttaki e-posta, LinkedIn ya da telefon `paper_ideas` tablosunda yalnız yöneticiye görünür. Ne kadar
çalıştı sayfası bunları "Kâğıttan fikir" sütununda kaynağına (broşür) göre sayar. Yönetici girerken günlük 10 fikir
sınırına takılmaz.

## 28. Vaka adımlarında e-postalar

`25-bildirim.sql` dosyasını çalıştırın ve fonksiyonu yükleyin:

```bash
supabase functions deploy bildirim --no-verify-jwt --project-ref azjdweynukmwxywdfewb
```

Giden e-postalar: başvuru gelince firmaya onay ve yöneticilere haber; başvuru "İncelendi" ya da "Ret" olunca firmaya;
vaka taslaktan "Açık"a geçince firmalarına paylaşılacak bağlantı; kazanan seçilince fikir sahibine (hesabında
e-posta varsa) ve firmalara. Kâğıttan gelen ya da anonim fikir sahibine e-posta gitmez; yönetici kâğıttaki
iletişimden ulaşır. Ret e-postasında bir iletişim adresi görünsün isterseniz fonksiyon gizlilerine
`ILETISIM_EPOSTA` ekleyin. Resend alan adı doğrulanana kadar gönderim sessizce başarısız olur; hiçbir işlemi durdurmaz.

## Sorun giderme

- **"Veri servisi yüklenemedi"**: İnternet bağlantısını ve `supabaseUrl` değerinin `https://` ile başladığını kontrol edin.
- **"Bu işlem için yönetici girişi gerekli"**: Girişteki hesabın `profiller` tablosunda `rol = 'admin'` olduğunu
  kontrol edin (adım 4).
- **Giriş sonrası hâlâ çıkıyor**: Kullanıcı yeni oluşturulduysa profil satırı trigger ile gelir. Eski bir
  kullanıcıysa `sema.sql` sonundaki eksik profil ekleme sorgusunu bir kez çalıştırın.
