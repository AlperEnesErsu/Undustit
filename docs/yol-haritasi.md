# Undustit yol haritası: satılabilir ürün (26 Ekim 2026)

Hedef: Undustit'i bir işletme olarak devretmek (Flippa / Acquire türü bir alıcı). Bu yüzden iki ölçüyle bakıldı.

**Tasarım jürisi** (`.jury/127.0.0.1-4400/scorecard.md`): Bağımsız eleştirmen 7,0 verdi (ilk tur 6,4). Jüri tahmini
yaklaşık 8,1, yani Site of the Day aralığında. Görsel kimlik zayıf halka değil.

**Alıcı gözü:** Bir alıcı önce şunlara bakar: gerçek kullanım ve trafik, gelir modelinin çalıştığına dair kanıt,
hukuki temizlik (KVKK, şartlar, fikri mülkiyet), devralınabilir altyapı (alan adı, hesaplar, kod, belgeler,
testler) ve bunları kimin nasıl yönettiği. "Basit görünüyor" hissinin asıl kaynağı burada:

| Alıcının gördüğü | Bugün | Sonuç |
|---|---|---|
| Gerçek içerik | Tüm fikirler "örnek", Vaka 01'de 0 fikir | Site boş ve terk edilmiş görünüyor |
| Güven | Ekip, iletişim, KVKK, şartlar sayfası yok; `github.io` adresi | "Hobi projesi" izlenimi |
| Platform | Hesap yok (anonim tarayıcı), profil yok, ödeme yok | Ölçeklenemez, gelir kanıtı yok |
| Devir | Testler, CI, README, izleme yok; `ud.js` 900+ satır | Teknik inceleme (due diligence) zorlanır |

## Faz 0: Sizin tarafınız (1–2 gün, kodsuz)
- `supabase/4-acilis.sql` çalıştırılır (konsoldaki 404'ler ve "boş liste" görünümü biter).
- Plausible açılır; `docs/acilis-icerik.md` ile ilk 10–15 gerçek fikir ve gerçek "alırdım" toplanır.
- Alan adı alınır (ör. undustit.com). Kurumsal e-posta ve hesaplar (Supabase, Resend, Plausible) bu alan
  adına bağlanır. Devirde hepsi tek pakette verilir.

## Faz 1: "Gerçek şirket" görünümü (yaklaşık 1 hafta)
1. **Jüri düzeltmeleri:** ALIRDIM birincil düğme gibi görünür. Boş kolonlar tek satırlık şeride iner. "Nasıl işler"
   sayfasının mobil LCP'si düşer. Şablon dizgisi bağlantıları, nokta ızgarası, nav hover'ı, odak halkası,
   mobil sıra numarası, mobilde başlığın önce gelmesi ve 404 asset yolları düzeltilir.
2. **Güven sayfaları:** "Hakkımızda / ekip" (gerçek kişiler, fotoğraf), "İletişim", KVKK aydınlatma metni,
   kullanım şartları, katkı ve fikri mülkiyet sözleşmesi. Metinleri hukukçu yazar; sayfalar, bağlantılar ve
   form onayları koddan.
3. **Canlı sayılar şeridi:** toplam fikir, toplam "alırdım", toplam talep tutarı ve açık vaka sayısı. Veriden okunur;
   veri azken gösterilmez.
4. **"Bildir" düğmesi** ve yönetimde moderasyon kuyruğu.

## Faz 2: Gerçek platform (2–3 hafta)
1. **Hesap:** e-posta ile sihirli bağlantı. Anonim tarayıcıdaki fikir ve talepler hesaba taşınır. Bir kişi bir oy;
   sahte talep sorununun asıl çözümü bu, Turnstile da ek katman olarak gelir.
2. **"Benim" sayfası:** fikirlerim, aldığım talepler, puanlarım, haber aldığım fikirler, e-posta tercihleri.
3. **Her fikrin kendi sayfası:** paylaşılabilir adres, sosyal önizleme (başlık ve görsel), site haritası. Bunun
   için bir derleme ya da Edge Function adımı gerekir.
4. **E-posta bildirimleri** canlıya alınır: ilk alırdım, yorum, perşembe adayı oldun, eşik doldu.
5. **Perşembe sayfası:** yayın bağlantısı, takvime ekle, geçmiş yayınların özeti.

## Faz 3: Para (2–3 hafta + hukuk)
1. **Ön satış:** iyzico ya da PayTR ile ödeme, eşik çubuğu, eşik dolmazsa otomatik iade, fatura.
2. **Gönderim ücreti** (99 ₺ / 10 ₺), yine ödeme altyapısıyla.
3. **Firma tarafı gelir:** vaka açma paketi (ücretli vaka, öne çıkarma), firma paneli (kendi vakasının
   fikirlerini ve taleplerini görür). Fabrikalara hizmet satmak buradan başlar.
4. **Yönetim raporları:** gelir, dönüşüm, vaka bazında talep tutarı. Alıcıya gösterilecek tablo bu.
   *Yapıldı (27 Ekim 2026):* `/yonetim/rapor/` talep tarafını gösteriyor; gelir satırları ödeme gelince eklenecek.

## Faz 4: Devredilebilirlik (yaklaşık 1 hafta)

> Durum (26 Ekim 2026): testler, CI, README ve devir el kitabı yapıldı. Kalan: `ud.js`'in modüllere bölünmesi
> ve derleme adımı, hata izleme (Sentry hesabı gerekir), staging ortamı.
- Kodun düzenlenmesi: `ud.js` modüllere bölünür, küçük bir derleme adımı (Vite) eklenir, kodda tek bir
  ayar kaynağı olur.
- Testler: ana akışlar için Playwright uçtan uca testleri (fikir yaz, alırdım, başvuru, yönetim). Her PR'da
  CI çalışır.
- Hata izleme (Sentry), yedekleme notu, staging ortamı.
- `README` + mimari belgesi + devir el kitabı: hesaplar, anahtarlar, aylık maliyet, nasıl kurulur.

## Faz 5: Tasarım sıçraması (isteğe bağlı)
- Sayfa geçişleri, sayfadan sayfaya değişen yerleşimler (bugün hepsi aynı kalıpta), 2. animasyon paketi.
  Jüri tahmini zaten yüksek; bu faz, satışa en az etki eden faz.

## Sıra önerisi
Faz 0 ve Faz 1 birlikte başlar, çünkü en hızlı "basit değil" etkisini bu ikisi yaratır. Faz 2'nin hesap adımı,
Faz 3'ün (ödeme) ön koşuludur. Faz 4 en son ama satıştan önce yapılır.
Alıcı için en değerli tek şey ise birkaç aylık gerçek kullanım verisi. Faz 0'daki içerik ve ölçüm bu yüzden hemen
başlamalı.
