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
select 'sql kontrolleri tamam' as sonuc;
