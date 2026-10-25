// Veri katmanı (window.UDV). Yerel modda localStorage (udv-v1), ayar.js'te supabaseUrl doluysa Supabase.
// İki modda aynı arayüz: her fonksiyon Promise döner, hata Error olarak fırlar (message Türkçe).
// Kurallar (geçişler, slug, doğrulama, yetki) burada tek yerde; iki depo yalnız okuma/yazma yapar.
(function(){
  'use strict';

  const AYAR = window.UD_AYAR || {};
  const SB_URL = AYAR.supabaseUrl || '';
  const SB_ANON = AYAR.supabaseAnon || '';
  const SB_SURUM = '2.45.4';
  const ADMINLER = (AYAR.adminler || []).map(e => String(e).trim().toLowerCase());
  const LS = 'udv-v1';
  const SITE_LS = 'ud-store-v1';   // sitenin fikir deposu, yalnız okunur (bkz. ud.js Store)
  const CAT = 'Vaka 01 · Cıvata';
  const MAKS_FIYAT = 100000;       // ud.js TERMS.maxPrice ile aynı

  const DURUMLAR = ['taslak','acik','degerlendirme','kazanan','uretim','kapali'];
  const DURUM_ADI = { taslak:'Taslak', acik:'Açık', degerlendirme:'Değerlendirmede', kazanan:'Kazanan seçildi', uretim:'Üretimde', kapali:'Kapandı' };
  const GECIS = { taslak:['acik'], acik:['degerlendirme','kapali'], degerlendirme:['kazanan','acik','kapali'], kazanan:['uretim','kapali'], uretim:['kapali'], kapali:[] };
  const ALANLAR = ['baslik','ozet','aciklama','firma','stok','adet','olcu','sinif','taban_fiyat','deneme_adedi','sure_gun','gorsel'];
  const SAYI = ['adet','taban_fiyat','deneme_adedi','sure_gun'];
  const VARSAYILAN = { ozet:'', aciklama:'', firma:'', stok:'', adet:0, olcu:'', sinif:'', taban_fiyat:0, deneme_adedi:0, sure_gun:30, gorsel:'' };
  const YANLIS = 'E-posta ya da şifre yanlış';   // giriş hatasını ayırt etmeden söyler
  const YETKI = 'Bu işlem için yönetici girişi gerekli';

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
    return { vakalar: { 'vaka-01': { id:'vaka-01', baslik:'Bir milyon cıvata', ozet:'Bir milyon cıvata için fikir yarışı.', aciklama:'', firma:'Örnek Fabrika', stok:'M10 × 90 flanşlı cıvata + flanşlı somun', adet:1000000, olcu:'M10 × 90', sinif:'8.8', taban_fiyat:2, deneme_adedi:1000, sure_gun:30, gorsel:'', durum:'acik', acilis:an, kapanis:null, kazanan:null, olusturan:'admin@undustit.local', olusturma:an, guncelleme:an } },
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
      out.push({ id, baslik: str(it.title), problem: str(it.problem), cozum: str(it.solution),
        ozellikler: (Array.isArray(it.feats) ? it.feats : []).map(x => str(x)).filter(Boolean), ad: str(it.handle),
        gizli: !!gizli[id], zaman: it.at || null,
        alici: f.length, ortFiyat: f.length ? Math.round(f.reduce((a,b) => a + b, 0) / f.length * 100) / 100 : 0,
        yorum: notlar[id] || 0 });
    }));
    return out;
  }
  const yerel = {
    liste: async () => Object.values(oku().vakalar),
    al: async id => oku().vakalar[id] || null,
    ekle: async v => { const d = oku(); d.vakalar[v.id] = v; d.gecmis[v.id] = []; yaz(d); return v; },
    guncelle: async (id, yama) => { const d = oku(); if (!d.vakalar[id]) throw new Error('Vaka bulunamadı'); Object.assign(d.vakalar[id], yama); yaz(d); return d.vakalar[id]; },
    sil: async id => { const d = oku(); delete d.vakalar[id]; delete d.gecmis[id]; yaz(d); },
    gecmisEkle: async (id, satir) => { const d = oku(); (d.gecmis[id] = d.gecmis[id] || []).push(satir); yaz(d); },
    gecmis: async id => (oku().gecmis[id] || []).slice().sort((a,b) => Date.parse(a.zaman) - Date.parse(b.zaman)),
    fikirler: async vakaId => yerelFikirler(vakaId),
    gizle: async (id, gizli) => { const d = oku(); if (gizli) d.gizli[id] = true; else delete d.gizli[id]; yaz(d); }
  };

  // ----------------------------------------------------------- supabase depo
  let sb = null, senkSira = 0;
  const istemci = () => { if (!sb) throw new Error('Veri servisi hazır değil'); return sb; };
  function hata(e){
    if (e.code === '42501') return new Error(YETKI);
    if (e.code === '23505') return new Error('Bu kimlik zaten var');
    return new Error('Veri işlemi başarısız: ' + e.message);
  }
  async function sorgu(q){ const { data, error } = await q; if (error) throw hata(error); return data; }
  const uzak = {
    liste: async () => sorgu(istemci().from('vakalar').select('*')),
    al: async id => sorgu(istemci().from('vakalar').select('*').eq('id', id).maybeSingle()),
    ekle: async v => sorgu(istemci().from('vakalar').insert(v).select().single()),
    guncelle: async (id, yama) => sorgu(istemci().from('vakalar').update(yama).eq('id', id).select().single()),
    sil: async id => { await sorgu(istemci().from('vakalar').delete().eq('id', id)); },
    gecmisEkle: async (id, s) => { await sorgu(istemci().from('vaka_gecmis').insert({ vaka_id:id, durum:s.durum, not:s.not, kim:s.kim, zaman:s.zaman })); },
    gecmis: async id => (await sorgu(istemci().from('vaka_gecmis').select('*').eq('vaka_id', id).order('zaman', { ascending:true })))
      .map(r => ({ durum:r.durum, not:r.not, kim:r.kim, zaman:r.zaman })),
    fikirler: async vakaId => {
      const [satirlar, ozet] = await Promise.all([
        sorgu(istemci().from('fikirler').select('*').eq('vaka_id', vakaId).order('zaman', { ascending:false })),
        sorgu(istemci().from('fikir_ozet').select('*').eq('vaka_id', vakaId))
      ]);
      const o = {}; ozet.forEach(r => { o[r.fikir_id] = r; });
      return satirlar.map(r => { const k = o[r.id] || {}; return { id:r.id, baslik:r.baslik, problem:r.problem || '', cozum:r.cozum || '',
        ozellikler:r.ozellikler || [], ad:r.ad || '', gizli:!!r.gizli, zaman:r.zaman,
        alici:Number(k.alici) || 0, ortFiyat:Math.round((Number(k.ort_fiyat) || 0) * 100) / 100, yorum:Number(k.yorum) || 0 }; });
    },
    gizle: async (id, gizli) => {
      const r = await sorgu(istemci().from('fikirler').update({ gizli }).eq('id', id).select('id'));
      if (!r || !r.length) throw new Error('Fikir bulunamadı ya da yetkiniz yok');
    }
  };
  const depo = SB_URL ? uzak : yerel;

  // Oturum: sıra numarası, en son başlayan yüklemenin sonucu geçerli (giriş + olay yarışmasında eski sonuç yazılmaz).
  async function rolOku(user){
    try { const p = await sorgu(istemci().from('profiller').select('rol').eq('id', user.id).maybeSingle()); return p && p.rol === 'admin' ? 'admin' : 'uye'; }
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
  // ud.js aynı sayfadaysa onun istemcisi kullanılır (window.UD_SB): tek istemci, tek oturum.
  function sbYukle(){
    if (window.UD_SB) return window.UD_SB();
    return new Promise((ok, no) => {
      if (window.supabase && window.supabase.createClient) return ok(window.supabase);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@' + SB_SURUM + '/dist/umd/supabase.min.js';
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
      o[k] = SAYI.includes(k) ? (a[k] === '' || a[k] == null ? 0 : Number(a[k])) : str(a[k]);
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
    if (v.gorsel && !/^https?:\/\//.test(v.gorsel)) throw new Error('Görsel adresi http ya da https ile başlamalı');
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
    async giris(email, sifre){
      if (SB_URL){
        const { data, error } = await istemci().auth.signInWithPassword({ email: str(email), password: String(sifre || '') });
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
      const { error } = await istemci().auth.signInWithOtp({ email: str(email), options: { emailRedirectTo: location.origin + location.pathname } });
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

    async ozet(){
      const liste = await UDV.vakalar.liste();
      let fikir = 0, alici = 0;
      for (const v of liste){
        const fs = await UDV.fikirler.vaka(v.id);
        fikir += fs.length;
        alici += fs.reduce((t, f) => t + f.alici, 0);
      }
      return { vaka:{ toplam:liste.length, acik:liste.filter(v => v.durum === 'acik').length }, fikir, alici };
    },

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

  window.UDV = UDV;
})();
