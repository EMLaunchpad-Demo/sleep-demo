/* Handmatige keuze van kaart- en hoverbeelden (ontwerp.md 5.2, punt 3).
   Per handle: card = index van het kaartbeeld, hover = index van het hoverbeeld (null = geen hover),
   skip = indexen die nooit kaart- of hoverbeeld mogen zijn (infokaartjes met tekst, kleurtabellen).
   Gekozen na het bekijken van contactbladen van alle bedden, kussens en textiel (11/11/2026).
   Belgica Type Spike: kaartbeeld 1 (de foto op zwart gaf een zwart vierkant tussen lichte kaarten; wit maken gaf rafelranden).
   bouw.py leest dit bestand (het JSON-deel tussen de eerste { en de laatste }). */
window.CURATIE = {
  "vispring-boxspringset-baronet-superb": {"card": 0, "hover": 3, "skip": [2]},
  "vispring-boxspringset-devonshire": {"card": 0, "hover": 3, "skip": [2]},
  "vispring-boxspringset-herald-superb": {"card": 0, "hover": 2},
  "vispring-boxspringset-magnificence": {"card": 0, "hover": 3, "skip": [2]},
  "vispring-boxspringset-opulence": {"card": 0, "hover": 2},
  "vispring-boxspringset-regal-superb": {"card": 0, "hover": 3, "skip": [2]},
  "vispring-boxspringset-regent": {"card": 0, "hover": 3, "skip": [2]},
  "vispring-boxspringset-renaissance": {"card": 0, "hover": 2},
  "vispring-boxspringset-sublime-superb": {"card": 0, "hover": 3, "skip": [2]},
  "vispring-boxspringset-tiara-superb": {"card": 0, "hover": 3, "skip": [2]},
  "vispring-matras-baronet-superb": {"card": 0, "hover": 1, "skip": [2]},
  "vispring-matras-devonshire": {"card": 0, "hover": 1, "skip": [2]},
  "vispring-matras-magnificence": {"card": 0, "hover": 1, "skip": [2]},
  "vispring-matras-regal-superb": {"card": 0, "hover": 1, "skip": [2]},
  "vispring-matras-regent": {"card": 0, "hover": 1, "skip": [2]},
  "vispring-matras-renaissance": {"card": 0, "hover": 2},
  "vispring-matras-sublime-superb": {"card": 0, "hover": 1, "skip": [2]},
  "vispring-matras-tiara-superb": {"card": 0, "hover": 1, "skip": [2]},
  "showroom-boxspringset-dorbien-green-i-180-200-cm": {"card": 0, "hover": 2, "skip": [4]},
  "showroom-boxspringset-dorbien-nature-ii-210-210-cm": {"card": 0, "hover": 2, "skip": [4]},
  "showroom-boxspringset-dorbien-sports-i-180-200-cm": {"card": 0, "hover": 2, "skip": [4]},
  "showroom-boxspringset-dorbien-sports-ii-180-200-cm": {"card": 0, "hover": 2, "skip": [4]},
  "showroom-elektrische-boxspringset-dorbien-sports-extreme-180-200-cm": {"card": 0, "hover": 2, "skip": [4, 5]},
  "showroomset-jensen-diplomat-continental-met-sleep-iii-topper-180-200-cm": {"card": 1, "hover": 3},
  "showroomset-2sleep-waterbed-180-220-cm": {"card": 0, "hover": 2},
  "promotie-boxspringset-belgica-type-spike": {"card": 1, "hover": null},
  "tempur-formtm-matras-original-22-cm": {"card": 0, "hover": 1},
  "tempur-formtm-matras-plus-25-cm": {"card": 0, "hover": 1},
  "tempur-kussensloop-classic": {"card": 0, "hover": null},
  "tempur-kussensloop-ombracio": {"card": 0, "hover": null},
  "tempur-kussensloop-sonata": {"card": 0, "hover": null}
};
