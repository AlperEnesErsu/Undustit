// Veri katmanı (window.UDV). Yerel modda localStorage (udv-v1), ayar.js'te supabaseUrl doluysa Supabase.
// İki modda aynı arayüz: her fonksiyon Promise döner, hata Error olarak fırlar (message Türkçe).
// Kurallar (geçişler, slug, doğrulama, yetki) burada tek yerde; iki depo yalnız okuma/yazma yapar.
(function(){
  'use strict';

  const AYAR = window.UD_AYAR || {};
  // the database speaks English; assets/ud/db.js turns the Turkish names below into its names
  const DB = window.UD_DB;
  const SB_URL = AYAR.supabaseUrl || '';
  const SB_ANON = AYAR.supabaseAnon || '';
  const SB_SURUM = '2.45.4';
  const SB_SRI = 'sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug';   // dosyanın özeti: sürüm değişirse bu da değişir (assets/ud/temel.js ile aynı)
  const ADMINLER = (AYAR.adminler || []).map(e => String(e).trim().toLowerCase());
  const LS = 'udv-v1';
  const SITE_LS = 'ud-store-v1';   // sitenin fikir deposu, yalnız okunur (bkz. assets/ud/depo.js Store)
  const CAT = 'Vaka 01 · Cıvata';
  const MAKS_FIYAT = 20000;        // assets/ud/temel.js TERMS.maxPrice ile aynı

  const DURUMLAR = ['taslak','acik','degerlendirme','kazanan','uretim','kapali'];
  const DURUM_ADI = { taslak:'Taslak', acik:'Açık', degerlendirme:'Değerlendirmede', kazanan:'Kazanan seçildi', uretim:'Üretimde', kapali:'Kapandı' };
  const GECIS = { taslak:['acik'], acik:['degerlendirme','kapali'], degerlendirme:['kazanan','acik','kapali'], kazanan:['uretim','kapali'], uretim:['kapali'], kapali:[] };
  const ALANLAR = ['baslik','ozet','aciklama','firma','stok','adet','olcu','sinif','taban_fiyat','deneme_adedi','sure_gun','gorsel','ortaklik','odul'];
  const SAYI = ['adet','taban_fiyat','deneme_adedi','sure_gun','odul'];
  const VARSAYILAN = { ozet:'', aciklama:'', firma:'', stok:'', adet:0, olcu:'', sinif:'', taban_fiyat:0, deneme_adedi:0, sure_gun:30, gorsel:'', ortaklik:true, odul:0 };
  const YANLIS = 'E-posta ya da şifre yanlış';   // giriş hatasını ayırt etmeden söyler
  const YETKI = 'Bu işlem için yönetici girişi gerekli';
  const GEREK13 = 'Önce supabase/13-moderasyon.sql çalıştırılmalı.';
  const GEREK16 = 'Önce supabase/16-kullanici-adi.sql çalıştırılmalı.';
  const AD_KURALI = /^[a-z0-9_.]{3,24}$/;

  const str = v => v == null ? '' : String(v).trim();
  const simdi = () => new Date().toISOString();
  const kucuk = s => String(s).toLocaleLowerCase('tr');   // 'I' -> 'ı', 'İ' -> 'i'

  // ----------------------------------------------------------- oturum
  let oturum = null;                     // supabase modunda bellekte; yerelde udv-v1.oturum
  const aboneler = new Set();
  let hazirCoz;
  const hazirSoz = new Promise(r => { hazirCoz = r; });
  const mevcut = () => SB_URL ? oturum : (oku().oturum || null);
  const benAdmin = () => { const o = mevcut(); return !!o && o.rol === 'admin'; };
  const yetkiTest = () => { if (!benAdmin()) throw new Error(YETKI); };
  function bildir(){ const o = UDV.oturum(); aboneler.forEach(fn => { try { fn(o); } catch(e){ console.error(e); } }); }

  // ----------------------------------------------------------- yerel depo (localStorage)
  let bellek = null;   // localStorage yoksa ya da engelliyse sayfa boyunca bu kopya kullanılır
  function tohum(){
    const an = simdi();
    return { vakalar: { 'vaka-01': { id:'vaka-01', baslik:'Bir milyon cıvata', ozet:'Bir milyon cıvata için fikir yarışı.', aciklama:'', firma:'Örnek Fabrika', stok:'M10 × 90 flanşlı cıvata + flanşlı somun', adet:1000000, olcu:'M10 × 90', sinif:'8.8', taban_fiyat:2, deneme_adedi:1000, sure_gun:30, gorsel:'', ortaklik:true, odul:0, durum:'acik', acilis:an, kapanis:null, kazanan:null, olusturan:'admin@undustit.local', olusturma:an, guncelleme:an } },
      gecmis: { 'vaka-01': [{ durum:'acik', not:'Vaka 01 açıldı', kim:'admin@undustit.local', zaman:an }] },
      gizli: {}, oturum: null };
  }
  function oku(){
    let d = null;
    try { d = JSON.parse(localStorage.getItem(LS) || 'null'); } catch(e){ d = bellek; }
    if (!d || typeof d !== 'object' || !d.vakalar){ d = tohum(); yaz(d); }
    return d;
  }
  function yaz(d){
    bellek = d;
    try { localStorage.setItem(LS, JSON.stringify(d)); } catch(e){}
  }
  // Sitenin fikirleri. Vakanın kimliğiyle gönderilenler (eskiler için Vaka 01 etiketi); alıcı = o fikre fiyat yazan kişi sayısı.
  function yerelFikirler(vakaId){
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SITE_LS) || '{}') || {}; } catch(e){}
    const gizli = oku().gizli;
    const fiyatlar = {}, notlar = {};
    Object.values(s.votes || {}).forEach(v => Object.entries((v && v.buy) || {}).forEach(([key, p]) => {
      const n = Number(p); if (n > 0 && n <= MAKS_FIYAT) (fiyatlar[key] = fiyatlar[key] || []).push(n);
    }));
    Object.values(s.notes || {}).forEach(doc => (doc && Array.isArray(doc.items) ? doc.items : []).forEach(n => {
      if (n && typeof n.idea === 'string') notlar[n.idea] = (notlar[n.idea] || 0) + 1;
    }));
    const out = [];
    Object.entries(s.ideas || {}).forEach(([owner, doc]) => (doc && Array.isArray(doc.items) ? doc.items : []).forEach(it => {
      if (!it || !it.k || (it.caseId ? it.caseId !== vakaId : !(vakaId === 'vaka-01' && it.cat === CAT))) return;
      const id = owner + ':' + it.k, f = fiyatlar[id] || [];
      out.push({ id, anahtar: id, baslik: str(it.title), problem: str(it.problem), cozum: str(it.solution),
        ozellikler: (Array.isArray(it.feats) ? it.feats : []).map(x => str(x)).filter(Boolean), ad: str(it.handle),
        gizli: !!gizli[id], zaman: it.at || null,
        alici: f.length, ortFiyat: f.length ? Math.round(f.reduce((a,b) => a + b, 0) / f.length * 100) / 100 : 0,
        yorum: notlar[id] || 0 });
    }));
    return out;
  }
  // sitenin yalnız yöneticiye giden kayıtları (başvuru, mesaj, bildirim) yerelde udv-<tablo> altında (assets/ud/depo.js Store.kaydet)
  function kayitOku(tablo){ try { return JSON.parse(localStorage.getItem('udv-' + tablo) || '{}') || {}; } catch(e){ return {}; } }
  const yerel = {
    liste: async () => Object.values(oku().vakalar),
    al: async id => oku().vakalar[id] || null,
    ekle: async v => { const d = oku(); d.vakalar[v.id] = v; d.gecmis[v.id] = []; yaz(d); return v; },
    guncelle: async (id, yama) => { const d = oku(); if (!d.vakalar[id]) throw new Error('Vaka bulunamadı'); Object.assign(d.vakalar[id], yama); yaz(d); return d.vakalar[id]; },
    sil: async id => { const d = oku(); delete d.vakalar[id]; delete d.gecmis[id]; yaz(d); },
    gecmisEkle: async (id, satir) => { const d = oku(); (d.gecmis[id] = d.gecmis[id] || []).push(satir); yaz(d); },
    gecmis: async id => (oku().gecmis[id] || []).slice().sort((a,b) => Date.parse(a.zaman) - Date.parse(b.zaman)),
    fikirler: async vakaId => yerelFikirler(vakaId),
    gizle: async (id, gizli) => { const d = oku(); if (gizli) d.gizli[id] = true; else delete d.gizli[id]; yaz(d); },
    // moderasyon (yonetim/icerik/): vakalı vakasız bütün fikirler ve bütün yorumlar, gizliler dahil
    tumFikirler: async () => {
      let s = {};
      try { s = JSON.parse(localStorage.getItem(SITE_LS) || '{}') || {}; } catch(e){}
      const gizli = oku().gizli, out = [];
      Object.entries(s.ideas || {}).forEach(([sahip, doc]) => (doc && Array.isArray(doc.items) ? doc.items : []).forEach(it => {
        if (!it || !it.k) return;
        const id = sahip + ':' + it.k;
        out.push({ id, anahtar:id, baslik:str(it.title), problem:str(it.problem), cozum:str(it.solution), ad:str(it.handle),
          vakaId: it.caseId || null, kategori:str(it.cat), gizli:!!gizli[id], zaman:it.at || null });
      }));
      return out;
    },
    tumYorumlar: async () => {
      let s = {};
      try { s = JSON.parse(localStorage.getItem(SITE_LS) || '{}') || {}; } catch(e){}
      const gizli = oku().gizliYorum || {}, baslik = {}, out = [];
      Object.entries(s.ideas || {}).forEach(([sahip, doc]) => (doc && Array.isArray(doc.items) ? doc.items : []).forEach(it => { if (it && it.k) baslik[sahip + ':' + it.k] = str(it.title); }));
      Object.entries(s.notes || {}).forEach(([uye, doc]) => (doc && Array.isArray(doc.items) ? doc.items : []).forEach(n => {
        if (!n || !n.k || typeof n.idea !== 'string') return;
        const id = uye + ':' + n.k;
        out.push({ id, anahtar:n.idea, fikirBaslik:baslik[n.idea] || '', metin:str(n.text), ad:str(n.handle), tur:n.kind || 'yorum', gizli:!!gizli[id], zaman:n.at || null });
      }));
      return out;
    },
    yorumGizle: async (id, gizli) => { const d = oku(); d.gizliYorum = d.gizliYorum || {}; if (gizli) d.gizliYorum[id] = true; else delete d.gizliYorum[id]; yaz(d); },
    // yasak söz listesi veritabanında yaşar (supabase/13-moderasyon.sql); yerel önizlemede ön filtre yok
    sozler: async () => null, sozEkle: async () => { throw new Error('Yerel önizlemede söz listesi yok'); }, sozSil: async () => {},
    // rapor için ham satırlar: bütün fikirler (gizliler dahil) ve bütün "alırdım"lar. Yerelde talebin tarihi yok.
    raporHam: async () => {
      let s = {};
      try { s = JSON.parse(localStorage.getItem(SITE_LS) || '{}') || {}; } catch(e){}
      const gizli = oku().gizli, fikirler = [], talepler = [];
      let yorum = 0;
      Object.entries(s.ideas || {}).forEach(([sahip, doc]) => (doc && Array.isArray(doc.items) ? doc.items : []).forEach(it => {
        if (!it || !it.k) return;
        const id = sahip + ':' + it.k;
        fikirler.push({ id, vakaId: it.caseId || (it.cat === CAT ? 'vaka-01' : null), baslik: str(it.title), sahip, gizli: !!gizli[id], zaman: it.at || null });
      }));
      Object.entries(s.votes || {}).forEach(([uye, v]) => Object.entries((v && v.buy) || {}).forEach(([fikirId, p]) => {
        const fiyat = Number(p); if (fiyat > 0 && fiyat <= MAKS_FIYAT) talepler.push({ fikirId, uye, fiyat, zaman: null });
      }));
      Object.values(s.notes || {}).forEach(doc => { yorum += doc && Array.isArray(doc.items) ? doc.items.length : 0; });
      return { fikirler, talepler, yorum };
    },
    // yöneticinin kullanıcı adı: udv-v1.kullaniciAdi = { ad: e-posta }
    girisEposta: async ad => (oku().kullaniciAdi || {})[ad] || null,
    kullaniciAdi: async () => { const m = oku().kullaniciAdi || {}, e = mevcut().email; return Object.keys(m).find(a => m[a] === e) || null; },
    kullaniciAdiKoy: async ad => {
      const d = oku(), e = mevcut().email; d.kullaniciAdi = d.kullaniciAdi || {};
      if (ad && d.kullaniciAdi[ad] && d.kullaniciAdi[ad] !== e) throw new Error('Bu kullanıcı adı alınmış');
      Object.keys(d.kullaniciAdi).forEach(a => { if (d.kullaniciAdi[a] === e) delete d.kullaniciAdi[a]; });
      if (ad) d.kullaniciAdi[ad] = e;
      yaz(d); return ad || null;
    },
    // etkinlikler: udv-v1.etkinlikler = { id: satır }
    etkinlikler: async () => Object.values(oku().etkinlikler || {}),
    etkinlikEkle: async e => { const d = oku(); d.etkinlikler = d.etkinlikler || {}; const id = 'e' + Date.now().toString(36); d.etkinlikler[id] = { id, ...e, olusturma:simdi() }; yaz(d); },
    etkinlikSil: async id => { const d = oku(); if (d.etkinlikler) delete d.etkinlikler[id]; yaz(d); },
    // firma erişimi: udv-v1.firmalar = { vakaId: [e-posta, ...] }
    firmalar: async vakaId => ((oku().firmalar || {})[vakaId] || []).slice(),
    firmaEkle: async (vakaId, eposta) => { const d = oku(); d.firmalar = d.firmalar || {}; const l = d.firmalar[vakaId] = d.firmalar[vakaId] || []; if (!l.includes(eposta)) l.push(eposta); yaz(d); },
    firmaSil: async (vakaId, eposta) => { const d = oku(); if (d.firmalar && d.firmalar[vakaId]) d.firmalar[vakaId] = d.firmalar[vakaId].filter(e => e !== eposta); yaz(d); },
    firmaVakalari: async eposta => { const d = oku(); return Object.keys(d.firmalar || {}).filter(id => d.firmalar[id].includes(eposta) && d.vakalar[id]).map(id => d.vakalar[id]); },
    // giriş bilgisi e-postası: yerel önizleme e-posta göndermez, yalnız zamanı yazar (udv-v1.davetler = { vakaId: { e-posta: zaman } })
    davetler: async vakaId => Object.assign({}, (oku().davetler || {})[vakaId]),
    davet: async (vakaId, eposta) => { const d = oku(); d.davetler = d.davetler || {}; const z = simdi(); (d.davetler[vakaId] = d.davetler[vakaId] || {})[eposta] = z; yaz(d); return { yerel:true, zaman:z }; },
    firmaGorsel: async (vakaId, adres) => { const d = oku(); if (!d.vakalar[vakaId]) throw new Error('Vaka bulunamadı'); d.vakalar[vakaId].gorsel = adres; d.vakalar[vakaId].guncelleme = simdi(); yaz(d); },
    // bir vakanın fikirlerine yazılan fiyatlar (fiyat dağılımı için)
    talepFiyatlari: async vakaId => {
      const ids = new Set(yerelFikirler(vakaId).map(f => f.id)), out = [];
      let s = {};
      try { s = JSON.parse(localStorage.getItem(SITE_LS) || '{}') || {}; } catch(e){}
      Object.values(s.votes || {}).forEach(v => Object.entries((v && v.buy) || {}).forEach(([k, p]) => { const n = Number(p); if (ids.has(k) && n > 0 && n <= MAKS_FIYAT) out.push({ fikirId:k, fiyat:n }); }));
      return out;
    },
    // "Vakanı aç" başvuruları: sitenin formu yerelde buraya yazar (assets/ud/depo.js Store.basvur)
    // bildirimler fikrin başlığı ve sitede görünüp görünmediğiyle gelir (supabase modundaki fikirler(…) ile aynı biçim)
    kayitlar: async tablo => {
      const l = Object.values(kayitOku(tablo)).sort((a,b) => String(b.zaman).localeCompare(String(a.zaman)));
      if (tablo !== 'fikir_bildirimleri') return l;
      const f = {}; (await yerel.tumFikirler()).forEach(x => { f[x.id] = x; });
      return l.map(b => Object.assign({}, b, { fikirler: f[b.fikir_id] ? { baslik:f[b.fikir_id].baslik, gizli:f[b.fikir_id].gizli } : null }));
    },
    basvuruBagla: async (id, vakaId) => { const d = kayitOku('vaka_basvurulari'); if (!d[id]) throw new Error('Kayıt bulunamadı'); d[id].durum = 'kabul'; d[id].vaka_id = vakaId; try { localStorage.setItem('udv-vaka_basvurulari', JSON.stringify(d)); } catch(e){} },
    basvurularim: async eposta => Object.values(kayitOku('vaka_basvurulari')).filter(b => kucuk(str(b.eposta)) === eposta).sort((a, b) => String(b.zaman).localeCompare(String(a.zaman))),
    kayitDurum: async (tablo, id, durum) => { const d = kayitOku(tablo); if (!d[id]) throw new Error('Kayıt bulunamadı'); d[id].durum = durum; try { localStorage.setItem('udv-' + tablo, JSON.stringify(d)); } catch(e){} }
  };

  // ----------------------------------------------------------- supabase depo
  let sb = null, senkSira = 0;
  const istemci = () => { if (!sb) throw new Error('Veri servisi hazır değil'); return sb; };
  function hata(e){
    if (e.code === '42501') return new Error(YETKI);
    if (e.code === '23505') return new Error('Bu kimlik zaten var');
    return new Error('Veri işlemi başarısız: ' + e.message);
  }
  // spam protection token (assets/ud/temel.js captcha); undefined when Turnstile is off or assets/ud is not on the page
  const tsJeton = () => window.UD && window.UD.captcha ? window.UD.captcha() : Promise.resolve(undefined);
  async function sorgu(q){ const { data, error } = await q; if (error) throw hata(error); return data; }
  // Ziyaretçinin okuyabildiği sütunlar (8-gizli.sql). firma, taban_fiyat ve olusturan yalnız vaka_tam() ile gelir:
  // yöneticiye hepsi, firmaya kendi vakası. 8-gizli.sql çalışmadan önce (fonksiyon yok) eski yoldan okunur.
  const ACIK = 'id,baslik,ozet,aciklama,stok,adet,olcu,sinif,deneme_adedi,sure_gun,gorsel,ortaklik,odul,durum,acilis,kapanis,kazanan,olusturma,guncelleme';
  async function tam(v){
    const r = await DB.rpc(istemci(), 'vaka_tam', v ? { v } : {});
    if (r.error && r.error.code === 'PGRST202') return sorgu(v ? DB.from(istemci(), 'vakalar').select('*').eq('id', v) : DB.from(istemci(), 'vakalar').select('*'));
    if (r.error) throw hata(r.error);
    return r.data;
  }
  const uzak = {
    liste: async () => tam(),
    // vaka sayfası ziyaretçiye de açık: oturumu olan (yönetici ya da firma) tam satırı, diğerleri açık sütunları okur
    al: async id => {
      const o = mevcut();
      if (o && o.email){ const r = await tam(id).catch(() => []); if (r.length) return r[0]; }
      return sorgu(DB.from(istemci(), 'vakalar').select(ACIK).eq('id', id).maybeSingle());
    },
    ekle: async v => { await sorgu(DB.from(istemci(), 'vakalar').insert(v)); return (await tam(v.id))[0]; },
    guncelle: async (id, yama) => {
      const r = await sorgu(DB.from(istemci(), 'vakalar').update(yama).eq('id', id).select('id'));
      if (!r || !r.length) throw new Error('Vaka bulunamadı ya da yetkiniz yok');
      return (await tam(id))[0];
    },
    sil: async id => { await sorgu(DB.from(istemci(), 'vakalar').delete().eq('id', id)); },
    gecmisEkle: async (id, s) => { await sorgu(DB.from(istemci(), 'vaka_gecmis').insert({ vaka_id:id, durum:s.durum, not:s.not, kim:s.kim, zaman:s.zaman })); },
    gecmis: async id => (await sorgu(DB.from(istemci(), 'vaka_gecmis').select('*').eq('vaka_id', id).order('zaman', { ascending:true })))
      .map(r => ({ durum:r.durum, not:r.not, kim:r.kim, zaman:r.zaman })),
    fikirler: async vakaId => {
      const [satirlar, ozet] = await Promise.all([
        sorgu(DB.from(istemci(), 'fikirler').select('*').eq('vaka_id', vakaId).order('zaman', { ascending:false })),
        sorgu(DB.from(istemci(), 'fikir_ozet').select('*').eq('vaka_id', vakaId))
      ]);
      const o = {}; ozet.forEach(r => { o[r.fikir_id] = r; });
      return satirlar.map(r => { const k = o[r.id] || {}; return { id:r.id, anahtar:r.sahip + ':' + r.id, baslik:r.baslik, problem:r.problem || '', cozum:r.cozum || '',
        ozellikler:r.ozellikler || [], ad:r.ad || '', gizli:!!r.gizli, zaman:r.zaman,
        alici:Number(k.alici) || 0, ortFiyat:Math.round((Number(k.ort_fiyat) || 0) * 100) / 100, yorum:Number(k.yorum) || 0 }; });
    },
    gizle: async (id, gizli) => {
      const r = await sorgu(DB.from(istemci(), 'fikirler').update({ gizli }).eq('id', id).select('id'));
      if (!r || !r.length) throw new Error('Fikir bulunamadı ya da yetkiniz yok');
    },
    tumFikirler: async () => (await sorgu(DB.from(istemci(), 'fikirler').select('id,sahip,vaka_id,kategori,baslik,problem,cozum,ad,gizli,zaman').order('zaman', { ascending:false }).limit(500)))
      .map(r => ({ id:r.id, anahtar:r.sahip + ':' + r.id, baslik:r.baslik, problem:r.problem || '', cozum:r.cozum || '', ad:r.ad || '', vakaId:r.vaka_id, kategori:r.kategori || '', gizli:!!r.gizli, zaman:r.zaman })),
    tumYorumlar: async () => (await sorgu(DB.from(istemci(), 'yorumlar').select('*, fikirler(baslik,sahip)').order('zaman', { ascending:false }).limit(500)))
      .map(r => ({ id:r.id, anahtar: r.fikirler ? r.fikirler.sahip + ':' + r.fikir_id : '', fikirBaslik:(r.fikirler && r.fikirler.baslik) || '', metin:r.metin, ad:r.ad || '', tur:r.tur, gizli:!!r.gizli, zaman:r.zaman })),
    // gizli sütunu ve söz listesi 13-moderasyon.sql ile gelir; çalışmadıysa bunu açıkça söyler
    yorumGizle: async (id, gizli) => {
      const { data, error } = await DB.from(istemci(), 'yorumlar').update({ gizli }).eq('id', id).select('id');
      if (error && (error.code === 'PGRST204' || error.code === '42703')) throw new Error(GEREK13);
      if (error) throw hata(error);
      if (!data || !data.length) throw new Error('Yorum değiştirilemedi. ' + GEREK13);
    },
    sozler: async () => {
      const { data, error } = await DB.from(istemci(), 'yasak_sozler').select('soz,tam').order('soz');
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) return null;
      if (error) throw hata(error);
      return data;
    },
    sozEkle: async (soz, tam) => { await sorgu(DB.from(istemci(), 'yasak_sozler').upsert({ soz, tam }, { onConflict:'soz' })); },
    sozSil: async soz => { await sorgu(DB.from(istemci(), 'yasak_sozler').delete().eq('soz', soz)); },
    raporHam: async () => {
      const [f, t, y] = await Promise.all([
        sorgu(DB.from(istemci(), 'fikirler').select('id,vaka_id,kategori,baslik,sahip,gizli,zaman').limit(20000)),
        sorgu(DB.from(istemci(), 'talepler').select('fikir_id,uye,fiyat,zaman').limit(100000)),
        DB.from(istemci(), 'yorumlar').select('id', { count:'exact', head:true })
      ]);
      return {
        fikirler: f.map(r => ({ id:r.id, vakaId: r.vaka_id || (r.kategori === CAT ? 'vaka-01' : null), baslik:r.baslik, sahip:r.sahip, gizli:!!r.gizli, zaman:r.zaman })),
        talepler: t.map(r => ({ fikirId:r.fikir_id, uye:r.uye, fiyat:Number(r.fiyat), zaman:r.zaman })),
        yorum: y.count || 0
      };
    },
    // kullanıcı adı (16-kullanici-adi.sql): girişte adın e-postası sorulur (yalnız yönetici hesapları yanıt verir)
    girisEposta: async ad => { const r = await DB.rpc(istemci(), 'giris_eposta', { ad }); return r.error ? null : (r.data || null); },
    kullaniciAdi: async () => {
      const r = await DB.from(istemci(), 'profiller').select('kullanici_adi').eq('id', mevcut().id).maybeSingle();
      if (r.error) throw new Error(GEREK16);
      return (r.data && r.data.kullanici_adi) || null;
    },
    kullaniciAdiKoy: async ad => {
      const r = await DB.rpc(istemci(), 'kullanici_adi_koy', { ad: ad || '' });
      if (r.error && (r.error.code === 'PGRST202' || r.error.code === '42883')) throw new Error(GEREK16);
      if (r.error && r.error.code === '23505') throw new Error('Bu kullanıcı adı alınmış');
      if (r.error) throw hata(r.error);
      return r.data || null;
    },
    etkinlikler: async () => {
      const { data, error } = await DB.from(istemci(), 'etkinlikler').select('*').order('baslangic', { ascending:false }).limit(200);
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) return [];   // 11-etkinlik.sql henüz çalışmadı
      if (error) throw hata(error);
      return data;
    },
    etkinlikEkle: async e => { await sorgu(DB.from(istemci(), 'etkinlikler').insert(e)); },
    etkinlikSil: async id => { await sorgu(DB.from(istemci(), 'etkinlikler').delete().eq('id', id)); },
    firmalar: async vakaId => (await sorgu(DB.from(istemci(), 'vaka_firmalari').select('eposta').eq('vaka_id', vakaId).order('eklenme'))).map(r => r.eposta),
    firmaEkle: async (vakaId, eposta) => { await sorgu(DB.from(istemci(), 'vaka_firmalari').upsert({ vaka_id:vakaId, eposta }, { onConflict:'vaka_id,eposta', ignoreDuplicates:true })); },
    firmaSil: async (vakaId, eposta) => { await sorgu(DB.from(istemci(), 'vaka_firmalari').delete().eq('vaka_id', vakaId).eq('eposta', eposta)); },
    firmaVakalari: async eposta => {
      const { data, error } = await DB.from(istemci(), 'vaka_firmalari').select('vaka_id').eq('eposta', eposta);
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) return [];   // 7-firma.sql henüz çalışmadı
      if (error) throw hata(error);
      const ids = data.map(r => r.vaka_id);
      return ids.length ? (await tam()).filter(v => ids.includes(v.id)) : [];
    },
    firmaGorsel: async (vakaId, adres) => { await sorgu(DB.rpc(istemci(), 'firma_gorsel', { v:vakaId, adres })); },
    davetler: async vakaId => {
      const { data, error } = await DB.from(istemci(), 'vaka_firmalari').select('eposta,davet').eq('vaka_id', vakaId);
      if (error && error.code === '42703') return {};   // 19-davet.sql henüz çalışmadı
      if (error) throw hata(error);
      const o = {}; data.forEach(r => { if (r.davet) o[r.eposta] = r.davet; }); return o;
    },
    // firma-davet Edge Function: kullanıcı adı (e-posta) ve tek kullanımlık şifre belirleme bağlantısı gönderir
    davet: async (vakaId, eposta) => {
      const { data, error } = await istemci().functions.invoke('firma-davet', { body:{ vaka_id:vakaId, eposta } });
      if (error){
        let ayrinti = null; try { ayrinti = await error.context.json(); } catch(e){}
        const neden = { yetki:'Yalnız yönetici gönderebilir', 'erisim-yok':'Bu e-posta vakaya ekli değil', ayar:'E-posta ayarları eksik (KURULUM.md §23)', gonderim:'E-posta servisi göndermedi' }[ayrinti && ayrinti.hata];
        throw new Error(neden || 'E-posta gönderilemedi. firma-davet fonksiyonu yüklü mü? (KURULUM.md §23)');
      }
      return data;
    },
    talepFiyatlari: async vakaId => {
      const ids = (await sorgu(DB.from(istemci(), 'fikirler').select('id').eq('vaka_id', vakaId))).map(r => r.id);
      if (!ids.length) return [];
      return (await sorgu(DB.from(istemci(), 'talepler').select('fikir_id,fiyat').in('fikir_id', ids).limit(50000))).map(r => ({ fikirId:r.fikir_id, fiyat:Number(r.fiyat) }));
    },
    kayitlar: async tablo => {
      // bildirimler fikrin başlığıyla gelir (fikir_id yabancı anahtarı üzerinden)
      const secim = tablo === 'fikir_bildirimleri' ? '*, fikirler(baslik,gizli,sahip)' : '*';
      const { data, error } = await DB.from(istemci(), tablo).select(secim).order('zaman', { ascending:false }).limit(200);
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) return [];   // tablonun migration'ı henüz çalışmadı
      if (error) throw hata(error);
      return data;
    },
    // vaka_id sütunu 15-basvuru.sql ile gelir; yoksa yalnız durum yazılır
    basvuruBagla: async (id, vakaId) => {
      const r = await DB.from(istemci(), 'vaka_basvurulari').update({ durum:'kabul', vaka_id:vakaId }).eq('id', id);
      if (r.error && r.error.code === 'PGRST204') return void await sorgu(DB.from(istemci(), 'vaka_basvurulari').update({ durum:'kabul' }).eq('id', id));
      if (r.error) throw hata(r.error);
    },
    // firmanın kendi başvuruları: e-postası eşleşen satırları okuyabilir (15-basvuru.sql); öncesinde boş döner
    basvurularim: async eposta => {
      const { data, error } = await DB.from(istemci(), 'vaka_basvurulari').select('id,stok,durum,zaman,eposta').ilike('eposta', eposta.replace(/[%_\\]/g, '\\$&')).order('zaman', { ascending:false }).limit(20);
      return error ? [] : data.filter(b => kucuk(b.eposta) === eposta);
    },
    kayitDurum: async (tablo, id, durum) => { await sorgu(DB.from(istemci(), tablo).update({ durum }).eq('id', id)); }
  };
  const depo = SB_URL ? uzak : yerel;

  // Oturum: sıra numarası, en son başlayan yüklemenin sonucu geçerli (giriş + olay yarışmasında eski sonuç yazılmaz).
  async function rolOku(user){
    try { const p = await sorgu(DB.from(istemci(), 'profiller').select('rol').eq('id', user.id).maybeSingle()); return p && p.rol === 'admin' ? 'admin' : 'uye'; }
    catch(e){ return 'uye'; }
  }
  async function oturumYukle(session){
    const sira = ++senkSira;
    const o = session && session.user ? { id: session.user.id, email: session.user.email || '', rol: await rolOku(session.user) } : null;
    if (sira !== senkSira) return;
    const eski = JSON.stringify(oturum);
    oturum = o;
    if (JSON.stringify(o) !== eski) bildir();
  }
  // assets/ud aynı sayfadaysa onun istemcisi kullanılır (window.UD_SB): tek istemci, tek oturum.
  function sbYukle(){
    if (window.UD_SB) return window.UD_SB();
    return new Promise((ok, no) => {
      if (window.supabase && window.supabase.createClient) return ok(window.supabase);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@' + SB_SURUM + '/dist/umd/supabase.min.js';
      s.integrity = SB_SRI; s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = () => (window.supabase && window.supabase.createClient) ? ok(window.supabase) : no(new Error('Veri servisi yüklenemedi'));
      s.onerror = () => no(new Error('Veri servisi yüklenemedi'));
      document.head.appendChild(s);
    });
  }

  // ----------------------------------------------------------- kurallar
  function geciseIzin(eski, yeni){
    if (!DURUMLAR.includes(yeni)) throw new Error('Bilinmeyen durum');
    if (!(GECIS[eski] || []).includes(yeni)) throw new Error('Bu geçiş yapılamaz: ' + DURUM_ADI[eski] + ' → ' + DURUM_ADI[yeni]);
  }
  function temizle(a){
    const o = {};
    if (!a || typeof a !== 'object') return o;
    ALANLAR.forEach(k => {
      if (!(k in a)) return;
      o[k] = k === 'ortaklik' ? (a[k] === true || a[k] === 'true' || a[k] === 'on') : SAYI.includes(k) ? (a[k] === '' || a[k] == null ? 0 : Number(a[k])) : str(a[k]);
    });
    return o;
  }
  function dogrula(v){
    const sayi = (x, min) => Number.isFinite(x) && x >= min;
    const tam = x => Number.isInteger(x);
    if (!v.baslik) throw new Error('Başlık gerekli');
    if (v.baslik.length > 140) throw new Error('Başlık en çok 140 karakter olabilir');
    if (!v.stok) throw new Error('Stok (ne olduğu) gerekli');
    if (!(sayi(v.adet, 1) && tam(v.adet))) throw new Error('Adet 0’dan büyük bir tam sayı olmalı');
    if (!sayi(v.taban_fiyat, 0)) throw new Error('Taban fiyat 0 ya da daha büyük olmalı');
    if (!(sayi(v.deneme_adedi, 0) && tam(v.deneme_adedi))) throw new Error('Deneme adedi 0 ya da daha büyük bir tam sayı olmalı');
    if (!(sayi(v.sure_gun, 1) && tam(v.sure_gun))) throw new Error('Fikir süresi en az 1 gün olmalı');
    // a case offers a sales partnership, an idea prize, or both (supabase/12-vaka-modeli.sql)
    if (v.odul != null && !sayi(v.odul, 0)) throw new Error('Fikir ödülü 0 ya da daha büyük olmalı');
    if (v.ortaklik === false && !(v.odul > 0)) throw new Error('Satış ortaklığı ya da fikir ödülünden en az birini seçin');
    // https in the database; the local preview stores the uploaded photo itself as a data URL
    if (v.gorsel && !(/^https:\/\//.test(v.gorsel) || (!SB_URL && /^data:image\/(jpeg|png|webp);base64,/.test(v.gorsel)))) throw new Error('Görsel adresi https ile başlamalı');
  }
  // URL'e uygun kimlik: Türkçe harfleri sadeleştir, harf/rakam dışını '-' yap.
  function slug(s){
    const t = kucuk(str(s)).replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u');
    return t.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'vaka';
  }
  async function benzersizId(taban){
    let id = taban, n = 2;
    while (await depo.al(id)) id = taban + '-' + n++;
    return id;
  }
  // CSV hücresi: ; ve satır sonu varsa tırnak; Excel'in formül çalıştırmasını önlemek için = + - @ önüne '.
  function hucre(x){
    let s = x == null ? '' : typeof x === 'number' ? String(x).replace('.', ',') : String(x);
    if (typeof x !== 'number' && /^[=+\-@]/.test(s)) s = "'" + s;
    return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }

  function kayitTuru(tablo, adlar){
    const o = {
      DURUMLAR: Object.keys(adlar), DURUM_ADI: Object.freeze(Object.assign({}, adlar)),
      async liste(){ yetkiTest(); return depo.kayitlar(tablo); },
      async durum(id, durum){
        yetkiTest();
        if (!o.DURUMLAR.includes(durum)) throw new Error('Bilinmeyen durum');
        await depo.kayitDurum(tablo, str(id), durum);
      }
    };
    return o;
  }

  // ----------------------------------------------------------- genel arayüz
  const UDV = {
    mod: SB_URL ? 'supabase' : 'yerel',
    hazir: hazirSoz,
    DURUMLAR: Object.freeze(DURUMLAR.slice()),
    DURUM_ADI: Object.freeze(Object.assign({}, DURUM_ADI)),
    GECIS: Object.freeze(Object.assign({}, GECIS)),

    oturum(){ const o = mevcut(); return o ? { id:o.id, email:o.email, rol:o.rol } : null; },
    // Abonelik kurulunca ve hazır olunca fn bir kez mevcut oturumla çağrılır.
    onOturum(fn){
      aboneler.add(fn);
      hazirSoz.then(() => { if (aboneler.has(fn)) fn(UDV.oturum()); });
      return () => { aboneler.delete(fn); };
    },
    // email: an address, or an admin's username (no "@" in it), which is first turned into its address
    async giris(email, sifre){
      if (!str(email).includes('@')){
        const ad = kucuk(str(email));
        email = AD_KURALI.test(ad) ? await depo.girisEposta(ad) : null;
        if (!email) throw new Error(YANLIS);
      }
      if (SB_URL){
        const { data, error } = await istemci().auth.signInWithPassword({ email: str(email), password: String(sifre || ''), options: { captchaToken: await tsJeton() } });
        // an unconfirmed address is the one failure worth naming: the person can ask for the link again
        if (error && error.code === 'email_not_confirmed') throw Object.assign(new Error('E-posta henüz doğrulanmadı'), { code: error.code });
        if (error || !data.session) throw new Error(YANLIS);
        await oturumYukle(data.session);
        return UDV.oturum();
      }
      const e = kucuk(str(email));
      if (!ADMINLER.includes(e) || sifre !== 'undustit') throw new Error(YANLIS);
      const d = oku(); d.oturum = { id:'yerel:' + e, email:e, rol:'admin' }; yaz(d); bildir();
      return UDV.oturum();
    },
    async baglantiGonder(email){
      if (!SB_URL) throw new Error('Yerel modda e-posta gönderilmez');
      const { error } = await istemci().auth.signInWithOtp({ email: str(email), options: { emailRedirectTo: location.origin + location.pathname, captchaToken: await tsJeton() } });
      if (error) throw new Error('Bağlantı gönderilemedi');
    },
    async cikis(){
      if (SB_URL){ await istemci().auth.signOut(); await oturumYukle(null); return; }
      const d = oku(); d.oturum = null; yaz(d); bildir();
    },

    vakalar: {
      async liste(f){
        f = f || {};
        let rows = await depo.liste();
        if (!benAdmin()) rows = rows.filter(v => v.durum !== 'taslak');
        if (f.durum) rows = rows.filter(v => v.durum === f.durum);
        const q = kucuk(str(f.ara));
        if (q) rows = rows.filter(v => [v.id, v.baslik, v.firma, v.stok].some(x => kucuk(str(x)).includes(q)));
        return rows.sort((a,b) => Date.parse(b.olusturma) - Date.parse(a.olusturma));
      },
      async al(id){
        const v = await depo.al(str(id));
        return v && (benAdmin() || v.durum !== 'taslak') ? v : null;
      },
      async olustur(alanlar){
        yetkiTest();
        const v = Object.assign({}, VARSAYILAN, temizle(alanlar));
        dogrula(v);
        const id = await benzersizId(slug(v.baslik));
        const an = simdi(), eposta = mevcut().email;
        const yeni = await depo.ekle(Object.assign({}, v, { id, durum:'taslak', acilis:null, kapanis:null, kazanan:null,
          olusturan:eposta, olusturma:an, guncelleme:an }));
        await depo.gecmisEkle(id, { durum:'taslak', not:'Vaka oluşturuldu', kim:eposta, zaman:an });
        return yeni;
      },
      async guncelle(id, alanlar){
        yetkiTest();
        const mev = await depo.al(str(id));
        if (!mev) throw new Error('Vaka bulunamadı');
        const v = Object.assign({}, mev, temizle(alanlar));
        dogrula(v);
        const yama = { guncelleme: simdi() };
        ALANLAR.forEach(k => { yama[k] = v[k]; });
        return depo.guncelle(mev.id, yama);
      },
      async durum(id, yeniDurum, not){
        yetkiTest();
        if (yeniDurum === 'kazanan') throw new Error('Kazanan için bir fikir seçin');
        const v = await depo.al(str(id));
        if (!v) throw new Error('Vaka bulunamadı');
        geciseIzin(v.durum, yeniDurum);
        const an = simdi();
        const yama = { durum: yeniDurum, guncelleme: an };
        if (yeniDurum === 'acik') yama.acilis = an;
        if (yeniDurum === 'kapali') yama.kapanis = an;
        const yeni = await depo.guncelle(v.id, yama);
        await depo.gecmisEkle(v.id, { durum:yeniDurum, not:str(not), kim:mevcut().email, zaman:an });
        return yeni;
      },
      async sil(id){
        yetkiTest();
        const v = await depo.al(str(id));
        if (!v) throw new Error('Vaka bulunamadı');
        if (v.durum !== 'taslak') throw new Error('Yalnız taslak vaka silinebilir');
        await depo.sil(v.id);
      },
      async gecmis(id){
        yetkiTest();
        return depo.gecmis(str(id));
      }
    },

    fikirler: {
      async vaka(id){
        const v = await UDV.vakalar.al(str(id));
        if (!v) return [];
        const rows = await depo.fikirler(v.id);
        return benAdmin() ? rows : rows.filter(f => !f.gizli);
      },
      async gizle(fikirId, gizli){
        yetkiTest();
        await depo.gizle(str(fikirId), !!gizli);
      },
      async kazanan(vakaId, fikirId){
        yetkiTest();
        const v = await depo.al(str(vakaId));
        if (!v) throw new Error('Vaka bulunamadı');
        const f = (await depo.fikirler(v.id)).find(x => x.id === str(fikirId));
        if (!f) throw new Error('Bu vakada böyle bir fikir yok');
        if (v.durum !== 'kazanan') geciseIzin(v.durum, 'kazanan');
        const an = simdi();
        const yeni = await depo.guncelle(v.id, { durum:'kazanan', kazanan:f.id, guncelleme:an });
        await depo.gecmisEkle(v.id, { durum:'kazanan', not:'Kazanan: ' + f.baslik, kim:mevcut().email, zaman:an });
        return yeni;
      }
    },

    // Moderasyon: sitedeki bütün fikirler ve yorumlar (en yeni önce, gizliler dahil) ve ön filtrenin söz listesi.
    // Fikir gizlemek için UDV.fikirler.gizle; sozler() söz listesi yoksa (yerel mod, migration çalışmadı) null döner.
    icerik: {
      async fikirler(){ yetkiTest(); return (await depo.tumFikirler()).sort((a, b) => String(b.zaman).localeCompare(String(a.zaman))); },
      async yorumlar(){ yetkiTest(); return (await depo.tumYorumlar()).sort((a, b) => String(b.zaman).localeCompare(String(a.zaman))); },
      async yorumGizle(id, gizli){ yetkiTest(); await depo.yorumGizle(str(id), !!gizli); },
      async sozler(){ yetkiTest(); return depo.sozler(); },
      async sozEkle(soz, tam){
        yetkiTest();
        const s = kucuk(str(soz));
        if (s.length < 2 || s.length > 40 || /\s/.test(s)) throw new Error('Tek bir kelime yazın (2–40 harf)');
        await depo.sozEkle(s, !!tam);
      },
      async sozSil(soz){ yetkiTest(); await depo.sozSil(str(soz)); }
    },

    async ozet(){
      const liste = await UDV.vakalar.liste();
      // yönetici sitenin tamamını görür: vakasız fikirler de sayılır, gizlenenler ayrıca verilir
      if (benAdmin()){
        const ham = await depo.raporHam(), gorunur = new Set(ham.fikirler.filter(f => !f.gizli).map(f => f.id));
        return { vaka:{ toplam:liste.length, acik:liste.filter(v => v.durum === 'acik').length }, fikir:gorunur.size,
          alici: ham.talepler.filter(t => gorunur.has(t.fikirId)).length, gizli: ham.fikirler.length - gorunur.size };
      }
      let fikir = 0, alici = 0;
      for (const v of liste){
        const fs = await UDV.fikirler.vaka(v.id);
        fikir += fs.length;
        alici += fs.reduce((t, f) => t + f.alici, 0);
      }
      return { vaka:{ toplam:liste.length, acik:liste.filter(v => v.durum === 'acik').length }, fikir, alici };
    },

    // Alıcıya gösterilecek tablo: toplamlar, son 8 hafta, vaka bazında talep, en çok istenen fikirler.
    // Gizli fikirler ve onların talepleri sayılmaz (kaç fikrin gizlendiği ayrıca verilir).
    async rapor(){
      yetkiTest();
      const [ham, vakalar] = await Promise.all([depo.raporHam(), depo.liste()]);
      const gorunur = ham.fikirler.filter(f => !f.gizli), fikir = {};
      gorunur.forEach(f => { fikir[f.id] = { ...f, talep:0, tutar:0 }; });
      const talepler = ham.talepler.filter(t => fikir[t.fikirId]);
      talepler.forEach(t => { const f = fikir[t.fikirId]; f.talep++; f.tutar += t.fiyat; });
      const tutar = talepler.reduce((a, t) => a + t.fiyat, 0);
      const toplam = {
        fikir: gorunur.length, gizli: ham.fikirler.length - gorunur.length,
        yazar: new Set(gorunur.map(f => f.sahip)).size,
        talep: talepler.length, alici: new Set(talepler.map(t => t.uye)).size,
        tutar, ortFiyat: talepler.length ? Math.round(tutar / talepler.length) : 0,
        talepli: Object.values(fikir).filter(f => f.talep > 0).length, yorum: ham.yorum,
        tarihsiz: talepler.filter(t => !t.zaman).length
      };
      // haftalar pazartesi 00.00 İstanbul (UTC+3, yaz saati yok) başlar; en eskiden yeniye
      const GUN = 864e5, IST = 3 * 36e5;
      const haftaBasi = ms => { const g = Math.floor((ms + IST) / GUN); return (g - ((g + 3) % 7)) * GUN - IST; };   // 1 Ocak 1970 perşembeydi
      const bu = haftaBasi(Date.now());
      const haftalar = Array.from({ length:8 }, (_, i) => ({ bas: new Date(bu - (7 - i) * 7 * GUN).toISOString(), fikir:0, talep:0 }));
      const yerlestir = (z, alan) => { if (!z) return; const i = 7 - Math.round((bu - haftaBasi(Date.parse(z))) / (7 * GUN)); if (i >= 0 && i < 8) haftalar[i][alan]++; };
      gorunur.forEach(f => yerlestir(f.zaman, 'fikir'));
      talepler.forEach(t => yerlestir(t.zaman, 'talep'));
      // vaka bazında; vakası olmayanlar ayrı satırda
      const satir = (id, baslik, durum) => {
        const fs = Object.values(fikir).filter(f => (f.vakaId || null) === id), ts = talepler.filter(t => (fikir[t.fikirId].vakaId || null) === id);
        const en = fs.slice().sort((a, b) => b.talep - a.talep || b.tutar - a.tutar)[0];
        return { id, baslik, durum, fikir:fs.length, talep:ts.length, alici:new Set(ts.map(t => t.uye)).size,
          tutar:ts.reduce((a, t) => a + t.fiyat, 0), enIyi: en && en.talep ? en.baslik : '' };
      };
      const vakaSatirlari = vakalar.slice().sort((a, b) => String(b.olusturma).localeCompare(String(a.olusturma)))
        .map(v => satir(v.id, v.baslik, v.durum)).concat([satir(null, 'Vakadan bağımsız', '')]);
      const adi = {}; vakalar.forEach(v => { adi[v.id] = v.baslik; });
      const liste = Object.values(fikir).sort((a, b) => b.talep - a.talep || b.tutar - a.tutar)
        .map(f => ({ baslik:f.baslik, vaka: f.vakaId ? (adi[f.vakaId] || f.vakaId) : '', talep:f.talep, ortFiyat: f.talep ? Math.round(f.tutar / f.talep) : 0, tutar:f.tutar, zaman:f.zaman }));
      return { toplam, haftalar, vakalar:vakaSatirlari, fikirler:liste };
    },

    async raporCsv(){
      const r = await UDV.rapor();
      const satirlar = [['baslik','vaka','alirdim','ort_fiyat','talep_tutari','zaman']]
        .concat(r.fikirler.map(f => [f.baslik, f.vaka, f.talep, f.ortFiyat, f.tutar, f.zaman || '']));
      return '\ufeff' + satirlar.map(x => x.map(hucre).join(';')).join('\r\n');
    },

    // Yöneticinin giriş bilgileri: e-postanın yanında bir kullanıcı adı (yoksa null). Boş metin adı kaldırır.
    hesap: {
      async kullaniciAdi(){ yetkiTest(); return depo.kullaniciAdi(); },
      async kullaniciAdiKoy(ad){
        yetkiTest();
        const v = kucuk(str(ad));
        if (v && !AD_KURALI.test(v)) throw new Error('Kullanıcı adı 3–24 karakter olmalı: küçük harf (a–z), rakam, nokta, alt çizgi');
        return depo.kullaniciAdiKoy(v);
      }
    },

    // Etkinlikler (yayın, atölye, buluşma): yönetici ekler ve siler; site sıradakini sayfaların üstünde gösterir.
    etkinlik: {
      async liste(){ yetkiTest(); return (await depo.etkinlikler()).sort((a, b) => String(b.baslangic).localeCompare(String(a.baslangic))); },
      async ekle(e){
        yetkiTest();
        const x = { baslik:str(e.baslik), aciklama:str(e.aciklama), baslangic:e.baslangic, bitis:e.bitis || null, baglanti:str(e.baglanti) };
        if (!x.baslik || x.baslik.length > 120) throw new Error('Başlık 1–120 karakter olmalı');
        if (!x.baslangic || isNaN(Date.parse(x.baslangic))) throw new Error('Başlangıç zamanını seçin');
        if (x.bitis && !(Date.parse(x.bitis) > Date.parse(x.baslangic))) throw new Error('Bitiş, başlangıçtan sonra olmalı');
        if (x.baglanti && !/^https:\/\/\S+$/.test(x.baglanti)) throw new Error('Bağlantı https:// ile başlamalı');
        if (x.aciklama.length > 600) throw new Error('Açıklama en çok 600 karakter');
        await depo.etkinlikEkle(x);
      },
      async sil(id){ yetkiTest(); await depo.etkinlikSil(str(id)); }
    },

    // Firma paneli (firma/): yöneticinin vakaya eklediği e-postayla giren firma kendi vakasını görür.
    firma: {
      eposta(){ const o = mevcut(); return o && o.email ? kucuk(o.email) : ''; },
      async liste(vakaId){ yetkiTest(); return depo.firmalar(str(vakaId)); },
      async ekle(vakaId, eposta){
        yetkiTest();
        const e = kucuk(str(eposta));
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 160) throw new Error('Geçerli bir e-posta yazın');
        await depo.firmaEkle(str(vakaId), e);
      },
      async sil(vakaId, eposta){ yetkiTest(); await depo.firmaSil(str(vakaId), kucuk(str(eposta))); },
      // kabul edilen firmaya giriş bilgisi: kullanıcı adı ve şifre belirleme bağlantısı (şifre e-postaya yazılmaz)
      async davet(vakaId, eposta){ yetkiTest(); return depo.davet(str(vakaId), kucuk(str(eposta))); },
      async davetler(vakaId){ yetkiTest(); return depo.davetler(str(vakaId)); },
      async vakalarim(){ const e = UDV.firma.eposta(); return e ? depo.firmaVakalari(e) : []; },
      // vakası henüz açılmamış firmanın başvuruları: [{ id, stok, durum, zaman }]
      async basvurularim(){ const e = UDV.firma.eposta(); return e ? depo.basvurularim(e) : []; },
      // yerel önizlemede e-posta gönderilmez: kayıtlı bir firma e-postasıyla doğrudan girilir
      async giris(eposta){
        const e = kucuk(str(eposta));
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Geçerli bir e-posta yazın');
        if (SB_URL) return UDV.baglantiGonder(e);
        if (!(await depo.firmaVakalari(e)).length) throw new Error('Bu e-postaya bağlı vaka yok');
        const d = oku(); d.oturum = { id:'yerel:' + e, email:e, rol:'uye' }; yaz(d); bildir();
      },
      // panelin bütün sayıları: vaka, fikirler (gizliler hariç), toplamlar ve fiyat dağılımı
      async panel(vakaId){
        const benim = (await UDV.firma.vakalarim()).find(v => v.id === vakaId);
        if (!benim && !benAdmin()) throw new Error('Bu vakayı görme yetkin yok');
        const v = benim || await depo.al(vakaId);
        const fikirler = (await depo.fikirler(vakaId)).filter(f => !f.gizli);
        const gorunur = new Set(fikirler.map(f => f.id));
        const fiyatlar = (await depo.talepFiyatlari(vakaId)).filter(t => gorunur.has(t.fikirId));
        const tutar = fiyatlar.reduce((a, t) => a + t.fiyat, 0);
        const SINIR = [100, 200, 300, 500, 750, 1000, 2000, Infinity];
        const dagilim = SINIR.map((ust, i) => ({ alt: i ? SINIR[i - 1] + 1 : 1, ust, n: fiyatlar.filter(t => t.fiyat <= ust && (!i || t.fiyat > SINIR[i - 1])).length }));
        while (dagilim.length && !dagilim[dagilim.length - 1].n) dagilim.pop();
        const ilk = dagilim.findIndex(d => d.n);
        return {
          vaka: v,
          toplam: { fikir: fikirler.length, talep: fiyatlar.length, tutar, ortFiyat: fiyatlar.length ? Math.round(tutar / fiyatlar.length) : 0,
            yorum: fikirler.reduce((a, f) => a + f.yorum, 0),
            doluluk: v.deneme_adedi ? Math.round(fiyatlar.length / v.deneme_adedi * 1000) / 10 : null },
          dagilim: ilk < 0 ? [] : dagilim.slice(ilk),
          fikirler: fikirler.slice().sort((a, b) => b.alici - a.alici || b.ortFiyat - a.ortFiyat)
        };
      },
      async gorsel(vakaId, adres){
        if (adres && !(/^https:\/\//.test(adres) || (!SB_URL && /^data:image\/(jpeg|png|webp);base64,/.test(adres)))) throw new Error('Görsel adresi https ile başlamalı');
        if (!benAdmin() && !(await UDV.firma.vakalarim()).some(v => v.id === vakaId)) throw new Error('Bu vakayı değiştirme yetkin yok');
        await depo.firmaGorsel(str(vakaId), str(adres));
      },
      async csv(vakaId){
        const p = await UDV.firma.panel(vakaId);
        const satirlar = [['baslik','ad','alirdim','ort_fiyat','yorum','zaman']]
          .concat(p.fikirler.map(f => [f.baslik, f.ad, f.alici, f.ortFiyat, f.yorum, f.zaman || '']));
        return '﻿' + satirlar.map(r => r.map(hucre).join(';')).join('\r\n');
      }
    },

    // Sitenin yalnız yöneticiye giden kayıtları: aynı liste ve durum arayüzü, farklı tablo ve durumlar
    // vaka sayfasındaki "Ürünü görmek istiyorum" talepleri (supabase/14-numune.sql)
    numuneler: kayitTuru('numune_talepleri', { yeni:'Yeni', arandi:'İletişime geçildi', gonderildi:'Gönderildi', kapandi:'Kapandı' }),
    basvurular: kayitTuru('vaka_basvurulari', { yeni:'Yeni', incelendi:'İncelendi', kabul:'Kabul', red:'Ret' }),
    mesajlar: kayitTuru('iletisim_mesajlari', { yeni:'Yeni', yanitlandi:'Yanıtlandı', kapandi:'Kapandı' }),
    bildirimler: kayitTuru('fikir_bildirimleri', { acik:'Karar bekliyor', gizlendi:'Fikri gizle', yok_sayildi:'Yok say, fikir yayında kalsın' }),
    hatalar: kayitTuru('hata_kayitlari', { yeni:'Yeni', cozuldu:'Çözüldü' }),

    async csv(vakaId){
      yetkiTest();
      const v = await depo.al(str(vakaId));
      if (!v) throw new Error('Vaka bulunamadı');
      const fs = await UDV.fikirler.vaka(v.id);
      const satirlar = [['baslik','ad','alici','ortFiyat','yorum','gizli','zaman']]
        .concat(fs.map(f => [f.baslik, f.ad, f.alici, f.ortFiyat, f.yorum, f.gizli ? 'evet' : 'hayır', f.zaman || '']));
      return '﻿' + satirlar.map(r => r.map(hucre).join(';')).join('\r\n');
    }
  };

  // ----------------------------------------------------------- başlangıç
  window.addEventListener('storage', e => { if (!SB_URL && e.key === LS) bildir(); });
  if (SB_URL){
    sbYukle().then(x => {
      sb = x.auth ? x : x.createClient(SB_URL, SB_ANON);
      // İlk oturum getSession ile alınır; INITIAL_SESSION ikinci kez yüklemeyi önlemek için atlanır.
      sb.auth.onAuthStateChange((olay, session) => { if (olay !== 'INITIAL_SESSION') oturumYukle(session); });
      return sb.auth.getSession();
    }).then(r => oturumYukle(r.data.session))
      .catch(e => console.error('UDV:', e && e.message))
      .finally(() => hazirCoz());
  } else {
    oku();
    hazirCoz();
  }

  // Başvurudan açılan vaka: başvuru "Kabul" olur ve vakasına bağlanır (yonetim/vaka/?basvuru=…)
  UDV.basvurular.bagla = async (id, vakaId) => { yetkiTest(); await depo.basvuruBagla(str(id), str(vakaId)); };

  window.UDV = UDV;
})();
