/* 2-Sleep voorbeeldshop · afrekenen in drie stappen (bouwer 2).
   Gegevens, levering of afhalen, overzicht. Geen betaalvelden, niets wordt verstuurd of bewaard:
   de velden hebben geen name, gegevens blijven alleen in het formulier en "Bestelling plaatsen" opent de voorbeeldmelding. */
(function () {
  'use strict';
  var TS = window.TS;
  var form = document.querySelector('[data-kassa]');
  if (!TS || !form) return;
  var $ = TS.$, $$ = TS.$$, esc = TS.esc, doc = document, R = TS.root || '';
  var LEV = TS.levering || { gratisVanaf: 70, minKost: 7.95 };
  var stappen = $$('[data-stap]', form);
  var voortgang = $('[data-voortgang]'), tel = $('[data-stap-tel]');
  var ovVak = $('[data-ov-vak]'), ov = $('[data-ov]'), ovKnop = $('[data-ov-knop]');
  var leegVak = $('[data-kassa-leeg]');
  var huidig = 1;
  var NAMEN = { 1: 'Gegevens', 2: 'Levering', 3: 'Overzicht' };

  /* ---------------------------------------------------------------- velden controleren (bij het verlaten van een veld) */
  var BOODSCHAP = {
    'k-mail': 'Vul je e-mailadres in.', 'k-voornaam': 'Vul je voornaam in.', 'k-achternaam': 'Vul je achternaam in.',
    'k-straat': 'Vul je straat en huisnummer in.', 'k-postcode': 'Vul je postcode in.', 'k-gemeente': 'Vul je gemeente in.',
    'k-akkoord': 'Vink aan dat je akkoord gaat met de algemene voorwaarden.'
  };
  function zetFout(v, tekst) {
    var id = v.id + '-fout', oud = doc.getElementById(id);
    if (oud) oud.remove();
    var besch = (v.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== id; });
    if (!tekst) {
      v.removeAttribute('aria-invalid');
      if (besch.length) v.setAttribute('aria-describedby', besch.join(' ')); else v.removeAttribute('aria-describedby');
      return true;
    }
    var p = doc.createElement('p');
    p.className = 'veld__fout'; p.id = id;
    p.innerHTML = '<span aria-hidden="true">!</span> ' + esc(tekst);
    (v.closest('.veld, .vinkje') || v.parentNode).appendChild(p);
    v.setAttribute('aria-invalid', 'true');
    v.setAttribute('aria-describedby', besch.concat(id).join(' '));
    return false;
  }
  function controleer(v) {
    var w = String(v.value || '').trim();
    if (v.type === 'checkbox') return zetFout(v, v.checked ? '' : BOODSCHAP[v.id]);
    if (!w) return zetFout(v, v.required ? (BOODSCHAP[v.id] || 'Vul dit veld in.') : '');
    if (v.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(w)) return zetFout(v, 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.be.');
    if (v.hasAttribute('data-postcode') && !/^[1-9]\d{3}$/.test(w)) return zetFout(v, 'Een Belgische postcode heeft vier cijfers.');
    return zetFout(v, '');
  }
  function stapGoed(n) {
    var eerste = null;
    $$('input, select, textarea', stappen[n - 1]).forEach(function (v) {
      if (v.type === 'radio' || (!v.required && !v.value)) return;
      if (!controleer(v) && !eerste) eerste = v;
    });
    if (eerste) { eerste.focus(); TS.meld('Niet alle velden zijn juist ingevuld.'); return false; }
    return true;
  }
  form.addEventListener('focusout', function (e) {
    var v = e.target;
    if (!v.matches || !v.matches('input:not([type="radio"]):not([type="checkbox"]), select, textarea')) return;
    if (v._aangeraakt || v.getAttribute('aria-invalid')) controleer(v);
  });
  form.addEventListener('input', function (e) {
    var v = e.target;
    v._aangeraakt = true;
    if (v.getAttribute && v.getAttribute('aria-invalid')) controleer(v);
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'levering') { tekenOverzicht(); TS.meld(leveringTekst().kop + ' gekozen.'); }
    if (e.target.id === 'k-akkoord' && e.target.getAttribute('aria-invalid')) controleer(e.target);
  });

  /* ---------------------------------------------------------------- levering en bedragen */
  function keuze() { var r = $('input[name="levering"]:checked', form); return r ? r.value : 'afhalen'; }
  function leveringTekst() {
    var k = keuze(), sub = TS.mand.subtotal();
    if (k === 'levering-bed') return { kop: 'Levering door 2-Sleep', prijs: 'Aparte regeling', totaal: TS.prijs(sub), noot: 'Voor de levering treffen we een aparte regeling, vanaf 30 kg per zending.' };
    if (k === 'levering') {
      if (sub >= LEV.gratisVanaf) return { kop: 'Levering in België', prijs: 'Gratis', totaal: TS.prijs(sub), noot: '' };
      return { kop: 'Levering in België', prijs: 'Minimaal ' + TS.prijs(LEV.minKost), totaal: 'Vanaf ' + TS.prijs(sub + LEV.minKost),
        noot: 'Levering is gratis vanaf ' + TS.prijs(LEV.gratisVanaf) + '. Daaronder rekenen we minimaal ' + TS.prijs(LEV.minKost) + ' per bestelling aan.' };
    }
    return { kop: 'Afhalen in de winkel', prijs: 'Gratis', totaal: TS.prijs(sub), noot: '' };
  }
  function leveringOpties() {
    var bed = TS.mand.heeftBed(), sub = TS.mand.subtotal();
    var klein = $('[data-lev-klein]', form), groot = $('[data-lev-bed]', form);
    klein.hidden = bed; groot.hidden = !bed;
    /* een bed is geen pakje: geen "klaar vanaf 24 uur" bij afhalen */
    var af = $('[data-afhaal-tekst]', form);
    if (af) af.textContent = bed ? 'Steenweg 49a, Heers. Gratis.' : 'Steenweg 49a, Heers. Gratis, klaar vanaf 24 uur na je bestelling, af te halen binnen 30 kalenderdagen.';
    var p = $('[data-lev-prijs]', klein);
    if (p) p.textContent = sub >= LEV.gratisVanaf ? 'Gratis' : 'Minimaal ' + TS.prijs(LEV.minKost);
    var k = keuze();
    if (bed && k === 'levering') $('input', groot).checked = true;
    if (!bed && k === 'levering-bed') $('input', klein).checked = true;
  }

  function tekenOverzicht() {
    var items = TS.mand.items();
    var l = leveringTekst();
    $('[data-ov-regels]').innerHTML = items.map(function (x) {
      return '<li class="ovregel">' + TS.miniPlaat(x) + '<span><span class="ovregel__naam">' + esc(x.name) + '</span>' +
        '<span class="ovregel__meta">' + esc([x.brand, x.variant].filter(Boolean).join(' · ')) + ((x.qty || 1) > 1 ? ' · ' + x.qty + ' stuks' : '') + '</span></span>' +
        '<span class="prijs">' + TS.prijs(x.price * (x.qty || 1)) + '</span></li>';
    }).join('');
    $('[data-ov-som]').innerHTML = '<dt>Subtotaal</dt><dd>' + TS.prijs(TS.mand.subtotal()) + '</dd>' +
      '<dt>' + esc(l.kop) + '</dt><dd>' + esc(l.prijs) + '</dd>' +
      '<dt class="is-totaal">Totaal incl. btw</dt><dd class="is-totaal">' + esc(l.totaal) + '</dd>' +
      (l.noot ? '<p class="ov__noot">' + esc(l.noot) + '</p>' : '');
    $('[data-ov-totaal]').textContent = l.totaal;
    if (huidig === 3) tekenSamen();
  }

  function waarde(id) { var v = doc.getElementById(id); return v ? String(v.value || '').trim() : ''; }
  function tekenSamen() {
    var k = keuze(), l = leveringTekst();
    var naam = [waarde('k-voornaam'), waarde('k-achternaam')].filter(Boolean).join(' ');
    var adres = [waarde('k-straat'), [waarde('k-postcode'), waarde('k-gemeente')].filter(Boolean).join(' '), 'België'].filter(Boolean);
    var lev = k === 'afhalen' ? ['Steenweg 49a, Heers', TS.mand.heeftBed() ? 'Gratis.' : 'Gratis, klaar vanaf 24 uur na je bestelling.'] :
      (k === 'levering-bed' ? ['Elke levering verzorgen we zelf.', 'Vanaf 30 kg treffen we een aparte regeling.'] : ['Naar het adres hierboven.', l.prijs === 'Gratis' ? 'Gratis.' : l.prijs + '.']);
    $('[data-samen]', form).innerHTML =
      '<div class="samen__blok"><p class="samen__kop">Contact</p><p>' + esc(naam) + '</p><p>' + esc(waarde('k-mail')) + '</p>' + (waarde('k-tel') ? '<p>' + esc(waarde('k-tel')) + '</p>' : '') +
        '<button type="button" class="tlink samen__wijzig" data-naar="1">Wijzig<span class="vh"> je gegevens</span></button></div>' +
      '<div class="samen__blok"><p class="samen__kop">' + (k === 'afhalen' ? 'Factuuradres' : 'Leveradres') + '</p>' + adres.map(function (r) { return '<p>' + esc(r) + '</p>'; }).join('') +
        '<button type="button" class="tlink samen__wijzig" data-naar="1">Wijzig<span class="vh"> het adres</span></button></div>' +
      '<div class="samen__blok"><p class="samen__kop">' + esc(l.kop) + '</p>' + lev.map(function (r) { return '<p>' + esc(r) + '</p>'; }).join('') +
        '<button type="button" class="tlink samen__wijzig" data-naar="2">Wijzig<span class="vh"> de levering</span></button></div>' +
      (waarde('k-notities') ? '<div class="samen__blok"><p class="samen__kop">Notities</p><p>' + esc(waarde('k-notities')) + '</p>' +
        '<button type="button" class="tlink samen__wijzig" data-naar="1">Wijzig<span class="vh"> je notities</span></button></div>' : '');
  }

  /* ---------------------------------------------------------------- stappen */
  function toon(n, focus) {
    huidig = n;
    stappen.forEach(function (s) {
      var aan = parseInt(s.getAttribute('data-stap'), 10) === n;
      s.hidden = !aan;
      s.classList.remove('is-in');
      if (aan && !TS.reduce) { void s.offsetWidth; s.classList.add('is-in'); }
    });
    $$('li', voortgang).forEach(function (li) {
      var i = parseInt(li.getAttribute('data-stap-naam'), 10);
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('is-klaar', i < n);
    });
    if (tel) tel.textContent = NAMEN[n] + ', ' + n + ' van 3';
    if (n === 2) leveringOpties();
    if (n === 3) tekenSamen();
    tekenOverzicht();
    if (focus !== false) {
      var kop = $('h2', stappen[n - 1]);
      var top = form.closest('.kassa__links').getBoundingClientRect().top + window.scrollY - 16;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: TS.reduce ? 'auto' : 'smooth' });
      if (kop) kop.focus({ preventScroll: true });
    }
  }
  function naar(n) {
    if (n > huidig) {
      for (var s = huidig; s < n; s++) { if (!stapGoed(s)) { if (s !== huidig) toon(s); return; } }
    }
    toon(n);
  }
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-naar]');
    if (b) { e.preventDefault(); naar(parseInt(b.getAttribute('data-naar'), 10)); return; }
    if (e.target.closest('[data-vul]')) {
      var vb = { 'k-mail': 'jan@voorbeeld.be', 'k-voornaam': 'Jan', 'k-achternaam': 'Voorbeeld', 'k-straat': 'Voorbeeldstraat 1', 'k-postcode': '3870', 'k-gemeente': 'Heers' };
      Object.keys(vb).forEach(function (id) { var v = doc.getElementById(id); if (v) { v.value = vb[id]; zetFout(v, ''); } });
      TS.meld('Voorbeeldgegevens ingevuld.');
    }
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (huidig < 3) { naar(huidig + 1); return; }
    for (var s = 1; s <= 2; s++) { if (!stapGoed(s)) { toon(s); stapGoed(s); return; } }
    var ak = doc.getElementById('k-akkoord');
    if (!controleer(ak)) { ak.focus(); TS.meld('Vink aan dat je akkoord gaat met de algemene voorwaarden.'); return; }
    var items = TS.mand.items(), l = leveringTekst();
    var samenvatting = '<p><strong>' + TS.mand.count() + (TS.mand.count() === 1 ? ' product' : ' producten') + '</strong> · ' + esc(l.kop) + ' · Totaal incl. btw ' + esc(l.totaal) + '</p>' +
      '<ul>' + items.slice(0, 6).map(function (x) { return '<li>' + (x.qty || 1) + ' × ' + esc(x.name) + (x.variant ? ' (' + esc(x.variant) + ')' : '') + '</li>'; }).join('') +
      (items.length > 6 ? '<li>en nog ' + (items.length - 6) + ' andere</li>' : '') + '</ul>' +
      (waarde('k-notities') ? '<p>Notities: ' + esc(waarde('k-notities')) + '</p>' : '');
    TS.voorbeeld('bestelling', {
      form: form, samenvatting: samenvatting,
      onClose: function () {
        $$('input, select, textarea', form).forEach(function (v) { v._aangeraakt = false; zetFout(v, ''); });
        toon(1, false);
        teken();
      }
    });
  });

  /* ---------------------------------------------------------------- overzicht op gsm inklappen */
  var smal = window.matchMedia('(max-width: 1023px)');
  function ovStand() {
    if (smal.matches) { ov.hidden = ovKnop.getAttribute('aria-expanded') !== 'true'; }
    else { ov.hidden = false; }
  }
  ovKnop.addEventListener('click', function () {
    var aan = ovKnop.getAttribute('aria-expanded') !== 'true';
    ovKnop.setAttribute('aria-expanded', aan ? 'true' : 'false');
    $('span', ovKnop).textContent = aan ? 'Verberg overzicht' : 'Toon overzicht';
    ovStand();
  });
  if (smal.addEventListener) smal.addEventListener('change', ovStand); else if (smal.addListener) smal.addListener(ovStand);

  /* ---------------------------------------------------------------- tekenen */
  function teken() {
    var leeg = !TS.mand.items().length;
    leegVak.hidden = !leeg;
    form.hidden = leeg; voortgang.hidden = leeg; ovVak.hidden = leeg;
    var lf = $('[data-kassa-leegfoto]'); if (lf) lf.hidden = !leeg;
    if (leeg) return;
    leveringOpties();
    tekenOverzicht();
  }
  TS.on('mand', teken);
  window.addEventListener('storage', function (e) { if (e.key === '2s.mand') teken(); });
  ovStand();
  toon(1, false);
  teken();
})();
