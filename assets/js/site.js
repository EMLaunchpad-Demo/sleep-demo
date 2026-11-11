/* 2-Sleep voorbeeldshop · kern-JS (bouwer 1).
   window.TS is de gedeelde laag waar de andere scripts (mand.js, zoeken.js, slaapwijzer.js, ... van bouwer 2) op inhaken.
   Geen fetch, geen externe bibliotheken; alles werkt via file://, localhost en een subpad. */
(function () {
  'use strict';
  var TS = window.TS = window.TS || {};
  var doc = document;
  var body = doc.body;
  var ROOT = body.getAttribute('data-root') || '';
  TS.root = ROOT;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  TS.reduce = reduce;

  /* ---------------------------------------------------------------- hulpjes */
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  TS.$ = $; TS.$$ = $$; TS.esc = esc;

  TS.emit = function (naam, detail, cancelable) {
    var ev = new CustomEvent('ts:' + naam, { detail: detail, cancelable: !!cancelable });
    doc.dispatchEvent(ev);
    return ev;
  };
  TS.on = function (naam, fn) { doc.addEventListener('ts:' + naam, fn); };

  /* prijs zoals Intl nl-BE: € 11.869 of € 69,95 */
  TS.prijs = function (x) {
    if (x == null || isNaN(x)) return '';
    var r = Math.round(Number(x) * 100) / 100;
    var heel = Math.floor(r);
    var cent = Math.round((r - heel) * 100);
    var s = String(heel).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (cent) s += ',' + (cent < 10 ? '0' : '') + cent;
    return '€ ' + s;
  };

  /* live-regio voor schermlezers */
  TS.meld = function (tekst) {
    var l = $('[data-live]');
    if (!l) return;
    l.textContent = '';
    setTimeout(function () { l.textContent = tekst; }, 30);
  };

  /* ---------------------------------------------------------------- bewaren in de browser (alleen gemak) */
  TS.store = {
    get: function (k, def) {
      try { var v = window.localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }
  };

  /* bewaard (verlanglijst): lijst van handles, sleutel 2s.bewaard */
  TS.bewaard = {
    list: function () { var l = TS.store.get('2s.bewaard', []); return Array.isArray(l) ? l : []; },
    has: function (h) { return TS.bewaard.list().indexOf(h) > -1; },
    set: function (l) { TS.store.set('2s.bewaard', l); TS.emit('bewaard', { list: l }); },
    toggle: function (h) {
      var l = TS.bewaard.list(); var i = l.indexOf(h); var aan = i === -1;
      if (aan) l.unshift(h); else l.splice(i, 1);
      TS.bewaard.set(l);
      TS.meld(aan ? 'Bewaard' : 'Niet meer bewaard');
      return aan;
    }
  };

  /* winkelmand: sleutel 2s.mand. Regel: {key, handle, variantId, name, brand, variant, price, qty, thumb, bg, isBed}
     De lade en de kassa bouwt bouwer 2 bovenop deze functies (event ts:mand na elke wijziging). */
  TS.mand = {
    items: function () { var l = TS.store.get('2s.mand', []); return Array.isArray(l) ? l : []; },
    save: function (l) { TS.store.set('2s.mand', l); TS.emit('mand', { items: l }); },
    add: function (item) {
      var l = TS.mand.items();
      item.key = item.key || (item.handle + '|' + (item.variantId || ''));
      item.qty = Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1));
      var bestaand = l.filter(function (x) { return x.key === item.key; })[0];
      if (bestaand) bestaand.qty = Math.min(99, bestaand.qty + item.qty); else l.push(item);
      TS.mand.save(l);
      TS.emit('toegevoegd', { item: bestaand || item });
      TS.meld('Toegevoegd aan je winkelmand');
      return item;
    },
    setQty: function (key, qty) {
      var l = TS.mand.items();
      l.forEach(function (x) { if (x.key === key) x.qty = Math.max(1, Math.min(99, qty)); });
      TS.mand.save(l);
    },
    remove: function (key) { TS.mand.save(TS.mand.items().filter(function (x) { return x.key !== key; })); },
    clear: function () { TS.mand.save([]); },
    count: function () { return TS.mand.items().reduce(function (s, x) { return s + (x.qty || 1); }, 0); },
    subtotal: function () { return TS.mand.items().reduce(function (s, x) { return s + (x.price || 0) * (x.qty || 1); }, 0); },
    heeftBed: function () { return TS.mand.items().some(function (x) { return x.isBed; }); }
  };

  /* recent bekeken: laatste 8 handles, sleutel 2s.recent */
  TS.recent = {
    list: function () { var l = TS.store.get('2s.recent', []); return Array.isArray(l) ? l : []; },
    add: function (h) {
      var l = TS.recent.list().filter(function (x) { return x !== h; });
      l.unshift(h); TS.store.set('2s.recent', l.slice(0, 8));
    }
  };

  /* catalogus pas laden als het nodig is (zoekpaneel, lade): voegt assets/js/data.js toe */
  var catLaden = null;
  TS.loadCatalog = function () {
    if (window.CATALOG) return Promise.resolve(window.CATALOG);
    if (catLaden) return catLaden;
    catLaden = new Promise(function (ok, nok) {
      var s = doc.createElement('script');
      s.src = ROOT + 'assets/js/data.js';
      s.onload = function () { ok(window.CATALOG); };
      s.onerror = nok;
      doc.head.appendChild(s);
    });
    return catLaden;
  };
  TS.product = function (h) {
    if (!window.CATALOG) return null;
    if (!TS._idx) { TS._idx = {}; window.CATALOG.products.forEach(function (p) { TS._idx[p.handle] = p; }); }
    return TS._idx[h] || null;
  };
  TS.productUrl = function (h) { return ROOT + 'product/' + h + '.html'; };

  /* iconen (zelfde als in bouw.py) */
  var IC = {
    hart: '<path d="M12 20.2s-7.6-4.6-7.6-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.6 2.6c0 5.6-7.6 10.2-7.6 10.2z"/>',
    sluiten: '<path d="M6 6l12 12M18 6L6 18"/>',
    pijl: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'pijl-links': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    neer: '<path d="M6 9l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    min: '<path d="M5 12h14"/>',
    vergroten: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  TS.icoon = function (n) {
    return '<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IC[n] || '') + '</svg>';
  };

  /* productkaart: zelfde opmaak als kaart() in _bron/bouw.py */
  TS.prijsHtml = function (p) {
    var hoofd = p.priceMin === p.priceMax ? TS.prijs(p.priceMin) : 'Vanaf ' + TS.prijs(p.priceMin);
    var oud = p.compareAt ? ' <s class="prijs__oud"><span class="vh">was </span>' + TS.prijs(p.compareAt) + '</s>' : '';
    return '<span class="prijs__nu">' + hoofd + '</span>' + oud;
  };
  TS.plaat = function (p, sizes) {
    var c = p.card;
    if (!c) return '<div class="plaat plaat--leeg"><span class="plaat__merk">' + esc(p.brand) + '</span><span class="plaat__naam">' + esc(p.nameShort) + '</span></div>';
    var cls = 'plaat plaat--' + (c.bg === 'white' ? 'wit' : 'foto') + (c.small ? ' plaat--klein' : '');
    var stijl = c.small ? ' style="--nw:' + c.nw + 'px;--nh:' + c.nh + 'px"' : '';
    var ss = c.lw && c.lw > c.w ? ' srcset="' + ROOT + c.thumb + ' ' + c.w + 'w, ' + ROOT + c.src + ' ' + c.lw + 'w" sizes="' + (sizes || '50vw') + '"' : '';
    var a = '<img class="plaat__a" src="' + ROOT + c.thumb + '"' + ss + ' width="' + c.w + '" height="' + c.h + '" alt="" loading="lazy" decoding="async">';
    var b = '';
    if (p.hover) b = '<img class="plaat__b plaat__b--' + (p.hover.bg === 'white' ? 'wit' : 'foto') + '" src="' + ROOT + p.hover.thumb + '" width="' + p.hover.w + '" height="' + p.hover.h + '" alt="" loading="lazy" decoding="async">';
    return '<div class="' + cls + '"' + stijl + '>' + a + b + '</div>';
  };
  TS.kaart = function (p, opts) {
    opts = opts || {};
    var stalen = '';
    if (p.colorCount > 1) {
      stalen = '<ul class="stalen" aria-label="' + p.colorCount + ' kleuren">' + (p.colors || []).slice(0, 5).map(function (c) {
        return '<li style="--staal:' + esc(c.hex) + '"></li>';
      }).join('') + (p.colorCount > 5 ? '<li class="stalen__meer">+' + (p.colorCount - 5) + '</li>' : '') + '</ul><p class="stalen__tekst">' + p.colorCount + ' kleuren</p>';
    }
    var aan = TS.bewaard.has(p.handle);
    return '<article class="kaart" data-h="' + p.handle + '"><a class="kaart__link" href="' + TS.productUrl(p.handle) + '">' +
      TS.plaat(p, opts.sizes) + (p.label ? '<span class="kaart__label">' + esc(p.label) + '</span>' : '') +
      '<span class="kaart__merk">' + esc(p.brand) + '</span><h3 class="kaart__naam">' + esc(p.name) + '</h3>' +
      '<p class="kaart__prijs prijs">' + TS.prijsHtml(p) + '</p>' + stalen + '</a>' +
      '<button class="hart" type="button" data-bewaar="' + p.handle + '" aria-pressed="' + aan + '" aria-label="Bewaar ' + esc(p.brand + ' ' + p.nameShort) + '">' + TS.icoon('hart') + '</button></article>';
  };

  /* ---------------------------------------------------------------- tellers en hartjes */
  function tellers() {
    var nm = TS.mand.count(), nb = TS.bewaard.list().length;
    $$('[data-count="mand"]').forEach(function (el) { el.textContent = nm ? '(' + nm + ')' : ''; });
    $$('[data-count="bewaard"]').forEach(function (el) { el.textContent = nb ? '(' + nb + ')' : ''; });
  }
  function hartjes() {
    var l = TS.bewaard.list();
    $$('[data-bewaar]').forEach(function (b) {
      var aan = l.indexOf(b.getAttribute('data-bewaar')) > -1;
      b.setAttribute('aria-pressed', aan ? 'true' : 'false');
      var t = b.querySelector('[data-bewaar-tekst]');
      if (t) t.textContent = aan ? 'Bewaard' : 'Bewaar';
    });
  }
  TS.hartjes = hartjes;
  TS.on('mand', tellers);
  TS.on('bewaard', function () { tellers(); hartjes(); });
  window.addEventListener('storage', function () { tellers(); hartjes(); });
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bewaar]');
    if (!b) return;
    e.preventDefault();
    TS.bewaard.toggle(b.getAttribute('data-bewaar'));
    if (!reduce) { b.classList.remove('is-tik'); void b.offsetWidth; b.classList.add('is-tik'); }
  });
  /* zoeken en mand: bouwer 2 vangt ts:open-search / ts:open-cart op (preventDefault); anders volgt de link */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-open-search],[data-open-cart]');
    if (!a) return;
    var ev = TS.emit(a.hasAttribute('data-open-search') ? 'open-search' : 'open-cart', { opener: a }, true);
    if (ev.defaultPrevented) e.preventDefault();
  });

  /* ---------------------------------------------------------------- openingsuren van vandaag */
  var DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  TS.vandaag = function (nu) {
    nu = nu || new Date();
    var d = (nu.getDay() + 6) % 7;
    var uren = (window.SITE && window.SITE.hours) || null;
    var open = function (i) { return i === 2 ? null : (i === 6 ? 'afspraak' : '10u00'); };
    if (uren) open = function (i) { return uren[i].open ? uren[i].open : (uren[i].note === 'op afspraak' ? 'afspraak' : null); };
    var o = open(d);
    var min = nu.getHours() * 60 + nu.getMinutes();
    if (o === 'afspraak') return 'Zondag: op afspraak';
    if (!o) return 'Vandaag gesloten';
    if (min < 18 * 60) return min < 10 * 60 ? 'Vandaag open van 10u00 tot 18u00' : 'Vandaag open tot 18u00';
    for (var k = 1; k < 7; k++) {
      var j = (d + k) % 7, oj = open(j);
      if (oj && oj !== 'afspraak') return 'Nu gesloten, ' + (k === 1 ? 'morgen' : DAGEN[j]) + ' open vanaf 10u00';
    }
    return 'Nu gesloten';
  };
  function uren() {
    var t = TS.vandaag();
    $$('[data-vandaag]').forEach(function (el) { el.textContent = t; });
    $$('[data-vandaag-lang]').forEach(function (el) { el.textContent = t + '.'; });
    var d = (new Date().getDay() + 6) % 7;
    $$('[data-uren] tr[data-dag="' + d + '"]').forEach(function (tr) { tr.classList.add('is-vandaag'); });
  }

  /* ---------------------------------------------------------------- kop: verbergen bij omlaag scrollen, megamenu */
  var kop = $('[data-kop]');
  function kopScroll() {
    if (!kop) return;
    var vorige = window.scrollY, tik = false;
    window.addEventListener('scroll', function () {
      if (tik) return; tik = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        var open = kop.querySelector('.mega.is-open');
        if (!open) {
          if (y > vorige + 6 && y > 240) kop.classList.add('kop--weg');
          else if (y < vorige - 6 || y < 80) kop.classList.remove('kop--weg');
        }
        vorige = y; tik = false;
      });
    }, { passive: true });
    if (body.classList.contains('is-home')) {
      var rij = $('.hero__rij');
      if (rij && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (en) { kop.classList.toggle('kop--toon', !en.isIntersecting); });
        }, { threshold: 0 }).observe(rij);
      } else kop.classList.add('kop--toon');
    }
  }

  function megamenu() {
    if (!kop) return;
    var knoppen = $$('[data-mega]', kop);
    var open = null, timer = null, sluitTimer = null;
    var desktop = window.matchMedia('(min-width: 1024px)');
    function paneel(k) { return $('#mega-' + k); }
    function sluit(focus) {
      if (!open) return;
      var k = open, p = paneel(k), b = kop.querySelector('[data-mega="' + k + '"]');
      p.classList.remove('is-open');
      b.setAttribute('aria-expanded', 'false');
      setTimeout(function () { if (!p.classList.contains('is-open')) p.hidden = true; }, 170);
      open = null;
      if (focus) b.focus();
    }
    function openen(k) {
      if (open === k) return;
      if (open) { var oud = paneel(open); oud.classList.remove('is-open'); oud.hidden = true; kop.querySelector('[data-mega="' + open + '"]').setAttribute('aria-expanded', 'false'); }
      var p = paneel(k);
      p.hidden = false;
      requestAnimationFrame(function () { p.classList.add('is-open'); });
      kop.querySelector('[data-mega="' + k + '"]').setAttribute('aria-expanded', 'true');
      kop.classList.remove('kop--weg');
      open = k;
    }
    TS.sluitMega = sluit;
    knoppen.forEach(function (b) {
      var k = b.getAttribute('data-mega');
      b.addEventListener('click', function () { if (open === k) sluit(); else openen(k); });
      b.addEventListener('mouseenter', function () {
        if (!desktop.matches) return;
        clearTimeout(timer); clearTimeout(sluitTimer);
        timer = setTimeout(function () { openen(k); }, 120);
      });
      b.addEventListener('mouseleave', function () { clearTimeout(timer); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' && open === k) { e.preventDefault(); var a = paneel(k).querySelector('a'); if (a) a.focus(); }
      });
    });
    kop.addEventListener('mouseleave', function () { if (desktop.matches) sluitTimer = setTimeout(function () { sluit(); }, 220); });
    kop.addEventListener('mouseenter', function () { clearTimeout(sluitTimer); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) sluit(true); });
    doc.addEventListener('click', function (e) { if (open && !kop.contains(e.target)) sluit(); });
    kop.addEventListener('focusout', function (e) { if (open && e.relatedTarget && !kop.contains(e.relatedTarget)) sluit(); });
    /* foto in het megamenu wisselt mee met de afdeling waarover je gaat */
    $$('[data-mega-foto]', kop).forEach(function (a) {
      function zet() {
        var p = a.closest('.mega'); var im = p && p.querySelector('.mega__img'); var zin = p && p.querySelector('.mega__foto .mega__zin');
        if (!im || im.getAttribute('src') === a.getAttribute('data-mega-foto')) return;
        im.style.opacity = '0';
        setTimeout(function () { im.src = a.getAttribute('data-mega-foto'); im.alt = ''; im.onload = function () { im.style.opacity = '1'; }; }, 120);
        if (zin) zin.textContent = a.getAttribute('data-mega-zin');
      }
      a.addEventListener('mouseenter', zet); a.addEventListener('focus', zet);
    });
  }

  /* ---------------------------------------------------------------- focusval voor modale lagen */
  TS.focusVal = function (laag, e) {
    if (e.key !== 'Tab') return;
    var f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', laag)
      .filter(function (x) { return x.offsetParent !== null || x === doc.activeElement; });
    if (!f.length) return;
    var eerste = f[0], laatste = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
    else if (!e.shiftKey && doc.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
  };

  /* ---------------------------------------------------------------- gsm-menu */
  function gsmMenu() {
    var m = $('#gsm-menu'), opener = $('[data-gsm-open]');
    if (!m || !opener) return;
    function toonPaneel(k) {
      $$('[data-gsm-paneel]', m).forEach(function (p) { p.hidden = p.getAttribute('data-gsm-paneel') !== k; });
      $$('[data-gsm-naar]', m).forEach(function (b) { b.setAttribute('aria-expanded', b.getAttribute('data-gsm-naar') === k ? 'true' : 'false'); });
    }
    function open() {
      m.hidden = false; toonPaneel('1');
      requestAnimationFrame(function () { m.classList.add('is-open'); });
      body.classList.add('is-gsm-open');
      opener.setAttribute('aria-expanded', 'true');
      $('[data-gsm-sluit]', m).focus();
    }
    function sluit() {
      m.classList.remove('is-open');
      body.classList.remove('is-gsm-open');
      opener.setAttribute('aria-expanded', 'false');
      setTimeout(function () { m.hidden = true; }, reduce ? 0 : 300);
      opener.focus();
    }
    opener.addEventListener('click', open);
    $('[data-gsm-sluit]', m).addEventListener('click', sluit);
    m.addEventListener('click', function (e) {
      var n = e.target.closest('[data-gsm-naar]');
      if (n) { var k = n.getAttribute('data-gsm-naar'); toonPaneel(k); var t = $('#gsm-' + k + ' [data-gsm-terug]'); if (t) t.focus(); return; }
      var t2 = e.target.closest('[data-gsm-terug]');
      if (t2) { var k2 = t2.closest('[data-gsm-paneel]').getAttribute('data-gsm-paneel'); toonPaneel('1'); var b = $('[data-gsm-naar="' + k2 + '"]', m); if (b) b.focus(); }
    });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluit(); TS.focusVal(m, e); });
  }

  /* ---------------------------------------------------------------- home: wisselende foto en afdelingen */
  function hero() {
    var vak = $('[data-hero-foto]');
    if (!vak) return;
    var lagen = $('.hero__lagen', vak);
    var lijst = [];
    try { lijst = JSON.parse(vak.getAttribute('data-wissel')) || []; } catch (e) { lijst = []; }
    var huidig = lagen.querySelector('.is-aan');
    var i = 0, timer = null, gepauzeerd = false;
    function laag(src, alt) {
      var l = $$('img', lagen).filter(function (x) { return x.getAttribute('src') === src; })[0];
      if (!l) {
        l = doc.createElement('img');
        l.className = 'hero__laag'; l.src = src; l.alt = alt || ''; l.decoding = 'async';
        lagen.appendChild(l);
      }
      return l;
    }
    function toon(src, alt, snel) {
      var l = laag(src, alt);
      if (l === huidig) return;
      var zet = function () {
        l.classList.toggle('is-snel', !!snel);
        if (huidig) { huidig.classList.toggle('is-snel', !!snel); huidig.classList.remove('is-aan'); }
        l.classList.add('is-aan'); huidig = l;
      };
      if (l.complete) zet(); else l.addEventListener('load', zet, { once: true });
    }
    function volgende() {
      if (gepauzeerd || doc.hidden || lijst.length < 2) return;
      i = (i + 1) % lijst.length;
      toon(lijst[i].src, lijst[i].alt, false);
    }
    function start() { clearInterval(timer); if (!reduce) timer = setInterval(volgende, 6000); }
    start();
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) clearInterval(timer); else start(); });
    var afd = $('#afdelingen');
    $$('[data-foto]', afd || doc.createElement('div')).forEach(function (a) {
      function zet() { gepauzeerd = true; toon(a.getAttribute('data-foto'), a.getAttribute('data-foto-alt'), true); }
      a.addEventListener('mouseenter', zet); a.addEventListener('focus', zet);
    });
    if (afd) {
      afd.addEventListener('mouseleave', function () { gepauzeerd = false; start(); });
      afd.addEventListener('focusout', function (e) { if (!afd.contains(e.relatedTarget)) { gepauzeerd = false; start(); } });
    }
  }

  function merkTabs() {
    var tabs = $$('[data-merk-tab]');
    if (!tabs.length) return;
    var foto = $('[data-merk-foto] img');
    function kies(t, focus) {
      var s = t.getAttribute('data-merk-tab');
      tabs.forEach(function (x) { var aan = x === t; x.setAttribute('aria-selected', aan); x.tabIndex = aan ? 0 : -1; });
      $$('[data-merk-paneel]').forEach(function (p) { p.hidden = p.getAttribute('data-merk-paneel') !== s; });
      var p = $('[data-merk-paneel="' + s + '"]');
      if (foto && p) {
        foto.style.opacity = '0';
        setTimeout(function () { foto.src = p.getAttribute('data-foto'); foto.alt = p.getAttribute('data-foto-alt'); foto.onload = function () { foto.style.opacity = '1'; }; }, reduce ? 0 : 200);
      }
      if (focus) t.focus();
    }
    tabs.forEach(function (t, n) {
      t.addEventListener('click', function () { kies(t); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (n + 1) % tabs.length;
        if (e.key === 'ArrowLeft') j = (n - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); kies(tabs[j], true); }
      });
    });
  }

  function prijslijst() {
    var vel = $('.prijslijst__vel');
    if (!vel) return;
    var mini = doc.createElement('img');
    mini.className = 'pl__mini'; mini.alt = ''; mini.hidden = true; mini.decoding = 'async';
    vel.insertBefore(mini, vel.firstChild);
    $$('.pl__rij[data-mini]').forEach(function (r) {
      function toon() {
        mini.hidden = false; mini.src = r.getAttribute('data-mini');
        var y = r.getBoundingClientRect().top - vel.getBoundingClientRect().top + r.offsetHeight / 2 - 60;
        mini.style.top = y + 'px';
        requestAnimationFrame(function () { mini.classList.add('is-aan'); });
      }
      function weg() { mini.classList.remove('is-aan'); }
      r.addEventListener('mouseenter', toon); r.addEventListener('focus', toon);
      r.addEventListener('mouseleave', weg); r.addEventListener('blur', weg);
    });
  }

  function strook() {
    var s = $('[data-strook]');
    if (!s || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) { es.forEach(function (en) { s.classList.toggle('is-pauze', !en.isIntersecting); }); }).observe(s);
    s.addEventListener('focusin', function () { s.classList.add('is-pauze'); });
  }

  /* ---------------------------------------------------------------- binnenkomst per sectie */
  function reveal() {
    var els = $$('[data-reveal]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var perSectie = new Map();
    els.forEach(function (el) {
      var s = el.closest('section, header, main') || body;
      var n = perSectie.get(s) || 0;
      el.style.setProperty('--vertraging', Math.min(n, 4) * 70 + 'ms');
      perSectie.set(s, n + 1);
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.88) el.classList.add('is-in'); else io.observe(el);
    });
  }

  /* ---------------------------------------------------------------- de voorbeeldmelding (één component) */
  var TEKST = {
    bestelling: 'Hier zou je bestelling nu naar 2-Sleep gaan en volgt de betaling. In deze voorbeeldshop wordt niets besteld, betaald of verstuurd.',
    afspraak: 'Hier zou je aanvraag nu naar 2-Sleep gaan. In deze voorbeeldshop wordt niets verstuurd.',
    bericht: 'Hier zou je bericht nu naar 2-Sleep gaan. In deze voorbeeldshop wordt niets verstuurd.',
    bezoek: 'Hier zou je bezoek nu bij 2-Sleep aangevraagd worden. In deze voorbeeldshop wordt niets verstuurd.'
  };
  /* TS.voorbeeld(soort, {form, samenvatting (HTML), onClose}) */
  TS.voorbeeld = function (soort, opts) {
    opts = opts || {};
    var opener = doc.activeElement;
    var scrim = doc.createElement('div');
    scrim.className = 'scrim';
    var mand = soort === 'bestelling';
    scrim.innerHTML = '<div class="melding vel" role="dialog" aria-modal="true" aria-labelledby="melding-kop">' +
      '<img class="melding__mono" src="' + ROOT + 'assets/img/ui/monogram-2sleep.png" alt="" width="56" height="56">' +
      '<h2 id="melding-kop" tabindex="-1">Dit is een voorbeeldshop</h2><p>' + (TEKST[soort] || TEKST.bericht) + '</p>' +
      (opts.samenvatting ? '<div class="melding__samenvatting">' + opts.samenvatting + '</div>' : '') +
      '<div class="melding__knoppen"><button type="button" class="knop knop--vol" data-terug>Terug naar de shop</button>' +
      (mand ? '<button type="button" class="tlink" data-leeg>Mand leegmaken</button>' : '') + '</div></div>';
    body.appendChild(scrim);
    body.style.overflow = 'hidden';
    requestAnimationFrame(function () { scrim.classList.add('is-open'); $('#melding-kop', scrim).focus(); });
    function sluit() {
      scrim.classList.remove('is-open');
      body.style.overflow = '';
      if (opts.form) opts.form.reset();
      setTimeout(function () { scrim.remove(); }, reduce ? 0 : 240);
      if (opts.onClose) opts.onClose();
      if (opener && opener.focus) opener.focus();
    }
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim || e.target.closest('[data-terug]')) sluit();
      if (e.target.closest('[data-leeg]')) { TS.mand.clear(); sluit(); }
    });
    scrim.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluit(); TS.focusVal(scrim, e); });
    return { sluit: sluit };
  };

  /* formulieren zonder action: valideren en dan de voorbeeldmelding. Persoonlijke velden hebben geen name. */
  TS.valideer = function (form) {
    var fout = null;
    $$('input[required], textarea[required], select[required]', form).forEach(function (v) {
      var id = v.id + '-fout';
      var oud = doc.getElementById(id); if (oud) oud.remove();
      v.removeAttribute('aria-invalid');
      var leeg = !String(v.value || '').trim();
      var slecht = !leeg && v.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.value);
      if (leeg || slecht) {
        var p = doc.createElement('p');
        p.className = 'veld__fout'; p.id = id;
        p.innerHTML = '<span aria-hidden="true">!</span> ' + (slecht ? 'Vul een geldig e-mailadres in.' : 'Vul dit veld in.');
        (v.closest('.veld, .drie__cel') || v.parentNode).appendChild(p);
        v.setAttribute('aria-invalid', 'true'); v.setAttribute('aria-describedby', id);
        if (!fout) fout = v;
      }
    });
    if (fout) { fout.focus(); TS.meld('Niet alle velden zijn juist ingevuld.'); return false; }
    return true;
  };
  function formulieren() {
    $$('[data-voorbeeld-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!TS.valideer(f)) return;
        TS.voorbeeld(f.getAttribute('data-voorbeeld-form'), { form: f });
      });
    });
  }

  /* ---------------------------------------------------------------- lichtbak: TS.lichtbak([{src, alt}], start) */
  TS.lichtbak = function (items, start) {
    if (!items || !items.length) return;
    var opener = doc.activeElement;
    var i = start || 0;
    var lb = doc.createElement('div');
    lb.className = 'lichtbak';
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Foto vergroot');
    lb.innerHTML = '<div class="lichtbak__kop"><p class="lichtbak__tel" aria-live="polite"></p><div class="lichtbak__knoppen">' +
      '<button type="button" data-lb-zoom>Vergroot</button><button type="button" data-lb-sluit aria-label="Sluiten">' + TS.icoon('sluiten') + '</button></div></div>' +
      '<div class="lichtbak__vlak" data-lb-vlak><img alt=""></div>' +
      (items.length > 1 ? '<div class="lichtbak__voet"><button type="button" data-lb-vorig aria-label="Vorige foto">' + TS.icoon('pijl-links') + '</button><button type="button" data-lb-volg aria-label="Volgende foto">' + TS.icoon('pijl') + '</button></div>' : '');
    body.appendChild(lb);
    body.style.overflow = 'hidden';
    var im = $('img', lb), vlak = $('[data-lb-vlak]', lb), zk = $('[data-lb-zoom]', lb);
    function toon() {
      vlak.classList.remove('is-zoom'); zk.textContent = 'Vergroot';
      im.src = items[i].src; im.alt = items[i].alt || '';
      $('.lichtbak__tel', lb).textContent = items.length > 1 ? (i + 1) + ' van ' + items.length : '';
    }
    function zoom() {
      var aan = !vlak.classList.contains('is-zoom');
      vlak.classList.toggle('is-zoom', aan); zk.textContent = aan ? 'Verklein' : 'Vergroot';
      if (!aan) im.style.transformOrigin = '';
    }
    function sluit() { lb.remove(); body.style.overflow = ''; if (opener && opener.focus) opener.focus(); }
    toon();
    zk.addEventListener('click', zoom);
    im.addEventListener('click', zoom);
    vlak.addEventListener('mousemove', function (e) {
      if (!vlak.classList.contains('is-zoom')) return;
      var r = im.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
      im.style.transformOrigin = Math.max(0, Math.min(100, x)) + '% ' + Math.max(0, Math.min(100, y)) + '%';
    });
    $('[data-lb-sluit]', lb).addEventListener('click', sluit);
    var v = $('[data-lb-vorig]', lb), n = $('[data-lb-volg]', lb);
    if (v) v.addEventListener('click', function () { i = (i - 1 + items.length) % items.length; toon(); });
    if (n) n.addEventListener('click', function () { i = (i + 1) % items.length; toon(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') sluit();
      if (e.key === 'ArrowLeft' && items.length > 1) { i = (i - 1 + items.length) % items.length; toon(); }
      if (e.key === 'ArrowRight' && items.length > 1) { i = (i + 1) % items.length; toon(); }
      TS.focusVal(lb, e);
    });
    $('[data-lb-sluit]', lb).focus();
  };
  function wanden() {
    $$('[data-wand]').forEach(function (w) {
      var knoppen = $$('[data-lichtbak]', w);
      var items = knoppen.map(function (b) { var im = b.querySelector('img'); return { src: b.getAttribute('data-groot'), alt: im ? im.alt : '' }; });
      knoppen.forEach(function (b, n) { b.addEventListener('click', function () { TS.lichtbak(items, n); }); });
    });
  }

  /* ---------------------------------------------------------------- Katsu-schuif */
  function schuif() {
    $$('[data-schuif]').forEach(function (s) {
      var greep = $('[data-greep]', s), pos = 50, slepen = false;
      function zet(p) {
        pos = Math.max(0, Math.min(100, p));
        s.style.setProperty('--pos', pos + '%');
        greep.setAttribute('aria-valuenow', Math.round(pos));
        greep.setAttribute('aria-valuetext', Math.round(pos) + '% voor, ' + Math.round(100 - pos) + '% na');
      }
      function uitX(x) { var r = s.getBoundingClientRect(); zet(((x - r.left) / r.width) * 100); }
      s.addEventListener('pointerdown', function (e) { slepen = true; s.setPointerCapture(e.pointerId); uitX(e.clientX); });
      s.addEventListener('pointermove', function (e) { if (slepen) uitX(e.clientX); });
      s.addEventListener('pointerup', function () { slepen = false; });
      s.addEventListener('pointercancel', function () { slepen = false; });
      greep.addEventListener('keydown', function (e) {
        var d = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }[e.key];
        if (e.key === 'Home') { e.preventDefault(); zet(0); }
        else if (e.key === 'End') { e.preventDefault(); zet(100); }
        else if (d) { e.preventDefault(); zet(pos + d); }
      });
    });
  }

  /* ---------------------------------------------------------------- split stage: foto per hoofdstuk */
  function stage() {
    var vak = $('[data-stage-foto]');
    var hs = $$('[data-hoofdstuk]');
    if (!vak || !hs.length || !('IntersectionObserver' in window)) return;
    var huidig = vak.querySelector('.is-aan');
    function toon(src, alt) {
      if (huidig && huidig.getAttribute('src') === src) return;
      var l = $$('img', vak).filter(function (x) { return x.getAttribute('src') === src; })[0];
      if (!l) { l = doc.createElement('img'); l.className = 'stage__img'; l.src = src; l.alt = alt || ''; vak.appendChild(l); }
      var zet = function () { if (huidig) huidig.classList.remove('is-aan'); l.classList.add('is-aan'); huidig = l; };
      if (l.complete) zet(); else l.addEventListener('load', zet, { once: true });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) toon(en.target.getAttribute('data-foto'), en.target.getAttribute('data-foto-alt')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    hs.forEach(function (h) { io.observe(h); });
  }

  function merkIndex() {
    var l = $('[data-index]'); var im = $('.index__img');
    if (!l || !im) return;
    $$('[data-voorbeeld]', l).forEach(function (a) {
      function zet() {
        if (im.getAttribute('src') === a.getAttribute('data-voorbeeld')) return;
        im.style.opacity = '0';
        setTimeout(function () { im.src = a.getAttribute('data-voorbeeld'); im.onload = function () { im.style.opacity = '1'; }; }, 120);
      }
      a.addEventListener('mouseenter', zet); a.addEventListener('focus', zet);
    });
  }

  /* horizontale rijen met pijlen */
  TS.rijen = function (ctx) {
    $$('[data-rij]', ctx).forEach(function (r) {
      if (r._ts) return; r._ts = true;
      var sp = $('[data-rij-spoor]', r);
      var v = $('[data-rij-vorig]', r), n = $('[data-rij-volg]', r);
      function stap(d) { sp.scrollBy({ left: d * sp.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' }); }
      if (v) v.addEventListener('click', function () { stap(-1); });
      if (n) n.addEventListener('click', function () { stap(1); });
    });
  };

  /* ---------------------------------------------------------------- start */
  function start() {
    tellers(); hartjes(); uren();
    kopScroll(); megamenu(); gsmMenu();
    hero(); merkTabs(); prijslijst(); strook();
    formulieren(); wanden(); schuif(); stage(); merkIndex(); TS.rijen();
    reveal();
    TS.emit('klaar', {});
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
