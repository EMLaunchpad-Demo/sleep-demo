/* Productpagina: galerij, lichtbak, variantkeuze (maat in twee stappen, kleurstalen), prijs, mand, vaste koopbalk, recent bekeken. */
(function () {
  'use strict';
  var TS = window.TS, dataEl = document.getElementById('product-data');
  if (!TS || !dataEl) return;
  var $ = TS.$, $$ = TS.$$;
  var P = JSON.parse(dataEl.textContent);
  var main = $('main.product');

  TS.recent.add(P.handle);

  /* ---------------- galerij */
  var gal = $('[data-galerij]', main);
  if (gal) {
    var spoor = $('[data-spoor]', gal);
    var dias = $$('.dia', spoor);
    var duimen = $$('[data-naar]', gal);
    var tel = $('[data-tel]', gal);
    var huidig = 0;
    var naar = function (n, zacht) {
      n = Math.max(0, Math.min(dias.length - 1, n));
      spoor.scrollTo({ left: n * spoor.clientWidth, behavior: zacht === false || TS.reduce ? 'auto' : 'smooth' });
      zetActief(n);
    };
    var zetActief = function (n) {
      huidig = n;
      if (tel) tel.textContent = n + 1;
      duimen.forEach(function (d, i) {
        if (i === n) { d.setAttribute('aria-current', 'true'); d.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
        else d.removeAttribute('aria-current');
      });
    };
    TS.galerijNaar = naar;
    var tik = false;
    spoor.addEventListener('scroll', function () {
      if (tik) return; tik = true;
      requestAnimationFrame(function () { tik = false; var n = Math.round(spoor.scrollLeft / Math.max(1, spoor.clientWidth)); if (n !== huidig) zetActief(n); });
    }, { passive: true });
    duimen.forEach(function (d) { d.addEventListener('click', function () { naar(parseInt(d.getAttribute('data-naar'), 10)); }); });
    var v = $('[data-vorig]', gal), w = $('[data-volgend]', gal);
    if (v) v.addEventListener('click', function () { naar(huidig - 1); });
    if (w) w.addEventListener('click', function () { naar(huidig + 1); });
    spoor.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); naar(huidig + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); naar(huidig - 1); }
    });
    var items = dias.map(function (d) {
      var im = d.querySelector('img'), ss = im.getAttribute('srcset');
      var groot = ss ? ss.split(',').pop().trim().split(' ')[0] : im.getAttribute('src');
      return { src: groot, alt: im.alt };
    });
    $$('[data-zoom]', gal).forEach(function (b) { b.addEventListener('click', function () { TS.lichtbak(items, parseInt(b.getAttribute('data-zoom'), 10)); }); });
    window.addEventListener('resize', function () { naar(huidig, false); });
  }

  /* ---------------- varianten */
  var form = $('[data-koop]', main);
  var opties = P.options;
  var V = P.variants.filter(function (x) { return !x.m; });
  var sel = opties.map(function (o) { return o.type === 'vast' ? o.values[0] : null; });
  var sel2 = {};  /* maat in twee stappen: {oi: {b: 180, l: 200}} */
  opties.forEach(function (o, oi) { if (o.type === 'maat2') sel2[oi] = { b: null, l: null }; });

  /* weergave van een optiewaarde: 'UNO => 1-Split' wordt 'UNO: 1-Split' (de waarde zelf blijft zoals in Shopify) */
  function toon(w) { return w == null ? w : String(w).replace(/\s*=>\s*/g, ': '); }
  function waardeVan(oi) {
    var o = opties[oi];
    if (o.type !== 'maat2') return sel[oi];
    var s = sel2[oi]; if (s.b == null || s.l == null) return null;
    for (var v in o.bxl) if (o.bxl[v][0] === s.b && o.bxl[v][1] === s.l) return v;
    return null;
  }
  function pastBij(variant, zonder) {
    for (var oi = 0; oi < opties.length; oi++) {
      if (oi === zonder) continue;
      var o = opties[oi], w = variant.o[oi];
      if (o.type === 'maat2') {
        var s = sel2[oi], bl = o.bxl[w];
        if (!bl) return false;
        if (s.b != null && bl[0] !== s.b) return false;
        if (s.l != null && bl[1] !== s.l) return false;
      } else if (sel[oi] != null && sel[oi] !== w) return false;
    }
    return true;
  }
  function gekozenVariant() {
    var vals = opties.map(function (o, oi) { return waardeVan(oi); });
    if (vals.some(function (x) { return x == null; })) return null;
    return V.filter(function (v) { return v.o.every(function (x, i) { return x === vals[i]; }); })[0] || null;
  }
  function kandidaten() { return V.filter(function (v) { return pastBij(v, -1); }); }

  function zetPrijs(v) {
    var html;
    if (v) {
      html = '<span class="prijs__nu">' + TS.prijs(v.p) + '</span>' + (v.c ? ' <s class="prijs__oud"><span class="vh">was </span>' + TS.prijs(v.c) + '</s>' : '');
    } else {
      var k = kandidaten(), min = Infinity, max = -Infinity, cmin = null;
      k.forEach(function (x) { if (x.p < min) { min = x.p; cmin = x.c; } if (x.p > max) max = x.p; });
      if (!k.length) { min = P.priceMin; max = P.priceMax; }
      html = '<span class="prijs__nu">' + (min === max ? '' : 'Vanaf ') + TS.prijs(min) + '</span>' + (cmin ? ' <s class="prijs__oud"><span class="vh">was </span>' + TS.prijs(cmin) + '</s>' : '');
    }
    $$('[data-prijs], [data-balk-prijs]', main).forEach(function (el) { el.innerHTML = html; });
  }

  function teken() {
    opties.forEach(function (o, oi) {
      if (o.type === 'vast') return;
      if (o.type === 'maat2') {
        var s = sel2[oi];
        ['b', 'l'].forEach(function (deel) {
          var fs = $('fieldset[data-optie="' + oi + '"][data-deel="' + deel + '"]', form);
          if (!fs) return;
          $$('input', fs).forEach(function (inp) {
            var n = parseInt(inp.value, 10);
            var kan = V.some(function (v) {
              if (!pastBij(v, oi)) return false;
              var bl = o.bxl[v.o[oi]]; if (!bl) return false;
              return deel === 'b' ? bl[0] === n && (s.l == null || bl[1] === s.l || true) : bl[1] === n && (s.b == null || bl[0] === s.b);
            });
            inp.disabled = !kan;
            inp.checked = s[deel] === n;
            if (!kan) inp.setAttribute('aria-describedby', 'o' + oi + 'uitleg'); else inp.removeAttribute('aria-describedby');
          });
          var g = $('[data-gekozen]', fs); if (g) g.textContent = s[deel] != null ? s[deel] + ' cm' : '';
        });
        return;
      }
      var fs2 = $('fieldset[data-optie="' + oi + '"]', form);
      if (!fs2) return;
      $$('input', fs2).forEach(function (inp) {
        var kan = V.some(function (v) { return v.o[oi] === inp.value && pastBij(v, oi); });
        inp.disabled = !kan && sel[oi] !== inp.value;
        inp.checked = sel[oi] === inp.value;
      });
      var g2 = $('[data-gekozen]', fs2);
      if (g2) g2.textContent = sel[oi] != null ? toon(sel[oi]) : (o.type === 'kleur' ? 'kies een kleur' : '');
    });
    var v = gekozenVariant();
    zetPrijs(v);
    var knop = $('[data-in-mand]', form);
    if (knop) {
      var uit = v && !v.a;
      knop.disabled = !!uit;
      knop.textContent = uit ? 'Uitverkocht' : 'In winkelmand';
    }
    return v;
  }

  if (form) {
    form.addEventListener('change', function (e) {
      var inp = e.target; if (inp.type !== 'radio') return;
      /* een oude melding ("Kies eerst je kleur.") verdwijnt zodra je iets kiest */
      var oud = $('[data-koop-melding]', form); if (oud) oud.textContent = '';
      var fs = inp.closest('fieldset'); var oi = parseInt(fs.getAttribute('data-optie'), 10);
      var o = opties[oi];
      if (o.type === 'maat2') {
        var deel = fs.getAttribute('data-deel');
        sel2[oi][deel] = parseInt(inp.value, 10);
        if (deel === 'b' && sel2[oi].l != null) {
          var bestaat = V.some(function (v) { var bl = o.bxl[v.o[oi]]; return bl && bl[0] === sel2[oi].b && bl[1] === sel2[oi].l; });
          if (!bestaat) sel2[oi].l = null;
        }
        /* één lengte mogelijk: meteen kiezen */
        if (deel === 'b' && sel2[oi].l == null) {
          var ls = {}; V.forEach(function (v) { var bl = o.bxl[v.o[oi]]; if (bl && bl[0] === sel2[oi].b && pastBij(v, oi)) ls[bl[1]] = 1; });
          var k = Object.keys(ls); if (k.length === 1) sel2[oi].l = parseInt(k[0], 10);
        }
      } else {
        sel[oi] = inp.value;
        if (o.type === 'kleur' && P.colorPos && P.colorPos[inp.value] != null && TS.galerijNaar) TS.galerijNaar(P.colorPos[inp.value]);
      }
      var v = teken();
      if (v && v.i != null && P.imagePos[String(v.i)] != null && o.type !== 'kleur' && TS.galerijNaar) {
        /* alleen naar het variantbeeld als er geen kleur gekozen werd */
        if (!opties.some(function (x) { return x.type === 'kleur'; })) TS.galerijNaar(P.imagePos[String(v.i)]);
      }
    });
    /* alle kleuren */
    var extra = $$('[data-extra]', form);
    extra.forEach(function (x) { x.hidden = true; });
    var alle = $('[data-alle-kleuren]', form);
    if (alle) alle.addEventListener('click', function () { extra.forEach(function (x) { x.hidden = false; }); alle.remove(); var f = extra[0] && extra[0].querySelector('input'); if (f) f.focus(); });
    /* stapper */
    var veld = $('[data-aantal-veld]', form);
    form.addEventListener('click', function (e) {
      if (!veld) return;
      if (e.target.closest('[data-min]')) veld.value = Math.max(1, (parseInt(veld.value, 10) || 1) - 1);
      if (e.target.closest('[data-plus]')) veld.value = Math.min(99, (parseInt(veld.value, 10) || 1) + 1);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); inMand(); });
    teken();
  }

  function ontbrekend() {
    for (var oi = 0; oi < opties.length; oi++) {
      var o = opties[oi];
      if (o.type === 'maat2') {
        if (sel2[oi].b == null) return { fs: $('fieldset[data-optie="' + oi + '"][data-deel="b"]', form), naam: 'breedte' };
        if (sel2[oi].l == null) return { fs: $('fieldset[data-optie="' + oi + '"][data-deel="l"]', form), naam: 'lengte' };
      } else if (sel[oi] == null) return { fs: $('fieldset[data-optie="' + oi + '"]', form), naam: o.type === 'kleur' ? 'kleur' : o.name.toLowerCase().replace(' in cm', '') };
    }
    return null;
  }
  function inMand() {
    var melding = $('[data-koop-melding]', form);
    var mis = ontbrekend();
    if (mis) {
      if (melding) melding.textContent = 'Kies eerst je ' + mis.naam + '.';
      if (mis.fs) { mis.fs.scrollIntoView({ block: 'center', behavior: TS.reduce ? 'auto' : 'smooth' }); var i = mis.fs.querySelector('input:not([disabled])'); if (i) i.focus({ preventScroll: true }); }
      return;
    }
    var v = gekozenVariant();
    if (!v || !v.a) { if (melding) melding.textContent = 'Deze combinatie is niet beschikbaar.'; return; }
    if (melding) melding.textContent = '';
    var beschr = opties.map(function (o, oi) { return o.type === 'vast' || o.values.length < 2 ? null : toon(waardeVan(oi)); }).filter(Boolean).join(' · ');
    var qty = parseInt(($('[data-aantal-veld]', form) || {}).value, 10) || 1;
    TS.mand.add({ handle: P.handle, variantId: v.id, name: P.name, brand: P.brand, variant: beschr, price: v.p, qty: qty,
      thumb: P.thumb, mini: P.mini, bg: P.thumbBg, isBed: P.isBed, url: 'product/' + P.handle + '.html' });
    var k = $('[data-in-mand]', form);
    if (k) {
      k.classList.add('is-toegevoegd');
      k.innerHTML = TS.icoon('check') + '<span>Toegevoegd</span>';
      setTimeout(function () { k.classList.remove('is-toegevoegd'); k.textContent = 'In winkelmand'; }, 1600);
    }
    if (melding) melding.textContent = 'Toegevoegd aan je winkelmand.';
  }

  /* ---------------- vaste koopbalk op gsm */
  var balk = $('[data-koopbalk]', main), hoofdKnop = form && $('[data-in-mand]', form);
  if (balk && hoofdKnop && 'IntersectionObserver' in window) {
    var knopZicht = true, voetZicht = false;
    var zet = function () {
      var aan = !knopZicht && !voetZicht;
      balk.classList.toggle('is-aan', aan);
      balk.setAttribute('aria-hidden', aan ? 'false' : 'true');
      $('[data-balk-knop]', balk).tabIndex = aan ? 0 : -1;
    };
    new IntersectionObserver(function (es) { es.forEach(function (en) { knopZicht = en.isIntersecting || en.boundingClientRect.top > window.innerHeight; }); zet(); }).observe(hoofdKnop);
    var voet = document.querySelector('.voet');
    if (voet) new IntersectionObserver(function (es) { es.forEach(function (en) { voetZicht = en.isIntersecting; }); zet(); }).observe(voet);
    $('[data-balk-knop]', balk).addEventListener('click', inMand);
  }

  /* ---------------- beschrijving: Lees verder */
  $$('[data-lees-meer]', main).forEach(function (blok) {
    blok.setAttribute('data-dicht', '');
    blok.id = blok.id || 'beschr-meer';
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tlink'; b.textContent = 'Lees verder';
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', blok.id);
    b.style.minHeight = '44px';
    blok.parentNode.insertBefore(b, blok.nextSibling);
    b.addEventListener('click', function () {
      var dicht = blok.hasAttribute('data-dicht');
      if (dicht) blok.removeAttribute('data-dicht'); else blok.setAttribute('data-dicht', '');
      b.textContent = dicht ? 'Minder tonen' : 'Lees verder';
      b.setAttribute('aria-expanded', dicht ? 'true' : 'false');
    });
  });

  /* ---------------- recent bekeken */
  var recent = $('[data-recent]', main);
  if (recent && window.CATALOG) {
    var lijst = TS.recent.list().filter(function (h) { return h !== P.handle; }).map(TS.product).filter(Boolean);
    if (lijst.length) {
      $('[data-rij-spoor]', recent).innerHTML = lijst.map(function (p) { return '<li>' + TS.kaart(p, { sizes: '(min-width: 1024px) 21vw, 62vw' }) + '</li>'; }).join('');
      recent.hidden = false;
      TS.hartjes();
    }
  }
})();
