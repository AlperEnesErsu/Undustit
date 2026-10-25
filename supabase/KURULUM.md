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
4. Aynı şekilde sırayla `supabase/2-fikirler.sql` (sitenin fikirleri, talepleri, puanları ve yorumları)
   ve `supabase/3-hiz.sql` (puan ve talep için günlük sınır, fikirleri vakalarına bağlama) dosyalarını
   çalıştırın. İkisi de tekrar çalıştırılabilir.
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
2. **Site URL** alanına GitHub Pages adresini yazın:
   `https://alperenesersu.github.io/Undustit/`
3. **Redirect URLs** listesine şu iki adresi ekleyin:
   - `https://alperenesersu.github.io/Undustit/`
   - `http://localhost:4317/`

   Böylece sihirli bağlantılar hem canlı sitede hem yerel geliştirmede doğru sayfaya döner.

## 7. Kontrol

1. Yerel sunucuda (`http://localhost:4317/`) yönetim sayfasını açın ve yönetici e-postası ile şifresiyle
   giriş yapın. Vaka listesinde Vaka 01 görünmeli.
2. Taslak bir vaka oluşturup durumunu değiştirin, sonra başka bir tarayıcı penceresinde (oturum açmadan)
   vakanın herkese açık sayfasını kontrol edin: taslak görünmemeli, açık vaka görünmeli.

## Sorun giderme

- **"Veri servisi yüklenemedi"**: İnternet bağlantısını ve `supabaseUrl` değerinin `https://` ile başladığını kontrol edin.
- **"Bu işlem için yönetici girişi gerekli"**: Girişteki hesabın `profiller` tablosunda `rol = 'admin'` olduğunu
  kontrol edin (adım 4).
- **Giriş sonrası hâlâ çıkıyor**: Kullanıcı yeni oluşturulduysa profil satırı trigger ile gelir. Eski bir
  kullanıcıysa `sema.sql` sonundaki eksik profil ekleme sorgusunu bir kez çalıştırın.
