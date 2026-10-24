/* In-page text editor. Open any page with ?duzenle=1 (add &dil=en for English).
   Click any text and type; changes are kept in this browser while you move between pages, the bar at the
   bottom counts them, and "İndir" saves the whole dictionary (assets/metin/<dil>.js) with your changes in it.
   Put that file in the project and run `python tools/metin.py yaz` so the page HTML matches.
   Text the scripts build (menu, form, cards) is edited from the "Tüm metinler" list. */
(function(){
  'use strict';
  var M = window.UD_METIN, lang = M.lang, STORE = 'ud-metin-' + lang;
  var KEEP = { EM:1, B:1, STRONG:1, I:1, A:1, BR:1, SMALL:1, SUB:1, SUP:1, SPAN:1 };
  var saved = read();
  function read(){ try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch(e){ return {}; } }
  function write(){ try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch(e){} paintBar(); }
  function base(k){ return M._base && k in M._base ? M._base[k] : M.al(k); }

  // only simple inline markup survives an edit (no pasted styles or scripts)
  function clean(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(c){
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1 || !KEEP[c.tagName]){ c.replaceWith(document.createTextNode(c.textContent)); return; }
      Array.prototype.slice.call(c.attributes).forEach(function(a){ if (!/^(href|class|aria-hidden)$/.test(a.name) || /^javascript:/i.test(a.value)) c.removeAttribute(a.name); });
      clean(c);
    });
    return node.innerHTML.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function set(k, v){
    if (v === base(k)) delete saved[k]; else saved[k] = v;
    M[lang][k] = v; write();
  }

  // ---- inline editing
  var css = document.createElement('style');
  css.textContent = '[data-duzenle] [data-t]{outline:1px dashed transparent;outline-offset:3px;border-radius:2px;cursor:text;transition:outline-color .15s}' +
    '[data-duzenle] [data-t]:hover{outline-color:#1F2F86}[data-duzenle] [data-t]:focus{outline:2px solid #1F2F86;background:rgba(31,47,134,.05)}' +
    '[data-duzenle] [data-t].ed-chg{box-shadow:inset 3px 0 0 #C2410C}' +
    '.ed-bar{position:fixed;left:12px;right:12px;bottom:16px;width:max-content;margin-inline:auto;z-index:200;display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:calc(100% - 24px);padding:8px 8px 8px 16px;border-radius:999px;background:#141519;color:#F8F6F1;font:500 13px/1.2 system-ui,sans-serif;box-shadow:0 20px 40px -20px rgba(0,0,0,.6)}' +
    '.ed-bar b{font-weight:600}.ed-bar button,.ed-bar a{min-height:34px;padding:0 14px;border:1px solid rgba(255,255,255,.25);border-radius:999px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
    '.ed-bar button:hover,.ed-bar a:hover{background:rgba(255,255,255,.12)}.ed-bar .pri{background:#F8F6F1;color:#141519;border-color:#F8F6F1}.ed-bar .pri:hover{background:#fff}' +
    '.ed-panel{position:fixed;inset:80px 16px 76px auto;width:min(520px,calc(100% - 32px));z-index:199;display:grid;grid-template-rows:auto minmax(0,1fr);border-radius:16px;background:#FDFCF9;color:#141519;box-shadow:0 30px 60px -20px rgba(0,0,0,.45);font:14px/1.45 system-ui,sans-serif}' +
    '.ed-panel[hidden]{display:none}.ed-panel header{display:grid;gap:8px;padding:14px 16px;border-bottom:1px solid #E4DFD4}.ed-panel input{min-height:38px;padding:0 12px;border:1px solid #CFC8BA;border-radius:8px;font:inherit}' +
    '.ed-list{overflow:auto;padding:8px 16px 16px;display:grid;gap:12px;align-content:start}.ed-list label{display:grid;gap:4px}.ed-list code{font:11.5px ui-monospace,monospace;color:#686B71}' +
    '.ed-list textarea{min-height:40px;padding:8px 10px;border:1px solid #CFC8BA;border-radius:8px;font:inherit;resize:vertical}.ed-list .chg textarea{border-color:#C2410C}';
  document.head.appendChild(css);

  function hook(n){
    if (n.dataset.edOn) return; n.dataset.edOn = '1';
    n.setAttribute('contenteditable', 'true'); n.spellcheck = true;
    if (saved[n.dataset.t] != null) n.classList.add('ed-chg');
    n.addEventListener('input', function(){ set(n.dataset.t, clean(n.cloneNode(true))); n.classList.toggle('ed-chg', n.dataset.t in saved); });
    n.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); n.blur(); } if (e.key === 'Escape'){ n.innerHTML = M.al(n.dataset.t); n.blur(); } });
  }
  function hookAll(){ document.querySelectorAll('[data-t]').forEach(hook); }
  // a click on editable text edits it instead of following a link or pressing a button; Ctrl or Cmd click still follows
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-t]');
    if (!t || e.ctrlKey || e.metaKey) return;
    var act = e.target.closest('a,button');
    if (act && act.contains(t) || act && t.contains(act)) { e.preventDefault(); e.stopPropagation(); t.focus(); }
  }, true);

  // ---- the list of every text on this page, plus the shared ones the scripts build
  var panel = document.createElement('div'); panel.className = 'ed-panel'; panel.hidden = true;
  panel.innerHTML = '<header><b>Tüm metinler · ' + lang.toUpperCase() + '</b><input type="search" placeholder="Ara: anahtar ya da metin" aria-label="Metinlerde ara"></header><div class="ed-list"></div>';
  var list = panel.querySelector('.ed-list');
  function pageKeys(){
    var ks = {};
    document.querySelectorAll('[data-t]').forEach(function(n){ ks[n.dataset.t] = 1; });
    document.querySelectorAll('[data-ta]').forEach(function(n){ n.dataset.ta.split(';').forEach(function(p){ ks[p.split(':')[1]] = 1; }); });
    var page = (document.querySelector('[data-t]') || { dataset:{ t:'' } }).dataset.t.split('.')[0];
    Object.keys(M.tr).forEach(function(k){ if (k.indexOf('ud.') === 0 || k.indexOf(page + '.js.') === 0) ks[k] = 1; });
    return Object.keys(ks);
  }
  function fill(q){
    list.textContent = '';
    q = (q || '').toLowerCase();
    pageKeys().forEach(function(k){
      var v = M.al(k) || '';
      if (q && k.toLowerCase().indexOf(q) < 0 && v.toLowerCase().indexOf(q) < 0) return;
      var row = document.createElement('label'); if (k in saved) row.className = 'chg';
      var code = document.createElement('code'); code.textContent = k;
      var ta = document.createElement('textarea'); ta.value = v; ta.rows = Math.min(6, Math.ceil(v.length / 60) || 1);
      ta.addEventListener('input', function(){ set(k, ta.value); row.className = k in saved ? 'chg' : ''; });
      row.append(code, ta); list.appendChild(row);
    });
  }
  panel.querySelector('input').addEventListener('input', function(e){ fill(e.target.value); });

  // ---- the bar
  var bar = document.createElement('div'); bar.className = 'ed-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Metin düzenleme');
  function paintBar(){
    var n = Object.keys(saved).length, other = lang === 'tr' ? 'en' : 'tr';
    var href = window.UD_STIL ? window.UD_STIL.withLang(location.pathname, other) : '?duzenle=1&dil=' + other;
    var exit = new URL(location.href); exit.searchParams.delete('duzenle');
    bar.innerHTML = '<span>Düzenleme · <b>' + lang.toUpperCase() + '</b> · ' + (n ? n + ' değişiklik' : 'değişiklik yok') + '</span>' +
      '<button type="button" data-a="list">Tüm metinler</button>' +
      '<a data-stil-link href="' + href + '">' + other.toUpperCase() + ' metinleri</a>' +
      '<button type="button" data-a="reset"' + (n ? '' : ' disabled') + '>Sıfırla</button>' +
      '<button type="button" class="pri" data-a="save"' + (n ? '' : ' disabled') + '>İndir: ' + lang + '.js</button>' +
      '<a data-stil-link href="' + exit.pathname + exit.search + exit.hash + '">Çık</a>';
  }
  bar.addEventListener('click', function(e){
    var a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'list'){ panel.hidden = !panel.hidden; if (!panel.hidden){ fill(panel.querySelector('input').value); panel.querySelector('input').focus(); } }
    if (a.dataset.a === 'reset' && confirm('Bu dildeki ' + Object.keys(saved).length + ' değişiklik silinsin mi?')){ saved = {}; write(); location.reload(); }
    if (a.dataset.a === 'save') download();
  });
  function download(){
    var all = {}; Object.keys(M._base || M[lang]).forEach(function(k){ all[k] = M.al(k); });
    Object.keys(saved).forEach(function(k){ all[k] = saved[k]; });
    var head = '/* Undustit site text, ' + (lang === 'tr' ? 'Türkçe' : 'English') + '. Edit values only; keys are where the text sits.\n   The in-page editor (?duzenle=1) downloads this same file. */\n';
    var blob = new Blob([head + "UD_METIN.ekle('" + lang + "', " + JSON.stringify(all, null, 1) + ');\n'], { type:'text/javascript' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = lang + '.js'; document.body.appendChild(a); a.click(); a.remove();
  }

  function boot(){
    document.body.append(panel, bar); paintBar(); hookAll();
    new MutationObserver(function(){ hookAll(); }).observe(document.body, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
