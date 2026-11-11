/* 2-Sleep voorbeeldshop · afspraak voor slaapadvies in de showroom (bouwer 2).
   ?lijst=<handle>,<handle> zet die producten bovenaan (gecontroleerd tegen CATALOG). Voorkeursdagen zonder woensdag
   (gesloten); zondag op afspraak. Het formulier verstuurt niets: persoonsvelden hebben geen name, geen action,
   en het eindigt in de voorbeeldmelding. */
(function () {
  'use strict';
  var TS = window.TS;
  var form = document.querySelector('[data-afspraak]');
  if (!TS || !form) return;
  var $ = TS.$, $$ = TS.$$, esc = TS.esc, doc = document, R = TS.root || '';

  /* ---------------------------------------------------------------- mijn lijst */
  var vak = $('[data-mijnlijst]'), rijen = $('[data-mijnlijst-rijen]');
  function leesLijst() {
    var s = '';
    try { s = new URLSearchParams(location.search).get('lijst') || ''; } catch (e) { s = ''; }
    var gezien = {};
    return s.split(',').map(function (h) { return h.trim(); })
      .filter(function (h) { if (!/^[a-z0-9-]{1,120}$/.test(h) || gezien[h]) return false; gezien[h] = 1; return true; })
      .slice(0, 12);
  }
  var lijst = [];
  function schrijfUrl() {
    try { history.replaceState(null, '', location.pathname + (lijst.length ? '?lijst=' + lijst.join(',') : '') + location.hash); } catch (e) { /* file:// */ }
  }
  function tekenLijst() {
    var ps = lijst.map(TS.product).filter(Boolean);
    lijst = ps.map(function (p) { return p.handle; });
    if (!ps.length) { vak.hidden = true; return; }
    vak.hidden = false;
    rijen.innerHTML = ps.map(function (p) {
      return '<li class="mlrij"><a href="' + TS.productUrl(p.handle) + '" tabindex="-1" aria-hidden="true">' + TS.miniVan(p) + '</a>' +
        '<span><span class="mregel__merk">' + esc(p.brand) + '</span><span class="mlrij__naam"><a href="' + TS.productUrl(p.handle) + '">' + esc(p.name) + '</a></span>' +
        '<span class="prijs">' + TS.prijsHtml(p) + '</span></span>' +
        '<button type="button" class="tlink" data-ml-weg="' + p.handle + '">Verwijder<span class="vh"> ' + esc(p.brand + ' ' + p.nameShort) + '</span></button></li>';
    }).join('');
  }
  if (vak && rijen) {
    vak.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ml-weg]');
      if (!b) return;
      var h = b.getAttribute('data-ml-weg'), i = lijst.indexOf(h), p = TS.product(h);
      lijst = lijst.filter(function (x) { return x !== h; });
      schrijfUrl(); tekenLijst();
      TS.meld((p ? p.brand + ' ' + p.nameShort : 'Product') + ' is van je lijst gehaald.');
      var na = $$('[data-ml-weg]', vak);
      var doel = na[Math.min(i, na.length - 1)] || $('#as-naam');
      if (doel) doel.focus();
    });
  }
  /* vinkjes "Waarvoor kom je?" alvast zetten op basis van de lijst */
  var SOORT = { 'boxsprings': 'bed', 'luxe-boxsprings': 'bed', 'waterbedden': 'bed', 'matrassen': 'matras', 'toppers': 'topper', 'kussens': 'kussen', 'dekbedden': 'dekbed',
    'dekbedovertrekken': 'textiel', 'hoeslakens': 'textiel', 'matrasbeschermers': 'textiel', 'nachtkledij': 'textiel', 'badtextiel': 'textiel' };
  function vinkLijst() {
    lijst.map(TS.product).filter(Boolean).forEach(function (p) {
      var k = SOORT[p.category];
      var v = k && $('[data-waarvoor="' + k + '"]', form);
      if (v) v.checked = true;
    });
  }

  /* ---------------------------------------------------------------- voorkeursdagen */
  var DAG = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  var DAGLANG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var MAANDLANG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var dagen = $('[data-dagen]', form), datumVeld = $('[data-dag-datum]', form);
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function tekenDagen() {
    var nu = new Date(), html = '';
    for (var k = 1; k <= 21; k++) {
      var d = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + k);
      var wd = d.getDay();
      if (wd === 3) continue;   /* woensdag gesloten */
      var lang = DAGLANG[wd] + ' ' + d.getDate() + ' ' + MAANDLANG[d.getMonth()];
      html += '<label class="dag"><input class="vh-input" type="radio" name="dag" value="' + iso(d) + '" data-lang="' + lang + (wd === 0 ? ' (op afspraak)' : '') + '">' +
        '<span class="dag__wd">' + DAG[wd] + '</span><span class="dag__nr">' + d.getDate() + '</span>' +
        '<span class="dag__noot">' + (wd === 0 ? 'op afspraak' : MAAND[d.getMonth()]) + '</span>' +
        '<span class="vh">' + lang + (wd === 0 ? ', op afspraak' : '') + '</span></label>';
    }
    dagen.innerHTML = html;
    $$('.dag__wd, .dag__nr, .dag__noot', dagen).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
    if (datumVeld) datumVeld.remove();
  }
  if (dagen) tekenDagen();

  /* ---------------------------------------------------------------- controleren */
  function zetFout(houder, id, tekst, veld) {
    var oud = doc.getElementById(id);
    if (oud) oud.remove();
    if (veld) { veld.removeAttribute('aria-invalid'); }
    if (!tekst) return true;
    var p = doc.createElement('p');
    p.className = 'veld__fout'; p.id = id;
    p.innerHTML = '<span aria-hidden="true">!</span> ' + esc(tekst);
    houder.appendChild(p);
    if (veld) { veld.setAttribute('aria-invalid', 'true'); veld.setAttribute('aria-describedby', id); }
    return false;
  }
  function veld(id, tekst, email) {
    var v = doc.getElementById(id), w = String(v.value || '').trim();
    var fout = !w ? tekst : (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(w) ? 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.be.' : '');
    return zetFout(v.closest('.veld'), id + '-fout', fout, v) ? null : v;
  }
  function groep(naam, tekst) {
    var fs = $('[data-groep="' + naam + '"]', form);
    var ok = !!$('input[name="' + naam + '"]:checked', form);
    if (!ok && naam === 'dag' && !$('input[name="dag"]', form)) ok = !!(doc.getElementById('as-datum') || {}).value;
    zetFout(fs, 'as-' + naam + '-fout', ok ? '' : tekst);
    return ok ? null : ($('input[name="' + naam + '"]', fs) || fs);
  }
  function alles() {
    var fouten = [veld('as-naam', 'Vul je naam in.'), veld('as-mail', 'Vul je e-mailadres in.', true),
      groep('dag', 'Kies een voorkeursdag.'), groep('dagdeel', 'Kies een dagdeel.')].filter(Boolean);
    var samen = $('[data-fout]', form);
    if (fouten.length) {
      if (samen) samen.textContent = fouten.length === 1 ? 'Eén veld is nog niet in orde.' : fouten.length + ' velden zijn nog niet in orde.';
      fouten[0].focus();
      return false;
    }
    if (samen) samen.textContent = '';
    return true;
  }
  form.addEventListener('focusout', function (e) {
    var v = e.target;
    if (v.id === 'as-naam' && v._aangeraakt) veld('as-naam', 'Vul je naam in.');
    if (v.id === 'as-mail' && v._aangeraakt) veld('as-mail', 'Vul je e-mailadres in.', true);
  });
  form.addEventListener('input', function (e) { e.target._aangeraakt = true; if (e.target.getAttribute('aria-invalid')) { if (e.target.id === 'as-naam') veld('as-naam', 'Vul je naam in.'); if (e.target.id === 'as-mail') veld('as-mail', 'Vul je e-mailadres in.', true); } });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'dag') zetFout($('[data-groep="dag"]', form), 'as-dag-fout', '');
    if (e.target.name === 'dagdeel') zetFout($('[data-groep="dagdeel"]', form), 'as-dagdeel-fout', '');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!alles()) return;
    var dag = $('input[name="dag"]:checked', form), deel = $('input[name="dagdeel"]:checked', form), wie = $('input[name="wie"]:checked', form);
    var voor = $$('[data-waarvoor]:checked', form).map(function (v) { return v.parentNode.textContent.trim().toLowerCase(); });
    var regels = [];
    regels.push('Voorkeur: ' + (dag ? dag.getAttribute('data-lang') : '') + (deel ? ', ' + deel.value : ''));
    if (wie && wie.value !== 'maakt-niet-uit') regels.push('Met ' + (wie.value === 'inge' ? 'Inge' : 'Andy'));
    if (voor.length) regels.push('Voor: ' + voor.join(', '));
    if (lijst.length) regels.push(lijst.length + (lijst.length === 1 ? ' product' : ' producten') + ' op je lijst');
    TS.voorbeeld('afspraak', {
      form: form,
      samenvatting: '<ul>' + regels.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>',
      onClose: function () {
        $$('input, textarea', form).forEach(function (v) { v._aangeraakt = false; v.removeAttribute('aria-invalid'); });
        $$('.veld__fout', form).forEach(function (p) { p.remove(); });
        vinkLijst();
      }
    });
  });

  function start() {
    lijst = leesLijst();
    if (vak && rijen) tekenLijst();
    vinkLijst();
  }
  if (window.CATALOG) start(); else TS.loadCatalog().then(start);
})();
