// ============================================================================
// iSFP-Schnellcheck — Datenmodell & Logik (v3.1)
// - iSFP-Klassifizierung auf Primärenergie-Basis
// - Realistische Förderquoten (Konjunktur-Booster entfernt)
// - BEG = Programm, BAFA/KfW = durchführende Stellen
// - 3 Presets, Auto-Derive Bauteile aus Baujahr
// - EFH-fokussiert: Einfamilienhaus, Zweifamilienhaus, Doppelhaushälfte, Reihenhaus
// ============================================================================

import { KOSTENANSAETZE } from "./kosten.js";

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
    beschreibung: "1 WE · 148 m² · Gas-Brennwert · Klasse C · Neubaustandard",
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

// GEG factor defaults used for target-state recalculation.
// Primary energy: GEG Anlage 4 (non-renewable share). CO2e: GEG Anlage 9.
// Fernwaerme is network-specific in real certificates; these are documented fallback values.
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
    beschreibung: "WP deckt ~65 % der Heizlast. Gaskessel für Spitzenlast. Übergangslösung bei hoher Vorlauftemperatur und vorhandenem Gasanschluss. BEG 30 % auf den WP-Anteil (~60 % der Kosten). Gaskessel-Anteil nicht förderfähig.",
    investition: KOSTENANSAETZE.WP_hybrid.wert, ohnehin_anteil: KOSTENANSAETZE.WP_hybrid.ohnehin, foerderquote: 0.30,
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
      { id: "M1", kurztitel: "Hydraul. Abgleich", rolle: "pflichtschritt", titel: "Hydraulischer Abgleich + Heizungsoptimierung",
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
      { id: "M2", kurztitel: "Dachdämmung", rolle: "energetisch", titel: "Dachdämmung Obergeschoss-Decke (22 cm Mineralwolle)",
        beschreibung: "Aufsparren- oder Zwischensparrendämmung, neue Dampfbremse, Luftdichtheitsschicht.",
        ...kostenAus("M2"), foerderquote: 0.15,
        co2_reduktion: 4.2, endenergie_delta: -22, primaerenergie_delta: -26,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~180 €/m² Dachfläche (~120 m² EFH-Dach) · 20 % davon sind sowieso fällige Dachneueindeckung (nicht förderfähig)",
        impact: bs => _imp([[-26,-31,5.0],[-22,-26,4.2],[-14,-17,2.7],[-7,-8,1.3],[-2,-2,0.3],[-1,-1,0.1],[0,0,0]], (bs||{}).dach) },
    ],
  },
  {
    id: "P2b", nummer: 3, titel: "Fenster", zeitraum: "2027 – 2031", farbe: "lila",
    begruendung: "Fenster lohnen sich vor allem bei Einfach- oder alter Isolierverglasung. Bei bereits modernisierten Fenstern (Stufe 5+) kaum Wirkung.",
    zu_beachten: "Fenstertausch koordiniert mit Dachabdichtung planen, um Wärmebrücken zu minimieren. Baugenehmigung bei Denkmalschutz erforderlich.",
    komfortsteigerung: "Keine Kaltluftabfälle mehr. Spürbare Reduktion von Lärmdurchdringung (Schallschutz Rw ≥ 33 dB). Kein Zugluft-Effekt durch Fensterfugen.",
    massnahmen: [
      { id: "M3", kurztitel: "Fenstertausch", rolle: "energetisch", titel: "Fenstertausch (3-fach Verglasung, Uw ≤ 0,95)",
        beschreibung: "Komplettaustausch, RC2-Beschlag, Einbruchhemmung.",
        ...kostenAus("M3"), foerderquote: 0.15,
        co2_reduktion: 3.0, endenergie_delta: -15, primaerenergie_delta: -18,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~750 €/m² Fensterfläche (~25 m² EFH) · 35 % davon sind Fenster-Lebenszyklus-Erneuerung (nicht förderfähig)",
        impact: bs => _imp([[-20,-24,4.0],[-17,-20,3.4],[-15,-18,3.0],[-8,-10,1.6],[-2,-2,0.4],[-1,-1,0.1],[0,0,0]], (bs||{}).fenster) },
    ],
  },
  {
    id: "P3", nummer: 3, titel: "Wärmeerzeugung & Verteilung", zeitraum: "2030 – 2034", farbe: "gelb",
    begruendung: "Wärmepumpe entfaltet ihr volles Potenzial nur mit niedriger Vorlauftemperatur. Heizkreis erst anpassen (falls nötig), dann WP einbauen, danach hydraulisch abgleichen.",
    zu_beachten: "Reihenfolge wichtig: 1) Wärmeverteilung umbauen oder Heizkörper auf NT-Tauglichkeit prüfen. 2) WP-Außengerät installieren — Schallschutzgutachten empfohlen. 3) Hydraulischer Abgleich mit neuen Massenströmen. GEG §71 ab 2026 zwingend bei Heizungstausch.",
    komfortsteigerung: "Konstante Vorlauftemperaturen, leiser Betrieb außen. Bei Fußbodenheizung: gleichmäßige Strahlungswärme, im Sommer als Kühlung nutzbar.",
    massnahmen: [
      { id: "M7", kurztitel: "Wärmeverteilung", rolle: "enabler", titel: "Erneuerung Wärmeverteilung (Niedertemperatur / Fußbodenheizung)",
        beschreibung: "Umbau auf Fußbodenheizung (Trocken- oder Nassestrich) oder Heizkreisoptimierung für NT-Betrieb ≤ 40 °C inkl. hydraulischem Abgleich. Voraussetzung für Monovalent-WP-Betrieb (COP ~4–5 statt ~2).",
        ...kostenAus("M7"), foerderquote: 0.15,
        co2_reduktion: 1.0,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~100 €/m² Fußbodenheizung (Trockenbau) für EFH 120 m² · inkl. hydraulischem Abgleich und Estricharbeiten",
        impact: bs => {
          const vNote = ((bs||{}).verteilung) || 2;
          return _imp([[-5,-4,1.0],[-4,-3,0.8],[-3,-3,0.6],[-2,-2,0.4],[-1,-1,0.2],[0,0,0],[0,0,0]], vNote);
        } },
      { id: "M4", kurztitel: "Wärmepumpe", rolle: "systempfad", heizungstausch: true, titel: "Luft-Wasser-Wärmepumpe (12 kW, monovalent)",
        beschreibung: "Monoblock-WP außen, neuer Pufferspeicher 300 L, Heizkörpertausch wo nötig.",
        ...kostenAus("M4"), foerderquote: 0.30,
        co2_reduktion: 22, endenergie_delta: -70, primaerenergie_delta: -55,
        foerderung_rechtsgrundlage: "BEG EM / KfW 458", foerderung_stelle: "KfW",
        kostenherleitung: "~2.700 €/kW Leistung EFH-typisch · 16 % davon sind Ersatz der alten Heizung (nicht förderfähig). Grundförderung 30 % + Klimageschwindigkeit 20 % möglich → max. 50 %",
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
      { id: "M5", kurztitel: "Fassadendämmung", rolle: "energetisch", titel: "Fassadendämmung (WDVS 18 cm Mineralwolle)",
        beschreibung: "Wärmedämmverbundsystem U<0,20, neue Fassadenfarbe, Fensterlaibungen.",
        ...kostenAus("M5"), foerderquote: 0.15,
        co2_reduktion: 6.5, endenergie_delta: -28, primaerenergie_delta: -33,
        foerderung_rechtsgrundlage: "BEG EM", foerderung_stelle: "BAFA",
        kostenherleitung: "~190 €/m² Fassade (~200 m² EFH) · 32 % davon sind sowieso fällige Putzerneuerung + Anstrich (nicht förderfähig)",
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
        kostenherleitung: "~1.500 €/kWp inkl. Speicher und Montage · keine nicht-förderfähigen Anteile (Neuinvestition)",
        impact: () => ({ endenergie_delta: 0, primaerenergie_delta: -12, co2_reduktion: 4.0 }) },
    ],
  },
];

// Nur iSFP-Bonus, kein Konjunktur-Booster mehr
// ─── Förderlogik (Demo) ───────────────────────────────────────────────────
// Eine Stelle für alle Förderberechnungen (Sidebar, Paket-Blöcke, Bericht).
// Bewusst vereinfacht und NICHT deckungsgleich mit der BEG-Richtlinie:
//  - iSFP-Bonus wird auf alle geförderten Maßnahmen angewandt (BEG: nicht auf den Wärmeerzeuger).
//  - Klimageschwindigkeitsbonus als pauschal +10 % (BEG 2024: 20 % bis Ende 2028, degressiv,
//    nur Selbstnutzer, Gaskessel erst ab 20 Jahren).
//  - Förderfähig = Investition − Sowieso-Anteil (BEG fördert die förderfähigen Gesamtkosten).
//  - Keine Höchstgrenzen förderfähiger Kosten, kein Einkommens-/Effizienzbonus.
// Änderungen hier verschieben die Golden Values in data.test.js.
export const FOERDERREGELN = {
  isfpBonus: 0.05,
  klimaBonus: 0.10,
  maxQuote: 0.50,
};
export const BEG_BONUS = { isfp_bonus: FOERDERREGELN.isfpBonus }; // Altname, für Texte

const KLIMABONUS_HEIZUNGEN = /Heizöl|Erdgas/i;

export function berechneFoerderung(m, gebaeude = {}) {
  const basisQuote = m.foerderquote ?? 0;
  const foerderfaehig = Math.max(0, (m.investition ?? 0) - (m.ohnehin_anteil ?? 0));
  if (!(basisQuote > 0)) return { foerderfaehig, quote: 0, klimaBonus: 0, betrag: 0 };
  const klimaBonus = m.heizungstausch && KLIMABONUS_HEIZUNGEN.test(gebaeude.heizung_typ || "")
    ? FOERDERREGELN.klimaBonus : 0;
  const quote = Math.min(basisQuote + FOERDERREGELN.isfpBonus + klimaBonus, FOERDERREGELN.maxQuote);
  return { foerderfaehig, quote, klimaBonus, betrag: foerderfaehig * quote };
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

// ─── Berechnung ───────────────────────────────────────────────────────────

// Effizienzklasse aus Primärenergie (Demo-Farbskala im iSFP-Stil).
// Achtung: Der Energieausweis nach GEG §86 / Anlage 10 klassifiziert nach
// ENDenergie. Schwellen hier = Anlage-10-Schwellen, angewandt auf Primärenergie.
export function berechneEffizienzklasse(primaerenergie) {
  if (primaerenergie <= 30)  return "A+";
  if (primaerenergie <= 50)  return "A";
  if (primaerenergie <= 75)  return "B";
  if (primaerenergie <= 100) return "C";
  if (primaerenergie <= 130) return "D";
  if (primaerenergie <= 160) return "E";
  if (primaerenergie <= 200) return "F";
  if (primaerenergie <= 250) return "G";
  return "H";
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

export function berechneHeizkosten(endenergie, wohnflaeche, heizungTyp) {
  return Math.round(endenergie * wohnflaeche * preisFuerHeizung(heizungTyp));
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
  const heizkosten_gesamt = berechneHeizkosten(endenergie, gebaeude.wohnflaeche, heizungTyp);

  return {
    endenergie: Math.round(endenergie),
    primaerenergie: Math.round(primaerenergie),
    co2: Math.round(co2 * 10) / 10,
    effizienzklasse: berechneEffizienzklasse(primaerenergie),
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
// Returns measures sorted best-first (lowest cost per kWh saved).
// Nicht-energetische Maßnahmen erhalten score = Infinity und nie ein Badge.
export function bewerteMassnahmen(massnahmen, bauteile_state, gebaeude) {
  const wf = (gebaeude && gebaeude.wohnflaeche) || 150;
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
  const EMPFOHLEN_MAX       = 10.5;  // €/(kWh PE saved / year)
  const NICHT_EMPFOHLEN_MIN = 20.0;
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
  const fossil = /Heizöl|Erdgas|Fernwärme \(Gas/i.test(gebaeude.heizung_typ || "");
  return pakete.flatMap(pkg =>
    pkg.massnahmen.filter(m => {
      if (!istEnergetisch(m)) return false;
      if (massnahmeIstSchonVorhanden(m.id, gebaeude)) return false;
      if (m.id === "M7") return vt > 50;
      if (m.id === "M4") return fossil;
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
    kostenansatz: `WP_${varianteKey}`,
  };
}

// Basiswerte vor Nutzer-Overrides (Variante bereits angewandt) — Referenz für den Editor.
export function erstelleBasisPakete(varianteKey, pakete = MASSNAHMENPAKETE) {
  return pakete.map(p => ({ ...p, massnahmen: p.massnahmen.map(m => wendeWpVarianteAn(m, varianteKey)) }));
}

// Pakete mit Variante + Nutzer-Overrides, Maßnahmen und Pakete nach €/kWh-Score sortiert.
// P1 (Sofortmaßnahmen) bleibt immer vorne. Ergebnis ist die Basis aller Kosten-Anzeigen.
export function erstelleEffektivePakete({ overrides = {}, varianteKey, bauteile_state, gebaeude, pakete = MASSNAHMENPAKETE }) {
  const merged = erstelleBasisPakete(varianteKey, pakete).map(p => ({
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
export function berechneSzenario({ presetId, aktiveMassnahmen, wpWahl = "auto", overrides = {} }) {
  const start = erstelleStartzustand(presetId);
  if (!start) return null;
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
};
