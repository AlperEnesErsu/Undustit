/* Look and language loader. ?stil=<name> picks one look, ?dil=en the English text, ?duzenle=1 the in-page
   text editor. It runs in <head> so the page never flashes the default look or the wrong language, and it
   carries these choices on every internal link instead of storing them, so each combination opens as its
   own site and two tabs never affect each other. */
(function(){
  'use strict';
  // Oyuncu is the design language (owner's call, 24 Oct 2026); Kâğıt stays as ?stil=kagit
  var LIST = { oyuncu:'Oyuncu', kagit:'Kâğıt' };
  var DEFAULT = 'oyuncu';
  var LANGS = { tr:'Türkçe', en:'English' };
  var base = document.currentScript.src.replace(/assets\/stil\.js.*$/, '');
  var qs = new URLSearchParams(location.search);
  var stil = LIST[qs.get('stil')] ? qs.get('stil') : DEFAULT;
  var dil = LANGS[qs.get('dil')] ? qs.get('dil') : 'tr';
  var edit = qs.get('duzenle') === '1';
  var html = document.documentElement;
  html.setAttribute('data-stil', stil);
  html.setAttribute('lang', dil);
  if (edit) html.setAttribute('data-duzenle', '');

  // text: every language's dictionary sits on top of Turkish, so a key missing in English still reads
  window.UD_METIN = {
    lang: dil, tr: {}, en: {},
    ekle: function(l, o){ for (var k in o) this[l][k] = o[k]; },
    al: function(k){ var d = this[dil]; return k in d ? d[k] : this.tr[k]; }
  };
  document.write('<script src="' + base + 'assets/metin/tr.js"><\/script>');
  if (dil !== 'tr') document.write('<script src="' + base + 'assets/metin/' + dil + '.js"><\/script>');
  if (edit){
    // edit mode: remember the dictionary as shipped, then lay this browser's unsaved edits on top
    document.write('<script>(function(M){var d=M.' + dil + ';M._base={};for(var k in M.tr)M._base[k]=k in d?d[k]:M.tr[k];' +
      'try{var o=JSON.parse(localStorage.getItem("ud-metin-' + dil + '")||"{}");for(var j in o)d[j]=o[j];}catch(e){}})(UD_METIN)<\/script>');
    document.write('<script src="' + base + 'assets/duzenle.js" defer><\/script>');
  }

  window.UD_STIL = { list: LIST, current: stil, fallback: DEFAULT, langs: LANGS, lang: dil, edit: edit, withStil: withStil, withLang: withLang };
  // the heading face is what the first screen waits for, so ask for it before the stylesheets find it
  var HEAD = { kagit:'instrument-serif-normal-400', oyuncu:'bricolage-grotesque-normal-500_800' }[stil];
  ['latin', 'latin-ext'].forEach(function(sub){ document.write('<link rel="preload" as="font" type="font/woff2" crossorigin href="' + base + 'assets/fonts/' + HEAD + '-' + sub + '.woff2">'); });
  if (stil === 'oyuncu') document.write('<link rel="stylesheet" href="' + base + 'assets/stil/oyuncu.css">');

  function carry(u, s, l){
    if (s === DEFAULT) u.searchParams.delete('stil'); else u.searchParams.set('stil', s);
    if (l === 'tr') u.searchParams.delete('dil'); else u.searchParams.set('dil', l);
    if (edit) u.searchParams.set('duzenle', '1');
    return u.pathname + u.search + u.hash;
  }
  function withStil(href, s){
    var u = new URL(href, location.href);
    return u.origin !== location.origin ? href : carry(u, s || stil, u.searchParams.get('dil') || dil);
  }
  function withLang(href, l){
    var u = new URL(href, location.href);
    return u.origin !== location.origin ? href : carry(u, u.searchParams.get('stil') || stil, l);
  }
  var plain = stil === DEFAULT && dil === 'tr' && !edit;
  function fix(root){
    if (plain || !root.querySelectorAll) return;
    var links = root.matches && root.matches('a[href]') ? [root] : root.querySelectorAll('a[href]');
    Array.prototype.forEach.call(links, function(a){
      var h = a.getAttribute('href');
      if (!h || h.charAt(0) === '#' || a.hasAttribute('data-stil-link') || /^(mailto|tel|data|javascript):/.test(h)) return;
      a.setAttribute('href', withStil(h));
    });
  }
  // links are also created later (nav, cards, dialogs), so keep watching the page
  document.addEventListener('DOMContentLoaded', function(){
    fix(document);
    new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(function(n){ if (n.nodeType === 1) fix(n); }); }); })
      .observe(document.body, { childList:true, subtree:true });
  });
})();
