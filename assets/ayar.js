// Veri ayarları. Yerel modda supabaseUrl boş kalır: veri localStorage'da (udv-v1) tutulur.
// Supabase'e bağlanmak için supabase/KURULUM.md'yi izleyin; Project URL ve anon key buraya girilir.
// Anon key herkese açık olabilir: veriyi asıl koruyan Row Level Security kuralları.
// adminler: yönetim paneline girebilecek e-postalar (supabase modunda da profiller.rol = 'admin' şart).
window.UD_AYAR = {
  supabaseUrl: '',
  supabaseAnon: '',
  adminler: ['admin@undustit.local']
};
