/* Undustit data store (Store): ideas, demand, scores, comments; Supabase, the claude.ai db or local storage.
   Loaded in order: temel, depo, arayuz, hareket (plain scripts, so pages can call UD right after them).
   Each file shares its top-level names on window.UD_IC and takes what it needs from there. */
(function(){
'use strict';
const { $, CASES, CRIT, T, TERMS, V01, caseOf, daysLeft, sbClient, veriUyari } = window.UD_IC;
const Store = (function(){
  const subs = new Set();
  const S = { mode:'local', uid:'local', canWrite:true, ideas:{}, votes:{}, notes:{} };
  let db = null, chain = Promise.resolve();
  const emit = () => subs.forEach(f => f());
  const LS = 'ud-store-v1';
  function loadLocal(){
    let d = {}; try { d = JSON.parse(localStorage.getItem(LS) || '{}'); } catch(e){}
    S.ideas = d.ideas || {}; S.votes = d.votes || {}; S.notes = d.notes || {};
  }
  function saveLocal(){ try { localStorage.setItem(LS, JSON.stringify({ ideas:S.ideas, votes:S.votes, notes:S.notes })); } catch(e){} }
  loadLocal();
  window.addEventListener('storage', e => { if (e.key === LS && S.mode === 'local'){ loadLocal(); emit(); } });

  function write(col, value){
    S[col][S.uid] = value;
    if (S.mode === 'local'){ saveLocal(); emit(); return Promise.resolve(); }
    emit();
    return (chain = chain.then(() => db.doc(col + '/' + S.uid).set(value)));
  }
  const badge = () => {
    const b = $('#mode-badge'); if (!b) return;
    b.classList.toggle('live', S.mode !== 'local');
    b.lastChild.textContent = S.mode !== 'local' ? T('ud.alt.canli') : T('ud.alt.onizleme');
  };
  // ---- Supabase (assets/ayar.js has a URL): ideas, demand, scores and comments are rows in Postgres,
  // shared by everyone. Visitors read without an account; their first write signs the browser in
  // anonymously, so each browser is one person and RLS lets it change only its own rows. The rows are
  // poured into the same shape as the other modes, so ideas() and every view stay as they are.
  const AYAR = window.UD_AYAR || {};
  let sb = null;
  const idOf = key => key.slice(key.lastIndexOf(':') + 1);
  if (AYAR.supabaseUrl) S.mode = 'supabase';
  // With migration 4 (supabase/4-acilis.sql) a page reads one summary row per idea (fikir_kart: buyers,
  // average price, scores, comment count) plus only this person's own prices and scores; comments load
  // when an idea is opened. Without the view it falls back to reading every row of the four tables.
  let summary = true;
  const NEWEST = 1000;   // demand runs 30 days, so the newest thousand ideas is months of headroom
  const num = v => Number(v) || 0;
  async function sbLoad(){
    if (summary){
      const k = await sb.from('fikir_kart').select('*').order('zaman', { ascending:false }).limit(NEWEST);
      if (k.error){ summary = false; return sbLoad(); }
      const me = S.uid !== 'anon' ? S.uid : null;
      const [t, p] = me ? await Promise.all([sb.from('talepler').select('fikir_id,fiyat').eq('uye', me), sb.from('puanlar').select('fikir_id,olcut,puan').eq('uye', me)]) : [{}, {}];
      const keyOf = {}, ideas = {}, mine = { buy:{}, rate:{} };
      k.data.forEach(r => { keyOf[r.id] = r.sahip + ':' + r.id;
        (ideas[r.sahip] = ideas[r.sahip] || { items:[] }).items.push({ k:r.id, caseId:r.vaka_id, title:r.baslik, cat:r.kategori, problem:r.problem, solution:r.cozum, feats:r.ozellikler, handle:r.ad, at:r.zaman,
          agg:{ buyers:num(r.alici), avg:num(r.ort_fiyat), raters:num(r.puanci), crit:{ d:num(r.puan_d), m:num(r.puan_m), u:num(r.puan_u) }, notes:num(r.yorum) } }); });
      (t.data || []).forEach(r => { if (keyOf[r.fikir_id]) mine.buy[keyOf[r.fikir_id]] = r.fiyat; });
      (p.data || []).forEach(r => { const x = keyOf[r.fikir_id]; if (x) mine.rate[x] = { ...(mine.rate[x] || {}), [r.olcut]: r.puan }; });
      S.ideas = ideas; S.votes = me ? { [me]: mine } : {}; veriUyari(false); emit();
      return;
    }
    const res = await Promise.all(['fikirler', 'talepler', 'puanlar', 'yorumlar'].map(t => sb.from(t).select('*').limit(5000)));
    const bad = res.find(r => r.error); if (bad) throw bad.error;
    const [f, t, p, y] = res.map(r => r.data || []);
    const keyOf = {}, ideas = {}, votes = {}, notes = {};
    const vote = u => (votes[u] = votes[u] || { buy:{}, rate:{} });
    f.forEach(r => { keyOf[r.id] = r.sahip + ':' + r.id;
      (ideas[r.sahip] = ideas[r.sahip] || { items:[] }).items.push({ k:r.id, caseId:r.vaka_id, title:r.baslik, cat:r.kategori, problem:r.problem, solution:r.cozum, feats:r.ozellikler, handle:r.ad, at:r.zaman }); });
    t.forEach(r => { if (keyOf[r.fikir_id]) vote(r.uye).buy[keyOf[r.fikir_id]] = r.fiyat; });
    p.forEach(r => { const k = keyOf[r.fikir_id]; if (k) { const v = vote(r.uye); v.rate[k] = { ...(v.rate[k] || {}), [r.olcut]: r.puan }; } });
    y.forEach(r => { if (keyOf[r.fikir_id]) (notes[r.uye] = notes[r.uye] || { items:[] }).items.push({ k:r.id, idea:keyOf[r.fikir_id], kind:r.tur, text:r.metin, handle:r.ad, at:r.zaman }); });
    S.ideas = ideas; S.votes = votes; S.notes = notes; emit();
  }
  const sbReload = () => sbLoad().then(() => veriUyari(false)).catch(() => veriUyari(true, sbReload));
  // an idea's comments, read when its window opens (summary mode keeps only their count in the list)
  const noteCache = {};
  async function sbNotes(key){
    const r = await sb.from('yorumlar').select('id,tur,metin,ad,zaman,uye').eq('fikir_id', idOf(key)).order('zaman', { ascending:true }).limit(500);
    if (r.error){ veriUyari(true, () => sbNotes(key).then(() => veriUyari(false))); return; }
    noteCache[key] = r.data.map(n => ({ k:n.id, idea:key, kind:n.tur, text:n.metin, handle:n.ad, at:n.zaman, owner:n.uye }));
    emit();
  }
  async function sbUser(){
    const { data } = await sb.auth.getSession();
    if (data && data.session) return (S.uid = data.session.user.id);
    const r = await sb.auth.signInAnonymously();
    if (r.error) throw r.error;
    return (S.uid = r.data.user.id);
  }
  // every write: make sure we are someone, do it, then read back what the database now says
  const sbDo = async fn => { await start(); await sbUser(); const r = await fn(); if (r && r.error) { sbReload(); throw r.error; } await sbLoad(); return r; };

  // Nothing is fetched until a page shows data (its first sub() or cases()), so the reading pages stay light.
  let ready = null;
  const start = () => ready || (ready = (async () => {
    if (AYAR.supabaseUrl){
      sb = await sbClient();
      S.ideas = {}; S.votes = {}; S.notes = {};
      const { data } = await sb.auth.getSession();
      S.uid = data && data.session ? data.session.user.id : 'anon';
      await sbLoad();
      // signing in elsewhere, out, or back from an e-mail link changes who "I" am: read my rows again
      sb.auth.onAuthStateChange((ev, session) => {
        const id = session ? session.user.id : 'anon';
        if (id !== S.uid){ S.uid = id; sbReload(); } else emit();
      });
      // others' demand and comments arrive on a slow tick and whenever the tab comes back
      setInterval(() => { if (document.visibilityState === 'visible') sbReload(); }, 30000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sbReload(); });
      return;
    }
    if (!(window.claude && window.claude.use)) return;
    const [d, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const id = user ? await user.id() : null;
    if (!d || !id) return;
    db = d; S.mode = 'live'; S.uid = id; S.ideas = {}; S.votes = {}; S.notes = {};
    const w = user.can ? await user.can('data.write') : null;
    if (w === false) S.canWrite = false;
    ['ideas','votes','notes'].forEach(col => {
      db.collection(col).onSnapshot(snap => {
        const next = {}; snap.docs.forEach(x => { next[x.id] = x.data() || {}; });
        S[col] = next; emit();
      }, () => {});
    });
    emit();
  })().catch(() => { if (S.mode === 'supabase') veriUyari(true, sbReload); }).finally(badge));
  document.addEventListener('DOMContentLoaded', badge);

  // Open and past cases (drafts never). Without the database: the admin panel's local copy, else Vaka 01.
  let casesP = null;
  async function loadCases(){
    let rows = null;
    if (AYAR.supabaseUrl){
      const c = await sbClient();
      const r = await c.from('vakalar').select('id,baslik,ozet,stok,adet,olcu,sinif,durum,olusturma').neq('durum', 'taslak').order('olusturma', { ascending:false });
      if (!r.error) rows = r.data;
    } else if (!(window.claude && window.claude.use)){
      try { const d = JSON.parse(localStorage.getItem('udv-v1') || 'null'); if (d && d.vakalar) rows = Object.values(d.vakalar).filter(v => v.durum !== 'taslak').sort((a,b) => String(b.olusturma).localeCompare(String(a.olusturma))); } catch(e){}
    }
    CASES.splice(0, CASES.length, ...(rows && rows.length ? rows.map(caseOf) : [V01]));
    emit();
    return CASES;
  }
  const cases = () => casesP || (casesP = loadCases().catch(() => { if (!CASES.length) CASES.push(V01); emit(); return CASES; }));

  // Everything below comes from other people's documents in live mode, so it is shaped before use:
  // strings are cut to the form's limits, a missing or future date never extends the 30 days.
  const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  const when = v => { const t = Date.parse(v); return isNaN(t) ? null : new Date(Math.min(t, Date.now())).toISOString(); };
  const KINDS = ['yorum','oneri','endise'];
  function clean(it, owner){
    return { k: str(String(it.k), 40), key: owner + ':' + str(String(it.k), 40), owner, caseId: str(it.caseId, 80), title: str(it.title, 140), cat: str(it.cat, 40),
      problem: str(it.problem, 400), solution: str(it.solution, 400), handle: str(it.handle, 30),
      feats: (Array.isArray(it.feats) ? it.feats : []).slice(0, 3).map(x => str(x, 80)).filter(Boolean), at: when(it.at), agg: it.agg || null };
  }
  function ideas(){
    const out = [];
    for (const [owner, doc] of Object.entries(S.ideas)){
      (Array.isArray(doc.items) ? doc.items : []).forEach(it => {
        if (it && typeof it.title === 'string' && it.k) out.push(clean(it, owner));
      });
    }
    const buy = {}, rates = {};
    for (const [voter, v] of Object.entries(S.votes)){
      Object.entries((v && v.buy) || {}).forEach(([k, p]) => { const n = Number(p); if (n > 0 && n <= TERMS.maxPrice) (buy[k] = buy[k] || {})[voter] = n; });
      Object.entries((v && v.rate) || {}).forEach(([k, r]) => { if (r && typeof r === 'object') (rates[k] = rates[k] || []).push(r); });
    }
    const notes = {};
    for (const [owner, doc] of Object.entries(S.notes)){
      (Array.isArray(doc.items) ? doc.items : []).forEach(n => { if (n && typeof n.idea === 'string' && typeof n.text === 'string') (notes[n.idea] = notes[n.idea] || []).push({ k: n.k, idea: n.idea, kind: KINDS.includes(n.kind) ? n.kind : 'yorum', text: str(n.text, 500), handle: str(n.handle, 30), at: when(n.at), owner }); });
    }
    out.forEach(i => {
      const bs = Object.values(buy[i.key] || {});
      i.myPrice = (buy[i.key] || {})[S.uid] || 0;
      i.mine = i.myPrice > 0;
      i.left = daysLeft(i.at);
      // summary mode: the database counted everyone; the rows here are only this person's own
      if (i.agg){
        i.buyers = i.agg.buyers; i.avg = i.agg.avg; i.raters = i.agg.raters; i.crit = { ...i.agg.crit };
        i.notes = noteCache[i.key] || []; i.noteCount = Math.max(i.agg.notes, i.notes.length); i.notesLoaded = !!noteCache[i.key];
        return;
      }
      i.buyers = bs.length;
      i.avg = bs.length ? bs.reduce((a,b)=>a+b,0)/bs.length : 0;
      const rs = rates[i.key] || [];
      i.raters = rs.length;
      i.crit = {}; CRIT.forEach(([c]) => { const v = rs.map(r => Number(r[c])).filter(n => n >= 1 && n <= 5); i.crit[c] = v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; });
      i.notes = (notes[i.key] || []).sort((a,b) => String(a.at).localeCompare(String(b.at)));
      i.noteCount = i.notes.length; i.notesLoaded = true;
    });
    return out;
  }
  const myItems = col => ((S[col][S.uid] || {}).items || []).slice();
  const myVotes = () => { const v = S.votes[S.uid] || {}; return { buy: { ...(v.buy || {}) }, rate: { ...(v.rate || {}) } }; };
  const key = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  return {
    get mode(){ return S.mode; }, get canWrite(){ return S.canWrite; }, get uid(){ return S.uid; },
    get ready(){ return start(); }, ideas, cases,
    sub(fn){ start(); subs.add(fn); fn(); return () => subs.delete(fn); },
    myCount(){ return myItems('ideas').length; },
    addIdea(data){
      if (S.mode === 'supabase'){
        return sbDo(() => sb.from('fikirler').insert({ sahip:S.uid, vaka_id: data.caseId || null, baslik:data.title, kategori:data.cat, problem:data.problem,
          cozum:data.solution, ozellikler:data.feats, ad:data.handle || '' }).select('id').single()).then(r => S.uid + ':' + r.data.id);
      }
      const it = { k:key(), ...data, at:new Date().toISOString() };
      return write('ideas', { items: myItems('ideas').concat([it]).slice(-40) }).then(() => S.uid + ':' + it.k);
    },
    removeIdea(key){
      if (S.mode === 'supabase') return sbDo(() => sb.from('fikirler').delete().eq('id', idOf(key)));
      const k = key.slice(key.lastIndexOf(':') + 1);
      return write('ideas', { items: myItems('ideas').filter(it => it.k !== k) });
    },
    setBuy(k, price){
      if (S.mode === 'supabase'){
        if (S.uid !== 'anon'){ const v = myVotes(); if (price) v.buy[k] = price; else delete v.buy[k]; S.votes[S.uid] = v; emit(); }
        return sbDo(() => price ? sb.from('talepler').upsert({ fikir_id:idOf(k), uye:S.uid, fiyat:price }, { onConflict:'fikir_id,uye' })
          : sb.from('talepler').delete().eq('fikir_id', idOf(k)).eq('uye', S.uid));
      }
      const v = myVotes(); if (price) v.buy[k] = price; else delete v.buy[k]; return write('votes', v); },
    rate(k, c, n){
      if (S.mode === 'supabase') return sbDo(() => sb.from('puanlar').upsert({ fikir_id:idOf(k), uye:S.uid, olcut:c, puan:n }, { onConflict:'fikir_id,uye,olcut' }));
      const v = myVotes(); v.rate[k] = { ...(v.rate[k] || {}), [c]: n }; return write('votes', v); },
    myRate(k){ return ((S.votes[S.uid] || {}).rate || {})[k] || {}; },
    // "Haber ver": an e-mail to reach this person later about one idea (tur 'fikrim' or 'alirdim').
    // The address is private: RLS lets a person read only their own rows (supabase/4-acilis.sql).
    async haberVer(eposta, key, tur){
      if (S.mode === 'supabase'){
        await start(); await sbUser();
        const r = await sb.from('haber_istekleri').upsert({ uye:S.uid, eposta, fikir_id:idOf(key), tur }, { onConflict:'uye,fikir_id,tur' });
        if (r.error) throw r.error;
        return;
      }
      let d = []; try { d = JSON.parse(localStorage.getItem('ud-haber') || '[]') || []; } catch(e){}
      d = d.filter(x => !(x.key === key && x.tur === tur)).concat([{ eposta, key, tur, at:new Date().toISOString() }]);
      try { localStorage.setItem('ud-haber', JSON.stringify(d)); } catch(e){}
    },
    // ---- account. Visitors stay anonymous until they choose otherwise. Linking an e-mail turns the
    // anonymous user into a permanent one with the same id (Supabase), so every idea, price and comment
    // stays theirs; on another device the same e-mail signs in with a link. Returns null in preview mode.
    async hesap(){
      if (S.mode !== 'supabase') return null;
      await start();
      const { data } = await sb.auth.getUser();
      const u = data && data.user;
      return { var: !!u, anonim: !u || !!u.is_anonymous, eposta: (u && u.email) || '', bekleyen: (u && u.new_email) || '' };
    },
    async epostaBagla(eposta, donus){
      await start();
      const { data } = await sb.auth.getSession();
      const u = data && data.session && data.session.user;
      const r = u && u.is_anonymous
        ? await sb.auth.updateUser({ email:eposta }, { emailRedirectTo:donus })
        : await sb.auth.signInWithOtp({ email:eposta, options:{ emailRedirectTo:donus } });
      if (r.error) throw r.error;
    },
    async girisBaglantisi(eposta, donus){
      await start();
      const r = await sb.auth.signInWithOtp({ email:eposta, options:{ shouldCreateUser:false, emailRedirectTo:donus } });
      if (r.error) throw r.error;
    },
    async cikis(){ await start(); await sb.auth.signOut(); },
    // this person's "haber ver" requests, to see and cancel them
    async haberlerim(){
      if (S.mode === 'supabase'){
        await start();
        if (S.uid === 'anon') return [];
        const r = await sb.from('haber_istekleri').select('id,eposta,fikir_id,tur,gonderildi').eq('uye', S.uid);
        if (r.error) return [];
        return r.data.map(h => ({ id:h.id, eposta:h.eposta, tur:h.tur, gonderildi:h.gonderildi, idea:(ideas().find(i => idOf(i.key) === h.fikir_id) || {}).key }));
      }
      let d = []; try { d = JSON.parse(localStorage.getItem('ud-haber') || '[]') || []; } catch(e){}
      return d.map((h, ix) => ({ id:String(ix), eposta:h.eposta, tur:h.tur, idea:h.key }));
    },
    async haberIptal(h){
      if (S.mode === 'supabase'){ await start(); const r = await sb.from('haber_istekleri').delete().eq('id', h.id); if (r.error) throw r.error; return; }
      let d = []; try { d = JSON.parse(localStorage.getItem('ud-haber') || '[]') || []; } catch(e){}
      d = d.filter(x => !(x.key === h.idea && x.tur === h.tur));
      try { localStorage.setItem('ud-haber', JSON.stringify(d)); } catch(e){}
    },
    // A row only admins read back: "Vakanı aç" applications, contact messages, idea reports
    // (vaka_basvurulari, iletisim_mesajlari, fikir_bildirimleri). The local preview keeps them under
    // udv-<table>, where the admin panel's local store (veri.js) reads them.
    async kaydet(tablo, data){
      if (S.mode === 'supabase'){
        await start(); await sbUser();
        const r = await sb.from(tablo).insert(data);
        if (r.error) throw r.error;
        return;
      }
      let d = {}; try { d = JSON.parse(localStorage.getItem('udv-' + tablo) || '{}') || {}; } catch(e){}
      const id = key(); d[id] = { id, ...data, durum: tablo === 'fikir_bildirimleri' ? 'acik' : 'yeni', zaman:new Date().toISOString() };
      try { localStorage.setItem('udv-' + tablo, JSON.stringify(d)); } catch(e){}
    },
    basvur(data){ return this.kaydet('vaka_basvurulari', data); },
    // the database wants the idea's own id; the local preview keeps the full key (that is what it hides)
    bildir(key, neden, aciklama){ return this.kaydet('fikir_bildirimleri', { fikir_id: S.mode === 'supabase' ? idOf(key) : key, neden, aciklama }); },
    loadNotes(key){ if (S.mode === 'supabase' && summary) start().then(() => sbNotes(key)).catch(() => veriUyari(true, () => sbNotes(key))); },
    addNote(idea, kind, text, handle){
      if (S.mode === 'supabase') return sbDo(() => sb.from('yorumlar').insert({ fikir_id:idOf(idea), uye:S.uid, tur:kind, metin:text, ad:handle || '' })).then(r => { if (summary) sbNotes(idea); return r; });
      return write('notes', { items: myItems('notes').concat([{ k:key(), idea, kind, text, handle, at:new Date().toISOString() }]).slice(-200) });
    }
  };
})();

Object.assign(window.UD_IC, { Store });
})();
