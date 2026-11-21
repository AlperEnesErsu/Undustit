/* Yönetim paneli ortak yardımcıları: oturum kapısı, bildirimler, onay diyalogu, vaka formu.
   assets/ud/*.js, ayar.js ve veri.js'ten sonra yüklenir; window.UDV kullanır. Sonuç: window.YONETIM. */
(function(){
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const BOS = '—';
const sayiMi = v => v !== null && v !== undefined && v !== '' && isFinite(Number(v));
const sayi = v => sayiMi(v) ? Number(v).toLocaleString('tr-TR') : BOS;
const tutar = v => sayiMi(v) ? Math.round(Number(v)).toLocaleString('tr-TR') + ' ₺' : BOS;
const tarih = iso => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? d.toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' }) : BOS;
};
const tarihSaat = iso => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? d.toLocaleString('tr-TR', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : BOS;
};
// "12 gün kaldı · son gün 21 Ara" / "Süre doldu" for an open case; '' otherwise (UD.vakaSuresi, assets/ud/temel.js)
const sureMetni = v => {
  const s = v && v.durum === 'acik' && window.UD && UD.vakaSuresi(v);
  if (!s) return '';
  return s.doldu ? 'Süre doldu' : s.kalanGun + ' gün kaldı · son gün ' + s.bitis.toLocaleDateString('tr-TR', { day:'numeric', month:'short' });
};
const sureDoldu = v => !!(v && v.durum === 'acik' && window.UD && (UD.vakaSuresi(v) || {}).doldu);
const durumAdi = d => UDV.DURUM_ADI[d] || d || BOS;
const durumRozeti = d => '<span class="rozet" data-durum="' + esc(d) + '">' + esc(durumAdi(d)) + '</span>';

// ----------------------------------------------------------- stil (yalnız bilesen.css'te olmayan iki küçük ayar)
(function stilEkle(){
  if ($('#y-ek-stil')) return;
  const s = document.createElement('style');
  s.id = 'y-ek-stil';
  s.textContent = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    '.diyalog .btn[data-tehlike]{background:var(--err);border-color:var(--err);color:#fff}';
  document.head.append(s);
})();

// ----------------------------------------------------------- menü
// One menu for every admin page, written here: a page only says which entry it is (<nav data-y-menu="rapor">).
// The case editor counts as "Vakalar". The site itself is the "Undustit" link in the header.
const MENU = [['ozet', '', 'Özet'], ['vakalar', '#vakalar', 'Vakalar'], ['icerik', 'icerik/', 'İçerik'], ['rapor', 'rapor/', 'Rapor'],
  ['kaynak', 'kaynak/', 'Ne kadar çalıştı'], ['ayarlar', 'ayarlar/', 'Ayarlar']];
(function menuYaz(){
  const nav = $('nav[data-y-menu]');
  if (!nav) return;
  const burada = nav.dataset.yMenu, kok = (document.documentElement.dataset.root || '') + 'yonetim/';
  nav.innerHTML = MENU.map(([id, yol, ad]) =>
    '<a href="' + kok + yol + '"' + (id === burada ? ' aria-current="page"' : '') + ' data-menu="' + id + '">' + ad + '</a>').join('');
})();

// ----------------------------------------------------------- bildirim
function toast(msg, kind){
  let kap = $('.bildirimler');
  if (!kap){
    kap = document.createElement('div');
    kap.className = 'bildirimler';
    kap.setAttribute('aria-live', 'polite');
    document.body.append(kap);
  }
  const b = document.createElement('div');
  b.className = 'bildirim ' + (kind || 'bilgi');
  b.textContent = msg;
  kap.append(b);
  setTimeout(() => b.remove(), 4000);
}
// sayfa yönlendirmesinden sonra göstermek için (sessionStorage; hata verirse sessizce geçer)
const BILDIRIM_ANAHTAR = 'udv-yonetim-bildirim';
function sonrakiBildirim(msg, kind){
  try { sessionStorage.setItem(BILDIRIM_ANAHTAR, JSON.stringify({ msg, kind })); } catch (e) {}
}
function bekleyenBildirim(){
  try {
    const v = sessionStorage.getItem(BILDIRIM_ANAHTAR);
    if (!v) return;
    sessionStorage.removeItem(BILDIRIM_ANAHTAR);
    const o = JSON.parse(v);
    toast(o.msg, o.kind);
  } catch (e) {}
}

// ----------------------------------------------------------- onay / not diyalogu
// onay({ baslik, metin, liste, eylem, tehlike, notAlani, notEtiketi, notIpucu, notZorunlu }); liste: maddeler, metnin altında
// Vazgeçilirse null, onaylanırsa { not } döner (not alanı yoksa not '').
function onay(o){
  o = o || {};
  return new Promise(resolve => {
    const id = 'dy' + Math.random().toString(36).slice(2, 8);
    const d = document.createElement('dialog');
    d.className = 'diyalog';
    d.setAttribute('aria-labelledby', id + '-b');
    d.innerHTML =
      '<header><h2 id="' + id + '-b">' + esc(o.baslik || 'Emin misiniz?') + '</h2></header>' +
      '<div class="ic">' +
        (o.metin ? '<p>' + esc(o.metin) + '</p>' : '') +
        (o.liste && o.liste.length ? '<ul class="onay-liste">' + o.liste.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
        (o.notAlani ? '<label class="alan"><span>' + esc(o.notEtiketi || 'Not') +
          (o.notIpucu ? ' <small>' + esc(o.notIpucu) + '</small>' : '') +
          '</span><textarea rows="3" name="not"></textarea><em class="alan-hata" hidden></em></label>' : '') +
      '</div>' +
      '<footer><button type="button" class="btn alt" data-iptal>Vazgeç</button>' +
        '<button type="button" class="btn sig" data-tamam' + (o.tehlike ? ' data-tehlike' : '') + '>' + esc(o.eylem || 'Tamam') + '</button></footer>';
    document.body.append(d);

    const bitir = sonuc => {
      if (!d.dataset.bitti){ d.dataset.bitti = '1'; resolve(sonuc); }
      if (d.open) d.close();
    };
    d.addEventListener('cancel', () => bitir(null));
    d.addEventListener('close', () => { bitir(null); d.remove(); });
    d.querySelector('[data-iptal]').addEventListener('click', () => bitir(null));
    d.querySelector('[data-tamam]').addEventListener('click', () => {
      const alan = d.querySelector('textarea');
      const not = alan ? alan.value.trim() : '';
      if (o.notZorunlu && !not){
        const em = d.querySelector('.alan-hata');
        em.textContent = 'Bu geçiş için bir not yaz.';
        em.hidden = false;
        alan.focus();
        return;
      }
      bitir({ not });
    });
    d.showModal();
    (d.querySelector('textarea') || d.querySelector('[data-iptal]')).focus();
  });
}

// ----------------------------------------------------------- vaka formu
const ALANLAR = {
  baslik:       { etiket:'Başlık', tur:'metin', ipucu:'Kısa ve net. Örn. “Kırk bin menteşe”' },
  ozet:         { etiket:'Kısa açıklama', tur:'uzun', satir:2, ipucu:'Kartlarda ve sayfa başında görünür' },
  aciklama:     { etiket:'Ayrıntılı açıklama', tur:'uzun', satir:6, ipucu:'Boş satırla paragraf ayır' },
  firma:        { etiket:'Firma', tur:'metin' },
  stok:         { etiket:'Stok', tur:'metin', ipucu:'Ne olduğu. Örn. M10 × 90 flanşlı cıvata' },
  adet:         { etiket:'Adet', tur:'sayi', min:1, adim:1 },
  olcu:         { etiket:'Ölçü', tur:'metin', ipucu:'Örn. M10 × 90' },
  sinif:        { etiket:'Sınıf', tur:'metin', ipucu:'Örn. 8.8' },
  taban_fiyat:  { etiket:'Taban fiyat (₺)', tur:'sayi', min:0, adim:'any', ipucu:'Boş bırakılabilir' },
  deneme_adedi: { etiket:'Deneme partisi', tur:'sayi', min:0, adim:1, ipucu:'Kaç adet üretilecek' },
  sure_gun:     { etiket:'Fikir süresi', tur:'sayi', min:1, max:365, adim:1, ipucu:'Gün' },
  ortaklik:     { etiket:'Satış ortaklığı', tur:'onay', ipucu:'En çok istenen fikirle deneme partisi; kârdan pay (fikir sahibine %40, katkılara %10)' },
  odul:         { etiket:'Fikir ödülü (₺)', tur:'sayi', min:0, adim:'any', ipucu:'Firma seçilen fikre bu tutarı öder; 0 = ödül yok' },
  gorsel:       { etiket:'Ürün görseli', tur:'gorsel', ipucu:'Teknik föyde görünür. JPEG, PNG ya da WebP; site küçültüp yükler' },
  model3d:      { etiket:'3D model', tur:'model', ipucu:'İsteğe bağlı. .glb, en çok 20 MB, Draco sıkıştırmasız. Vaka sayfasında fotoğrafın yerine çevrilebilir görünüm çıkar' }
};
// satırda yan yana duran alanlar
// the form in four titled parts, in the order a case is thought through; two fields side by side where they pair
const BOLUMLER = [
  ['Vaka sayfası', 'Ziyaretçinin okuduğu', [['baslik'], ['ozet'], ['aciklama']]],
  ['Stok', 'Firmanın elindeki ürün', [['firma', 'stok'], ['adet', 'olcu'], ['sinif', 'taban_fiyat']]],
  ['Teklif', 'Fikir sahibine ne sunuluyor', [['deneme_adedi', 'sure_gun'], ['ortaklik', 'odul']]],
  ['Görsel ve 3D', 'Teknik föyde görünür', [['gorsel', 'model3d']]]
];

function alanHtml(ad, deger){
  const a = ALANLAR[ad];
  const id = 'f-' + ad, hid = id + '-h';
  const deg = deger == null ? '' : String(deger);
  let kontrol;
  if (a.tur === 'onay'){
    // a yes/no choice; a new case starts as a partnership
    const acik = deger == null ? true : deger === true || deger === 'true';
    return '<label class="alan alan-onay"><span>' + esc(a.etiket) + (a.ipucu ? ' <small>' + esc(a.ipucu) + '</small>' : '') + '</span>' +
      '<span class="onay-satir"><input type="checkbox" id="' + id + '" name="' + ad + '"' + (acik ? ' checked' : '') + ' aria-describedby="' + hid + '"> Bu vakada sunulsun</span>' +
      '<em class="alan-hata" id="' + hid + '" hidden></em></label>';
  }
  if (a.tur === 'gorsel'){
    // the address lives in a hidden field; the buttons upload a new photo or clear it (gorselBagla)
    return '<div class="alan" role="group" aria-labelledby="' + id + '-e"><span id="' + id + '-e">' + esc(a.etiket) + ' <small>' + esc(a.ipucu) + '</small></span>' +
      '<div class="gorsel-alan"><figure class="foy-gorsel' + (deg ? '' : ' yok') + '" data-onizleme>' + (deg ? '<img src="' + esc(deg) + '" alt="Ürün görseli">' : '<figcaption>Görsel yok</figcaption>') + '</figure>' +
      '<input type="hidden" name="gorsel" value="' + esc(deg) + '">' +
      '<div class="gorsel-dugme"><label class="btn alt sm"><span data-gorsel-yazi>' + (deg ? 'Değiştir' : 'Görsel yükle') + '</span><input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" id="' + id + '" aria-describedby="' + hid + '"></label>' +
      '<button type="button" class="btn alt sm" data-gorsel-sil' + (deg ? '' : ' hidden') + '>Kaldır</button></div></div>' +
      '<em class="alan-hata" id="' + hid + '" hidden></em></div>';
  }
  if (a.tur === 'model'){
    // like the photo: the address in a hidden field, upload / remove buttons (modelBagla), a turnable preview
    return '<div class="alan" role="group" aria-labelledby="' + id + '-e"><span id="' + id + '-e">' + esc(a.etiket) + ' <small>' + esc(a.ipucu) + '</small></span>' +
      '<div class="gorsel-alan"><figure class="foy-gorsel' + (deg ? '' : ' yok') + '" data-model-onizleme>' + (deg ? '' : '<figcaption>3D model yok</figcaption>') + '</figure>' +
      '<input type="hidden" name="model3d" value="' + esc(deg) + '">' +
      '<div class="gorsel-dugme"><label class="btn alt sm"><span data-model-yazi>' + (deg ? 'Değiştir' : '3D model yükle') + '</span><input type="file" accept=".glb,model/gltf-binary" class="sr-only" id="' + id + '" aria-describedby="' + hid + '"></label>' +
      '<button type="button" class="btn alt sm" data-model-sil' + (deg ? '' : ' hidden') + '>Kaldır</button></div></div>' +
      '<em class="alan-hata" id="' + hid + '" hidden></em></div>';
  }
  if (a.tur === 'uzun'){
    kontrol = '<textarea id="' + id + '" name="' + ad + '" rows="' + (a.satir || 3) + '" aria-describedby="' + hid + '">' + esc(deg) + '</textarea>';
  } else {
    const tip = a.tur === 'sayi' ? 'number' : a.tur === 'url' ? 'url' : 'text';
    const sinir = (a.min != null ? ' min="' + a.min + '"' : '') + (a.max != null ? ' max="' + a.max + '"' : '') + (a.adim != null ? ' step="' + a.adim + '"' : '');
    kontrol = '<input id="' + id + '" name="' + ad + '" type="' + tip + '" value="' + esc(deg) + '"' + sinir + ' autocomplete="off" aria-describedby="' + hid + '">';
  }
  return '<label class="alan"><span>' + esc(a.etiket) + (a.ipucu ? ' <small>' + esc(a.ipucu) + '</small>' : '') + '</span>' +
    kontrol + '<em class="alan-hata" id="' + hid + '" hidden></em></label>';
}

// kap: alanların yazılacağı kapsayıcı (form ya da içindeki div). vaka null ise yeni vaka varsayılanları.
function formCiz(kap, vaka){
  const v = vaka || { sure_gun: 30 };
  kap.innerHTML = BOLUMLER.map(([baslik, alt, gruplar]) => '<fieldset class="form-bolum"><legend>' + esc(baslik) + ' <small>' + esc(alt) + '</small></legend>' +
    gruplar.map(g => {
      const html = g.map(ad => alanHtml(ad, v[ad])).join('');
      return g.length > 1 ? '<div class="alan-iki">' + html + '</div>' : html;
    }).join('') + '</fieldset>').join('');
  gorselBagla(kap);
  modelBagla(kap);
}

// the photo field: pick a file, the site shrinks and uploads it (UD.Store.gorselYukle), the preview follows
function gorselBagla(kap){
  const gizli = kap.querySelector('[name="gorsel"]');
  if (!gizli) return;
  const fig = kap.querySelector('[data-onizleme]'), dosya = kap.querySelector('#f-gorsel'), sil = kap.querySelector('[data-gorsel-sil]');
  const yazi = kap.querySelector('[data-gorsel-yazi]'), em = kap.querySelector('#f-gorsel-h');
  const goster = url => {
    const degisti = gizli.value !== url;
    gizli.value = url;
    if (degisti) gizli.dispatchEvent(new Event('change', { bubbles:true }));
    fig.classList.toggle('yok', !url);
    fig.innerHTML = url ? '<img src="' + esc(url) + '" alt="Ürün görseli">' : '<figcaption>Görsel yok</figcaption>';
    sil.hidden = !url; yazi.textContent = url ? 'Değiştir' : 'Görsel yükle';
  };
  const hata = m => { em.textContent = m || ''; em.hidden = !m; };
  dosya.addEventListener('change', () => {
    const f = dosya.files && dosya.files[0];
    if (!f) return;
    hata(''); yazi.textContent = 'Yükleniyor…'; dosya.disabled = true;
    UD.Store.gorselYukle(f, 'vaka').then(goster)
      .catch(e => { hata((e && e.message) || 'Görsel yüklenemedi.'); goster(gizli.value); })
      .finally(() => { dosya.disabled = false; dosya.value = ''; });
  });
  sil.addEventListener('click', () => { goster(''); dosya.focus(); });
}

// the 3D field: pick a .glb, it is checked and uploaded as it is (UD.Store.modelYukle), the preview turns.
// Saved with the case ("Kaydet"), like the photo.
function modelBagla(kap){
  const gizli = kap.querySelector('[name="model3d"]');
  if (!gizli) return;
  const fig = kap.querySelector('[data-model-onizleme]'), dosya = kap.querySelector('#f-model3d'), sil = kap.querySelector('[data-model-sil]');
  const yazi = kap.querySelector('[data-model-yazi]'), em = kap.querySelector('#f-model3d-h');
  const goster = url => {
    const degisti = gizli.value !== url;
    gizli.value = url;
    if (degisti) gizli.dispatchEvent(new Event('change', { bubbles:true }));
    fig.className = 'foy-gorsel' + (url ? '' : ' yok');
    fig.innerHTML = url ? '' : '<figcaption>3D model yok</figcaption>';
    if (url) UD.model3d(fig, { model:url, poster:(kap.querySelector('[name="gorsel"]') || {}).value || '', alt:'3D model' });
    sil.hidden = !url; yazi.textContent = url ? 'Değiştir' : '3D model yükle';
  };
  const hata = m => { em.textContent = m || ''; em.hidden = !m; };
  if (gizli.value) goster(gizli.value);
  dosya.addEventListener('change', () => {
    const f = dosya.files && dosya.files[0];
    if (!f) return;
    hata(''); yazi.textContent = 'Yükleniyor…'; dosya.disabled = true;
    UD.Store.modelYukle(f, 'vaka').then(goster)
      .catch(e => { hata((e && e.message) || '3D model yüklenemedi.'); yazi.textContent = gizli.value ? 'Değiştir' : '3D model yükle'; })
      .finally(() => { dosya.disabled = false; dosya.value = ''; });
  });
  sil.addEventListener('click', () => { goster(''); dosya.focus(); });
}

// form: alanları içeren form elemanı. Sayı alanları boşsa null, metinler kırpılmış string.
function formOku(form){
  const v = {};
  Object.keys(ALANLAR).forEach(ad => {
    const k = form.querySelector('[name="' + ad + '"]');
    if (!k) return;
    if (ALANLAR[ad].tur === 'onay'){ v[ad] = k.checked; return; }
    const x = k.value.trim();
    v[ad] = ALANLAR[ad].tur === 'sayi' ? (x === '' ? null : Number(x)) : x;
  });
  return v;
}

// ad → Türkçe hata mesajı. Boş obje = geçerli.
function formDogrula(v){
  const h = {};
  if (!v.baslik) h.baslik = 'Başlık zorunlu.';
  else if (v.baslik.length > 120) h.baslik = 'Başlık en fazla 120 karakter olabilir.';
  if (!v.firma) h.firma = 'Firma adı zorunlu.';
  if (v.adet == null || !Number.isInteger(v.adet) || v.adet < 1) h.adet = 'Adet 1 veya daha büyük bir tam sayı olmalı.';
  if (v.taban_fiyat != null && (!isFinite(v.taban_fiyat) || v.taban_fiyat < 0)) h.taban_fiyat = 'Taban fiyat 0 veya daha büyük olmalı.';
  if (v.deneme_adedi != null && (!Number.isInteger(v.deneme_adedi) || v.deneme_adedi < 0)) h.deneme_adedi = 'Deneme adedi 0 veya daha büyük bir tam sayı olmalı.';
  if (v.sure_gun == null || !Number.isInteger(v.sure_gun) || v.sure_gun < 1 || v.sure_gun > 365) h.sure_gun = '1 ile 365 gün arasında bir tam sayı olmalı.';
  if (v.odul != null && (!isFinite(v.odul) || v.odul < 0)) h.odul = 'Ödül 0 ya da daha büyük olmalı.';
  if (v.ortaklik === false && !(v.odul > 0)) h.odul = 'Satış ortaklığı ya da fikir ödülünden en az birini seçin.';
  if (v.gorsel && !UD.gorselAdresi(v.gorsel)) h.gorsel = 'Görsel yüklenemedi; yeniden seçin.';
  return h;
}

// hataları alanlara yazar, ilk hatalı alana odaklanır
function formHatalari(form, h){
  Object.keys(ALANLAR).forEach(ad => {
    const k = form.querySelector('[name="' + ad + '"]');
    if (!k) return;
    const alan = k.closest('.alan');
    const em = alan ? alan.querySelector('.alan-hata') : null;
    const mesaj = h[ad] || '';
    if (alan) alan.classList.toggle('hata', !!mesaj);
    k.setAttribute('aria-invalid', mesaj ? 'true' : 'false');
    if (em){ em.textContent = mesaj; em.hidden = !mesaj; }
  });
  const ilk = GRUPLAR.flat().find(ad => h[ad]);
  if (ilk){ const k = form.querySelector('[name="' + ilk + '"]'); if (k) k.focus(); }
}

// ----------------------------------------------------------- log
// The site's error log is not a menu entry: a small "Log" button beside "Çıkış", for admins only, with the number
// of new errors when there are any ("Log · 2"). It opens yonetim/log/.
function logBag(o){
  const admin = !!(o && o.rol === 'admin'), kok = (document.documentElement.dataset.root || '') + 'yonetim/';
  $$('[data-y-cikis]').forEach(b => {
    let a = b.parentNode.querySelector('.y-log');
    if (!a){
      a = document.createElement('a');
      a.className = 'btn alt sm y-log'; a.href = kok + 'log/'; a.textContent = 'Log';
      if ($('nav[data-y-menu="log"]')) a.setAttribute('aria-current', 'page');
      b.before(a);
    }
    a.hidden = !admin;
  });
  if (!admin) return;
  Promise.resolve().then(() => UDV.hatalar.liste()).then(l => {
    const n = l.filter(x => x.durum === UDV.hatalar.DURUMLAR[0]).length;
    $$('.y-log').forEach(a => { a.textContent = n ? 'Log · ' + n : 'Log'; a.title = n ? n + ' yeni site hatası' : 'Site hataları'; });
  }).catch(() => {});
}
// the log page tells the button when it changed something
document.addEventListener('y-log-degisti', () => logBag(UDV.oturum()));

// ----------------------------------------------------------- oturum kapısı
// guard(ciz): oturum yoksa giriş formu, admin değilse yetkisiz boş durumu, admin ise ciz(oturum, anaAlan).
function guard(ciz){
  const ana = $('.y-ana');
  let son = null;

  const kimYaz = o => {
    $$('[data-y-kim]').forEach(n => { n.textContent = o ? (o.email || '') : ''; });
    $$('[data-y-cikis]').forEach(b => { b.hidden = !o; });
    logBag(o);
  };
  const yonlendir = o => {
    kimYaz(o);
    const anahtar = o ? (o.email || '') + '|' + (o.rol || '') : '';
    if (anahtar === son) return;
    son = anahtar;
    if (!o) return girisYaz(ana, yonlendir);
    if (o.rol !== 'admin') return yetkisizYaz(ana, o);
    ciz(o, ana);
  };

  $$('[data-y-cikis]').forEach(b => b.addEventListener('click', () => {
    Promise.resolve(UDV.cikis())
      .then(() => { son = null; yonlendir(UDV.oturum()); })
      .catch(err => toast(err.message || 'Çıkış yapılamadı.', 'hata'));
  }));

  Promise.resolve(UDV.hazir).then(() => {
    // onOturum hazır olunca bir kez, sonra her değişimde çağırır; yinelenen oturumlar yoksayılır
    UDV.onOturum(yonlendir);
    bekleyenBildirim();
  });
}

function girisYaz(ana, yonlendir){
  const yerel = UDV.mod === 'yerel';
  ana.innerHTML =
    '<div class="y-ust"><div><span class="eyebrow">Yönetim</span><h1>Giriş yap</h1></div></div>' +
    '<section class="panel" aria-labelledby="gi-b"><header class="panel-bas"><h2 id="gi-b">Yönetici girişi</h2></header>' +
    '<div class="panel-ic">' +
      '<form class="y-giris" novalidate>' +
        '<label class="alan"><span>E-posta ya da kullanıcı adı</span><input type="text" name="email" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
        '<label class="alan"><span>Şifre</span><input type="password" name="sifre" autocomplete="current-password"></label>' +
        '<div class="y-eylem"><button class="btn sig" type="submit">Giriş yap</button></div>' +
      '</form>' +
      (yerel ? '<p class="lead">Yerel mod: admin@undustit.local ve şifre undustit.</p>' : '') +
    '</div></section>';
  const f = ana.querySelector('.y-giris');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const email = f.querySelector('[name="email"]').value.trim();
    const sifre = f.querySelector('[name="sifre"]').value;
    if (!email || !sifre){ toast('E-posta ya da kullanıcı adınızı ve şifrenizi girin.', 'hata'); return; }
    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    Promise.resolve()
      .then(() => UDV.giris(email, sifre))
      .then(() => yonlendir(UDV.oturum()))
      .catch(err => {
        btn.disabled = false;
        f.querySelector('[name="sifre"]').value = '';
        toast(err.message || 'Giriş yapılamadı.', 'hata');
      });
  });
  const ilk = f.querySelector('[name="email"]');
  if (ilk) ilk.focus();
}

function yetkisizYaz(ana, o){
  ana.innerHTML =
    '<div class="bos"><b>Bu alan yalnız yöneticiler için</b>' +
    '<p>' + esc(o.email) + ' hesabının yönetim yetkisi yok. Yönetici hesabıyla giriş yap.</p>' +
    '<a class="btn alt sm" href="../">Siteye dön</a></div>';
}

// ----------------------------------------------------------- telefonda kart
// Call after a table is (re)written: every .tablo under kok gets .kart-mobil, each cell its column's name
// (data-etiket, from the header row; the first column is the card's title) and one wrapper, so a cell with
// a line break or a badge stays one piece in the card's grid.
function kartla(kok){
  if (!kok) return;
  const tablolar = kok.matches && kok.matches('table') ? [kok] : $$('table.tablo', kok);
  tablolar.forEach(t => {
    t.classList.add('kart-mobil');
    const bas = $$('thead th', t).map(th => th.textContent.trim());
    $$('tbody tr', t).forEach(tr => Array.from(tr.children).forEach((td, i) => {
      if (td.colSpan > 1) return;
      if (i && bas[i]) td.dataset.etiket = bas[i];
      if (td.childNodes.length === 1 && td.firstChild.nodeName === 'DIV' && td.firstChild.dataset.hucre != null) return;
      const d = document.createElement('div'); d.dataset.hucre = '';
      while (td.firstChild) d.append(td.firstChild);
      td.append(d);
    }));
  });
}

window.YONETIM = {
  guard, toast, onay, sonrakiBildirim, kartla,
  durumRozeti, durumAdi, sureMetni, sureDoldu, tarih, tarihSaat, sayi, tutar, esc,
  formCiz, formOku, formDogrula, formHatalari
};
})();
