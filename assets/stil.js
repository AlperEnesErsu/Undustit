/* Style loader. ?stil=<name> picks one look for the whole visit. It runs in <head> so the page never
   flashes the default look, and it carries the style on every internal link instead of storing it,
   so each style opens as its own site and two tabs in two styles never affect each other. */
(function(){
  'use strict';
  var LIST = { kagit:'Kâğıt', oyuncu:'Oyuncu', teknik:'Teknik çizim', yumusak:'Yumuşak' };
  var base = document.currentScript.src.replace(/assets\/stil\.js.*$/, '');
  var q = new URLSearchParams(location.search).get('stil');
  var stil = LIST[q] ? q : 'kagit';
  window.UD_STIL = { list: LIST, current: stil, withStil: withStil };
  document.documentElement.setAttribute('data-stil', stil);
  if (stil !== 'kagit') document.write('<link rel="stylesheet" href="' + base + 'assets/stil/' + stil + '.css">');

  function withStil(href){
    var u = new URL(href, location.href);
    if (u.origin !== location.origin) return href;
    if (stil === 'kagit') u.searchParams.delete('stil'); else u.searchParams.set('stil', stil);
    return u.pathname + u.search + u.hash;
  }
  function fix(root){
    if (stil === 'kagit' || !root.querySelectorAll) return;
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
