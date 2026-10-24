// Veri ayarları. Yerel modda supabaseUrl boş kalır: veri localStorage'da (udv-v1) tutulur.
// Supabase'e bağlanmak için supabase/KURULUM.md'yi izleyin; Project URL ve anon key buraya girilir.
// Anon key herkese açık olabilir: veriyi asıl koruyan Row Level Security kuralları.
// adminler: yönetim paneline girebilecek e-postalar (supabase modunda da profiller.rol = 'admin' şart).
window.UD_AYAR = {
  supabaseUrl: 'https://azjdweynukmwxywdfewb.supabase.co',
  supabaseAnon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amR3ZXludWttd3h5d2RmZXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTc5ODcsImV4cCI6MjEwODQzMzk4N30.WmoNnRWTC5LPg-hFiUv3AdKl54CwTGaKEo4QS4RzwnE',
  adminler: ['alperenesersu.b@gmail.com']
};
