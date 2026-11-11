/* Collectiepagina: filters, sorteren en "Toon meer" op de echte catalogus (window.CATALOG uit data.js).
   De kaarten staan al in de HTML (gebouwd door bouw.py); dit script toont, verbergt en herschikt ze. */
(function () {
  'use strict';
  var TS = window.TS, main = document.querySelector('[data-collectie]');
  if (!TS || !main || !window.CATALOG) return;
  var $ = TS.$, $$ = TS.$$, esc = TS.esc;
  var raster = $('[data-raster]', main), vak = $('[data-filters]', main);
  var redactie = $('.redactie', raster);
  var kaarten = $$('.kaart', raster);
  var PER = 24;
  var soort = main.getAttribute('data-soort');
  var items = kaarten.map(function (k, i) { return { el: k, p: TS.product(k.getAttribute('data-h')), i: i }; }).filter(function (x) { return x.p; });
  var TINTEN = { wit: ['Wit en crème', '#f2efe6'], beige: ['Beige en zand', '#d8c7a6'], grijs: ['Grijs', '#a3a3a0'], zwart: ['Antraciet en zwart', '#2b2b2b'],
    blauw: ['Blauw', '#4c6f96'], groen: ['Groen', '#6f8b6a'], roze: ['Roze en rood', '#c98a8a'], bruin: ['Bruin', '#7a5b45'] };
  var MAT_VOLG = ['Dons', 'Veren', 'Wol', 'Paardenhaar', 'Katoen', 'Zijde', 'Kasjmier', 'Mohair', 'Alpaca', 'Linnen', 'Tencel', 'Bamboe', 'Latex', 'Traagschuim', 'Koudschuim', 'Kapok', 'Synthetisch', 'Jersey', 'Flanel'];

  /* ---------------- toestand, gelezen uit en geschreven naar de URL */
  var st = { merk: [], maat: [], tint: [], mat: [], min: null, max: null, promo: false, besch: false, sort: 'aanbevolen', toon: PER };
  (function lees() {
    var q = new URLSearchParams(location.search);
    ['merk', 'maat', 'tint', 'mat'].forEach(function (k) { if (q.get(k)) st[k] = q.get(k).split(',').filter(Boolean); });
    if (q.get('min')) st.min = parseFloat(q.get('min')) || null;
    if (q.get('max')) st.max = parseFloat(q.get('max')) || null;
    st.promo = q.get('promo') === '1'; st.besch = q.get('beschikbaar') === '1';
    if (q.get('sort')) st.sort = q.get('sort');
  })();
  function schrijf() {
    var q = new URLSearchParams();
    ['merk', 'maat', 'tint', 'mat'].forEach(function (k) { if (st[k].length) q.set(k, st[k].join(',')); });
    if (st.min != null) q.set('min', st.min);
    if (st.max != null) q.set('max', st.max);
    if (st.promo) q.set('promo', '1');
    if (st.besch) q.set('beschikbaar', '1');
    if (st.sort !== 'aanbevolen') q.set('sort', st.sort);
    var s = q.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s.replace(/%2C/g, ',').replace(/%2F/g, '/') : '') + location.hash); } catch (e) { /* file:// in sommige browsers */ }
  }

  /* ---------------- matchen */
  function past(p, zonder) {
    if (zonder !== 'merk' && st.merk.length && !p.brands.some(function (b) { return st.merk.indexOf(b) > -1; })) return false;
    if (zonder !== 'maat' && st.maat.length && !(p.sizes || []).some(function (m) { return st.maat.indexOf(m) > -1; })) return false;
    if (zonder !== 'tint' && st.tint.length && !(p.tints || []).some(function (t) { return st.tint.indexOf(t) > -1; })) return false;
    if (zonder !== 'mat' && st.mat.length && !(p.materials || []).some(function (m) { return st.mat.indexOf(m) > -1; })) return false;
    if (zonder !== 'prijs') {
      if (st.min != null && p.priceMax < st.min) return false;
      if (st.max != null && p.priceMin > st.max) return false;
    }
    if (zonder !== 'promo' && st.promo && !(p.promo || p.showroom || p.stockverkoop || p.onSale)) return false;
    if (zonder !== 'besch' && st.besch && p.status !== 'beschikbaar') return false;
    return true;
  }
  function telling(veld, waarde) {
    return items.filter(function (x) {
      if (!past(x.p, veld)) return false;
      var p = x.p;
      if (veld === 'merk') return p.brands.indexOf(waarde) > -1;
      if (veld === 'maat') return (p.sizes || []).indexOf(waarde) > -1;
      if (veld === 'tint') return (p.tints || []).indexOf(waarde) > -1;
      if (veld === 'mat') return (p.materials || []).indexOf(waarde) > -1;
      return true;
    }).length;
  }

  /* ---------------- welke groepen bestaan er in deze afdeling */
  function uniek(f) { var s = {}; items.forEach(function (x) { (f(x.p) || []).forEach(function (v) { s[v] = (s[v] || 0) + 1; }); }); return s; }
  var merken = uniek(function (p) { return p.brands; });
  var maten = Object.keys(uniek(function (p) { return p.sizes; })).sort(function (a, b) {
    var x = a.split('/').map(Number), y = b.split('/').map(Number); return x[0] - y[0] || x[1] - y[1];
  });
  var tinten = Object.keys(TINTEN).filter(function (t) { return items.some(function (x) { return (x.p.tints || []).indexOf(t) > -1; }); });
  var mats = MAT_VOLG.filter(function (m) { return items.some(function (x) { return (x.p.materials || []).indexOf(m) > -1; }); });
  var merkNaam = {}; window.CATALOG.brands.forEach(function (b) { merkNaam[b.slug] = b.name; });
  var prijzen = items.map(function (x) { return x.p.priceMin; }).sort(function (a, b) { return a - b; });
  var heeftPromo = items.some(function (x) { return x.p.promo || x.p.showroom || x.p.stockverkoop || x.p.onSale; });
  var heeftWeg = items.some(function (x) { return x.p.status !== 'beschikbaar'; });

  function rond(x) {
    if (x < 100) return Math.round(x / 10) * 10 || 10;
    if (x < 1000) return Math.round(x / 50) * 50;
    if (x < 10000) return Math.round(x / 500) * 500;
    return Math.round(x / 1000) * 1000;
  }
  function snelkeuzes() {
    if (prijzen.length < 6) return [];
    var q = function (f) { return rond(prijzen[Math.floor((prijzen.length - 1) * f)]); };
    var a = q(0.25), b = q(0.5), c = q(0.75);
    var uit = [];
    if (a > prijzen[0]) uit.push([null, a, 'Tot ' + TS.prijs(a)]);
    if (b > a) uit.push([a, b, TS.prijs(a) + ' tot ' + TS.prijs(b)]);
    if (c > b) uit.push([b, c, TS.prijs(b) + ' tot ' + TS.prijs(c)]);
    uit.push([c, null, 'Vanaf ' + TS.prijs(c)]);
    return uit;
  }

  var GROEPEN = [];
  if (soort !== 'merk' && Object.keys(merken).length > 1) GROEPEN.push({ k: 'merk', t: 'Merk' });
  if (prijzen.length > 3 && prijzen[0] !== prijzen[prijzen.length - 1]) GROEPEN.push({ k: 'prijs', t: 'Prijs' });
  if (maten.length > 1) GROEPEN.push({ k: 'maat', t: 'Maat' });
  if (tinten.length > 1) GROEPEN.push({ k: 'tint', t: 'Kleurtint' });
  if (mats.length > 1) GROEPEN.push({ k: 'mat', t: 'Materiaal' });

  function aantalActief(k) {
    if (k === 'prijs') return (st.min != null || st.max != null) ? 1 : 0;
    return st[k] ? st[k].length : 0;
  }
  function chk(f, v, label, n, aan, extra) {
    var leeg = !n && !aan;
    return '<label class="fopt' + (leeg ? ' is-leeg' : '') + '"><input type="checkbox" data-f="' + f + '" value="' + esc(v) + '"' + (aan ? ' checked' : '') + (leeg ? ' disabled' : '') + '>' +
      (extra || '') + '<span>' + esc(label) + '</span><span class="fopt__n">' + n + '</span></label>';
  }
  function groepBody(k, pre) {
    if (k === 'merk') return Object.keys(merken).sort(function (a, b) { return (merkNaam[a] || a).localeCompare(merkNaam[b] || b); })
      .map(function (m) { return chk('merk', m, merkNaam[m] || m, telling('merk', m), st.merk.indexOf(m) > -1); }).join('');
    if (k === 'maat') return '<div class="fmaat">' + maten.map(function (m) {
      var n = telling('maat', m), aan = st.maat.indexOf(m) > -1;
      return '<button type="button" data-f="maat" value="' + m + '" aria-pressed="' + aan + '"' + (!n && !aan ? ' disabled' : '') + ' aria-label="' + m + ' cm, ' + n + (n === 1 ? ' product' : ' producten') + '">' + m + '</button>';
    }).join('') + '</div>';
    if (k === 'tint') return tinten.map(function (t) { return chk('tint', t, TINTEN[t][0], telling('tint', t), st.tint.indexOf(t) > -1, '<span class="fopt__staal" style="--staal:' + TINTEN[t][1] + '"></span>'); }).join('') +
      '<p class="klein" style="margin-top:10px">De stalen zijn een benadering van de echte kleur.</p>';
    if (k === 'mat') return mats.map(function (m) { return chk('mat', m, m, telling('mat', m), st.mat.indexOf(m) > -1); }).join('');
    if (k === 'prijs') return '<div class="fprijs"><div><label for="' + pre + 'min">Van (€)</label><input id="' + pre + 'min" type="number" inputmode="numeric" min="0" data-f="min" value="' + (st.min != null ? st.min : '') + '" placeholder="' + Math.floor(prijzen[0]) + '"></div>' +
      '<div><label for="' + pre + 'max">Tot (€)</label><input id="' + pre + 'max" type="number" inputmode="numeric" min="0" data-f="max" value="' + (st.max != null ? st.max : '') + '" placeholder="' + Math.ceil(prijzen[prijzen.length - 1]) + '"></div></div>' +
      '<div class="fsnel">' + snelkeuzes().map(function (s) { return '<button type="button" data-f="snel" data-min="' + (s[0] == null ? '' : s[0]) + '" data-max="' + (s[1] == null ? '' : s[1]) + '">' + s[2] + '</button>'; }).join('') + '</div>';
    return '';
  }
  var SORT = [['aanbevolen', 'Aanbevolen'], ['prijs-op', 'Prijs oplopend'], ['prijs-af', 'Prijs aflopend'], ['nieuw', 'Nieuwste'], ['korting', 'Grootste korting']];
  function sorteerSelect(id) {
    return '<label class="sorteer" for="' + id + '">Sorteer: <select id="' + id + '" data-f="sort">' + SORT.map(function (s) {
      return '<option value="' + s[0] + '"' + (st.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>';
  }
  function schakelaars(pre) {
    var s = '';
    if (heeftPromo && soort !== 'speciaal') s += '<label class="schakel"><input type="checkbox" data-f="promo"' + (st.promo ? ' checked' : '') + '> Showroom of promotie</label>';
    if (heeftWeg) s += '<label class="schakel"><input type="checkbox" data-f="besch"' + (st.besch ? ' checked' : '') + '> Beschikbaar</label>';
    return s;
  }

  /* ---------------- balk (desktop) en paneel (gsm) */
  var openPop = null;
  vak.innerHTML = '<div class="filters__balk">' + GROEPEN.map(function (g) {
    return '<div class="fgroep"><button type="button" class="fknop" aria-expanded="false" aria-controls="fpop-' + g.k + '" data-pop="' + g.k + '">' + g.t +
      ' <span class="fknop__n" data-n="' + g.k + '"></span>' + TS.icoon('neer') + '</button><div class="fpop" id="fpop-' + g.k + '" role="group" aria-label="' + g.t + '" hidden data-body="' + g.k + '"></div></div>';
  }).join('') + schakelaars('d') +
    '<button type="button" class="fknop filters__gsm" data-fpaneel-open aria-haspopup="dialog">Filter en sorteer <span class="fknop__n" data-n-tot></span></button>' +
    '<div class="filters__rechts">' + sorteerSelect('sorteer-d') + '<span class="filters__tel" data-tel aria-live="polite"></span></div></div>';
  var chips = document.createElement('div');
  chips.className = 'chips'; chips.setAttribute('data-chips', '');
  vak.parentNode.insertBefore(chips, vak.nextSibling);

  var paneel = document.createElement('div');
  paneel.className = 'fpaneel'; paneel.hidden = true;
  paneel.setAttribute('role', 'dialog'); paneel.setAttribute('aria-modal', 'true'); paneel.setAttribute('aria-labelledby', 'fpaneel-kop');
  paneel.innerHTML = '<div class="fpaneel__kop"><h2 id="fpaneel-kop">Filter en sorteer</h2><button type="button" class="gsm__sluit" data-fpaneel-sluit aria-label="Sluiten">' + TS.icoon('sluiten') + '</button></div>' +
    '<div class="fpaneel__body"><div style="margin:8px 0 16px">' + sorteerSelect('sorteer-m') + '</div>' +
    GROEPEN.map(function (g) { return '<details><summary>' + g.t + ' <span class="fknop__n" data-n="' + g.k + '"></span></summary><div data-body="' + g.k + '" data-pre="m"></div></details>'; }).join('') +
    '<div style="display:grid;gap:4px;margin-top:16px">' + schakelaars('m') + '</div></div>' +
    '<div class="fpaneel__voet"><button type="button" class="tlink fpaneel__wis" data-f="wis">Wis alles</button><button type="button" class="knop knop--vol" data-fpaneel-sluit data-toon-n>Toon producten</button></div>';
  document.body.appendChild(paneel);

  function bodies() {
    $$('[data-body]', vak).concat($$('[data-body]', paneel)).forEach(function (b) {
      var actief = document.activeElement, sleutel = null;
      if (actief && b.contains(actief)) sleutel = [actief.getAttribute('data-f'), actief.value, actief.id];
      b.innerHTML = groepBody(b.getAttribute('data-body'), (b.getAttribute('data-pre') || 'd') + '-');
      if (sleutel) {
        var terug = sleutel[2] ? document.getElementById(sleutel[2]) : null;
        if (!terug) terug = $$('[data-f="' + sleutel[0] + '"]', b).filter(function (x) { return x.value === sleutel[1]; })[0];
        if (terug) terug.focus();
      }
    });
  }
  function popSluit(focus) {
    if (!openPop) return;
    var b = $('[data-pop="' + openPop + '"]', vak), p = $('#fpop-' + openPop);
    p.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false');
    var pp = p; setTimeout(function () { if (!pp.classList.contains('is-open')) pp.hidden = true; }, 170);
    if (focus) b.focus();
    openPop = null;
  }
  vak.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pop]');
    if (b) {
      var k = b.getAttribute('data-pop');
      if (openPop === k) { popSluit(); return; }
      popSluit();
      var p = $('#fpop-' + k); p.hidden = false;
      requestAnimationFrame(function () { p.classList.add('is-open'); });
      b.setAttribute('aria-expanded', 'true'); openPop = k;
      var eerste = p.querySelector('input:not([disabled]), button:not([disabled])'); if (eerste) eerste.focus();
    }
  });
  document.addEventListener('click', function (e) { if (openPop && !e.target.closest('.fgroep')) popSluit(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openPop) popSluit(true); });

  var opener = null;
  function paneelOpen(e) {
    opener = e.currentTarget; paneel.hidden = false;
    requestAnimationFrame(function () { paneel.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    $('[data-fpaneel-sluit]', paneel).focus();
  }
  function paneelSluit() {
    paneel.classList.remove('is-open'); document.body.style.overflow = '';
    setTimeout(function () { paneel.hidden = true; }, TS.reduce ? 0 : 360);
    if (opener) opener.focus();
  }
  $('[data-fpaneel-open]', vak).addEventListener('click', paneelOpen);
  paneel.addEventListener('click', function (e) { if (e.target.closest('[data-fpaneel-sluit]')) paneelSluit(); });
  paneel.addEventListener('keydown', function (e) { if (e.key === 'Escape') paneelSluit(); TS.focusVal(paneel, e); });

  /* ---------------- invoer (gedelegeerd, zelfde voor balk en paneel) */
  var prijsTimer = null;
  function invoer(e) {
    var el = e.target.closest('[data-f]');
    if (!el) return;
    var f = el.getAttribute('data-f');
    if (e.type === 'click' && !(el.tagName === 'BUTTON')) return;
    if (e.type === 'input' && !(f === 'min' || f === 'max')) return;
    if (['merk', 'tint', 'mat'].indexOf(f) > -1) {
      var l = st[f], i = l.indexOf(el.value);
      if (el.checked && i === -1) l.push(el.value); else if (!el.checked && i > -1) l.splice(i, 1);
    } else if (f === 'maat') {
      var j = st.maat.indexOf(el.value);
      if (j === -1) st.maat.push(el.value); else st.maat.splice(j, 1);
    } else if (f === 'min' || f === 'max') {
      clearTimeout(prijsTimer);
      prijsTimer = setTimeout(function () { var v = parseFloat(el.value); st[f] = isNaN(v) ? null : v; st.toon = PER; pas(false); }, 400);
      return;
    } else if (f === 'snel') {
      st.min = el.getAttribute('data-min') ? parseFloat(el.getAttribute('data-min')) : null;
      st.max = el.getAttribute('data-max') ? parseFloat(el.getAttribute('data-max')) : null;
    } else if (f === 'promo') st.promo = el.checked;
    else if (f === 'besch') st.besch = el.checked;
    else if (f === 'sort') st.sort = el.value;
    else if (f === 'wis') wis();
    st.toon = PER;
    pas(true);
  }
  [vak, paneel, chips].forEach(function (r) {
    r.addEventListener('change', invoer);
    r.addEventListener('click', invoer);
    r.addEventListener('input', invoer);
  });
  function wis() { st.merk = []; st.maat = []; st.tint = []; st.mat = []; st.min = null; st.max = null; st.promo = false; st.besch = false; }
  var wisKnop = $('[data-wis-alles]', main);
  if (wisKnop) wisKnop.addEventListener('click', function () { wis(); st.toon = PER; pas(true); });
  var meer = $('[data-meer]', main);
  if (meer) meer.addEventListener('click', function () {
    var eerstNieuw = st.toon; st.toon += PER; pas(false);
    var zicht = items.filter(function (x) { return !x.el.hidden; });
    if (zicht[eerstNieuw]) { var a = zicht[eerstNieuw].el.querySelector('a'); if (a) a.focus({ preventScroll: true }); }
  });

  /* ---------------- toepassen */
  function sorteer(lijst) {
    var f = {
      'aanbevolen': function (a, b) { return a.i - b.i; },
      'prijs-op': function (a, b) { return a.p.priceMin - b.p.priceMin || a.i - b.i; },
      'prijs-af': function (a, b) { return b.p.priceMin - a.p.priceMin || a.i - b.i; },
      'nieuw': function (a, b) { return (b.p.publishedAt || '').localeCompare(a.p.publishedAt || '') || a.i - b.i; },
      'korting': function (a, b) { return (b.p.discountMaxPct || 0) - (a.p.discountMaxPct || 0) || a.i - b.i; }
    }[st.sort] || function (a, b) { return a.i - b.i; };
    var weg = function (x) { return x.p.status === 'beschikbaar' ? 0 : 1; };
    return lijst.slice().sort(function (a, b) { return weg(a) - weg(b) || f(a, b); });
  }
  function pas(herteken) {
    var passend = sorteer(items.filter(function (x) { return past(x.p); }));
    var rest = items.filter(function (x) { return passend.indexOf(x) === -1; });
    var frag = document.createDocumentFragment();
    passend.forEach(function (x, n) {
      x.el.hidden = n >= st.toon;
      frag.appendChild(x.el);
      if (redactie && n === 5) frag.appendChild(redactie);
    });
    rest.forEach(function (x) { x.el.hidden = true; frag.appendChild(x.el); });
    if (redactie) { redactie.hidden = passend.length < 8; if (!redactie.parentNode || passend.length <= 5) frag.appendChild(redactie); }
    raster.appendChild(frag);
    var n = passend.length;
    $$('[data-aantal]', main).forEach(function (el) { el.textContent = n + (n === 1 ? ' product' : ' producten'); });
    $$('[data-tel]', vak).forEach(function (el) { el.textContent = n + (n === 1 ? ' product' : ' producten'); });
    var tk = $('[data-toon-n]', paneel); if (tk) tk.textContent = 'Toon ' + n + (n === 1 ? ' product' : ' producten');
    var leeg = $('[data-leeg]', main); if (leeg) leeg.hidden = n > 0;
    if (meer) {
      meer.hidden = n <= st.toon;
      meer.textContent = 'Toon meer (' + Math.min(st.toon, n) + ' van ' + n + ')';
    }
    var tot = 0;
    GROEPEN.forEach(function (g) {
      var a = aantalActief(g.k); tot += a;
      $$('[data-n="' + g.k + '"]').forEach(function (el) { el.textContent = a ? '(' + a + ')' : ''; });
    });
    tot += (st.promo ? 1 : 0) + (st.besch ? 1 : 0);
    var nt = $('[data-n-tot]', vak); if (nt) nt.textContent = tot ? '(' + tot + ')' : '';
    $$('[data-f="promo"]').forEach(function (x) { x.checked = st.promo; });
    $$('[data-f="besch"]').forEach(function (x) { x.checked = st.besch; });
    $$('[data-f="sort"]').forEach(function (x) { x.value = st.sort; });
    chipsTekenen();
    if (herteken !== false) bodies();
    schrijf();
  }
  function chipsTekenen() {
    var c = [];
    st.merk.forEach(function (m) { c.push(['merk', m, merkNaam[m] || m]); });
    if (st.min != null || st.max != null) c.push(['prijs', '', st.min != null && st.max != null ? TS.prijs(st.min) + ' tot ' + TS.prijs(st.max) : st.min != null ? 'Vanaf ' + TS.prijs(st.min) : 'Tot ' + TS.prijs(st.max)]);
    st.maat.forEach(function (m) { c.push(['maat', m, m + ' cm']); });
    st.tint.forEach(function (t) { c.push(['tint', t, TINTEN[t] ? TINTEN[t][0] : t]); });
    st.mat.forEach(function (m) { c.push(['mat', m, m]); });
    if (st.promo) c.push(['promo', '', 'Showroommodel of promotie']);
    if (st.besch) c.push(['besch', '', 'Alleen beschikbaar']);
    chips.innerHTML = c.length ? c.map(function (x) {
      return '<button type="button" class="chip" data-chip="' + x[0] + '" data-v="' + esc(x[1]) + '" aria-label="Verwijder filter ' + esc(x[2]) + '">' + esc(x[2]) + TS.icoon('sluiten') + '</button>';
    }).join('') + '<button type="button" class="tlink" data-f="wis">Wis alles</button>' : '';
  }
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-chip]');
    if (!b) return;
    var k = b.getAttribute('data-chip'), v = b.getAttribute('data-v');
    if (k === 'prijs') { st.min = null; st.max = null; }
    else if (k === 'promo') st.promo = false;
    else if (k === 'besch') st.besch = false;
    else { var i = st[k].indexOf(v); if (i > -1) st[k].splice(i, 1); }
    st.toon = PER; pas(true);
    var volgende = chips.querySelector('[data-chip]') || $('[data-fpaneel-open]', vak); if (volgende) volgende.focus();
  });

  pas(true);
})();
