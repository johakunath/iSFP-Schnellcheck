// ============================================================================
// Kostenansätze — einzige Quelle für Investitionskosten der Maßnahmen.
//
// Jeder Ansatz trägt Herkunft und Gültigkeit (Region, Bezugsjahr, Einheit,
// MwSt-Status, Spanne vs. Punktwert, Evidenzgrad, Quellen). So lassen sich die
// heutigen Demo-Annahmen später Stück für Stück durch belegte Werte ersetzen,
// z. B. Berlin-spezifische Preise, ohne die Rechenlogik anzufassen.
//
// Regeln:
//  - Keine Zahl ohne Evidenzgrad. Unbelegte Werte bleiben "annahme".
//  - Regionale Werte (z. B. BE) überschreiben den bundesweiten Ansatz nur,
//    wenn sie in KOSTENANSAETZE_REGIONAL hinterlegt sind. Sonst greift DE als
//    Fallback und wird als solcher gekennzeichnet.
//  - wert = Punktwert in € für das Referenzgebäude (REFERENZ_GEBAEUDE), brutto.
//  - mengenbezug: Ansatz skaliert mit dieser Menge aus berechneMengen (sonst pauschal).
// ============================================================================

export const DATENSTAND = "Mai 2026";

export const EVIDENZ = {
  dokumentiert: "Dokumentiert", // Wert direkt aus belastbarer Quelle übernommen
  abgeleitet:   "Abgeleitet",   // aus dokumentierten Einheitskosten × Menge berechnet
  annahme:      "Annahme",      // keine belastbare Quelle hinterlegt
};

// Referenzgebäude, für das die Punktwerte (wert, menge) gelten. Das Mengenmodell
// (berechneMengen in data.js) skaliert flächenbezogene Ansätze relativ zu diesem Haus.
// Entspricht dem Preset efhNachkrieg.
export const REFERENZ_GEBAEUDE = {
  typ: "Einfamilienhaus", wohnflaeche: 145, gebaeudenutzflaeche: 180, vollgeschosse: 2, dach: "Satteldach",
};

export const REGIONEN = {
  DE: "Deutschland (bundesweit)",
  BE: "Berlin",
};

// Gemeinsame Metadaten der bisherigen Demo-Werte: Herkunft nicht dokumentiert.
const DEMO_ANNAHME = {
  region: "DE",
  bezugsjahr: 2026,
  mwst: "brutto",
  spanne: null,          // { min, max } in €, sobald eine belastbare Spanne vorliegt
  evidenz: "annahme",
  quellen: [],           // [{ titel, herausgeber, jahr, url, seite, abrufdatum }]
};

// Fundstellen für Badkosten — Ratgeber/Anbieter, nur Orientierung (abgerufen 10/2026)
const QUELLEN_BAD = [
  { titel: "Badsanierung Kosten pro m²: Preise & Tabelle 2026", herausgeber: "profirechner.de", jahr: 2026, url: "https://profirechner.de/badsanierung-kosten-pro-m%C2%B2-preise-tabelle-2026/", art: "Ratgeber" },
  { titel: "Badsanierung Kosten 2026: Preise pro m² & Komplettbad", herausgeber: "kostenfinder.com", jahr: 2026, url: "https://www.kostenfinder.com/ratgeber/badezimmer-sanierung-kosten", art: "Ratgeber" },
  { titel: "Badezimmer sanieren Berlin: Kosten", herausgeber: "city-sanierbau.de", jahr: 2026, url: "https://city-sanierbau.de/blog/sanierung/badezimmer-sanieren-berlin-2026/", art: "Anbieter (Berlin)" },
];

export const KOSTENANSAETZE = {
  M1: {
    ...DEMO_ANNAHME,
    label: "Hydraulischer Abgleich + Heizungsoptimierung",
    wert: 1800, ohnehin: 300,
    einheit: "pauschal",
    menge: { wert: 1, einheit: "EFH" },
    herleitung: "~600 € Planung + ~1.200 € Umsetzung (Pumpe, Ventile, Abgleich)",
  },
  M2: {
    ...DEMO_ANNAHME,
    label: "Dachdämmung",
    wert: 22000, ohnehin: 4500,
    einheit: "€/m² Dachfläche",
    einheitspreis: 180, mengenbezug: "dachflaeche",
    menge: { wert: 120, einheit: "m² Dachfläche" },
    herleitung: "~180 €/m² × ~120 m² Dachfläche",
  },
  M3: {
    ...DEMO_ANNAHME,
    label: "Fenstertausch",
    wert: 19000, ohnehin: 6500,
    einheit: "€/m² Fensterfläche",
    einheitspreis: 750, mengenbezug: "fensterflaeche",
    menge: { wert: 25, einheit: "m² Fensterfläche" },
    herleitung: "~750 €/m² × ~25 m² Fensterfläche",
  },
  M4: {
    ...DEMO_ANNAHME,
    label: "Luft-Wasser-Wärmepumpe (Basis = monovalent)",
    wert: 32000, ohnehin: 5000,
    einheit: "€/kW Heizleistung",
    einheitspreis: 2700,
    menge: { wert: 12, einheit: "kW" },
    herleitung: "~2.700 €/kW × 12 kW. Wird je nach WP-Variante durch WP_monovalent/-monoenergetisch/-hybrid ersetzt.",
  },
  M5: {
    ...DEMO_ANNAHME,
    label: "Fassadendämmung (WDVS)",
    wert: 38000, ohnehin: 12000,
    einheit: "€/m² Fassade",
    einheitspreis: 190, mengenbezug: "fassadenflaeche",
    menge: { wert: 200, einheit: "m² Fassade" },
    herleitung: "~190 €/m² × ~200 m² Fassade",
  },
  M6: {
    ...DEMO_ANNAHME,
    label: "PV-Anlage 10 kWp + 8 kWh Speicher",
    wert: 18000, ohnehin: 0,
    einheit: "€/kWp inkl. Speicher",
    einheitspreis: 1800,
    menge: { wert: 10, einheit: "kWp" },
    herleitung: "18.000 € gesamt. Achtung: Text nennt ~1.500 €/kWp inkl. Speicher, das ergäbe 15.000 € — Widerspruch ungeklärt.",
  },
  M7: {
    ...DEMO_ANNAHME,
    label: "Erneuerung Wärmeverteilung (Fußbodenheizung Trockenbau)",
    wert: 12000, ohnehin: 500,
    einheit: "€/m² beheizte Fläche",
    einheitspreis: 100, mengenbezug: "beheizteFlaeche",
    menge: { wert: 120, einheit: "m²" },
    herleitung: "~100 €/m² × ~120 m²",
  },

  // WP-Varianten ersetzen den M4-Ansatz je nach gewählter Betriebsart.
  WP_monovalent: {
    ...DEMO_ANNAHME, label: "WP monovalent", wert: 32000, ohnehin: 5000,
    einheit: "pauschal", menge: { wert: 12, einheit: "kW" },
  },
  WP_monoenergetisch: {
    ...DEMO_ANNAHME, label: "WP monoenergetisch (mit Heizstab)", wert: 29000, ohnehin: 5000,
    einheit: "pauschal", menge: { wert: 12, einheit: "kW" },
  },
  WP_hybrid: {
    ...DEMO_ANNAHME, label: "WP-Hybrid (WP + Gaskessel)", wert: 24000, ohnehin: 4000,
    einheit: "pauschal", menge: { wert: 1, einheit: "Anlage" },
  },

  // Badsanierung (keine Energiewirkung). Spannen je m² Badfläche nach Ausstattung, für ein
  // 8-m²-Referenzbad. Grundlage: Ratgeber- und Anbieterseiten (Stand 2025/2026), keine Erhebung —
  // daher evidenz "annahme". Berliner Stundensätze sollen laut einer Quelle 10–15 % über dem
  // Bundesschnitt liegen (nicht belegt, nicht angewandt). Ersetzen durch Angebote/BKI-Werte.
  BAD_einfach: {
    ...DEMO_ANNAHME, label: "Badsanierung einfach", wert: 10000, ohnehin: 0,
    einheit: "€/m² Badfläche", einheitspreis: 1250, mengenbezug: "badflaeche",
    menge: { wert: 8, einheit: "m² Badfläche" }, spanne: { min: 8000, max: 12000 },
    quellen: QUELLEN_BAD,
    herleitung: "1.000–1.500 €/m²: Standardfliesen, Serienobjekte, Leitungen und Abdichtung neu",
  },
  BAD_mittel: {
    ...DEMO_ANNAHME, label: "Badsanierung Mittelklasse", wert: 14800, ohnehin: 0,
    einheit: "€/m² Badfläche", einheitspreis: 1850, mengenbezug: "badflaeche",
    menge: { wert: 8, einheit: "m² Badfläche" }, spanne: { min: 12000, max: 17600 },
    quellen: QUELLEN_BAD,
    herleitung: "1.500–2.200 €/m²: bodengleiche Dusche, Markenobjekte, Badmöbel",
  },
  BAD_gehoben: {
    ...DEMO_ANNAHME, label: "Badsanierung gehoben", wert: 22800, ohnehin: 0,
    einheit: "€/m² Badfläche", einheitspreis: 2850, mengenbezug: "badflaeche",
    menge: { wert: 8, einheit: "m² Badfläche" }, spanne: { min: 17600, max: 28000 },
    quellen: QUELLEN_BAD,
    herleitung: "2.200–3.500 €/m²: großformatige Fliesen, Vorwandtechnik, hochwertige Armaturen",
  },

  // Begleitkosten (nicht förderfähig, nur informativ angezeigt)
  OELTANK_RUECKBAU: {
    ...DEMO_ANNAHME, label: "Öltank-Stilllegung & Entsorgung", wert: 2500, ohnehin: 0,
    einheit: "pauschal", menge: { wert: 1, einheit: "Tankanlage" },
  },
  GASANSCHLUSS_NEU: {
    ...DEMO_ANNAHME, label: "Gasanschluss-Herstellung", wert: null, ohnehin: 0,
    spanne: { min: 3000, max: 5000 },
    einheit: "pauschal", menge: { wert: 1, einheit: "Hausanschluss" },
  },
};

// Regionale Ansätze: { BE: { M2: {...}, … } }. Leer, bis belegte Werte vorliegen.
// Ein Eintrag muss alle Pflichtfelder (wert/spanne, einheit, bezugsjahr, mwst,
// evidenz, quellen) tragen; fehlende Felder werden NICHT vom DE-Ansatz geerbt.
export const KOSTENANSAETZE_REGIONAL = {};

// Liefert den Kostenansatz für eine Region. Fehlt ein regionaler Wert, wird
// der bundesweite Ansatz mit fallback: true zurückgegeben.
export function kostenAnsatzFuer(id, region = "DE") {
  const regional = KOSTENANSAETZE_REGIONAL[region]?.[id];
  if (regional) return { ...regional, id, fallback: false };
  const basis = KOSTENANSAETZE[id];
  if (!basis) return null;
  return { ...basis, id, fallback: region !== basis.region };
}

// Kurzbeschreibung des Evidenzstatus für Tooltips, z. B.
// "Annahme · DE · 2026 · brutto".
export function kostenStatusText(ansatz) {
  if (!ansatz) return "";
  const teile = [EVIDENZ[ansatz.evidenz] || ansatz.evidenz, ansatz.region, String(ansatz.bezugsjahr), ansatz.mwst];
  if (ansatz.fallback) teile.push("bundesweiter Fallback");
  return teile.join(" · ");
}
