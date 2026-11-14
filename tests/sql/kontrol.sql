-- Checks for supabase/*.sql: run after the migrations (tests/sql/calistir.sh). Every block raises an
-- error when a rule does not hold, so psql -v ON_ERROR_STOP=1 fails the run. Users: A writes, B and C visit,
-- D is an admin. Supabase grants table rights to these roles itself; plain Postgres needs it here, and the
-- column rights of 8-gizli.sql are applied again on top of that blanket grant.
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
\i supabase/8-gizli.sql
\i supabase/10-hata.sql
\i supabase/12-vaka-modeli.sql

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
update public.profiller set rol = 'admin' where id = '00000000-0000-0000-0000-00000000000d';

insert into public.fikirler (id, sahip, vaka_id, baslik, kategori) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'vaka-01', 'Cıvatalı bahçe çit direği bağlantısı', 'Vaka 01 · Cıvata'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-00000000000a', null, 'Gizlenmiş bir deneme fikri burada', 'Mutfak');
update public.fikirler set gizli = true where id = '22222222-2222-2222-2222-222222222222';
insert into public.talepler (fikir_id, uye, fiyat) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 200),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000c', 300);
insert into public.puanlar (fikir_id, uye, olcut, puan) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'd', 4),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000c', 'd', 2);
insert into public.yorumlar (fikir_id, uye, metin) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000c', 'Güzel fikir');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

-- fikir_kart: one row per visible idea, totals computed in the database
do $$ declare r record; begin
  select * into r from public.fikir_kart;
  if (select count(*) from public.fikir_kart) <> 1 then raise exception 'fikir_kart gizli fikri gösteriyor'; end if;
  if r.alici <> 2 or r.ort_fiyat <> 250 or r.puanci <> 2 or r.puan_d <> 3 or r.yorum <> 1 then
    raise exception 'fikir_kart toplamları yanlış: %', row_to_json(r); end if;
end $$;

-- a visitor can apply, message and report, but reads none of it back (only their own report)
insert into public.vaka_basvurulari (firma, eposta, stok) values ('Örnek Metal', 'b@example.com', 'paslanmaz menteşe');
insert into public.iletisim_mesajlari (eposta, mesaj) values ('b@example.com', 'Merhaba, görüşmek isteriz.');
insert into public.haber_istekleri (eposta, fikir_id, tur) values ('b@example.com', '11111111-1111-1111-1111-111111111111', 'alirdim');
insert into public.fikir_bildirimleri (fikir_id, neden) values ('11111111-1111-1111-1111-111111111111', 'kopya');
do $$ begin
  if (select count(*) from public.vaka_basvurulari) <> 0 then raise exception 'ziyaretçi başvuruları okuyabiliyor'; end if;
  if (select count(*) from public.iletisim_mesajlari) <> 0 then raise exception 'ziyaretçi mesajları okuyabiliyor'; end if;
  if (select count(*) from public.haber_istekleri) <> 1 then raise exception 'kişi kendi haber isteğini göremiyor'; end if;
  if (select count(*) from public.fikir_bildirimleri) <> 1 then raise exception 'kişi kendi bildirimini göremiyor'; end if;
end $$;

-- one report per person per idea
do $$ begin
  insert into public.fikir_bildirimleri (fikir_id, neden) values ('11111111-1111-1111-1111-111111111111', 'spam');
  raise exception 'aynı fikir ikinci kez bildirildi';
exception when unique_violation then null; end $$;

-- another visitor sees none of B's e-mail addresses or reports, and cannot act in B's name
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.haber_istekleri) <> 0 then raise exception 'başkasının e-postası görünüyor'; end if;
  if (select count(*) from public.fikir_bildirimleri) <> 0 then raise exception 'başkasının bildirimi görünüyor'; end if;
end $$;
do $$ begin
  insert into public.vaka_basvurulari (gonderen, firma, eposta, stok) values ('00000000-0000-0000-0000-00000000000b', 'Sahte', 'x@example.com', 'xxxx');
  raise exception 'başkası adına başvuru yapılabildi';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.haber_istekleri (eposta, fikir_id, tur) values ('olmaz', '11111111-1111-1111-1111-111111111111', 'fikrim');
  raise exception 'geçersiz e-posta kabul edildi';
exception when check_violation then null; end $$;

-- daily caps: the fourth application of the day is refused
insert into public.vaka_basvurulari (firma, eposta, stok) values ('A1', 'c@example.com', 'stok bir');
insert into public.vaka_basvurulari (firma, eposta, stok) values ('A2', 'c@example.com', 'stok iki');
insert into public.vaka_basvurulari (firma, eposta, stok) values ('A3', 'c@example.com', 'stok üç');
do $$ begin
  insert into public.vaka_basvurulari (firma, eposta, stok) values ('A4', 'c@example.com', 'stok dört');
  raise exception 'günlük başvuru limiti çalışmadı';
exception when raise_exception then
  if sqlerrm not like '%sınır%' then raise; end if;
end $$;

-- changing a price you already gave is not a new demand; the daily cap counts only new rows
insert into public.talepler (fikir_id, uye, fiyat) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000c', 350)
  on conflict (fikir_id, uye) do update set fiyat = excluded.fiyat;

-- photos: a visitor stores only in basvuru/<own id>/, five a day; only the admin stores case photos
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into storage.objects (bucket_id, name) select 'gorseller', 'basvuru/00000000-0000-0000-0000-00000000000c/' || n || '.jpg' from generate_series(1, 5) n;
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('gorseller', 'basvuru/00000000-0000-0000-0000-00000000000c/6.jpg');
    raise exception 'günlük görsel sınırı çalışmıyor';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('gorseller', 'basvuru/00000000-0000-0000-0000-00000000000b/x.jpg');
    raise exception 'ziyaretçi başkasının klasörüne görsel koyabiliyor';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('gorseller', 'vaka/00000000-0000-0000-0000-00000000000c/x.jpg');
    raise exception 'ziyaretçi vaka görseli yükleyebiliyor';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  insert into public.vaka_basvurulari (firma, eposta, stok, gorsel) values ('Görselli', 'g@example.com', 'stok', 'javascript:alert(1)');
  raise exception 'başvuruya https olmayan görsel adresi girilebiliyor';
exception when check_violation then null; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into storage.objects (bucket_id, name) values ('gorseller', 'vaka/00000000-0000-0000-0000-00000000000d/v.jpg');

-- the admin reads everything and can hide an idea; then visitors no longer see it
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if (select count(*) from public.vaka_basvurulari) <> 4 then raise exception 'yönetici başvuruları göremiyor'; end if;
  if (select count(*) from public.iletisim_mesajlari) <> 1 then raise exception 'yönetici mesajları göremiyor'; end if;
  if (select count(*) from public.fikir_bildirimleri) <> 1 then raise exception 'yönetici bildirimleri göremiyor'; end if;
end $$;
update public.fikirler set gizli = true where id = '11111111-1111-1111-1111-111111111111';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.fikir_kart) <> 0 then raise exception 'gizlenen fikir hâlâ görünüyor'; end if;
end $$;
reset role;

-- the company panel: A's account carries a company e-mail the admin added to a draft case. A reads that draft and
-- sets its photo (https only, through firma_gorsel); B reads neither; nobody else's case is touched.
update auth.users set email = 'Satis@Firma.example' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.vakalar (id, baslik, adet, durum) values ('vaka-taslak', 'Taslak bir vaka', 100, 'taslak');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    insert into public.vaka_firmalari (vaka_id, eposta) values ('vaka-taslak', 'satis@firma.example');
    raise exception 'ziyaretçi firma erişimi ekleyebiliyor';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into public.vaka_firmalari (vaka_id, eposta) values ('vaka-taslak', 'satis@firma.example');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if (select count(*) from public.vakalar where id = 'vaka-taslak') <> 1 then raise exception 'firma kendi taslak vakasını göremiyor'; end if;
  if (select count(*) from public.vaka_firmalari) <> 1 then raise exception 'firma kendi erişim satırını göremiyor'; end if;
  perform public.firma_gorsel('vaka-taslak', 'https://ornek.example/foto.jpg');
  if (select gorsel from public.vakalar where id = 'vaka-taslak') <> 'https://ornek.example/foto.jpg' then raise exception 'firma görseli kaydedilmedi'; end if;
  begin
    perform public.firma_gorsel('vaka-taslak', 'javascript:alert(1)');
    raise exception 'firma https olmayan görsel girebiliyor';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.firma_gorsel('vaka-01', 'https://ornek.example/baska.jpg');
    raise exception 'firma başka vakanın görselini değiştirebiliyor';
  exception when insufficient_privilege then null; end;
  update public.vakalar set baslik = 'Değişti' where id = 'vaka-taslak';
  if (select baslik from public.vakalar where id = 'vaka-taslak') <> 'Taslak bir vaka' then raise exception 'firma vakayı doğrudan değiştirebiliyor'; end if;
  insert into storage.objects (bucket_id, name) values ('gorseller', 'vaka/00000000-0000-0000-0000-00000000000a/f.jpg');
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.vakalar where id = 'vaka-taslak') <> 0 then raise exception 'başkası taslak vakayı görüyor'; end if;
  if (select count(*) from public.vaka_firmalari) <> 0 then raise exception 'başkası firma e-postalarını görüyor'; end if;
  begin
    perform public.firma_gorsel('vaka-taslak', 'https://ornek.example/kotu.jpg');
    raise exception 'firma olmayan görsel değiştirebiliyor';
  exception when insufficient_privilege then null; end;
end $$;

-- private columns: visitors read the public ones but never the floor price, the company or the creator;
-- vaka_tam() gives the full row to the admin (every case) and to the company (its own case only)
do $$ begin
  if (select baslik from public.vakalar where id = 'vaka-01') is null then raise exception 'ziyaretçi açık sütunları okuyamıyor'; end if;
  if (select count(*) from public.vaka_tam()) <> 0 then raise exception 'ziyaretçi vaka_tam ile tam satır alıyor'; end if;
  begin
    perform taban_fiyat from public.vakalar where id = 'vaka-01';
    raise exception 'ziyaretçi taban fiyatı okuyabiliyor';
  exception when insufficient_privilege then null; end;
  begin
    perform olusturan from public.vakalar;
    raise exception 'ziyaretçi vakayı açanın e-postasını okuyabiliyor';
  exception when insufficient_privilege then null; end;
end $$;
set role anon;
reset request.jwt.claim.sub;
do $$ begin
  if (select count(*) from public.vakalar where id = 'vaka-01') <> 1 then raise exception 'oturumsuz ziyaretçi vakayı göremiyor'; end if;
  begin
    perform firma from public.vakalar;
    raise exception 'oturumsuz ziyaretçi firma adını okuyabiliyor';
  exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if (select count(*) from public.vaka_tam()) <> 1 or (select id from public.vaka_tam()) <> 'vaka-taslak' then raise exception 'firma yalnız kendi vakasının tam satırını almalı'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if (select count(*) from public.vaka_tam()) < 2 then raise exception 'yönetici bütün vakaları tam okuyamıyor'; end if;
  if (select taban_fiyat from public.vaka_tam('vaka-01')) is null then raise exception 'yönetici taban fiyatı göremiyor'; end if;
end $$;
update public.vakalar set taban_fiyat = 3 where id = 'vaka-01';
do $$ begin
  if (select taban_fiyat from public.vaka_tam('vaka-01')) <> 3 then raise exception 'yönetici taban fiyatı değiştiremiyor'; end if;
end $$;
reset role;
-- error log: anyone writes (a visitor without a session too), only the admin reads; nobody sets the state
reset role;
set role anon;
reset request.jwt.claim.sub;
insert into public.hata_kayitlari (sayfa, mesaj) values ('/fikirler/', 'TypeError: x is undefined');
do $$ begin
  begin
    perform 1 from public.hata_kayitlari;
    raise exception 'ziyaretçi hata kayıtlarını okuyabiliyor';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.hata_kayitlari (mesaj, durum) values ('x', 'cozuldu');
    raise exception 'ziyaretçi hata durumunu belirleyebiliyor';
  exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.hata_kayitlari) <> 0 then raise exception 'üye hata kayıtlarını görüyor'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if (select count(*) from public.hata_kayitlari) <> 1 then raise exception 'yönetici hata kayıtlarını göremiyor'; end if;
end $$;
update public.hata_kayitlari set durum = 'cozuldu';
do $$ begin
  if (select durum from public.hata_kayitlari limit 1) <> 'cozuldu' then raise exception 'yönetici hatayı çözüldü yapamıyor'; end if;
end $$;
reset role;
-- events: everyone reads, only the admin writes, links are https or nothing
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into public.etkinlikler (baslik, baslangic) values ('Ekim değerlendirmesi', now() + interval '3 days');
do $$ begin
  begin
    insert into public.etkinlikler (baslik, baslangic, baglanti) values ('Kötü', now(), 'javascript:alert(1)');
    raise exception 'etkinliğe https olmayan bağlantı girilebiliyor';
  exception when check_violation then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.etkinlikler) <> 1 then raise exception 'üye etkinliği göremiyor'; end if;
  begin
    insert into public.etkinlikler (baslik, baslangic) values ('Sahte', now());
    raise exception 'üye etkinlik ekleyebiliyor';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- case model: a partnership, an idea prize or both, never neither; both are public, the floor price still is not
do $$ begin
  begin
    update public.vakalar set ortaklik = false, odul = 0 where id = 'vaka-01';
    raise exception 'ne ortaklık ne ödül sunan vaka kaydedilebiliyor';
  exception when check_violation then null; end;
end $$;
update public.vakalar set ortaklik = false, odul = 25000 where id = 'vaka-01';
set role anon;
reset request.jwt.claim.sub;
do $$ begin
  if (select odul from public.vakalar where id = 'vaka-01') <> 25000 then raise exception 'ziyaretçi fikir ödülünü göremiyor'; end if;
  begin
    perform taban_fiyat from public.vakalar;
    raise exception 'taban fiyat yeniden açığa çıktı';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- moderation (13-moderasyon.sql): a listed word saves the idea or comment hidden; the writer and the admin still
-- see it, nobody else does; only the admin changes "hidden"; everyday words that merely look close pass
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.fikirler (id, sahip, baslik, kategori) values
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-00000000000b', 'Bu ürün tam bir SİİKTİR git ürünü', 'Mutfak'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-00000000000b', 'Sıkıştırmalı klasik fizik seti, sıkı ambalaj', 'Çocuk');

insert into public.yorumlar (id, fikir_id, uye, metin) values
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'siz 0r0spular ne anlarsınız'),
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'Bence fiyatı biraz yüksek');
do $$ begin
  if not (select gizli from public.fikirler where id = '33333333-3333-3333-3333-333333333333') then raise exception 'küfürlü fikir gizlenmedi (ya da yazarı göremiyor)'; end if;
  if (select count(*) from public.fikir_kart where id = '33333333-3333-3333-3333-333333333333') <> 0 then raise exception 'gizli fikir yazarının listesinde görünüyor'; end if;
  if (select gizli from public.fikirler where id = '44444444-4444-4444-4444-444444444444') then raise exception 'temiz fikir gizlendi'; end if;
  if not (select gizli from public.yorumlar where id = '66666666-6666-6666-6666-666666666666') then raise exception 'küfürlü yorum gizlenmedi'; end if;
  if (select gizli from public.yorumlar where id = '77777777-7777-7777-7777-777777777777') then raise exception 'temiz yorum gizlendi'; end if;
  -- the writer cannot unhide their own comment, and editing a clean one into a bad one hides it
  update public.yorumlar set gizli = false where id = '66666666-6666-6666-6666-666666666666';
  if not (select gizli from public.yorumlar where id = '66666666-6666-6666-6666-666666666666') then raise exception 'yazar kendi yorumunu açabildi'; end if;
  update public.yorumlar set metin = 'amk böyle fiyat mı olur' where id = '77777777-7777-7777-7777-777777777777';
  if not (select gizli from public.yorumlar where id = '77777777-7777-7777-7777-777777777777') then raise exception 'düzenlenen yorum yeniden denetlenmedi'; end if;
  if (select count(*) from public.yasak_sozler) <> 0 then raise exception 'üye yasak söz listesini okuyabiliyor'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.fikirler where id = '33333333-3333-3333-3333-333333333333') <> 0 then raise exception 'gizli fikir başkasına görünüyor'; end if;
  if (select count(*) from public.fikir_kart where id = '33333333-3333-3333-3333-333333333333') <> 0 then raise exception 'gizli fikir listede görünüyor'; end if;
  if (select count(*) from public.yorumlar where id in ('66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777')) <> 0 then raise exception 'gizli yorum başkasına görünüyor'; end if;
  if (select yorum from public.fikir_kart where id = '11111111-1111-1111-1111-111111111111') <> 1 then raise exception 'gizli yorumlar sayılıyor'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if (select count(*) from public.yorumlar where gizli) <> 2 then raise exception 'yönetici gizli yorumları göremiyor'; end if;
  if (select count(*) from public.fikir_kart where id in ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')) <> 0 then raise exception 'gizli fikir yöneticinin site listesinde görünüyor'; end if;
  if (select count(*) from public.fikirler where gizli and id in ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')) <> 2 then raise exception 'yönetici gizli fikirleri yönetimde göremiyor'; end if;
  update public.yorumlar set gizli = false where id = '66666666-6666-6666-6666-666666666666';
  if (select gizli from public.yorumlar where id = '66666666-6666-6666-6666-666666666666') then raise exception 'yönetici yorumu açamadı'; end if;
  insert into public.yasak_sozler (soz) values ('  ÇÖPLÜK ');
  if (select count(*) from public.yasak_sozler where soz = 'copluk') <> 1 then raise exception 'yeni söz sade biçime çevrilmedi'; end if;
end $$;
reset role;
reset request.jwt.claim.sub;
-- product requests (14-numune.sql): a visitor leaves one and reads none back; only the admin sees and updates them
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.numune_talepleri (vaka_id, amac, ad, eposta) values ('vaka-01', 'satin', 'Deneme Kişi', 'b@example.com');
do $$ begin
  if (select count(*) from public.numune_talepleri) <> 0 then raise exception 'ziyaretçi ürün taleplerini okuyabiliyor'; end if;
  begin
    insert into public.numune_talepleri (vaka_id, ad, eposta, durum) values ('vaka-01', 'Deneme Kişi', 'b@example.com', 'gonderildi');
    raise exception 'ziyaretçi talebin durumunu kendi belirleyebiliyor';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if (select count(*) from public.numune_talepleri where amac = 'satin') <> 1 then raise exception 'yönetici ürün talebini göremiyor'; end if;
  update public.numune_talepleri set durum = 'arandi';
end $$;
reset role;
reset request.jwt.claim.sub;
-- applications (15-basvuru.sql): the new answers are stored; whoever signs in with the application's e-mail
-- reads its status, nobody else does; a visitor cannot mark their own application accepted
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'Satis@Firma.test') on conflict (id) do nothing;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.vaka_basvurulari (firma, eposta, stok, olcu, taban_fiyat, model, baslik, ozet, sinif, deneme_adedi, odul)
  values ('Firma A.Ş.', 'satis@firma.test', 'paslanmaz menteşe', '40 × 40 mm', 'adedi 2 ₺', 'ikisi', 'Kırk bin menteşe', 'Depoda bekliyor.', 'A kalite', '1.000', '25.000');
do $$ begin
  begin
    insert into public.vaka_basvurulari (firma, eposta, stok, durum) values ('Firma A.Ş.', 'satis@firma.test', 'paslanmaz menteşe', 'kabul');
    raise exception 'ziyaretçi başvurusunu kabul edilmiş olarak yazabiliyor';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  if (select count(*) from public.vaka_basvurulari where model = 'ikisi' and durum = 'yeni') <> 1 then raise exception 'firma kendi başvurusunu göremiyor'; end if;
  if (select count(*) from public.vaka_basvurulari) <> 1 then raise exception 'firma başkasının başvurusunu görüyor'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  if (select count(*) from public.vaka_basvurulari) <> 0 then raise exception 'başka ziyaretçi başvuruları okuyabiliyor'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
update public.vaka_basvurulari set durum = 'kabul', vaka_id = 'vaka-01' where model = 'ikisi';
reset role;
reset request.jwt.claim.sub;
-- usernames (16-kullanici-adi.sql): an admin sets one and it resolves to the admin's address for sign-in;
-- a member can neither set one nor be looked up
update auth.users set email = 'yonetici@example.com' where id = '00000000-0000-0000-0000-00000000000d';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  if public.kullanici_adi_koy('  Yonetici.1 ') <> 'yonetici.1' then raise exception 'kullanıcı adı sade biçime çevrilmedi'; end if;
  begin
    perform public.kullanici_adi_koy('a b');
    raise exception 'geçersiz kullanıcı adı kabul edildi';
  exception when invalid_parameter_value then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform public.kullanici_adi_koy('uye');
    raise exception 'üye kullanıcı adı alabildi';
  exception when insufficient_privilege then null; end;
end $$;
set role anon;
reset request.jwt.claim.sub;
do $$ begin
  if public.giris_eposta('YONETICI.1') is distinct from 'yonetici@example.com' then raise exception 'kullanıcı adı yöneticinin adresine çözülmedi'; end if;
  if public.giris_eposta('yok') is not null then raise exception 'olmayan kullanıcı adı bir adres döndürdü'; end if;
end $$;
reset role;
update public.profiller set kullanici_adi = 'uye.b' where id = '00000000-0000-0000-0000-00000000000b';
set role anon;
do $$ begin
  if public.giris_eposta('uye.b') is not null then raise exception 'üyenin adresi kullanıcı adından öğrenilebiliyor'; end if;
end $$;
reset role;
-- fair demand (17-oy.sql): nobody votes for or scores their own idea; one browser counts once per idea; the browser
-- an idea was written on cannot vote for it under another identity; nobody reads the device table
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000f') on conflict (id) do nothing;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  begin
    insert into public.talepler (fikir_id, uye, fiyat) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 500);
    raise exception 'kişi kendi fikrine alırdım diyebildi';
  exception when raise_exception then if sqlerrm not like 'Kendi fikrine%' then raise; end if; end;
  begin
    insert into public.puanlar (fikir_id, uye, olcut, puan) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'd', 5);
    raise exception 'kişi kendi fikrine puan verebildi';
  exception when raise_exception then if sqlerrm not like 'Kendi fikrine%' then raise; end if; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.alirdim('11111111-1111-1111-1111-111111111111', 220, 'bbbbbbbbbbbbbbbb01');   -- B already said so: a new price, and the browser is noted
select public.fikir_cihazi('44444444-4444-4444-4444-444444444444', 'bbbbbbbbbbbbbbbb01');   -- B wrote idea 44 on that browser
do $$ begin
  if (select fiyat from public.talepler where fikir_id = '11111111-1111-1111-1111-111111111111' and uye = '00000000-0000-0000-0000-00000000000b') <> 220 then raise exception 'alirdim fiyatı yazmadı'; end if;
  -- (this file grants every table to the roles at its top, so what is checked here is row level security itself)
  if (select count(*) from public.cihaz_izleri) <> 0 then raise exception 'cihaz izleri okunabiliyor'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
do $$ begin
  begin
    perform public.alirdim('11111111-1111-1111-1111-111111111111', 300, 'bbbbbbbbbbbbbbbb01');
    raise exception 'aynı tarayıcıdan ikinci kimlikle alırdım denebildi';
  exception when raise_exception then if sqlerrm not like 'Bu cihazdan%' then raise; end if; end;
  begin
    perform public.alirdim('44444444-4444-4444-4444-444444444444', 300, 'bbbbbbbbbbbbbbbb01');
    raise exception 'fikrin yazıldığı tarayıcıdan başka kimlikle alırdım denebildi';
  exception when raise_exception then if sqlerrm not like 'Bu fikir bu cihazdan%' then raise; end if; end;
  perform public.alirdim('11111111-1111-1111-1111-111111111111', 300, 'ffffffffffffffff01');
  if (select count(*) from public.talepler where fikir_id = '11111111-1111-1111-1111-111111111111') <> 3 then raise exception 'başka tarayıcıdan gelen alırdım sayılmadı'; end if;
end $$;
reset role;
reset request.jwt.claim.sub;
select 'sql kontrolleri tamam' as sonuc;
