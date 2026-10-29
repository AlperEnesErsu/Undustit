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

Site e-posta adreslerini `haber_istekleri` tablosuna yazar; göndermeyi bir Edge Function yapar. Bu adım
yapılmasa da site çalışır, adresler birikir ve sonra gönderilebilir.

1. https://resend.com hesabı açın, kendi alan adınızı doğrulayın ve bir API anahtarı alın.
2. Supabase CLI ile fonksiyonu yükleyin (proje klasöründe):

   ```bash
   supabase functions deploy haber-gonder --no-verify-jwt --project-ref azjdweynukmwxywdfewb
   ```

3. **Edge Functions** > **Secrets** altında şunları ekleyin: `RESEND_API_KEY`, `HABER_GONDEREN`
   (ör. `Undustit <haber@alanadiniz.com>`), `SITE_URL` (`https://undustit.com/`) ve
   `WEBHOOK_SECRET` (uzun, rastgele bir metin).
4. **Database** > **Webhooks** > **Create a new hook**: tablo `public.talepler`, olay **Insert**, tür
   **Supabase Edge Functions**, fonksiyon `haber-gonder`. **HTTP Headers**'a `x-undustit-imza` adıyla
   3. adımdaki `WEBHOOK_SECRET` değerini ekleyin.
5. Deneme: bir fikre "haber ver" ile kendi adresinizi bırakın, başka bir tarayıcıdan "alırdım" deyin.
   E-posta gelmeli ve `haber_istekleri.gonderildi` dolmalı. Her fikir için yalnız bir kez yazılır.

"Ön satışa çıkınca haber ver" istekleri (`tur = 'alirdim'`) şimdilik otomatik gönderilmez; ön satış
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

## Sorun giderme

- **"Veri servisi yüklenemedi"**: İnternet bağlantısını ve `supabaseUrl` değerinin `https://` ile başladığını kontrol edin.
- **"Bu işlem için yönetici girişi gerekli"**: Girişteki hesabın `profiller` tablosunda `rol = 'admin'` olduğunu
  kontrol edin (adım 4).
- **Giriş sonrası hâlâ çıkıyor**: Kullanıcı yeni oluşturulduysa profil satırı trigger ile gelir. Eski bir
  kullanıcıysa `sema.sql` sonundaki eksik profil ekleme sorgusunu bir kez çalıştırın.
