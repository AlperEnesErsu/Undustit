/* Undustit interface: menu and footer, the idea form, cards and boards, the idea window, case band, share, report.
   Loaded in order: temel, depo, arayuz, hareket (plain scripts, so pages can call UD right after them).
   Each file shares its top-level names on window.UD_IC and takes what it needs from there. */
(function(){
'use strict';
const { $, $$, CATS, applyText, CRIT, DAY, EXAMPLES, ICON, LANG, LOCALE, ROOT, STIL, Store, T, TERMS, V01, catName, el, esc, etiket, fmtDate, katOf, vakaOf, fmtDay, homeHref, html, inCase, olcu, openCases, reduce, sortIdeas, tl, withStil, yazmaHatasi } = window.UD_IC;
// =========================================================== nav + footer
// The legal pages (kvkk/, kosullar/) stay unlinked drafts until ayar.js sets yasal: true.
const YASAL = !!(window.UD_AYAR || {}).yasal;
const kvkkLink = () => YASAL ? ` <a class="link" href="${ROOT}kvkk/" target="_blank" rel="noopener">${T('ud.kvkk.oku')}</a>` : '';
// TR / EN switch in the bar: a link to the same page in the other language (keeps style and edit mode)
function langSwitch(extra=''){
  return `<span class="lang${extra}" role="group" aria-label="${T('ud.menu.dil')}">${Object.keys(STIL.langs || { tr:1 }).map(l =>
    `<a data-stil-link lang="${l}" hreflang="${l}" href="${STIL.withLang ? STIL.withLang(location.pathname + location.hash, l) : '#'}"${l === LANG ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('')}</span>`;
}
function mountChrome(){
  const cur = html.dataset.page || '';
  const links = [['fikirler',T('ud.menu.fikirler'),'fikirler/'],['nasil',T('ud.menu.nasil'),'nasil/'],['vakalar',T('ud.menu.vakalar'),'vakalar/'],['hikaye',T('ud.menu.hikaye'),'hikaye/']];
  const host = $('[data-ud-nav]');
  if (host){
    host.className = 'nav'; host.id = 'nav';
    host.innerHTML = `<div class="wrap"><a class="brand" lang="en" href="${homeHref()}" aria-label="${T('ud.menu.anasayfa')}"><b>Undust<i>it</i></b></a>
      <div class="nav-r"><nav class="nav-links" id="nav-links" aria-label="${T('ud.menu.ana')}">${links.map(([k,l,h])=>`<a href="${ROOT+h}"${k===cur?' aria-current="page"':''}>${l}</a>`).join('')}${langSwitch(' lang-m')}</nav>
      <a class="btn sig sm" href="${ROOT}fikir/">${T('ud.menu.yaz')}</a><a class="ben" href="${ROOT}giris/" aria-label="${T('ud.menu.hesap')}" title="${T('ud.menu.hesap')}"${cur === 'benim' || cur === 'giris' ? ' aria-current="page"' : ''}>${ICON.ben}</a>${langSwitch()}
      <button type="button" class="menu-t" aria-expanded="false" aria-controls="nav-links" aria-label="${T('ud.menu.menu')}"><svg class="i-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg><svg class="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div></div>`;
    const btn = $('.menu-t', host);
    const set = o => { host.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); };
    btn.onclick = () => set(!host.classList.contains('open'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && host.classList.contains('open')){ set(false); btn.focus(); } });
  }
  const foot = $('[data-ud-foot]');
  const showStilBar = STIL.edit || cur === 'stiller' || /[?&]stil=/.test(location.search);
  if (foot){
    foot.className = 'foot';
    foot.innerHTML = `<div class="wrap foot-sig" aria-hidden="true">Undust<i>it</i></div><div class="wrap"><span>${T('ud.alt.prototip')} <span class="mode-badge" id="mode-badge"><i></i>${T('ud.alt.baglaniyor')}</span></span>
      <nav aria-label="${T('ud.alt.menu')}"><a href="${ROOT}fikir/">${T('ud.menu.yaz')}</a>${links.map(([k,l,h]) => `<a href="${ROOT+h}">${l}</a>`).join('')}<a href="${ROOT}iletisim/">${T('ud.menu.iletisim')}</a>${YASAL ? `<a href="${ROOT}kvkk/">${T('ud.menu.kvkk')}</a><a href="${ROOT}kosullar/">${T('ud.menu.kosullar')}</a>` : ''}</nav></div>
      ${showStilBar ? `<div class="wrap stil-bar"><span>${T('ud.alt.stil')}</span>${Object.entries(STIL.list).map(([k,l]) => `<a data-stil-link href="${STIL.withStil(location.pathname, k)}"${k === STIL.current ? ' aria-current="true"' : ''}>${T('ud.stil.' + k)}</a>`).join('')}<a href="${ROOT}stiller/">${T('ud.alt.hepsi')}</a></div>` : ''}`;
  }
}

// =========================================================== next event
// The pill above a page's title: the next event from yonetim/ with a countdown, "now" while it runs, the date
// when it is more than a week away. No event planned: the pill is not shown at all.
const kalanMetin = ms => { const d = Math.floor(ms/DAY), h = Math.floor(ms%DAY/36e5), m = Math.floor(ms%36e5/6e4);
  return (d ? d + T('ud.persembe.g') + ' ' : '') + h + T('ud.persembe.s') + ' ' + String(m).padStart(2, '0') + T('ud.persembe.dk'); };
const saatMetin = d => d.toLocaleTimeString(LOCALE, { hour:'2-digit', minute:'2-digit' });
function mountThu(node){
  node.hidden = true;
  Store.etkinlikler().then(list => {
    const e = list[0];
    if (!e) return;
    node.hidden = false;
    const tick = () => {
      const ms = e.bas - Date.now(), simdi = ms <= 0 && Date.now() < e.son;
      node.classList.toggle('on', simdi);
      node.innerHTML = `<i class="dot" aria-hidden="true"></i><span>${esc(simdi ? T('ud.etkinlik.simdi', { baslik:e.baslik }) : e.baslik)}</span>` +
        (simdi ? '' : `<b>${ms > 7 * DAY ? fmtDate(e.bas) : kalanMetin(ms)}</b>`);
      node.setAttribute('title', fmtDay(e.bas) + ' ' + saatMetin(e.bas));
    };
    tick(); setInterval(tick, 30000);
  });
}

// =========================================================== share
// An idea needs buyers. "Paylaş" opens a panel: a ready image card (Instagram post or story, WhatsApp status),
// each network's own share link, the phone's share sheet and the plain link. f = { title, key, label, buyers,
// avg, benim }; benim: the writer is sharing their own idea, so the words are theirs ("Bir fikrim var").
const ideaUrl = key => new URL(withStil(ROOT + 'fikirler/?f=' + encodeURIComponent(key)), location.href).href;

// the card, drawn on a canvas in the site's look: 1080×1350 (4:5) fits a feed post and crops cleanly to a story
async function shareCard(f){
  const W = 1080, H = 1350, M = 92, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), INK = '#1B1530', SERIF = '"Bricolage Grotesque", Arial, sans-serif', MONO = '"Geist Mono", ui-monospace, monospace', BODY = 'Geist, Arial, sans-serif';
  try { await Promise.all(['800 96px "Bricolage Grotesque"', '400 30px "Geist Mono"', '500 34px Geist'].map(s => document.fonts.load(s))); } catch(e){}
  x.fillStyle = '#FCF9F3'; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(27,21,48,.09)';
  for (let i = 30; i < W; i += 40) for (let j = 30; j < H; j += 40) { x.beginPath(); x.arc(i, j, 2, 0, 7); x.fill(); }
  // wordmark
  x.font = '800 54px ' + SERIF; x.textBaseline = 'alphabetic'; x.fillStyle = INK; x.fillText('Undust', M, M + 46);
  x.fillStyle = '#E8462A'; x.fillText('it', M + x.measureText('Undust').width, M + 46);
  // the eyebrow: whose idea, and its case or category
  x.font = '400 28px ' + MONO; x.fillStyle = '#625B78';
  x.fillText((f.benim ? T('ud.kart.paylas.benim') : T('ud.kart.paylas.fikir')).toLocaleUpperCase(LOCALE) + (f.label ? '  ·  ' + f.label.toLocaleUpperCase(LOCALE) : ''), M, 300);
  // the sentence, as large as it fits (5 lines at most)
  const satirlar = size => {
    x.font = '800 ' + size + 'px ' + SERIF;
    const out = []; let s = '';
    for (const w of ('“' + f.title + '”').split(/\s+/)){ const t = s ? s + ' ' + w : w; if (x.measureText(t).width > W - 2 * M && s){ out.push(s); s = w; } else s = t; }
    out.push(s); return out;
  };
  let size = 104, l = satirlar(size);
  while ((l.length > 5 || l.length * size * 1.08 > 620) && size > 52) l = satirlar(size -= 6);
  x.fillStyle = INK; l.forEach((s, i) => x.fillText(s, M, 380 + size + i * size * 1.08));
  // the ask, in a box with the site's hard shadow
  const by = 1010, bh = 200, bw = W - 2 * M, r = 28;
  const kutu = (dx, fill) => { x.beginPath(); x.roundRect(M + dx, by + dx, bw, bh, r); x.fillStyle = fill; x.fill(); };
  kutu(10, INK); kutu(0, '#FFFFFF'); x.lineWidth = 4; x.strokeStyle = INK; x.beginPath(); x.roundRect(M, by, bw, bh, r); x.stroke();
  x.font = '800 52px ' + SERIF; x.fillStyle = INK; x.fillText(T('ud.kart.paylas.soru'), M + 40, by + 80);
  x.font = '500 32px ' + BODY; x.fillStyle = '#3F3856';
  x.fillText(f.buyers ? T('ud.kart.paylas.talep', { n:f.buyers.toLocaleString(LOCALE), fiyat:tl(f.avg) }) : T('ud.kart.paylas.ilk'), M + 40, by + 140);
  // where to go
  x.font = '400 28px ' + MONO; x.fillStyle = '#5B2EFF'; x.fillText(T('ud.kart.paylas.nerede'), M, H - 62);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}

function shareIdea(f, yer){
  const url = ideaUrl(f.key), metin = f.benim ? T('ud.paylas.metin.benim', { baslik:f.title }) : T('ud.paylas.metin', { baslik:f.title });
  const enc = encodeURIComponent, tam = metin + ' ' + url;
  const agi = [
    ['whatsapp', 'WhatsApp', 'https://wa.me/?text=' + enc(tam)],
    ['x', 'X', 'https://twitter.com/intent/tweet?text=' + enc(metin) + '&url=' + enc(url)],
    ['linkedin', 'LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc(url)],
    ['facebook', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)],
    // Reddit takes a title and a link; the person picks the community (r/somebodymakethis, r/shutupandtakemymoney…)
    ['reddit', 'Reddit', 'https://www.reddit.com/submit?url=' + enc(url) + '&title=' + enc(metin.replace(/:\s*$/, ''))]
  ];
  const d = el('dialog', { class:'idlg paylas-dlg', 'aria-labelledby':'pl-h' });
  d.innerHTML = `<header><h2 id="pl-h">${f.benim ? T('ud.paylas.baslik.benim') : T('ud.paylas.baslik')}</h2><button type="button" class="x" aria-label="${T('ud.kapat')}">${ICON.x}</button></header>
    <div class="pl-ic"><figure class="pl-kart"><span>${T('ud.paylas.hazirlaniyor')}</span></figure>
      <div class="pl-yan"><p>${T('ud.paylas.not')}</p>
        <div class="pl-dugme"><button type="button" class="btn sig pl-sistem" hidden>${T('ud.paylas.gorselle')}</button><a class="btn alt pl-indir" download="undustit-fikir.png" hidden>${T('ud.paylas.indir')}</a></div>
        <div class="pl-agi">${agi.map(([k, ad, u]) => `<a class="btn alt sm" data-ag="${k}" href="${u}" target="_blank" rel="noopener">${ad}</a>`).join('')}</div>
        <div class="pl-link"><input readonly value="${esc(url)}" aria-label="${T('ud.paylas.link')}"><button type="button" class="btn alt sm pl-kopya">${T('ud.paylas.kopyala')}</button></div>
      </div></div>`;
  document.body.append(d);
  const kapat = () => d.close();
  d.addEventListener('close', () => { const u = $('.pl-indir', d).href; if (u && u.startsWith('blob:')) URL.revokeObjectURL(u); d.remove(); });
  $('.x', d).onclick = kapat;
  d.addEventListener('click', e => { if (e.target === d) kapat(); });
  d.querySelectorAll('[data-ag]').forEach(a => a.addEventListener('click', () => olcu('Paylaş', { yer, ag:a.dataset.ag })));
  const kopya = $('.pl-kopya', d);
  kopya.onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
    .then(() => { kopya.textContent = T('ud.paylas.kopyalandi'); olcu('Paylaş', { yer, ag:'link' }); }, () => $('input', d).select());
  d.showModal();
  shareCard(f).then(blob => {
    if (!blob) return;
    const u = URL.createObjectURL(blob), fig = $('.pl-kart', d);
    fig.replaceChildren(el('img', { src:u, alt:T('ud.paylas.gorsel.alt', { baslik:f.title }) }));
    const ind = $('.pl-indir', d); ind.href = u; ind.hidden = false;
    ind.addEventListener('click', () => olcu('Paylaş', { yer, ag:'görsel' }));
    // phones: the share sheet takes the image itself, so it can go straight to Instagram or a story
    const dosya = new File([blob], 'undustit-fikir.png', { type:'image/png' });
    if (navigator.canShare && navigator.canShare({ files:[dosya] })){
      const s = $('.pl-sistem', d); s.hidden = false;
      s.onclick = () => navigator.share({ files:[dosya], text:tam }).then(() => olcu('Paylaş', { yer, ag:'sistem' })).catch(() => {});
    }
  });
}

// =========================================================== "haber ver"
// Optional and one field: the address is remembered on this browser so the next one is a single tap.
const mailGet = () => { try { return localStorage.getItem('ud-eposta') || ''; } catch(e){ return ''; } };
const mailSet = v => { try { localStorage.setItem('ud-eposta', v); } catch(e){} };
function haberForm(key, tur){
  const f = el('form', { class:'haber', novalidate:true, 'aria-label':T('ud.haber.' + tur) });
  const p = el('p', { text:T('ud.haber.' + tur) });
  const inp = el('input', { type:'email', autocomplete:'email', maxlength:'160', placeholder:T('ud.haber.ipucu'), 'aria-label':T('ud.haber.eposta'), value:mailGet() });
  const ok = el('button', { type:'submit', class:'btn alt sm', text:T('ud.haber.gonder') });
  const durum = el('small', { class:'haber-d', role:'status' });
  f.append(p, el('div', { class:'haber-r' }, [inp, ok]), durum);
  f.onsubmit = e => {
    e.preventDefault();
    const v = inp.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ inp.setAttribute('aria-invalid', 'true'); durum.textContent = T('ud.haber.hata.eposta'); inp.focus(); return; }
    ok.disabled = true; inp.removeAttribute('aria-invalid');
    Store.haberVer(v, key, tur).then(() => {
      mailSet(v); olcu('Haber ver', { tur });
      f.replaceChildren(el('p', { class:'haber-tamam', text:T('ud.haber.tamam', { eposta:v }) }));
    }).catch(() => { ok.disabled = false; durum.textContent = T('ud.haber.hata.genel'); });
  };
  return f;
}

// =========================================================== idea form
const handleGet = () => { try { return localStorage.getItem('ud-handle') || ''; } catch(e){ return ''; } };
const handleSet = v => { try { localStorage.setItem('ud-handle', v); } catch(e){} };
function feeLine(){
  const f = TERMS.fee, n = Store.myCount();
  const now = tl(n ? f.next : f.first);
  return T('ud.form.ucret', { ilk:tl(f.first), sonra:tl(f.next), bu:now }) + (f.charged ? '' : ' ' + T('ud.form.odemeyok'));
}
// Quick sign-up in front of every idea form, for someone without an account: Google (when it is on in Supabase),
// an e-mail link, or "continue without". Never a wall: the choice is remembered and the form opens right after.
const KAYIT_GEC = 'ud-kayit-gec';
function kayitAdimi(host, f, pitch){
  try { if (localStorage.getItem(KAYIT_GEC) === '1') return; } catch(e){}
  Store.hesap().then(h => {
    if (!h || !h.anonim || h.bekleyen) return;   // preview mode, signed in, or the e-mail link is on its way
    const kart = el('section', { class:'kayit', 'aria-label':T('fikir.kayit.baslik') });
    kart.innerHTML = `<h2>${T('fikir.kayit.baslik')}</h2><p>${T('fikir.kayit.metin')}</p>
      <div class="kayit-google" hidden><button type="button" class="btn google">${ICON.google}<span>${T('benim.js.google')}</span></button></div>
      <form novalidate><input type="email" name="e" autocomplete="email" maxlength="160" placeholder="${T('fikir.kayit.ipucu')}" aria-label="${T('fikir.kayit.ipucu')}"><button type="submit" class="btn sig sm">${T('fikir.kayit.gonder')}</button></form>
      <p class="durum" role="status" aria-live="polite"></p>
      <button type="button" class="link kayit-gec">${T('fikir.kayit.gec')}</button>`;
    host.prepend(kart); f.hidden = true;
    const durum = $('.durum', kart), say = (t, k) => { durum.textContent = t; durum.className = 'durum' + (k ? ' ' + k : ''); };
    const ac = odak => { kart.remove(); f.hidden = false; if (odak) pitch.focus(); };
    $('.kayit-gec', kart).onclick = () => { try { localStorage.setItem(KAYIT_GEC, '1'); } catch(e){} ac(true); };
    Store.googleAcik().then(acik => {
      if (!acik) return;
      const g = $('.btn.google', kart); g.parentNode.hidden = false;
      g.onclick = () => { g.disabled = true; olcu('Google ile devam'); Store.google(location.href).catch(() => { g.disabled = false; say(T('benim.js.hata.google'), 'bad'); }); };
    });
    const ef = $('form', kart);
    ef.onsubmit = e => {
      e.preventDefault();
      const v = ef.e.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ say(T('ud.haber.hata.eposta'), 'bad'); ef.e.focus(); return; }
      $('button', ef).disabled = true; say(T('benim.js.gidiyor'));
      Store.epostaBagla(v, location.href).then(() => {
        olcu('Hesap bağla'); mailSet(v);
        // the link can wait; the idea is written now
        ef.remove(); $('.kayit-gec', kart).remove(); say(T('fikir.kayit.gonderildi', { eposta:v }), 'ok'); f.hidden = false;
      }).catch(err => { $('button', ef).disabled = false; say(err && err.status === 429 ? T('benim.js.hata.sik') : T('benim.js.hata.genel'), 'bad'); });
    };
  }).catch(() => {});
}
function mountForm(host, opts={}){
  const id ='f' + Math.random().toString(36).slice(2,7);
  host.innerHTML = `
  <form class="iform" novalidate aria-label="${T('ud.form.aria')}">
    <div class="if-top">
      <label for="${id}-p"><span class="eyebrow k">${opts.label || T('ud.form.etiket')}</span><span class="if-count" aria-live="polite">0 / 140</span></label>
      <textarea id="${id}-p" class="if-pitch" rows="1" maxlength="160" placeholder="${opts.placeholder || T('ud.form.ipucu')}" required></textarea>
      <button type="button" class="btn sig if-next" aria-controls="${id}-more" aria-expanded="false">${T('ud.form.devam')} ${ICON.arrow}</button>
    </div>
    <div class="if-more" id="${id}-more"><div><div class="if-body">
      <div class="if-field if-vaka-alan" role="group" aria-labelledby="${id}-vl" hidden><span id="${id}-vl">${T('ud.form.vaka')} <small>${T('ud.form.vaka.not')}</small></span><div class="chips if-vaka"></div></div>
      <div class="if-field" role="group" aria-labelledby="${id}-cl"><span id="${id}-cl">${T('ud.form.kategori')} <small class="if-cat-not"></small></span><div class="chips if-cats"></div></div>
      <details class="if-detay"><summary>${T('ud.form.detay')} <small>${T('ud.form.detay.not')}</small></summary><div class="if-detay-in">
      <div class="if-two">
        <label class="if-field"><span>${T('ud.form.problem')} <small>${T('ud.form.kisa')}</small></span><textarea name="problem" maxlength="400" placeholder="${T('ud.form.problem.ipucu')}"></textarea></label>
        <label class="if-field"><span>${T('ud.form.cozum')} <small>${T('ud.form.kisa')}</small></span><textarea name="solution" maxlength="400" placeholder="${T('ud.form.cozum.ipucu')}"></textarea></label>
      </div>
      <div class="if-field" role="group" aria-labelledby="${id}-fl"><span id="${id}-fl">${T('ud.form.ozellik')} <small>${T('ud.form.ozellik.not')}</small></span>
        <div class="feats"><input name="f1" maxlength="80" placeholder="${T('ud.form.oz1')}" aria-label="${T('ud.form.oz1')}"><input name="f2" maxlength="80" placeholder="${T('ud.form.oz2')}" aria-label="${T('ud.form.oz2.aria')}"><input name="f3" maxlength="80" placeholder="${T('ud.form.oz3')}" aria-label="${T('ud.form.oz3.aria')}"></div></div>
      </div></details>
      <label class="if-field" style="max-width:320px"><span>${T('ud.form.ad')} <small>${T('ud.form.istege')}</small></span><input name="handle" maxlength="30" autocomplete="nickname" placeholder="${T('ud.form.ad.ipucu')}"></label>
      <div class="if-foot"><p class="if-fee"></p><button type="submit" class="btn sig">${T('ud.form.gonder')} ${ICON.arrow}</button></div>
      <p class="if-status" role="status" aria-live="polite"></p>
    </div></div></div>
    <div class="if-done" tabindex="-1"></div>
  </form>`;
  const f = $('form', host), pitch = $('.if-pitch', f), count = $('.if-count', f), next = $('.if-next', f), status = $('.if-status', f);
  // Two separate questions: which case it is for (or none), and what kind of product it is. A case idea
  // needs no category (the case groups it), so on a case page the sentence alone is enough.
  let cat = '', vaka = opts.caseId || '';
  const cats = $('.if-cats', f), vakalar = $('.if-vaka', f), vakaAlan = $('.if-vaka-alan', f), catNot = $('.if-cat-not', f);
  const chip = (row, key, value, text, on, cls) => row.append(el('button', { type:'button', class:'chip' + (cls ? ' ' + cls : ''), 'aria-pressed': String(on), ['data-' + key]: value, text, onclick(){
    if (key === 'cat') pickCat(value); else pickVaka(value); } }));
  const mark = (row, key, v) => $$('.chip', row).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[key] === v)));
  const pickCat = c => { cat = c; mark(cats, 'cat', c); };
  const pickVaka = v => { vaka = v; mark(vakalar, 'vaka', v); catNot.textContent = vaka ? T('ud.form.istege') : ''; };
  const paint = () => {
    cats.replaceChildren(); CATS.forEach(c => chip(cats, 'cat', c, catName(c), c === cat));
    // the case row: only while a case is open, and not on a case's own page (the case is already known)
    const acik = openCases();
    // drop a chosen case only once the list has arrived and it is really not open
    if (vaka && acik.length && !acik.some(c => c.id === vaka)) vaka = '';
    vakaAlan.hidden = !acik.length || !!opts.caseId;
    vakalar.replaceChildren();
    acik.forEach(c => chip(vakalar, 'vaka', c.id, catName(c.short), c.id === vaka, 'case'));
    chip(vakalar, 'vaka', '', T('ud.form.vaka.yok'), !vaka);
    catNot.textContent = vaka ? T('ud.form.istege') : '';
  };
  paint();
  Store.cases().then(paint);
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
  // only the sentence plus a case or a category is needed: on a case page Enter sends right away
  const toCat = () => ($('.chip[aria-pressed="true"]', cats) || $('.chip', cats)).focus();
  pitch.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); open(); if ((cat || vaka) && pitch.value.trim().length >= 10) f.requestSubmit(); else toCat(); } });
  next.onclick = () => { open(); if (pitch.value.trim().length < 10) pitch.focus(); else toCat(); };
  if (opts.open) open();
  const say = (t, bad) => { status.textContent = t; status.classList.toggle('bad', !!bad); };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const title = pitch.value.trim(), feats = [f.f1, f.f2, f.f3].map(x => x.value.trim()).filter(Boolean);
    const fail = (msg, node) => { say(msg, true); open(); node && node.focus(); };
    if (title.length < 10) return fail(T('ud.form.hata.kisa'), pitch);
    if (title.length > 140) return fail(T('ud.form.hata.uzun'), pitch);
    if (!cat && !vaka) return fail(T('ud.form.hata.kategori'), $('.chip', cats));
    if (!Store.canWrite) return fail(T('ud.form.hata.izin'));
    const handle = f.handle.value.trim(); handleSet(handle);
    say(T('ud.form.gonderiliyor'));
    $('[type=submit]', f).disabled = true;
    const isCase = openCases().find(c => c.id === vaka);
    // a case idea without a category keeps the case's label as its category, as older ideas do
    Store.addIdea({ title, cat: cat || (isCase ? isCase.short : ''), caseId: isCase ? isCase.id : null, problem:f.problem.value.trim(), solution:f.solution.value.trim(), feats, handle }).then(k => {
      const end = new Date(Date.now() + TERMS.voteDays*DAY);
      const done = $('.if-done', f);
      done.innerHTML = `<span class="eyebrow k">${T('ud.gonderildi.etiket')}</span><h3>${esc(title)}</h3>
        <dl><div><dt>${T('ud.gonderildi.bitis')}</dt><dd>${fmtDate(end)}</dd></div><div><dt>${T('ud.gonderildi.olcut')}</dt><dd>${CRIT.map(c => c[1]).join(' · ')}</dd></div></dl>
        <p class="lead" style="font-size:15px">${T('ud.gonderildi.not')}</p>
        <div class="acts"><button type="button" class="btn sig share">${T('ud.paylas.bul')} ${ICON.arrow}</button><a class="btn alt" href="${ROOT}fikirler/?f=${encodeURIComponent(k)}">${T('ud.gonderildi.gor')}</a><button type="button" class="btn alt again">${T('ud.gonderildi.yeni')}</button></div>`;
      f.classList.add('done'); done.focus();
      const sh = $('.share', done); sh.onclick = () => { olcu('Paylaş', { yer:'gönderim' }); shareIdea({ title, key:k, label:catName(isCase ? isCase.short : cat), buyers:0, avg:0, benim:true }, 'gönderim'); };
      done.append(haberForm(k, 'fikrim'));
      olcu('Fikir gönderildi', { vaka: isCase ? isCase.id : 'yok' });
      $('.again', done).onclick = () => { f.reset(); pickCat(''); $('.if-detay', f).open = false; f.handle.value = handleGet(); pitch.value = ''; len(); f.classList.remove('done'); $('[type=submit]', f).disabled = false; say(''); pitch.focus(); };
      opts.onSent && opts.onSent(k);
    }).catch(err => {
      $('[type=submit]', f).disabled = false;
      say(err && err.code === 'invalid_argument' ? T('ud.form.hata.izin2') : T('ud.form.hata.genel'), true);
    });
  });
  if (opts.focus) setTimeout(() => pitch.focus({ preventScroll:true }), 50);
  kayitAdimi(host, f, pitch);
  const useCase = id => {
    const c = openCases().find(x => x.id === id); if (!c) return;
    pickVaka(c.id);
    open(); f.scrollIntoView({ block:'center', behavior: reduce.matches ? 'auto' : 'smooth' }); pitch.focus({ preventScroll:true });
  };
  return { focus: () => pitch.focus(), open, useCase };
}

// =========================================================== open case card
// The surplus-stock angle on the home pages: one open case, its numbers, and a one-tap way to write for it.
// The newest open case is shown; with none open the band stays hidden.
// Vaka 01 keeps its bolt drawing and text; other cases show their own numbers over a pallet of stock.
const BOLT = `<g class="cb-l"><path d="M24 52h26v46H24z"/><path d="M50 60h10v30H50z"/><path d="M60 66h150v18H60z"/>
      ${Array.from({length:12}, (_,k) => `<path class="th" d="M${120 + k*7.5} 66l4 18"/>`).join('')}
      <path d="M176 56h16v38h-16z"/><path d="M192 60h8v30h-8z"/></g>
      <path class="cb-c" d="M14 75H232" />
      <g class="cb-d"><path d="M60 108v12M210 108v12M60 116H210"/><text x="135" y="132" text-anchor="middle">l = 90</text><text x="226" y="70">M10</text></g>`;
const PALLET = `<g class="cb-l"><path d="M40 112h180v8H40z"/><path d="M48 120h14v8H48zM123 120h14v8h-14zM198 120h14v8h-14z"/>
      <path d="M50 72h74v40H50z"/><path d="M128 72h82v40h-82z"/><path d="M86 34h82v38H86z"/>
      <path class="th" d="M87 72v40M169 72v40M127 34v38M50 92h74M128 92h82"/></g>
      <path class="cb-c" d="M18 128H242"/>`;
function mountCase(host, opts={}){
  const box = host.closest('section') || host;
  box.hidden = true;
  Store.cases().then(() => {
    const c = openCases()[0];
    if (!c) return;
    const v01 = c.id === V01.id;
    box.hidden = false;
    host.classList.add('case-band');
    host.innerHTML = `
    <div class="cb-txt">
      <span class="cb-tag"><i aria-hidden="true"></i>${T('ud.vaka.acik')} · ${esc(c.tag)}</span>
      <h2 class="cb-h">${v01 ? T('ud.vaka.baslik') : esc(c.name)}</h2>
      ${v01 ? `<p>${T('ud.vaka.metin')}</p>` : c.ozet ? `<p>${esc(c.ozet)}</p>` : ''}
      <dl><div><dt>${T('ud.vaka.adet')}</dt><dd>${c.adet ? c.adet.toLocaleString(LOCALE) : '–'}</dd></div><div><dt>${T('ud.vaka.olcu')}</dt><dd>${v01 ? 'M10 × 90 · 8.8' : esc([c.olcu, c.sinif].filter(Boolean).join(' · ') || '–')}</dd></div><div><dt>${T('ud.vaka.gelen')}</dt><dd class="cb-n">0</dd></div></dl>
      <div class="cb-acts"><a class="btn sig" href="${ROOT}fikir/?vaka=${encodeURIComponent(c.id)}" data-case>${T('ud.vaka.yaz')} ${ICON.arrow}</a><a class="btn alt" href="${ROOT + c.href}">${T('ud.vaka.gor')}</a><a class="link" href="${ROOT}vakalar/">${T('ud.vaka.ac')}</a></div>
    </div>
    <figure class="cb-art" aria-hidden="true"><svg viewBox="0 0 260 150">${v01 ? BOLT : PALLET}</svg>${c.adet ? `<figcaption>× ${c.adet.toLocaleString(LOCALE)}</figcaption>` : ''}</figure>`;
    const a = $('[data-case]', host);
    if (opts.form) a.addEventListener('click', e => { e.preventDefault(); opts.form.useCase(c.id); });
    Store.sub(() => { $('.cb-n', host).textContent = String(Store.ideas().filter(i => inCase(i, c)).length); });
  });
}

// =========================================================== live numbers
// Ideas, "alırdım", the money behind them and open cases, from the live data. Hidden below `min` real
// ideas, so a young site never advertises tiny numbers; the figures count up once when first shown.
function mountStats(host, opts={}){
  const min = opts.min || 5;
  const box = host.closest('section') || host;
  box.hidden = true;
  let shown = false;
  const paint = () => {
    const list = Store.ideas();
    if (list.length < min){ box.hidden = true; return; }
    const alici = list.reduce((t, i) => t + i.buyers, 0);
    const tutar = list.reduce((t, i) => t + i.buyers * i.avg, 0);
    const rows = [[list.length, T('ud.sayi.fikir'), String], [alici, T('ud.sayi.alirdim'), String], [tutar, T('ud.sayi.tutar'), tl], [openCases().length, T('ud.sayi.vaka'), String]];
    host.className = 'sayilar';
    host.innerHTML = rows.map(([n, l]) => `<div><b data-n="${Math.round(n)}">0</b><span>${l}</span></div>`).join('');
    const bs = $$('b', host);
    box.hidden = false;
    rows.forEach(([n, , fmt], ix) => {
      const to = Math.round(n), b = bs[ix];
      if (shown || reduce.matches){ b.textContent = fmt === tl ? tl(to) : to.toLocaleString(LOCALE); return; }
      const t0 = performance.now(), ms = 1100;
      const f = now => { const p = Math.min(1, (now - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - p, 3))); b.textContent = fmt === tl ? tl(v) : v.toLocaleString(LOCALE); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    shown = true;
  };
  Store.cases().then(() => Store.sub(paint));
}

// =========================================================== boards
// How close an idea is to Thursday: the five open ideas with the most "alırdım" are the candidates
// (the home page's second round). Returns {aday:rank} for one of them, {eksik:n} for how many more
// "alırdım" it needs to pass the fifth, or null when demand is closed or it is an example.
function hedef(i, list = Store.ideas()){
  if (i.ex || !(i.left > 0)) return null;
  const top = sortIdeas(list.filter(x => x.left > 0 && x.buyers > 0), 'top').slice(0, 5);
  const ix = top.findIndex(x => x.key === i.key);
  if (ix > -1) return { aday: ix + 1 };
  return { eksik: top.length < 5 ? Math.max(1, 1 - i.buyers) : top[4].buyers - i.buyers + 1 };
}
const hedefMetni = h => !h ? '' : h.aday ? T('ud.hedef.aday', { n:h.aday }) : T('ud.hedef.eksik', { n:h.eksik });
// "Alırdım": one tap opens a price field in place; saving it counts as purchase intent at that price.
// The card that was just saved gets .just once, so a style can celebrate it.
let justBought = null;
// rounded to steps people say out loud: 10s under 200, 50s under 1000, 100s above
const nice = n => { const st = n < 200 ? 10 : n < 1000 ? 50 : 100; return Math.max(st, Math.round(n / st) * st); };
function quickPrices(i){
  const base = i.buyers ? [.75, 1, 1.25].map(k => nice(i.avg * k)) : [150, 300, 500];
  return [...new Set(base)].filter(n => n <= TERMS.maxPrice);
}
function buyCtl(i){
  const box = el('div', { class:'buy' });
  const voting = i.left > 0;
  const paint = () => {
    box.replaceChildren();
    // the accessible name starts with the visible text ("3 alırdım") and adds the context after it
    const more = i.ex ? ' ' + T('ud.al.ornek') : i.mine ? ': ' + T('ud.al.benim', { baslik:esc(i.title), fiyat:tl(i.myPrice) }) : `: ${esc(i.title)}`;
    // an example looks like the real control; a tap says what it is instead of doing nothing
    const btn = el('button', { type:'button', class:'vote', 'aria-pressed': String(!!i.mine), disabled: !i.ex && (!voting || !Store.canWrite),
      html:`<b>${i.ex ? '–' : i.buyers}</b> <span>${T('ud.al.alirdim')}</span><span class="sr">${more}</span>` });
    btn.onclick = i.ex ? () => { if (!$('.buy-ex', box)) box.append(el('small', { class:'buy-ex', role:'status', text:T('ud.al.ornek.not') })); } : edit;
    box.append(btn);
    if (i.mine) box.append(el('small', { class:'buy-mine', text:T('ud.al.sen', { fiyat:tl(i.myPrice) }) }));
    if (justBought === i.key){ box.classList.add('just'); justBought = null; }
  };
  function edit(){
    box.replaceChildren();
    const f = el('form', { class:'buy-f', 'aria-label':T('ud.al.form') });
    const inp = el('input', { type:'text', inputmode:'decimal', placeholder:T('ud.al.ipucu'), 'aria-label':T('ud.al.aria'), value: i.myPrice ? String(i.myPrice) : '' });
    const ok = el('button', { type:'submit', class:'btn sig sm', text:T('ud.al.kaydet') });
    const no = el('button', { type:'button', class:'buy-x', 'aria-label': i.mine ? T('ud.al.geri.aria') : T('ud.al.vazgec'), text: i.mine ? T('ud.al.geri') : T('ud.al.vazgec') });
    no.onclick = () => { if (i.mine) Store.setBuy(i.key, 0).catch(yazmaHatasi); else paint(); };
    f.onsubmit = e => {
      e.preventDefault();
      const n = Math.round(parseFloat(LANG === 'en' ? inp.value.replace(/,/g,'') : inp.value.replace(/\./g,'').replace(',', '.')));
      if (!(n > 0) || n > TERMS.maxPrice){ inp.focus(); inp.setAttribute('aria-invalid','true'); inp.placeholder = T('ud.al.fiyatyaz'); return; }
      justBought = i.key;
      olcu('Alırdım', { yol:'yazarak' });
      Store.setBuy(i.key, n).catch(yazmaHatasi);
    };
    f.append(inp, ok, no);
    // one tap: three prices around what others already said (or typical ones), typing stays possible
    const q = el('div', { class:'buy-q', role:'group', 'aria-label':T('ud.al.hizli') });
    quickPrices(i).forEach(n => q.append(el('button', { type:'button', class:'chip', text:tl(n), 'aria-pressed': String(n === i.myPrice),
      onclick(){ justBought = i.key; olcu('Alırdım', { yol:'hazır fiyat' }); Store.setBuy(i.key, n).catch(yazmaHatasi); } })));
    box.append(q, f);
    // a price button gets the focus, so a phone does not open its keyboard unasked
    q.firstChild.focus();
  }
  paint();
  return box;
}
function card(i, ix, opts={}){
  const voting = i.left > 0;
  const meta = el('div', { class:'m' }, [
    vakaOf(i) ? el('span', { class:'vk', text:catName(vakaOf(i).short) }) : null,
    katOf(i) ? el('span', { class:'c', text:catName(katOf(i)) }) : null,
    i.ex ? el('span', { class:'ex', text:T('ud.kart.ornek') }) : el('span', { text: voting ? T('ud.kart.kaldi', { n:i.left }) : T('ud.kart.bitti') }),
    !i.ex && i.buyers ? el('span', { class:'p', text:T('ud.kart.ort', { fiyat:tl(i.avg) }) }) : null,
    !i.ex && i.noteCount ? el('span', { text: T('ud.kart.yorum', { n:i.noteCount }) }) : null,
    !i.ex && i.handle ? el('span', { text: i.handle }) : null
  ]);
  const href = i.ex ? null : `${ROOT}fikirler/?f=${encodeURIComponent(i.key)}`;
  const title = el('p', { class:'t' }, href ? el('a', { href, text:i.title, onclick(e){ if (opts.dialog){ e.preventDefault(); openIdea(i.key); } } }) : document.createTextNode(i.title));
  const body = el('div', { class:'body' }, [title, meta]);
  if (opts.hedef && hedef(i)){ const h = hedef(i); body.append(el('p', { class:'hedef' + (h.aday ? ' aday' : ''), text:hedefMetni(h) })); }
  if (!i.ex && i.at){ const bar = el('div', { class:'days', 'aria-hidden':'true' }, el('i')); bar.firstChild.style.width = (100 * (TERMS.voteDays - i.left) / TERMS.voteDays) + '%'; body.append(bar); }
  return el('article', { class:'icard' + (ix < 3 && !i.ex && i.buyers ? ' top' : '') }, [el('span', { class:'rank', 'aria-hidden':'true', text: opts.rank === false ? '' : String(ix+1) }), body, buyCtl(i)]);
}
function mountBoard(host, opts={}){
  const render = () => {
    let list = Store.ideas();
    if (opts.filter) list = list.filter(opts.filter);
    list = sortIdeas(list, opts.sort ? opts.sort() : 'top');
    if (opts.limit) list = list.slice(0, opts.limit);
    if (opts.onCount) opts.onCount(list.length);
    host.replaceChildren();
    const box = el('div', { class:'ideas' });
    if (!list.length && opts.examples === false){
      host.append(el('div', { class:'empty' }, [el('b', { text: opts.emptyTitle || T('ud.liste.bos') }), el('p', { text: opts.emptyNote || '' })]));
      return;
    }
    if (!list.length){
      EXAMPLES.slice(0, opts.limit || 3).forEach((x, ix) => box.append(card(x, ix, opts)));
      host.append(box, el('p', { class:'ex-note', text: opts.emptyNote || T('ud.liste.ornekler') }));
      return;
    }
    list.forEach((i, ix) => box.append(card(i, ix, opts)));
    host.append(box);
  };
  Store.sub(render);
  return { render };
}

// =========================================================== "Bildir"
// A quiet link at the foot of an idea: a reason, an optional note, sent once per person per idea.
// The open state and what was already sent survive the window's repaints (the store refreshes it).
const bildirildi = new Set();
let bildirAcik = null;
const NEDENLER = ['spam','uygunsuz','kopya','yaniltici','diger'];
function bildirCtl(key){
  const box = el('div', { class:'bildir' });
  if (bildirildi.has(key)){ box.append(el('p', { class:'bildir-tamam', text:T('ud.bildir.tamam') })); return box; }
  if (bildirAcik !== key){
    box.append(el('button', { type:'button', class:'link bildir-ac', text:T('ud.bildir.ac'), onclick(){ bildirAcik = key; box.replaceWith(bildirCtl(key)); $('.bildir input', dlg).focus(); } }));
    return box;
  }
  const f = el('form', { class:'bildir-f', novalidate:true, 'aria-label':T('ud.bildir.ac') });
  f.innerHTML = `<fieldset><legend>${T('ud.bildir.neden')}</legend><div class="chips">${NEDENLER.map(n =>
    `<label class="chip bildir-n"><input type="radio" name="neden" value="${n}"> ${T('ud.bildir.n.' + n)}</label>`).join('')}</div></fieldset>
    <textarea name="aciklama" maxlength="300" placeholder="${T('ud.bildir.not')}" aria-label="${T('ud.bildir.not')}"></textarea>
    <div class="row"><button type="submit" class="btn sm">${T('ud.bildir.gonder')}</button><button type="button" class="link bildir-x">${T('ud.al.vazgec')}</button></div>
    <small class="bildir-d" role="status"></small>`;
  $('.bildir-x', f).onclick = () => { bildirAcik = null; box.replaceWith(bildirCtl(key)); };
  f.onsubmit = e => {
    e.preventDefault();
    const n = f.neden.value, d = $('.bildir-d', f);
    if (!n){ d.textContent = T('ud.bildir.hata.neden'); f.querySelector('input').focus(); return; }
    $('[type=submit]', f).disabled = true;
    Store.bildir(key, n, f.aciklama.value.trim()).then(() => {
      bildirildi.add(key); bildirAcik = null; olcu('Bildir', { neden:n });
      box.replaceWith(bildirCtl(key));
    }).catch(err => {
      $('[type=submit]', f).disabled = false;
      if (err && err.code === '23505'){ bildirildi.add(key); bildirAcik = null; box.replaceWith(bildirCtl(key)); return; }
      d.textContent = err && err.code === 'P0001' ? T('ud.bildir.hata.sinir') : T('ud.bildir.hata.genel');
    });
  };
  box.append(f);
  return box;
}

// =========================================================== idea dialog (arena)
let dlg = null;
function openIdea(key, push=true){
  const i = Store.ideas().find(x => x.key === key);
  if (!i) return false;
  Store.loadNotes(key);
  if (!dlg){
    dlg = el('dialog', { class:'idlg', 'aria-labelledby':'idlg-h' });
    document.body.append(dlg);
    dlg.addEventListener('close', () => { if (location.search.includes('f=')) history.replaceState(null, '', withStil(location.pathname)); });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  }
  const paint = () => {
    const it = Store.ideas().find(x => x.key === key); if (!it) return;
    const mine = Store.myRate(key);
    dlg.innerHTML = `<header><span class="eyebrow">${esc(etiket(it))} · ${it.left > 0 ? T('ud.pencere.topluyor', { n:it.left }) : T('ud.kart.bitti')}</span><span class="hd-r"><button type="button" class="btn alt sm sh">${T('ud.paylas')}</button><button type="button" class="x" aria-label="${T('ud.kapat')}">${ICON.x}</button></span></header>
    <div class="in">
      <div style="display:grid;gap:14px"><h2 id="idlg-h">${esc(it.title)}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center"><span class="dv"></span>
        <span class="eyebrow">${it.buyers ? T('ud.pencere.ort', { fiyat:tl(it.avg) }) + ' · ' : ''}${it.handle ? esc(it.handle) + ' · ' : ''}${it.at ? fmtDate(new Date(it.at)) : ''}</span></div>
        ${hedef(it) ? `<p class="hedef${hedef(it).aday ? ' aday' : ''}">${hedefMetni(hedef(it))}</p>` : ''}</div>
      ${it.problem || it.solution || (it.feats || []).length ? `<dl>${it.problem ? `<div><dt>${T('ud.pencere.problem')}</dt><dd>${esc(it.problem)}</dd></div>` : ''}${it.solution ? `<div><dt>${T('ud.form.cozum')}</dt><dd>${esc(it.solution)}</dd></div>` : ''}
        ${(it.feats || []).length ? `<div><dt>${T('ud.form.ozellik')}</dt><dd><ul>${it.feats.map(x => `<li>${esc(x)}</li>`).join('')}</ul></dd></div>` : ''}</dl>` : ''}
      ${it.mine && it.owner !== Store.uid ? '<div class="haber-yer"></div>' : ''}
      ${it.owner === Store.uid && Store.canWrite ? `<div class="own" aria-live="polite"><span>${T('ud.pencere.senin')}</span><button type="button" class="link own-x">${T('ud.pencere.gerial')}</button></div>` : ''}
      <section class="crit" aria-label="${T('ud.pencere.olcut')}"><span class="eyebrow">${T('ud.pencere.puan', { n:it.raters })}</span>
        ${CRIT.map(([c,l]) => `<div class="crit-row"><span>${l}</span><div class="stars" role="group" aria-label="${T('ud.pencere.puani', { olcut:l })}">${[1,2,3,4,5].map(n => `<button type="button" data-c="${c}" data-n="${n}" aria-pressed="${mine[c] === n}" ${Store.canWrite ? '' : 'disabled'}>${n}</button>`).join('')}</div><output>${it.crit[c] ? it.crit[c].toFixed(1) : '–'}</output></div>`).join('')}
      </section>
      <section style="display:grid;gap:14px" aria-labelledby="nt-h"><h3 id="nt-h" style="font-size:17px">${T('ud.pencere.yorumlar')}</h3>
        <div class="notes">${!it.notesLoaded ? `<p class="ex-note">${T('ud.not.yukleniyor')}</p>` : it.notes.length ? it.notes.map(n => `<div class="note ${n.kind}"><small>${T('ud.not.' + n.kind)} · ${esc(n.handle || T('ud.not.isimsiz'))}</small><p>${esc(n.text)}</p></div>`).join('') : `<p class="ex-note">${T('ud.not.ilk')}</p>`}</div>
        <form class="note-form"><textarea name="t" maxlength="500" placeholder="${T('ud.not.ipucu')}" aria-label="${T('ud.not.yorum')}"></textarea>
          <div class="row"><div class="chips" role="group" aria-label="${T('ud.not.tur')}">${[['yorum',T('ud.not.yorum')],['oneri',T('ud.not.oneri')],['endise',T('ud.not.endise')]].map(([k,l],x) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${x===0}">${l}</button>`).join('')}</div>
          <button type="submit" class="btn sm" ${Store.canWrite ? '' : 'disabled'}>${T('ud.not.ekle')}</button></div></form>
      </section>
      ${it.owner !== Store.uid ? '<div class="bildir-yer"></div>' : ''}
    </div>`;
    $('.x', dlg).onclick = () => dlg.close();
    const sh = $('.sh', dlg); sh.onclick = () => { olcu('Paylaş', { yer:'pencere' }); shareIdea({ title:it.title, key:it.key, label:etiket(it), buyers:it.buyers, avg:it.avg, benim:it.owner === Store.uid }, 'pencere'); };
    $('.dv', dlg).replaceWith(buyCtl(it));
    const hy = $('.haber-yer', dlg); if (hy) hy.replaceWith(haberForm(it.key, 'alirdim'));
    const by = $('.bildir-yer', dlg); if (by) by.replaceWith(bildirCtl(it.key));
    const own = $('.own-x', dlg);
    if (own) own.onclick = () => {
      if (own.dataset.sure){ Store.removeIdea(key).then(() => dlg.close()).catch(() => { own.textContent = T('ud.pencere.gerial.hata'); }); return; }
      own.dataset.sure = '1'; own.textContent = T('ud.pencere.gerial.emin');
    };
    $$('.stars button', dlg).forEach(b => b.onclick = () => Store.rate(key, b.dataset.c, Number(b.dataset.n)).catch(yazmaHatasi));
    let kind = 'yorum';
    $$('.note-form .chip', dlg).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('.note-form .chip', dlg).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
    $('.note-form', dlg).onsubmit = e => { e.preventDefault(); const t = e.target.t.value.trim(); if (t.length < 3) return; Store.addNote(key, kind, t, handleGet()).catch(yazmaHatasi); };
  };
  let unsub = Store.sub(() => { if (dlg.open){ const a = document.activeElement; const sel = a && a.matches && a.matches('.note-form textarea') ? a.value : null; paint(); if (sel != null){ const ta = $('.note-form textarea', dlg); ta.value = sel; } } });
  paint();
  dlg.addEventListener('close', () => unsub(), { once:true });
  if (!dlg.open) dlg.showModal();
  if (push) history.replaceState(null, '', withStil(location.pathname + '?f=' + encodeURIComponent(key)));
  return true;
}

// a shared link (?f=<idea>) opens that idea; the store can take a moment to arrive
function openShared(){
  const f = new URLSearchParams(location.search).get('f');
  if (!f) return;
  let tries = 0; const t = setInterval(() => { if (openIdea(f, false) || ++tries > 40) clearInterval(t); }, 250);
}

Object.assign(window.UD_IC, { YASAL, kvkkLink, langSwitch, mountChrome, kalanMetin, saatMetin, mountThu, ideaUrl, shareCard, shareIdea, mailGet, mailSet, haberForm, handleGet, handleSet, feeLine, KAYIT_GEC, kayitAdimi, mountForm, BOLT, PALLET, mountCase, mountStats, hedef, hedefMetni, justBought, nice, quickPrices, buyCtl, card, mountBoard, bildirildi, bildirAcik, NEDENLER, bildirCtl, dlg, openIdea, openShared });

// =========================================================== boot
applyText();
mountChrome();
})();
