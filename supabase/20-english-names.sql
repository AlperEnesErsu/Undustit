-- Undustit · migration 20: English names in the database. Run after 19-davet.sql, once.
-- Someone opening the database should read it without knowing Turkish. Every table, column, view, function,
-- constraint, index, policy and trigger gets an English name; data values (status words such as 'yeni', 'acik')
-- and the error messages visitors read stay as they are. It is a single transaction: all of it or nothing.
-- The site reads the new names through assets/ud/db.js (the one name map); the rename part below is written from
-- that map by tools/db-adlar.mjs. After this, do not run migrations 1–19 again: they create the old names.
-- Deploy the Edge Functions again afterwards (firma-davet, haber-gonder): they use the new names.

-- the two views are made again under their new names at the end
drop view if exists public.fikir_kart;
drop view if exists public.fikir_ozet;

-- tables and their columns
alter table public.fikirler rename to ideas;
alter table public.ideas rename column vaka_id to case_id;
alter table public.ideas rename column sahip to owner_id;
alter table public.ideas rename column baslik to title;
alter table public.ideas rename column kategori to category;
alter table public.ideas rename column cozum to solution;
alter table public.ideas rename column ozellikler to features;
alter table public.ideas rename column ad to display_name;
alter table public.ideas rename column gizli to hidden;
alter table public.ideas rename column zaman to created_at;
alter table public.talepler rename to demands;
alter table public.demands rename column fikir_id to idea_id;
alter table public.demands rename column uye to member_id;
alter table public.demands rename column fiyat to price;
alter table public.demands rename column zaman to updated_at;
alter table public.puanlar rename to ratings;
alter table public.ratings rename column fikir_id to idea_id;
alter table public.ratings rename column uye to member_id;
alter table public.ratings rename column olcut to criterion;
alter table public.ratings rename column puan to score;
alter table public.ratings rename column zaman to updated_at;
alter table public.yorumlar rename to comments;
alter table public.comments rename column fikir_id to idea_id;
alter table public.comments rename column uye to member_id;
alter table public.comments rename column tur to kind;
alter table public.comments rename column metin to body;
alter table public.comments rename column zaman to created_at;
alter table public.comments rename column ad to display_name;
alter table public.comments rename column gizli to hidden;
alter table public.cihaz_izleri rename to device_marks;
alter table public.device_marks rename column fikir_id to idea_id;
alter table public.device_marks rename column cihaz to device;
alter table public.device_marks rename column tur to kind;
alter table public.device_marks rename column uye to member_id;
alter table public.device_marks rename column zaman to created_at;
alter table public.haber_istekleri rename to notify_requests;
alter table public.notify_requests rename column uye to member_id;
alter table public.notify_requests rename column eposta to email;
alter table public.notify_requests rename column fikir_id to idea_id;
alter table public.notify_requests rename column tur to kind;
alter table public.notify_requests rename column gonderildi to sent_at;
alter table public.notify_requests rename column zaman to created_at;
alter table public.fikir_bildirimleri rename to idea_reports;
alter table public.idea_reports rename column fikir_id to idea_id;
alter table public.idea_reports rename column uye to member_id;
alter table public.idea_reports rename column neden to reason;
alter table public.idea_reports rename column aciklama to details;
alter table public.idea_reports rename column durum to status;
alter table public.idea_reports rename column zaman to created_at;
alter table public.iletisim_mesajlari rename to contact_messages;
alter table public.contact_messages rename column gonderen to sender_id;
alter table public.contact_messages rename column ad to name;
alter table public.contact_messages rename column eposta to email;
alter table public.contact_messages rename column konu to topic;
alter table public.contact_messages rename column mesaj to message;
alter table public.contact_messages rename column durum to status;
alter table public.contact_messages rename column zaman to created_at;
alter table public.numune_talepleri rename to product_requests;
alter table public.product_requests rename column gonderen to sender_id;
alter table public.product_requests rename column vaka_id to case_id;
alter table public.product_requests rename column amac to purpose;
alter table public.product_requests rename column tur to requester_type;
alter table public.product_requests rename column ad to name;
alter table public.product_requests rename column eposta to email;
alter table public.product_requests rename column telefon to phone;
alter table public.product_requests rename column sehir to city;
alter table public.product_requests rename column adet to quantity;
alter table public.product_requests rename column notlar to notes;
alter table public.product_requests rename column durum to status;
alter table public.product_requests rename column zaman to created_at;
alter table public.hata_kayitlari rename to error_logs;
alter table public.error_logs rename column zaman to created_at;
alter table public.error_logs rename column sayfa to page;
alter table public.error_logs rename column mesaj to message;
alter table public.error_logs rename column kaynak to source;
alter table public.error_logs rename column satir to line;
alter table public.error_logs rename column tarayici to user_agent;
alter table public.error_logs rename column uye to member_id;
alter table public.error_logs rename column durum to status;
alter table public.profiller rename to profiles;
alter table public.profiles rename column rol to role;
alter table public.profiles rename column kullanici_adi to username;
alter table public.vakalar rename to cases;
alter table public.cases rename column baslik to title;
alter table public.cases rename column ozet to summary;
alter table public.cases rename column aciklama to description;
alter table public.cases rename column firma to company;
alter table public.cases rename column stok to stock;
alter table public.cases rename column adet to quantity;
alter table public.cases rename column olcu to size_spec;
alter table public.cases rename column sinif to grade;
alter table public.cases rename column taban_fiyat to floor_price;
alter table public.cases rename column deneme_adedi to trial_quantity;
alter table public.cases rename column sure_gun to duration_days;
alter table public.cases rename column gorsel to image_url;
alter table public.cases rename column durum to status;
alter table public.cases rename column acilis to opened_at;
alter table public.cases rename column kapanis to closed_at;
alter table public.cases rename column kazanan to winner_idea_id;
alter table public.cases rename column olusturan to created_by;
alter table public.cases rename column olusturma to created_at;
alter table public.cases rename column guncelleme to updated_at;
alter table public.cases rename column ortaklik to partnership;
alter table public.cases rename column odul to prize;
alter table public.vaka_basvurulari rename to case_applications;
alter table public.case_applications rename column gonderen to sender_id;
alter table public.case_applications rename column firma to company;
alter table public.case_applications rename column kisi to contact_name;
alter table public.case_applications rename column eposta to email;
alter table public.case_applications rename column telefon to phone;
alter table public.case_applications rename column stok to stock;
alter table public.case_applications rename column adet to quantity;
alter table public.case_applications rename column notlar to notes;
alter table public.case_applications rename column durum to status;
alter table public.case_applications rename column zaman to created_at;
alter table public.case_applications rename column gorsel to image_url;
alter table public.case_applications rename column olcu to size_spec;
alter table public.case_applications rename column taban_fiyat to floor_price;
alter table public.case_applications rename column model to offer_model;
alter table public.case_applications rename column vaka_id to case_id;
alter table public.case_applications rename column baslik to title;
alter table public.case_applications rename column ozet to summary;
alter table public.case_applications rename column sinif to grade;
alter table public.case_applications rename column deneme_adedi to trial_quantity;
alter table public.case_applications rename column odul to prize;
alter table public.vaka_firmalari rename to case_companies;
alter table public.case_companies rename column vaka_id to case_id;
alter table public.case_companies rename column eposta to email;
alter table public.case_companies rename column eklenme to added_at;
alter table public.case_companies rename column davet to invited_at;
alter table public.vaka_gecmis rename to case_history;
alter table public.case_history rename column vaka_id to case_id;
alter table public.case_history rename column durum to status;
alter table public.case_history rename column "not" to note;
alter table public.case_history rename column kim to actor;
alter table public.case_history rename column zaman to created_at;
alter table public.etkinlikler rename to events;
alter table public.events rename column baslik to title;
alter table public.events rename column aciklama to description;
alter table public.events rename column baslangic to starts_at;
alter table public.events rename column bitis to ends_at;
alter table public.events rename column baglanti to link;
alter table public.events rename column olusturma to created_at;
alter table public.yasak_sozler rename to banned_words;
alter table public.banned_words rename column soz to word;
alter table public.banned_words rename column tam to exact_match;
alter table public.banned_words rename column eklenme to added_at;

-- constraints and indexes
alter table public.device_marks rename constraint cihaz_izleri_cihaz_check to device_marks_device_check;
alter table public.device_marks rename constraint cihaz_izleri_fikir_id_fkey to device_marks_idea_id_fkey;
alter table public.device_marks rename constraint cihaz_izleri_pkey to device_marks_pkey;
alter table public.device_marks rename constraint cihaz_izleri_tur_check to device_marks_kind_check;
alter table public.device_marks rename constraint cihaz_izleri_uye_fkey to device_marks_member_id_fkey;
alter index public.cihaz_izleri_uye rename to device_marks_member_id;
alter table public.events rename constraint etkinlikler_aciklama_check to events_description_check;
alter table public.events rename constraint etkinlikler_baglanti_check to events_link_check;
alter table public.events rename constraint etkinlikler_baslik_check to events_title_check;
alter table public.events rename constraint etkinlikler_check to events_check;
alter table public.events rename constraint etkinlikler_pkey to events_pkey;
alter index public.etkinlikler_baslangic rename to events_starts_at;
alter table public.idea_reports rename constraint fikir_bildirimleri_aciklama_check to idea_reports_details_check;
alter table public.idea_reports rename constraint fikir_bildirimleri_durum_check to idea_reports_status_check;
alter table public.idea_reports rename constraint fikir_bildirimleri_fikir_id_fkey to idea_reports_idea_id_fkey;
alter table public.idea_reports rename constraint fikir_bildirimleri_fikir_id_uye_key to idea_reports_idea_id_member_id_key;
alter table public.idea_reports rename constraint fikir_bildirimleri_neden_check to idea_reports_reason_check;
alter table public.idea_reports rename constraint fikir_bildirimleri_pkey to idea_reports_pkey;
alter table public.idea_reports rename constraint fikir_bildirimleri_uye_fkey to idea_reports_member_id_fkey;
alter index public.fikir_bildirimleri_acik rename to idea_reports_open;
alter index public.fikir_bildirimleri_uye rename to idea_reports_member_id;
alter table public.ideas rename constraint fikirler_baslik_check to ideas_title_check;
alter table public.ideas rename constraint fikirler_pkey to ideas_pkey;
alter table public.ideas rename constraint fikirler_sahip_fkey to ideas_owner_id_fkey;
alter table public.ideas rename constraint fikirler_sinirlar to ideas_limits;
alter table public.ideas rename constraint fikirler_vaka_id_fkey to ideas_case_id_fkey;
alter index public.fikirler_sahip rename to ideas_owner_id;
alter index public.fikirler_vaka rename to ideas_case_id;
alter index public.fikirler_zaman rename to ideas_created_at;
alter table public.notify_requests rename constraint haber_istekleri_eposta_check to notify_requests_email_check;
alter table public.notify_requests rename constraint haber_istekleri_fikir_id_fkey to notify_requests_idea_id_fkey;
alter table public.notify_requests rename constraint haber_istekleri_pkey to notify_requests_pkey;
alter table public.notify_requests rename constraint haber_istekleri_tur_check to notify_requests_kind_check;
alter table public.notify_requests rename constraint haber_istekleri_uye_fikir_id_tur_key to notify_requests_member_id_idea_id_kind_key;
alter table public.notify_requests rename constraint haber_istekleri_uye_fkey to notify_requests_member_id_fkey;
alter index public.haber_istekleri_fikir rename to notify_requests_idea_id;
alter table public.error_logs rename constraint hata_kayitlari_durum_check to error_logs_status_check;
alter table public.error_logs rename constraint hata_kayitlari_kaynak_check to error_logs_source_check;
alter table public.error_logs rename constraint hata_kayitlari_mesaj_check to error_logs_message_check;
alter table public.error_logs rename constraint hata_kayitlari_pkey to error_logs_pkey;
alter table public.error_logs rename constraint hata_kayitlari_sayfa_check to error_logs_page_check;
alter table public.error_logs rename constraint hata_kayitlari_tarayici_check to error_logs_user_agent_check;
alter index public.hata_kayitlari_zaman rename to error_logs_created_at;
alter table public.contact_messages rename constraint iletisim_mesajlari_ad_check to contact_messages_name_check;
alter table public.contact_messages rename constraint iletisim_mesajlari_durum_check to contact_messages_status_check;
alter table public.contact_messages rename constraint iletisim_mesajlari_eposta_check to contact_messages_email_check;
alter table public.contact_messages rename constraint iletisim_mesajlari_gonderen_fkey to contact_messages_sender_id_fkey;
alter table public.contact_messages rename constraint iletisim_mesajlari_konu_check to contact_messages_topic_check;
alter table public.contact_messages rename constraint iletisim_mesajlari_mesaj_check to contact_messages_message_check;
alter table public.contact_messages rename constraint iletisim_mesajlari_pkey to contact_messages_pkey;
alter index public.iletisim_mesajlari_gonderen rename to contact_messages_sender_id;
alter table public.product_requests rename constraint numune_talepleri_ad_check to product_requests_name_check;
alter table public.product_requests rename constraint numune_talepleri_adet_check to product_requests_quantity_check;
alter table public.product_requests rename constraint numune_talepleri_amac_check to product_requests_purpose_check;
alter table public.product_requests rename constraint numune_talepleri_durum_check to product_requests_status_check;
alter table public.product_requests rename constraint numune_talepleri_eposta_check to product_requests_email_check;
alter table public.product_requests rename constraint numune_talepleri_gonderen_fkey to product_requests_sender_id_fkey;
alter table public.product_requests rename constraint numune_talepleri_notlar_check to product_requests_notes_check;
alter table public.product_requests rename constraint numune_talepleri_pkey to product_requests_pkey;
alter table public.product_requests rename constraint numune_talepleri_sehir_check to product_requests_city_check;
alter table public.product_requests rename constraint numune_talepleri_telefon_check to product_requests_phone_check;
alter table public.product_requests rename constraint numune_talepleri_tur_check to product_requests_requester_type_check;
alter table public.product_requests rename constraint numune_talepleri_vaka_id_fkey to product_requests_case_id_fkey;
alter index public.numune_gonderen rename to product_requests_sender_id;
alter index public.numune_vaka rename to product_requests_case_id;
alter table public.profiles rename constraint profiller_id_fkey to profiles_id_fkey;
alter table public.profiles rename constraint profiller_kullanici_adi_check to profiles_username_check;
alter table public.profiles rename constraint profiller_pkey to profiles_pkey;
alter table public.profiles rename constraint profiller_rol_check to profiles_role_check;
alter index public.profiller_kullanici_adi rename to profiles_username;
alter table public.ratings rename constraint puanlar_fikir_id_fkey to ratings_idea_id_fkey;
alter table public.ratings rename constraint puanlar_olcut_check to ratings_criterion_check;
alter table public.ratings rename constraint puanlar_pkey to ratings_pkey;
alter table public.ratings rename constraint puanlar_puan_check to ratings_score_check;
alter table public.ratings rename constraint puanlar_uye_fkey to ratings_member_id_fkey;
alter index public.puanlar_uye_zaman rename to ratings_member_id_updated_at;
alter table public.demands rename constraint talepler_fikir_id_fkey to demands_idea_id_fkey;
alter table public.demands rename constraint talepler_fiyat_check to demands_price_check;
alter table public.demands rename constraint talepler_pkey to demands_pkey;
alter table public.demands rename constraint talepler_uye_fkey to demands_member_id_fkey;
alter index public.talepler_uye_zaman rename to demands_member_id_updated_at;
alter table public.case_applications rename constraint vaka_basvurulari_adet_check to case_applications_quantity_check;
alter table public.case_applications rename constraint vaka_basvurulari_baslik_check to case_applications_title_check;
alter table public.case_applications rename constraint vaka_basvurulari_deneme_adedi_check to case_applications_trial_quantity_check;
alter table public.case_applications rename constraint vaka_basvurulari_durum_check to case_applications_status_check;
alter table public.case_applications rename constraint vaka_basvurulari_eposta_check to case_applications_email_check;
alter table public.case_applications rename constraint vaka_basvurulari_firma_check to case_applications_company_check;
alter table public.case_applications rename constraint vaka_basvurulari_gonderen_fkey to case_applications_sender_id_fkey;
alter table public.case_applications rename constraint vaka_basvurulari_gorsel_check to case_applications_image_url_check;
alter table public.case_applications rename constraint vaka_basvurulari_kisi_check to case_applications_contact_name_check;
alter table public.case_applications rename constraint vaka_basvurulari_model_check to case_applications_offer_model_check;
alter table public.case_applications rename constraint vaka_basvurulari_notlar_check to case_applications_notes_check;
alter table public.case_applications rename constraint vaka_basvurulari_odul_check to case_applications_prize_check;
alter table public.case_applications rename constraint vaka_basvurulari_olcu_check to case_applications_size_spec_check;
alter table public.case_applications rename constraint vaka_basvurulari_ozet_check to case_applications_summary_check;
alter table public.case_applications rename constraint vaka_basvurulari_pkey to case_applications_pkey;
alter table public.case_applications rename constraint vaka_basvurulari_sinif_check to case_applications_grade_check;
alter table public.case_applications rename constraint vaka_basvurulari_stok_check to case_applications_stock_check;
alter table public.case_applications rename constraint vaka_basvurulari_taban_fiyat_check to case_applications_floor_price_check;
alter table public.case_applications rename constraint vaka_basvurulari_telefon_check to case_applications_phone_check;
alter table public.case_applications rename constraint vaka_basvurulari_vaka_id_fkey to case_applications_case_id_fkey;
alter index public.vaka_basvurulari_gonderen rename to case_applications_sender_id;
alter table public.case_companies rename constraint vaka_firmalari_eposta_check to case_companies_email_check;
alter table public.case_companies rename constraint vaka_firmalari_pkey to case_companies_pkey;
alter table public.case_companies rename constraint vaka_firmalari_vaka_id_fkey to case_companies_case_id_fkey;
alter table public.case_history rename constraint vaka_gecmis_durum_check to case_history_status_check;
alter table public.case_history rename constraint vaka_gecmis_pkey to case_history_pkey;
alter table public.case_history rename constraint vaka_gecmis_vaka_id_fkey to case_history_case_id_fkey;
alter index public.vaka_gecmis_vaka rename to case_history_case_id;
alter table public.cases rename constraint vakalar_adet_check to cases_quantity_check;
alter table public.cases rename constraint vakalar_baslik_check to cases_title_check;
alter table public.cases rename constraint vakalar_deneme_adedi_check to cases_trial_quantity_check;
alter table public.cases rename constraint vakalar_durum_check to cases_status_check;
alter table public.cases rename constraint vakalar_kazanan_fk to cases_winner_idea_id_fkey;
alter table public.cases rename constraint vakalar_model_kontrol to cases_model_check;
alter table public.cases rename constraint vakalar_pkey to cases_pkey;
alter table public.cases rename constraint vakalar_sure_gun_check to cases_duration_days_check;
alter table public.cases rename constraint vakalar_taban_fiyat_check to cases_floor_price_check;
alter index public.vakalar_kazanan rename to cases_winner_idea_id;
alter table public.banned_words rename constraint yasak_sozler_pkey to banned_words_pkey;
alter table public.banned_words rename constraint yasak_sozler_soz_check to banned_words_word_check;
alter table public.comments rename constraint yorumlar_ad_sinir to comments_display_name_limit;
alter table public.comments rename constraint yorumlar_fikir_id_fkey to comments_idea_id_fkey;
alter table public.comments rename constraint yorumlar_metin_check to comments_body_check;
alter table public.comments rename constraint yorumlar_pkey to comments_pkey;
alter table public.comments rename constraint yorumlar_tur_check to comments_kind_check;
alter table public.comments rename constraint yorumlar_uye_fkey to comments_member_id_fkey;
alter index public.yorumlar_fikir rename to comments_idea_id;
alter index public.yorumlar_son rename to comments_recent;
alter index public.yorumlar_uye rename to comments_member_id;
alter sequence if exists public.hata_kayitlari_id_seq rename to error_logs_id_seq;
alter sequence if exists public.vaka_gecmis_id_seq rename to case_history_id_seq;

-- row level security policies
alter policy etkinlik_admin on public.events rename to events_admin_all;
alter policy etkinlik_oku on public.events rename to events_read;
alter policy bildir_admin on public.idea_reports rename to idea_reports_admin_all;
alter policy bildir_ekle on public.idea_reports rename to idea_reports_insert;
alter policy bildir_kendi on public.idea_reports rename to idea_reports_own;
alter policy fikirler_ekle on public.ideas rename to ideas_insert;
alter policy fikirler_gizle on public.ideas rename to ideas_hide;
alter policy fikirler_oku on public.ideas rename to ideas_read;
alter policy fikirler_sahip_sil on public.ideas rename to ideas_owner_id_delete;
alter policy haber_kendi on public.notify_requests rename to notify_requests_own;
alter policy hata_admin on public.error_logs rename to error_logs_admin_all;
alter policy hata_ekle on public.error_logs rename to error_logs_insert;
alter policy mesaj_admin on public.contact_messages rename to contact_messages_admin_all;
alter policy mesaj_ekle on public.contact_messages rename to contact_messages_insert;
alter policy numune_admin on public.product_requests rename to product_requests_admin_all;
alter policy numune_ekle on public.product_requests rename to product_requests_insert;
alter policy profiller_oku on public.profiles rename to profiles_read;
alter policy puanlar_guncelle on public.ratings rename to ratings_update;
alter policy puanlar_oku on public.ratings rename to ratings_read;
alter policy puanlar_sil on public.ratings rename to ratings_delete;
alter policy puanlar_yaz on public.ratings rename to ratings_insert;
alter policy talepler_guncelle on public.demands rename to demands_update;
alter policy talepler_oku on public.demands rename to demands_read;
alter policy talepler_sil on public.demands rename to demands_delete;
alter policy basvuru_admin on public.case_applications rename to case_applications_admin_all;
alter policy basvuru_ekle on public.case_applications rename to case_applications_insert;
alter policy basvuru_kendi on public.case_applications rename to case_applications_own;
alter policy firma_admin on public.case_companies rename to case_companies_admin_all;
alter policy firma_kendi on public.case_companies rename to case_companies_own;
alter policy vaka_gecmis_admin on public.case_history rename to case_history_admin_all;
alter policy vakalar_admin on public.cases rename to cases_admin_all;
alter policy vakalar_firma_oku on public.cases rename to cases_company_read;
alter policy vakalar_herkes_oku on public.cases rename to cases_public_read;
alter policy yasak_admin on public.banned_words rename to banned_words_admin_all;
alter policy yorumlar_admin on public.comments rename to comments_admin_all;
alter policy yorumlar_guncelle on public.comments rename to comments_update;
alter policy yorumlar_oku on public.comments rename to comments_read;
alter policy yorumlar_sil on public.comments rename to comments_delete;
alter policy yorumlar_yaz on public.comments rename to comments_insert;
do $$ begin
  alter policy gorsel_admin on storage.objects rename to images_admin_all;
  alter policy gorsel_basvuru on storage.objects rename to images_application_upload;
  alter policy gorsel_firma on storage.objects rename to images_company_upload;
exception when insufficient_privilege then raise notice 'storage.objects policies keep their names (owned by supabase_storage_admin)';
end $$;

-- triggers
alter trigger bildir_hiz on public.idea_reports rename to idea_reports_rate_limit;
alter trigger bildir_zaman on public.idea_reports rename to idea_reports_timestamp;
alter trigger fikirler_hiz on public.ideas rename to ideas_rate_limit;
alter trigger fikirler_soz on public.ideas rename to ideas_word_filter;
alter trigger fikirler_zaman on public.ideas rename to ideas_timestamp;
alter trigger haber_hiz on public.notify_requests rename to notify_requests_rate_limit;
alter trigger haber_zaman on public.notify_requests rename to notify_requests_timestamp;
alter trigger hata_sel on public.error_logs rename to error_logs_flood_guard;
alter trigger mesaj_hiz on public.contact_messages rename to contact_messages_rate_limit;
alter trigger mesaj_zaman on public.contact_messages rename to contact_messages_timestamp;
alter trigger numune_hiz on public.product_requests rename to product_requests_rate_limit;
alter trigger numune_zaman on public.product_requests rename to product_requests_timestamp;
alter trigger puanlar_hiz on public.ratings rename to ratings_rate_limit;
alter trigger puanlar_kendi on public.ratings rename to ratings_block_own;
alter trigger talepler_hiz on public.demands rename to demands_rate_limit;
alter trigger talepler_kendi on public.demands rename to demands_block_own;
alter trigger basvuru_hiz on public.case_applications rename to case_applications_rate_limit;
alter trigger basvuru_zaman on public.case_applications rename to case_applications_timestamp;
alter trigger yasak_sade on public.banned_words rename to banned_words_normalize;
alter trigger yorumlar_hiz on public.comments rename to comments_rate_limit;
alter trigger yorumlar_soz on public.comments rename to comments_word_filter;
alter trigger yorumlar_zaman on public.comments rename to comments_timestamp;

-- timestamps: ratings and demands keep the time of the last write (insert or update) in updated_at
drop trigger if exists puanlar_zaman on public.ratings;
drop trigger if exists talepler_zaman on public.demands;

-- ---------------------------------------------------------------- functions
-- A rename keeps a function's grants and the policies and triggers that point at it, but not its body (text):
-- every body is written again with the new names. Functions the site calls with named arguments are dropped and
-- created again, because an argument cannot be renamed in place.
alter function public.sunucu_zamani() rename to set_created_at;
alter function public.basvuru_hizi() rename to case_applications_rate_limit;
alter function public.bildir_hizi() rename to idea_reports_rate_limit;
alter function public.fikir_hizi() rename to ideas_rate_limit;
alter function public.haber_hizi() rename to notify_requests_rate_limit;
alter function public.mesaj_hizi() rename to contact_messages_rate_limit;
alter function public.numune_hizi() rename to product_requests_rate_limit;
alter function public.puan_hizi() rename to ratings_rate_limit;
alter function public.talep_hizi() rename to demands_rate_limit;
alter function public.yorum_hizi() rename to comments_rate_limit;
alter function public.hata_sel() rename to error_logs_flood_guard;
alter function public.fikir_sozu() rename to ideas_word_filter;
alter function public.yorum_sozu() rename to comments_word_filter;
alter function public.yasak_sade() rename to banned_words_normalize;
alter function public.kendi_oyu() rename to block_own_vote;
alter function public.profil_olustur() rename to create_profile;
alter function public.epostam() rename to my_email;
alter function public.firma_herhangi() rename to is_any_company;
alter function public.gorsel_hakki() rename to can_upload_image;
alter function public.kotu_soz(text) rename to has_banned_word;
alter function public.soz_sade(text) rename to normalize_words;

create or replace function public.set_created_at() returns trigger language plpgsql set search_path = public as $$
begin new.created_at := now(); return new; end $$;
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
create trigger ratings_timestamp before insert or update on public.ratings for each row execute function public.set_updated_at();
create trigger demands_timestamp before insert or update on public.demands for each row execute function public.set_updated_at();

create or replace function public.case_applications_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.case_applications where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Bugün için başvuru sınırına ulaştın (3).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.idea_reports_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.idea_reports where member_id = new.member_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Bugün için bildirim sınırına ulaştın (20).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.ideas_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.ideas where owner_id = new.owner_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Bugün için fikir sınırına ulaştın (10).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.notify_requests_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.notify_requests where member_id = new.member_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Bugün için haber isteği sınırına ulaştın (30).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.contact_messages_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.contact_messages where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Bugün için mesaj sınırına ulaştın (5).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.product_requests_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.product_requests where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Bugün için talep sınırına ulaştın (5).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.ratings_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.ratings where idea_id = new.idea_id and member_id = new.member_id and criterion = new.criterion) then
    return new;   -- an upsert that only changes an existing score
  end if;
  if (select count(*) from public.ratings where member_id = new.member_id and updated_at > now() - interval '1 day') >= 150 then
    raise exception 'Bugün için puanlama sınırına ulaştın (150).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.demands_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.demands where idea_id = new.idea_id and member_id = new.member_id) then
    return new;   -- changing the price you already wrote
  end if;
  if (select count(*) from public.demands where member_id = new.member_id and updated_at > now() - interval '1 day') >= 100 then
    raise exception 'Bugün için talep sınırına ulaştın (100).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.comments_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comments where member_id = new.member_id and created_at > now() - interval '1 day') >= 60 then
    raise exception 'Bugün için yorum sınırına ulaştın (60).' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.error_logs_flood_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.error_logs where created_at > now() - interval '10 minutes') >= 300 then return null; end if;
  new.created_at := now();
  return new;
end $$;

create or replace function public.normalize_words(t text) returns text language sql immutable set search_path = public as $$
  select regexp_replace(
    translate(lower(translate(coalesce(t, ''), 'ÇĞİIÖŞÜ', 'cgiıosu')), 'çğöşüâîû@$01345', 'cgosuaiuasoieas'),
    '(.)\1+', '\1', 'g');
$$;
create or replace function public.has_banned_word(t text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from regexp_split_to_table(public.normalize_words(t), '[^a-zı]+') as w
    join public.banned_words b on (b.exact_match and w = b.word) or (not b.exact_match and w like b.word || '%')
    where w <> '');
$$;
create or replace function public.ideas_word_filter() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_banned_word(concat_ws(' ', new.title, new.category, new.problem, new.solution, new.display_name, array_to_string(new.features, ' '))) then
    new.hidden := true;
  end if;
  return new;
end $$;
create or replace function public.comments_word_filter() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() then new.hidden := old.hidden; end if;
  if (tg_op = 'INSERT' or new.body is distinct from old.body or new.display_name is distinct from old.display_name)
     and public.has_banned_word(concat_ws(' ', new.body, new.display_name)) then
    new.hidden := true;
  end if;
  return new;
end $$;
create or replace function public.banned_words_normalize() returns trigger language plpgsql set search_path = public as $$
begin new.word := public.normalize_words(btrim(new.word)); return new; end $$;
create or replace function public.block_own_vote() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.ideas where id = new.idea_id and owner_id = new.member_id) then
    raise exception 'Kendi fikrine alırdım diyemez, puan veremezsin.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.my_email() returns text language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid()
$$;
create or replace function public.is_any_company() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.case_companies where email = public.my_email())
$$;

-- is the signed-in person a company of this case (policy cases_company_read)
create or replace function public.is_case_company(p_case_id text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.case_companies where case_id = p_case_id and email = public.my_email())
$$;
alter policy cases_company_read on public.cases using (public.is_case_company(id));
drop function public.firma_mi(text);

-- "alırdım": the only way a demand is written (the table takes no plain insert, 18-talep-kilidi.sql)
drop function public.alirdim(uuid, integer, text);
create function public.place_demand(p_idea_id uuid, p_price integer, p_device text) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d text := case when p_device ~ '^[a-z0-9]{16,40}$' then p_device end;
begin
  if me is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  if not exists (select 1 from public.demands t where t.idea_id = p_idea_id and t.member_id = me) then
    if d is null then
      raise exception 'Tarayıcı kimliği eksik; sayfayı yenileyip tekrar dene.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.device_marks m where m.idea_id = p_idea_id and m.device = d and m.kind = 'sahip' and m.member_id is distinct from me) then
      raise exception 'Bu fikir bu cihazdan yazıldı; kendi fikrine alırdım diyemezsin.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.device_marks m join public.demands t on t.idea_id = m.idea_id and t.member_id = m.member_id
               where m.idea_id = p_idea_id and m.device = d and m.kind = 'talep' and m.member_id is distinct from me) then
      raise exception 'Bu cihazdan bu fikre zaten alırdım dendi.' using errcode = 'P0001';
    end if;
  end if;
  insert into public.demands (idea_id, member_id, price) values (p_idea_id, me, p_price)
    on conflict (idea_id, member_id) do update set price = excluded.price;
  if d is not null then
    insert into public.device_marks (idea_id, device, kind, member_id) values (p_idea_id, d, 'talep', me)
      on conflict on constraint device_marks_pkey do update set member_id = excluded.member_id, created_at = now();
  end if;
end $$;
revoke all on function public.place_demand(uuid, integer, text) from public, anon;
grant execute on function public.place_demand(uuid, integer, text) to authenticated;

-- which browser wrote an idea (17-oy.sql)
drop function public.fikir_cihazi(uuid, text);
create function public.mark_idea_device(p_idea_id uuid, p_device text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_device is null or p_device !~ '^[a-z0-9]{16,40}$' then return; end if;
  if not exists (select 1 from public.ideas where id = p_idea_id and owner_id = auth.uid()) then return; end if;
  insert into public.device_marks (idea_id, device, kind, member_id) values (p_idea_id, p_device, 'sahip', auth.uid())
    on conflict on constraint device_marks_pkey do nothing;
end $$;
revoke all on function public.mark_idea_device(uuid, text) from public, anon;
grant execute on function public.mark_idea_device(uuid, text) to authenticated;

-- the only thing a company changes: its case's product photo (7-firma.sql)
drop function public.firma_gorsel(text, text);
create function public.set_case_image(p_case_id text, p_url text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_case_company(p_case_id) then raise exception 'Bu vaka için yetkin yok' using errcode = '42501'; end if;
  if coalesce(p_url, '') <> '' and (p_url !~ '^https://' or char_length(p_url) > 500) then
    raise exception 'Görsel adresi https ile başlamalı' using errcode = '22023';
  end if;
  update public.cases set image_url = coalesce(p_url, ''), updated_at = now() where id = p_case_id;
end $$;
revoke all on function public.set_case_image(text, text) from public, anon;
grant execute on function public.set_case_image(text, text) to authenticated;

-- which address signs in for an admin's username (16-kullanici-adi.sql)
drop function public.giris_eposta(text);
create function public.sign_in_email(p_username text) returns text language sql stable security definer set search_path = public as $$
  select u.email::text from public.profiles p join auth.users u on u.id = p.id
  where p.username = lower(btrim(p_username)) and p.role = 'admin'
$$;
revoke all on function public.sign_in_email(text) from public;
grant execute on function public.sign_in_email(text) to anon, authenticated;

drop function public.kullanici_adi_koy(text);
create function public.set_username(p_username text) returns text language plpgsql security definer set search_path = public as $$
declare v text := nullif(lower(btrim(coalesce(p_username, ''))), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Kullanıcı adı yalnız yönetici hesapları için' using errcode = '42501';
  end if;
  if v is not null and v !~ '^[a-z0-9_.]{3,24}$' then
    raise exception 'Kullanıcı adı 3–24 karakter olmalı: harf, rakam, nokta, alt çizgi' using errcode = '22023';
  end if;
  begin
    update public.profiles set username = v where id = auth.uid();
  exception when unique_violation then
    raise exception 'Bu kullanıcı adı alınmış' using errcode = '23505';
  end;
  return v;
end $$;
revoke all on function public.set_username(text) from public, anon;
grant execute on function public.set_username(text) to authenticated;

-- every column of a case for the admin, and for its company (8-gizli.sql)
drop function public.vaka_tam(text);
create function public.cases_full(p_case_id text default null) returns setof public.cases language sql stable security definer set search_path = public as $$
  select * from public.cases
  where (p_case_id is null or id = p_case_id) and (public.is_admin() or public.is_case_company(id))
  order by created_at desc
$$;
revoke all on function public.cases_full(text) from public, anon;
grant execute on function public.cases_full(text) to authenticated;

-- the sign-up trigger on auth.users belongs to Supabase's auth role; rename it where this role may
do $$ begin
  alter trigger auth_kullanici_profil on auth.users rename to on_auth_user_created_profile;
exception when insufficient_privilege then
  raise notice 'auth.users trigger keeps its name (owned by supabase_auth_admin); it calls public.create_profile()';
end $$;

-- ---------------------------------------------------------------- views
create view public.idea_cards with (security_invoker = true) as
  select i.id, i.owner_id, i.case_id, i.title, i.category, i.problem, i.solution, i.features, i.display_name, i.created_at,
    coalesce(d.buyers, 0) as buyers, coalesce(d.avg_price, 0) as avg_price,
    coalesce(r.raters, 0) as raters, coalesce(r.d, 0) as score_d, coalesce(r.m, 0) as score_m, coalesce(r.u, 0) as score_u,
    coalesce(c.n, 0) as comments
  from public.ideas i
  left join lateral (select count(*) as buyers, round(avg(price), 2) as avg_price from public.demands where idea_id = i.id) d on true
  left join lateral (select count(distinct member_id) as raters,
      round(avg(score) filter (where criterion = 'd'), 2) as d,
      round(avg(score) filter (where criterion = 'm'), 2) as m,
      round(avg(score) filter (where criterion = 'u'), 2) as u
    from public.ratings where idea_id = i.id) r on true
  left join lateral (select count(*) as n from public.comments where idea_id = i.id) c on true
  where not i.hidden;
create view public.idea_summary with (security_invoker = true) as
  select i.id as idea_id, i.case_id, count(d.member_id) as buyers, coalesce(round(avg(d.price), 2), 0) as avg_price,
    (select count(*) from public.comments c where c.idea_id = i.id) as comments
  from public.ideas i left join public.demands d on d.idea_id = i.id
  group by i.id, i.case_id;
revoke all on public.idea_cards, public.idea_summary from anon, authenticated;
grant select on public.idea_cards, public.idea_summary to anon, authenticated;

-- ---------------------------------------------------------------- what each table is
comment on table public.ideas is 'Product ideas visitors write. hidden: kept from everyone but the owner and admins (moderation).';
comment on table public.demands is '"I''d buy" (alırdım): one price per member per idea, written only through place_demand().';
comment on table public.ratings is 'Scores 1–5 per member, idea and criterion (d, m, u).';
comment on table public.comments is 'Comments on ideas. kind: yorum (comment), oneri (suggestion), endise (concern).';
comment on table public.device_marks is 'A random browser id per idea (kind sahip: wrote it, talep: said "I''d buy"), so one browser counts once.';
comment on table public.notify_requests is 'E-mail addresses asking to hear about an idea. kind fikrim: first demand on my idea; alirdim: pre-sale starts.';
comment on table public.idea_reports is 'Reports of an idea by visitors, for the moderation queue.';
comment on table public.contact_messages is 'Messages from the contact page.';
comment on table public.product_requests is 'Requests to see or sample a case''s product (bireysel: person, firma: company).';
comment on table public.error_logs is 'Uncaught browser errors the site reported.';
comment on table public.profiles is 'One row per account: role (admin or uye, member) and an optional admin username.';
comment on table public.cases is 'Factory cases: surplus stock a company offers for new product ideas.';
comment on table public.case_applications is 'Companies applying to open a case.';
comment on table public.case_companies is 'Company e-mails that may see a case in the company panel. invited_at: when the sign-in e-mail last went out.';
comment on table public.case_history is 'Status changes of a case, with the admin''s note.';
comment on table public.events is 'Live events (Thursday streams) shown on the site.';
comment on table public.banned_words is 'Words that hide an idea or comment automatically. exact_match false: matches as a prefix.';
comment on view public.idea_cards is 'One row per visible idea with its demand, score and comment totals (what the idea lists read).';
comment on view public.idea_summary is 'Demand and comment totals per idea, for the admin panel.';

-- ---------------------------------------------------------------- check
-- no function body may still name an old table or column
do $$
declare bad text;
begin
  select string_agg(p.proname, ', ') into bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prosrc ~ '\m(fikirler|talepler|puanlar|yorumlar|cihaz_izleri|haber_istekleri|fikir_bildirimleri|iletisim_mesajlari|numune_talepleri|hata_kayitlari|profiller|vakalar|vaka_basvurulari|vaka_firmalari|vaka_gecmis|etkinlikler|yasak_sozler|fikir_id|vaka_id|uye|gizli|zaman|baslik|kotu_soz|soz_sade|epostam|firma_mi)\M';
  if bad is not null then raise exception 'old names left in: %', bad; end if;
end $$;
