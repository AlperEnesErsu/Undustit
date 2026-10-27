/* Undustit motion: the "sketch to shelf" process run and the scroll reveals; also assembles window.UD.
   Loaded in order: temel, depo, arayuz, hareket (plain scripts, so pages can call UD right after them).
   Each file shares its top-level names on window.UD_IC and takes what it needs from there. */
(function(){
'use strict';
const { captcha, toast, $, $$, CASES, gorselAdresi, katOf, vakaOf, CATS, CRIT, ICON, LANG, LOCALE, ROOT, Store, T, TERMS, applyText, catName, el, esc, fmtDate, fmtDay, hedef, hedefMetni, html, inCase, kvkkLink, liveNow, mountBoard, mountCase, mountForm, mountStats, mountThu, nextLive, olcu, openCases, openIdea, openShared, pct, reduce, tl } = window.UD_IC;
// =========================================================== the process run
// Sketch to shelf in one pass (about 7.5 s). The same drawing lives through the whole story: a rough
// pencil sketch next to the idea, price bubbles from people who would buy it, the community's notes
// pinned on while the wobbly lines straighten into a clean drawing, then wood, dimensions and the fold,
// then into a kraft box, boxes stack as pre-sales fill, and the box lands on a shelf with the payout.
// Plays once when seen, replay at the end; reduced motion shows the last frame.
function mountProc(host, opts={}){
  // a general story, not one product: "your idea", a dot row for demand (no figures that read as real data),
  // and a plain object that goes from a wobbly sketch to a clean drawing, a box and a shelf
  const text = T('ud.akis.cumle');
  const steps = [1,2,3,4,5,6].map(n => T('ud.akis.adim' + n));
  const PRE = TERMS.presale[0];
  const tag = (x, y, w, label, val, lx, ly, tx, ty, i) => `<g class="dw-tag" style="--i:${i}"><path class="dw-lead" pathLength="1" d="M${lx} ${ly} L${tx} ${ty}"/><circle class="dw-pin" cx="${tx}" cy="${ty}" r="2.2"/><rect x="${x}" y="${y}" width="${w}" height="17" rx="8.5"/><text x="${x + 9}" y="${y + 11.6}">${label} <tspan>${val}</tspan></text></g>`;
  const bub = (x, y, i) => `<g class="dw-bub" style="--i:${i}"><rect x="${x}" y="${y}" width="38" height="17" rx="8.5"/><text x="${x + 19}" y="${y + 11.8}" text-anchor="middle">₺…</text></g>`;
  host.classList.add('proc');
  host.innerHTML = `
  <p class="sr">${T('ud.akis.sr', { az:TERMS.shareRetail, cok:TERMS.shareDirect })}</p>
  <div class="pc-stage">
    <div class="pc-card" aria-hidden="true">
      <div class="h"><span class="tag">${T('ud.akis.senin')}</span><span class="pc-n">0 / 140</span></div>
      <p class="pc-txt"></p>
      <div class="pc-buy"><span class="pc-meter">${Array.from({ length:12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span><span>${T('ud.akis.talep')}</span></div>
    </div>
    <div class="pc-pay" aria-hidden="true"><span class="eb">${T('ud.akis.pay')}</span><b><em>${pct(TERMS.shareRetail + '–' + TERMS.shareDirect)}</em></b><span>${T('ud.akis.paykime')}</span></div>
    <div class="pc-draw" aria-hidden="true"><svg viewBox="0 0 320 240">
      <g class="dw-shelf"><path d="M8 170 H312"/><path d="M40 170 v14 h10 M270 170 v14 h10"/></g>
      <g class="dw-counter">
        <path class="dw-sk m1" pathLength="1" d="M18 171 C 100 166 210 175 302 168"/><path class="dw-tm m1t" d="M20 170 C 113 170 207 170 300 170"/>
        <path class="dw-sk m2" pathLength="1" d="M22 201 C 110 198 200 204 298 199"/><path class="dw-tm m2t" d="M20 200 C 113 200 207 200 300 200"/>
        <path class="dw-sk m3" pathLength="1" d="M19 170 C 19 180 21 190 21 201"/><path class="dw-tm m3t" d="M20 170 C 20 180 20 190 20 200"/>
        <path class="dw-sk m4" pathLength="1" d="M301 168 C 300 180 299 190 299 199"/><path class="dw-tm m4t" d="M300 170 C 300 180 300 190 300 200"/>
      </g>
      <g class="dw-product">
        <path class="dw-sk m5" pathLength="1" d="M118 171 C 117 139 122 113 119 95 C 141 84 177 89 199 92 C 202 113 197 141 202 171"/><path class="dw-tm dw-board m5t" d="M120 170 C 120 140 120 112 122 94 C 140 86 180 86 198 94 C 200 112 200 140 200 170"/>
        <path class="dw-sk m6" pathLength="1" d="M199 92 C 203 90 206 87 210 85 C 211 116 207 142 210 166"/><path class="dw-tm dw-edge m6t" d="M198 94 C 202 91 205 89 208 87 C 209 115 209 143 208 165"/>
        <path class="dw-sk m7" pathLength="1" d="M147 126 C 144 115 153 109 161 111 C 170 108 176 117 173 125 C 175 133 167 140 159 137 C 151 139 145 131 147 126"/><path class="dw-tm dw-slot m7t" d="M146 124 C 146 116 152 110 160 110 C 168 110 174 116 174 124 C 174 132 168 138 160 138 C 152 138 146 132 146 124"/>
        <g class="dw-hatch"><path d="M130 150 l14 -14 M140 162 l20 -20 M176 160 l16 -16"/></g>
        <g class="dw-grain"><path d="M136 152 H184 M136 159 H184"/></g>
        <g class="dw-hinge"><rect x="130" y="168" width="20" height="6" rx="1.5"/><rect x="170" y="168" width="20" height="6" rx="1.5"/></g>
      </g>
      <g class="dw-dims"><path pathLength="1" d="M120 74 H200 M120 69 v10 M200 69 v10"/><text x="160" y="66" text-anchor="middle">${T('ud.akis.en')}</text>
        <path pathLength="1" d="M104 94 V170 M99 94 h10 M99 170 h10"/><text x="96" y="135" text-anchor="end">${T('ud.akis.boy')}</text></g>
      <g class="dw-bubs">${bub(222, 56, 0)}${bub(250, 92, 1)}${bub(224, 128, 2)}${bub(48, 150, 3)}</g>
      <g class="dw-tags">${tag(8, 146, 70, T('ud.akis.isim'), '✓', 78, 154, 120, 154, 0)}${tag(230, 112, 72, T('ud.akis.renk'), '✓', 230, 120, 202, 124, 1)}${tag(222, 40, 92, T('ud.akis.ambalaj'), '✓', 222, 48, 198, 92, 2)}</g>
      <g class="dw-boxes">
        <g class="dw-box b3"><path class="side" d="M246 120 L258 111 L258 160 L246 170 Z"/><path class="front" d="M190 120 H246 V170 H190 Z"/><path class="lid" d="M190 120 L202 111 L258 111 L246 120 Z"/></g>
        <g class="dw-box b2"><path class="side" d="M118 120 L130 111 L130 160 L118 170 Z"/><path class="front" d="M62 120 H118 V170 H62 Z"/><path class="lid" d="M62 120 L74 111 L130 111 L118 120 Z"/></g>
        <g class="dw-box b1"><path class="side" d="M224 104 L240 92 L240 158 L224 170 Z"/><path class="front" d="M96 104 H224 V170 H96 Z"/><path class="lid" d="M96 104 L112 92 L240 92 L224 104 Z"/>
          <g class="dw-label"><rect x="112" y="122" width="96" height="30" rx="3"/><text class="nm" x="160" y="139" text-anchor="middle">${T('ud.akis.ad')}</text><text class="by" x="160" y="148" text-anchor="middle">${T('ud.akis.mucit')}</text></g></g>
      </g>
    </svg></div>
    <div class="pc-pre" aria-hidden="true"><div class="pc-row"><span>${T('ud.akis.adim5')}</span><b class="pc-pn">0 / ${PRE}</b></div><div class="pc-bar"><i></i></div><span class="ok">${T('ud.akis.doldu')}</span></div>
    <span class="pc-ex" aria-hidden="true">${T('ud.akis.ornek')}</span>
    <button type="button" class="pc-replay">${ICON.replay}${T('ud.akis.tekrar')}</button>
  </div>
  <ol class="pc-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
  const txt = $('.pc-txt', host), n = $('.pc-n', host), pn = $('.pc-pn', host), lis = $$('.pc-steps li', host);
  let timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const count = (node, to, ms, fmt) => { const t0 = performance.now(); const f = now => { const p = Math.min(1, (now - t0)/ms); node.textContent = fmt(Math.round(to * (1 - Math.pow(1-p, 3)))); if (p < 1) timers.push(requestAnimationFrame(f)); }; requestAnimationFrame(f); };
  const step = s => lis.forEach((li, ix) => { li.classList.toggle('on', ix === s); li.classList.toggle('past', ix < s); });
  const S = ['s1','s2','s3','s4','s5','s5b','s6','end'];
  function finalState(){
    host.classList.add(...S); txt.textContent = text; n.textContent = text.length + ' / 140';
    pn.textContent = PRE + ' / ' + PRE; step(5);
  }
  // a tab sent to the background throttles timers while CSS stops: rather than resume out of step, finish
  let playing = false;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !playing) return;
    timers.forEach(t => { clearTimeout(t); cancelAnimationFrame(t); }); timers = []; playing = false; finalState();
  });
  function play(){
    timers.forEach(t => { clearTimeout(t); cancelAnimationFrame(t); }); timers = [];
    playing = true;
    host.classList.remove(...S); txt.textContent = ''; n.textContent = '0 / 140'; pn.textContent = '0 / ' + PRE;
    void host.offsetWidth;
    if (reduce.matches){ playing = false; finalState(); return; }
    host.classList.add('s1'); step(0);
    const per = 950 / text.length;
    for (let c = 1; c <= text.length; c++) at(c*per, () => { txt.textContent = text.slice(0, c); n.textContent = c + ' / 140'; });
    at(1700, () => { host.classList.add('s2'); step(1); });
    at(2900, () => { host.classList.add('s3'); step(2); });
    at(4100, () => { host.classList.add('s4'); step(3); });
    at(5200, () => { host.classList.add('s5'); step(4); count(pn, PRE, 1100, v => v + ' / ' + PRE); });
    at(5900, () => host.classList.add('s5b'));
    at(6600, () => { host.classList.add('s6'); step(5); });
    at(7500, () => { host.classList.add('end'); playing = false; try { sessionStorage.setItem('ud-proc-seen', '1'); } catch(e){} });
  }
  $('.pc-replay', host).onclick = play;
  if (opts.manual) return { play };
  let seen = false; try { seen = sessionStorage.getItem('ud-proc-seen') === '1'; } catch(e){}
  if (reduce.matches || seen){ finalState(); return { play }; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); setTimeout(play, opts.delay || 250); } }, { threshold:.35 });
  io.observe(host);
  return { play };
}

// =========================================================== motion
// Blocks below the first screen rise in once as they reach the screen; technical drawings draw
// themselves and their quantity counts up. Each style tunes how through CSS (--in-* in stil/*.css).
// Lists that the store re-renders are left alone, so cards never replay.
const GRIDS = '.disc,.rounds,.steps,.how3,.open3,.vals,.faq,.cases,.cands';
function mountMotion(){
  if (html.dataset.page === 'stiller') return;
  if (reduce.matches || !('IntersectionObserver' in window)){ $$('.cb-art').forEach(a => a.classList.add('drawn')); return; }
  const picked = [];
  $$('main .sec .wrap > *, main.wrap > *:not(.phead):not(.compose), #case > .case-band').forEach(n => {
    if (n.matches(GRIDS) || n.querySelector(':scope > .disc, :scope > .rounds')) {
      const inner = n.matches(GRIDS) ? n : n.querySelector(':scope > .disc, :scope > .rounds');
      if (inner !== n) picked.push(n);
      Array.from(inner.children).forEach((c, i) => { c.style.setProperty('--d', Math.min(i, 6) * 90 + 'ms'); picked.push(c); });
    } else picked.push(n);
  });
  // fast travel (an anchor, End, a fling, scrollTo from a tool; smooth scrolling turns these into many
  // small steps, so it is measured as speed over the last 150 ms) skips the transition, so nothing is
  // ever caught half-faded; normal reading-speed scrolling still gets the reveal
  let samples = [[performance.now(), scrollY]], jumpT = 0;
  addEventListener('scroll', () => {
    const now = performance.now(); samples.push([now, scrollY]); samples = samples.filter(s => now - s[0] < 150);
    if (Math.abs(scrollY - samples[0][1]) > innerHeight * .5){
      html.classList.add('rv-jump'); clearTimeout(jumpT); jumpT = setTimeout(() => html.classList.remove('rv-jump'), 700);
      $$('.rv:not(.in)').forEach(n => { const r = n.getBoundingClientRect(); if (r.top < innerHeight * 1.1 && r.bottom > 0) n.classList.add('in', 'seen'); });
    }
  }, { passive:true });
  addEventListener('beforeprint', () => $$('.rv').forEach(n => n.classList.add('in')));
  // keyboard focus never waits for a reveal: the focused element's block shows at once, ring included
  addEventListener('focusin', e => {
    const r = e.target.closest && e.target.closest('.rv:not(.in)'); if (!r) return;
    html.classList.add('rv-jump'); clearTimeout(jumpT); jumpT = setTimeout(() => html.classList.remove('rv-jump'), 700);
    r.classList.add('in', 'seen');
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const n = e.target; io.unobserve(n);
    n.classList.add('in', 'seen');
    // hand the element back to its own hover and transform rules once it has arrived
    setTimeout(() => n.classList.remove('rv', 'in'), 1600 + (parseInt(n.style.getPropertyValue('--d')) || 0));
  }), { threshold:0, rootMargin:'0px 0px 12% 0px' });
  picked.forEach(n => { n.classList.add('rv'); io.observe(n); });
  // drawings: every stroke is normalised to length 1 so CSS can draw it in; the figure counts up
  const dio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const a = e.target; dio.unobserve(a); a.classList.add('drawn');
    const cap = $('figcaption', a); if (!cap) return;
    const full = cap.textContent, n = parseInt(full.replace(/\D/g, ''), 10); if (!n || !/^×/.test(full.trim())) return;
    const t0 = performance.now(), ms = 1400;
    const f = now => { const p = Math.min(1, (now - t0) / ms), v = Math.round(n * (1 - Math.pow(1 - p, 4)));
      cap.textContent = '× ' + v.toLocaleString(LOCALE); if (p < 1) requestAnimationFrame(f); else cap.textContent = full; };
    requestAnimationFrame(f);
  }), { threshold:.35 });
  $$('.cb-art').forEach(a => { $$('path', a).forEach(p => p.setAttribute('pathLength', '1')); a.classList.add('will-draw'); dio.observe(a); });
}

Object.assign(window.UD_IC, { mountProc, GRIDS, mountMotion });

// =========================================================== boot
document.addEventListener('DOMContentLoaded', mountMotion);
window.UD = { captcha, toast, gorselAdresi, vakaOf, katOf, T, LANG, LOCALE, pct, tl, catName, applyText, TERMS, CATS, CASES, openCases, inCase, CRIT, Store, mountForm, mountCase, mountStats, mountBoard, mountThu, mountProc, openIdea, openShared, olcu, hedef, hedefMetni, nextLive, liveNow, fmtDay, fmtDate, el, esc, ICON, ROOT, kvkkLink };
})();
