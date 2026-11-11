/* 2-Sleep voorbeeldshop · winkelmand (bouwer 2).
   De lade (op elke pagina) en de winkelmandpagina (winkelmand.html) op basis van TS.mand uit site.js.
   Leveringsregels uit hun pagina Verzenden: gratis in België vanaf € 70 incl. btw, anders minimaal € 7,95;
   vanaf 30 kg per zending een aparte regeling. Er wordt niets besteld of betaald. */
(function () {
  'use strict';
  var TS = window.TS;
  if (!TS || !TS.mand) return;
  var $ = TS.$, $$ = TS.$$, esc = TS.esc, doc = document, body = doc.body, R = TS.root || '';

  var LEV = TS.levering = {
    gratisVanaf: (window.SITE && window.SITE.freeShippingFrom) || 70,
    minKost: (window.SITE && window.SITE.shippingCost) || 7.95
  };

  /* focusval die elementen met tabindex="-1" overslaat (opties in een listbox, plaatlinks) */
  TS.focusVal2 = function (laag, e) {
    if (e.key !== 'Tab') return;
    var f = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]', laag)
      .filter(function (x) { return x.getAttribute('tabindex') !== '-1' && (x.offsetParent !== null || x === doc.activeElement); });
    if (!f.length) return;
    var eerste = f[0], laatste = f[f.length - 1];
    if (f.indexOf(doc.activeElement) === -1) { e.preventDefault(); (e.shiftKey ? laatste : eerste).focus(); return; }
    if (e.shiftKey && doc.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
    else if (!e.shiftKey && doc.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
  };

  var IC = {
    zoeken: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    levering: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
    winkel: '<path d="M4 10v10h16V10"/><path d="M3 10l2-5.5h14L21 10z"/><path d="M10 20v-5h4v5"/>',
    retour: '<path d="M9 7H4.5V2.5"/><path d="M4.8 7A8 8 0 1 1 4 12"/>'
  };
  function icoon(n) {
    if (!IC[n]) return TS.icoon(n);
    return '<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + IC[n] + '</svg>';
  }
  TS.icoon2 = icoon;

  /* kleine plaat met het kaartbeeld (miniatuur van 160 px als die er is) */
  TS.miniPlaat = function (o) {
    var src = o.mini || o.thumb;
    if (!src) return '<span class="mplaat mplaat--leeg" aria-hidden="true">' + esc(o.brand || '') + '</span>';
    return '<span class="mplaat mplaat--' + (o.bg === 'white' ? 'wit' : 'foto') + '" aria-hidden="true"><img src="' + R + esc(src) +
      '" alt="" width="80" height="80" loading="lazy" decoding="async"></span>';
  };
  /* bruikbaar uit een catalogusproduct */
  TS.miniVan = function (p) {
    var c = p.card || {};
    return TS.miniPlaat({ mini: c.mini, thumb: c.thumb, bg: c.bg, brand: p.brand });
  };

  /* regel voor de mand uit een catalogusproduct met één variant (verlanglijst, slaapwijzer) */
  var BEDDEN = ['boxsprings', 'luxe-boxsprings', 'matrassen', 'toppers', 'waterbedden'];
  TS.mandItemVan = function (p) {
    var sv = p.singleVariant;
    if (!sv || p.status !== 'beschikbaar') return null;
    var c = p.card || {};
    var bed = (p.categories || []).some(function (x) { return BEDDEN.indexOf(x) > -1; }) && p.priceMin >= 300;
    return { handle: p.handle, variantId: sv.id, name: p.name, brand: p.brand,
      variant: sv.title && !/^(default|standaard)/i.test(sv.title) ? sv.title : '', price: sv.price, qty: 1,
      thumb: c.thumb || null, mini: c.mini || null, bg: c.bg || null, isBed: bed, url: 'product/' + p.handle + '.html' };
  };

  /* ---------------------------------------------------------------- opmaak */
  function regelHtml(x, groot) {
    var naam = esc(x.name || '');
    var stuk = (x.qty || 1) > 1 ? '<span class="mregel__stuk">' + x.qty + ' × ' + TS.prijs(x.price) + '</span>' : '';
    var k = esc(x.key);
    var url = x.url ? R + esc(x.url) : TS.productUrl(x.handle);
    return '<li class="mregel" data-key="' + k + '">' +
      '<a href="' + url + '" tabindex="-1" aria-hidden="true">' + TS.miniPlaat(x) + '</a>' +
      '<div class="mregel__info">' +
        (x.brand ? '<p class="mregel__merk">' + esc(x.brand) + '</p>' : '') +
        '<p class="mregel__naam"><a href="' + url + '">' + naam + '</a></p>' +
        (x.variant ? '<p class="mregel__variant">' + esc(x.variant) + '</p>' : '') +
        '<div class="mregel__acties">' +
          '<div class="stapper stapper--klein">' +
            '<button type="button" data-act="min" data-key="' + k + '" aria-label="Eén minder van ' + naam + '"' + ((x.qty || 1) <= 1 ? ' disabled' : '') + '>' + TS.icoon('min') + '</button>' +
            '<input type="number" inputmode="numeric" min="1" max="99" value="' + (x.qty || 1) + '" data-act="qty" data-key="' + k + '" aria-label="Aantal van ' + naam + '">' +
            '<button type="button" data-act="plus" data-key="' + k + '" aria-label="Eén meer van ' + naam + '"' + ((x.qty || 1) >= 99 ? ' disabled' : '') + '>' + TS.icoon('plus') + '</button>' +
          '</div>' +
          '<button type="button" class="tlink mregel__weg" data-act="weg" data-key="' + k + '">Verwijder<span class="vh"> ' + naam + '</span></button>' +
        '</div>' +
      '</div>' +
      '<p class="mregel__prijs prijs"><span class="prijs__nu">' + TS.prijs((x.price || 0) * (x.qty || 1)) + '</span>' + stuk + '</p>' +
    '</li>';
  }
  TS.mandRegels = function (items, groot) { return '<ul class="mregels">' + items.map(function (x) { return regelHtml(x, groot); }).join('') + '</ul>'; };

  function leveringHtml() {
    var sub = TS.mand.subtotal();
    if (TS.mand.heeftBed()) {
      return '<div class="mlev"><p>Elke levering verzorgen we zelf. Vanaf 30 kg treffen we een aparte regeling voor de levering.</p></div>';
    }
    var pct = Math.max(0, Math.min(100, sub / LEV.gratisVanaf * 100));
    var tekst = sub >= LEV.gratisVanaf ? 'Je levering in België is gratis.' :
      'Nog <strong>' + TS.prijs(LEV.gratisVanaf - sub) + '</strong> tot gratis levering in België.';
    return '<div class="mlev"><p>' + tekst + '</p><div class="mlev__balk" aria-hidden="true"><span style="width:' + pct.toFixed(1) + '%"></span></div></div>';
  }
  TS.leveringHtml = leveringHtml;

  function somHtml() {
    return '<p class="msom"><span class="msom__label">Subtotaal</span><span class="msom__bedrag">' + TS.prijs(TS.mand.subtotal()) + '</span></p>';
  }

  function recentRijen(max, zonder) {
    if (!window.CATALOG) return '';
    var l = TS.recent.list().filter(function (h) { return !zonder || zonder.indexOf(h) === -1; }).map(TS.product).filter(Boolean).slice(0, max);
    return l.map(function (p) {
      return '<li><a class="minirij" href="' + TS.productUrl(p.handle) + '">' + TS.miniVan(p) +
        '<span><span class="minirij__merk">' + esc(p.brand) + '</span><span class="minirij__naam">' + esc(p.name) + '</span></span>' +
        '<span class="minirij__prijs prijs">' + TS.prijsHtml(p) + '</span></a></li>';
    }).join('');
  }

  /* focus bewaren bij opnieuw tekenen (stapper, verwijderen) */
  function metFocus(vak, teken) {
    var a = doc.activeElement, act = null, key = null, pos = -1;
    if (a && vak.contains(a)) {
      act = a.getAttribute('data-act'); key = a.getAttribute('data-key');
      var alle = $$('[data-act="weg"]', vak); pos = alle.indexOf($('[data-act="weg"][data-key="' + (window.CSS && CSS.escape ? CSS.escape(key || '') : key) + '"]', vak));
    }
    teken();
    if (!act) return;
    var doel = null;
    if (key) doel = $$('[data-key]', vak).filter(function (el) { return el.getAttribute('data-key') === key && el.getAttribute('data-act') === act && !el.disabled; })[0];
    if (!doel && key) doel = $$('[data-key]', vak).filter(function (el) { return el.getAttribute('data-key') === key && el.getAttribute('data-act') === 'qty'; })[0];
    if (!doel) {   /* regel weg: focus naar de volgende regel of de kop */
      var weg = $$('[data-act="weg"]', vak);
      doel = weg[Math.min(Math.max(pos, 0), weg.length - 1)] || null;
    }
    if (doel) doel.focus(); else if (vak._kop) vak._kop.focus();
  }

  /* gedeelde bediening voor lade en mandpagina */
  function bedien(vak) {
    vak.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || b.tagName === 'INPUT') return;
      var key = b.getAttribute('data-key');
      var x = TS.mand.items().filter(function (i) { return i.key === key; })[0];
      if (!x) return;
      var act = b.getAttribute('data-act');
      if (act === 'min') TS.mand.setQty(key, (x.qty || 1) - 1);
      if (act === 'plus') TS.mand.setQty(key, (x.qty || 1) + 1);
      if (act === 'weg') { TS.mand.remove(key); TS.meld(x.name + ' is uit je winkelmand verwijderd.'); return; }
      TS.meld('Aantal: ' + Math.max(1, Math.min(99, (x.qty || 1) + (act === 'plus' ? 1 : -1))));
    });
    vak.addEventListener('change', function (e) {
      var inp = e.target.closest('input[data-act="qty"]');
      if (!inp) return;
      var n = parseInt(inp.value, 10);
      if (!n || n < 1) n = 1;
      var key = inp.getAttribute('data-key');
      /* pas tekenen nadat de focus verhuisd is (Tab), en de focus daarna terugzetten op hetzelfde element
         in de nieuwe lijst; anders valt de focus uit de lade naar <body> */
      setTimeout(function () {
        var a = document.activeElement, ak = a && a.getAttribute && a.getAttribute('data-key'), aa = a && a.getAttribute && a.getAttribute('data-act');
        var binnen = a && vak.contains(a);
        TS.mand.setQty(key, Math.min(99, n));
        if (binnen && ak && aa && !document.body.contains(a)) {
          var nieuw = vak.querySelector('[data-key="' + ak + '"][data-act="' + aa + '"]');
          if (nieuw) nieuw.focus();
        }
      }, 0);
    });
  }

  /* ---------------------------------------------------------------- de lade */
  var lade = null, scrim = null, opener = null, open = false, nieuwKey = null;

  function bouwLade() {
    scrim = doc.createElement('div');
    scrim.className = 'lade-scrim'; scrim.hidden = true;
    lade = doc.createElement('div');
    lade.className = 'lade'; lade.hidden = true; lade.id = 'lade';
    lade.setAttribute('role', 'dialog'); lade.setAttribute('aria-modal', 'true'); lade.setAttribute('aria-labelledby', 'lade-kop');
    lade.innerHTML = '<div class="lade__kop"><h2 class="lade__titel" id="lade-kop" tabindex="-1">Winkelmand <span data-lade-n></span></h2>' +
      '<button type="button" class="lade__sluit" data-lade-sluit aria-label="Winkelmand sluiten">' + TS.icoon('sluiten') + '</button></div>' +
      '<div class="lade__body" data-lade-body></div><div class="lade__voet" data-lade-voet></div>';
    body.appendChild(scrim); body.appendChild(lade);
    lade._kop = $('#lade-kop', lade);
    bedien(lade);
    scrim.addEventListener('click', sluitLade);
    lade.addEventListener('click', function (e) { if (e.target.closest('[data-lade-sluit]')) { e.preventDefault(); sluitLade(); } });
    lade.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); sluitLade(); return; }
      TS.focusVal2(lade, e);
    });
  }

  function tekenLade() {
    if (!lade) return;
    var items = TS.mand.items();
    var n = TS.mand.count();
    $('[data-lade-n]', lade).textContent = n ? '(' + n + ')' : '';
    var lijf = $('[data-lade-body]', lade), voet = $('[data-lade-voet]', lade);
    if (!items.length) {
      lijf.innerHTML = '<div class="mleeg"><p class="mleeg__kop">Je winkelmand is leeg.</p>' +
        '<p>Kijk rustig rond in onze afdelingen, of laat je helpen met de slaapwijzer.</p>' +
        '<ul class="mleeg__links"><li><a class="tlink" href="' + R + 'collectie/boxsprings.html">Bedden</a></li>' +
        '<li><a class="tlink" href="' + R + 'collectie/kussens.html">Textiel</a></li>' +
        '<li><a class="tlink" href="' + R + 'slaapwijzer.html">Probeer de slaapwijzer</a></li></ul>' +
        '<section class="lade__recent" data-lade-recent hidden aria-labelledby="lade-recent-kop"><h3 class="lade__subkop" id="lade-recent-kop">Recent bekeken</h3><ul class="minirijen" data-lade-recent-lijst></ul></section></div>';
      voet.hidden = true;
      if (TS.recent.list().length) {
        TS.loadCatalog().then(function () {
          var r = recentRijen(4);
          var s = $('[data-lade-recent]', lade);
          if (s && r) { $('[data-lade-recent-lijst]', s).innerHTML = r; s.hidden = false; }
        }).catch(function () {});
      }
      return;
    }
    lijf.innerHTML = TS.mandRegels(items) + '<div style="margin-top:24px">' + leveringHtml() + '</div>';
    voet.hidden = false;
    voet.innerHTML = somHtml() +
      '<p class="lade__btw">Prijzen incl. btw. Levering of gratis afhalen in Heers kies je bij het afrekenen.</p>' +
      '<a class="knop knop--vol" href="' + R + 'afrekenen.html">Afrekenen</a>' +
      '<div class="lade__links"><a class="tlink" href="' + R + 'winkelmand.html">Bekijk je winkelmand</a><button type="button" class="tlink" data-lade-sluit>Verder winkelen</button></div>' +
      '<p class="lade__voorbeeld">Voorbeeldshop: er wordt niets besteld of betaald.</p>';
    if (nieuwKey && !TS.reduce) {
      var r = $$('.mregel', lijf).filter(function (li) { return li.getAttribute('data-key') === nieuwKey; })[0];
      if (r) { r.classList.add('is-nieuw'); r.scrollIntoView({ block: 'nearest' }); }
    }
    nieuwKey = null;
  }

  function openLade(van) {
    if (!lade) bouwLade();
    if (TS.sluitMega) TS.sluitMega();
    opener = van || doc.activeElement;
    tekenLade();
    if (open) { lade._kop.focus(); return; }
    open = true;
    lade.hidden = false; scrim.hidden = false;
    body.classList.add('is-laag-open');
    void lade.offsetWidth;
    lade.classList.add('is-open'); scrim.classList.add('is-open');
    lade._kop.focus({ preventScroll: true });
  }
  function sluitLade() {
    if (!open) return;
    open = false;
    lade.classList.remove('is-open'); scrim.classList.remove('is-open');
    body.classList.remove('is-laag-open');
    setTimeout(function () { if (!open) { lade.hidden = true; scrim.hidden = true; } }, TS.reduce ? 0 : 260);
    if (opener && opener.focus && doc.body.contains(opener)) opener.focus({ preventScroll: true });
  }
  TS.openMand = openLade;
  TS.sluitMand = sluitLade;

  /* ---------------------------------------------------------------- de winkelmandpagina */
  var pagina = $('[data-mount="winkelmand"]');
  function tekenPagina() {
    if (!pagina) return;
    var items = TS.mand.items();
    var kop = $('[data-mp-kop]');
    pagina._kop = kop;
    if (kop) kop.textContent = items.length ? 'Winkelmand (' + TS.mand.count() + ')' : 'Winkelmand';
    if (!items.length) {
      var f = pagina.getAttribute('data-leeg-foto');
      pagina.innerHTML = '<div class="mp__leeg"><div class="mp__leegtekst"><p class="lead">Je winkelmand is leeg.</p>' +
        '<p>Textiel, kussens en wasparfum bestel je hier gewoon online. Een bed kies je liefst na het liggen: kom gerust langs in Heers.</p>' +
        '<ul class="mleeg__links"><li><a class="tlink" href="' + R + 'collectie/kussens.html">Bekijk de kussens</a></li>' +
        '<li><a class="tlink" href="' + R + 'index.html#afdelingen">Alle afdelingen</a></li>' +
        '<li><a class="tlink" href="' + R + 'slaapadvies.html">Plan een slaapadvies</a></li></ul></div>' +
        (f ? '<figure class="mp__leegfoto"><img src="' + esc(f) + '" alt="' + esc(pagina.getAttribute('data-leeg-alt') || '') + '" width="900" height="1125" loading="lazy" decoding="async"></figure>' : '') +
        '</div>';
    } else {
      pagina.innerHTML = '<section class="mp__regels" aria-labelledby="mp-regels-kop"><h2 id="mp-regels-kop" class="vh">Producten in je winkelmand</h2>' + TS.mandRegels(items, true) + '</section>' +
        '<aside class="mp__som" aria-labelledby="mp-som-kop"><h2 id="mp-som-kop">Overzicht</h2>' + leveringHtml() + somHtml() +
        '<p class="lade__btw">Prijzen incl. btw. Levering of gratis afhalen in Heers kies je bij het afrekenen.</p>' +
        '<a class="knop knop--vol" href="' + R + 'afrekenen.html">Afrekenen</a>' +
        '<ul class="service">' + (TS.mand.heeftBed() ?
          '<li>' + icoon('levering') + '<span>Elke levering verzorgen we zelf</span></li>' +
          '<li>' + icoon('winkel') + '<span>Gratis afhalen in Heers</span></li>' :
          '<li>' + icoon('winkel') + '<span>Gratis afhalen in Heers, klaar vanaf 24 uur</span></li>' +
          '<li>' + icoon('levering') + '<span>Gratis levering in België vanaf € 70</span></li>' +
          '<li>' + icoon('retour') + '<span>14 dagen retour in de originele, ongeopende verpakking</span></li>') +
        '</ul>' +
        '<p class="lade__voorbeeld">Voorbeeldshop: er wordt niets besteld of betaald.</p></aside>';
    }
    tekenRecent(items.map(function (x) { return x.handle; }));
  }
  function tekenRecent(zonder) {
    var s = $('[data-mp-recent]');
    if (!s || !window.CATALOG) return;
    var l = TS.recent.list().filter(function (h) { return zonder.indexOf(h) === -1; }).map(TS.product).filter(Boolean);
    if (!l.length) { s.hidden = true; return; }
    $('[data-rij-spoor]', s).innerHTML = l.map(function (p) { return '<li>' + TS.kaart(p, { sizes: '(min-width: 1024px) 21vw, 45vw' }) + '</li>'; }).join('');
    s.hidden = false;
    TS.hartjes();
  }
  if (pagina) {
    bedien(pagina);
    tekenPagina();
  }

  /* ---------------------------------------------------------------- koppelingen */
  TS.on('mand', function () {
    if (open) metFocus(lade, tekenLade);
    if (pagina) metFocus(pagina, tekenPagina);
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== '2s.mand') return;
    if (open) tekenLade();
    if (pagina) tekenPagina();
  });
  TS.on('open-cart', function (e) {
    e.preventDefault();
    if (pagina) {   /* al op de winkelmandpagina: naar de kop */
      var kop = $('[data-mp-kop]');
      if (kop) { kop.scrollIntoView({ block: 'start', behavior: TS.reduce ? 'auto' : 'smooth' }); kop.focus({ preventScroll: true }); }
      return;
    }
    openLade(e.detail && e.detail.opener);
  });
  TS.on('toegevoegd', function (e) {
    if (pagina || body.classList.contains('p-afrekenen')) return;
    var it = e.detail && e.detail.item;
    nieuwKey = it ? it.key : null;
    var van = doc.activeElement;
    setTimeout(function () { openLade(van); }, TS.reduce ? 0 : 450);
  });
})();
