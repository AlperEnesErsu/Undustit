// node tools/db-adlar.mjs > out.sql: the rename part of supabase/20-english-names.sql, from the one name map in
// assets/ud/db.js. Tables, columns, constraints, indexes, sequences, policies and triggers; the functions and views
// are written by hand in the migration (their bodies are text, a rename does not reach them).
import { createRequire } from 'node:module';
const DB = createRequire(import.meta.url)('../assets/ud/db.js');

// the live schema's other names (read from pg_constraint, pg_indexes, pg_policies, information_schema.triggers on 19 Nov 2026)
const KISITLAR = {
  cihaz_izleri: ['cihaz_izleri_cihaz_check','cihaz_izleri_fikir_id_fkey','cihaz_izleri_pkey','cihaz_izleri_tur_check','cihaz_izleri_uye_fkey','cihaz_izleri_uye'],
  etkinlikler: ['etkinlikler_aciklama_check','etkinlikler_baglanti_check','etkinlikler_baslik_check','etkinlikler_check','etkinlikler_pkey','etkinlikler_baslangic'],
  fikir_bildirimleri: ['fikir_bildirimleri_aciklama_check','fikir_bildirimleri_durum_check','fikir_bildirimleri_fikir_id_fkey','fikir_bildirimleri_fikir_id_uye_key',
    'fikir_bildirimleri_neden_check','fikir_bildirimleri_pkey','fikir_bildirimleri_uye_fkey','fikir_bildirimleri_acik','fikir_bildirimleri_uye'],
  fikirler: ['fikirler_baslik_check','fikirler_pkey','fikirler_sahip_fkey','fikirler_sinirlar','fikirler_vaka_id_fkey','fikirler_sahip','fikirler_vaka','fikirler_zaman'],
  haber_istekleri: ['haber_istekleri_eposta_check','haber_istekleri_fikir_id_fkey','haber_istekleri_pkey','haber_istekleri_tur_check','haber_istekleri_uye_fikir_id_tur_key',
    'haber_istekleri_uye_fkey','haber_istekleri_fikir'],
  hata_kayitlari: ['hata_kayitlari_durum_check','hata_kayitlari_kaynak_check','hata_kayitlari_mesaj_check','hata_kayitlari_pkey','hata_kayitlari_sayfa_check',
    'hata_kayitlari_tarayici_check','hata_kayitlari_zaman'],
  iletisim_mesajlari: ['iletisim_mesajlari_ad_check','iletisim_mesajlari_durum_check','iletisim_mesajlari_eposta_check','iletisim_mesajlari_gonderen_fkey',
    'iletisim_mesajlari_konu_check','iletisim_mesajlari_mesaj_check','iletisim_mesajlari_pkey','iletisim_mesajlari_gonderen'],
  numune_talepleri: ['numune_talepleri_ad_check','numune_talepleri_adet_check','numune_talepleri_amac_check','numune_talepleri_durum_check','numune_talepleri_eposta_check',
    'numune_talepleri_gonderen_fkey','numune_talepleri_notlar_check','numune_talepleri_pkey','numune_talepleri_sehir_check','numune_talepleri_telefon_check',
    'numune_talepleri_tur_check','numune_talepleri_vaka_id_fkey','numune_gonderen','numune_vaka'],
  profiller: ['profiller_id_fkey','profiller_kullanici_adi_check','profiller_pkey','profiller_rol_check','profiller_kullanici_adi'],
  puanlar: ['puanlar_fikir_id_fkey','puanlar_olcut_check','puanlar_pkey','puanlar_puan_check','puanlar_uye_fkey','puanlar_uye_zaman'],
  talepler: ['talepler_fikir_id_fkey','talepler_fiyat_check','talepler_pkey','talepler_uye_fkey','talepler_uye_zaman'],
  vaka_basvurulari: ['vaka_basvurulari_adet_check','vaka_basvurulari_baslik_check','vaka_basvurulari_deneme_adedi_check','vaka_basvurulari_durum_check',
    'vaka_basvurulari_eposta_check','vaka_basvurulari_firma_check','vaka_basvurulari_gonderen_fkey','vaka_basvurulari_gorsel_check','vaka_basvurulari_kisi_check',
    'vaka_basvurulari_model_check','vaka_basvurulari_notlar_check','vaka_basvurulari_odul_check','vaka_basvurulari_olcu_check','vaka_basvurulari_ozet_check',
    'vaka_basvurulari_pkey','vaka_basvurulari_sinif_check','vaka_basvurulari_stok_check','vaka_basvurulari_taban_fiyat_check','vaka_basvurulari_telefon_check',
    'vaka_basvurulari_vaka_id_fkey','vaka_basvurulari_gonderen'],
  vaka_firmalari: ['vaka_firmalari_eposta_check','vaka_firmalari_pkey','vaka_firmalari_vaka_id_fkey'],
  vaka_gecmis: ['vaka_gecmis_durum_check','vaka_gecmis_pkey','vaka_gecmis_vaka_id_fkey','vaka_gecmis_vaka'],
  vakalar: ['vakalar_adet_check','vakalar_baslik_check','vakalar_deneme_adedi_check','vakalar_durum_check','vakalar_kazanan_fk','vakalar_model_kontrol',
    'vakalar_pkey','vakalar_sure_gun_check','vakalar_taban_fiyat_check','vakalar_kazanan'],
  yasak_sozler: ['yasak_sozler_pkey','yasak_sozler_soz_check'],
  yorumlar: ['yorumlar_ad_sinir','yorumlar_fikir_id_fkey','yorumlar_metin_check','yorumlar_pkey','yorumlar_tur_check','yorumlar_uye_fkey','yorumlar_fikir','yorumlar_son','yorumlar_uye']
};
// index names (the rest are constraints)
const INDEKS = new Set(['cihaz_izleri_uye','etkinlikler_baslangic','fikir_bildirimleri_acik','fikir_bildirimleri_uye','fikirler_sahip','fikirler_vaka','fikirler_zaman',
  'haber_istekleri_fikir','hata_kayitlari_zaman','iletisim_mesajlari_gonderen','numune_gonderen','numune_vaka','profiller_kullanici_adi','puanlar_uye_zaman',
  'talepler_uye_zaman','vaka_basvurulari_gonderen','vaka_gecmis_vaka','vakalar_kazanan','yorumlar_fikir','yorumlar_son','yorumlar_uye']);
const KURALLAR = {
  etkinlikler: ['etkinlik_admin','etkinlik_oku'], fikir_bildirimleri: ['bildir_admin','bildir_ekle','bildir_kendi'],
  fikirler: ['fikirler_ekle','fikirler_gizle','fikirler_oku','fikirler_sahip_sil'], haber_istekleri: ['haber_kendi'], hata_kayitlari: ['hata_admin','hata_ekle'],
  iletisim_mesajlari: ['mesaj_admin','mesaj_ekle'], numune_talepleri: ['numune_admin','numune_ekle'], profiller: ['profiller_oku'],
  puanlar: ['puanlar_guncelle','puanlar_oku','puanlar_sil','puanlar_yaz'], talepler: ['talepler_guncelle','talepler_oku','talepler_sil'],
  vaka_basvurulari: ['basvuru_admin','basvuru_ekle','basvuru_kendi'], vaka_firmalari: ['firma_admin','firma_kendi'], vaka_gecmis: ['vaka_gecmis_admin'],
  vakalar: ['vakalar_admin','vakalar_firma_oku','vakalar_herkes_oku'], yasak_sozler: ['yasak_admin'],
  yorumlar: ['yorumlar_admin','yorumlar_guncelle','yorumlar_oku','yorumlar_sil','yorumlar_yaz']
};
const DEPO_KURALLARI = { gorsel_admin:'images_admin_all', gorsel_basvuru:'images_application_upload', gorsel_firma:'images_company_upload' };
// the short prefixes some names use instead of the table name
const ON_EK = { etkinlikler:['etkinlik'], fikir_bildirimleri:['bildir'], haber_istekleri:['haber'], hata_kayitlari:['hata'], iletisim_mesajlari:['mesaj'],
  numune_talepleri:['numune'], vaka_basvurulari:['basvuru'], vaka_firmalari:['firma'], yasak_sozler:['yasak'] };
const SOZ = { pkey:'pkey', fkey:'fkey', check:'check', key:'key', fk:'fkey', kontrol:'check', sinirlar:'limits', sinir:'limit', acik:'open', son:'recent',
  fikir:'idea_id', vaka:'case_id', admin:'admin_all', oku:'read', ekle:'insert', yaz:'insert', kendi:'own', gizle:'hide', guncelle:'update', sil:'delete',
  firma:'company', herkes:'public', model:'model' };

function cevir(t, ad){
  const [en, cols] = DB.TABLES[t];
  let kalan = null;
  for (const p of [t, ...(ON_EK[t] || [])]) if (ad === p || ad.startsWith(p + '_')){ kalan = ad.slice(p.length + 1); break; }
  if (kalan === null) throw new Error('önek yok: ' + t + ' / ' + ad);
  const parca = kalan ? kalan.split('_') : [], out = [];
  // the longest column name first (taban_fiyat, kullanici_adi, fikir_id)
  for (let i = 0; i < parca.length;){
    let bulundu = false;
    for (let j = parca.length; j > i; j--){
      const s = parca.slice(i, j).join('_');
      if (cols[s] || SOZ[s]){ out.push(cols[s] || SOZ[s]); i = j; bulundu = true; break; }
    }
    if (!bulundu) throw new Error('çevrilmedi: ' + t + ' / ' + ad + ' / ' + parca[i]);
  }
  return [en, ...out].join('_');
}

const TETIKLEYICI = {
  fikir_bildirimleri: { bildir_hiz:'idea_reports_rate_limit', bildir_zaman:'idea_reports_timestamp' },
  fikirler: { fikirler_hiz:'ideas_rate_limit', fikirler_soz:'ideas_word_filter', fikirler_zaman:'ideas_timestamp' },
  haber_istekleri: { haber_hiz:'notify_requests_rate_limit', haber_zaman:'notify_requests_timestamp' },
  hata_kayitlari: { hata_sel:'error_logs_flood_guard' },
  iletisim_mesajlari: { mesaj_hiz:'contact_messages_rate_limit', mesaj_zaman:'contact_messages_timestamp' },
  numune_talepleri: { numune_hiz:'product_requests_rate_limit', numune_zaman:'product_requests_timestamp' },
  puanlar: { puanlar_hiz:'ratings_rate_limit', puanlar_kendi:'ratings_block_own' },
  talepler: { talepler_hiz:'demands_rate_limit', talepler_kendi:'demands_block_own' },
  vaka_basvurulari: { basvuru_hiz:'case_applications_rate_limit', basvuru_zaman:'case_applications_timestamp' },
  yasak_sozler: { yasak_sade:'banned_words_normalize' },
  yorumlar: { yorumlar_hiz:'comments_rate_limit', yorumlar_soz:'comments_word_filter', yorumlar_zaman:'comments_timestamp' }
};

const q = s => /^[a-z_][a-z0-9_]*$/.test(s) && !['not','user','order'].includes(s) ? s : '"' + s + '"';
const satir = [];
const yaz = s => satir.push(s);
const tablolar = Object.keys(DB.TABLES).filter(t => !DB.VIEWS.includes(t));
yaz('-- tables and their columns');
for (const t of tablolar){
  const [en, cols] = DB.TABLES[t];
  yaz(`alter table public.${t} rename to ${en};`);
  for (const [tr, c] of Object.entries(cols)) if (tr !== c) yaz(`alter table public.${en} rename column ${q(tr)} to ${q(c)};`);
}
yaz('\n-- constraints and indexes');
for (const [t, adlar] of Object.entries(KISITLAR)){
  const en = DB.TABLES[t][0];
  for (const ad of adlar){
    const yeni = cevir(t, ad);
    if (yeni === ad) continue;
    yaz(INDEKS.has(ad) ? `alter index public.${ad} rename to ${yeni};` : `alter table public.${en} rename constraint ${ad} to ${yeni};`);
  }
}
yaz('alter sequence if exists public.hata_kayitlari_id_seq rename to error_logs_id_seq;');
yaz('alter sequence if exists public.vaka_gecmis_id_seq rename to case_history_id_seq;');
yaz('\n-- row level security policies');
for (const [t, adlar] of Object.entries(KURALLAR)){
  const en = DB.TABLES[t][0];
  for (const ad of adlar) yaz(`alter policy ${ad} on public.${en} rename to ${cevir(t, ad)};`);
}
// storage.objects belongs to Supabase's storage role: rename where this role may, else keep the name
yaz('do $$ begin');
for (const [ad, yeni] of Object.entries(DEPO_KURALLARI)) yaz(`  alter policy ${ad} on storage.objects rename to ${yeni};`);
yaz("exception when insufficient_privilege then raise notice 'storage.objects policies keep their names (owned by supabase_storage_admin)';");
yaz('end $$;');
yaz('\n-- triggers');
for (const [t, m] of Object.entries(TETIKLEYICI)){
  const en = DB.TABLES[t][0];
  for (const [ad, yeni] of Object.entries(m)) yaz(`alter trigger ${ad} on public.${en} rename to ${yeni};`);
}
process.stdout.write(satir.join('\n') + '\n');
