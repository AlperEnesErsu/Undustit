/* Undustit explainer stories: the cases, ideas and story pages each tell how the site works in a few
   seconds, without reading. Same engine and look as the home page's process run (mountProc): one drawing
   that changes step by step, the steps listed under it, played once when seen, "Tekrar oynat" at the end,
   the last frame straight away with reduced motion or on a second visit in the same session.
   In the drawings, data-a="n" appears at step n, data-x="n" leaves at step n, data-d="n" draws itself
   in at step n (strokes carry pathLength="1"); anlatim.css holds those rules and each story's own moves. */
(function(){
'use strict';
const UD = window.UD;
if (!UD) return;
const { T, ICON } = UD;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const esc = UD.esc;
const t = k => esc(T(k));

// ---------------------------------------------------------------- the stories (320 × 240 drawings)
const STORIES = {
  // a warehouse's stock becomes a case, ideas arrive, demand picks one, a trial batch reaches a shelf
  vaka: {
    sr: 'anl.vaka.sr',
    steps: ['anl.vaka.s1','anl.vaka.s2','anl.vaka.s3','anl.vaka.s4','anl.vaka.s5','anl.vaka.s6'],
    at: [0, 1100, 2200, 3400, 4600, 5800], end: 7000,
    svg: () => `
      <path class="zemin" d="M14 200H306" pathLength="1" data-d="1"/>
      <g class="v-stok" data-x="5">
        <rect class="krf" x="40" y="186" width="122" height="8" rx="1" pathLength="1" data-d="1"/>
        <path class="ink" d="M46 194v6M98 194v6M154 194v6" pathLength="1" data-d="1"/>
        <rect class="krf" x="44" y="144" width="54" height="42" pathLength="1" data-d="1" style="transition-delay:120ms"/>
        <rect class="krf" x="102" y="144" width="54" height="42" pathLength="1" data-d="1" style="transition-delay:200ms"/>
        <rect class="krf" x="73" y="102" width="54" height="42" pathLength="1" data-d="1" style="transition-delay:280ms"/>
        <path class="ince" d="M52 165h38M110 165h38M81 123h38" pathLength="1" data-d="1" style="transition-delay:420ms"/>
        <text class="adet" x="101" y="214" text-anchor="middle" data-a="1">× 1.000.000</text>
        <g class="toz" data-a="1" data-x="2"><circle cx="58" cy="140" r="1.4"/><circle cx="66" cy="137" r="1"/><circle cx="83" cy="99" r="1.4"/><circle cx="96" cy="97" r="1"/><circle cx="112" cy="99" r="1.3"/><circle cx="121" cy="140" r="1.2"/><circle cx="140" cy="138" r="1.4"/><path d="M126 102 l12 -10 M130 102 l8 -8"/></g>
        <g class="v-etiket" data-a="2"><path class="ince" d="M100 92 V102"/><rect x="68" y="72" width="64" height="20" rx="4"/><text x="100" y="85.5" text-anchor="middle">${t('anl.vaka.etiket')}</text></g>
      </g>
      <g class="v-fikirler">
        ${[['f1', 32, 'anl.vaka.f1', 18, '12'], ['f2', 84, 'anl.vaka.f2', 64, '48'], ['f3', 136, 'anl.vaka.f3', 32, '21']].map(([c, y, k, w, n], ix) => `
        <g class="v-fikir ${c}" data-a="3" style="transition-delay:${ix * 140}ms" ${c !== 'f2' ? 'data-x="5"' : ''}>
          <path class="bag" d="M128 ${y + 13} H198" pathLength="1"/>
          <rect class="baloncuk" x="198" y="${y}" width="110" height="26" rx="13"/>
          <text x="253" y="${y + 16.5}" text-anchor="middle">${t(k)}</text>
          <g class="v-talep" data-a="4" style="transition-delay:${ix * 120}ms"><rect class="iz" x="198" y="${y + 31}" width="84" height="5" rx="2.5"/><rect class="dolu" x="198" y="${y + 31}" width="${w}" height="5" rx="2.5"/><text class="sayi" x="288" y="${y + 36}">${n}</text></g>
        </g>`).join('')}
      </g>
      <g class="v-parti" data-a="5">
        ${[0, 1, 2].map(k => `<g class="kutu k${k}" style="transition-delay:${k * 120}ms"><path class="yan" d="M${92 + k * 40} 160 l8 -6 v26 l-8 6z"/><rect class="on" x="${60 + k * 40}" y="160" width="32" height="26"/><path class="kapak" d="M${60 + k * 40} 160 l8 -6 h32 l-8 6z"/></g>`).join('')}
        <text class="adet" x="110" y="214" text-anchor="middle">${t('anl.vaka.parti')}</text>
      </g>
      <g class="v-raf" data-a="6"><path class="raf" d="M40 186H190" pathLength="1" data-d="6"/><path class="ince" d="M56 186v12h10M172 186v12h10" pathLength="1" data-d="6"/></g>
      <g class="v-pay" data-a="6" style="transition-delay:250ms">
        <rect x="200" y="122" width="108" height="72" rx="8"/>
        <text class="buyuk" x="212" y="152">%40</text><text x="212" y="166">${t('anl.vaka.pay')}</text>
        <rect class="p1" x="212" y="176" width="34" height="6" rx="1"/><rect class="p2" x="247" y="176" width="9" height="6"/><rect class="p3" x="257" y="176" width="40" height="6" rx="1"/>
      </g>`
  },
  // ideas come in, priced demand arrives, the list reorders by it, the top five go to Thursday
  fikir: {
    sr: 'anl.fikir.sr',
    steps: ['anl.fikir.s1','anl.fikir.s2','anl.fikir.s3','anl.fikir.s4'],
    at: [0, 1500, 3100, 4500], end: 5700,
    svg: () => {
      // name, count after demand, slot before, slot after (ranked by count)
      const rows = [['A', 'anl.fikir.r1', 3, 0, 4], ['B', 'anl.fikir.r2', 9, 1, 1], ['C', 'anl.fikir.r3', 14, 2, 0], ['D', 'anl.fikir.r4', 1, 3, 5], ['E', 'anl.fikir.r5', 6, 4, 2], ['F', 'anl.fikir.r6', 4, 5, 3]];
      const tags = [['C', '₺240', 2], ['B', '₺180', 1], ['E', '₺300', 4]];
      return `
      <g class="f-bolge" data-a="4"><rect x="34" y="27" width="232" height="152" rx="10" pathLength="1" data-d="4"/><text x="40" y="20">${t('anl.fikir.bolge')}</text></g>
      ${rows.map(([r, k, n, from], ix) => `
      <g class="f-satir r${r}" style="--y:${from * 30}px">
        <g class="giris" data-a="1" style="transition-delay:${ix * 80}ms">
          <rect class="kart" x="40" y="30" width="220" height="24" rx="6"/>
          <text x="52" y="45.5">${t(k)}</text>
          <rect class="kutu" x="226" y="34" width="28" height="16" rx="4"/>
          <text class="sifir" x="240" y="45.5" text-anchor="middle" data-x="2">0</text>
          <text class="sayi" x="240" y="45.5" text-anchor="middle" data-a="2" style="transition-delay:${200 + ix * 60}ms">${n}</text>
          ${r === 'C' ? '<text class="yildiz" x="28" y="46" text-anchor="middle" data-a="4">★</text>' : ''}
        </g>
      </g>`).join('')}
      ${tags.map(([r, p, slot], ix) => `<g class="f-fiyat" data-a="2" data-x="3" style="transition-delay:${ix * 160}ms"><rect x="272" y="${30 + slot * 30 + 2}" width="40" height="20" rx="10"/><text x="292" y="${30 + slot * 30 + 15.5}" text-anchor="middle">${p}</text></g>`).join('')}`;
    }
  },
  // an idea gathers dust in a notebook, stock gathers dust in a warehouse; dust off both, one table, a product
  hikaye: {
    sr: 'anl.hikaye.sr',
    steps: ['anl.hikaye.s1','anl.hikaye.s2','anl.hikaye.s3','anl.hikaye.s4','anl.hikaye.s5'],
    at: [0, 1000, 2100, 3500, 4800], end: 6000,
    svg: () => `
      <g class="h-defter" data-x="5">
        <rect class="kagit" x="30" y="58" width="90" height="106" rx="4" pathLength="1" data-d="1"/>
        <path class="ince" d="M42 84h66M42 96h66M42 132h66M42 144h48" pathLength="1" data-d="1" style="transition-delay:200ms"/>
        <path class="ink" d="M44 58v-8M60 58v-8M76 58v-8M92 58v-8M108 58v-8" pathLength="1" data-d="1" style="transition-delay:120ms"/>
        <g class="ampul" data-a="1" style="transition-delay:500ms"><circle cx="75" cy="112" r="9"/><path d="M71 122h8M72 126h6M75 99v-4M86 112h4M60 112h4"/></g>
      </g>
      <g class="h-kasa" data-x="5" data-a="2">
        <rect class="krf" x="200" y="92" width="90" height="72" pathLength="1" data-d="2"/>
        <path class="ince" d="M200 116h90M200 140h90M215 92v72M275 92v72" pathLength="1" data-d="2" style="transition-delay:200ms"/>
        <text class="sablon" x="245" y="132" text-anchor="middle">${t('anl.hikaye.stok')}</text>
      </g>
      <g class="toz t1" data-a="1" data-x="3" style="transition-delay:700ms"><circle cx="40" cy="70" r="1.4"/><circle cx="58" cy="66" r="1"/><circle cx="96" cy="74" r="1.3"/><circle cx="110" cy="64" r="1"/><circle cx="50" cy="150" r="1.2"/><circle cx="104" cy="156" r="1.4"/><path d="M30 76 l14 -18 M30 70 l8 -12"/></g>
      <g class="toz t2" data-a="2" data-x="3" style="transition-delay:400ms"><circle cx="210" cy="88" r="1.4"/><circle cx="232" cy="86" r="1"/><circle cx="262" cy="89" r="1.3"/><circle cx="284" cy="86" r="1.1"/><circle cx="246" cy="150" r="1.2"/><path d="M290 98 l-14 -6 M290 106 l-10 -10"/></g>
      <g class="h-bez" data-a="3"><rect x="-44" y="54" width="34" height="124" rx="6" transform="rotate(12 -27 116)"/></g>
      <text class="h-ad" x="160" y="34" text-anchor="middle" data-a="3" style="transition-delay:600ms">un · dust · it</text>
      <g class="h-masa" data-a="4" data-x="5"><path class="raf" d="M40 172H280" pathLength="1" data-d="4"/><path class="ink" d="M70 172v34M250 172v34" pathLength="1" data-d="4" style="transition-delay:200ms"/></g>
      <g class="h-raf" data-a="5"><path class="raf" d="M60 172H260"/><path class="ince" d="M80 172v12h10M228 172v12h10"/></g>
      <g class="h-urun" data-a="5" style="transition-delay:200ms">
        <path class="yan" d="M196 118 l12 -9 v54 l-12 9z"/><rect class="on" x="124" y="118" width="72" height="54"/><path class="kapak" d="M124 118 l12 -9 h72 l-12 9z"/>
        <rect class="etk" x="134" y="134" width="52" height="22" rx="3"/><text class="etk-y" x="160" y="148.5" text-anchor="middle">${t('anl.hikaye.urun')}</text>
      </g>
      <text class="h-not" x="160" y="226" text-anchor="middle" data-a="5" style="transition-delay:500ms">${t('anl.hikaye.not')}</text>`
  }
};

// ---------------------------------------------------------------- the engine
// mountStory(host, name): host (the page's static drawing) is replaced by the story, in the same grid slot.
// Returns { play }.
function mountStory(host, name){
  const S = STORIES[name];
  if (!host || !S) return null;
  const n = S.steps.length;
  const box = document.createElement('div');
  // keep only the page-grid slot (ph-art); the static drawing's own look (cb-art) would frame and shrink the stage
  box.className = (host.classList.contains('ph-art') ? 'ph-art ' : '') + 'proc anl anl-' + name;
  box.innerHTML = `
    <p class="sr">${t(S.sr)}</p>
    <div class="pc-stage"><div class="anl-cizim" aria-hidden="true"><svg viewBox="0 0 320 240">${S.svg()}</svg></div>
      <button type="button" class="pc-replay">${ICON.replay}${t('ud.akis.tekrar')}</button></div>
    <ol class="pc-steps" style="grid-template-columns:repeat(${n},minmax(0,1fr))" aria-hidden="true">${S.steps.map(k => `<li>${t(k)}</li>`).join('')}</ol>`;
  host.replaceWith(box);
  const lis = Array.from(box.querySelectorAll('.pc-steps li'));
  const classes = S.at.map((_, i) => 'a' + (i + 1)).concat('end');
  const SEEN = 'ud-anl-' + name;
  let timers = [];
  const step = s => lis.forEach((li, ix) => { li.classList.toggle('on', ix === s); li.classList.toggle('past', ix < s); });
  const last = () => { box.classList.add(...classes); step(n - 1); };
  function play(){
    timers.forEach(clearTimeout); timers = [];
    box.classList.remove(...classes); step(-1);
    void box.offsetWidth;
    if (reduce.matches){ last(); return; }
    S.at.forEach((ms, i) => timers.push(setTimeout(() => { box.classList.add('a' + (i + 1)); step(i); }, ms)));
    timers.push(setTimeout(() => { box.classList.add('end'); try { sessionStorage.setItem(SEEN, '1'); } catch(e){} }, S.end));
  }
  box.querySelector('.pc-replay').onclick = play;
  let seen = false; try { seen = sessionStorage.getItem(SEEN) === '1'; } catch(e){}
  if (reduce.matches || seen || !('IntersectionObserver' in window)){ last(); return { play }; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); setTimeout(play, 300); } }, { threshold:.35 });
  io.observe(box);
  return { play };
}

UD.mountStory = mountStory;
})();
