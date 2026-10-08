// ============================================================================
// iSFP-Schnellcheck — Datenmodell & Logik (v3.1)
// - iSFP-Klassifizierung auf Primärenergie-Basis
// - Realistische Förderquoten (Konjunktur-Booster entfernt)
// - BEG = Programm, BAFA/KfW = durchführende Stellen
// - 3 Presets, Auto-Derive Bauteile aus Baujahr
// - EFH-fokussiert: Einfamilienhaus, Zweifamilienhaus, Doppelhaushälfte, Reihenhaus
// ============================================================================

import { KOSTENANSAETZE, REFERENZ_GEBAEUDE } from "./kosten.js";

// Übernimmt Investition und Sowieso-Anteil aus dem Kostenregister (kosten.js).
const kostenAus = (id) => ({
  investition: KOSTENANSAETZE[id].wert,
  ohnehin_anteil: KOSTENANSAETZE[id].ohnehin,
  kostenansatz: id,
});

// ─── Options für Dropdowns ────────────────────────────────────────────────
export const OPTIONS_GEBAEUDETYP = [
  "Einfamilienhaus", "Zweifamilienhaus", "Doppelhaushälfte", "Reihenhaus",
];

export const OPTIONS_HEIZUNG = [
  "Fernwärme (Gas-KWK)", "Fernwärme (erneuerbar)",
  "Erdgas Brennwert", "Erdgas Niedertemperatur", "Heizöl",
  "Wärmepumpe Luft/Wasser", "Wärmepumpe Sole/Wasser",
  "Biomasse (Pellets)", "Elektroheizung",
];

export const OPTIONS_DACH = [
  "Flachdach (begrünt)", "Flachdach", "Satteldach", "Walmdach", "Pultdach", "Mansarddach",
];

export const OPTIONS_KELLER = ["beheizt", "unbeheizt", "teilunterkellert", "kein Keller"];

export const OPTIONS_LUEFTUNG = [
  "Fensterlüftung", "Schachtlüftung",
  "Lüftungsanlage mit WRG", "Lüftungsanlage ohne WRG",
];

export const OPTIONS_WARMWASSER = [
  "zentral, über Heizung", "dezentral, elektrisch", "Solarthermie + zentral",
];

export const OPTIONS_ERNEUERBARE = [
  "keine", "Solarthermie", "Photovoltaik", "Wärmepumpe",
  "Biomasse / Holz", "Kombination mehrerer",
];

export const OPTIONS_WAERMEVERTEILUNG = [
  "Heizkörper (Hochtemperatur, >60 °C)",
  "Heizkörper (Niedertemperatur, 45–55 °C)",
  "gemischt (Heizkörper + Fußboden)",
  "Fußbodenheizung (<40 °C)",
];

// Benannte Slider-Stufen für Bauteile — pro Kategorie spezifisch
export const BAUTEIL_STUFEN = {
  waende: {
    1: "Ungedämmt, kalt, Schimmelgefahr",
    2: "Ungedämmt, unsaniert",
    3: "Leichte Innendämmung",
    4: "Teildämmung vorhanden",
    5: "WDVS 8–12 cm",
    6: "WDVS 14–18 cm, modernisiert",
    7: "Passivhaus-Standard, U<0,15",
  },
  dach: {
    1: "Ungedämmt, durchfeuchtet",
    2: "Ungedämmt, trocken",
    3: "Dünn gedämmt (<10 cm)",
    4: "Teildämmung 10–14 cm",
    5: "16–20 cm Dämmung",
    6: "22 cm + Gründach",
    7: "Passivhaus-Standard",
  },
  boden: {
    1: "Ungedämmt, Erdkontakt",
    2: "Alte Bodenplatte, ungedämmt",
    3: "Minimale Dämmung Kellerdecke",
    4: "Kellerdecke gedämmt (6–10 cm)",
    5: "Moderne Dämmung 12–16 cm",
    6: "Hocheffizient, Perimeter",
    7: "Passivhaus-Standard",
  },
  fenster: {
    1: "Einfachverglasung, Zugluft",
    2: "Alte Isolierverglasung, undicht",
    3: "Isolierglas 2-fach, Uw≈1,8",
    4: "Isolierglas 2-fach, Uw≈1,3",
    5: "3-fach Wärmeschutz, Uw≈1,0",
    6: "3-fach modern, Uw≤0,9",
    7: "Passivhausfenster, Uw<0,8",
  },
  lueftung: {
    1: "Undichte Fenster, Zugluft",
    2: "Fensterlüftung manuell",
    3: "Fensterlüftung mit Dichtungen",
    4: "Schachtlüftung / Abluft",
    5: "Lüftungsanlage ohne WRG",
    6: "Zentrale KWL mit WRG 70 %",
    7: "KWL mit WRG >85 %",
  },
  heizung: {
    1: "Alter Standardkessel >25 J.",
    2: "Niedertemperatur >15 J.",
    3: "Gas-Brennwert 10–15 J.",
    4: "Fernwärme Gas-KWK, modern",
    5: "Gas-Brennwert + Solar",
    6: "Hybrid (WP + Gas)",
    7: "Monovalente Wärmepumpe",
  },
  warmwasser: {
    1: "Elektroboiler dezentral",
    2: "Zentral über alte Heizung",
    3: "Zentral über moderne Heizung",
    4: "Zirkulation gedämmt",
    5: "Solarthermie-Unterstützung",
    6: "WP-Warmwasser",
    7: "Vollversorgung regenerativ",
  },
  verteilung: {
    1: "Einrohr, ungedämmt",
    2: "Zweirohr, teils ungedämmt",
    3: "Zweirohr, gedämmt",
    4: "Hydraulischer Abgleich vorhanden",
    5: "Effizienzpumpen + Abgleich",
    6: "Niedertemperaturnetz 45/35 °C",
    7: "Flächenheizung, Systemtemperatur <40 °C",
  },
};

// ─── PRESETS ───────────────────────────────────────────────────────────────
export const PRESETS = {
  efhNachkrieg: {
    id: "efhNachkrieg",
    label: "EFH Nachkriegszeit 1965",
    beschreibung: "1 WE · 145 m² · Heizöl · Klasse F/G · typisches Sanierungsobjekt",
    photoUrl: "",
    photoCredit: "",
    gebaeude: {
      standort: "München", strasse: "Musterweg 12", plz: "81675",
      baujahr: 1965, typ: "Einfamilienhaus",
      wohneinheiten: 1, wohnflaeche: 145, gebaeudenutzflaeche: 180,
      vollgeschosse: 2, keller: "teilunterkellert", dach: "Satteldach",
      heizung_bj: 2008, heizung_typ: "Heizöl",
      warmwasser: "zentral, über Heizung", lueftung: "Fensterlüftung",
      erneuerbare: "keine", denkmalschutz: false, registriernummer: "—",
      waermeverteilung: "Heizkörper (Hochtemperatur, >60 °C)",
    },
    ist: { endenergie: 215, primaerenergie: 236, co2: 63 },
  },
  efh70er: {
    id: "efh70er",
    label: "EFH 70er-Jahre",
    beschreibung: "1 WE · 160 m² · Erdgas · Klasse E/F · Fenster bereits getauscht",
    photoUrl: "",
    photoCredit: "",
    bauteile_overrides: { fenster: 5 },
    gebaeude: {
      standort: "Hannover", strasse: "Birkenallee 8", plz: "30519",
      baujahr: 1978, typ: "Einfamilienhaus",
      wohneinheiten: 1, wohnflaeche: 160, gebaeudenutzflaeche: 200,
      vollgeschosse: 2, keller: "unbeheizt", dach: "Satteldach",
      heizung_bj: 2015, heizung_typ: "Erdgas Brennwert",
      warmwasser: "zentral, über Heizung", lueftung: "Fensterlüftung",
      erneuerbare: "keine", denkmalschutz: false, registriernummer: "—",
      waermeverteilung: "Heizkörper (Niedertemperatur, 45–55 °C)",
    },
    ist: { endenergie: 155, primaerenergie: 172, co2: 41 },
  },
  efh2000er: {
    id: "efh2000er",
    label: "EFH 2000er",
    beschreibung: "1 WE · 150 m² · Gas-Brennwert · Klasse C/D · solide Grundlage",
    photoUrl: "",
    photoCredit: "",
    gebaeude: {
      standort: "Stuttgart", strasse: "Eichenweg 23", plz: "70569",
      baujahr: 2002, typ: "Einfamilienhaus",
      wohneinheiten: 1, wohnflaeche: 150, gebaeudenutzflaeche: 188,
      vollgeschosse: 2, keller: "beheizt", dach: "Satteldach",
      heizung_bj: 2002, heizung_typ: "Erdgas Brennwert",
      warmwasser: "zentral, über Heizung", lueftung: "Fensterlüftung",
      erneuerbare: "keine", denkmalschutz: false, registriernummer: "—",
      waermeverteilung: "Heizkörper (Niedertemperatur, 45–55 °C)",
    },
    ist: { endenergie: 98, primaerenergie: 118, co2: 25 },
  },
  dhh1990: {
    id: "dhh1990",
    label: "DHH 90er-Jahre",
    beschreibung: "1 WE · 130 m² · Erdgas NT · Klasse D/E · Doppelhaushälfte",
    gebaeude: {
      standort: "Dortmund", strasse: "Kastanienweg 5", plz: "44227",
      baujahr: 1992, typ: "Doppelhaushälfte",
      wohneinheiten: 1, wohnflaeche: 130, gebaeudenutzflaeche: 162,
      vollgeschosse: 2, keller: "unbeheizt", dach: "Satteldach",
      heizung_bj: 2005, heizung_typ: "Erdgas Niedertemperatur",
      warmwasser: "zentral, über Heizung", lueftung: "Fensterlüftung",
      erneuerbare: "keine", denkmalschutz: false, registriernummer: "—",
      waermeverteilung: "Heizkörper (Niedertemperatur, 45–55 °C)",
    },
    ist: { endenergie: 128, primaerenergie: 145, co2: 35 },
  },
  efhSaniert: {
    id: "efhSaniert",
    label: "EFH Neubau 2012",
    beschreibung: "1 WE · 148 m² · Gas-Brennwert · Klasse B/C · Neubaustandard",
    gebaeude: {
      standort: "Frankfurt", strasse: "Amselweg 3", plz: "60599",
      baujahr: 2012, typ: "Einfamilienhaus",
      wohneinheiten: 1, wohnflaeche: 148, gebaeudenutzflaeche: 185,
      vollgeschosse: 2, keller: "beheizt", dach: "Pultdach",
      heizung_bj: 2012, heizung_typ: "Erdgas Brennwert",
      warmwasser: "zentral, über Heizung", lueftung: "Lüftungsanlage mit WRG",
      erneuerbare: "keine", denkmalschutz: false, registriernummer: "—",
      waermeverteilung: "Heizkörper (Niedertemperatur, 45–55 °C)",
    },
    ist: { endenergie: 68, primaerenergie: 82, co2: 17 },
  },
};

// ─── Auto-Derive Bauteile aus Baujahr ──────────────────────────────────────
export function ableiteBauteile(baujahr, heizungTyp, lueftung, warmwasser) {
  const bj = Number(baujahr) || 1970;
  // Grundlogik: älter = schlechter
  // Baujahr-Mapping (grobe TABULA-Orientierung):
  // <1948: 1-2 · 1948-1978: 2 · 1979-1994: 3 · 1995-2009: 4 · 2010-2019: 5 · 2020+: 6
  const alterNote = bj < 1948 ? 2 : bj < 1979 ? 2 : bj < 1995 ? 3 : bj < 2010 ? 4 : bj < 2020 ? 5 : 6;

  const heizungNote =
    /Wärmepumpe/i.test(heizungTyp) ? 7 :
    /erneuerbar/i.test(heizungTyp) ? 6 :
    /Pellets|Biomasse/i.test(heizungTyp) ? 6 :
    /Fernwärme/i.test(heizungTyp) ? 4 :
    /Brennwert/i.test(heizungTyp) ? 4 :
    /Niedertemperatur/i.test(heizungTyp) ? 3 :
    /Heizöl/i.test(heizungTyp) ? 2 :
    /Elektro/i.test(heizungTyp) ? 2 : 3;

  const lueftungNote =
    /WRG/i.test(lueftung) ? 6 :
    /Lüftungsanlage/i.test(lueftung) ? 5 :
    /Schacht/i.test(lueftung) ? 4 : 2;

  const warmwasserNote =
    /Solarthermie/i.test(warmwasser) ? 5 : 3;

  return [
    { id: "waende",     label: "Wände",           note: alterNote,    info: `Baualtersklasse ${bj < 1979 ? "vor 1979" : bj < 2010 ? "1979–2009" : "ab 2010"}` },
    { id: "dach",       label: "Dach",            note: alterNote,    info: `Dämmstandard typisch für BJ ${bj}` },
    { id: "boden",      label: "Boden",           note: alterNote,    info: `Kellerdecke/Bodenplatte BJ ${bj}` },
    { id: "fenster",    label: "Fenster",         note: Math.min(alterNote + 1, 6), info: "Fenster häufig einmal erneuert" },
    { id: "lueftung",   label: "Lüftung",         note: lueftungNote, info: lueftung || "Fensterlüftung" },
    { id: "heizung",    label: "Heizung",         note: heizungNote,  info: heizungTyp },
    { id: "warmwasser", label: "Warmwasser",      note: warmwasserNote, info: warmwasser },
    { id: "verteilung", label: "Wärmeverteilung", note: Math.max(alterNote - 1, 2), info: "Abhängig von Heizungs-Modernisierungsstand" },
  ];
}

// ─── Energiepreise (Stand April 2026) ─────────────────────────────────────
export const STROMPREIS_HAUSHALT  = 0.31;  // €/kWh Haushaltstarif 2026

export const ENERGIEPREISE = {
  fernwaerme_gas: 0.13, strom_wp: 0.22, erdgas: 0.11, heizoel: 0.11, biomasse: 0.08,
  // strom_wp = WP Wärmestromtarif (Sondertarif) — typisch 2026 Deutschland
  strom_haushalt: STROMPREIS_HAUSHALT, // Direktelektrische Heizung ohne Sondertarif
};

// Faktoren für die Neuberechnung des Zielzustands. Geprüft 10/2026 an der konsolidierten Fassung
// des GModG (vormals GEG, gesetze-im-internet.de): Primärenergie Anlage 4 (nicht erneuerbarer Anteil),
// CO₂-Äquivalent Anlage 9. Hinweis: Der Regierungsentwurf (Drs. 21/6278) sieht für netzbezogenen
// Strom künftig 100 g/kWh vor; in Kraft sind derzeit 560 g/kWh.
// Fernwärme ist in echten Energieausweisen netzspezifisch; hier dokumentierte Fallback-Werte.
export const ENERGIE_TRAEGER_FAKTOREN = {
  heizoel:              { primaerenergie: 1.1, co2KgProKwh: 0.310, label: "Heizoel" },
  erdgas:               { primaerenergie: 1.1, co2KgProKwh: 0.240, label: "Erdgas" },
  strom_netz:           { primaerenergie: 1.8, co2KgProKwh: 0.560, label: "Strom netzbezogen" },
  strom_wp:             { primaerenergie: 1.8, co2KgProKwh: 0.560, label: "WP-Strom netzbezogen" },
  biomasse:             { primaerenergie: 0.2, co2KgProKwh: 0.020, label: "Holz / Pellets" },
  fernwaerme_gas_kwk:   { primaerenergie: 0.7, co2KgProKwh: 0.180, label: "Fernwaerme Gas-KWK (Fallback)" },
  fernwaerme_erneuerbar:{ primaerenergie: 0.2, co2KgProKwh: 0.040, label: "Fernwaerme erneuerbar (Fallback)" },
};

// Ein Klassifizierer für alle trägerabhängigen Größen (Faktoren, Preis, Wartung, Label).
// Schlüssel = ENERGIE_TRAEGER_FAKTOREN-Key.
const TRAEGER_INFO = {
  heizoel:               { preis: ENERGIEPREISE.heizoel,        label: "Heizöl",                 wartung: "heizoel" },
  erdgas:                { preis: ENERGIEPREISE.erdgas,         label: "Erdgas",                 wartung: "erdgas" },
  strom_wp:              { preis: ENERGIEPREISE.strom_wp,       label: "WP-Sondertarif",         wartung: "strom_wp" },
  strom_netz:            { preis: ENERGIEPREISE.strom_haushalt, label: "Strom (Haushaltstarif)", wartung: null },
  biomasse:              { preis: ENERGIEPREISE.biomasse,       label: "Biomasse",               wartung: "biomasse" },
  fernwaerme_gas_kwk:    { preis: ENERGIEPREISE.fernwaerme_gas, label: "Fernwärme",              wartung: "fernwaerme_gas" },
  fernwaerme_erneuerbar: { preis: ENERGIEPREISE.fernwaerme_gas, label: "Fernwärme",              wartung: "fernwaerme_gas" },
};

export const PV_KWP               = 10;
export const PV_SPEZ_ERTRAG       = 950;   // kWh/kWp/year, mittlerer dt. Standort
export const EINSPEISETARIF       = 0.082; // €/kWh EEG 2024, <10 kWp
export const PV_EV_QUOTE_OHNE_WP  = 0.35;
export const PV_EV_QUOTE_MIT_WP   = 0.60; // Speicher + WP-Synergie

// Annual O&M costs by IST heating carrier (heizkosten covers fuel; these cover service)
export const HEIZUNG_WARTUNG_IST = {
  heizoel:        260,  // Brennerwartung ~180 + Schornsteinfeger ~80
  erdgas:         180,  // Gasbrenner-Vollwartung inkl. Abgasmessung
  fernwaerme_gas:  40,  // Zählerpacht + Jahresabrechnung
  biomasse:       200,  // Pelletkessel-Vollwartung
  strom_wp:       300,  // IST-WP (edge case)
};
const WARTUNG_IST_FALLBACK = 180; // u. a. Elektroheizung — kein belegter Wert
// ZIEL system service costs (absolute, not net)
export const WARTUNGSKOSTEN_WP         = 300; // WP-Vollwartung/Jahr
export const WARTUNGSKOSTEN_WP_HYBRID  = 100; // Gaskessel-Teilbetrieb bei Hybrid (Backupbetrieb)
export const WARTUNGSKOSTEN_PV         = 150; // PV-Versicherung + Wechselrichterrücklage (~1.800 € nach 12 J)

// Returns absolute IST and ZIEL annual O&M so callers can show both sides.
// heizungTyp = gebaeude.heizung_typ (Dropdown-Text), nicht das Träger-Label.
export function berechneHeizungWartung({ heizungTyp, wpVariante, hatWP, hatPV }) {
  const key = TRAEGER_INFO[faktorKeyFuerHeizung(heizungTyp)]?.wartung;
  const istJahr = HEIZUNG_WARTUNG_IST[key] ?? WARTUNG_IST_FALLBACK;
  if (!hatWP) {
    return { istJahr, zielJahr: istJahr + (hatPV ? WARTUNGSKOSTEN_PV : 0) };
  }
  const wpGesamt = wpVariante === "hybrid"
    ? WARTUNGSKOSTEN_WP + WARTUNGSKOSTEN_WP_HYBRID
    : WARTUNGSKOSTEN_WP;
  return { istJahr, zielJahr: wpGesamt + (hatPV ? WARTUNGSKOSTEN_PV : 0) };
}

export function berechnePvErtrag(mitWP) {
  const total   = PV_KWP * PV_SPEZ_ERTRAG;
  const evQ     = mitWP ? PV_EV_QUOTE_MIT_WP : PV_EV_QUOTE_OHNE_WP;
  const evEur   = Math.round(total * evQ * STROMPREIS_HAUSHALT);
  const einsEur = Math.round(total * (1 - evQ) * EINSPEISETARIF);
  return { gesamtEur: evEur + einsEur, evEur, einsEur };
}

// ─── Impact helper (stufe 1–7 lookup table) ───────────────────────────────
const _imp = (tbl, stufe) => {
  const s = Math.max(0, Math.min(6, Math.round(stufe || 2) - 1));
  const [ee, pe, co2] = tbl[s];
  return { endenergie_delta: ee, primaerenergie_delta: pe, co2_reduktion: co2 };
};

// ─── WP-Varianten ─────────────────────────────────────────────────────────
export const WP_VARIANTEN = {
  monovalent: {
    label: "Monovalent",
    beschreibung: "WP deckt 100 % der Heizlast. Kein fossiler Backup. Geeignet bei Vorlauftemperatur ≤ 55 °C oder mit Heizkreisumbau (M7).",
    investition: KOSTENANSAETZE.WP_monovalent.wert, ohnehin_anteil: KOSTENANSAETZE.WP_monovalent.ohnehin, foerderquote: 0.30,
    pe_mult: 1.0, ee_mult: 1.0, co2_mult: 1.0,
  },
  monoenergetisch: {
    label: "Monoenergetisch",
    beschreibung: "WP deckt ~95 % der Heizlast. Elektrischer Heizstab für Spitzenlast — kein fossiler Anschluss nötig.",
    investition: KOSTENANSAETZE.WP_monoenergetisch.wert, ohnehin_anteil: KOSTENANSAETZE.WP_monoenergetisch.ohnehin, foerderquote: 0.30,
    pe_mult: 0.88, ee_mult: 0.92, co2_mult: 0.88,
  },
  hybrid: {
    label: "Hybrid (WP + Gas)",
    beschreibung: "WP deckt ~65 % der Heizlast. Gaskessel für Spitzenlast. Übergangslösung bei hoher Vorlauftemperatur und vorhandenem Gasanschluss. Gefördert wird nur der WP-Anteil (~60 % der Kosten), der Gaskessel-Anteil nicht.",
    investition: KOSTENANSAETZE.WP_hybrid.wert, ohnehin_anteil: KOSTENANSAETZE.WP_hybrid.ohnehin, foerderquote: 0.30,
    foerderfaehigAnteil: 0.6,
    pe_mult: 0.55, ee_mult: 0.60, co2_mult: 0.55,
  },
};

export function wpTypVarianteKey(vorlaufTemp, envAvg) {
  if (vorlaufTemp <= 55 && envAvg >= 3) return "monovalent";
  if (vorlaufTemp <= 60)                return "monoenergetisch";
  return "hybrid";
}

// ─── Maßnahmenpakete ──────────────────────────────────────────────────────
// foerderquote = BEG-Grundförderung (realistisch, ohne Konjunktur-Booster)
// kfw_programm = durchführende Stelle (BAFA für EM, KfW für WG/HZG)
export const MASSNAHMENPAKETE = [
  {
    id: "P1", nummer: 1, titel: "Sofortmaßnahmen", zeitraum: "Heute – 2026", farbe: "rot",
    begruendung: "Geringe Investition, schnelle Wirkung. Voraussetzung für weitere BEG-Anträge.",
    zu_beachten: "Hydraulischer Abgleich erfordert Bestandspläne der Heizungsanlage. Terminkoordination mit Heizungsbauer mind. 4 Wochen im Voraus. BEG-Antrag muss vor Beauftragung gestellt werden.",
    komfortsteigerung: "Gleichmäßigere Wärmeverteilung im gesamten Gebäude. Kein Überheizen einzelner Räume. Geringere Geräuschentwicklung durch niedrigere Pumpenleistung.",
    massnahmen: [
      { id: "M1", kurztitel: "Hydraul. Abgleich", rolle: "pflichtschritt", foerderprogramm: "em_optimierung", titel: "Hydraulischer Abgleich + Heizungsoptimierung",
        beschreibung: "Verfahren B nach VdZ, Pumpentausch, Voreinstellung Thermostatventile, Heizkurvenanpassung.",
        ...kostenAus("M1"), foerderquote: 0.15,
        co2_reduktion: 3.5, endenergie_delta: -12, primaerenergie_delta: -14,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~600 € Planung · ~1.200 € Umsetzung (Hocheffizienzpumpe + Ventile + Abgleich) für EFH",
        impact: bs => _imp([[-15,-18,4.5],[-12,-14,3.5],[-8,-10,2.5],[-4,-5,1.5],[-2,-3,0.8],[-1,-1,0.3],[0,0,0]], (bs||{}).heizung) },
    ],
  },
  {
    id: "P2", nummer: 2, titel: "Dachdämmung", zeitraum: "2027 – 2029", farbe: "orange",
    begruendung: "Dach ist bei EFH der größte Wärmeverlustbereich — oft 25–30 % der gesamten Transmissionswärmeverluste.",
    zu_beachten: "Dachdämmung erfordert statische Prüfung bei alter Dachkonstruktion. Baugenehmigung je nach Denkmalzone erforderlich. Schimmelrisiko durch erhöhte Luftdichtheit prüfen.",
    komfortsteigerung: "Deutlich wärmere Decken- und Wandoberflächen im OG — keine Kältestrahlung mehr. Geringerer Temperaturabfall über Nacht.",
    massnahmen: [
      { id: "M2", kurztitel: "Dachdämmung", rolle: "energetisch", foerderprogramm: "em_huelle", daemmung: true, titel: "Dachdämmung Obergeschoss-Decke (22 cm Mineralwolle)",
        beschreibung: "Aufsparren- oder Zwischensparrendämmung, neue Dampfbremse, Luftdichtheitsschicht.",
        ...kostenAus("M2"), foerderquote: 0.15,
        co2_reduktion: 4.2, endenergie_delta: -22, primaerenergie_delta: -26,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~180 €/m² Dachfläche (~120 m² EFH-Dach) · ~20 % davon entfallen auf ohnehin fällige Neueindeckung (Sowieso-Kosten, als Umfeldmaßnahme förderfähig)",
        impact: bs => _imp([[-26,-31,5.0],[-22,-26,4.2],[-14,-17,2.7],[-7,-8,1.3],[-2,-2,0.3],[-1,-1,0.1],[0,0,0]], (bs||{}).dach) },
    ],
  },
  {
    id: "P2b", nummer: 3, titel: "Fenster", zeitraum: "2027 – 2031", farbe: "lila",
    begruendung: "Fenster lohnen sich vor allem bei Einfach- oder alter Isolierverglasung. Bei bereits modernisierten Fenstern (Stufe 5+) kaum Wirkung.",
    zu_beachten: "Fenstertausch koordiniert mit Dachabdichtung planen, um Wärmebrücken zu minimieren. Baugenehmigung bei Denkmalschutz erforderlich.",
    komfortsteigerung: "Keine Kaltluftabfälle mehr. Spürbare Reduktion von Lärmdurchdringung (Schallschutz Rw ≥ 33 dB). Kein Zugluft-Effekt durch Fensterfugen.",
    massnahmen: [
      { id: "M3", kurztitel: "Fenstertausch", rolle: "energetisch", foerderprogramm: "em_huelle", titel: "Fenstertausch (3-fach Verglasung, Uw ≤ 0,95)",
        beschreibung: "Komplettaustausch, RC2-Beschlag, Einbruchhemmung.",
        ...kostenAus("M3"), foerderquote: 0.15,
        co2_reduktion: 3.0, endenergie_delta: -15, primaerenergie_delta: -18,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~750 €/m² Fensterfläche (~25 m² EFH) · ~35 % davon sind ohnehin fällige Fenstererneuerung (Sowieso-Kosten, trotzdem förderfähig)",
        impact: bs => _imp([[-20,-24,4.0],[-17,-20,3.4],[-15,-18,3.0],[-8,-10,1.6],[-2,-2,0.4],[-1,-1,0.1],[0,0,0]], (bs||{}).fenster) },
    ],
  },
  {
    id: "P3", nummer: 3, titel: "Wärmeerzeugung & Verteilung", zeitraum: "2030 – 2034", farbe: "gelb",
    begruendung: "Wärmepumpe entfaltet ihr volles Potenzial nur mit niedriger Vorlauftemperatur. Heizkreis erst anpassen (falls nötig), dann WP einbauen, danach hydraulisch abgleichen.",
    zu_beachten: "Reihenfolge wichtig: 1) Wärmeverteilung umbauen oder Heizkörper auf NT-Tauglichkeit prüfen. 2) WP-Außengerät installieren — Schallschutzgutachten empfohlen. 3) Hydraulischer Abgleich mit neuen Massenströmen. Klimageschwindigkeitsbonus sinkt halbjährlich bis Aug 2028 — Antragszeitpunkt bestimmt die Förderung.",
    komfortsteigerung: "Konstante Vorlauftemperaturen, leiser Betrieb außen. Bei Fußbodenheizung: gleichmäßige Strahlungswärme, im Sommer als Kühlung nutzbar.",
    massnahmen: [
      { id: "M7", kurztitel: "Wärmeverteilung", rolle: "enabler", foerderprogramm: "em_optimierung", titel: "Erneuerung Wärmeverteilung (Niedertemperatur / Fußbodenheizung)",
        beschreibung: "Umbau auf Fußbodenheizung (Trocken- oder Nassestrich) oder Heizkreisoptimierung für NT-Betrieb ≤ 40 °C inkl. hydraulischem Abgleich. Voraussetzung für Monovalent-WP-Betrieb (COP ~4–5 statt ~2).",
        ...kostenAus("M7"), foerderquote: 0.15,
        co2_reduktion: 1.0,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~100 €/m² Fußbodenheizung (Trockenbau) für EFH 120 m² · inkl. hydraulischem Abgleich und Estricharbeiten",
        impact: bs => {
          const vNote = ((bs||{}).verteilung) || 2;
          return _imp([[-5,-4,1.0],[-4,-3,0.8],[-3,-3,0.6],[-2,-2,0.4],[-1,-1,0.2],[0,0,0],[0,0,0]], vNote);
        } },
      { id: "M4", kurztitel: "Wärmepumpe", rolle: "systempfad", heizungstausch: true, foerderprogramm: "heizung", titel: "Luft-Wasser-Wärmepumpe (12 kW, monovalent)",
        beschreibung: "Monoblock-WP außen, neuer Pufferspeicher 300 L, Heizkörpertausch wo nötig.",
        ...kostenAus("M4"), foerderquote: 0.30,
        co2_reduktion: 22, endenergie_delta: -70, primaerenergie_delta: -55,
        foerderung_rechtsgrundlage: "BEG EM / KfW 458", foerderung_stelle: "KfW",
        kostenherleitung: "~2.700 €/kW Leistung EFH-typisch · ~16 % davon entfallen ohnehin auf den Ersatz der alten Heizung (Sowieso-Kosten, trotzdem förderfähig). KfW 458: 30 % Grundförderung + Klimageschwindigkeits- und Einkommensbonus, förderfähige Kosten gedeckelt.",
        impact: bs => {
          const variante = WP_VARIANTEN[(bs||{}).wpVariante] || WP_VARIANTEN.monovalent;
          const base = _imp([[-115,-60,24],[-105,-55,22],[-88,-43,17],[-70,-32,12],[-42,-16,6],[-15,-6,2],[0,0,0]], (bs||{}).heizung);
          // Use actual flow temperature from Wärmeverteilung dropdown; M7 (floor heating) overrides to 35 °C.
          const distrib = (bs||{}).verteilung || 2;
          const vorlaufTemp = distrib >= 6 ? 35 : ((bs||{}).vorlauftemp || 65);
          // Malus scales 0–0.20 (linear from 35 °C to 65 °C): aligned with realistic modern WP COPs.
          const malus = Math.max(0, Math.min(0.20, (vorlaufTemp - 35) / 150));
          return {
            endenergie_delta: Math.round(base.endenergie_delta * variante.ee_mult),
            primaerenergie_delta: Math.round(base.primaerenergie_delta * variante.pe_mult * (1 - malus)),
            co2_reduktion: +(base.co2_reduktion * variante.co2_mult * (1 - malus)).toFixed(1),
          };
        } },
    ],
  },
  {
    id: "P4", nummer: 4, titel: "Fassade", zeitraum: "2030 – 2034", farbe: "gruen",
    begruendung: "Fassadendämmung lohnt sich nur bei ungedämmten oder schlecht gedämmten Wänden. Bei modernen Gebäuden oft nicht wirtschaftlich.",
    zu_beachten: "Bei denkmalgeschützten Fassaden Innendämmung als Alternative prüfen. Fensterlaibungen und Sockel mit dämmen, sonst Wärmebrücken. Gerüststandzeit 6–10 Wochen einplanen.",
    komfortsteigerung: "Deutlich wärmere Wandoberflächen — keine Kondensat- und Schimmelgefahr mehr. Schutz vor Sommerhitze (Phasenverschiebung). Wertsteigerung durch modernes Erscheinungsbild.",
    massnahmen: [
      { id: "M5", kurztitel: "Fassadendämmung", rolle: "energetisch", foerderprogramm: "em_huelle", daemmung: true, titel: "Fassadendämmung (WDVS 18 cm Mineralwolle)",
        beschreibung: "Wärmedämmverbundsystem U<0,20, neue Fassadenfarbe, Fensterlaibungen.",
        ...kostenAus("M5"), foerderquote: 0.15,
        co2_reduktion: 6.5, endenergie_delta: -28, primaerenergie_delta: -33,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~190 €/m² Fassade (~200 m² EFH) · ~32 % davon sind ohnehin fällige Putzerneuerung + Anstrich (Sowieso-Kosten, als Umfeldmaßnahme förderfähig)",
        impact: bs => _imp([[-34,-40,7.8],[-28,-33,6.5],[-18,-21,4.1],[-9,-11,2.1],[-2,-3,0.5],[-1,-1,0.1],[0,0,0]], (bs||{}).waende) },
    ],
  },
  {
    id: "P5", nummer: 5, titel: "Eigenstrom", zeitraum: "2030 – 2033", farbe: "blau",
    begruendung: "PV senkt Strombezug der Wärmepumpe signifikant. Unabhängig von Hüllsanierung umsetzbar.",
    zu_beachten: "Statik des Dachs für PV-Zusatzlast prüfen (ca. 15 kg/m²). Netzanmeldung beim Netzbetreiber mind. 8 Wochen vor Inbetriebnahme. Speicher erfordert separaten Zählerschrank. Marktstammdatenregister-Anmeldung Pflicht.",
    komfortsteigerung: "Weitgehende Unabhängigkeit von Strompreissteigerungen. Wallbox ermöglicht Laden mit Eigenstrom. Monitoring-System gibt Überblick über Energieflüsse in Echtzeit.",
    massnahmen: [
      { id: "M6", kurztitel: "PV + Speicher", rolle: "synergie", titel: "PV-Anlage (10 kWp, Aufdach) + 8 kWh Speicher",
        beschreibung: "Süd- oder Ost-West-Ausrichtung, Lithium-Speicher, Wallbox-Vorbereitung.",
        ...kostenAus("M6"), foerderquote: 0,
        co2_reduktion: 4.0, endenergie_delta: 0, primaerenergie_delta: -12,
        foerderung_rechtsgrundlage: "KfW 270 (Kredit) + EEG-Einspeisung", foerderung_stelle: "KfW",
        kostenherleitung: "18.000 € pauschal inkl. Speicher und Montage (Herkunft undokumentiert) · kein BEG-Zuschuss",
        impact: () => ({ endenergie_delta: 0, primaerenergie_delta: -12, co2_reduktion: 4.0 }) },
    ],
  },
  {
    id: "P6", nummer: 6, titel: "Badsanierung", zeitraum: "flexibel", farbe: "tuerkis",
    begruendung: "Keine Energiewirkung — als Kostenposition für die Gesamtplanung. Wird getrennt vom energetischen Eigenanteil ausgewiesen.",
    zu_beachten: "Kosten hängen stark von Größe, Ausstattung, Zustand der Leitungen und Barrierefreiheit ab. Mindestens zwei bis drei Angebote einholen. Bauzeit typischerweise 2–4 Wochen ohne nutzbares Bad. Gemeinsam mit Heizungs- oder Leitungsarbeiten planen spart doppelte Arbeiten.",
    komfortsteigerung: "Zeitgemäßes Bad, auf Wunsch bodengleiche Dusche und barrierearme Nutzung.",
    massnahmen: [
      { id: "B1", kurztitel: "Badsanierung", rolle: "modernisierung", kategorie: "modernisierung",
        titel: "Komplettsanierung Bad",
        beschreibung: "Rückbau bis Rohbau, neue Wasser- und Abwasserleitungen, Abdichtung, Fliesen, Sanitärobjekte, Elektro.",
        ...kostenAus("BAD_mittel"), foerderquote: 0,
        foerderung_rechtsgrundlage: "kein BEG-Zuschuss (barrierereduzierende Umbauten ggf. über KfW, Konditionen prüfen)", foerderung_stelle: "—",
        kostenherleitung: "Spanne je m² Badfläche nach Ausstattung, Basis Ratgeber- und Anbieterseiten 2025/2026 (keine Erhebung). Für eine belastbare Zahl Angebote einholen.",
        impact: () => ({ endenergie_delta: 0, primaerenergie_delta: 0, co2_reduktion: 0 }) },
    ],
  },
];

// Ausstattungsstandards der Badsanierung → Kostenansatz BAD_<key> in kosten.js
export const BAD_STANDARDS = {
  einfach: { label: "Einfach" },
  mittel:  { label: "Mittelklasse" },
  gehoben: { label: "Gehoben" },
};
export const BAD_DEFAULT = { flaeche: 8, standard: "mittel" };

// B1 übernimmt Kosten und Spanne des gewählten Ausstattungsstandards.
export function wendeBadStandardAn(m, standard) {
  if (m.id !== "B1") return m;
  const key = BAD_STANDARDS[standard] ? standard : BAD_DEFAULT.standard;
  const ansatz = KOSTENANSAETZE[`BAD_${key}`];
  return { ...m, investition: ansatz.wert, ohnehin_anteil: ansatz.ohnehin, kostenansatz: `BAD_${key}`, badStandard: key };
}

// Nur iSFP-Bonus, kein Konjunktur-Booster mehr
// ─── Förderlogik: BEG ab 21.07.2026 ───────────────────────────────────────
// Geprüft am Volltext (10/2026):
//  - BEG-Richtlinie Einzelmaßnahmen, gültig ab 21.07.2026 (BMWE; BAnz AT 27.08.2026 B1),
//    v. a. Nr. 5.1–5.4, 8.3.1 (Höchstgrenzen), 8.4.1–8.4.6 (Fördersätze, Boni)
//  - KfW-Merkblatt 458, gültig ab 24.09.2026
//  - Infoblatt förderfähige Maßnahmen und Leistungen, Version 11.0 (16.09.2026): Umfeldmaßnahmen
//    (Gerüst, Neueindeckung, Putz, Rückbau der Altanlage) sind förderfähig → kein Sowieso-Abzug;
//    WPB = Endenergiebedarf ≥ 300 kWh/(m²·a) oder Bedarfsausweis Klasse H
// Vereinfachungen: Höchstgrenzen und iSFP-Schwelle je Maßnahme (real: je Gebäude und Kalenderjahr
// für Hülle/Optimierung, je Gebäude insgesamt für die Heizung); eine selbstgenutzte Wohneinheit;
// Fachplanung/Baubegleitung (50 %) nicht enthalten; Regeln zum EU-Ursprung der WP noch nicht
// veröffentlicht (Infoblatt 1.8: „im Laufe des 1. Quartals 2027“).
export const FOERDERSTAND = "BEG-Richtlinie ab 21.07.2026 · KfW-Merkblatt 458 (09/2026) · Infoblatt 11.0";

export const FOERDERREGELN = {
  em: {
    isfpBonus: 0.05,          // nur auf förderfähige Kosten oberhalb der Höchstgrenze ohne iSFP (Nr. 8.4.2)
    wpbBonus: 0.05,           // Dämmung (5.1 a) an Worst Performing Buildings, ab Q1 2027, mit iSFP (Nr. 8.4.3)
    wpbEndenergieAb: 300,     // oder Energieausweis Klasse H (> 250)
    hoechst: { ersteWE: 30000, we2bis6: 15000, abWE7: 8000 },          // ohne iSFP (Nr. 8.3.1 a)
    hoechstMitIsfp: { ersteWE: 60000, we2bis6: 30000, abWE7: 15000 },
    mindestInvest: 300,       // je Einzelmaßnahme 5.1–5.4 (Nr. 4)
  },
  heizung: {
    maxQuote: 0.70,
    maxQuoteNiedrigesEinkommen: 0.80, // Selbstnutzer, anzusetzendes Einkommen bis 30.000 €
    einkommensbonus: { bis30: 0.40, bis40: 0.30, bis50: 0.10, ueber50: 0 },
    weitereWE: { we2bis6: 15000, abWE7: 8000 },
    klimabonusMindestalter: 20, // Gas-/Biomasseheizung; Öl, Kohle, Gasetage, Nachtspeicher altersunabhängig
    wertschoepfungsbonus: 0.15, // WP mit Ursprung in der Union, ab Q1 2027 (Nr. 8.4.6)
  },
};
export const BEG_BONUS = { isfp_bonus: FOERDERREGELN.em.isfpBonus }; // Altname für Texte

// Antragszeiträume mit den jeweils gültigen Werten (Richtlinie Nr. 8.3.1 a, 8.4.1 c, 8.4.3, 8.4.4).
// ab2027 = Regeln „ab Quartal 1 2027“ (WP-Grundförderung 15 % + Wertschöpfungsbonus, WPB-Bonus,
// kein Heizungstausch bei vorhandenem EE-Wärmeerzeuger ab 2008). Beginn hier: 01.01.2027.
export const ANTRAGSZEITRAEUME = [
  { label: "bis 12/2026",      jahr: 2026, klimabonus: 0.16, hoechst: 28000, ab2027: false },
  { label: "01/2027",          jahr: 2027, klimabonus: 0.16, hoechst: 28000, ab2027: true },
  { label: "02–07/2027",       jahr: 2027, klimabonus: 0.12, hoechst: 27250, ab2027: true },
  { label: "08/2027–01/2028",  jahr: 2027, klimabonus: 0.08, hoechst: 26500, ab2027: true },
  { label: "02–07/2028",       jahr: 2028, klimabonus: 0.04, hoechst: 25750, ab2027: true },
  { label: "08/2028–01/2029",  jahr: 2028, klimabonus: 0,    hoechst: 25000, ab2027: true },
  { label: "02–07/2029",       jahr: 2029, klimabonus: 0,    hoechst: 24250, ab2027: true },
  { label: "08/2029–01/2030",  jahr: 2029, klimabonus: 0,    hoechst: 23500, ab2027: true },
  { label: "02–07/2030",       jahr: 2030, klimabonus: 0,    hoechst: 22750, ab2027: true },
  { label: "ab 08/2030",       jahr: 2030, klimabonus: 0,    hoechst: 22000, ab2027: true },
].map((z, index) => ({ ...z, index }));

export const EINKOMMENSSTUFEN = [
  { value: "ueber50", label: "> 50.000 €" },
  { value: "bis50",   label: "≤ 50.000 €" },
  { value: "bis40",   label: "≤ 40.000 €" },
  { value: "bis30",   label: "≤ 30.000 €" },
];

export const DEFAULT_FOERDERKONTEXT = {
  selbstnutzer: true,
  einkommen: "ueber50",   // anzusetzendes Haushaltseinkommen (Kind im Haushalt: −10.000 €, vom Nutzer berücksichtigt)
  isfp: true,             // BAFA-geförderter iSFP liegt vor
  antragszeitraum: 0,     // Index in ANTRAGSZEITRAEUME
  wpEuUrsprung: true,     // WP mit Ursprung in der Union (ab Q1 2027 relevant)
  istEndenergie: null,    // für den WPB-Bonus, wird aus dem IST-Zustand gesetzt
};

export function heizungsFoerderParameter(antragszeitraum = 0) {
  const z = ANTRAGSZEITRAEUME[Math.max(0, Math.min(ANTRAGSZEITRAEUME.length - 1, antragszeitraum | 0))];
  return { klimabonus: z.klimabonus, hoechst: z.hoechst, ab2027: z.ab2027, jahr: z.jahr };
}

const anzahlWE = (gebaeude) => Math.max(1, Math.round(Number(gebaeude.wohneinheiten) || 1));
const staffel = (n, { ersteWE, we2bis6, abWE7 }) => ersteWE + we2bis6 * Math.min(Math.max(n - 1, 0), 5) + abWE7 * Math.max(n - 6, 0);

// Klimageschwindigkeitsbonus: Selbstnutzer ersetzt Öl/Kohle/Gasetage/Nachtspeicher (jedes Alter)
// oder Gas/Biomasse ab 20 Jahren Betriebsdauer zum Antragsjahr.
export function klimabonusBerechtigt(gebaeude, kontext) {
  if (!kontext.selbstnutzer) return false;
  const typ = gebaeude.heizung_typ || "";
  if (/Heizöl|Elektroheizung/i.test(typ)) return true; // Elektroheizung hier als Nachtspeicher gewertet
  if (/Erdgas|Biomasse|Pellets/i.test(typ)) {
    const jahr = ANTRAGSZEITRAEUME[kontext.antragszeitraum]?.jahr ?? 2026;
    const bj = Number(gebaeude.heizung_bj) || jahr;
    return jahr - bj >= FOERDERREGELN.heizung.klimabonusMindestalter;
  }
  return false;
}

// Worst Performing Building (Infoblatt 11.0, Nr. 1.6): Endenergiebedarf ≥ 300 oder Klasse H (> 250)
export const istWorstPerformingBuilding = (istEndenergie) => Number(istEndenergie) > 250;

// Eine Funktion für alle Förderbeträge (Sidebar, Paket-Blöcke, Bericht).
// Rückgabe: förderfähige Kosten, Betrag, effektive Quote (Betrag ÷ Investition), Bestandteile für Tooltips.
export function berechneFoerderung(m, gebaeude = {}) {
  const kontext = { ...DEFAULT_FOERDERKONTEXT, ...(gebaeude.foerderung || {}) };
  const invest = m.investition ?? 0;
  const grund = m.foerderquote ?? 0;
  const leer = { foerderfaehig: 0, betrag: 0, quote: 0, klimaBonus: 0, bestandteile: [], programm: m.foerderprogramm || null, hinweis: null };
  if (!(grund > 0) || invest < FOERDERREGELN.em.mindestInvest) return leer;
  const n = anzahlWE(gebaeude);
  const p = heizungsFoerderParameter(kontext.antragszeitraum);

  if (m.foerderprogramm === "heizung") {
    const r = FOERDERREGELN.heizung;
    // Ab Q1 2027 kein Heizungstausch, wenn bereits ein EE-Wärmeerzeuger (ab 2008) vorhanden ist (Nr. 5.3)
    if (p.ab2027 && /Wärmepumpe|Biomasse|Pellets/i.test(gebaeude.heizung_typ || "") && Number(gebaeude.heizung_bj) >= 2008) {
      return { ...leer, hinweis: "Ab Q1 2027 nicht förderfähig: vorhandener EE-Wärmeerzeuger ab 2008" };
    }
    const hoechst = p.hoechst + staffel(n, { ersteWE: 0, ...r.weitereWE });
    const foerderfaehig = Math.min(invest * (m.foerderfaehigAnteil ?? 1), hoechst);
    // Ab Q1 2027 halbiert sich die WP-Grundförderung; der Wertschöpfungsbonus gleicht das bei EU-Ursprung aus
    const wp = m.heizungstausch && p.ab2027;
    const grundEff = wp ? grund / 2 : grund;
    const wsb = wp && kontext.wpEuUrsprung ? r.wertschoepfungsbonus : 0;
    // Boni nur für die selbstgenutzte Wohneinheit (Anteil 1/n)
    const anteil = 1 / n;
    const kgb = klimabonusBerechtigt(gebaeude, kontext) ? p.klimabonus * anteil : 0;
    const ekb = kontext.selbstnutzer ? (r.einkommensbonus[kontext.einkommen] ?? 0) * anteil : 0;
    const max = kontext.selbstnutzer && kontext.einkommen === "bis30" ? r.maxQuoteNiedrigesEinkommen : r.maxQuote;
    const summe = grundEff + wsb + kgb + ekb;
    const quoteFF = Math.min(summe, max);
    const pct = (x) => Math.round(x * 100);
    const bestandteile = [
      { label: `Grundförderung ${pct(grundEff)} %`, betrag: foerderfaehig * grundEff },
      wsb > 0 && { label: `Wertschöpfungsbonus ${pct(wsb)} % (WP aus der EU)`, betrag: foerderfaehig * wsb },
      kgb > 0 && { label: `Klimageschwindigkeitsbonus ${pct(kgb)} %`, betrag: foerderfaehig * kgb },
      ekb > 0 && { label: `Einkommensbonus ${pct(ekb)} %`, betrag: foerderfaehig * ekb },
      summe > max && { label: `Deckelung auf ${pct(max)} %`, betrag: foerderfaehig * (max - summe) },
    ].filter(Boolean);
    const betrag = foerderfaehig * quoteFF;
    return { foerderfaehig, betrag, quote: betrag / invest, quoteFoerderfaehig: quoteFF, klimaBonus: kgb, bestandteile, programm: "heizung", hinweis: null };
  }

  // BEG EM (BAFA): Gebäudehülle (5.1), Heizungsoptimierung (5.4 a)
  const r = FOERDERREGELN.em;
  const ohneIsfp = staffel(n, r.hoechst);
  const foerderfaehig = Math.min(invest, kontext.isfp ? staffel(n, r.hoechstMitIsfp) : ohneIsfp);
  const isfpBasis = kontext.isfp ? Math.max(0, foerderfaehig - ohneIsfp) : 0;
  const wpb = m.daemmung && kontext.isfp && p.ab2027 && istWorstPerformingBuilding(kontext.istEndenergie) ? r.wpbBonus : 0;
  const bestandteile = [
    { label: `Grundförderung ${Math.round(grund * 100)} %`, betrag: foerderfaehig * grund },
    isfpBasis > 0 && { label: `iSFP-Bonus ${Math.round(r.isfpBonus * 100)} % auf ${Math.round(isfpBasis).toLocaleString("de-DE")} € über ${ohneIsfp.toLocaleString("de-DE")} €`, betrag: isfpBasis * r.isfpBonus },
    wpb > 0 && { label: `WPB-Bonus ${Math.round(wpb * 100)} % (Worst Performing Building)`, betrag: foerderfaehig * wpb },
  ].filter(Boolean);
  const betrag = foerderfaehig * (grund + wpb) + isfpBasis * r.isfpBonus;
  return { foerderfaehig, betrag, quote: betrag / invest, quoteFoerderfaehig: betrag / foerderfaehig, klimaBonus: 0, bestandteile, programm: m.foerderprogramm || "em_huelle", hinweis: null };
}

// Summen für eine Liste (aktiver) Maßnahmen — z. B. ein Paket.
export function summiereMassnahmen(massnahmen, gebaeude = {}) {
  return massnahmen.reduce((acc, m) => {
    const f = berechneFoerderung(m, gebaeude);
    acc.invest += m.investition ?? 0;
    acc.instand += m.ohnehin_anteil ?? 0;
    acc.foerderfaehig += f.foerderfaehig;
    acc.foerderung += f.betrag;
    acc.eigenanteil = acc.invest - acc.foerderung;
    return acc;
  }, { invest: 0, instand: 0, foerderfaehig: 0, foerderung: 0, eigenanteil: 0 });
}

// ─── Mengenmodell ─────────────────────────────────────────────────────────
// Leitet Bauteilmengen aus Wohnfläche, Nutzfläche, Geschossen, Gebäudetyp und Dachform ab.
// Kalibriert auf REFERENZ_GEBAEUDE: dort ergeben sich exakt die Mengen aus kosten.js.
// Geometrische Näherung (quadratischer Grundriss), keine Planung:
//  - Grundfläche = Nutzfläche AN ÷ Vollgeschosse
//  - Dach: geneigt ∝ Grundfläche; Flachdach = Grundfläche
//  - Fassade ∝ Umfang (√Grundfläche) × Geschosse × Anteil freier Außenwand
//    (EFH/ZFH 100 %, DHH 75 % = eine Seite angebaut, Reihenhaus 50 % = zwei Seiten angebaut)
//  - Fenster und beheizte Fläche ∝ Wohnfläche
export const AUSSENWAND_ANTEIL = { Einfamilienhaus: 1, Zweifamilienhaus: 1, "Doppelhaushälfte": 0.75, Reihenhaus: 0.5 };
const AN_PRO_WOHNFLAECHE = REFERENZ_GEBAEUDE.gebaeudenutzflaeche / REFERENZ_GEBAEUDE.wohnflaeche;

const grunddaten = (g) => {
  const wohnflaeche = Number(g.wohnflaeche) > 0 ? Number(g.wohnflaeche) : REFERENZ_GEBAEUDE.wohnflaeche;
  const an = Number(g.gebaeudenutzflaeche) > 0 ? Number(g.gebaeudenutzflaeche) : wohnflaeche * AN_PRO_WOHNFLAECHE;
  const geschosse = Math.max(1, Number(g.vollgeschosse) || REFERENZ_GEBAEUDE.vollgeschosse);
  return { wohnflaeche, grundflaeche: an / geschosse, geschosse, flachdach: /Flachdach/i.test(g.dach || ""), anteil: AUSSENWAND_ANTEIL[g.typ] ?? 1 };
};

export function berechneMengen(gebaeude = {}) {
  const ref = grunddaten(REFERENZ_GEBAEUDE);
  const g = grunddaten(gebaeude);
  const refMenge = (id) => KOSTENANSAETZE[id].menge.wert;
  const dachProGrundflaeche = refMenge("M2") / ref.grundflaeche; // geneigtes Referenzdach inkl. Überstand
  return {
    grundflaeche: g.grundflaeche,
    dachflaeche: g.grundflaeche * (g.flachdach ? 1 : dachProGrundflaeche),
    fassadenflaeche: refMenge("M5") * Math.sqrt(g.grundflaeche / ref.grundflaeche) * (g.geschosse / ref.geschosse) * (g.anteil / ref.anteil),
    fensterflaeche: refMenge("M3") * g.wohnflaeche / ref.wohnflaeche,
    beheizteFlaeche: refMenge("M7") * g.wohnflaeche / ref.wohnflaeche,
    badflaeche: Number(gebaeude.bad_flaeche) > 0 ? Number(gebaeude.bad_flaeche) : BAD_DEFAULT.flaeche,
  };
}

const rund100 = (x) => Math.round(x / 100) * 100;

// Skaliert Investition und Sowieso-Anteil flächenbezogener Ansätze auf die Mengen des Gebäudes.
export function wendeMengenAn(m, mengen) {
  const ansatz = KOSTENANSAETZE[m.kostenansatz];
  if (!ansatz?.mengenbezug || !mengen) return m;
  const menge = mengen[ansatz.mengenbezug];
  const faktor = menge / ansatz.menge.wert;
  if (!Number.isFinite(faktor) || faktor <= 0) return m;
  return {
    ...m,
    investition: rund100(m.investition * faktor),
    ohnehin_anteil: rund100((m.ohnehin_anteil ?? 0) * faktor),
    menge: { wert: Math.round(menge), einheit: ansatz.menge.einheit, faktor },
    spanne: ansatz.spanne ? { min: rund100(ansatz.spanne.min * faktor), max: rund100(ansatz.spanne.max * faktor) } : undefined,
  };
}

// ─── Maßnahmen-Kategorien ─────────────────────────────────────────────────
// "energetisch": wirkt auf Endenergie/PE/CO₂, wird bewertet und kann gefördert werden.
// "modernisierung": reine Kostenposition ohne Energiewirkung (z. B. Badsanierung).
//   Fließt nicht in Energiebilanz, €/kWh-Ranking, Amortisation oder BEG-Eigenanteil ein,
//   sondern wird separat summiert (modernisierung_*).
export const KATEGORIEN = {
  energetisch: "Energetische Sanierung",
  modernisierung: "Weitere Modernisierung",
};
export const istEnergetisch = (m) => (m.kategorie ?? "energetisch") === "energetisch";
// Ids der nicht-energetischen Maßnahmen (opt-in, bleiben bei Neuableitung der Auswahl erhalten)
export const nichtEnergetischeIds = (pakete) => pakete.flatMap(p => p.massnahmen).filter(m => !istEnergetisch(m)).map(m => m.id);

// ─── Berechnung ───────────────────────────────────────────────────────────

// Energieeffizienzklasse wie im Energieausweis für Wohngebäude: aus der ENDenergie
// in kWh/(m²·a) bezogen auf die Gebäudenutzfläche AN (GModG § 86 mit Anlage 10, A+ bis H).
// Hinweis: Der BAFA-iSFP nutzt eine eigene 7-stufige Farbskala auf Primärenergie-Basis;
// die Primärenergie wird hier separat ausgewiesen und für das €/kWh-Ranking genutzt.
export function berechneEffizienzklasse(endenergie) {
  if (endenergie <= 30)  return "A+";
  if (endenergie <= 50)  return "A";
  if (endenergie <= 75)  return "B";
  if (endenergie <= 100) return "C";
  if (endenergie <= 130) return "D";
  if (endenergie <= 160) return "E";
  if (endenergie <= 200) return "F";
  if (endenergie <= 250) return "G";
  return "H";
}

// Bezugsfläche der Energiekennwerte (kWh/m²·a): Gebäudenutzfläche AN wie im Energieausweis.
// Fehlt AN, wird sie aus der Wohnfläche geschätzt (Verhältnis des Referenzgebäudes, 180/145).
export function bezugsflaeche(gebaeude = {}) {
  const an = Number(gebaeude.gebaeudenutzflaeche);
  if (an > 0) return an;
  const wf = Number(gebaeude.wohnflaeche) > 0 ? Number(gebaeude.wohnflaeche) : REFERENZ_GEBAEUDE.wohnflaeche;
  return wf * REFERENZ_GEBAEUDE.gebaeudenutzflaeche / REFERENZ_GEBAEUDE.wohnflaeche;
}

export function faktorKeyFuerHeizung(typ) {
  if (!typ) return "fernwaerme_gas_kwk";
  const t = typ.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("fernwarme") && t.includes("erneuerbar")) return "fernwaerme_erneuerbar";
  if (t.includes("fernwarme")) return "fernwaerme_gas_kwk";
  if (t.includes("warmepumpe")) return "strom_wp";
  if (t.includes("elektro")) return "strom_netz";
  if (t.includes("heizol") || /\bol\b/.test(t)) return "heizoel";
  if (t.includes("gas")) return "erdgas";
  if (t.includes("biomasse") || t.includes("pellets")) return "biomasse";
  return "fernwaerme_gas_kwk";
}

export function preisFuerHeizung(typ) {
  return TRAEGER_INFO[faktorKeyFuerHeizung(typ)].preis;
}

export function traegerFuerHeizung(typ) {
  return TRAEGER_INFO[faktorKeyFuerHeizung(typ)].label;
}

export function faktorenFuerHeizung(typ) {
  return ENERGIE_TRAEGER_FAKTOREN[faktorKeyFuerHeizung(typ)] || ENERGIE_TRAEGER_FAKTOREN.fernwaerme_gas_kwk;
}

export function berechnePrimaerenergieAusEndenergie(endenergie, heizungTyp) {
  return Math.max(20, endenergie * faktorenFuerHeizung(heizungTyp).primaerenergie);
}

export function berechneCo2AusEndenergie(endenergie, heizungTyp) {
  return Math.max(2, endenergie * faktorenFuerHeizung(heizungTyp).co2KgProKwh);
}

// flaeche = Bezugsfläche der Kennwerte (AN, siehe bezugsflaeche)
export function berechneHeizkosten(endenergie, flaeche, heizungTyp) {
  return Math.round(endenergie * flaeche * preisFuerHeizung(heizungTyp));
}

// aktiveMassnahmen = array of measure IDs e.g. ["M1","M2","M4"]
// gebaeude.bauteile_state = { waende, dach, fenster, keller, heizung, warmwasser } (stufe 1–7)
export function berechneNachMassnahmen(aktiveMassnahmen, ist, gebaeude, pakete = MASSNAHMENPAKETE) {
  let endenergie = ist.endenergie;
  let primaerenergieCredit = 0;
  let co2Credit = 0;
  let invest_gesamt = 0;
  let instand_gesamt = 0;
  let foerderung_gesamt = 0;
  let modernisierung_invest = 0;
  let modernisierung_foerderung = 0;
  let anzahlEnergetisch = 0;
  const bs = gebaeude.bauteile_state || null;

  pakete.forEach(paket => {
    paket.massnahmen.forEach(m => {
      if (!aktiveMassnahmen.includes(m.id)) return;
      const foerderung = berechneFoerderung(m, gebaeude).betrag;
      if (!istEnergetisch(m)) {
        modernisierung_invest += m.investition ?? 0;
        modernisierung_foerderung += foerderung;
        return;
      }
      anzahlEnergetisch += 1;
      const imp = m.impact ? m.impact(bs) : { endenergie_delta: m.endenergie_delta, primaerenergie_delta: m.primaerenergie_delta, co2_reduktion: m.co2_reduktion };
      endenergie     += imp.endenergie_delta || 0;
      if ((imp.endenergie_delta || 0) === 0) {
        primaerenergieCredit += Math.max(0, -(imp.primaerenergie_delta || 0));
        co2Credit += Math.max(0, imp.co2_reduktion || 0);
      }
      invest_gesamt  += m.investition ?? 0;
      instand_gesamt += m.ohnehin_anteil ?? 0;
      foerderung_gesamt += foerderung;
    });
  });

  endenergie = Math.max(endenergie, 25);

  const hatWP = aktiveMassnahmen.includes("M4");
  const heizungTyp = hatWP ? "Wärmepumpe Luft/Wasser" : gebaeude.heizung_typ;
  const primaerenergie = anzahlEnergetisch === 0
    ? ist.primaerenergie
    : Math.max(20, berechnePrimaerenergieAusEndenergie(endenergie, heizungTyp) - primaerenergieCredit);
  const co2 = anzahlEnergetisch === 0
    ? ist.co2
    : Math.max(2, berechneCo2AusEndenergie(endenergie, heizungTyp) - co2Credit);
  const heizkosten_gesamt = berechneHeizkosten(endenergie, bezugsflaeche(gebaeude), heizungTyp);

  return {
    endenergie: Math.round(endenergie),
    primaerenergie: Math.round(primaerenergie),
    co2: Math.round(co2 * 10) / 10,
    effizienzklasse: berechneEffizienzklasse(anzahlEnergetisch === 0 ? ist.endenergie : endenergie),
    // Energetische Sanierung (Basis für Amortisation und BEG-Eigenanteil)
    invest_gesamt: Math.round(invest_gesamt),
    instand_gesamt: Math.round(instand_gesamt),
    foerderung_gesamt: Math.round(foerderung_gesamt),
    eigenanteil: Math.round(invest_gesamt - foerderung_gesamt),
    // Weitere Modernisierung ohne Energiewirkung (z. B. Bad), separat ausgewiesen
    modernisierung_invest: Math.round(modernisierung_invest),
    modernisierung_foerderung: Math.round(modernisierung_foerderung),
    modernisierung_eigenanteil: Math.round(modernisierung_invest - modernisierung_foerderung),
    heizkosten_gesamt,
    heizkosten_tarif:   preisFuerHeizung(heizungTyp),
    heizkosten_traeger: traegerFuerHeizung(heizungTyp),
  };
}

// Kumulierte Berechnung — zeigt Schritt-für-Schritt-Wirkung (BAFA-Muster).
// Pakete ohne aktive energetische Maßnahme erzeugen keinen Energieschritt.
export function berechneKumuliert(aktiveMassnahmen, ist, gebaeude, pakete = MASSNAHMENPAKETE) {
  const ergebnisse = [];
  let laufendeMassnahmen = [];
  for (const paket of pakete) {
    const aktivInPaket = paket.massnahmen.filter(m => aktiveMassnahmen.includes(m.id) && istEnergetisch(m));
    if (aktivInPaket.length === 0) continue;
    laufendeMassnahmen = [...laufendeMassnahmen, ...aktivInPaket.map(m => m.id)];
    const k = berechneNachMassnahmen(laufendeMassnahmen, ist, gebaeude, pakete);
    ergebnisse.push({ paket, nachher: k });
  }
  return ergebnisse;
}

// ─── Maßnahmen-Bewertung (€/kWh Primärenergie) ────────────────────────────
// Schwellen in € je jährlich eingesparter kWh PE. Ursprünglich 10,5 / 20 bei Bezug auf die
// Wohnfläche; seit Bezug auf AN mit 145/180 umgerechnet, damit die Empfehlungen gleich bleiben.
export const SCORE_EMPFOHLEN_MAX       = 10.5 * 145 / 180; // ≈ 8,46
export const SCORE_NICHT_EMPFOHLEN_MIN = 20.0 * 145 / 180; // ≈ 16,1
// Returns measures sorted best-first (lowest cost per kWh saved).
// Nicht-energetische Maßnahmen erhalten score = Infinity und nie ein Badge.
export function bewerteMassnahmen(massnahmen, bauteile_state, gebaeude) {
  const wf = bezugsflaeche(gebaeude || {});
  const bs = bauteile_state || {};
  const scored = massnahmen.map(m => {
    const invest_netto = (m.investition ?? 0) - (m.ohnehin_anteil ?? 0);
    if (!istEnergetisch(m)) return { id: m.id, score: Infinity, pe_saved: 0, invest_netto };
    const impact = m.impact ? m.impact(bs) : { endenergie_delta: m.endenergie_delta || 0, primaerenergie_delta: m.primaerenergie_delta || 0 };
    const heizungTyp = m.id === "M4" ? "Wärmepumpe Luft/Wasser" : (gebaeude && gebaeude.heizung_typ);
    const factorPe = faktorenFuerHeizung(heizungTyp).primaerenergie;
    const peDelta = impact.endenergie_delta
      ? impact.endenergie_delta * factorPe
      : impact.primaerenergie_delta || 0; // PV has no heat end-energy delta; keep its electricity credit estimate.
    const pe_saved = Math.abs(peDelta) * wf;
    const score = pe_saved > 0 ? invest_netto / pe_saved : Infinity;
    return { id: m.id, score, pe_saved, invest_netto };
  });
  const sorted = [...scored].sort((a, b) => a.score - b.score);
  // Absolute thresholds: bad buildings naturally score lower → more measures get empfohlen.
  // Good buildings cluster above EMPFOHLEN_MAX → fewer measures recommended.
  const EMPFOHLEN_MAX       = SCORE_EMPFOHLEN_MAX;
  const NICHT_EMPFOHLEN_MIN = SCORE_NICHT_EMPFOHLEN_MIN;
  // "synergie" (M6 PV) intentionally NOT exempt — it should compete on score like any energetisch measure
  const BADGE_EXEMPT = ["enabler", "pflichtschritt", "begleitkosten", "systempfad"];
  return sorted.map(m => {
    const orig = massnahmen.find(x => x.id === m.id);
    if (orig && (BADGE_EXEMPT.includes(orig.rolle) || !istEnergetisch(orig))) return { ...m, empfohlen: false, nichtEmpfohlen: false };
    return {
      ...m,
      empfohlen:      Number.isFinite(m.score) && m.score < EMPFOHLEN_MAX,
      nichtEmpfohlen: !Number.isFinite(m.score) || m.score > NICHT_EMPFOHLEN_MIN,
    };
  });
}

// Returns true if the measure is already present in the building (skip recommending/activating it).
// M4 (Wärmepumpe): building already has a heat pump as heating system or as listed renewable.
// M6 (PV + Speicher): building already has photovoltaic as listed renewable.
export function massnahmeIstSchonVorhanden(massnahmeId, gebaeude) {
  const erneuerbare = (gebaeude.erneuerbare || "").toLowerCase();
  const heizungTyp  = (gebaeude.heizung_typ  || "").toLowerCase();
  if (massnahmeId === "M4") {
    return /wärmepumpe/i.test(heizungTyp) || /wärmepumpe/i.test(erneuerbare);
  }
  if (massnahmeId === "M6") {
    return /photovoltaik/i.test(erneuerbare);
  }
  return false;
}

// Default-Auswahl der Maßnahmen für einen Gebäudezustand.
// Einzige Quelle für Startzustand, Preset-Wechsel, Feldänderung und PDF-Import.
// Nicht-energetische Maßnahmen sind opt-in und nie vorausgewählt.
export function getDefaultAktiveMassnahmen(gebaeude, bauteile_state, pakete = MASSNAHMENPAKETE) {
  const bs  = bauteile_state || {};
  const vt  = vorlauftemperaturFuer(gebaeude.waermeverteilung);
  // WP vorschlagen bei fossiler Heizung und bei Elektro-Direktheizung (Nachtspeicher)
  const wpSinnvoll = /Heizöl|Erdgas|Fernwärme \(Gas|Elektroheizung/i.test(gebaeude.heizung_typ || "");
  return pakete.flatMap(pkg =>
    pkg.massnahmen.filter(m => {
      if (!istEnergetisch(m)) return false;
      if (massnahmeIstSchonVorhanden(m.id, gebaeude)) return false;
      if (m.id === "M7") return vt > 50;
      if (m.id === "M4") return wpSinnvoll;
      const imp = m.impact ? m.impact(bs) : { primaerenergie_delta: m.primaerenergie_delta || 0 };
      return Math.abs(imp.primaerenergie_delta || 0) >= 3;
    }).map(m => m.id)
  );
}

export function vorlauftemperaturFuer(typ) {
  if (!typ || typ.includes(">60")) return 65;
  if (typ.includes("45–55"))       return 50;
  if (typ.includes("gemischt"))    return 45;
  if (typ.includes("Fußboden"))    return 35;
  return 65;
}

export function wpTypEmpfehlung(vorlaufTemp, envAvg) {
  if (vorlaufTemp <= 40 && envAvg >= 4)
    return { typ: "Monovalent", note: "Ideal: Flächenheizung + gute Hülle → COP ~4–5, keine Backup-Heizung nötig." };
  if (vorlaufTemp <= 50 && envAvg >= 3)
    return { typ: "Monovalent / Monoenergetic", note: "Gut geeignet: Niedertemperatur-Heizkörper oder gemischtes System. Elektrischer Notbetrieb als Reserve." };
  if (vorlaufTemp <= 55)
    return { typ: "Monoenergetic", note: "Akzeptabel: WP deckt ~95 % der Heizlast, elektrischer Heizstab für Spitzenlasten." };
  return { typ: "Bivalent / Hybrid", note: "Hohe Vorlauftemperatur reduziert WP-Effizienz (COP ~2). Hüllsanierung oder Heizkreisumbau vor WP-Einbau empfohlen." };
}

// ─── Gebäudezustand → abgeleitete Zustände ────────────────────────────────

export const bauteileAlsState = (bauteile) =>
  Object.fromEntries(bauteile.map(b => [b.id, b.note]));

// Effektive Vorlauftemperatur: Flächenheizung (Stufe ≥ 6, z. B. nach M7) → 35 °C,
// sonst aus dem Wärmeverteilungs-Dropdown. Gleiche Regel wie in der M4-Impact-Funktion.
export function effektiveVorlauftemperatur(gebaeude, bauteile_state) {
  return ((bauteile_state || {}).verteilung || 2) >= 6 ? 35 : vorlauftemperaturFuer(gebaeude.waermeverteilung);
}

// Einzige Stelle, die die WP-Variante bestimmt (Rechnung, Variantenauswahl, Warum-Texte).
// bauteile_state = effektiver Zustand (inkl. M7 → verteilung 7).
export function bestimmeWpVariante({ wahl = "auto", gebaeude, bauteile_state }) {
  const bs = bauteile_state || {};
  const vorlauftemp = effektiveVorlauftemperatur(gebaeude, bs);
  const envAvg = ((bs.waende || 2) + (bs.dach || 2)) / 2;
  let autoKey = wpTypVarianteKey(vorlauftemp, envAvg);
  // Ölgebäude: Auto wählt nie Hybrid (keine neue fossile Infrastruktur)
  if (autoKey === "hybrid" && /Heizöl/i.test(gebaeude.heizung_typ || "")) autoKey = "monoenergetisch";
  const key = wahl !== "auto" && WP_VARIANTEN[wahl] ? wahl : autoKey;
  return { key, autoKey, vorlauftemp, envAvg };
}

// Bauteilzustand, wie ihn die Impact-Funktionen sehen: M7 aktiv → Flächenheizung,
// plus gewählte WP-Variante und Vorlauftemperatur laut Dropdown.
export function erstelleEffektivenBauteilState({ bauteile_state, gebaeude, aktiveMassnahmen = [], wpWahl = "auto" }) {
  const state = aktiveMassnahmen.includes("M7") ? { ...bauteile_state, verteilung: 7 } : { ...bauteile_state };
  const wp = bestimmeWpVariante({ wahl: wpWahl, gebaeude, bauteile_state: state });
  return {
    state: { ...state, wpVariante: wp.key, vorlauftemp: vorlauftemperaturFuer(gebaeude.waermeverteilung) },
    wp,
  };
}

// ─── Pakete: Variante + Nutzer-Overrides + Reihenfolge ────────────────────

// M4 übernimmt Kosten und Förderquote der gewählten WP-Variante.
export function wendeWpVarianteAn(m, varianteKey) {
  const v = WP_VARIANTEN[varianteKey];
  if (m.id !== "M4" || !v) return m;
  return {
    ...m,
    titel: `Luft-Wasser-Wärmepumpe (12 kW) · ${v.label}`,
    investition: v.investition,
    ohnehin_anteil: v.ohnehin_anteil,
    foerderquote: v.foerderquote,
    foerderfaehigAnteil: v.foerderfaehigAnteil ?? 1,
    kostenansatz: `WP_${varianteKey}`,
  };
}

// Basiswerte vor Nutzer-Overrides (Variante + Mengenmodell angewandt) — Referenz für den Editor.
export function erstelleBasisPakete(varianteKey, gebaeude = null, pakete = MASSNAHMENPAKETE) {
  const mengen = gebaeude ? berechneMengen(gebaeude) : null;
  const badStandard = gebaeude?.bad_standard;
  return pakete.map(p => ({ ...p, massnahmen: p.massnahmen.map(m =>
    wendeMengenAn(wendeBadStandardAn(wendeWpVarianteAn(m, varianteKey), badStandard), mengen)) }));
}

// Pakete mit Variante + Nutzer-Overrides, Maßnahmen und Pakete nach €/kWh-Score sortiert.
// P1 (Sofortmaßnahmen) bleibt immer vorne. Ergebnis ist die Basis aller Kosten-Anzeigen.
export function erstelleEffektivePakete({ overrides = {}, varianteKey, bauteile_state, gebaeude, pakete = MASSNAHMENPAKETE }) {
  const merged = erstelleBasisPakete(varianteKey, gebaeude, pakete).map(p => ({
    ...p,
    massnahmen: p.massnahmen.map(m => ({ ...m, ...(overrides[m.id] || {}) })),
  }));
  const scored = bewerteMassnahmen(merged.flatMap(p => p.massnahmen), bauteile_state, gebaeude);
  const scoreMap = Object.fromEntries(scored.map(s => [s.id, s.score]));
  const sortiert = merged.map(p => {
    const massnahmen = [...p.massnahmen].sort((a, b) => (scoreMap[a.id] ?? Infinity) - (scoreMap[b.id] ?? Infinity));
    const bestScore = massnahmen.length ? Math.min(...massnahmen.map(m => scoreMap[m.id] ?? Infinity)) : Infinity;
    return { ...p, massnahmen, _bestScore: bestScore };
  });
  const [p1, ...rest] = sortiert;
  const ordered = [p1, ...rest.sort((a, b) => a._bestScore - b._bestScore)];
  return ordered.map((p, idx) => ({ ...p, nummer: idx + 1 }));
}

// M1 (Hydraulischer Abgleich) muss nach WP-Einbau neu erfolgen (BEG-Anforderung):
// bei aktiver M4 wandert M1 ans Ende von P3 → Reihenfolge M7 → M4 → M1.
export function ordneAbgleichNachWp(pakete, aktiveMassnahmen) {
  if (!aktiveMassnahmen.includes("M4")) return pakete;
  const m1 = pakete.find(p => p.id === "P1")?.massnahmen.find(m => m.id === "M1");
  if (!m1 || !pakete.some(p => p.id === "P3")) return pakete;
  return pakete
    .filter(p => p.id !== "P1")
    .map(p => p.id === "P3" ? { ...p, massnahmen: [...p.massnahmen, { ...m1, _isMovedAbgleich: true }] } : p)
    .map((p, idx) => ({ ...p, nummer: idx + 1 }));
}

// Kompletter Startzustand eines Presets (Gebäude, IST, Bauteile, Maßnahmen).
export function erstelleStartzustand(presetId) {
  const p = PRESETS[presetId];
  if (!p) return null;
  const overrides = p.bauteile_overrides || {};
  const bauteile = ableiteBauteile(p.gebaeude.baujahr, p.gebaeude.heizung_typ, p.gebaeude.lueftung, p.gebaeude.warmwasser)
    .map(b => overrides[b.id] !== undefined ? { ...b, note: overrides[b.id] } : b);
  return {
    gebaeude: p.gebaeude,
    ist: p.ist,
    bauteile,
    aktiveMassnahmen: getDefaultAktiveMassnahmen(p.gebaeude, bauteileAlsState(bauteile)),
  };
}

// Vollständige Szenario-Rechnung für ein Preset — dieselbe Kette wie in App.jsx
// (Startzustand → effektiver Bauteilzustand → Pakete mit Variante/Overrides → M1-Umzug).
// Für Tests, Beispielrechnung und spätere Szenario-Vergleiche.
export function berechneSzenario({ presetId, aktiveMassnahmen, wpWahl = "auto", overrides = {}, foerderung = DEFAULT_FOERDERKONTEXT }) {
  const raw = erstelleStartzustand(presetId);
  if (!raw) return null;
  const start = { ...raw, gebaeude: { ...raw.gebaeude, foerderung: { ...DEFAULT_FOERDERKONTEXT, ...foerderung, istEndenergie: raw.ist.endenergie } } };
  const aktive = aktiveMassnahmen ?? start.aktiveMassnahmen;
  const { state, wp } = erstelleEffektivenBauteilState({
    bauteile_state: bauteileAlsState(start.bauteile), gebaeude: start.gebaeude, aktiveMassnahmen: aktive, wpWahl,
  });
  const pakete = ordneAbgleichNachWp(
    erstelleEffektivePakete({ overrides, varianteKey: wp.key, bauteile_state: state, gebaeude: start.gebaeude }),
    aktive,
  );
  const gebaeude = { ...start.gebaeude, bauteile_state: state };
  return { start, aktive, wp, pakete, gebaeude, k: berechneNachMassnahmen(aktive, start.ist, gebaeude, pakete) };
}

// ─── Wirtschaftlichkeit ───────────────────────────────────────────────────

// Summe einer jährlich um rPct % steigenden Zahlung über n Jahre.
export function summeMitPreissteigerung(jahresbetrag, rPct, n) {
  if (!rPct) return jahresbetrag * n;
  const r = rPct / 100;
  return jahresbetrag * ((Math.pow(1 + r, n) - 1) / r);
}

// Eine Rechnung für Sidebar, Drawer, Break-even-Chart und Bericht.
//  - amortisationStatisch: Eigenanteil ÷ jährliche Nettoeinsparung (statische Preise)
//  - breakEvenJahre: Schnittpunkt der kumulierten Kostenkurven mit Preissteigerung
//  - ohneSanierung / mitSanierung: kumulierte Kosten nach `jahre`
export function berechneWirtschaftlichkeit({
  heizkostenIst, heizkostenZiel, wartungIst, wartungZiel,
  pvErtrag = 0, eigenanteil, eskalationIst = 0, eskalationZiel = 0, jahre = 20,
}) {
  const laufendIst  = heizkostenIst + wartungIst;
  const laufendZiel = heizkostenZiel + wartungZiel;
  const jaehrlicheEinsparung = laufendIst - laufendZiel + pvErtrag;
  const amortisationStatisch = jaehrlicheEinsparung > 0 && eigenanteil > 0
    ? eigenanteil / jaehrlicheEinsparung : null;
  const kumIst  = t => summeMitPreissteigerung(laufendIst, eskalationIst, t);
  const kumZiel = t => eigenanteil + summeMitPreissteigerung(laufendZiel, eskalationZiel, t) - pvErtrag * t;

  let breakEvenJahre = null;
  if (eigenanteil > 0) {
    for (let t = 1; t <= 60; t++) {
      const d0 = kumZiel(t - 1) - kumIst(t - 1);
      const d1 = kumZiel(t) - kumIst(t);
      if (d1 <= 0) { breakEvenJahre = (t - 1) + d0 / (d0 - d1); break; }
    }
  }
  return {
    laufendIst, laufendZiel, pvErtrag, jaehrlicheEinsparung,
    amortisationStatisch, breakEvenJahre, jahre,
    ohneSanierung: kumIst(jahre),
    mitSanierung: kumZiel(jahre),
    kumIst, kumZiel,
  };
}

// ─── Farbcodes ────────────────────────────────────────────────────────────
export const EFFIZIENZ_FARBEN = {
  "A+": "#1B6B3A", "A": "#1B6B3A", "B": "#1B6B3A",
  "C":  "#6B9E1F",
  "D":  "#C8820A", "E": "#C8820A",
  "F":  "#B83A2E", "G": "#B83A2E", "H": "#B83A2E",
};

export const NOTE_FARBEN = {
  1: "#E30613", 2: "#E3501C", 3: "#F07D00", 4: "#F5C800",
  5: "#ADCF3B", 6: "#34A030", 7: "#00843D",
};

export const PAKET_FARBEN = {
  rot:     { bg: "#E30613", text: "#FFFFFF", hell: "#FADBD8" },
  orange:  { bg: "#F07D00", text: "#FFFFFF", hell: "#FBE3CE" },
  gelb:    { bg: "#F6D400", text: "#1E1A15", hell: "#FBF2C2" },
  lila:    { bg: "#7C3AED", text: "#FFFFFF", hell: "#EDE9FE" },
  gruen:   { bg: "#00843D", text: "#FFFFFF", hell: "#D0E8D8" },
  blau:    { bg: "#2563EB", text: "#FFFFFF", hell: "#DBEAFE" },
  tuerkis: { bg: "#0E7C86", text: "#FFFFFF", hell: "#D5EEF0" },
};
