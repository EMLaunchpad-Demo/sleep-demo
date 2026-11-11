/* 2-Sleep voorbeeldshop · zoeken (bouwer 2).
   Zoekpaneel met directe resultaten onder de kop (op gsm volledig scherm) en de resultatenpagina zoeken.html?q=.
   Zoekt in window.CATALOG (titel > merk > afdeling > materiaal en tags), zonder accenten: "hastens" vindt Hästens. */
(function () {
  'use strict';
  var TS = window.TS;
  if (!TS) return;
  var $ = TS.$, $$ = TS.$$, esc = TS.esc, doc = document, body = doc.body, R = TS.root || '';
  var ZOEK_IC = '<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  var mini = TS.miniVan || function () { return ''; };
  var val = TS.focusVal2 || TS.focusVal;

  /* ---------------------------------------------------------------- zoekmotor */
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[®™]/g, '').replace(/[^a-z0-9/]+/g, ' ').trim();
  }
  var IDX = null, CATNAAM = {};
  function index() {
    if (IDX || !window.CATALOG) return IDX;
    var C = window.CATALOG;
    C.categories.forEach(function (c) { CATNAAM[c.slug] = c.name; });
    var AFD = {}; C.categories.forEach(function (c, i) { AFD[c.slug] = i; });
    IDX = C.products.map(function (p, i) {
      return {
        p: p, i: i, afd: AFD[p.category] != null ? AFD[p.category] : 99,
        t: ' ' + norm(p.title + ' ' + p.name) + ' ',
        b: ' ' + norm(p.brand) + ' ',
        c: ' ' + norm((p.categories || []).map(function (s) { return CATNAAM[s] || s; }).join(' ')) + ' ',
        m: ' ' + norm((p.materials || []).join(' ') + ' ' + (p.sizes || []).join(' ')) + ' ',
        g: ' ' + norm((p.tags || []).join(' ')) + ' '
      };
    });
    return IDX;
  }
  function tokens(q) { return norm(q).split(' ').filter(Boolean); }
  /* een paar synoniemen: Dauny noemt een donsdekbed een donsdeken */
  var SYN = { donsdekbed: ['donsdeken'], donsdekbedden: ['donsdeken'], donsdeken: ['donsdekbed'], donsdekens: ['donsdeken', 'donsdekbed'] };
  function varianten(tk) { return [tk].concat(SYN[tk] || []); }
  function past(veld, tk) {
    if (veld.indexOf(' ' + tk) > -1) return 2;          /* begin van een woord */
    if (tk.length >= 3 && veld.indexOf(tk) > -1) return 1;
    return 0;
  }
  function zoekProducten(q) {
    var tks = tokens(q);
    if (!tks.length || !index()) return [];
    var res = [];
    IDX.forEach(function (x) {
      var score = 0;
      for (var i = 0; i < tks.length; i++) {
        var s = 0, m, alt = varianten(tks[i]);
        for (var j = 0; j < alt.length; j++) {
          var tk = alt[j];
          if ((m = past(x.t, tk))) s = Math.max(s, m === 2 ? 10 : 6);
          if ((m = past(x.b, tk))) s = Math.max(s, m === 2 ? 8 : 5);
          if ((m = past(x.c, tk))) s = Math.max(s, m === 2 ? 4 : 3);
          if ((m = past(x.m, tk))) s = Math.max(s, 3);
          if ((m = past(x.g, tk))) s = Math.max(s, m === 2 ? 2 : 1);
        }
        if (!s) return;   /* alle woorden moeten passen */
        score += s;
      }
      if (x.p.status !== 'beschikbaar') score -= 4;
      res.push({ p: x.p, s: score, afd: x.afd, i: x.i });
    });
    /* bij een gelijke score: eerst de bedden, dan toppers, dan textiel (volgorde van de afdelingen),
       daarna de aanbevolen volgorde van de catalogus; niet op de laagste prijs */
    res.sort(function (a, b) { return b.s - a.s || a.afd - b.afd || a.i - b.i; });
    return res.map(function (r) { return r.p; });
  }
  function zoekLijst(lijst, q, veld) {
    var tks = tokens(q);
    if (!tks.length) return [];
    return lijst.filter(function (x) {
      var n = ' ' + norm(x[veld]) + ' ';
      return tks.every(function (tk) { return past(n, tk) > 0 || (tk.length >= 5 && /s$/.test(tk) && past(n, tk.slice(0, -1)) > 0); });
    });
  }
  function zoekAlles(q) {
    var C = window.CATALOG;
    return {
      producten: zoekProducten(q),
      afdelingen: zoekLijst(C.categories.concat(C.special), q, 'name'),
      merken: zoekLijst(C.brands, q, 'name'),
      advies: zoekLijst(C.advice, q, 'title').slice(0, 4)
    };
  }
  TS.zoek = zoekAlles;

  /* treffer markeren, zonder de tekst te veranderen */
  function markeer(tekst, q) {
    var tks = tokens(q).filter(function (t) { return t.length >= 2; });
    var t = String(tekst || '');
    if (!tks.length) return esc(t);
    var n = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (n.length !== t.length) return esc(t);
    var aan = new Array(t.length + 1).join('0').split('');
    tks.forEach(function (tk) {
      var i = n.indexOf(tk);
      while (i > -1) {
        if (i === 0 || /[^a-z0-9]/.test(n.charAt(i - 1))) { for (var k = i; k < i + tk.length; k++) aan[k] = '1'; break; }
        i = n.indexOf(tk, i + 1);
      }
    });
    var uit = '', in_ = false;
    for (var j = 0; j < t.length; j++) {
      if (aan[j] === '1' && !in_) { uit += '<mark>'; in_ = true; }
      if (aan[j] !== '1' && in_) { uit += '</mark>'; in_ = false; }
      uit += esc(t.charAt(j));
    }
    return uit + (in_ ? '</mark>' : '');
  }

  function aantal(n, een, meer) { return n + ' ' + (n === 1 ? een : meer); }

  /* ---------------------------------------------------------------- het zoekpaneel */
  var paneel = null, scrim = null, veld = null, res = null, live = null, opener = null, open = false, timer = null, opties = [], actief = -1;

  function bouwPaneel() {
    scrim = doc.createElement('div');
    scrim.className = 'zoek-scrim'; scrim.hidden = true;
    paneel = doc.createElement('div');
    paneel.className = 'zoek'; paneel.hidden = true;
    paneel.setAttribute('role', 'dialog'); paneel.setAttribute('aria-modal', 'true'); paneel.setAttribute('aria-labelledby', 'zoek-label');
    paneel.innerHTML = '<form class="zoek__form" role="search" action="' + R + 'zoeken.html" data-zoek-form>' +
      '<label class="zoek__label" id="zoek-label" for="zoek-veld">Zoek in de collectie</label>' +
      '<div class="zoek__rij">' + ZOEK_IC +
      '<input class="zoek__veld" id="zoek-veld" type="search" name="q" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="Bv. Hästens, donsdekbed of 180/200"' +
      ' role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="zoek-lijst">' +
      '<button type="button" class="zoek__sluit" data-zoek-sluit aria-label="Zoeken sluiten">' + TS.icoon('sluiten') + '</button></div></form>' +
      '<div class="zoek__res" data-zoek-res></div><p class="vh" aria-live="polite" data-zoek-live></p>';
    body.appendChild(scrim); body.appendChild(paneel);
    veld = $('#zoek-veld', paneel); res = $('[data-zoek-res]', paneel); live = $('[data-zoek-live]', paneel);
    scrim.addEventListener('click', sluit);
    $('[data-zoek-sluit]', paneel).addEventListener('click', sluit);
    veld.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(teken, 120); });
    veld.addEventListener('keydown', toetsen);
    $('[data-zoek-form]', paneel).addEventListener('submit', function (e) {
      if (actief > -1 && opties[actief]) { e.preventDefault(); location.href = opties[actief].href; return; }
      if (!veld.value.trim()) e.preventDefault();
    });
    paneel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); sluit(); return; }
      val(paneel, e);
    });
    res.addEventListener('mousemove', function (e) {
      var o = e.target.closest('[role="option"]');
      if (o && opties.indexOf(o) !== actief) zetActief(opties.indexOf(o), false);
    });
  }

  function optie(id, href, inhoud, cls) {
    return '<a role="option" id="' + id + '" class="' + cls + '" href="' + href + '" tabindex="-1" aria-selected="false">' + inhoud + '</a>';
  }
  function prodOptie(p, i, q) {
    return optie('zo-p' + i, TS.productUrl(p.handle),
      mini(p) + '<span><span class="zres__merk">' + esc(p.brand) + '</span><span class="zres__naam">' + markeer(p.name, q) + '</span></span>' +
      '<span class="zres__prijs prijs">' + TS.prijsHtml(p) + '</span>', 'zres__prod');
  }
  function linkOptie(id, href, naam, n, q) {
    return optie(id, href, '<span>' + markeer(naam, q) + '</span>' + (n != null ? '<span class="zres__n">' + n + '</span>' : ''), 'zres__link');
  }
  function groep(id, kop, inhoud) {
    return '<div role="group" aria-labelledby="' + id + '"><p class="zres__kop" id="' + id + '">' + kop + '</p>' + inhoud + '</div>';
  }

  function teken() {
    if (!window.CATALOG || !res) return;
    var q = veld.value.trim();
    var C = window.CATALOG;
    var html = '', meld = '';
    if (q.length < 2) {
      var afd = C.categories.map(function (c, i) { return linkOptie('zo-a' + i, R + c.url, c.name, c.count, ''); }).join('');
      var rec = TS.recent.list().map(TS.product).filter(Boolean).slice(0, 4);
      html = '<div class="zres" id="zoek-lijst" role="listbox" aria-label="Snelkoppelingen">' +
        '<div class="zres__kol">' + (rec.length ? groep('zg-r', 'Recent bekeken', rec.map(function (p, i) { return prodOptie(p, 'r' + i, ''); }).join('')) :
          groep('zg-s', 'Showroom en promoties', C.special.map(function (s, i) { return linkOptie('zo-s' + i, R + s.url, s.name, s.count, ''); }).join(''))) + '</div>' +
        '<div class="zres__kol">' + groep('zg-a', 'Afdelingen', afd) + '</div></div>';
      meld = '';
    } else {
      var r = zoekAlles(q);
      var n = r.producten.length;
      if (!n && !r.afdelingen.length && !r.merken.length && !r.advies.length) {
        html = '<div class="zres" id="zoek-lijst" role="listbox" aria-label="Afdelingen"><div class="zres__kol"><div>' +
          '<p class="zres__leeg">Niets gevonden voor ‘' + esc(q) + '’.</p>' +
          '<p>Vraag het ons: <a href="tel:' + esc((window.SITE && window.SITE.phoneLink) || '+3211759343') + '">' + esc((window.SITE && window.SITE.phone) || '011 75 93 43') + '</a></p></div></div>' +
          '<div class="zres__kol">' + groep('zg-a', 'Afdelingen', C.categories.map(function (c, i) { return linkOptie('zo-a' + i, R + c.url, c.name, c.count, ''); }).join('')) + '</div></div>';
        meld = 'Niets gevonden voor ' + q + '.';
      } else {
        var links = '';
        if (r.afdelingen.length) links += groep('zg-a', 'Afdelingen', r.afdelingen.map(function (c, i) { return linkOptie('zo-a' + i, R + c.url, c.name, c.count, q); }).join(''));
        if (r.merken.length) links += groep('zg-m', 'Merken', r.merken.map(function (b, i) { return linkOptie('zo-m' + i, R + b.url, b.name, b.count, q); }).join(''));
        if (r.advies.length) links += groep('zg-v', 'Advies', r.advies.map(function (a, i) { return linkOptie('zo-v' + i, R + a.url, a.title, null, q); }).join(''));
        html = '<div class="zres" id="zoek-lijst" role="listbox" aria-label="Zoekresultaten">' +
          '<div class="zres__kol">' + (n ? groep('zg-p', 'Producten', r.producten.slice(0, 6).map(function (p, i) { return prodOptie(p, i, q); }).join('')) :
            '<p class="zres__leeg">Geen producten voor ‘' + esc(q) + '’.</p>') + '</div>' +
          '<div class="zres__kol">' + links + '</div></div>' +
          (n > 6 ? '<p class="zres__alle"><a class="knop knop--zacht" href="' + R + 'zoeken.html?q=' + encodeURIComponent(q) + '">Alle ' + n + ' resultaten</a></p>' : '');
        meld = aantal(n, 'product', 'producten') + (r.afdelingen.length ? ', ' + aantal(r.afdelingen.length, 'afdeling', 'afdelingen') : '') +
          (r.merken.length ? ', ' + aantal(r.merken.length, 'merk', 'merken') : '') + '. Gebruik de pijltjes om te kiezen.';
      }
    }
    res.innerHTML = html;
    opties = $$('[role="option"]', res);
    actief = -1;
    veld.setAttribute('aria-expanded', opties.length ? 'true' : 'false');
    veld.removeAttribute('aria-activedescendant');
    if (meld) { live.textContent = ''; setTimeout(function () { live.textContent = meld; }, 40); }
  }

  function zetActief(i, scroll) {
    if (actief > -1 && opties[actief]) { opties[actief].classList.remove('is-actief'); opties[actief].setAttribute('aria-selected', 'false'); }
    actief = i;
    if (i < 0 || !opties[i]) { veld.removeAttribute('aria-activedescendant'); actief = -1; return; }
    opties[i].classList.add('is-actief'); opties[i].setAttribute('aria-selected', 'true');
    veld.setAttribute('aria-activedescendant', opties[i].id);
    if (scroll !== false) opties[i].scrollIntoView({ block: 'nearest' });
  }
  function toetsen(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (opties.length) zetActief(actief + 1 >= opties.length ? 0 : actief + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (opties.length) zetActief(actief - 1 < 0 ? opties.length - 1 : actief - 1); }
    else if (e.key === 'Home' && actief > -1) { e.preventDefault(); zetActief(0); }
    else if (e.key === 'End' && actief > -1) { e.preventDefault(); zetActief(opties.length - 1); }
  }

  function openPaneel(van) {
    if (!paneel) bouwPaneel();
    if (TS.sluitMega) TS.sluitMega();
    if (TS.sluitMand) TS.sluitMand();
    opener = van || doc.activeElement;
    if (open) { veld.focus(); return; }
    open = true;
    paneel.hidden = false; scrim.hidden = false;
    body.classList.add('is-laag-open');
    void paneel.offsetWidth;
    paneel.classList.add('is-open'); scrim.classList.add('is-open');
    veld.focus();
    if (opener && opener.setAttribute) opener.setAttribute('aria-expanded', 'true');
    TS.loadCatalog().then(teken).catch(function () {
      res.innerHTML = '<p>De collectie kon niet geladen worden. Probeer <a class="tlink" href="' + R + 'zoeken.html">de zoekpagina</a>.</p>';
    });
  }
  function sluit() {
    if (!open) return;
    open = false;
    paneel.classList.remove('is-open'); scrim.classList.remove('is-open');
    body.classList.remove('is-laag-open');
    setTimeout(function () { if (!open) { paneel.hidden = true; scrim.hidden = true; } }, TS.reduce ? 0 : 180);
    if (opener && opener.setAttribute) opener.setAttribute('aria-expanded', 'false');
    if (opener && opener.focus && body.contains(opener)) opener.focus({ preventScroll: true });
  }
  TS.openZoeken = openPaneel;
  TS.sluitZoeken = sluit;

  /* ---------------------------------------------------------------- de resultatenpagina */
  var zp = $('[data-mount="zoeken"]');
  var zpForm = $('[data-zp-form]'), zpVeld = $('#zp-veld'), zpTel = $('[data-zp-tel]');
  var PER = 24, getoond = PER, vorigeQ = null;

  function zpTeken() {
    if (!zp || !window.CATALOG) return;
    var q = zpVeld.value.trim();
    if (q !== vorigeQ) getoond = PER;
    vorigeQ = q;
    var C = window.CATALOG;
    try { history.replaceState(null, '', location.pathname + (q ? '?q=' + encodeURIComponent(q) : '') + location.hash); } catch (e) { /* file:// */ }
    if (q.length < 2) {
      zpTel.textContent = '';
      zp.innerHTML = '<div class="zp__links"><div><h2>Afdelingen</h2><ul>' + C.categories.map(function (c) {
        return '<li><a class="tlink" href="' + R + c.url + '">' + esc(c.name) + '</a> <span class="zres__n">' + c.count + '</span></li>'; }).join('') + '</ul></div>' +
        '<div><h2>Merken</h2><ul>' + C.brands.map(function (b) {
        return '<li><a class="tlink" href="' + R + b.url + '">' + esc(b.name) + '</a> <span class="zres__n">' + b.count + '</span></li>'; }).join('') + '</ul></div>' +
        '<div><h2>Showroom</h2><ul>' + C.special.map(function (s) {
        return '<li><a class="tlink" href="' + R + s.url + '">' + esc(s.name) + '</a> <span class="zres__n">' + s.count + '</span></li>'; }).join('') +
        '<li><a class="tlink" href="' + R + 'slaapwijzer.html">De slaapwijzer</a></li></ul></div></div>';
      return;
    }
    var r = zoekAlles(q), n = r.producten.length;
    zpTel.textContent = n ? aantal(n, 'resultaat', 'resultaten') + ' voor ‘' + q + '’' : '';
    var links = '';
    function blok(kop, lijst, f) { return lijst.length ? '<div><h2>' + kop + '</h2><ul>' + lijst.map(f).join('') + '</ul></div>' : ''; }
    links += blok('Afdelingen', r.afdelingen, function (c) { return '<li><a class="tlink" href="' + R + c.url + '">' + esc(c.name) + '</a> <span class="zres__n">' + c.count + '</span></li>'; });
    links += blok('Merken', r.merken, function (b) { return '<li><a class="tlink" href="' + R + b.url + '">' + esc(b.name) + '</a> <span class="zres__n">' + b.count + '</span></li>'; });
    links += blok('Advies', r.advies, function (a) { return '<li><a class="tlink" href="' + R + a.url + '">' + esc(a.title) + '</a></li>'; });
    if (!n) {
      zp.innerHTML = '<div class="zp__leeg"><p class="lead">Niets gevonden voor ‘' + esc(q) + '’.</p>' +
        '<p>Probeer een ander woord, of vraag het ons: <a href="tel:' + esc(window.SITE ? window.SITE.phoneLink : '+3211759343') + '">' + esc(window.SITE ? window.SITE.phone : '011 75 93 43') + '</a>.</p></div>' +
        (links ? '<div class="zp__links">' + links + '</div>' : '<div class="zp__links"><div><h2>Afdelingen</h2><ul>' + C.categories.map(function (c) {
          return '<li><a class="tlink" href="' + R + c.url + '">' + esc(c.name) + '</a></li>'; }).join('') + '</ul></div></div>');
      return;
    }
    var kaarten = r.producten.slice(0, getoond).map(function (p) { return TS.kaart(p, { sizes: '(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 47vw' }); }).join('');
    zp.innerHTML = (links ? '<div class="zp__links">' + links + '</div>' : '') +
      '<h2 class="vh">Producten</h2><div class="raster">' + kaarten + '</div>' +
      (n > getoond ? '<p class="raster__meer"><button type="button" class="knop knop--zacht" data-zp-meer>Toon meer (' + getoond + ' van ' + n + ')</button></p>' : '');
    TS.hartjes();
  }
  if (zp && zpForm && zpVeld) {
    var q0 = '';
    try { q0 = new URLSearchParams(location.search).get('q') || ''; } catch (e) { q0 = ''; }
    zpVeld.value = q0.slice(0, 80);
    var zt = null;
    zpVeld.addEventListener('input', function () { clearTimeout(zt); zt = setTimeout(zpTeken, 200); });
    zpForm.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(zt); zpTeken(); });
    zp.addEventListener('click', function (e) {
      if (!e.target.closest('[data-zp-meer]')) return;
      var oud = getoond;
      getoond += PER; zpTeken();
      var k = $$('.raster .kaart__link', zp)[oud];
      if (k) k.focus();
    });
    TS.loadCatalog().then(zpTeken);
  }

  TS.on('open-search', function (e) {
    e.preventDefault();
    if (zpVeld) { zpVeld.focus(); zpVeld.select(); return; }
    openPaneel(e.detail && e.detail.opener);
  });
  /* sneltoets "/" opent het zoekpaneel (niet in een veld) */
  doc.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!$('[data-open-search]')) return;
    e.preventDefault();
    if (zpVeld) zpVeld.focus(); else openPaneel(doc.activeElement);
  });
})();
