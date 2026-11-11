/* 2-Sleep voorbeeldshop · de slaapwijzer (bouwer 2), het levende ding van de shop.
   Een paar vragen filteren live de echte catalogus (window.CATALOG) tot een testlijst van maximaal zes producten.
   Harde filters: afdeling, maat, budget, hoekhoogte, split, kleur. Voorkeuren (gevoel, houding, vulling, warmte) geven punten.
   De zinnen bij de antwoorden komen letterlijk uit het eigen slaapadvies van 2-Sleep (advies-artikels en FAQ).
   Geen medische of verzonnen beweringen: de redenregel noemt alleen wat echt in de productgegevens staat. */
(function () {
  'use strict';
  var TS = window.TS;
  var mount = document.querySelector('[data-wijzer-mount]');
  if (!TS || !mount) return;
  var $ = TS.$, $$ = TS.$$, esc = TS.esc, doc = document, R = TS.root || '';
  var opPagina = mount.classList.contains('wijzer--pagina');
  var HK = opPagina ? 'h2' : 'h3';

  /* de instap van bouwer 1 levert de beelden van de vier paden */
  var START = {};
  $$('.keuze', mount).forEach(function (a) {
    var m = /pad=([a-z]+)/.exec(a.getAttribute('href') || '');
    var im = a.querySelector('img');
    if (m) START[m[1]] = im ? im.outerHTML.replace('<img', '<img aria-hidden="true"') : '';
  });

  /* ---------------------------------------------------------------- gegevens */
  var BEDCATS = ['boxsprings', 'luxe-boxsprings', 'matrassen', 'toppers', 'waterbedden'];
  var NATUUR = ['Wol', 'Paardenhaar', 'Katoen', 'Zijde', 'Kasjmier', 'Mohair'];
  var NIET_HOOFDKUSSEN = /kussensloop|kussenslopen|dekbedovertrek|sierkussen|zitkussen|zit support|reiskussen|beenkussen|bedrugsteun|lendenkussen/i;
  var NOOT = 'De slaapwijzer maakt een eerste keuze uit onze collectie. Liggen en testen in de showroom blijft de beste manier om te kiezen.';
  function cat(p, c) { return (p.categories || []).indexOf(c) > -1; }
  function mat(p, l) { return (p.materials || []).some(function (m) { return l.indexOf(m) > -1; }); }
  function fac(p, k) { return (p.facets && p.facets[k]) || []; }
  function warm(p, l) { var w = fac(p, 'warmth'); return w.some(function (x) { return l.indexOf(x) > -1; }); }
  function hoeken(p) {
    var c = fac(p, 'corner').slice();
    var m = /(\d{1,2})\s*cm hoog/i.exec(p.title || '');
    if (m) c.push(parseInt(m[1], 10));
    return c;
  }
  function prijsVoor(p, maat) { return maat && p.sizePrices && p.sizePrices[maat] != null ? p.sizePrices[maat] : p.priceMin; }
  function lijstZin(a) {
    a = a.map(function (x, i) { return i ? x.toLowerCase() : x; });
    return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1];
  }
  function n_(n, w) { return n + ' ' + (n === 1 ? w[0] : w[1]); }

  /* tintfamilie van een kleurstaal (zelfde regels als tint() in _bron/bouw.py) */
  function tint(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length !== 6) return null;
    var r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (mx + mn) / 2, d = mx - mn;
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1)), hue = 0;
    if (d) hue = mx === r ? 60 * (((g - b) / d) % 6) : (mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4));
    if (hue < 0) hue += 360;
    if (L < 0.2) return 'zwart';
    if (L > 0.86 && s < 0.5) return 'wit';
    if (s < 0.12 || d < 0.06) return L < 0.3 ? 'zwart' : 'grijs';
    if (hue >= 15 && hue < 50) return L > 0.55 ? 'beige' : 'bruin';
    if (hue >= 50 && hue < 70) return L > 0.5 ? 'beige' : 'groen';
    if (hue >= 70 && hue < 170) return 'groen';
    if (hue >= 170 && hue < 260) return 'blauw';
    return 'roze';
  }
  var TINTEN = [['wit', 'Wit en crème'], ['beige', 'Beige en zand'], ['grijs', 'Grijs'], ['zwart', 'Antraciet en zwart'],
    ['blauw', 'Blauw'], ['groen', 'Groen'], ['roze', 'Roze en rood'], ['bruin', 'Bruin']];
  /* richtkleur per familie: de staal is de echte productkleur die er het dichtst bij ligt (anders de richtkleur zelf) */
  var RICHT = { wit: '#f3f0e8', beige: '#d6c4a6', grijs: '#9c9a96', zwart: '#2e2e30', blauw: '#4f6a8f', groen: '#6f8466', roze: '#c0727c', bruin: '#6e4b35' };
  /* gangbare matrasmaten eerst bij gelijke aantallen */
  var POPULAIR = ['180/200', '160/200', '90/200', '140/200', '200/200', '180/210', '160/210', '140/210', '90/210', '180/220', '200/220', '80/200', '240/220', '200/220', '140/220'];
  function rgb(h) { h = String(h).replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function afstand(a, b) { var x = rgb(a), y = rgb(b); return Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2); }

  var PADEN = {
    bed: { naam: 'Een bed of matras', woord: ['model', 'modellen'], alle: ['bed of matras', 'bedden en matrassen'], url: 'index.html#afdelingen',
      basis: function (p) { return BEDCATS.some(function (c) { return cat(p, c); }) && p.priceMin >= 300; },
      vragen: ['soort', 'gevoel', 'maat', 'budget'],
      noot: 'Het beste bed is het bed dat het meest past bij je slaaphouding en lichaamsbouw. Daarom zijn uitgebreid testen en een goede begeleiding nodig.' },
    kussen: { naam: 'Een kussen', woord: ['kussen', 'kussens'], alle: ['kussen', 'kussens'], url: 'collectie/kussens.html',
      basis: function (p) { return cat(p, 'kussens') && !NIET_HOOFDKUSSEN.test(p.title); },
      vragen: ['houding', 'vulling', 'budget'],
      noot: 'Test je kussen een week thuis met ons <a class="tlink" href="' + R + 'testslapen.html">Testkussen Programma</a>, gratis voor klanten.' },
    dekbed: { naam: 'Een dekbed', woord: ['dekbed', 'dekbedden'], alle: ['dekbed', 'dekbedden'], url: 'collectie/dekbedden.html',
      basis: function (p) { return cat(p, 'dekbedden'); },
      vragen: ['warmte', 'dvulling', 'dmaat', 'budget'],
      noot: 'Bestel je dekbed online, of spring binnen in onze winkel voor meer advies en om de verschillen zelf te voelen.' },
    hoeslaken: { naam: 'Een hoeslaken', woord: ['hoeslaken', 'hoeslakens'], alle: ['hoeslaken', 'hoeslakens'], url: 'collectie/hoeslakens.html',
      basis: function (p) { return cat(p, 'hoeslakens'); },
      vragen: ['hoek', 'maat', 'kleur'],
      noot: 'Ben je niet helemaal zeker? Neem contact met ons op, dan helpen we je graag met advies op maat.' }
  };

  var VRAGEN = {
    soort: { legend: 'Wat heb je nodig?', soort: 'filter', opties: [
      { w: 'set', t: 'Een volledig bed', sub: 'Boxspringset', f: function (p) { return cat(p, 'boxsprings') || cat(p, 'luxe-boxsprings'); } },
      { w: 'matras', t: 'Alleen een matras', f: function (p) { return cat(p, 'matrassen'); } },
      { w: 'topper', t: 'Een topper', f: function (p) { return cat(p, 'toppers'); } },
      { w: 'waterbed', t: 'Een waterbed', f: function (p) { return cat(p, 'waterbedden'); } }] },
    gevoel: { legend: 'Wat voel je graag?', soort: 'voorkeur', skip: function (st) { return st.a.soort === 'waterbed'; }, opties: [
      { w: 'natuur', t: 'Natuurlijke materialen', sub: 'Zoals wol, katoen en paardenhaar', f: function (p) { return mat(p, NATUUR); },
        advies: 'Natuurlijke materialen hebben elk hun eigen sterke kant: katoen neemt goed vocht op, wol zorgt voor een aangenaam microklimaat en paardenhaar is extreem ventilerend.' },
      { w: 'traag', t: 'Drukverlagend traagschuim', f: function (p) { return mat(p, ['Traagschuim']) || p.brandSlug === 'tempur'; },
        advies: 'Traagschuim geeft een constante, actieve steun met drukverlaging.' },
      { w: 'latex', t: 'Latex of koudschuim', f: function (p) { return mat(p, ['Latex', 'Koudschuim']); } },
      { w: 'geen', t: 'Ik weet het nog niet', geen: true }] },
    maat: { legend: 'Welke maat?', soort: 'filter', maten: true },
    dmaat: { legend: 'Welke maat?', soort: 'filter', maten: true, reken: true },
    budget: { legend: 'Wat is je budget?', soort: 'filter', budget: true },
    houding: { legend: 'Hoe slaap je meestal?', soort: 'voorkeur', opties: [
      { w: 'rug', t: 'Op je rug', advies: 'Rugslapers kiezen vaker voor lagere, zachtere kussens.',
        score: function (p) { return fac(p, 'firmness').some(function (x) { return x === 'Soft' || x === 'Medium'; }) ? 2 : 0; } },
      { w: 'zij', t: 'Op je zij', advies: 'Zijslapers kiezen vaker voor stevige boxkussens met latex, schuim of een combinatie van veren en dons.',
        score: function (p) {
          return (fac(p, 'shape').indexOf('Boxkussen') > -1 ? 2 : 0) + (mat(p, ['Latex', 'Traagschuim']) || (mat(p, ['Veren']) && mat(p, ['Dons'])) ? 1 : 0) +
            (fac(p, 'firmness').indexOf('Firm') > -1 ? 1 : 0);
        } },
      { w: 'buik', t: 'Op je buik', advies: 'Buikslapers kiezen vaker voor dunne en zachte traditionele kussens uit dons, die ze helemaal naar wens kunnen vormen.',
        score: function (p) { return (mat(p, ['Dons']) ? 2 : 0) + (fac(p, 'firmness').indexOf('Soft') > -1 ? 1 : 0) - (fac(p, 'shape').indexOf('Neksteun') > -1 ? 3 : 0); } },
      { w: 'geen', t: 'Afwisselend', geen: true, advies: 'Hard of zacht is vaak een persoonlijke voorkeur.' }] },
    vulling: { legend: 'Wat mag erin?', soort: 'voorkeur', opties: [
      { w: 'dons', t: 'Dons of veren', f: function (p) { return mat(p, ['Dons', 'Veren']); },
        advies: 'Dons is heel zacht en vormt zich in de loop van de nacht naar je lighouding. Veren zijn steviger dan dons.' },
      { w: 'latex', t: 'Latex of traagschuim', f: function (p) { return mat(p, ['Latex', 'Traagschuim']); },
        advies: 'Latex geeft een constante, actieve steun en blijft de hele nacht in vorm. Traagschuim geeft een constante, actieve steun met drukverlaging.' },
      { w: 'synth', t: 'Synthetische vezels', f: function (p) { return mat(p, ['Synthetisch']); },
        advies: 'Synthetische vezels zijn wasbaar en worden vaak gekozen door mensen met allergieën.' },
      { w: 'natuur', t: 'Natuurlijke vulling', sub: 'Zoals kapok of wol', f: function (p) { return mat(p, ['Kapok', 'Wol']); } },
      { w: 'geen', t: 'Maakt niet uit', geen: true }] },
    warmte: { legend: 'Heb je het snel warm of snel koud?', soort: 'voorkeur', opties: [
      { w: 'warm', t: 'Snel warm', sub: 'Warmteklasse 4 (zomer)', f: function (p) { return warm(p, ['4']) || /zomer/i.test(p.title); },
        advies: 'Warmteklasse 4 (zomer) heeft de minste warmte-isolatie, een hoge ventilatie en een uitstekende vochtregulatie.' },
      { w: 'midden', t: 'Gemiddeld', sub: 'Warmteklasse 3 (lente en herfst)', f: function (p) { return warm(p, ['3']); },
        advies: 'Warmteklasse 3 is een mooie middenmoot die in de verschillende seizoenen goed van pas komt.' },
      { w: 'koud', t: 'Snel koud', sub: 'Warmteklasse 2 of 1 (winter)', f: function (p) { return warm(p, ['1', '2']); },
        advies: 'Warmteklasse 1 (winter plus) is voor de echte koukleum: hier ligt de warmte-isolatie het hoogst.' },
      { w: 'seizoen', t: 'Eén dekbed voor alle seizoenen', sub: '4-seizoenendekbed uit twee losse delen', f: function (p) { return warm(p, ['duo']) || /4-seizoenen/i.test(p.title); },
        advies: '4-seizoenendekbedden combineren klassen, waardoor ze extra warm zijn in de winter en koel in de zomer.' },
      { w: 'geen', t: 'Weet ik nog niet', geen: true }] },
    dvulling: { legend: 'Welke vulling?', soort: 'voorkeur', opties: [
      { w: 'dons', t: 'Dons', f: function (p) { return mat(p, ['Dons']); }, advies: 'Donzen dekbedden isoleren goed en zijn licht, dus prettig warm en toch luchtig.' },
      { w: 'wol', t: 'Wol', f: function (p) { return mat(p, ['Wol']); }, advies: 'Wollen dekbedden houden koukleumen heerlijk warm.' },
      { w: 'katoen', t: 'Katoen of zijde', f: function (p) { return mat(p, ['Katoen', 'Zijde']); }, advies: 'Een katoenen dekbed is ideaal voor onrustige, snel transpirerende of woelende slapers.' },
      { w: 'synth', t: 'Synthetisch', f: function (p) { return mat(p, ['Synthetisch']); },
        advies: 'Synthetische dekbedden zijn meestal anti-allergisch en daardoor bij uitstek geschikt bij een huisstofmijtallergie.' },
      { w: 'geen', t: 'Maakt niet uit', geen: true }] },
    hoek: { legend: 'Waarover moet het hoeslaken passen?', soort: 'filter', split: true, opties: [
      { w: 'topper', t: 'Over een topper', sub: 'Hoekhoogte tot 10 cm', f: function (p) { return hoeken(p).some(function (c) { return c <= 10; }); },
        advies: 'Heb je een gestoffeerde matras met een topper, dan kies je een hoeslaken dat precies over de topper past, zodat je mooie matras zichtbaar blijft.' },
      { w: 'matras', t: 'Over een gewone matras', sub: 'De standaard hoekhoogte van 30 cm', f: function (p) { return hoeken(p).some(function (c) { return c >= 25 && c <= 35; }); },
        advies: 'De standaard hoekhoogte is 30 cm en past over de meeste matrassen.' },
      { w: 'hoog', t: 'Over matras en topper samen', sub: 'Of een hoge matras: hoekhoogte van 40 cm of meer', f: function (p) { return hoeken(p).some(function (c) { return c >= 40; }); },
        advies: 'Wil je je topper en matras in één hoes, of heb je een heel hoge matras? Kies dan een hoekhoogte van 40 cm of meer.' }] },
    kleur: { legend: 'Welke kleur?', soort: 'filter', kleur: true }
  };

  /* ---------------------------------------------------------------- toestand */
  var st = { pad: null, a: {}, i: 0, klaar: false };
  function bewaar() { TS.store.set('2s.wijzer', { pad: st.pad, a: st.a, i: st.i, klaar: st.klaar }); }

  var ALLE = null;
  function basisPool() {
    if (!st.pad) return ALLE;
    return ALLE.filter(PADEN[st.pad].basis);
  }
  function optieVan(q, w) {
    var o = (VRAGEN[q].opties || []).filter(function (x) { return x.w === w; })[0];
    return o || null;
  }
  /* harde filter van een vraag, of null */
  function filterVan(q) {
    var v = VRAGEN[q], w = st.a[q];
    if (q === 'hoek') {
      var f1 = w ? optieVan(q, w) : null;
      if (!f1 && !st.a.split) return null;
      return function (p) { return (!f1 || f1.f(p)) && (!st.a.split || !!(p.facets && p.facets.split === true)); };
    }
    if (!w || w === 'geen' || v.soort !== 'filter') return null;
    if (v.maten) return function (p) { return (p.sizes || []).indexOf(w) > -1; };
    if (v.budget) {
      var d = String(w).split('-'), lo = parseFloat(d[0]), hi = d[1] ? parseFloat(d[1]) : Infinity, mt = gekozenMaat();
      return function (p) { var x = prijsVoor(p, mt); return x >= lo && x < hi; };
    }
    if (v.kleur) return function (p) { return (p.tints || []).indexOf(w) > -1; };
    var o = optieVan(q, w);
    return o && o.f ? o.f : null;
  }
  function gekozenMaat() {
    var m = st.a.maat || st.a.dmaat;
    return m && m !== 'geen' ? m : null;
  }
  /* pool na de harde filters van de vragen vóór vraag `tot` (of alle) */
  function pool(tot, zonder) {
    var l = basisPool();
    if (!st.pad) return l;
    var vr = PADEN[st.pad].vragen;
    for (var i = 0; i < vr.length; i++) {
      if (tot && vr[i] === tot) break;
      if (zonder && zonder.indexOf(vr[i]) > -1) continue;
      var f = filterVan(vr[i]);
      if (f) l = l.filter(f);
    }
    return l;
  }
  function voorkeurScore(p) {
    var s = 0, alle = true, iets = false;
    PADEN[st.pad].vragen.forEach(function (q) {
      var v = VRAGEN[q], w = st.a[q];
      if (v.soort !== 'voorkeur' || !w || w === 'geen') return;
      var o = optieVan(q, w);
      if (!o) return;
      iets = true;
      var x = o.score ? o.score(p) : (o.f && o.f(p) ? 3 : 0);
      if (x <= 0) alle = false;
      s += x;
    });
    return { s: s, precies: iets ? alle : true, iets: iets };
  }

  /* maten uit de pool, meest voorkomend eerst */
  function matenVan(l) {
    var t = {};
    l.forEach(function (p) { (p.sizes || []).forEach(function (m) { t[m] = (t[m] || 0) + 1; }); });
    function rang(m) { var i = POPULAIR.indexOf(m); return i === -1 ? 99 : i; }
    return Object.keys(t).map(function (m) { return { w: m, n: t[m] }; })
      .sort(function (a, b) { return b.n - a.n || rang(a.w) - rang(b.w) || parseInt(a.w, 10) - parseInt(b.w, 10) || a.w.localeCompare(b.w); });
  }
  /* budgetschijven uit de kwartielen van wat overblijft */
  function schijven(l) {
    var mt = gekozenMaat();
    var x = l.map(function (p) { return prijsVoor(p, mt); }).sort(function (a, b) { return a - b; });
    if (x.length < 4) return [];
    var hoog = x[x.length - 1], stapje = hoog > 1500 ? 500 : (hoog > 300 ? 50 : 10);
    function q(f) { var i = (x.length - 1) * f, a = Math.floor(i), b = Math.ceil(i); return x[a] + (x[b] - x[a]) * (i - a); }
    var grenzen = [0.25, 0.5, 0.75].map(function (f) { return Math.round(q(f) / stapje) * stapje; })
      .filter(function (g, i, a) { return g > x[0] && g <= hoog && a.indexOf(g) === i; });
    if (!grenzen.length) return [];
    var punten = [0].concat(grenzen);
    var uit = punten.map(function (lo, i) {
      var hi = i + 1 < punten.length ? punten[i + 1] : null;
      var n = x.filter(function (v) { return v >= lo && (hi == null || v < hi); }).length;
      var t = i === 0 ? 'Tot ' + TS.prijs(hi) : (hi == null ? TS.prijs(lo) + ' of meer' : TS.prijs(lo) + ' tot ' + TS.prijs(hi));
      return { w: lo + '-' + (hi == null ? '' : hi), t: t, n: n };
    }).filter(function (s) { return s.n > 0; });
    return uit.length > 1 ? uit : [];
  }
  function tintenVan(l) {
    var uit = [];
    TINTEN.forEach(function (tn) {
      var n = l.filter(function (p) { return (p.tints || []).indexOf(tn[0]) > -1; }).length;
      if (!n) return;
      var hex = null, best = Infinity;
      l.forEach(function (p) {
        (p.colors || []).forEach(function (c) {
          if (!/^#[0-9a-f]{6}$/i.test(c.hex || '') || tint(c.hex) !== tn[0]) return;
          var d = afstand(c.hex, RICHT[tn[0]]);
          if (d < best) { best = d; hex = c.hex; }
        });
      });
      uit.push({ w: tn[0], t: tn[1], n: n, hex: hex || RICHT[tn[0]] });
    });
    return uit;
  }

  /* de opties van een vraag met hun aantallen (0 valt weg) */
  function opties(q) {
    var v = VRAGEN[q], l = pool(q), w = PADEN[st.pad].woord, o = [];
    if (v.maten) {
      o = matenVan(l).map(function (m) { return { w: m.w, t: m.w, n: m.n }; });
      if (o.length) o.push({ w: 'geen', t: 'Weet ik nog niet', geen: true });
    } else if (v.budget) {
      o = schijven(l);
      if (o.length) o.push({ w: 'geen', t: 'Maakt niet uit', geen: true });
    } else if (v.kleur) {
      o = tintenVan(l);
      if (o.length) o.push({ w: 'geen', t: 'Maakt niet uit', geen: true });
    } else {
      o = v.opties.map(function (x) {
        if (x.geen) return x;
        var k = l.filter(x.score ? function (p) { return x.score(p) > 0; } : x.f).length;
        return { w: x.w, t: x.t, sub: x.sub, n: k, advies: x.advies };
      }).filter(function (x) { return x.geen || x.n > 0; });
      if (o.filter(function (x) { return !x.geen; }).length === 0) o = [];
    }
    o.forEach(function (x) { if (!x.geen && x.n != null) x.tel = n_(x.n, w); });
    return o;
  }
  function stappen() {
    if (!st.pad) return ['pad'];
    return ['pad'].concat(PADEN[st.pad].vragen.filter(function (q) {
      var v = VRAGEN[q];
      if (v.skip && v.skip(st)) return false;
      return opties(q).length > 0;
    }));
  }

  /* ---------------------------------------------------------------- resultaat */
  function resultaat() {
    var ruim = '';
    var l = pool();
    if (!l.length && (st.a.budget && st.a.budget !== 'geen')) { l = pool(null, ['budget']); ruim = 'budget'; }
    if (!l.length && gekozenMaat()) { l = pool(null, ['budget', 'maat', 'dmaat']); ruim = 'maat'; }
    var mt = gekozenMaat(), mid = null;
    if (st.a.budget && st.a.budget !== 'geen' && !ruim) {
      var d = String(st.a.budget).split('-'), lo = parseFloat(d[0]), hi = d[1] ? parseFloat(d[1]) : lo * 1.6;
      mid = (lo + hi) / 2;
    } else if (l.length) {   /* geen budget: rond de mediaanprijs, dan is het voorbeeld representatief */
      var px = l.map(function (p) { return prijsVoor(p, mt); }).sort(function (a, b) { return a - b; });
      mid = px[Math.floor(px.length / 2)];
    }
    var rij = l.map(function (p) { var v = voorkeurScore(p); return { p: p, s: v.s, precies: v.precies, iets: v.iets }; });
    rij.sort(function (a, b) {
      return b.s - a.s ||
        (mid != null ? Math.abs(prijsVoor(a.p, mt) - mid) - Math.abs(prijsVoor(b.p, mt) - mid) : 0) ||
        ((b.p.imageCount > 1 ? 1 : 0) - (a.p.imageCount > 1 ? 1 : 0)) || prijsVoor(a.p, mt) - prijsVoor(b.p, mt);
    });
    /* eerst wat precies past, dan de rest; binnen elke groep afwisseling (hooguit twee van hetzelfde merk, tenzij er niet genoeg anders is) */
    var gekozen = [], per = {};
    [true, false].forEach(function (pr) {
      var groep = rij.filter(function (r) { return r.precies === pr; });
      groep.forEach(function (r) { if (gekozen.length < 6 && (per[r.p.brand] || 0) < 2) { gekozen.push(r); per[r.p.brand] = (per[r.p.brand] || 0) + 1; } });
      groep.forEach(function (r) { if (gekozen.length < 6 && gekozen.indexOf(r) === -1) gekozen.push(r); });
    });
    var preciesN = rij.filter(function (r) { return r.precies; }).length;
    return { lijst: gekozen, pool: l, ruim: ruim, preciesN: preciesN, iets: rij.length ? rij[0].iets : false };
  }

  function reden(p) {
    var d = [], mt = gekozenMaat();
    if (st.pad === 'bed') {
      var m = (p.materials || []).filter(function (x) { return NATUUR.indexOf(x) > -1 || ['Latex', 'Traagschuim', 'Koudschuim', 'Dons', 'Tencel'].indexOf(x) > -1; });
      if (m.length) d.push(lijstZin(m.slice(0, 3)));
      if (p.showroom) d.push('Staat in onze showroom');
    } else if (st.pad === 'kussen') {
      var mk = (p.materials || []).filter(function (x) { return ['Dons', 'Veren', 'Latex', 'Traagschuim', 'Synthetisch', 'Kapok', 'Wol', 'Tencel'].indexOf(x) > -1; });
      if (mk.length) d.push(lijstZin(mk));
      var vorm = fac(p, 'shape');
      if (vorm.length) d.push(vorm.length > 1 ? 'Als ' + lijstZin(vorm.map(function (x) { return x.toLowerCase(); })).replace(/ en ([^ ]+)$/, ' of $1') : vorm[0]);
      var hd = fac(p, 'firmness');
      if (hd.length) d.push('In ' + lijstZin(hd.map(function (x) { return x.toLowerCase(); })).replace(/ en ([^ ]+)$/, ' of $1'));
    } else if (st.pad === 'dekbed') {
      var wk = st.a.warmte, w = fac(p, 'warmth');
      if (wk === 'warm' && w.indexOf('4') > -1) d.push('Warmteklasse 4');
      if (wk === 'midden' && w.indexOf('3') > -1) d.push('Warmteklasse 3');
      if (wk === 'koud') { var k = ['1', '2'].filter(function (x) { return w.indexOf(x) > -1; }); if (k.length) d.push('Warmteklasse ' + k.join(' en ')); }
      if (wk === 'seizoen' && (w.indexOf('duo') > -1 || /4-seizoenen/i.test(p.title))) d.push('4-seizoenen');
      if ((p.materials || []).length) d.push(lijstZin(p.materials.slice(0, 3)));
    } else if (st.pad === 'hoeslaken') {
      var hk = hoeken(p), ok = hk;
      if (st.a.hoek === 'topper') ok = hk.filter(function (c) { return c <= 10; });
      if (st.a.hoek === 'matras') ok = hk.filter(function (c) { return c >= 25 && c <= 35; });
      if (st.a.hoek === 'hoog') ok = hk.filter(function (c) { return c >= 40; });
      if (ok.length) d.push('Hoekhoogte ' + lijstZin(ok.map(String)) + ' cm');
      if (st.a.split && p.facets && p.facets.split) d.push('Met split');
      if (p.colorCount > 1) d.push(p.colorCount + ' kleuren');
      if ((p.materials || []).length) d.push(lijstZin(p.materials.slice(0, 2)));
    }
    /* de maat niet herhalen als ze al in de naam staat ("Bergamo · 180/200 cm") */
    if (mt && (p.sizes || []).indexOf(mt) > -1 && String(p.name || '').indexOf(mt) === -1) d.push(mt + ' cm');
    return d.join(' · ');
  }
  function prijsTekst(p) {
    var mt = gekozenMaat();
    if (mt && p.sizePrices && p.sizePrices[mt] != null) {
      return '<span class="prijs__nu">' + (p.priceMin === p.priceMax ? '' : 'Vanaf ') + TS.prijs(p.sizePrices[mt]) + '</span>';
    }
    return TS.prijsHtml(p);
  }

  /* ---------------------------------------------------------------- tekenen */
  var vak = null, zij = null, res = null;

  function bouwVakken() {
    mount.innerHTML = '<div class="wijzer__vraag" data-w-vraag></div><div class="wijzer__zij" data-w-zij></div>' +
      '<div class="wijzer__resultaat" data-w-res hidden></div>';
    vak = $('[data-w-vraag]', mount); zij = $('[data-w-zij]', mount); res = $('[data-w-res]', mount);
    mount.addEventListener('change', wijziging);
    mount.addEventListener('submit', function (e) { e.preventDefault(); volgende(); });
    mount.addEventListener('click', klik);
  }

  function keuzeHtml(q, o, i, beeld) {
    var gekozen = q === 'pad' ? st.pad === o.w : st.a[q] === o.w;
    var cls = 'keuze keuze--radio ' + (beeld ? 'keuze--beeld' : ((q === 'maat' || q === 'dmaat') && !o.geen ? 'keuze--maat' : 'keuze--tekst'));
    var sub = [o.sub, o.tel].filter(Boolean).join(' · ');
    return '<li' + (o.extra ? ' data-w-extra hidden' : '') + '><label class="' + cls + '"><input class="vh-input" type="radio" name="w-' + q + '" value="' + esc(o.w) + '"' + (gekozen ? ' checked' : '') + '>' +
      (beeld || '') +
      '<span class="keuze__tekst"><span>' + (o.hex ? '<span class="keuze__staal" style="--staal:' + esc(o.hex) + '" aria-hidden="true"></span>' : '') + esc(o.t) + '</span>' +
      (sub ? '<span class="keuze__sub">' + esc(sub) + '</span>' : '') + '</span>' +
      '<span class="keuze__vink" aria-hidden="true">' + TS.icoon('check') + '</span></label></li>';
  }

  function vraagHtml() {
    var lijst = stappen(), q = lijst[st.i], o, voor = '', na = '', advies = '', legend, keuzesCls = 'keuzes';
    var totaal = st.pad ? lijst.length : 5;
    if (q === 'pad') {
      legend = 'Waar ben je naar op zoek?';
      o = Object.keys(PADEN).map(function (k) { return { w: k, t: PADEN[k].naam, tel: n_(ALLE.filter(PADEN[k].basis).length, PADEN[k].woord) }; });
      var cel = o.map(function (x, i) { return keuzeHtml('pad', x, i, START[x.w] || ''); }).join('');
      return wrap(legend, '<ul class="keuzes">' + cel + '</ul>', 1, totaal);
    }
    var v = VRAGEN[q];
    legend = q === 'budget' && st.pad === 'bed' ? 'Wat is je budget voor dit stuk?' : v.legend;
    o = opties(q);
    if (v.maten) {
      keuzesCls = 'keuzes keuzes--maten';
      var vast = o.filter(function (x) { return !x.geen; }), geen = o.filter(function (x) { return x.geen; });
      var zicht = 8, idx = vast.map(function (x) { return x.w; }).indexOf(st.a[q]);
      if (idx >= zicht) zicht = vast.length;
      vast.forEach(function (x, i) { if (i >= zicht) x.extra = true; });
      o = vast.concat(geen);
      if (vast.length > zicht) na += '<button type="button" class="tlink wmeer" data-w-meer>Toon alle ' + vast.length + ' maten</button>';
      if (v.reken) {
        var bed = [70, 80, 90, 100, 120, 140, 160, 180, 200].map(function (b) { return '<option value="' + b + '"' + (String(st.a._bed) === String(b) ? ' selected' : '') + '>' + b + ' cm</option>'; }).join('');
        var lg = [];
        for (var c = 150; c <= 210; c += 5) lg.push('<option value="' + c + '"' + (String(st.a._lengte) === String(c) ? ' selected' : '') + '>' + (c / 100).toFixed(2).replace('.', ',') + ' m</option>');
        voor = '<div class="wreken"><p class="wreken__kop">Reken je maat uit</p>' +
          '<div class="veld"><label for="w-bed">Hoe breed is je bed?</label><select id="w-bed" data-w-bed><option value="">Kies</option>' + bed + '</select></div>' +
          '<div class="veld"><label for="w-lengte">Hoe groot ben je?</label><select id="w-lengte" data-w-lengte><option value="">Kies</option>' + lg.join('') + '</select></div>' +
          '<p class="wreken__uit" aria-live="polite" data-w-reken></p></div>';
      }
    }
    if (v.split) {
      var ns = pool(q).filter(function (p) { return p.facets && p.facets.split === true; }).length;
      if (ns) na += '<label class="vinkje wvraag__extra"><input type="checkbox" data-w-split' + (st.a.split ? ' checked' : '') + '><span>Verstelbare boxspring: met split <span class="keuze__sub">(' + n_(ns, PADEN[st.pad].woord) + ')</span></span></label>';
    }
    var gekozenOptie = o.filter(function (x) { return x.w === st.a[q]; })[0];
    var adv = gekozenOptie && (gekozenOptie.advies || (optieVan(q, gekozenOptie.w) || {}).advies);
    advies = '<p class="wvraag__advies" data-w-advies' + (adv ? '' : ' hidden') + '><strong>Uit ons slaapadvies:</strong> <span>' + esc(adv || '') + '</span></p>';
    if (v.split) advies += '<p class="wvraag__advies" data-w-splitadvies' + (st.a.split ? '' : ' hidden') + '><strong>Uit ons slaapadvies:</strong> Heb je een (elektrisch) verstelbare boxspring, hou er dan rekening mee of je een split nodig hebt aan het hoofd- en/of voeteinde.</p>';
    var cellen = o.map(function (x, i) { return keuzeHtml(q, x, i, ''); }).join('');
    return wrap(legend, voor + '<ul class="' + keuzesCls + '">' + cellen + '</ul>' + na + advies, st.i + 1, totaal);
  }
  function wrap(legend, inhoud, nr, totaal) {
    var laatste = st.pad && nr === totaal;
    return '<form novalidate data-w-form><fieldset class="wvraag" aria-describedby="w-stapnr"><legend class="wijzer__legend">' + esc(legend) + '</legend>' + inhoud + '</fieldset>' +
      '<p class="wijzer__melding" aria-live="polite" data-w-melding></p>' +
      '<div class="wijzer__nav"><button type="button" class="tlink" data-w-vorige' + (nr === 1 ? ' hidden' : '') + '>Vorige</button>' +
      '<span class="wijzer__stap" id="w-stapnr">Stap ' + nr + ' van ' + totaal + '</span>' +
      '<button type="submit" class="knop knop--vol">' + (laatste ? 'Toon mijn testlijst' : 'Volgende') + '</button></div>' +
      '<p class="wijzer__noot">' + NOOT + '</p></form>';
  }

  var vorigeTop = '';
  function tekenZij(meld) {
    if (!st.pad) {
      var tot = ALLE.length;
      zij.innerHTML = '<p class="wijzer__tel"><span class="wijzer__getal" data-w-getal>' + tot + '</span> <span>producten om uit te kiezen, van een kussen tot een boxspring</span></p>' + platen(voorbeeld());
      vorigeTop = '';
      return;
    }
    var basis = basisPool().length, r = resultaat(), n = r.iets ? r.preciesN : r.pool.length, w = PADEN[st.pad].woord;
    var tekst = r.iets ? 'van ' + n_(basis, w) + ' passen precies bij je keuzes' : 'van ' + n_(basis, w) + ' passen bij je keuzes';
    if (!r.iets && n === basis) tekst = n === 1 ? w[0] + ' om uit te kiezen' : w[1] + ' om uit te kiezen';
    var top = r.lijst.slice(0, 3).map(function (x) { return x.p; });
    var sleutel = top.map(function (p) { return p.handle; }).join(',');
    var getal = $('[data-w-getal]', zij);
    if (!getal || !zij.querySelector('[data-w-teltekst]')) {
      zij.innerHTML = '<p class="wijzer__tel"><span class="wijzer__getal" data-w-getal>' + n + '</span> <span data-w-teltekst></span></p><div data-w-platen></div>';
      getal = $('[data-w-getal]', zij);
    } else rol(getal, n);
    $('[data-w-teltekst]', zij).textContent = tekst;
    if (sleutel !== vorigeTop) { $('[data-w-platen]', zij).innerHTML = platen(top, true); vorigeTop = sleutel; }
    if (meld) TS.meld('Nog ' + n + ' ' + tekst);
  }
  function voorbeeld() {
    return ['vispring-boxspringset-renaissance', 'dauny-kussen-soft', 'bella-donna-standaard-hoeslaken-hoek-30-cm'].map(TS.product).filter(Boolean);
  }
  function platen(lijst, nieuw) {
    if (!lijst.length) return '<p class="wijzer__zijnoot">Geen exacte match. Je testlijst toont wat het dichtst in de buurt komt.</p>';
    return '<ul class="wijzer__platen">' + lijst.map(function (p, i) {
      return '<li' + (nieuw ? ' class="is-nieuw" style="--i:' + i + '"' : '') + '><a href="' + TS.productUrl(p.handle) + '">' + TS.plaat(p, '(min-width: 1024px) 12vw, 30vw') +
        '<span>' + esc(p.brand + ' ' + p.nameShort) + '</span><span class="prijs">' + prijsTekst(p) + '</span></a></li>';
    }).join('') + '</ul>';
  }
  function rol(el, naar) {
    var van = parseInt(el.textContent, 10) || 0;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (TS.reduce || van === naar) { el.textContent = naar; return; }
    var t0 = null;
    function stap(t) {
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / 300), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(van + (naar - van) * e);
      if (k < 1) el._raf = requestAnimationFrame(stap);
    }
    el._raf = requestAnimationFrame(stap);
  }

  function tekenVraag(animeer, focus) {
    res.hidden = true; vak.hidden = false; zij.hidden = false;
    var zet = function () {
      vak.innerHTML = vraagHtml();
      var fs = $('.wvraag', vak);
      if (animeer && !TS.reduce) fs.classList.add('is-in');
      if (focus) {
        var r = $('input:checked', fs) || $('input[type="radio"]', fs);
        if (r) r.focus({ preventScroll: true });
        var top = mount.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) mount.scrollIntoView({ block: 'start', behavior: TS.reduce ? 'auto' : 'smooth' });
      }
      tekenZij();
      fotoPad();
    };
    var oud = $('.wvraag', vak);
    if (animeer && oud && !TS.reduce) { oud.classList.add('is-uit'); setTimeout(zet, 200); } else zet();
  }

  function tekenResultaat(focus) {
    var r = resultaat(), P = PADEN[st.pad], w = P.woord;
    var keuzes = [P.naam];
    PADEN[st.pad].vragen.forEach(function (q) {
      var a = st.a[q];
      if (!a || a === 'geen') return;
      var v = VRAGEN[q];
      if (v.maten) keuzes.push(a + ' cm');
      else if (v.budget) { var s = schijven(pool('budget')).filter(function (x) { return x.w === a; })[0]; if (s) keuzes.push(s.t); }
      else if (v.kleur) { var t = TINTEN.filter(function (x) { return x[0] === a; })[0]; if (t) keuzes.push(t[1]); }
      else { var o = optieVan(q, a); if (o) keuzes.push(o.t); }
    });
    if (st.a.split) keuzes.push('Met split');
    var ruim = '';
    if (r.ruim === 'budget') ruim = 'Binnen dat budget vonden we niets' + (gekozenMaat() ? ' in ' + gekozenMaat() : '') + '. Dit zijn de modellen die het dichtst in de buurt komen.';
    else if (r.ruim === 'maat') ruim = 'In ' + (st.a.maat || st.a.dmaat) + ' vonden we niets dat past. Dit zijn de modellen die het dichtst in de buurt komen.';
    else if (r.iets && r.preciesN === 0) ruim = 'Geen enkel model past precies bij al je voorkeuren. Dit zijn de modellen die het dichtst in de buurt komen.';
    else if (r.iets && r.preciesN < r.lijst.length) ruim = (r.preciesN === 1 ? 'Het eerste ' + w[0] + ' past' : 'De eerste ' + r.preciesN + ' ' + w[1] + ' passen') + ' precies bij al je voorkeuren. De andere komen het dichtst in de buurt.';
    var handles = r.lijst.map(function (x) { return x.p.handle; });
    var rijen = r.lijst.map(function (x, i) {
      var p = x.p, item = st.pad !== 'bed' && TS.mandItemVan ? TS.mandItemVan(p) : null;
      return '<li class="trij" style="--i:' + i + '"><a href="' + TS.productUrl(p.handle) + '" tabindex="-1" aria-hidden="true">' + TS.miniVan(p) + '</a>' +
        '<div><p class="trij__merk">' + esc(p.brand) + '</p><p class="trij__naam"><a href="' + TS.productUrl(p.handle) + '">' + esc(p.name) + '</a></p>' +
        (reden(p) ? '<p class="trij__reden">' + esc(reden(p)) + '</p>' : '') + '</div>' +
        '<p class="trij__prijs prijs">' + prijsTekst(p) + '</p>' +
        '<div class="trij__acties"><button class="hart" type="button" data-bewaar="' + p.handle + '" aria-pressed="false" aria-label="Bewaar ' + esc(p.brand + ' ' + p.nameShort) + '">' + TS.icoon('hart') + '</button>' +
        (item ? '<button type="button" class="tlink trij__mand" data-w-mand="' + p.handle + '">In mand<span class="vh"> ' + esc(p.brand + ' ' + p.nameShort) + '</span></button>' : '') + '</div></li>';
    }).join('');
    var lijstUrl = R + 'slaapadvies.html?lijst=' + handles.join(',');
    res.innerHTML = '<div class="testlijst vel"><' + HK + ' class="testlijst__kop" tabindex="-1" data-w-kop>Je testlijst</' + HK + '>' +
      '<p class="testlijst__intro">' + n_(r.lijst.length, w) + ' uit onze collectie voor: ' + esc(keuzes.join(' · ')) + '.</p>' +
      (ruim ? '<p class="testlijst__ruim" role="status">' + esc(ruim) + '</p>' : '') +
      '<ol class="trijen">' + rijen + '</ol>' +
      '<p class="testlijst__noot">' + P.noot + '</p>' +
      '<div class="testlijst__knoppen"><a class="knop knop--vol" href="' + lijstUrl + '">Plan een slaapadvies met deze lijst</a>' +
      '<button type="button" class="knop knop--zacht" data-w-bewaaralles>Bewaar alles</button>' +
      '<button type="button" class="tlink" data-w-opnieuw>Opnieuw</button>' +
      '<a class="tlink" href="' + R + P.url + '">Bekijk alle ' + esc(P.alle[1]) + '</a></div></div>' +
      '<p class="wijzer__noot">' + NOOT + '</p>';
    vak.hidden = true; zij.hidden = true; res.hidden = false;
    TS.hartjes();
    fotoPad();
    TS.meld('Je testlijst is klaar: ' + n_(r.lijst.length, w) + '.');
    if (focus) {
      var k = $('[data-w-kop]', res);
      var top = mount.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) mount.scrollIntoView({ block: 'start', behavior: TS.reduce ? 'auto' : 'smooth' });
      if (k) k.focus({ preventScroll: true });
    }
  }

  /* ---------------------------------------------------------------- bediening */
  function melding(t) { var m = $('[data-w-melding]', vak); if (m) m.textContent = t || ''; }
  function wijziging(e) {
    var t = e.target;
    if (t.matches('[data-w-split]')) {
      st.a.split = t.checked;
      var sa = $('[data-w-splitadvies]', vak); if (sa) sa.hidden = !t.checked;
      wisNa('hoek'); bewaar(); tekenZij(true); return;
    }
    if (t.matches('[data-w-bed], [data-w-lengte]')) { reken(); return; }
    if (t.type !== 'radio' || !/^w-/.test(t.name)) return;
    var q = t.name.slice(2);
    melding('');
    if (q === 'pad') {
      if (st.pad !== t.value) { st.pad = t.value; st.a = {}; }
      var nr = $('#w-stapnr', vak); if (nr) nr.textContent = 'Stap 1 van ' + stappen().length;
    } else {
      if (st.a[q] !== t.value) { st.a[q] = t.value; wisNa(q); }
      var o = opties(q).filter(function (x) { return x.w === t.value; })[0];
      var adv = $('[data-w-advies]', vak), tekst = o && (o.advies || (optieVan(q, o.w) || {}).advies);
      if (adv) { adv.hidden = !tekst; $('span', adv).textContent = tekst || ''; }
    }
    bewaar();
    tekenZij(true);
    fotoPad();
  }
  /* een eerder antwoord veranderd: de latere harde filters kunnen niet meer kloppen */
  function wisNa(q) {
    var vr = PADEN[st.pad].vragen, i = vr.indexOf(q);
    vr.slice(i + 1).forEach(function (x) { if (VRAGEN[x].soort === 'filter') delete st.a[x]; });
    if (q !== 'hoek' && vr.indexOf('hoek') > i) delete st.a.split;
  }
  function reken() {
    var b = parseInt(($('[data-w-bed]', vak) || {}).value, 10), l = parseInt(($('[data-w-lengte]', vak) || {}).value, 10);
    st.a._bed = b || null; st.a._lengte = l || null;
    var uit = $('[data-w-reken]', vak);
    if (!b || !l) { if (uit) uit.textContent = ''; bewaar(); return; }
    var nb = b + 60, nl = l + 30;
    var kand = matenVan(pool('dmaat')).map(function (m) { var d = m.w.split('/'); return { w: m.w, b: +d[0], l: +d[1] }; })
      .filter(function (m) { return m.b >= nb && m.l >= nl; })
      .sort(function (x, y) { return x.b * x.l - y.b * y.l; });
    if (!kand.length) {
      uit.textContent = 'Volgens onze richtlijn heb je minstens ' + nb + ' cm breed en ' + nl + ' cm lang nodig. Zo groot vinden we het niet in deze selectie: vraag ernaar in de winkel.';
      bewaar(); return;
    }
    var m = kand[0];
    uit.textContent = 'Volgens onze richtlijn (30 cm aan weerszijden en 30 cm langer dan jij): minstens ' + nb + ' op ' + nl + ' cm. Dat wordt ' + m.w + '.';
    $$('[data-w-extra]', vak).forEach(function (li) { li.hidden = false; });
    var meer = $('[data-w-meer]', vak); if (meer) meer.remove();
    var r = $$('input[name="w-dmaat"]', vak).filter(function (x) { return x.value === m.w; })[0];
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  function volgende() {
    var lijst = stappen(), q = lijst[st.i];
    var gekozen = q === 'pad' ? st.pad : st.a[q];
    if (!gekozen) {
      melding(q === 'hoek' ? 'Kies waarover het hoeslaken moet passen.' : 'Kies een antwoord om verder te gaan.');
      var r = $('input[type="radio"]', vak); if (r) r.focus();
      return;
    }
    lijst = stappen();
    if (st.i >= lijst.length - 1) { st.klaar = true; bewaar(); tekenResultaat(true); return; }
    st.i++;
    bewaar();
    tekenVraag(true, true);
  }
  function klik(e) {
    var t = e.target;
    if (t.closest('[data-w-vorige]')) { st.i = Math.max(0, st.i - 1); bewaar(); tekenVraag(true, true); return; }
    if (t.closest('[data-w-meer]')) {
      $$('[data-w-extra]', vak).forEach(function (li) { li.hidden = false; });
      var f = $$('[data-w-extra] input', vak)[0];
      t.closest('[data-w-meer]').remove();
      if (f) f.focus();
      return;
    }
    if (t.closest('[data-w-opnieuw]')) {
      st = { pad: null, a: {}, i: 0, klaar: false }; bewaar(); vorigeTop = '';
      tekenVraag(false, true);
      return;
    }
    if (t.closest('[data-w-bewaaralles]')) {
      var b = t.closest('[data-w-bewaaralles]');
      var h = $$('[data-bewaar]', res).map(function (x) { return x.getAttribute('data-bewaar'); });
      var l = TS.bewaard.list();
      h.forEach(function (x) { if (l.indexOf(x) === -1) l.push(x); });
      TS.bewaard.set(l);
      b.innerHTML = TS.icoon('check') + 'Alles bewaard';
      TS.meld('De hele testlijst is bewaard. Je vindt hem terug onder Bewaard.');
      return;
    }
    var m = t.closest('[data-w-mand]');
    if (m) {
      var p = TS.product(m.getAttribute('data-w-mand')), it = p && TS.mandItemVan(p);
      if (it) TS.mand.add(it);
    }
  }

  /* foto op de slaapwijzerpagina wisselt mee met het pad */
  var fotoVak = doc.querySelector('[data-wijzer-fotos]'), FOTOS = null;
  if (fotoVak) { try { FOTOS = JSON.parse(fotoVak.getAttribute('data-wijzer-fotos')); } catch (e) { FOTOS = null; } }
  function fotoPad() {
    if (!fotoVak || !FOTOS) return;
    var f = FOTOS[st.pad || 'start'];
    if (!f) return;
    var aan = $('.wpagina__img.is-aan', fotoVak);
    if (aan && aan.getAttribute('src') === f.src) return;
    var im = $$('img', fotoVak).filter(function (x) { return x.getAttribute('src') === f.src; })[0];
    if (!im) {
      im = doc.createElement('img');
      im.className = 'wpagina__img'; im.src = f.src; im.alt = f.alt; im.width = f.w; im.height = f.h; im.decoding = 'async';
      fotoVak.appendChild(im);
    }
    var zet = function () { $$('img', fotoVak).forEach(function (x) { x.classList.toggle('is-aan', x === im); }); };
    if (im.complete) zet(); else im.addEventListener('load', zet, { once: true });
  }

  /* ---------------------------------------------------------------- start */
  function start() {
    if (!window.CATALOG || vak) return;
    ALLE = window.CATALOG.products.filter(function (p) { return p.status === 'beschikbaar'; });
    bouwVakken();
    var url = null;
    try { url = new URLSearchParams(location.search).get('pad'); } catch (e) { url = null; }
    var oud = TS.store.get('2s.wijzer', null);
    if (opPagina && url && PADEN[url]) {
      st = { pad: url, a: {}, i: 1, klaar: false };
      bewaar();
    } else if (oud && oud.pad && PADEN[oud.pad]) {
      st = { pad: oud.pad, a: oud.a || {}, i: Math.max(0, parseInt(oud.i, 10) || 0), klaar: !!oud.klaar };
    }
    if (st.pad && st.i > stappen().length - 1) st.i = stappen().length - 1;
    if (st.klaar && st.pad) tekenResultaat(false); else tekenVraag(false, false);
  }
  if (window.CATALOG) start();
  else {
    var laad = function () { TS.loadCatalog().then(start).catch(function () {}); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); laad(); } }, { rootMargin: '600px 0px' });
      io.observe(mount);
    } else laad();
    mount.addEventListener('pointerenter', laad, { once: true });
    mount.addEventListener('focusin', laad, { once: true });
  }
})();
