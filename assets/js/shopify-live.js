/* 2-Sleep voorbeeldshop · alles live uit Shopify (28/11/2026).
   Wordt door site.js geladen (TS.shopify.laadLaag) als LIVE_ACTIEF aan staat. De gebouwde html blijft de basis; dit script
   vervangt alleen wat sinds de bouw in Shopify veranderde (vingerafdruk per Shopify-product in SHOPIFY_BASIS,
   assets/js/shopify-bronnen.js) en voegt toe wat nieuw is:
     - TS.live.start()            hele productlijst + catalogus: prijzen, "vanaf"-prijzen en aantallen in het menu, de tegels
                                  op home en de merkenlijst; kaarten van verdwenen producten weg, gewijzigde kaarten vervangen;
                                  nieuwe producten in de catalogus (afdelingen, merken, zoeken). Daarna het event ts:catalogus.
     - TS.live.productPagina()    op een gebouwde productpagina: titel, beschrijving, foto's en varianten als die in Shopify
                                  veranderd zijn; bestaat het product niet meer, dan een melding en niet meer bestelbaar.
     - TS.live.dynamisch()        product/index.html?p=<handle in Shopify>: een product dat niet in de bouw zit, in dezelfde
                                  opmaak als de gebouwde productpagina's.
   Samengevoegde producten blijven samengevoegd zoals in de bouw (SHOPIFY_BRONNEN). Een nieuw product dat daar niet in staat,
   is een apart product. Lukt Shopify niet, dan blijft alles van de bouw staan. Geen bibliotheken. */
(function () {
  'use strict';
  var TS = window.TS;
  if (!TS || !TS.shopify || TS.live) return;
  var S = TS.shopify, $ = TS.$, $$ = TS.$$, esc = TS.esc, doc = document, R = TS.root || '';
  var L = TS.live = {};

  /* ---------------------------------------------------------------- vaste lijsten (zoals _bron/scripts/build_catalog.py) */
  var CAT_VOLG = ['boxsprings', 'luxe-boxsprings', 'matrassen', 'toppers', 'bedkaders', 'waterbedden', 'dekbedden', 'kussens',
    'dekbedovertrekken', 'hoeslakens', 'matrasbeschermers', 'nachtkledij', 'badtextiel', 'meubilair', 'verzorging', 'divers'];
  var BEDDEN = ['boxsprings', 'luxe-boxsprings', 'matrassen', 'toppers', 'bedkaders', 'waterbedden'];
  var TYPE_MAP = { 'boxsprings': 'boxsprings', 'luxe boxsprings': 'luxe-boxsprings', 'matrassen': 'matrassen', 'topper': 'toppers',
    'waterbedden': 'waterbedden', 'dekbedden': 'dekbedden', 'kussens': 'kussens', 'kussentjes': 'kussens',
    'dekbedovertrekken': 'dekbedovertrekken', 'bekbedovertrek': 'dekbedovertrekken', 'hoeslakens': 'hoeslakens',
    'moltons & matrasbeschermers': 'matrasbeschermers', 'matrasbeschermers': 'matrasbeschermers', 'meubilair': 'meubilair' };
  var VENDOR_FIX = { 'Parfum de Ligne': 'Parfum de Linge' };
  var TITEL_MERKEN = ['Hästens', 'Vispring', 'Tempur', 'Jensen', 'Dorbien'];
  var MERK_VARIANTEN = { 'Tempur': ['TEMPUR®', 'TEMPUR', 'Tempur®', 'Tempur'], '2-Sleep': ['2-Sleep', '2Sleep'], 'Hästens': ['Hästens', 'Hastens'] };
  var MAAT_OPTIES = ['Maat in cm', 'Afmetingen in cm', 'Maat', 'Afmeting', 'Afmetingen'];

  /* ---------------------------------------------------------------- hulpjes */
  function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hoofd(x) { return x ? x.charAt(0).toUpperCase() + x.slice(1) : x; }
  function slug(s) {
    return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' en ').replace(/%/g, ' procent ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  }
  function streep(s) { return String(s || '').replace(/[—–‒―]/g, '-').replace(/️/g, ''); }
  /* beeld van Shopify op maat (de CDN van Shopify schaalt met ?width=) */
  function cdn(src, w) {
    if (!/cdn\.shopify\.com|\/cdn\/shop\//.test(src)) return src;
    return src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + w;
  }
  function BASIS() { return window.SHOPIFY_BASIS || { h: {}, weg: [], ov: {} }; }
  function BRONNEN() { return window.SHOPIFY_BRONNEN || {}; }
  /* wat er sinds de bouw veranderde aan een Shopify-product: {t, b, i, v} (titel, beschrijving, beelden, varianten) */
  function verschil(x) {
    var oud = BASIS().h[x.h];
    var nu = S.vinger(x).split('.');
    if (!oud) return { t: true, b: true, i: true, v: true };
    oud = oud.split('.');
    return { t: oud[0] !== nu[0], b: oud[1] !== nu[1], i: oud[2] !== nu[2], v: oud[3] !== nu[3] };
  }
  L.verschil = verschil;

  /* ---------------------------------------------------------------- namen (zoals clean_title, naam_delen, namen_set) */
  function schoonTitel(t) {
    var s = String(t || '');
    s = s.replace(/\bVERK+OCHT\b!?\s*-?\s*/gi, '');
    s = s.replace(/\s*ACTIE\s*50\s*%\s*korting\s*/gi, ' ');
    s = s.replace(/\bElectrische\b/g, 'Elektrische').replace(/\blntermediate\b/g, 'Intermediate').replace(/\bHerarld\b/g, 'Herald');
    s = s.replace(/^(Hästens|Dommelin|Nomo)\s+-\s+/, '$1 ');
    s = s.replace(/([\p{L}\p{N}_])-\s+/gu, '$1 - ');
    s = s.replace(/([\p{L}\p{N}_])&\s/gu, '$1 & ');
    s = s.replace(/(\d)\s*cm\b/g, '$1 cm');
    s = streep(s);
    s = s.replace(/\s+-\s+-\s+/g, ' - ');
    return s.replace(/\s+/g, ' ').replace(/^[\s-]+|[\s-]+$/g, '');
  }
  function merkVan(p) {
    var v = VENDOR_FIX[p.vd] || p.vd || '';
    if (v === '2-Sleep') {
      for (var i = 0; i < TITEL_MERKEN.length; i++) if (new RegExp('\\b' + reEsc(TITEL_MERKEN[i]) + '\\b', 'i').test(p.t)) return TITEL_MERKEN[i];
    }
    return v;
  }
  function naamDelen(titel, merk) {
    var t = titel.trim();
    var vs = MERK_VARIANTEN[merk] || [merk];
    for (var i = 0; i < vs.length; i++) {
      var m = new RegExp('^' + reEsc(vs[i]) + '(?:\\s*[®™])?\\s+', 'i').exec(t);
      if (m && t.length > m[0].length + 2) { t = t.slice(m[0].length); break; }
    }
    t = t.replace(/^[- ]+/, '').trim();
    var k = t.indexOf(' - ');
    var kop = (k > -1 ? t.slice(0, k) : t).trim(), steun = k > -1 ? t.slice(k + 3).trim() : '';
    if (kop && kop.charAt(0) !== kop.charAt(0).toUpperCase()) kop = hoofd(kop);
    return [kop, steun];
  }
  function kopInkorten(kop, steun) {
    var delen = [], MAX = 36, mm;
    if (kop.length > MAX && (mm = /\s(\d{2,3}\/\d{3}\s?cm\b.*)$/.exec(kop)) && mm.index >= 8) { delen.unshift(mm[1].trim()); kop = kop.slice(0, mm.index).replace(/^[\s,-]+|[\s,-]+$/g, ''); }
    if (kop.length > MAX && (mm = /\s*\(([^()]+)\)\s*$/.exec(kop)) && mm.index >= 12) { delen.unshift(hoofd(mm[1].trim())); kop = kop.slice(0, mm.index).trim(); }
    if (kop.length > MAX && (mm = /\s(incl\.|met)\s/.exec(kop)) && mm.index >= 12) { delen.unshift(hoofd(kop.slice(mm.index + 1).trim())); kop = kop.slice(0, mm.index).trim(); }
    return [kop, delen.concat(steun ? [steun] : []).join(' · ')];
  }
  function namenSet(t, merk, showroom, stock) {
    t = t.trim();
    if (!(showroom || stock || /^promotie/i.test(t))) return null;
    var soort = showroom ? 'Showroommodel' : (stock ? 'Stockverkoop' : '');
    t = t.replace(/\s*\(showroommodel\)\s*$/i, '');
    var vs = MERK_VARIANTEN[merk] || [merk];
    for (var i = 0; i < vs.length; i++) {
      var m = new RegExp('^' + reEsc(vs[i]) + '(?:\\s*[®™])?\\s+', 'i').exec(t);
      if (m) { t = t.slice(m[0].length); break; }
    }
    t = t.replace(/^(?:showroomset|showroom|stockverkoop|promotie)\s+/i, '');
    if (TITEL_MERKEN.indexOf(merk) > -1) t = t.replace(new RegExp('\\b' + reEsc(merk) + '\\b\\s*', 'ig'), '').trim();
    var maat = '', mm = /,?\s*(\d{2,3}\/\d{3}) cm/.exec(t);
    if (mm) { maat = mm[1] + ' cm'; t = (t.slice(0, mm.index) + t.slice(mm.index + mm[0].length)).replace(/^[\s,]+|[\s,]+$/g, ''); }
    var deel2 = '', extra = '', k;
    if ((k = t.indexOf(' - ')) > -1) { deel2 = t.slice(k + 3).trim(); t = t.slice(0, k).trim(); }
    if ((k = t.indexOf(', ')) > -1) { extra = t.slice(k + 2).trim(); t = t.slice(0, k).trim(); }
    var sm = /^((?:elektrische\s+)?boxspringset|promotieset)\b\s*/i.exec(t);
    var soortwoord = sm ? hoofd(sm[1]) : '', model = hoofd(sm ? t.slice(sm[0].length).trim() : t.trim());
    var kop, steun, kaart;
    if (deel2) {
      kop = (model + ' ' + deel2).trim();
      steun = [soortwoord, soort, maat, extra].filter(Boolean).join(' · ');
      kaart = model ? model + ' · ' + deel2 : kop;
    } else {
      kop = (soortwoord + ' ' + model).trim() || t;
      steun = [soort, maat, extra].filter(Boolean).join(' · ');
      kaart = model && maat ? model + ' · ' + maat : (maat ? kop + ' · ' + maat : kop);
    }
    return [kop, steun, kaart];
  }
  /* {kop, steun, naam} uit de titel (de titel van het eerste bronproduct, opgeschoond) */
  function namen(titel, merk, showroom, stock) {
    var d = naamDelen(titel, merk);
    var s = namenSet(titel, merk, showroom, stock);
    if (s) return { kop: s[0], steun: s[1], naam: s[2] };
    var naam = d[0] + (d[1] ? ' - ' + d[1] : '');
    var k = kopInkorten(d[0], d[1]);
    return { kop: k[0], steun: k[1], naam: naam };
  }

  /* ---------------------------------------------------------------- afdelingen (zoals categories_for, zonder de collecties) */
  function afdelingen(p) {
    var t = (p.pt || '').trim().toLowerCase(), titel = p.t.toLowerCase(), v = p.vd, c = [];
    if (titel.indexOf('kussensloop') > -1 && titel.indexOf('dekbedovertrek') === -1) c.push('kussens');
    else if (v === 'Parfum de Ligne') c.push('verzorging');
    else if (v === 'Profine') c.push('verzorging', 'waterbedden');
    else if (titel.indexOf('wasmiddel') > -1) c.push('verzorging');
    else if (/kimono|pyjama|nachtkleed|nightdress|short navy|trousers|slippers|boots/.test(titel)) c.push('nachtkledij');
    else if (/badjas|badlinnen|handdoek/.test(titel)) c.push('badtextiel');
    else if (TYPE_MAP[t]) c.push(TYPE_MAP[t]);
    else if (t === '') {
      if (titel.indexOf('hoeslaken') > -1) c.push('hoeslakens');
      else if (titel.indexOf('dekbed') > -1) c.push('dekbedden');
      else if (titel.indexOf('kussen') > -1 || titel.indexOf('bedrugsteun') > -1) c.push('kussens');
      else if (titel.indexOf('smartcool') > -1 && titel.indexOf('tempur') > -1) c.push('matrassen');
    }
    return c;
  }
  /* alleen afdelingen met een eigen pagina; anders Divers */
  function metPagina(cats) {
    var er = {};
    (window.CATALOG ? window.CATALOG.categories : []).forEach(function (x) { er[x.slug] = 1; });
    var uit = cats.filter(function (c) { return er[c]; });
    if (!uit.length) uit = ['divers'];
    return uit;
  }
  function merkSlug(naam) {
    var b = (window.CATALOG ? window.CATALOG.brands : []).filter(function (x) { return x.name === naam; })[0];
    return b ? b.slug : slug(naam);
  }
  function catNaam(s) {
    var c = (window.CATALOG ? window.CATALOG.categories : []).filter(function (x) { return x.slug === s; })[0];
    return c ? c.name : 'Collectie';
  }
  function heeftPagina(slugNaam) {
    var C = window.CATALOG;
    if (!C) return false;
    return C.categories.concat(C.brands).concat(C.special).some(function (x) { return x.slug === slugNaam; });
  }

  /* ---------------------------------------------------------------- beschrijving (zoals clean_html en beschrijving()) */
  var BLOK = { P: 'p', UL: 'ul', OL: 'ul', H1: 'h3', H2: 'h3', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3' };
  function inline(n) {
    var uit = '';
    n.childNodes.forEach(function (c) {
      if (c.nodeType === 3) uit += esc(c.nodeValue);
      else if (c.nodeType === 1) {
        var t = c.tagName;
        if (t === 'BR') uit += ' ';
        else if (t === 'STRONG' || t === 'B') { var x = inline(c); if (x.trim()) uit += '<strong>' + x + '</strong>'; }
        else if (t === 'SCRIPT' || t === 'STYLE' || t === 'IFRAME' || t === 'IMG') { /* weg */ }
        else uit += inline(c);
      }
    });
    return uit;
  }
  function blokken(html) {
    var raw = String(html || '');
    if (raw.indexOf('<') === -1) raw = raw.split(/\n\s*\n/).filter(function (x) { return x.trim(); }).map(function (x) { return '<p>' + esc(x.trim()) + '</p>'; }).join('');
    var d = new DOMParser().parseFromString('<div>' + raw + '</div>', 'text/html');
    var uit = [], losse = '';
    function sluitLos() { var t = losse.replace(/\s+/g, ' ').trim(); if (t) uit.push(['p', t]); losse = ''; }
    function loop(n) {
      n.childNodes.forEach(function (c) {
        if (c.nodeType === 3) { losse += esc(c.nodeValue); return; }
        if (c.nodeType !== 1) return;
        var soort = BLOK[c.tagName];
        if (soort === 'ul') {
          sluitLos();
          var li = $$('li', c).map(function (x) { return streep(inline(x).replace(/\s+/g, ' ').trim()); }).filter(function (x) { return x.replace(/<[^>]+>/g, '').trim(); });
          if (li.length) uit.push(['ul', li]);
        } else if (soort) {
          sluitLos();
          var t = streep(inline(c).replace(/\s+/g, ' ').trim());
          if (soort === 'h3') t = t.replace(/<\/?strong>/g, '').trim();
          if (t.replace(/<[^>]+>/g, '').trim()) uit.push([soort, t]);
        } else if (/^(DIV|SECTION|ARTICLE|TABLE|TBODY|TR|TD|BLOCKQUOTE)$/.test(c.tagName)) { sluitLos(); loop(c); sluitLos(); }
        else if (/^(SCRIPT|STYLE|IFRAME|IMG|META|LINK)$/.test(c.tagName)) { /* weg */ }
        else if (c.tagName === 'BR') losse += ' ';
        else losse += c.tagName === 'STRONG' || c.tagName === 'B' ? '<strong>' + inline(c) + '</strong>' : inline(c);
      });
    }
    loop(d.body.firstChild);
    sluitLos();
    return uit;
  }
  function gelijkend(a, b) { a = a.toLowerCase().trim(); b = b.toLowerCase().trim(); return !!a && !!b && (a.indexOf(b) > -1 || b.indexOf(a) > -1); }
  /* kapitalen-alinea's naar een zinshoofdletter (zoals schoon_beschr in bouw_paginas.py) */
  function zinsvorm(t) {
    var kaal = t.replace(/<[^>]+>/g, '');
    if (kaal.length > 12 && kaal.toUpperCase() === kaal && /[A-Za-zÀ-ÿ]/.test(kaal)) {
      t = t.replace(/\bUW\b/g, 'JE').toLowerCase().replace(/tempur/g, 'TEMPUR');
      t = hoofd(t);
    }
    return t;
  }
  /* html van de beschrijving, zoals op de gebouwde pagina: twee blokken zichtbaar, de rest achter "Lees verder" */
  function beschrijvingHtml(raw, titels) {
    var bl = blokken(raw);
    if (bl.length && bl[0][0] === 'h3' && titels.some(function (t) { return gelijkend(bl[0][1].replace(/<[^>]+>/g, ''), t); })) bl = bl.slice(1);
    var h = bl.map(function (b) {
      if (b[0] === 'ul') return '<ul>' + b[1].map(function (i) { return '<li>' + zinsvorm(i) + '</li>'; }).join('') + '</ul>';
      if (b[0] === 'h3') { var x = b[1]; if (x.toUpperCase() === x) x = hoofd(x.toLowerCase()); return '<h3>' + x + '</h3>'; }
      return '<p>' + zinsvorm(b[1]) + '</p>';
    });
    if (h.length <= 3) return '<div class="beschr">' + h.join('') + '</div>';
    var n = 1;
    if (!/^<h3/.test(h[0]) && h.length > 1 && !/^<h3/.test(h[1])) n = 2;
    if (/^<h3/.test(h[0])) n = 2;
    return '<div class="beschr">' + h.slice(0, n).join('') + '<div class="beschr__meer" data-lees-meer>' + h.slice(n).join('') + '</div></div>';
  }
  function tekstVan(raw) { return blokken(raw).map(function (b) { return b[0] === 'ul' ? b[1].join(' ') : b[1]; }).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

  /* ---------------------------------------------------------------- model van een product uit zijn Shopify-bronnen
     leden = [{p: compact, vals: {optie: waarde}}] (vals = wat de samenvoeging toevoegde, bv. de kleur uit de titel).
     Zelfde regels als build_product() in build_catalog.py, zonder de collecties van Shopify. */
  function optNamen(p) {
    if (p.on.length === 1 && p.on[0] === 'Title' && p.vs.every(function (v) { return v[1][0] === 'Default Title'; })) return [];
    return p.on;
  }
  function maatSleutel(v) { var n = String(v).match(/\d+/g); return n ? n.map(Number) : null; }
  function beeldInfo(im) {
    var w = im[2] || 1000, h = im[3] || w, groot = Math.min(w, 1400), klein = Math.min(w, 600);
    return { src: cdn(im[1], groot), thumb: cdn(im[1], klein), mini: cdn(im[1], 160), staal: cdn(im[1], 96),
      w: groot, h: Math.round(h * groot / w), tw: klein, th: Math.round(h * klein / w), bg: 'white', klein: w < 600, key: S.kaal(im[1]) };
  }
  function model(leden, extra) {
    extra = extra || {};
    var nieuwe = [];
    leden.forEach(function (l) { Object.keys(l.vals || {}).forEach(function (k) { if (nieuwe.indexOf(k) === -1) nieuwe.push(k); }); });
    var volg = nieuwe.slice();
    leden.forEach(function (l) { optNamen(l.p).forEach(function (n) { if (volg.indexOf(n) === -1) volg.push(n); }); });
    var beelden = [], pos = {};
    function beeld(im) {
      var k = S.kaal(im[1]);
      if (pos[k] == null) { pos[k] = beelden.length; beelden.push(beeldInfo(im)); }
      return pos[k];
    }
    var varianten = [], gezien = {}, kleurBeeld = {};
    volg.forEach(function (n) { gezien[n] = []; });
    leden.forEach(function (l) {
      var p = l.p, namenP = optNamen(p);
      var idx = p.im.map(beeld), eerste = idx.length ? idx[0] : null;
      p.vs.forEach(function (v) {
        var ov = {};
        namenP.forEach(function (n, i) { ov[n] = v[1][i]; });
        Object.keys(l.vals || {}).forEach(function (k) { ov[k] = l.vals[k]; });
        var vi = v[5] > -1 ? idx[v[5]] : eerste;
        varianten.push({ id: v[0], options: volg.map(function (n) { return ov[n] == null ? null : ov[n]; }),
          price: v[2], compareAtPrice: v[3], available: !!v[4], image: vi, bron: p.h, m: !v[2] });
        volg.forEach(function (n) { if (ov[n] != null && gezien[n].indexOf(ov[n]) === -1) gezien[n].push(ov[n]); });
        if (ov.Kleur != null && vi != null && kleurBeeld[ov.Kleur] == null) kleurBeeld[ov.Kleur] = vi;
      });
    });
    if (leden.length > 1) {
      volg.forEach(function (n) {
        if (/maat|afmeting/i.test(n) && nieuwe.indexOf(n) === -1) {
          gezien[n].sort(function (a, b) {
            var x = maatSleutel(a), y = maatSleutel(b);
            if (!x || !y) return (!x) - (!y);
            for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
            return 0;
          });
        }
      });
    }
    var opties = volg.filter(function (n) { return gezien[n].length; }).map(function (n) { return { name: n, values: gezien[n] }; });
    /* varianten met opties die wegvielen (lege optie): de opties volgen de lijst */
    var keep = volg.map(function (n) { return gezien[n].length > 0; });
    varianten.forEach(function (v) { v.options = v.options.filter(function (x, i) { return keep[i]; }); });
    var p0 = leden[0].p;
    var titel = extra.titel || (leden.length > 1 ? null : schoonTitel(p0.t));
    var merk = extra.merk || merkVan(p0);
    var tl = leden.map(function (l) { return l.p.t.toLowerCase(); });
    var showroom = tl.some(function (t) { return t.indexOf('showroom') > -1; });
    var stock = tl.some(function (t) { return t.indexOf('stockverkoop') > -1; });
    var promo = leden.some(function (l) {
      return l.p.vs.some(function (v) { return v[3]; }) || /showroom|promotie|stockverkoop|\bactie\b/.test(l.p.t.toLowerCase()) || l.p.tg.indexOf('Promotie') > -1;
    });
    var geprijsd = varianten.filter(function (v) { return v.price; });
    var prijzen = geprijsd.map(function (v) { return v.price; });
    var cmps = varianten.map(function (v) { return v.compareAtPrice; }).filter(Boolean);
    var korting = varianten.filter(function (v) { return v.compareAtPrice && v.price; }).map(function (v) { return Math.round((v.compareAtPrice - v.price) / v.compareAtPrice * 100); });
    var beschikbaar = varianten.some(function (v) { return v.available; });
    var verkocht = leden.some(function (l) { return /verk+ocht/i.test(l.p.t); }) &&
      leden.every(function (l) { return /verk+ocht/i.test(l.p.t) || !l.p.vs.some(function (v) { return v[4]; }); });
    var status = verkocht ? 'verkocht' : (beschikbaar ? 'beschikbaar' : 'uitverkocht');
    var cats = [];
    leden.forEach(function (l) { afdelingen(l.p).forEach(function (c) { if (cats.indexOf(c) === -1) cats.push(c); }); });
    if (!cats.length) cats = ['divers'];
    if (cats.length > 1 && cats.indexOf('divers') > -1) cats.splice(cats.indexOf('divers'), 1);
    cats.sort(function (a, b) { return CAT_VOLG.indexOf(a) - CAT_VOLG.indexOf(b); });
    var merken = [];
    leden.forEach(function (l) { var b = merkVan(l.p); if (merken.indexOf(b) === -1) merken.push(b); });
    /* kaart- en hoverbeeld */
    var kaart = beelden.length ? 0 : null;
    if (leden.length > 1 && volg.indexOf('Kleur') > -1) {
      var kl = gezien.Kleur || [], wit = kl.filter(function (k) { return /^(wit|white)\b/i.test(k) && kleurBeeld[k] != null; })[0];
      var k0 = wit || kl.filter(function (k) { return kleurBeeld[k] != null; })[0];
      if (k0 != null) kaart = kleurBeeld[k0];
    }
    var hover = null;
    for (var i = 0; i < beelden.length; i++) if (i !== kaart && beelden[i].key !== (beelden[kaart] || {}).key) { hover = i; break; }
    /* beschrijving: de meest voorkomende */
    var tel = {}, best = '', bestN = 0;
    leden.forEach(function (l) { var d = l.p.b || ''; tel[d] = (tel[d] || 0) + 1; if (tel[d] > bestN) { bestN = tel[d]; best = d; } });
    var goedkoop = geprijsd.slice().sort(function (a, b) { return a.price - b.price; })[0];
    var m = {
      titel: titel, merk: merk, merken: merken, cats: cats, cat: cats[0], beelden: beelden, kaart: kaart, hover: hover,
      opties: opties, varianten: varianten, kleurBeeld: kleurBeeld, beschrRaw: best, status: status,
      priceMin: prijzen.length ? Math.min.apply(null, prijzen) : null, priceMax: prijzen.length ? Math.max.apply(null, prijzen) : null,
      cmpMin: goedkoop && goedkoop.compareAtPrice && goedkoop.compareAtPrice > goedkoop.price ? goedkoop.compareAtPrice : null,
      compareAtMax: cmps.length ? Math.max.apply(null, cmps) : null, discountMaxPct: korting.length ? Math.max.apply(null, korting) : null,
      available: beschikbaar, promo: promo, showroom: showroom, stockverkoop: stock, onSale: cmps.length > 0,
      tags: [].concat.apply([], leden.map(function (l) { return l.p.tg; })), publishedAt: (leden.map(function (l) { return l.p.pa; }).sort()[0] || '').slice(0, 10),
      bronnen: leden.map(function (l) { return l.p.h; })
    };
    if (titel) { var nm = namen(titel, merk, showroom, stock); m.kop = nm.kop; m.steun = nm.steun; m.naam = nm.naam; }
    m.label = m.status === 'verkocht' ? 'Verkocht' : m.status === 'uitverkocht' ? 'Uitverkocht' : showroom ? 'Showroommodel' : stock ? 'Stockverkoop' : (promo || m.onSale) ? 'Promotie' : '';
    m.isBed = BEDDEN.indexOf(m.cat) > -1 && (m.priceMin || 0) >= 300;
    return m;
  }
  L.model = model;

  /* maten voor de filters (zoals maten_uit in bouw.py, vereenvoudigd: "180/200" en bereiken "180/200-200/220" als begin) */
  function maten(m) {
    var uit = [];
    m.opties.forEach(function (o, oi) {
      if (MAAT_OPTIES.indexOf(o.name) === -1) return;
      o.values.forEach(function (v) { var x = /^\s*(\d{2,3})\s*\/\s*(\d{3})\b/.exec(v); if (x && uit.indexOf(x[1] + '/' + x[2]) === -1) uit.push(x[1] + '/' + x[2]); });
    });
    if (!uit.length) { var t = /(\d{2,3})\s*\/\s*(\d{3})\s*cm/.exec(m.titel || ''); if (t) uit.push(t[1] + '/' + t[2]); }
    return uit;
  }

  /* ---------------------------------------------------------------- catalogusproduct (data.js-vorm) uit een model */
  function kaartBeeld(b, metMini) {
    if (!b) return null;
    var d = { src: b.src, thumb: b.thumb, w: b.tw, h: b.th, lw: b.w, bg: 'white' };
    if (metMini) d.mini = b.mini;
    if (b.klein) { d.small = true; d.nw = b.w; d.nh = b.h; }
    return d;
  }
  function catProduct(m, shopifyHandle, handle) {
    var o = {
      handle: handle, shopifyHandle: shopifyHandle, nieuw: true, title: m.titel, name: m.naam, nameShort: m.kop, brand: m.merk,
      brandSlug: merkSlug(m.merk), brands: m.merken.map(merkSlug), category: m.cat, categories: m.cats,
      priceMin: m.priceMin, priceMax: m.priceMax, status: m.status, available: m.available, label: m.label,
      publishedAt: m.publishedAt, imageCount: m.beelden.length, card: kaartBeeld(m.beelden[m.kaart], true), tags: m.tags
    };
    if (m.cmpMin) o.compareAt = m.cmpMin;
    if (m.compareAtMax && m.compareAtMax > m.priceMin) { o.compareAtMax = m.compareAtMax; o.discountMaxPct = m.discountMaxPct; }
    ['promo', 'showroom', 'stockverkoop', 'onSale'].forEach(function (k) { if (m[k]) o[k] = true; });
    if (m.hover != null) o.hover = kaartBeeld(m.beelden[m.hover]);
    var mt = maten(m); if (mt.length) o.sizes = mt;
    var gv = m.varianten.filter(function (v) { return !v.m; });
    if (m.varianten.length === 1 && gv.length === 1) o.singleVariant = { id: gv[0].id, title: gv[0].options.join(' / ') || 'Standaard', price: gv[0].price };
    return o;
  }

  /* ---------------------------------------------------------------- de catalogus live maken (één keer per pagina) */
  var catLaden = null;
  L.catalogus = function () {
    if (catLaden) return catLaden;
    catLaden = Promise.all([S.feed(), TS.loadCatalog().catch(function () { return null; }), S.laadBronnen()]).then(function (r) {
      var f = r[0], C = r[1] || window.CATALOG;
      if (!f || !C || !r[2]) return null;
      pasToe(f, C);
      return C;
    }).catch(function () { return null; });
    return catLaden;
  };
  var BUILD = null;   /* aantallen en prijzen van de bouw, om alleen te wijzigen wat echt anders is */
  function pasToe(f, C) {
    var BR = BRONNEN(), basis = BASIS();
    BUILD = { tel: {} };
    C.categories.concat(C.brands).concat(C.special).forEach(function (x) { BUILD.tel[x.slug] = { n: x.count, p: x.priceMin }; });
    var bekend = {}, weg = [], gewijzigd = [], nieuw = [];
    Object.keys(BR).forEach(function (h) { BR[h].forEach(function (s) { bekend[s] = h; }); });
    (basis.weg || []).forEach(function (s) { bekend[s] = bekend[s] || '-'; });
    var houden = [];
    C.products.forEach(function (p) {
      var srcs = BR[p.handle];
      if (!srcs) { if (!p.nieuw) houden.push(p); return; }
      var live = srcs.map(function (s) { return f.idx[s]; }).filter(Boolean);
      if (!live.length) { weg.push(p.handle); return; }
      var ds = live.map(verschil);
      var m = model(live.map(function (x) { return { p: x, vals: (basis.ov || {})[x.h] || {} }; }), { titel: p.title, merk: p.brand });
      var oud = { prijs: TS.prijsHtml(p), label: p.label || '', status: p.status, naam: p.name, beeld: p.card && p.card.thumb };
      p.priceMin = m.priceMin; p.priceMax = m.priceMax; p.available = m.available;
      if (p.status !== 'verkocht' || m.status !== 'verkocht') p.status = m.status;
      if (m.cmpMin) p.compareAt = m.cmpMin; else delete p.compareAt;
      if (m.compareAtMax && m.compareAtMax > m.priceMin) { p.compareAtMax = m.compareAtMax; p.discountMaxPct = m.discountMaxPct; } else { delete p.compareAtMax; delete p.discountMaxPct; }
      if (m.onSale) p.onSale = true; else delete p.onSale;
      p.label = p.status === 'verkocht' ? 'Verkocht' : p.status === 'uitverkocht' ? 'Uitverkocht' : p.showroom ? 'Showroommodel' : p.stockverkoop ? 'Stockverkoop' : (p.promo || p.onSale) ? 'Promotie' : '';
      if (p.singleVariant) {
        var sv = m.varianten.filter(function (v) { return v.id === p.singleVariant.id; })[0];
        if (sv) p.singleVariant.price = sv.price; else delete p.singleVariant;
      }
      /* titel: alleen bij een product met één bron (een samengevoegd product heeft een eigen naam) */
      if (live.length === 1 && srcs.length === 1 && ds[0].t) {
        var t = schoonTitel(live[0].t), nm = namen(t, p.brand, p.showroom, p.stockverkoop);
        p.title = t; p.name = nm.naam; p.nameShort = nm.kop;
      }
      if (ds.some(function (d) { return d.i; }) || live.length < srcs.length) {
        if (m.kaart != null) { p.card = kaartBeeld(m.beelden[m.kaart], true); p.hover = m.hover != null ? kaartBeeld(m.beelden[m.hover]) : undefined; if (!p.hover) delete p.hover; }
        else { p.card = null; delete p.hover; }
        p.imageCount = m.beelden.length;
      }
      if (ds.some(function (d) { return d.v; }) || live.length < srcs.length) { var mt = maten(m); if (mt.length) p.sizes = mt; }
      var nu = { prijs: TS.prijsHtml(p), label: p.label || '', status: p.status, naam: p.name, beeld: p.card && p.card.thumb };
      p._gewijzigd = Object.keys(oud).some(function (k) { return oud[k] !== nu[k]; });
      if (p._gewijzigd) gewijzigd.push(p.handle);
      houden.push(p);
    });
    var hs = {};
    houden.forEach(function (p) { hs[p.handle] = 1; });
    f.l.forEach(function (x) {
      if (bekend[x.h]) return;
      var m = model([{ p: x, vals: {} }]);
      m.cats = metPagina(m.cats); m.cat = m.cats[0];
      var h = hs[x.h] ? 'shopify-' + x.h : x.h;
      var p = catProduct(m, x.h, h);
      hs[h] = 1;
      houden.push(p);
      nieuw.push(h);
    });
    C.products = houden;
    TS.herIndex();
    /* aantallen en "vanaf"-prijzen */
    function vanaf(l) { var ps = l.filter(function (p) { return p.status === 'beschikbaar' && p.priceMin != null; }).map(function (p) { return p.priceMin; }); return ps.length ? Math.min.apply(null, ps) : null; }
    C.categories.forEach(function (c) { var l = houden.filter(function (p) { return (p.categories || []).indexOf(c.slug) > -1; }); c.count = l.length; c.priceMin = vanaf(l); });
    C.brands.forEach(function (b) { var l = houden.filter(function (p) { return (p.brands || []).indexOf(b.slug) > -1; }); b.count = l.length; });
    C.special.forEach(function (s) {
      var l = houden.filter(function (p) { return s.slug === 'showroommodellen' ? (p.showroom || p.stockverkoop) : ((p.promo || p.onSale) && !p.showroom && !p.stockverkoop); });
      s.count = l.length; s.priceMin = vanaf(l);
    });
    L.stand = { weg: weg, gewijzigd: gewijzigd, nieuw: nieuw, t: f.t };
  }

  /* ---------------------------------------------------------------- pagina bijwerken: tellers, tegels, kaarten */
  function aantalTekst(n) { return n + (n === 1 ? ' product' : ' producten'); }
  function tellers() {
    var C = window.CATALOG;
    if (!C || !BUILD) return;
    var nu = {};
    C.categories.concat(C.brands).concat(C.special).forEach(function (x) { nu[x.slug] = { n: x.count, p: x.priceMin }; });
    $$('a[href*="collectie/"]').forEach(function (a) {
      var m = /collectie\/([^/?#]+)\.html/.exec(a.getAttribute('href') || '');
      if (!m || !nu[m[1]] || !BUILD.tel[m[1]]) return;
      var s = m[1], n = nu[s].n, oudN = BUILD.tel[s].n;
      if (n !== oudN) {
        $$('.mega__n', a).forEach(function (el) { if (/^\(\d+\)$/.test(el.textContent.trim())) el.textContent = '(' + n + ')'; });
        $$('.tegel__n', a).forEach(function (el) { if (/^\d+ producten?$/.test(el.textContent.trim())) el.textContent = aantalTekst(n); });
        $$('.index__meta', a).forEach(function (el) { el.textContent = el.textContent.replace(/^\d+ producten?/, aantalTekst(n)); });
      }
      var p = nu[s].p, oudP = BUILD.tel[s].p;
      if (p != null && oudP != null && Math.abs(p - oudP) > 0.004) {
        $$('.mega__prijs, .tegel__prijs', a).forEach(function (el) { if (/^vanaf /.test(el.textContent.trim())) el.textContent = 'vanaf ' + TS.prijs(p); });
      }
    });
  }
  /* kaarten van verdwenen producten weg, gewijzigde opnieuw (zelfde opmaak via TS.kaart) */
  function kaarten() {
    var C = window.CATALOG, st = L.stand;
    if (!C || !st) return;
    var weg = {}; st.weg.forEach(function (h) { weg[h] = 1; });
    var anders = {}; st.gewijzigd.forEach(function (h) { anders[h] = 1; });
    $$('.kaart[data-h]').forEach(function (k) {
      var h = k.getAttribute('data-h');
      if (weg[h]) {
        var li = k.parentNode && k.parentNode.tagName === 'LI' && !k.parentNode.classList.contains('bkaart') ? k.parentNode : k;
        li.parentNode.removeChild(li);
        return;
      }
      if (!anders[h]) return;
      var p = TS.product(h);
      if (!p) return;
      var img = k.querySelector('.plaat__a');
      var tmp = doc.createElement('div');
      tmp.innerHTML = TS.kaart(p, { sizes: img ? img.getAttribute('sizes') : null });
      var nieuw = tmp.firstChild;
      if (k.hidden) nieuw.hidden = true;
      k.parentNode.replaceChild(nieuw, k);
    });
    TS.hartjes();
  }

  var gestart = null;
  /* lijsten en tellers van deze pagina bijwerken; daarna ts:catalogus (collectie.js, zoeken.js, verlanglijst.js, product.js) */
  L.start = function () {
    if (gestart) return gestart;
    gestart = L.catalogus().then(function (C) {
      if (!C) { doc.documentElement.setAttribute('data-shopify-lijst', 'terugval'); return null; }
      tellers();
      kaarten();
      doc.documentElement.setAttribute('data-shopify-lijst', 'ok');
      TS.emit('catalogus', L.stand);
      return C;
    });
    return gestart;
  };

  /* ---------------------------------------------------------------- productpagina: html (zelfde opmaak als bouw_paginas.py) */
  function bxl(v) { var m = /^\s*(\d{2,3})\s*\/\s*(\d{3})\s*(cm)?\s*$/.exec(String(v)); return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null; }
  function toonWaarde(v) { return String(v).replace(/\s*=>\s*/g, ': '); }
  /* de opties als fieldsets + de data voor product.js. oudeStalen: {waarde: inhoud van het staal} van de gebouwde pagina */
  function optiesHtml(m, oudeStalen) {
    var out = [], data = [];
    m.opties.forEach(function (o, oi) {
      var vals = o.values, info = { name: o.name, values: vals };
      if (vals.length <= 1) { info.type = 'vast'; data.push(info); return; }
      var bl = vals.map(bxl);
      var b0 = {}, l0 = {};
      bl.forEach(function (x) { if (x) { b0[x[0]] = 1; l0[x[1]] = 1; } });
      if (MAAT_OPTIES.indexOf(o.name) > -1 && bl.every(Boolean) && Object.keys(b0).length > 1 && Object.keys(l0).length > 1) {
        info.type = 'maat2'; info.bxl = {};
        vals.forEach(function (v, i) { info.bxl[v] = bl[i]; });
        var br = Object.keys(b0).map(Number).sort(function (a, b) { return a - b; }), le = Object.keys(l0).map(Number).sort(function (a, b) { return a - b; });
        var hulp = m.cat === 'dekbedden' ? '<a class="optie__hulp tlink" href="' + R + 'advies/dekbed-maat.html">Hoe groot moet een dekbed zijn?</a>' : '';
        out.push('<fieldset class="optie" data-optie="' + oi + '" data-deel="b"><legend class="optie__label">Breedte <span class="optie__gekozen" data-gekozen></span></legend>' + hulp +
          '<div class="knoppen">' + br.map(function (b) { return '<input class="vh-input" type="radio" name="o' + oi + 'b" id="o' + oi + 'b' + b + '" value="' + b + '"><label class="kn" for="o' + oi + 'b' + b + '">' + b + '</label>'; }).join('') + '</div></fieldset>');
        out.push('<fieldset class="optie" data-optie="' + oi + '" data-deel="l"><legend class="optie__label">Lengte <span class="optie__gekozen" data-gekozen></span></legend>' +
          '<div class="knoppen">' + le.map(function (l) { return '<input class="vh-input" type="radio" name="o' + oi + 'l" id="o' + oi + 'l' + l + '" value="' + l + '"><label class="kn" for="o' + oi + 'l' + l + '">' + l + '</label>'; }).join('') +
          '</div><p class="optie__uitleg vh" id="o' + oi + 'uitleg">Niet elke combinatie van breedte en lengte bestaat; die knoppen zijn uitgeschakeld.</p></fieldset>');
      } else if (o.name === 'Kleur') {
        info.type = 'kleur';
        var stalen = vals.map(function (v, vi) {
          var inner = oudeStalen && oudeStalen[v];
          if (inner == null) {
            var bi = m.kleurBeeld[v];
            inner = '<span class="vh">' + esc(v) + '</span>' + (bi != null && m.beelden[bi] ? '<img src="' + esc(m.beelden[bi].staal) + '" alt="" loading="lazy" decoding="async" width="40" height="40">' : '');
          }
          var hex = (oudeStalen && oudeStalen['#' + v]) || '#ccc';
          return '<span class="staal-w"' + (vi >= 24 ? ' data-extra' : '') + '><input class="vh-input" type="radio" name="o' + oi + '" id="o' + oi + 'v' + vi + '" value="' + esc(v) + '">' +
            '<label class="staal" for="o' + oi + 'v' + vi + '" style="--staal:' + esc(hex) + '" title="' + esc(v) + '">' + inner + '</label></span>';
        });
        var meer = vals.length > 24 ? '<button class="tlink optie__meer" type="button" data-alle-kleuren>Toon alle ' + vals.length + ' kleuren</button>' : '';
        out.push('<fieldset class="optie optie--kleur" data-optie="' + oi + '"><legend class="optie__label">Kleur: <span class="optie__gekozen" data-gekozen>kies een kleur</span></legend>' +
          '<div class="stalen-kies">' + stalen.join('') + '</div>' + meer + '</fieldset>');
      } else {
        info.type = 'knop';
        var lab = { 'Afmetingen in cm': 'Afmeting', 'Maat in cm': 'Maat' }[o.name] || o.name;
        out.push('<fieldset class="optie" data-optie="' + oi + '"><legend class="optie__label">' + esc(lab) + ' <span class="optie__gekozen" data-gekozen></span></legend>' +
          '<div class="knoppen">' + vals.map(function (v, vi) { return '<input class="vh-input" type="radio" name="o' + oi + '" id="o' + oi + 'v' + vi + '" value="' + esc(v) + '"><label class="kn" for="o' + oi + 'v' + vi + '">' + esc(toonWaarde(v)) + '</label>'; }).join('') +
          '</div></fieldset>');
      }
      data.push(info);
    });
    return { html: out.join(''), data: data };
  }
  L.optiesHtml = optiesHtml;
  /* volgorde van de foto's in de galerij en de html */
  function galerij(m, kop, merk) {
    var b = m.beelden;
    if (!b.length) return { html: '<div class="gal gal--leeg"><div class="plaat plaat--leeg plaat--groot"><span class="plaat__merk">' + esc(merk) + '</span><span class="plaat__naam">' + esc(kop) + '</span></div></div>', volg: [] };
    var volg = b.map(function (x, i) { return i; });
    if (m.kaart) { volg.splice(volg.indexOf(m.kaart), 1); volg.unshift(m.kaart); }
    if (m.kaart != null && b[m.kaart].klein) {
      var g = -1; for (var i = 0; i < b.length; i++) if (!b[i].klein) { g = i; break; }
      if (g > -1) { volg.splice(volg.indexOf(g), 1); volg.unshift(g); }
    }
    var n = b.length, ar = 1.0;
    var dias = volg.map(function (i, k) {
      var x = b[i];
      var cls = 'dia dia--wit' + (x.klein ? ' dia--klein' : '');
      var stijl = x.klein ? ' style="--nw:' + x.w + 'px;--nh:' + x.h + 'px"' : '';
      var ss = x.w > x.tw ? ' srcset="' + esc(x.thumb) + ' ' + x.tw + 'w, ' + esc(x.src) + ' ' + x.w + 'w" sizes="(min-width: 1024px) 55vw, 100vw"' : '';
      var alt = merk + ' ' + kop + ', foto ' + (k + 1) + ' van ' + n;
      return '<li class="' + cls + '" data-i="' + i + '"' + stijl + '><button class="dia__knop" type="button" data-zoom="' + k + '" aria-label="Vergroot foto ' + (k + 1) + ' van ' + n + '">' +
        '<img src="' + esc(x.w <= x.tw ? x.thumb : x.src) + '"' + ss + ' width="' + x.w + '" height="' + x.h + '" alt="' + esc(alt) + '"' + (k ? ' loading="lazy"' : ' fetchpriority="high"') + ' decoding="async"></button></li>';
    });
    var duimen = n > 1 ? volg.map(function (i, k) {
      return '<li><button class="duim duim--wit" type="button" data-naar="' + k + '" aria-label="Toon foto ' + (k + 1) + '"' + (k ? '' : ' aria-current="true"') + '>' +
        '<img src="' + esc(b[i].mini) + '" width="64" height="64" alt="" loading="lazy" decoding="async"></button></li>';
    }) : [];
    var pijlen = n > 1 ? '<button class="gal__pijl gal__pijl--vorig" type="button" data-vorig aria-label="Vorige foto">' + TS.icoon('pijl-links') + '</button>' +
      '<button class="gal__pijl gal__pijl--volg" type="button" data-volgend aria-label="Volgende foto">' + TS.icoon('pijl') + '</button>' +
      '<p class="gal__tel" aria-live="polite"><span data-tel>1</span> van ' + n + '</p>' : '';
    return {
      html: '<div class="gal" data-galerij style="--ar:' + ar.toFixed(3) + '"><ul class="gal__spoor" data-spoor tabindex="0" aria-label="Foto\'s van ' + esc(kop) + '">' + dias.join('') + '</ul>' + pijlen +
        (duimen.length ? '<ul class="gal__duimen">' + duimen.join('') + '</ul>' : '') + '</div>',
      volg: volg
    };
  }
  /* product-data voor product.js uit een model (opties met hun soort) */
  function pdata(m, opt, volg, extra) {
    var pos = {}; volg.forEach(function (i, n) { pos[i] = n; });
    var kleurPos = {}; Object.keys(m.kleurBeeld).forEach(function (k) { if (pos[m.kleurBeeld[k]] != null) kleurPos[k] = pos[m.kleurBeeld[k]]; });
    var kb = m.kaart != null ? m.beelden[m.kaart] : null;
    var P = {
      options: opt.data,
      variants: m.varianten.map(function (v) { var x = { id: v.id, o: v.options, p: v.price, c: v.compareAtPrice, a: v.available, i: v.image, bron: v.bron }; if (v.m) x.m = true; return x; }),
      imagePos: pos, colorPos: kleurPos, thumb: kb ? kb.thumb : null, thumbBg: kb ? 'white' : null, mini: kb ? kb.mini : null,
      isBed: m.isBed, priceMin: m.priceMin, priceMax: m.priceMax, status: m.status
    };
    Object.keys(extra || {}).forEach(function (k) { P[k] = extra[k]; });
    return P;
  }
  function prijsBlok(m) {
    var hoofdP = m.priceMin === m.priceMax ? TS.prijs(m.priceMin) : 'Vanaf ' + TS.prijs(m.priceMin);
    return '<span class="prijs__nu">' + hoofdP + '</span>' + (m.cmpMin ? ' <s class="prijs__oud"><span class="vh">was </span>' + TS.prijs(m.cmpMin) + '</s>' : '');
  }
  function koopRij() {
    return '<div class="koop__rij"><div class="stapper" data-stapper><button type="button" data-min aria-label="Eén minder">' + TS.icoon('min') + '</button>' +
      '<label class="vh" for="aantal">Aantal</label><input id="aantal" type="number" inputmode="numeric" min="1" max="99" value="1" data-aantal-veld>' +
      '<button type="button" data-plus aria-label="Eén meer">' + TS.icoon('plus') + '</button></div>' +
      '<button class="knop knop--vol koop__knop" type="submit" data-in-mand>In winkelmand</button></div>' +
      '<p class="koop__melding" data-koop-melding aria-live="polite"></p>';
  }
  /* vaste stukken uit product/index.html (<template data-pd="...">), gemaakt door de bouw: adres en levering op één plaats */
  function stuk(naam) { var t = $('template[data-pd="' + naam + '"]'); return t ? t.innerHTML : ''; }

  function rij(titel, lijst, id, url) {
    if (!lijst.length) return '';
    return '<section class="rij" aria-labelledby="' + id + '" data-rij><div class="rij__kop"><h2 id="' + id + '">' + esc(titel) + '</h2>' +
      '<a class="tlink" href="' + R + url + '">Bekijk alles</a><span class="rij__pijlen"><button type="button" data-rij-vorig aria-label="Vorige producten">' + TS.icoon('pijl-links') + '</button>' +
      '<button type="button" data-rij-volg aria-label="Volgende producten">' + TS.icoon('pijl') + '</button></span></div>' +
      '<ul class="rij__spoor" data-rij-spoor>' + lijst.map(function (p) { return '<li>' + TS.kaart(p, { sizes: '(min-width: 1024px) 21vw, 62vw' }) + '</li>'; }).join('') + '</ul></section>';
  }
  function aanbevolen(l) {
    var st = { beschikbaar: 0, uitverkocht: 1, verkocht: 2 };
    return l.slice().sort(function (a, b) {
      return ((a.card ? 0 : 1) - (b.card ? 0 : 1)) || ((st[a.status] || 0) - (st[b.status] || 0)) ||
        (CAT_VOLG.indexOf(a.category) - CAT_VOLG.indexOf(b.category)) || ((a.priceMin || 0) - (b.priceMin || 0));
    });
  }

  /* ---------------------------------------------------------------- gebouwde productpagina bijwerken */
  function toonWeg(api) {
    var main = api.main;
    main.setAttribute('data-weg', '');
    var kr = $$('.kruimel a', main)[1];
    var url = kr ? kr.getAttribute('href') : R + 'index.html#afdelingen';
    var naam = kr ? kr.textContent : 'onze afdelingen';
    var blok = $('.pd__prijsblok', main);
    var html = '<div class="pd__weg" role="status"><p class="pd__weg-kop">Dit product is niet meer beschikbaar.</p>' +
      '<p>Kijk gerust wat we nog hebben in <a href="' + esc(url) + '">' + esc(naam.toLowerCase()) + '</a>, of kom langs in de showroom.</p>' +
      '<p><a class="knop knop--vol" href="' + esc(url) + '">Naar ' + esc(naam.toLowerCase()) + '</a></p></div>';
    if (blok) blok.innerHTML = html; else main.insertAdjacentHTML('afterbegin', html);
    if (api.form) api.form.parentNode.removeChild(api.form);
    var balk = $('[data-koopbalk]', main); if (balk) balk.parentNode.removeChild(balk);
    var lab = $('.pd__label', main); if (lab) lab.parentNode.removeChild(lab);
  }
  L.productPagina = function (api, l) {
    if (!api || !l || l.mislukt) return;
    var P = api.P, main = api.main;
    if (l.weg) { toonWeg(api); main.setAttribute('data-shopify-live', 'weg'); return; }
    var BR = BRONNEN(), srcs = BR[P.handle] || Object.keys(l.prods);
    var live = srcs.map(function (h) { return l.prods[h]; }).filter(Boolean);
    var ds = live.map(verschil);
    var deels = live.length < srcs.length;
    var wat = { t: srcs.length === 1 && ds[0].t, b: ds.some(function (d) { return d.b; }), i: deels || ds.some(function (d) { return d.i; }), v: deels || ds.some(function (d) { return d.v; }) };
    /* andere varianten: ook de galerij opnieuw (de beeldindexen van de varianten horen bij de nieuwe galerij) */
    if (wat.v) wat.i = true;
    if (!wat.t && !wat.b && !wat.i && !wat.v) { main.setAttribute('data-shopify-live', 'gelijk'); return; }
    var basis = BASIS();
    var kop = ($('.pd__h1', main) || {}).textContent || P.name;
    var m = model(live.map(function (x) { return { p: x, vals: (basis.ov || {})[x.h] || {} }; }), { titel: wat.t ? null : '-', merk: P.brand });
    var gedaan = [];
    if (wat.t) {
      var nm = namen(schoonTitel(live[0].t), P.brand, m.showroom, m.stockverkoop);
      var h1 = $('.pd__h1', main);
      if (h1) { h1.textContent = nm.kop; h1.classList.toggle('pd__h1--lang', nm.kop.length > 30); }
      var steun = $('.pd__steun', main);
      if (nm.steun) { if (steun) steun.textContent = nm.steun; else if (h1) h1.insertAdjacentHTML('afterend', '<p class="pd__steun">' + esc(nm.steun) + '</p>'); }
      else if (steun) steun.parentNode.removeChild(steun);
      var kr = $('.kruimel [aria-current]', main); if (kr) kr.textContent = nm.kop;
      doc.title = doc.title.replace(kop, nm.kop);
      P.name = nm.naam; kop = nm.kop;
      gedaan.push('titel');
    }
    if (wat.b) {
      var sec = $('.pd__beschr', main);
      if (sec) {
        $$('.beschr, .beschr + button', sec).forEach(function (x) { x.parentNode.removeChild(x); });
        sec.insertAdjacentHTML('beforeend', beschrijvingHtml(m.beschrRaw, [live[0].t, kop]));
        api.leesMeer();
        gedaan.push('beschrijving');
      }
    }
    if (wat.i) {
      var g = galerij(m, kop, P.brand);
      var pod = $('.pd__podium', main);
      if (pod) { pod.innerHTML = g.html; api.galerijInit(); }
      var kb = m.kaart != null ? m.beelden[m.kaart] : null;
      P.thumb = kb ? kb.thumb : null; P.mini = kb ? kb.mini : null; P.thumbBg = kb ? 'white' : null;
      gedaan.push('fotos');
    }
    if (wat.i) {
      {
        /* stalen van de gebouwde pagina hergebruiken (beeld en kleur) */
        var oud = {};
        $$('fieldset.optie--kleur label.staal', api.form || main).forEach(function (lab) {
          var inp = lab.previousElementSibling;
          if (!inp) return;
          var kl = lab.cloneNode(true); $$('[data-uit-sr]', kl).forEach(function (x) { x.parentNode.removeChild(x); });
          oud[inp.value] = kl.innerHTML; oud['#' + inp.value] = lab.style.getPropertyValue('--staal');
        });
        var opt = optiesHtml(m, oud);
        var nieuwP = pdata(m, opt, g.volg, {});
        P.imagePos = nieuwP.imagePos; P.colorPos = nieuwP.colorPos;
        if (!$('[data-in-mand]', main) && m.available && api.form) {
          var weg = $('.koop__weg', api.form);
          if (weg) { var na = weg.nextElementSibling; weg.parentNode.removeChild(weg); if (na && na.querySelector('a[href*="bezoek"]')) na.parentNode.removeChild(na); }
          api.form.insertAdjacentHTML('afterbegin', koopRij());
        }
        api.zetOpties(nieuwP.options, nieuwP.variants, opt.html);
        if (wat.v) gedaan.push('varianten');
      }
    }
    main.setAttribute('data-shopify-live', gedaan.join(' ') || 'gelijk');
  };

  /* ---------------------------------------------------------------- product/index.html?p=<handle in Shopify> */
  function melding(main, kop, tekst) {
    main.innerHTML = '<div class="pd pd--melding"><div class="pd__kolom"><nav class="kruimel" aria-label="Kruimelpad"><a href="' + R + 'index.html">Home</a> / <span aria-current="page">Product</span></nav>' +
      '<h1 class="pd__h1" tabindex="-1">' + esc(kop) + '</h1><p>' + tekst + '</p>' +
      '<p class="pd__melding-knoppen"><a class="knop knop--vol" href="' + R + 'index.html#afdelingen">Bekijk onze afdelingen</a> <a class="tlink" href="' + R + 'zoeken.html">Zoek in de collectie</a></p></div></div>';
    main.removeAttribute('aria-busy');
  }
  L.dynamisch = function () {
    var main = $('main[data-dynamisch]');
    if (!main) return;
    var h = '';
    try { h = new URLSearchParams(location.search).get('p') || ''; } catch (e) { h = ''; }
    h = h.trim().slice(0, 255);
    if (!h) { melding(main, 'Dit product vinden we niet', 'Er staat geen product in deze link.'); return; }
    S.laadBronnen().then(function () {
      /* staat het op onze site (als product of als bron van een product)? dan naar die pagina */
      var BR = BRONNEN(), eigen = BR[h] ? h : null;
      if (!eigen) Object.keys(BR).some(function (k) { if (BR[k].indexOf(h) > -1) { eigen = k; return true; } return false; });
      if (eigen) { location.replace(R + 'product/' + encodeURIComponent(eigen) + '.html'); return 'omleiden'; }
      return S.bron(h);
    }).then(function (x) {
      if (x === 'omleiden') return;
      if (x === null) {
        melding(main, 'Dit product kunnen we nu niet tonen', 'De gegevens van dit product konden niet geladen worden. Probeer het zo meteen opnieuw, of bel ons gerust.');
        return;
      }
      if (!x) return;
      if (x.weg) {
        melding(main, 'Dit product is niet meer beschikbaar', 'Kijk gerust wat we nog hebben in onze afdelingen, of kom langs in de showroom.');
        doc.title = 'Niet meer beschikbaar · 2-Sleep';
        return;
      }
      return TS.loadCatalog().catch(function () { return null; }).then(function () { tekenDynamisch(main, x); });
    });
  };
  function tekenDynamisch(main, x) {
    var m = model([{ p: x, vals: {} }]);
    m.cats = metPagina(m.cats); m.cat = m.cats[0];
    var C = window.CATALOG;
    var handle = x.h;
    if (C && C.products.some(function (p) { return p.handle === handle && !p.shopifyHandle; })) handle = 'shopify-' + x.h;
    var mslug = merkSlug(m.merk), merkLink = heeftPagina(mslug) ? '<a href="' + R + 'collectie/' + mslug + '.html">' + esc(m.merk) + '</a>' : esc(m.merk);
    var cnaam = catNaam(m.cat), curl = 'collectie/' + m.cat + '.html';
    var g = galerij(m, m.kop, m.merk);
    var opt = optiesHtml(m, null);
    var url = 'product/index.html?p=' + encodeURIComponent(x.h);
    var P = pdata(m, opt, g.volg, { handle: handle, name: m.naam, brand: m.merk, category: m.cat, dynamisch: true, bronnen: [x.h], url: url });
    var koopbaar = m.status === 'beschikbaar';
    var koop = koopbaar ? koopRij() : '<p class="koop__weg">' + (m.status === 'verkocht' ? 'Dit model is verkocht.' : 'Dit product is momenteel uitverkocht.') + '</p><p><a class="knop knop--vol" href="' + R + 'bezoek.html#contact">Vraag naar een alternatief</a></p>';
    var lab = m.label ? '<span class="pd__label">' + esc(m.label) + '</span>' : '';
    var details = '<div><dt>Merk</dt><dd>' + merkLink + '</dd></div><div><dt>Afdeling</dt><dd><a href="' + R + curl + '">' + esc(cnaam) + '</a></dd></div>';
    var extraDet = '<details class="uitklap"><summary>Details</summary><dl class="details">' + details + '</dl></details>' +
      '<details class="uitklap"><summary>Levering en retour</summary><p>' + stuk(m.isBed ? 'levering-bed' : 'levering') + '</p></details>' +
      (m.cat === 'kussens' ? stuk('testkussen') : '');
    var zelfde = C ? aanbevolen(C.products.filter(function (p) { return (p.categories || []).indexOf(m.cat) > -1 && p.handle !== handle; })).slice(0, 12) : [];
    var merkL = C ? aanbevolen(C.products.filter(function (p) { return (p.brands || []).indexOf(mslug) > -1 && p.handle !== handle && zelfde.slice(0, 6).indexOf(p) === -1; })).slice(0, 12) : [];
    main.innerHTML = '<div class="pd"><div class="pd__podium">' + g.html + '</div><div class="pd__kolom">' +
      '<nav class="kruimel" aria-label="Kruimelpad"><a href="' + R + 'index.html">Home</a> / <a href="' + R + curl + '">' + esc(cnaam) + '</a> / <span aria-current="page">' + esc(m.kop) + '</span></nav>' +
      '<h1 class="pd__h1' + (m.kop.length > 30 ? ' pd__h1--lang' : '') + '">' + esc(m.kop) + '</h1>' +
      (m.steun ? '<p class="pd__steun">' + esc(m.steun) + '</p>' : '') +
      '<p class="pd__sub">Van ' + merkLink + ', uit onze afdeling <a href="' + R + curl + '">' + esc(cnaam.toLowerCase()) + '</a>.</p>' +
      '<div class="pd__prijsblok"><p class="pd__prijs prijs" data-prijs>' + prijsBlok(m) + '</p>' + lab + '<p class="pd__btw">Prijzen incl. btw</p></div>' +
      '<form class="koop" data-koop novalidate>' + opt.html + koop +
      '<button class="tknop" type="button" data-bewaar="' + esc(handle) + '" aria-pressed="false">' + TS.icoon('hart') + '<span data-bewaar-tekst>Bewaar</span></button></form>' +
      (m.isBed ? stuk(m.showroom || m.stockverkoop ? 'liggen-showroom' : 'liggen') : '') +
      stuk(m.isBed ? 'service-bed' : 'service') +
      '<section class="pd__beschr" aria-labelledby="beschr-kop"><h2 id="beschr-kop" class="vh">Beschrijving</h2>' + beschrijvingHtml(m.beschrRaw, [x.t, m.titel, m.kop]) + '</section>' +
      extraDet + '</div></div>' +
      rij('Meer uit ' + cnaam, zelfde, 'meer-cat', curl) + (heeftPagina(mslug) ? rij('Meer van ' + m.merk, merkL, 'meer-merk', 'collectie/' + mslug + '.html') : '') +
      '<section class="rij" aria-labelledby="recent-kop" data-recent hidden><div class="rij__kop"><h2 id="recent-kop">Recent bekeken</h2></div><ul class="rij__spoor" data-rij-spoor></ul></section>' +
      (koopbaar ? '<div class="koopbalk" data-koopbalk aria-hidden="true"><p class="koopbalk__prijs prijs" data-balk-prijs>' + prijsBlok(m) + '</p>' +
        '<button class="knop knop--vol" type="button" data-balk-knop tabindex="-1"><span class="lang">In winkelmand</span><span class="kort">In mand</span></button></div>' : '');
    main.setAttribute('data-handle', handle);
    main.removeAttribute('aria-busy');
    var titel = m.kop + (m.merk === '2-Sleep' ? '' : ' · ' + m.merk) + ' · 2-Sleep';
    doc.title = titel;
    var md = $('meta[name="description"]');
    var tekst = tekstVan(m.beschrRaw);
    if (md) md.setAttribute('content', tekst ? tekst.slice(0, 155) : m.merk + ' ' + m.kop + ' bij 2-Sleep in Heers.');
    var data = doc.createElement('script');
    data.type = 'application/json'; data.id = 'product-data';
    data.textContent = JSON.stringify(P);
    main.parentNode.insertBefore(data, main.nextSibling);
    TS.rijen(main);
    TS.hartjes();
    /* product.js doet de rest (galerij, opties, mand, koopbalk), zoals op een gebouwde pagina */
    var s = doc.createElement('script');
    s.src = R + 'assets/js/product.js?v=' + S.versie;
    doc.body.appendChild(s);
  }
})();
