/* Undustit shared script: nav, data store, idea form, idea boards, Thursday countdown, the process run.
   Every page sets <html data-root="../"> (path back to the site root) and calls the parts it uses. */
(function(){
'use strict';
const html = document.documentElement;
const ROOT = html.dataset.root || '';
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
function el(tag, props={}, kids=[]){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(props)){
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach(c => c != null && n.append(c));
  return n;
}
const ICON = {
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  replay:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'
};

// =========================================================== model constants
// Draft business terms from the first meeting (Quirky model). Change them here only.
const TERMS = {
  fee: { first: 99, next: 10, cur: '₺', charged: false },
  voteDays: 30, maxPrice: 100000,
  shareRetail: 10, shareDirect: 30,
  presale: [300, 750],
  liveDay: 4, liveHourUtc: 17 // Thursday 20:00 Istanbul (UTC+3, no DST)
};
const CATS = ['Mutfak','Ev & dekor','Fitness','Ofis & masa','Dış mekân','Teknoloji aksesuarı','Çocuk','Evcil hayvan'];
const CASES = [{ id:'vaka-01', name:'Vaka 01 · Bir milyon cıvata', short:'Vaka 01 · Cıvata', href:'vaka-01/' }];
const CRIT = [['d','Tasarım'],['m','Pazar'],['u','Uygulanabilirlik']];
const EXAMPLES = [
  { key:'ex:1', ex:true, title:'Tezgâh kenarına takılan, katlanınca rafa dönen kesme tahtası.', cat:'Mutfak', problem:'Dar mutfakta kesme tahtası tezgâhı kaplıyor.', solution:'Menteşeli tabla tezgâh kenarına kelepçeyle takılır, kullanılmayınca dikey rafa döner.', feats:['Delmeden montaj','Bulaşık makinesine girer'], at:null },
  { key:'ex:2', ex:true, title:'Halter plakalarını duvarda dik tutan, cıvatalı modüler raf.', cat:'Vaka 01 · Cıvata', problem:'Ev spor köşesinde plakalar yerde dağınık duruyor.', solution:'Vaka 01 cıvataları pim olur; duvar profiline istenen aralıkla takılır.', feats:['Fazla stok cıvata kullanır','Modüler'], at:null },
  { key:'ex:3', ex:true, title:'Kedi kumunu her açılışta tartıp sağlık uyarısı veren kapak.', cat:'Evcil hayvan', problem:'Kedinin idrar düzenindeki değişiklik geç fark ediliyor.', solution:'Kapağa gömülü tartı ziyaret sayısını ve ağırlığı telefona yollar.', feats:['Pil ile 6 ay','Uygulama gerekmez, SMS'], at:null }
];

// =========================================================== helpers
const DAY = 864e5;
const fmtDate = d => d.toLocaleDateString('tr-TR', { day:'numeric', month:'long' });
const fmtDay = d => d.toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long' });
function nextLive(now = new Date()){
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), TERMS.liveHourUtc));
  let add = (TERMS.liveDay - t.getUTCDay() + 7) % 7;
  if (add === 0 && t <= now) add = 7;
  t.setUTCDate(t.getUTCDate() + add);
  return t;
}
function daysLeft(at){
  if (!at) return null;
  const end = new Date(at).getTime() + TERMS.voteDays*DAY;
  return Math.max(0, Math.ceil((end - Date.now())/DAY));
}
const homeHref = () => ROOT || './';

// =========================================================== nav + footer
function mountChrome(){
  const cur = html.dataset.page || '';
  const links = [['fikirler','Fikirler','fikirler/'],['nasil','Nasıl işler','nasil/'],['vakalar','Vakalar','vakalar/'],['hikaye','Hikâye','hikaye/']];
  const host = $('[data-ud-nav]');
  if (host){
    host.className = 'nav'; host.id = 'nav';
    host.innerHTML = `<div class="wrap"><a class="brand" href="${homeHref()}" aria-label="Undustit ana sayfa"><b>Undust<i>it</i></b></a>
      <div class="nav-r"><nav class="nav-links" id="nav-links" aria-label="Ana menü">${links.map(([k,l,h])=>`<a href="${ROOT+h}"${k===cur?' aria-current="page"':''}>${l}</a>`).join('')}</nav>
      <a class="btn sig sm" href="${ROOT}fikir/">Fikrini yaz</a>
      <button type="button" class="menu-t" aria-expanded="false" aria-controls="nav-links" aria-label="Menü"><svg class="i-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg><svg class="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div></div>`;
    const btn = $('.menu-t', host);
    const set = o => { host.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); };
    btn.onclick = () => set(!host.classList.contains('open'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && host.classList.contains('open')){ set(false); btn.focus(); } });
  }
  const foot = $('[data-ud-foot]');
  if (foot){
    foot.className = 'foot';
    foot.innerHTML = `<div class="wrap"><span>Undustit · prototip · <span class="mode-badge" id="mode-badge"><i></i>bağlanıyor</span></span>
      <nav aria-label="Alt menü"><a href="${ROOT}fikir/">Fikrini yaz</a><a href="${ROOT}fikirler/">Fikirler</a><a href="${ROOT}nasil/">Nasıl işler</a><a href="${ROOT}vakalar/">Vakalar</a><a href="${ROOT}hikaye/">Hikâye</a></nav></div>`;
  }
}

// =========================================================== store
// Live on claude.ai (db capability): ideas/<uid>, votes/<uid>, notes/<uid>, each person writes their own doc.
// A vote is purchase intent, not a like: votes/<uid>.buy maps an idea to the price that person would pay.
// Anywhere else it keeps the same shape in localStorage so the pages can be tried as a preview.
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
    b.classList.toggle('live', S.mode === 'live');
    b.lastChild.textContent = S.mode === 'live' ? 'canlı' : 'önizleme · veriler bu tarayıcıda';
  };
  const ready = (async () => {
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
  })().catch(() => {}).finally(badge);
  document.addEventListener('DOMContentLoaded', badge);

  function ideas(){
    const out = [];
    for (const [owner, doc] of Object.entries(S.ideas)){
      (Array.isArray(doc.items) ? doc.items : []).forEach(it => {
        if (it && typeof it.title === 'string' && it.k) out.push({ ...it, key: owner + ':' + it.k, owner });
      });
    }
    const buy = {}, rates = {};
    for (const [voter, v] of Object.entries(S.votes)){
      Object.entries((v && v.buy) || {}).forEach(([k, p]) => { const n = Number(p); if (n > 0 && n <= TERMS.maxPrice) (buy[k] = buy[k] || {})[voter] = n; });
      Object.entries((v && v.rate) || {}).forEach(([k, r]) => { (rates[k] = rates[k] || []).push(r); });
    }
    const notes = {};
    for (const [owner, doc] of Object.entries(S.notes)){
      (Array.isArray(doc.items) ? doc.items : []).forEach(n => { if (n && n.idea && typeof n.text === 'string') (notes[n.idea] = notes[n.idea] || []).push({ ...n, owner }); });
    }
    out.forEach(i => {
      const bs = Object.values(buy[i.key] || {});
      i.buyers = bs.length;
      i.avg = bs.length ? bs.reduce((a,b)=>a+b,0)/bs.length : 0;
      i.myPrice = (buy[i.key] || {})[S.uid] || 0;
      i.mine = i.myPrice > 0;
      const rs = rates[i.key] || [];
      i.raters = rs.length;
      i.crit = {}; CRIT.forEach(([c]) => { const v = rs.map(r => Number(r[c])).filter(n => n >= 1 && n <= 5); i.crit[c] = v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; });
      i.notes = (notes[i.key] || []).sort((a,b) => String(a.at).localeCompare(String(b.at)));
      i.left = daysLeft(i.at);
    });
    return out;
  }
  const myItems = col => ((S[col][S.uid] || {}).items || []).slice();
  const myVotes = () => { const v = S.votes[S.uid] || {}; return { buy: { ...(v.buy || {}) }, rate: { ...(v.rate || {}) } }; };
  const key = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  return {
    get mode(){ return S.mode; }, get canWrite(){ return S.canWrite; }, get uid(){ return S.uid; },
    ready, ideas,
    sub(fn){ subs.add(fn); fn(); return () => subs.delete(fn); },
    myCount(){ return myItems('ideas').length; },
    addIdea(data){
      const it = { k:key(), ...data, at:new Date().toISOString() };
      return write('ideas', { items: myItems('ideas').concat([it]).slice(-40) }).then(() => S.uid + ':' + it.k);
    },
    setBuy(k, price){ const v = myVotes(); if (price) v.buy[k] = price; else delete v.buy[k]; return write('votes', v); },
    rate(k, c, n){ const v = myVotes(); v.rate[k] = { ...(v.rate[k] || {}), [c]: n }; return write('votes', v); },
    myRate(k){ return ((S.votes[S.uid] || {}).rate || {})[k] || {}; },
    addNote(idea, kind, text, handle){
      return write('notes', { items: myItems('notes').concat([{ k:key(), idea, kind, text, handle, at:new Date().toISOString() }]).slice(-200) });
    }
  };
})();

// =========================================================== Thursday countdown
function mountThu(node){
  const tick = () => {
    const t = nextLive(), ms = t - Date.now();
    const d = Math.floor(ms/DAY), h = Math.floor(ms%DAY/36e5), m = Math.floor(ms%36e5/6e4);
    node.innerHTML = `<i class="dot" aria-hidden="true"></i><span>Perşembe 20.00 canlı</span><b>${d ? d+'g ' : ''}${h}s ${String(m).padStart(2,'0')}dk</b>`;
    node.setAttribute('title', fmtDay(t) + ', 20.00');
  };
  tick(); setInterval(tick, 30000);
}

// =========================================================== idea form
const handleGet = () => { try { return localStorage.getItem('ud-handle') || ''; } catch(e){ return ''; } };
const handleSet = v => { try { localStorage.setItem('ud-handle', v); } catch(e){} };
function feeLine(){
  const f = TERMS.fee, n = Store.myCount();
  const now = n ? `${f.next} ${f.cur}` : `${f.first} ${f.cur}`;
  return `Gönderim ücreti: ilk fikir <b>${f.first} ${f.cur}</b>, sonrakiler <b>${f.next} ${f.cur}</b> (bu fikir için ${now}). “Alırdım” demek ve geliştirmeye katılmak ücretsiz.` + (f.charged ? '' : ' <b>Prototipte ödeme alınmıyor.</b>');
}
function mountForm(host, opts={}){
  const preCase = opts.caseId ? CASES.find(c => c.id === opts.caseId) : null;
  const id = 'f' + Math.random().toString(36).slice(2,7);
  host.innerHTML = `
  <form class="iform" novalidate aria-label="Fikir gönder">
    <div class="if-top">
      <label for="${id}-p"><span class="eyebrow k">${opts.label || 'Fikrin, tek cümlede'}</span><span class="if-count" aria-live="polite">0 / 140</span></label>
      <textarea id="${id}-p" class="if-pitch" rows="1" maxlength="160" placeholder="${opts.placeholder || 'Ne yapıyor, kimin işine yarıyor?'}" required></textarea>
      <button type="button" class="btn sig if-next" aria-controls="${id}-more" aria-expanded="false">Devam ${ICON.arrow}</button>
    </div>
    <div class="if-more" id="${id}-more"><div><div class="if-body">
      <div class="if-field" role="group" aria-labelledby="${id}-cl"><span id="${id}-cl">Kategori</span><div class="chips if-cats"></div></div>
      <div class="if-two">
        <label class="if-field"><span>Çözdüğü problem <small>kısa</small></span><textarea name="problem" maxlength="400" required placeholder="Bugün neyi zorlaştırıyor?"></textarea></label>
        <label class="if-field"><span>Çözüm <small>kısa</small></span><textarea name="solution" maxlength="400" required placeholder="Fikrin bunu nasıl çözüyor?"></textarea></label>
      </div>
      <div class="if-field" role="group" aria-labelledby="${id}-fl"><span id="${id}-fl">Temel özellikler <small>en az 1, en çok 3</small></span>
        <div class="feats"><input name="f1" maxlength="80" placeholder="1. özellik" aria-label="1. özellik"><input name="f2" maxlength="80" placeholder="2. özellik (isteğe bağlı)" aria-label="2. özellik"><input name="f3" maxlength="80" placeholder="3. özellik (isteğe bağlı)" aria-label="3. özellik"></div></div>
      <label class="if-field" style="max-width:320px"><span>Görünen ad <small>isteğe bağlı</small></span><input name="handle" maxlength="30" autocomplete="nickname" placeholder="ör. ayse.k"></label>
      <div class="if-foot"><p class="if-fee"></p><button type="submit" class="btn sig">Fikri gönder ${ICON.arrow}</button></div>
      <p class="if-status" role="status" aria-live="polite"></p>
    </div></div></div>
    <div class="if-done" tabindex="-1"></div>
  </form>`;
  const f = $('form', host), pitch = $('.if-pitch', f), count = $('.if-count', f), next = $('.if-next', f), status = $('.if-status', f);
  let cat = preCase ? preCase.short : '';
  const cats = $('.if-cats', f);
  const all = CASES.map(c => [c.short, true]).concat(CATS.map(c => [c, false]));
  all.forEach(([c, isCase]) => cats.append(el('button', { type:'button', class:'chip' + (isCase ? ' case' : ''), 'aria-pressed': String(c === cat), text:c, onclick(){ cat = c; $$('.chip', cats).forEach(b => b.setAttribute('aria-pressed', String(b.textContent === c))); } })));
  f.handle.value = handleGet();
  const paintFee = () => { $('.if-fee', f).innerHTML = feeLine(); };
  Store.sub(paintFee);
  const open = () => { f.classList.add('open'); next.setAttribute('aria-expanded','true'); };
  const len = () => {
    const n = pitch.value.trim().length;
    count.textContent = n + ' / 140';
    count.classList.toggle('near', n > 120 && n <= 140); count.classList.toggle('over', n > 140);
  };
  pitch.addEventListener('input', () => { len(); if (pitch.value.trim().length >= 3 && opts.autoOpen !== false) open(); });
  pitch.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); open(); f.problem.focus(); } });
  next.onclick = () => { open(); if (pitch.value.trim().length < 10) pitch.focus(); else f.problem.focus(); };
  if (opts.open) open();
  const say = (t, bad) => { status.textContent = t; status.classList.toggle('bad', !!bad); };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const title = pitch.value.trim(), feats = [f.f1, f.f2, f.f3].map(x => x.value.trim()).filter(Boolean);
    const fail = (msg, node) => { say(msg, true); open(); node && node.focus(); };
    if (title.length < 10) return fail('Fikri en az 10 karakterle anlat.', pitch);
    if (title.length > 140) return fail('Tek cümle 140 karakteri geçmesin.', pitch);
    if (!cat) return fail('Bir kategori seç.', $('.chip', cats));
    if (f.problem.value.trim().length < 8) return fail('Problemi bir cümleyle yaz.', f.problem);
    if (f.solution.value.trim().length < 8) return fail('Çözümü bir cümleyle yaz.', f.solution);
    if (!feats.length) return fail('En az bir temel özellik yaz.', f.f1);
    if (!Store.canWrite) return fail('Bu bağlantıyla yalnız okuyabilirsin; fikir göndermek için katkı izni gerekiyor.');
    const handle = f.handle.value.trim(); handleSet(handle);
    say('Gönderiliyor…');
    $('[type=submit]', f).disabled = true;
    Store.addIdea({ title, cat, problem:f.problem.value.trim(), solution:f.solution.value.trim(), feats, handle }).then(k => {
      const end = new Date(Date.now() + TERMS.voteDays*DAY);
      const done = $('.if-done', f);
      done.innerHTML = `<span class="eyebrow k">Gönderildi · talep topluyor</span><h3>${esc(title)}</h3>
        <dl><div><dt>Talep süresi biter</dt><dd>${fmtDate(end)}</dd></div><div><dt>İlk canlı değerlendirme</dt><dd>${fmtDay(nextLive())}, 20.00</dd></div><div><dt>Ölçütler</dt><dd>Tasarım · Pazar · Uygulanabilirlik</dd></div></dl>
        <p class="lead" style="font-size:15px">Topluluk 30 gün boyunca “alırdım” der ve kaça alacağını yazar; iyileştirme önerir, endişesini söyler. Seçilmesen de kaç kişinin hangi fiyata alacağını görürsün.</p>
        <div class="acts"><a class="btn" href="${ROOT}fikirler/?f=${encodeURIComponent(k)}">Fikrini gör ${ICON.arrow}</a><button type="button" class="btn alt again">Bir fikir daha yaz</button></div>`;
      f.classList.add('done'); done.focus();
      $('.again', done).onclick = () => { f.reset(); f.handle.value = handleGet(); pitch.value = ''; len(); f.classList.remove('done'); $('[type=submit]', f).disabled = false; say(''); pitch.focus(); };
      opts.onSent && opts.onSent(k);
    }).catch(err => {
      $('[type=submit]', f).disabled = false;
      say(err && err.code === 'invalid_argument' ? 'Bu bağlantıyla fikir gönderemezsin; katkı izni gerekiyor.' : 'Gönderilemedi. Bir daha dene.', true);
    });
  });
  if (opts.focus) setTimeout(() => pitch.focus({ preventScroll:true }), 50);
  const useCase = id => {
    const c = CASES.find(x => x.id === id); if (!c) return;
    cat = c.short; $$('.chip', cats).forEach(b => b.setAttribute('aria-pressed', String(b.textContent === cat)));
    open(); f.scrollIntoView({ block:'center', behavior: reduce.matches ? 'auto' : 'smooth' }); pitch.focus({ preventScroll:true });
  };
  return { focus: () => pitch.focus(), open, useCase };
}

// =========================================================== open case card
// The surplus-stock angle on the home pages: one open case, its numbers, and a one-tap way to write for it.
function mountCase(host, opts={}){
  const c = CASES[0];
  host.classList.add('case-band');
  host.innerHTML = `
    <div class="cb-txt">
      <span class="cb-tag"><i aria-hidden="true"></i>Açık vaka · ${c.name.split(' · ')[0]}</span>
      <h2 class="cb-h">Bir milyon cıvata <em>yeni bir iş arıyor.</em></h2>
      <p>Bir fabrikanın deposunda satılmayı bekleyen M10 × 90 flanşlı cıvata takımları. Onları kullanan bir ürün bul: malzeme hazır olduğu için üretim riski düşük, kazanan fikirle 1.000 adetlik deneme partisi yapılır.</p>
      <dl><div><dt>Adet</dt><dd>1.000.000</dd></div><div><dt>Ölçü</dt><dd>M10 × 90 · 8.8</dd></div><div><dt>Gelen fikir</dt><dd class="cb-n">0</dd></div></dl>
      <div class="cb-acts"><a class="btn sig" href="${ROOT}fikir/?vaka=${c.id}" data-case="${c.id}">Bu vakaya fikir yaz ${ICON.arrow}</a><a class="btn alt" href="${ROOT + c.href}">Vakayı gör</a><a class="link" href="${ROOT}vakalar/">Fazlan mı var? Vaka aç</a></div>
    </div>
    <figure class="cb-art" aria-hidden="true"><svg viewBox="0 0 260 150">
      <g class="cb-l"><path d="M24 52h26v46H24z"/><path d="M50 60h10v30H50z"/><path d="M60 66h150v18H60z"/>
      ${Array.from({length:12}, (_,k) => `<path class="th" d="M${120 + k*7.5} 66l4 18"/>`).join('')}
      <path d="M176 56h16v38h-16z"/><path d="M192 60h8v30h-8z"/></g>
      <path class="cb-c" d="M14 75H232" />
      <g class="cb-d"><path d="M60 108v12M210 108v12M60 116H210"/><text x="135" y="132" text-anchor="middle">l = 90</text><text x="226" y="70">M10</text></g>
    </svg><figcaption>× 1.000.000</figcaption></figure>`;
  const a = $('[data-case]', host);
  if (opts.form) a.addEventListener('click', e => { e.preventDefault(); opts.form.useCase(c.id); });
  Store.sub(() => { $('.cb-n', host).textContent = String(Store.ideas().filter(i => i.cat === c.short).length); });
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// =========================================================== boards
function sortIdeas(list, by){
  const c = list.slice();
  if (by === 'new') c.sort((a,b) => String(b.at).localeCompare(String(a.at)));
  else c.sort((a,b) => b.buyers - a.buyers || b.avg - a.avg || String(b.at).localeCompare(String(a.at)));
  return c;
}
const tl = n => Math.round(n).toLocaleString('tr-TR') + ' ₺';
// "Alırdım": one tap opens a price field in place; saving it counts as purchase intent at that price.
function buyCtl(i){
  const box = el('div', { class:'buy' });
  const voting = i.left > 0;
  const paint = () => {
    box.replaceChildren();
    const btn = el('button', { type:'button', class:'vote', 'aria-pressed': String(!!i.mine), disabled: i.ex || !voting || !Store.canWrite,
      'aria-label': i.ex ? 'Örnek fikir, talep toplanmıyor' : i.mine ? `Alırdım dedin, ${tl(i.myPrice)}. Değiştir` : `${i.title}: alırdım de, şu an ${i.buyers} kişi`,
      html:`<b>${i.ex ? '–' : i.buyers}</b><span>alırdım</span>` });
    btn.onclick = edit;
    box.append(btn);
    if (i.mine) box.append(el('small', { class:'buy-mine', text:'Sen: ' + tl(i.myPrice) }));
  };
  function edit(){
    box.replaceChildren();
    const f = el('form', { class:'buy-f', 'aria-label':'Kaça alırdın?' });
    const inp = el('input', { type:'text', inputmode:'decimal', placeholder:'Kaça? ₺', 'aria-label':'Kaça alırdın, lira', value: i.myPrice ? String(i.myPrice) : '' });
    const ok = el('button', { type:'submit', class:'btn sig sm', text:'Kaydet' });
    const no = el('button', { type:'button', class:'buy-x', 'aria-label': i.mine ? 'Alırdım demekten vazgeç' : 'Vazgeç', text: i.mine ? 'Geri al' : 'Vazgeç' });
    no.onclick = () => { if (i.mine) Store.setBuy(i.key, 0).catch(()=>{}); else paint(); };
    f.onsubmit = e => {
      e.preventDefault();
      const n = Math.round(parseFloat(inp.value.replace(/\./g,'').replace(',', '.')));
      if (!(n > 0) || n > TERMS.maxPrice){ inp.focus(); inp.setAttribute('aria-invalid','true'); inp.placeholder = 'Fiyat yaz'; return; }
      Store.setBuy(i.key, n).catch(()=>{});
    };
    f.append(inp, ok, no);
    box.append(f);
    inp.focus();
  }
  paint();
  return box;
}
function card(i, ix, opts={}){
  const voting = i.left > 0;
  const meta = el('div', { class:'m' }, [
    el('span', { class:'c', text:i.cat }),
    i.ex ? el('span', { class:'ex', text:'örnek · talep toplanmıyor' }) : el('span', { text: voting ? i.left + ' gün kaldı' : 'süre doldu' }),
    !i.ex && i.buyers ? el('span', { class:'p', text:'ort. ' + tl(i.avg) }) : null,
    !i.ex && i.notes && i.notes.length ? el('span', { text: i.notes.length + ' yorum' }) : null,
    !i.ex && i.handle ? el('span', { text: i.handle }) : null
  ]);
  const href = i.ex ? null : `${ROOT}fikirler/?f=${encodeURIComponent(i.key)}`;
  const title = el('p', { class:'t' }, href ? el('a', { href, text:i.title, onclick(e){ if (opts.dialog){ e.preventDefault(); openIdea(i.key); } } }) : document.createTextNode(i.title));
  const body = el('div', { class:'body' }, [title, meta]);
  if (!i.ex && i.at){ const bar = el('div', { class:'days', 'aria-hidden':'true' }, el('i')); bar.firstChild.style.width = (100 * (TERMS.voteDays - i.left) / TERMS.voteDays) + '%'; body.append(bar); }
  return el('article', { class:'icard' + (ix < 3 && !i.ex && i.buyers ? ' top' : '') }, [el('span', { class:'rank', 'aria-hidden':'true', text: opts.rank === false ? '' : String(ix+1) }), body, buyCtl(i)]);
}
function mountBoard(host, opts={}){
  const render = () => {
    let list = Store.ideas();
    if (opts.filter) list = list.filter(opts.filter);
    list = sortIdeas(list, opts.sort ? opts.sort() : 'top');
    if (opts.limit) list = list.slice(0, opts.limit);
    host.replaceChildren();
    const box = el('div', { class:'ideas' });
    if (!list.length && opts.examples === false){
      host.append(el('div', { class:'empty' }, [el('b', { text: opts.emptyTitle || 'Henüz aday yok.' }), el('p', { text: opts.emptyNote || '' })]));
      return;
    }
    if (!list.length){
      EXAMPLES.slice(0, opts.limit || 3).forEach((x, ix) => box.append(card(x, ix, opts)));
      host.append(box, el('p', { class:'ex-note', text: opts.emptyNote || 'Henüz gönderilmiş fikir yok; bunlar biçimi gösteren örnekler. İlk gerçek fikir buraya düşer.' }));
      return;
    }
    list.forEach((i, ix) => box.append(card(i, ix, opts)));
    host.append(box);
  };
  Store.sub(render);
  return { render };
}

// =========================================================== idea dialog (arena)
let dlg = null;
function openIdea(key, push=true){
  const i = Store.ideas().find(x => x.key === key);
  if (!i) return false;
  if (!dlg){
    dlg = el('dialog', { class:'idlg', 'aria-labelledby':'idlg-h' });
    document.body.append(dlg);
    dlg.addEventListener('close', () => { if (location.search.includes('f=')) history.replaceState(null, '', location.pathname); });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }
  const paint = () => {
    const it = Store.ideas().find(x => x.key === key); if (!it) return;
    const mine = Store.myRate(key);
    dlg.innerHTML = `<header><span class="eyebrow">${esc(it.cat)} · ${it.left > 0 ? it.left + ' gün talep topluyor' : 'süre doldu'}</span><button type="button" class="x" aria-label="Kapat">${ICON.x}</button></header>
    <div class="in">
      <div style="display:grid;gap:14px"><h2 id="idlg-h">${esc(it.title)}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center"><span class="dv"></span>
        <span class="eyebrow">${it.buyers ? 'Ortalama ' + tl(it.avg) + ' · ' : ''}${it.handle ? esc(it.handle) + ' · ' : ''}${it.at ? fmtDate(new Date(it.at)) : ''}</span></div></div>
      <dl><div><dt>Problem</dt><dd>${esc(it.problem || '')}</dd></div><div><dt>Çözüm</dt><dd>${esc(it.solution || '')}</dd></div>
        <div><dt>Temel özellikler</dt><dd><ul>${(it.feats || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></dd></div></dl>
      <section class="crit" aria-label="Üç ölçüt"><span class="eyebrow">Senin puanın · topluluk ortalaması (${it.raters} kişi)</span>
        ${CRIT.map(([c,l]) => `<div class="crit-row"><span>${l}</span><div class="stars" role="group" aria-label="${l} puanı">${[1,2,3,4,5].map(n => `<button type="button" data-c="${c}" data-n="${n}" aria-pressed="${mine[c] === n}" ${Store.canWrite ? '' : 'disabled'}>${n}</button>`).join('')}</div><output>${it.crit[c] ? it.crit[c].toFixed(1) : '–'}</output></div>`).join('')}
      </section>
      <section style="display:grid;gap:14px" aria-labelledby="nt-h"><h3 id="nt-h" style="font-size:17px">Yorumlar, öneriler, endişeler</h3>
        <div class="notes">${it.notes.length ? it.notes.map(n => `<div class="note ${n.kind}"><small>${n.kind === 'oneri' ? 'İyileştirme' : n.kind === 'endise' ? 'Endişe' : 'Yorum'} · ${esc(n.handle || 'isimsiz')}</small><p>${esc(n.text)}</p></div>`).join('') : '<p class="ex-note">İlk yorumu sen yaz.</p>'}</div>
        <form class="note-form"><textarea name="t" maxlength="500" placeholder="Nasıl daha iyi olur? Neyden endişelisin?" aria-label="Yorum"></textarea>
          <div class="row"><div class="chips" role="group" aria-label="Tür">${[['yorum','Yorum'],['oneri','İyileştirme'],['endise','Endişe']].map(([k,l],x) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${x===0}">${l}</button>`).join('')}</div>
          <button type="submit" class="btn sm" ${Store.canWrite ? '' : 'disabled'}>Ekle</button></div></form>
      </section>
    </div>`;
    $('.x', dlg).onclick = () => dlg.close();
    $('.dv', dlg).replaceWith(buyCtl(it));
    $$('.stars button', dlg).forEach(b => b.onclick = () => Store.rate(key, b.dataset.c, Number(b.dataset.n)).catch(()=>{}));
    let kind = 'yorum';
    $$('.note-form .chip', dlg).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('.note-form .chip', dlg).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
    $('.note-form', dlg).onsubmit = e => { e.preventDefault(); const t = e.target.t.value.trim(); if (t.length < 3) return; Store.addNote(key, kind, t, handleGet()).catch(()=>{}); };
  };
  let unsub = Store.sub(() => { if (dlg.open){ const a = document.activeElement; const sel = a && a.matches && a.matches('.note-form textarea') ? a.value : null; paint(); if (sel != null){ const ta = $('.note-form textarea', dlg); ta.value = sel; } } });
  paint();
  dlg.addEventListener('close', () => unsub(), { once:true });
  if (!dlg.open) dlg.showModal();
  if (push) history.replaceState(null, '', '?f=' + encodeURIComponent(key));
  return true;
}

// =========================================================== the process run
// One quick pass (about 5.5 s) in four beats: write the idea, people say "alırdım" with a price,
// pre-sale fills while the product is drawn, then the payout. Plays once when seen, replay at the end.
function mountProc(host, opts={}){
  const text = 'Tezgâh kenarına takılan, katlanınca rafa dönen kesme tahtası.';
  const steps = ['Yaz','Alırdım','Ön satış','Kazan'];
  const BUYERS = 312, AVG = 240, PRE = 300;
  host.classList.add('proc');
  host.innerHTML = `
  <div class="pc-stage" role="img" aria-label="Bir fikrin ürüne dönüşmesi: fikir tek cümleyle yazılır, ${BUYERS} kişi ortalama ${AVG} liraya alırdım der, ön satış ${PRE} siparişe ulaşınca kesme tahtası üretilir, satıştan fikir sahibine ve katkı verenlere yüzde ${TERMS.shareRetail} ile ${TERMS.shareDirect} arası pay ödenir.">
    <div class="pc-dots" aria-hidden="true">${Array.from({length:14}, (_,n) => { const a = n/14*Math.PI*2; return `<i style="left:34%;top:30%;--x:${Math.round(Math.cos(a)*260)}px;--y:${Math.round(Math.sin(a)*200)}px;animation-delay:${(n%7)*60}ms"></i>`; }).join('')}</div>
    <div class="pc-card" aria-hidden="true">
      <div class="h"><span class="tag">Mutfak</span><span class="pc-n">0 / 140</span></div>
      <p class="pc-txt"></p>
      <div class="pc-buy"><span><b class="pc-bn">0</b> kişi “alırdım” dedi</span><span>ort. <b class="pc-avg">0</b> ₺</span></div>
      <div class="pc-bar"><i></i></div>
    </div>
    <div class="pc-prod" aria-hidden="true"><svg viewBox="0 0 240 180">
      <path class="cnt" d="M6 128H234V160H6Z"/>
      <path class="cnt-t" d="M6 128L24 112H234V128Z"/>
      <path class="ghost" d="M62 126L150 126L164 114L76 114Z"/>
      <path class="ln wood" style="--len:420" d="M70 112V42Q70 34 78 34H154Q162 34 162 42V112Z"/>
      <path class="ln edge" style="--len:180" d="M162 42L169 37V107L162 112"/>
      <path class="ln" style="--len:70" d="M106 44h20a5 5 0 0 1 0 10h-20a5 5 0 0 1 0 -10z"/>
      <path class="ln grain" style="--len:300" d="M80 70C100 65 128 75 152 69M80 86C104 82 126 92 152 86M80 101C100 98 128 105 152 100"/>
      <path class="ln" style="--len:120" d="M84 112h18v9h-18zM130 112h18v9h-18z"/>
      <path class="arc" d="M150 120Q206 96 176 44"/><path class="arc-h" d="M170 52l6-9 5 10"/>
      <g class="lbl"><rect x="18" y="138" width="114" height="16" rx="3"/><text x="25" y="149.5">RAFLA · MUCİT: SEN</text></g>
    </svg></div>
    <div class="pc-pre" aria-hidden="true"><div class="pc-row"><span>Ön satış</span><b class="pc-pn">0 / ${PRE}</b></div><div class="pc-bar"><i></i></div><span class="ok">Eşik doldu · üretimde</span></div>
    <div class="pc-pay" aria-hidden="true"><span class="eb">Satıştan pay</span><b><em>%${TERMS.shareRetail}–${TERMS.shareDirect}</em></b><span>fikir sahibine ve ürünü birlikte geliştirenlere</span></div>
    <span class="pc-ex" aria-hidden="true">Örnek akış</span>
    <button type="button" class="pc-replay">${ICON.replay}Tekrar oynat</button>
  </div>
  <ol class="pc-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
  const txt = $('.pc-txt', host), n = $('.pc-n', host), bn = $('.pc-bn', host), avg = $('.pc-avg', host), pn = $('.pc-pn', host), lis = $$('.pc-steps li', host);
  let timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const count = (node, to, ms, fmt) => { const t0 = performance.now(); const f = now => { const p = Math.min(1, (now - t0)/ms); node.textContent = fmt(Math.round(to * (1 - Math.pow(1-p, 3)))); if (p < 1) timers.push(requestAnimationFrame(f)); }; requestAnimationFrame(f); };
  const step = s => lis.forEach((li, ix) => { li.classList.toggle('on', ix === s); li.classList.toggle('past', ix < s); });
  const S = ['s1','s2','s3','s3b','s4','end'];
  function finalState(){
    host.classList.add(...S); txt.textContent = text; n.textContent = text.length + ' / 140';
    bn.textContent = String(BUYERS); avg.textContent = String(AVG); pn.textContent = PRE + ' / ' + PRE; step(3);
  }
  function play(){
    timers.forEach(t => { clearTimeout(t); cancelAnimationFrame(t); }); timers = [];
    host.classList.remove(...S); txt.textContent = ''; n.textContent = '0 / 140'; bn.textContent = '0'; avg.textContent = '0'; pn.textContent = '0 / ' + PRE;
    void host.offsetWidth;
    if (reduce.matches){ finalState(); return; }
    host.classList.add('s1'); step(0);
    const per = 950 / text.length;
    for (let c = 1; c <= text.length; c++) at(c*per, () => { txt.textContent = text.slice(0, c); n.textContent = c + ' / 140'; });
    at(1150, () => { host.classList.add('s2'); step(1); count(bn, BUYERS, 1000, v => String(v)); count(avg, AVG, 1000, v => String(v)); });
    at(2700, () => { host.classList.add('s3'); step(2); count(pn, PRE, 1100, v => v + ' / ' + PRE); });
    at(3800, () => host.classList.add('s3b'));
    at(4300, () => { host.classList.add('s4'); step(3); });
    at(5200, () => host.classList.add('end'));
  }
  $('.pc-replay', host).onclick = play;
  if (opts.manual) return { play };
  if (reduce.matches){ finalState(); return { play }; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); setTimeout(play, opts.delay || 250); } }, { threshold:.35 });
  io.observe(host);
  return { play };
}

// =========================================================== boot
mountChrome();
window.UD = { TERMS, CATS, CASES, CRIT, Store, mountForm, mountCase, mountBoard, mountThu, mountProc, openIdea, nextLive, fmtDay, fmtDate, el, esc, ICON, ROOT };
})();
