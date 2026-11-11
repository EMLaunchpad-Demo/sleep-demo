/* 2-Sleep voorbeeldshop · verlanglijst (bouwer 2).
   Toont de bewaarde producten (2s.bewaard) als kaarten, met "In winkelmand" (alleen bij één variant) of "Kies je maat",
   "Verwijder" en bovenaan "Leg klaar voor mijn bezoek" (naar slaapadvies.html?lijst=...). Daaronder recent bekeken. */
(function () {
  'use strict';
  var TS = window.TS;
  var mount = document.querySelector('[data-mount="verlanglijst"]');
  if (!TS || !mount) return;
  var $ = TS.$, $$ = TS.$$, esc = TS.esc, R = TS.root || '';

  function kaart(p) {
    var item = TS.mandItemVan ? TS.mandItemVan(p) : null;
    var actie;
    if (item) actie = '<button type="button" class="knop knop--zacht" data-bw-mand="' + p.handle + '">In winkelmand<span class="vh"> ' + esc(p.brand + ' ' + p.nameShort) + '</span></button>';
    else if (p.status === 'beschikbaar') actie = '<a class="knop knop--zacht" href="' + TS.productUrl(p.handle) + '">Kies je maat<span class="vh"> voor ' + esc(p.brand + ' ' + p.nameShort) + '</span></a>';
    else actie = '<a class="knop knop--zacht" href="' + R + 'slaapadvies.html?lijst=' + p.handle + '">Vraag naar een alternatief</a>';
    return '<li class="bkaart">' + TS.kaart(p, { sizes: '(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 47vw' }) +
      '<div class="bkaart__acties">' + actie +
      '<button type="button" class="tlink" data-bw-weg="' + p.handle + '">Verwijder<span class="vh"> ' + esc(p.brand + ' ' + p.nameShort) + '</span></button></div></li>';
  }

  function teken() {
    var lijst = TS.bewaard.list().map(TS.product).filter(Boolean);
    if (!lijst.length) {
      var f = R + 'assets/img/ui/blog-hoeslakens-kleuren-4x3-600.webp';
      mount.innerHTML = '<div class="bewaard__leeg"><div class="bewaard__leegtekst"><p class="lead">Nog niets bewaard.</p>' +
        '<p>Tik op het hartje bij een product, dan vind je het hier terug. Handig om te vergelijken of om mee te nemen naar je bezoek in Heers.</p>' +
        '<p><a class="knop knop--vol" href="' + R + 'slaapwijzer.html">Probeer de slaapwijzer</a> <a class="tlink" href="' + R + 'index.html#afdelingen">Bekijk de afdelingen</a></p></div>' +
        '<figure class="bewaard__leegfoto"><img src="' + f + '" alt="Stapels hoeslakens in alle kleuren" width="600" height="450" loading="lazy" decoding="async"></figure></div>';
    } else {
      var n = lijst.length;
      mount.innerHTML = '<div class="bewaard__balk"><p class="bewaard__tel">' + n + (n === 1 ? ' product bewaard' : ' producten bewaard') + '</p>' +
        '<a class="knop knop--vol" href="' + R + 'slaapadvies.html?lijst=' + lijst.map(function (p) { return p.handle; }).join(',') + '">Leg klaar voor mijn bezoek</a></div>' +
        '<h2 class="vh">Je bewaarde producten</h2><ul class="raster">' + lijst.map(kaart).join('') + '</ul>';
    }
    TS.hartjes();
    recent();
  }

  function recent() {
    var s = $('[data-bw-recent]');
    if (!s) return;
    var bewaard = TS.bewaard.list();
    var l = TS.recent.list().filter(function (h) { return bewaard.indexOf(h) === -1; }).map(TS.product).filter(Boolean);
    if (!l.length) { s.hidden = true; return; }
    $('[data-rij-spoor]', s).innerHTML = l.map(function (p) { return '<li>' + TS.kaart(p, { sizes: '(min-width: 1024px) 21vw, 45vw' }) + '</li>'; }).join('');
    s.hidden = false;
    TS.hartjes();
  }

  mount.addEventListener('click', function (e) {
    var m = e.target.closest('[data-bw-mand]');
    if (m) {
      var p = TS.product(m.getAttribute('data-bw-mand'));
      var item = p && TS.mandItemVan(p);
      if (item) TS.mand.add(item);
      return;
    }
    var w = e.target.closest('[data-bw-weg]');
    if (w) {
      var h = w.getAttribute('data-bw-weg');
      var knoppen = $$('[data-bw-weg]', mount), i = knoppen.indexOf(w);
      var p2 = TS.product(h);
      TS.bewaard.set(TS.bewaard.list().filter(function (x) { return x !== h; }));
      TS.meld((p2 ? p2.brand + ' ' + p2.nameShort : 'Product') + ' is niet meer bewaard.');
      var na = $$('[data-bw-weg]', mount);
      var doel = na[Math.min(i, na.length - 1)] || $('h1');
      if (doel) { if (doel.tagName === 'H1') doel.setAttribute('tabindex', '-1'); doel.focus(); }
    }
  });
  TS.on('bewaard', teken);
  window.addEventListener('storage', function (e) { if (e.key === '2s.bewaard') teken(); });
  TS.loadCatalog().then(teken);
})();
