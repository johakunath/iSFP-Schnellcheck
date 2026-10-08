import { describe, it, expect } from "vitest";
import {
  ableiteBauteile,
  wpTypEmpfehlung,
  bewerteMassnahmen,
  berechneNachMassnahmen,
  berechneKumuliert,
  PRESETS,
  MASSNAHMENPAKETE,
  berechneEffizienzklasse,
  massnahmeIstSchonVorhanden,
  getDefaultAktiveMassnahmen,
  faktorenFuerHeizung,
  berechnePrimaerenergieAusEndenergie,
  berechneCo2AusEndenergie,
  berechneFoerderung,
  summiereMassnahmen,
  bestimmeWpVariante,
  erstelleEffektivenBauteilState,
  erstelleEffektivePakete,
  erstelleBasisPakete,
  ordneAbgleichNachWp,
  erstelleStartzustand,
  bauteileAlsState,
  berechneWirtschaftlichkeit,
  berechneHeizungWartung,
  preisFuerHeizung,
  traegerFuerHeizung,
  STROMPREIS_HAUSHALT,
  WP_VARIANTEN,
  OPTIONS_HEIZUNG,
  berechneSzenario,
  berechneMengen,
  bezugsflaeche,
  berechneHeizkosten,
  SCORE_EMPFOHLEN_MAX,
  SCORE_NICHT_EMPFOHLEN_MIN,
  wendeMengenAn,
  heizungsFoerderParameter,
  klimabonusBerechtigt,
  DEFAULT_FOERDERKONTEXT,
  istEnergetisch,
  BAD_STANDARDS,
} from "./data.js";
import { KOSTENANSAETZE, REFERENZ_GEBAEUDE, kostenAnsatzFuer, kostenStatusText } from "./kosten.js";

// ─── helpers ──────────────────────────────────────────────────────────────

function buildGebaeudeWithState(preset) {
  const { gebaeude, ist } = preset;
  const bauteile = ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser);
  const overrides = preset.bauteile_overrides || {};
  const bauteile_state = Object.fromEntries(bauteile.map(b => [b.id, overrides[b.id] ?? b.note]));
  return { gebaeude: { ...gebaeude, bauteile_state }, ist };
}

// Same derivation chain as App.jsx (see berechneSzenario in data.js).
const appPfad = (presetId, aktiveMassnahmen, opts = {}) => berechneSzenario({ presetId, aktiveMassnahmen, ...opts });

const ALL_IDS = MASSNAHMENPAKETE.flatMap(p => p.massnahmen.map(m => m.id));

// ─── ableiteBauteile ──────────────────────────────────────────────────────

describe("ableiteBauteile", () => {
  it("1965 / Heizöl → waende note 2, dach note 2, heizung note 2", () => {
    const b = ableiteBauteile(1965, "Heizöl", "Fensterlüftung", "zentral, über Heizung");
    const byId = Object.fromEntries(b.map(x => [x.id, x]));
    expect(byId.waende.note).toBe(2);
    expect(byId.dach.note).toBe(2);
    expect(byId.heizung.note).toBe(2);
  });

  it("2015 / Wärmepumpe Luft/Wasser + WRG → heizung note 7, lueftung note 6", () => {
    const b = ableiteBauteile(2015, "Wärmepumpe Luft/Wasser", "Lüftungsanlage mit WRG", "zentral, über Heizung");
    const byId = Object.fromEntries(b.map(x => [x.id, x]));
    expect(byId.heizung.note).toBe(7);
    expect(byId.lueftung.note).toBe(6);
  });

  it("returns 8 entries with required ids", () => {
    const b = ableiteBauteile(1990, "Erdgas Brennwert", "Fensterlüftung", "zentral, über Heizung");
    const ids = b.map(x => x.id);
    for (const id of ["waende", "dach", "boden", "fenster", "lueftung", "heizung", "warmwasser", "verteilung"]) {
      expect(ids).toContain(id);
    }
  });

  it("is deterministic — same args produce identical notes", () => {
    const a = ableiteBauteile(1978, "Erdgas Brennwert", "Fensterlüftung", "zentral, über Heizung");
    const b = ableiteBauteile(1978, "Erdgas Brennwert", "Fensterlüftung", "zentral, über Heizung");
    expect(a.map(x => x.note)).toEqual(b.map(x => x.note));
  });

  it("efhNachkrieg preset → IST EEK G", () => {
    const { gebaeude } = PRESETS.efhNachkrieg;
    const b = ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser);
    const byId = Object.fromEntries(b.map(x => [x.id, x]));
    expect(byId.waende.note).toBeLessThanOrEqual(3);
    expect(byId.dach.note).toBeLessThanOrEqual(3);
  });

  it("efh70er preset bauteile_overrides → fenster note 5", () => {
    const { gebaeude, bauteile_overrides } = PRESETS.efh70er;
    const b = ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser);
    const overrides = bauteile_overrides || {};
    const byId = Object.fromEntries(b.map(x => [x.id, { ...x, note: overrides[x.id] ?? x.note }]));
    expect(byId.fenster.note).toBe(5);
  });

  it("efh2000er preset → envelope notes higher than efhNachkrieg", () => {
    const b65 = ableiteBauteile(1965, "Heizöl", "Fensterlüftung", "zentral, über Heizung");
    const b00 = ableiteBauteile(2002, "Erdgas Brennwert", "Fensterlüftung", "zentral, über Heizung");
    const by65 = Object.fromEntries(b65.map(x => [x.id, x]));
    const by00 = Object.fromEntries(b00.map(x => [x.id, x]));
    expect(by00.waende.note).toBeGreaterThan(by65.waende.note);
    expect(by00.dach.note).toBeGreaterThan(by65.dach.note);
  });
});

// ─── wpTypEmpfehlung ──────────────────────────────────────────────────────

describe("wpTypEmpfehlung", () => {
  it("≤40 °C + envAvg ≥ 4 → Monovalent", () => {
    expect(wpTypEmpfehlung(35, 5).typ).toBe("Monovalent");
  });

  it("≤50 °C + envAvg ≥ 3 → Monovalent / Monoenergetic", () => {
    expect(wpTypEmpfehlung(50, 3).typ).toBe("Monovalent / Monoenergetic");
  });

  it("≤55 °C → Monoenergetic", () => {
    expect(wpTypEmpfehlung(55, 2).typ).toBe("Monoenergetic");
  });

  it(">55 °C → Bivalent / Hybrid", () => {
    expect(wpTypEmpfehlung(65, 2).typ).toBe("Bivalent / Hybrid");
  });
});

// ─── bewerteMassnahmen ────────────────────────────────────────────────────

describe("bewerteMassnahmen", () => {
  const allMassnahmen = MASSNAHMENPAKETE.flatMap(p => p.massnahmen);

  it("empfohlen measures have score below SCORE_EMPFOHLEN_MAX", () => {
    const result = bewerteMassnahmen(allMassnahmen, {}, { wohnflaeche: 145 });
    result.filter(m => m.empfohlen).forEach(m => {
      expect(m.score).toBeLessThan(SCORE_EMPFOHLEN_MAX);
    });
  });

  it("nichtEmpfohlen measures have score above SCORE_NICHT_EMPFOHLEN_MIN or Infinity", () => {
    const result = bewerteMassnahmen(allMassnahmen, {}, { wohnflaeche: 145 });
    result.filter(m => m.nichtEmpfohlen).forEach(m => {
      expect(!Number.isFinite(m.score) || m.score > SCORE_NICHT_EMPFOHLEN_MIN).toBe(true);
    });
  });

  it("no measure is both empfohlen and nichtEmpfohlen", () => {
    const result = bewerteMassnahmen(allMassnahmen, {}, { wohnflaeche: 145 });
    result.forEach(m => {
      expect(m.empfohlen && m.nichtEmpfohlen).toBe(false);
    });
  });

  it("single BADGE_EXEMPT measure → neither empfohlen nor nichtEmpfohlen", () => {
    const single = [allMassnahmen[0]]; // M1 is pflichtschritt (BADGE_EXEMPT)
    const result = bewerteMassnahmen(single, {}, { wohnflaeche: 145 });
    expect(result[0].empfohlen).toBe(false);
    expect(result[0].nichtEmpfohlen).toBe(false);
  });

  it("efhNachkrieg: M2 + M3 + M5 are empfohlen (bad building → major renovation)", () => {
    const { gebaeude } = buildGebaeudeWithState(PRESETS.efhNachkrieg);
    const result = bewerteMassnahmen(allMassnahmen, gebaeude.bauteile_state, gebaeude);
    const byId = Object.fromEntries(result.map(m => [m.id, m]));
    expect(byId.M2.empfohlen).toBe(true);
    expect(byId.M3.empfohlen).toBe(true);
    expect(byId.M5.empfohlen).toBe(true);
  });

  it("efh70er (fenster=5): M3 is nichtEmpfohlen, M2 + M5 are empfohlen", () => {
    const { gebaeude } = buildGebaeudeWithState(PRESETS.efh70er);
    const result = bewerteMassnahmen(allMassnahmen, gebaeude.bauteile_state, gebaeude);
    const byId = Object.fromEntries(result.map(m => [m.id, m]));
    expect(byId.M3.nichtEmpfohlen).toBe(true);
    expect(byId.M2.empfohlen).toBe(true);
    expect(byId.M5.empfohlen).toBe(true);
  });

  it("efh2000er: M3 is nichtEmpfohlen, M6 is empfohlen (good building → minimal intervention)", () => {
    const { gebaeude } = buildGebaeudeWithState(PRESETS.efh2000er);
    const result = bewerteMassnahmen(allMassnahmen, gebaeude.bauteile_state, gebaeude);
    const byId = Object.fromEntries(result.map(m => [m.id, m]));
    expect(byId.M3.nichtEmpfohlen).toBe(true);
    expect(byId.M6.empfohlen).toBe(true);
  });
});

// ─── berechneNachMassnahmen ───────────────────────────────────────────────

describe("berechneNachMassnahmen (efhNachkrieg, all measures, app path)", () => {
  const { k, wp } = appPfad("efhNachkrieg", ALL_IDS);

  it("auto WP variant resolves to monoenergetisch (oil building never auto-hybrid)", () => {
    expect(wp.key).toBe("monoenergetisch");
  });

  it("PE = 62 kWh/(m²·a)", () => {
    expect(k.primaerenergie).toBe(62);
  });

  it("CO₂ = 19 kg/(m²·a)", () => {
    expect(Math.round(k.co2)).toBe(19);
  });

  it("EEK is A (from Endenergie, as in the Energieausweis)", () => {
    expect(k.effizienzklasse).toBe("A");
  });

  it("Investition 139.800 € · Förderung 27.200 € · Eigenanteil 112.600 € (BEG 2026, M4 monoenergetisch)", () => {
    expect(k.invest_gesamt).toBe(139800);
    expect(k.foerderung_gesamt).toBe(27200);
    expect(k.eigenanteil).toBe(112600);
  });

  it("eigenanteil = invest_gesamt - foerderung_gesamt", () => {
    expect(k.eigenanteil).toBe(k.invest_gesamt - k.foerderung_gesamt);
  });
});

describe("berechneNachMassnahmen (efh70er, all measures, fenster=5 override, app path)", () => {
  const { k } = appPfad("efh70er", ALL_IDS);

  it("PE = 51 kWh/(m²·a) — M3 saves little because fenster already at note 5", () => {
    expect(k.primaerenergie).toBe(51);
  });

  it("EEK is A (from Endenergie, as in the Energieausweis)", () => {
    expect(k.effizienzklasse).toBe("A");
  });

  it("Eigenanteil = 123.520 € (larger house; gas boiler from 2015 → no Klimageschwindigkeitsbonus)", () => {
    expect(k.invest_gesamt).toBe(147500);
    expect(k.eigenanteil).toBe(123520);
  });
});

describe("app path is consistent across entry points", () => {
  it("raw MASSNAHMENPAKETE M4 equals the monovalent variant (base cost)", () => {
    const m4 = MASSNAHMENPAKETE.flatMap(p => p.massnahmen).find(m => m.id === "M4");
    expect(m4.investition).toBe(WP_VARIANTEN.monovalent.investition);
    expect(m4.ohnehin_anteil).toBe(WP_VARIANTEN.monovalent.ohnehin_anteil);
  });

  it("variant costs apply to M4, user overrides win over variant costs", () => {
    const base = erstelleBasisPakete("hybrid").flatMap(p => p.massnahmen).find(m => m.id === "M4");
    expect(base.investition).toBe(WP_VARIANTEN.hybrid.investition);
    const { pakete } = appPfad("efhNachkrieg", ALL_IDS, { overrides: { M4: { investition: 20000 } } });
    const m4 = pakete.flatMap(p => p.massnahmen).find(m => m.id === "M4");
    expect(m4.investition).toBe(20000);
    expect(m4.ohnehin_anteil).toBe(WP_VARIANTEN.monoenergetisch.ohnehin_anteil);
  });

  it("explicit variant choice changes M4 cost", () => {
    const { k } = appPfad("efhNachkrieg", ALL_IDS, { wpWahl: "monovalent" });
    expect(k.invest_gesamt).toBe(142800);
  });

  it("preset start state uses the same default selection as getDefaultAktiveMassnahmen", () => {
    for (const id of Object.keys(PRESETS)) {
      const start = erstelleStartzustand(id);
      expect(start.aktiveMassnahmen).toEqual(getDefaultAktiveMassnahmen(start.gebaeude, bauteileAlsState(start.bauteile)));
    }
    expect(erstelleStartzustand("efhNachkrieg").aktiveMassnahmen.sort()).toEqual(["M1", "M2", "M3", "M4", "M5", "M6", "M7"]);
  });

  it("M1 moves behind the WP into P3 when M4 is active", () => {
    const { pakete } = appPfad("efhNachkrieg", ALL_IDS);
    expect(pakete.find(p => p.id === "P1")).toBeUndefined();
    const p3 = pakete.find(p => p.id === "P3");
    expect(p3.massnahmen.at(-1).id).toBe("M1");
    expect(pakete.map(p => p.nummer)).toEqual(pakete.map((_, i) => i + 1));
  });
});

describe("bestimmeWpVariante", () => {
  const geb = { heizung_typ: "Erdgas Brennwert", waermeverteilung: "Heizkörper (Hochtemperatur, >60 °C)" };

  it("high flow temperature + gas → hybrid", () => {
    expect(bestimmeWpVariante({ gebaeude: geb, bauteile_state: { waende: 4, dach: 4, verteilung: 2 } }).key).toBe("hybrid");
  });

  it("floor heating (verteilung ≥ 6, e.g. after M7) uses 35 °C → monovalent with decent envelope", () => {
    const r = bestimmeWpVariante({ gebaeude: geb, bauteile_state: { waende: 4, dach: 4, verteilung: 7 } });
    expect(r.vorlauftemp).toBe(35);
    expect(r.key).toBe("monovalent");
  });

  it("oil building never auto-selects hybrid", () => {
    const r = bestimmeWpVariante({ gebaeude: { ...geb, heizung_typ: "Heizöl" }, bauteile_state: { waende: 2, dach: 2, verteilung: 2 } });
    expect(r.key).toBe("monoenergetisch");
  });

  it("explicit choice overrides auto, invalid choice falls back to auto", () => {
    expect(bestimmeWpVariante({ wahl: "hybrid", gebaeude: geb, bauteile_state: {} }).key).toBe("hybrid");
    expect(bestimmeWpVariante({ wahl: "quatsch", gebaeude: geb, bauteile_state: { verteilung: 2 } }).key).toBe("hybrid");
  });

  it("M7 active → effective state has verteilung 7 and resolves with 35 °C", () => {
    const { state, wp } = erstelleEffektivenBauteilState({
      bauteile_state: { waende: 4, dach: 4, verteilung: 2 }, gebaeude: geb, aktiveMassnahmen: ["M7", "M4"],
    });
    expect(state.verteilung).toBe(7);
    expect(wp.key).toBe("monovalent");
    expect(state.wpVariante).toBe("monovalent");
  });
});

describe("berechneFoerderung (BEG ab 21.07.2026)", () => {
  const huelle = (over) => ({ id: "MX", foerderprogramm: "em_huelle", investition: 20000, ohnehin_anteil: 5000, foerderquote: 0.15, ...over });
  const wp = (over) => ({ id: "M4", foerderprogramm: "heizung", heizungstausch: true, investition: 29000, ohnehin_anteil: 5000, foerderquote: 0.30, ...over });
  const geb = (foerderung = {}, over = {}) => ({ heizung_typ: "Heizöl", heizung_bj: 2008, foerderung, ...over });

  it("envelope: 15 % on full eligible cost, Sowieso share is not deducted", () => {
    const f = berechneFoerderung(huelle(), geb());
    expect(f.foerderfaehig).toBe(20000);
    expect(f.betrag).toBeCloseTo(3000);
  });

  it("envelope: iSFP bonus only on eligible cost above 30.000 €, cap 60.000 € with iSFP / 30.000 € without", () => {
    expect(berechneFoerderung(huelle({ investition: 38000 }), geb()).betrag).toBeCloseTo(38000 * 0.15 + 8000 * 0.05);
    expect(berechneFoerderung(huelle({ investition: 80000 }), geb()).betrag).toBeCloseTo(60000 * 0.15 + 30000 * 0.05);
    expect(berechneFoerderung(huelle({ investition: 80000 }), geb({ isfp: false })).betrag).toBeCloseTo(30000 * 0.15);
  });

  it("envelope below minimum investment (2.000 €) gets nothing; optimisation minimum is 300 €", () => {
    expect(berechneFoerderung(huelle({ investition: 1500 }), geb()).betrag).toBe(0);
    expect(berechneFoerderung(huelle({ investition: 1500, foerderprogramm: "em_optimierung" }), geb()).betrag).toBeCloseTo(225);
  });

  it("heat pump: cost cap 28.000 €, 30 % + 16 % Klimageschwindigkeitsbonus for oil, no iSFP bonus", () => {
    const f = berechneFoerderung(wp(), geb());
    expect(f.foerderfaehig).toBe(28000);
    expect(f.betrag).toBeCloseTo(28000 * 0.46);
    expect(f.bestandteile.map(b => b.label).join()).not.toMatch(/iSFP/);
  });

  it("Klimageschwindigkeitsbonus and cost cap fall every half year; bonus is 0 from Aug 2028", () => {
    expect(heizungsFoerderParameter(0)).toEqual({ klimabonus: 0.16, hoechst: 28000 });
    expect(heizungsFoerderParameter(1)).toEqual({ klimabonus: 0.12, hoechst: 27250 });
    expect(heizungsFoerderParameter(4).klimabonus).toBe(0);
    expect(heizungsFoerderParameter(8).hoechst).toBe(22000);
    expect(berechneFoerderung(wp(), geb({ antragszeitraum: 4 })).betrag).toBeCloseTo(25000 * 0.30);
  });

  it("Klimageschwindigkeitsbonus needs a self-user and, for gas, a boiler at least 20 years old", () => {
    expect(klimabonusBerechtigt({ heizung_typ: "Erdgas Brennwert", heizung_bj: 2015 }, { ...DEFAULT_FOERDERKONTEXT })).toBe(false);
    expect(klimabonusBerechtigt({ heizung_typ: "Erdgas Brennwert", heizung_bj: 2006 }, { ...DEFAULT_FOERDERKONTEXT })).toBe(true);
    expect(klimabonusBerechtigt({ heizung_typ: "Heizöl", heizung_bj: 2020 }, { ...DEFAULT_FOERDERKONTEXT, selbstnutzer: false })).toBe(false);
    expect(klimabonusBerechtigt({ heizung_typ: "Fernwärme (Gas-KWK)", heizung_bj: 1990 }, { ...DEFAULT_FOERDERKONTEXT })).toBe(false);
  });

  it("income bonus 40/30/10 %, total capped at 70 % (80 % for lowest income tier)", () => {
    expect(berechneFoerderung(wp(), geb({ einkommen: "bis50" })).quoteFoerderfaehig).toBeCloseTo(0.56);
    expect(berechneFoerderung(wp(), geb({ einkommen: "bis40" })).quoteFoerderfaehig).toBeCloseTo(0.70);
    expect(berechneFoerderung(wp(), geb({ einkommen: "bis30" })).quoteFoerderfaehig).toBeCloseTo(0.80);
    expect(berechneFoerderung(wp(), geb({ einkommen: "bis30", selbstnutzer: false })).quoteFoerderfaehig).toBeCloseTo(0.30);
  });

  it("hybrid: only the heat-pump share (60 %) is eligible", () => {
    const f = berechneFoerderung(wp({ investition: 24000, foerderfaehigAnteil: 0.6 }), geb());
    expect(f.foerderfaehig).toBeCloseTo(14400);
  });

  it("no base quote → no subsidy", () => {
    expect(berechneFoerderung(huelle({ foerderquote: 0 }), geb()).betrag).toBe(0);
    expect(berechneFoerderung(huelle({ foerderquote: undefined }), geb()).betrag).toBe(0);
  });

  it("summiereMassnahmen matches berechneNachMassnahmen totals", () => {
    const { pakete, aktive, k, gebaeude } = appPfad("efhNachkrieg", ALL_IDS);
    const aktiv = pakete.flatMap(p => p.massnahmen).filter(x => aktive.includes(x.id) && istEnergetisch(x));
    const sum = summiereMassnahmen(aktiv, gebaeude);
    expect(Math.round(sum.invest)).toBe(k.invest_gesamt);
    expect(Math.round(sum.foerderung)).toBe(k.foerderung_gesamt);
  });
});

describe("Mengenmodell (berechneMengen / wendeMengenAn)", () => {
  it("reference building reproduces the registry quantities exactly", () => {
    const m = berechneMengen(REFERENZ_GEBAEUDE);
    expect(m.dachflaeche).toBeCloseTo(KOSTENANSAETZE.M2.menge.wert);
    expect(m.fassadenflaeche).toBeCloseTo(KOSTENANSAETZE.M5.menge.wert);
    expect(m.fensterflaeche).toBeCloseTo(KOSTENANSAETZE.M3.menge.wert);
    expect(m.beheizteFlaeche).toBeCloseTo(KOSTENANSAETZE.M7.menge.wert);
  });

  it("semi-detached and terraced houses have less façade than a detached house of the same size", () => {
    const efh = berechneMengen(REFERENZ_GEBAEUDE).fassadenflaeche;
    expect(berechneMengen({ ...REFERENZ_GEBAEUDE, typ: "Doppelhaushälfte" }).fassadenflaeche).toBeCloseTo(efh * 0.75);
    expect(berechneMengen({ ...REFERENZ_GEBAEUDE, typ: "Reihenhaus" }).fassadenflaeche).toBeCloseTo(efh * 0.5);
  });

  it("larger houses get proportionally more window/heated area; flat roof = footprint", () => {
    const gross = berechneMengen({ ...REFERENZ_GEBAEUDE, wohnflaeche: 290, gebaeudenutzflaeche: 360 });
    expect(gross.fensterflaeche).toBeCloseTo(50);
    expect(gross.dachflaeche).toBeCloseTo(240);
    expect(berechneMengen({ ...REFERENZ_GEBAEUDE, dach: "Flachdach" }).dachflaeche).toBeCloseTo(90);
  });

  it("area-based measures scale cost and Sowieso share; lump-sum measures stay unchanged", () => {
    const mengen = berechneMengen({ ...REFERENZ_GEBAEUDE, typ: "Doppelhaushälfte" });
    const alle = MASSNAHMENPAKETE.flatMap(p => p.massnahmen);
    const m5 = wendeMengenAn(alle.find(m => m.id === "M5"), mengen);
    expect(m5.investition).toBe(28500);
    expect(m5.ohnehin_anteil).toBe(9000);
    const m1 = alle.find(m => m.id === "M1");
    expect(wendeMengenAn(m1, mengen)).toBe(m1);
  });

  it("missing or invalid areas fall back to the reference building", () => {
    const m = berechneMengen({ typ: "Einfamilienhaus" });
    expect(m.fassadenflaeche).toBeCloseTo(200);
  });

  it("user overrides still win over scaled costs", () => {
    const { pakete } = appPfad("dhh1990", ALL_IDS, { overrides: { M5: { investition: 10000 } } });
    expect(pakete.flatMap(p => p.massnahmen).find(m => m.id === "M5").investition).toBe(10000);
  });
});

describe("non-energy measures (kategorie: modernisierung)", () => {
  const bad = { id: "BX", kurztitel: "Bad", titel: "Badsanierung", kategorie: "modernisierung", rolle: "modernisierung",
    investition: 20000, ohnehin_anteil: 0, foerderquote: 0 };
  const paketeMitBad = [...MASSNAHMENPAKETE, { id: "PB", nummer: 9, titel: "Bad", farbe: "blau", massnahmen: [bad] }];
  const { gebaeude, ist } = buildGebaeudeWithState(PRESETS.efhNachkrieg);

  it("cost is reported separately and does not change energy, subsidy or Eigenanteil", () => {
    const ohne = berechneNachMassnahmen(["M2"], ist, gebaeude, paketeMitBad);
    const mit = berechneNachMassnahmen(["M2", "BX"], ist, gebaeude, paketeMitBad);
    expect(mit.primaerenergie).toBe(ohne.primaerenergie);
    expect(mit.eigenanteil).toBe(ohne.eigenanteil);
    expect(mit.invest_gesamt).toBe(ohne.invest_gesamt);
    expect(mit.modernisierung_invest).toBe(20000);
    expect(mit.modernisierung_eigenanteil).toBe(20000);
  });

  it("only non-energy measures active → energy values stay at IST", () => {
    const k = berechneNachMassnahmen(["BX"], ist, gebaeude, paketeMitBad);
    expect(k.primaerenergie).toBe(ist.primaerenergie);
    expect(k.co2).toBe(ist.co2);
  });

  it("no badge, no energy step, never pre-selected", () => {
    const r = bewerteMassnahmen([bad], {}, gebaeude).find(x => x.id === "BX");
    expect(r.empfohlen || r.nichtEmpfohlen).toBe(false);
    expect(berechneKumuliert(["M2", "BX"], ist, gebaeude, paketeMitBad).map(s => s.paket.id)).toEqual(["P2"]);
    expect(getDefaultAktiveMassnahmen(gebaeude, gebaeude.bauteile_state, paketeMitBad)).not.toContain("BX");
  });
});

describe("heating-type classification (price, carrier label, maintenance)", () => {
  it("every heating option maps to a price and label", () => {
    for (const typ of OPTIONS_HEIZUNG) {
      expect(preisFuerHeizung(typ)).toBeGreaterThan(0);
      expect(traegerFuerHeizung(typ)).toBeTruthy();
    }
  });

  it("Elektroheizung is priced as household electricity, not district heating", () => {
    expect(preisFuerHeizung("Elektroheizung")).toBe(STROMPREIS_HAUSHALT);
    expect(traegerFuerHeizung("Elektroheizung")).toMatch(/Strom/);
    expect(faktorenFuerHeizung("Elektroheizung").primaerenergie).toBe(1.8);
  });

  it("IST maintenance depends on the heating type (oil 260 €, gas 180 €, district heating 40 €)", () => {
    const w = (heizungTyp) => berechneHeizungWartung({ heizungTyp, hatWP: false, hatPV: false }).istJahr;
    expect(w("Heizöl")).toBe(260);
    expect(w("Erdgas Brennwert")).toBe(180);
    expect(w("Fernwärme (Gas-KWK)")).toBe(40);
    expect(w("Biomasse (Pellets)")).toBe(200);
  });
});

describe("berechneWirtschaftlichkeit", () => {
  const basis = { heizkostenIst: 3000, heizkostenZiel: 1000, wartungIst: 200, wartungZiel: 200, eigenanteil: 40000 };

  it("static amortisation = Eigenanteil ÷ annual net saving", () => {
    const w = berechneWirtschaftlichkeit(basis);
    expect(w.jaehrlicheEinsparung).toBe(2000);
    expect(w.amortisationStatisch).toBe(20);
    expect(w.breakEvenJahre).toBeCloseTo(20, 5);
    expect(w.ohneSanierung).toBe(64000);
    expect(w.mitSanierung).toBe(64000);
  });

  it("price escalation on IST costs brings break-even forward", () => {
    const w = berechneWirtschaftlichkeit({ ...basis, eskalationIst: 3, eskalationZiel: 2 });
    expect(w.breakEvenJahre).toBeLessThan(20);
    expect(w.kumZiel(w.breakEvenJahre)).toBeCloseTo(w.kumIst(w.breakEvenJahre), -2);
  });

  it("no saving → no amortisation, no break-even", () => {
    const w = berechneWirtschaftlichkeit({ ...basis, heizkostenZiel: 3500 });
    expect(w.amortisationStatisch).toBeNull();
    expect(w.breakEvenJahre).toBeNull();
  });
});

describe("cost registry (kosten.js)", () => {
  it("every measure takes investition and Sowieso share from the registry", () => {
    for (const m of MASSNAHMENPAKETE.flatMap(p => p.massnahmen)) {
      const k = KOSTENANSAETZE[m.kostenansatz];
      expect(k, m.id).toBeDefined();
      expect(m.investition).toBe(k.wert);
      expect(m.ohnehin_anteil).toBe(k.ohnehin);
    }
    for (const [key, v] of Object.entries(WP_VARIANTEN)) {
      expect(v.investition).toBe(KOSTENANSAETZE[`WP_${key}`].wert);
    }
  });

  it("every entry carries region, reference year, VAT status, unit and evidence level", () => {
    for (const [id, k] of Object.entries(KOSTENANSAETZE)) {
      expect(k.region, id).toBeTruthy();
      expect(k.bezugsjahr, id).toBeGreaterThan(2000);
      expect(["brutto", "netto"], id).toContain(k.mwst);
      expect(k.einheit, id).toBeTruthy();
      expect(["dokumentiert", "abgeleitet", "annahme"], id).toContain(k.evidenz);
      expect(k.wert !== null || k.spanne !== null, id).toBe(true);
      if (k.evidenz !== "annahme") expect(k.quellen.length, id).toBeGreaterThan(0);
    }
  });

  it("missing regional value falls back to DE and is flagged", () => {
    const k = kostenAnsatzFuer("M2", "BE");
    expect(k.region).toBe("DE");
    expect(k.fallback).toBe(true);
    expect(kostenStatusText(k)).toMatch(/Fallback/);
    expect(kostenAnsatzFuer("M2").fallback).toBe(false);
  });
});

// ─── berechneNachMassnahmen: no measures ─────────────────────────────────

describe("berechneNachMassnahmen (no measures active)", () => {
  const { gebaeude, ist } = buildGebaeudeWithState(PRESETS.efhNachkrieg);
  const k = berechneNachMassnahmen([], ist, gebaeude);

  it("PE matches IST", () => {
    expect(k.primaerenergie).toBe(ist.primaerenergie);
  });

  it("EEK matches IST EEK (from IST Endenergie)", () => {
    expect(k.effizienzklasse).toBe(berechneEffizienzklasse(ist.endenergie));
  });

  it("invest, foerderung, eigenanteil all zero", () => {
    expect(k.invest_gesamt).toBe(0);
    expect(k.foerderung_gesamt).toBe(0);
    expect(k.eigenanteil).toBe(0);
  });
});

// ─── berechneNachMassnahmen: idempotency ─────────────────────────────────

describe("energy carrier factors", () => {
  it("uses GEG defaults for oil and net electricity", () => {
    expect(faktorenFuerHeizung("Heizöl").primaerenergie).toBe(1.1);
    expect(faktorenFuerHeizung("Heizöl").co2KgProKwh).toBe(0.310);
    expect(faktorenFuerHeizung("Wärmepumpe Luft/Wasser").primaerenergie).toBe(1.8);
    expect(faktorenFuerHeizung("Wärmepumpe Luft/Wasser").co2KgProKwh).toBe(0.560);
  });

  it("calculates PE and CO2 from end energy and selected carrier", () => {
    expect(Math.round(berechnePrimaerenergieAusEndenergie(41, "Wärmepumpe Luft/Wasser"))).toBe(74);
    expect(Math.round((berechneCo2AusEndenergie(41, "Wärmepumpe Luft/Wasser") - 4) * 10) / 10).toBe(19);
  });
});

describe("berechneNachMassnahmen is deterministic", () => {
  it("same inputs always produce same output", () => {
    const { gebaeude, ist } = buildGebaeudeWithState(PRESETS.efhNachkrieg);
    const allIds = MASSNAHMENPAKETE.flatMap(p => p.massnahmen.map(m => m.id));
    const r1 = berechneNachMassnahmen(allIds, ist, gebaeude);
    const r2 = berechneNachMassnahmen(allIds, ist, gebaeude);
    expect(r1.primaerenergie).toBe(r2.primaerenergie);
    expect(r1.eigenanteil).toBe(r2.eigenanteil);
    expect(r1.effizienzklasse).toBe(r2.effizienzklasse);
  });
});

// ─── berechneKumuliert ────────────────────────────────────────────────────

describe("berechneKumuliert (efhNachkrieg, all measures)", () => {
  const { gebaeude, ist } = buildGebaeudeWithState(PRESETS.efhNachkrieg);
  const allIds = MASSNAHMENPAKETE.flatMap(p => p.massnahmen.map(m => m.id));
  const steps = berechneKumuliert(allIds, ist, gebaeude);
  const k = berechneNachMassnahmen(allIds, ist, gebaeude);

  it("step count equals number of active packages", () => {
    const activePkgs = MASSNAHMENPAKETE.filter(p => p.massnahmen.some(m => allIds.includes(m.id) && istEnergetisch(m)));
    expect(steps.length).toBe(activePkgs.length);
  });

  it("last step PE equals berechneNachMassnahmen PE", () => {
    const last = steps[steps.length - 1].nachher;
    expect(last.primaerenergie).toBe(k.primaerenergie);
  });

  it("PE decreases or stays flat across steps", () => {
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].nachher.primaerenergie).toBeLessThanOrEqual(steps[i - 1].nachher.primaerenergie);
    }
  });
});

// ─── massnahmeIstSchonVorhanden ───────────────────────────────────────────

describe("massnahmeIstSchonVorhanden", () => {
  it("M4 not present when heizung_typ is Heizöl", () => {
    expect(massnahmeIstSchonVorhanden("M4", { heizung_typ: "Heizöl", erneuerbare: "" })).toBe(false);
  });

  it("M4 present when heizung_typ contains Wärmepumpe", () => {
    expect(massnahmeIstSchonVorhanden("M4", { heizung_typ: "Wärmepumpe Luft/Wasser", erneuerbare: "" })).toBe(true);
  });

  it("M4 present when erneuerbare contains Wärmepumpe", () => {
    expect(massnahmeIstSchonVorhanden("M4", { heizung_typ: "Erdgas Brennwert", erneuerbare: "Wärmepumpe" })).toBe(true);
  });

  it("M6 not present when erneuerbare is empty", () => {
    expect(massnahmeIstSchonVorhanden("M6", { heizung_typ: "Heizöl", erneuerbare: "" })).toBe(false);
  });

  it("M6 present when erneuerbare contains Photovoltaik", () => {
    expect(massnahmeIstSchonVorhanden("M6", { heizung_typ: "Heizöl", erneuerbare: "Photovoltaik" })).toBe(true);
  });

  it("M6 not present when erneuerbare is Solarthermie", () => {
    expect(massnahmeIstSchonVorhanden("M6", { heizung_typ: "Heizöl", erneuerbare: "Solarthermie" })).toBe(false);
  });

  it("other measures always return false", () => {
    expect(massnahmeIstSchonVorhanden("M1", { heizung_typ: "Wärmepumpe Luft/Wasser", erneuerbare: "Photovoltaik" })).toBe(false);
    expect(massnahmeIstSchonVorhanden("M2", { heizung_typ: "Wärmepumpe Luft/Wasser", erneuerbare: "Photovoltaik" })).toBe(false);
  });
});

// ─── getDefaultAktiveMassnahmen ───────────────────────────────────────────

describe("getDefaultAktiveMassnahmen", () => {
  it("efhNachkrieg: M4 active (fossil heating)", () => {
    const { gebaeude } = buildGebaeudeWithState(PRESETS.efhNachkrieg);
    const bs = Object.fromEntries(ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser).map(b => [b.id, b.note]));
    const ids = getDefaultAktiveMassnahmen(gebaeude, bs);
    expect(ids).toContain("M4");
  });

  it("WP building: M4 NOT active (already installed)", () => {
    const gebaeude = { ...PRESETS.efhNachkrieg.gebaeude, heizung_typ: "Wärmepumpe Luft/Wasser" };
    const bs = Object.fromEntries(ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser).map(b => [b.id, b.note]));
    const ids = getDefaultAktiveMassnahmen(gebaeude, bs);
    expect(ids).not.toContain("M4");
  });

  it("electric direct heating (Nachtspeicher): M4 active", () => {
    const gebaeude = { ...PRESETS.efhNachkrieg.gebaeude, heizung_typ: "Elektroheizung" };
    const bs = Object.fromEntries(ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser).map(b => [b.id, b.note]));
    expect(getDefaultAktiveMassnahmen(gebaeude, bs)).toContain("M4");
  });

  it("PV building: M6 NOT active (already installed)", () => {
    const gebaeude = { ...PRESETS.efhNachkrieg.gebaeude, erneuerbare: "Photovoltaik" };
    const bs = Object.fromEntries(ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser).map(b => [b.id, b.note]));
    const ids = getDefaultAktiveMassnahmen(gebaeude, bs);
    expect(ids).not.toContain("M6");
  });

  it("returns array of measure ID strings", () => {
    const { gebaeude } = buildGebaeudeWithState(PRESETS.efhNachkrieg);
    const bs = Object.fromEntries(ableiteBauteile(gebaeude.baujahr, gebaeude.heizung_typ, gebaeude.lueftung, gebaeude.warmwasser).map(b => [b.id, b.note]));
    const ids = getDefaultAktiveMassnahmen(gebaeude, bs);
    expect(Array.isArray(ids)).toBe(true);
    ids.forEach(id => expect(typeof id).toBe("string"));
  });
});

// ─── dynamicPakete M1→P3 when M4 active ─────────────────────────────────

describe("MASSNAHMENPAKETE M1 placement", () => {
  it("M1 is in P1 in raw MASSNAHMENPAKETE", () => {
    const p1 = MASSNAHMENPAKETE.find(p => p.id === "P1");
    const m1 = p1?.massnahmen.find(m => m.id === "M1");
    expect(m1).toBeDefined();
  });
});

describe("reference area and efficiency class", () => {
  it("energy values refer to AN; missing AN is estimated from Wohnfläche", () => {
    expect(bezugsflaeche({ gebaeudenutzflaeche: 200, wohnflaeche: 160 })).toBe(200);
    expect(bezugsflaeche({ wohnflaeche: 145 })).toBeCloseTo(180);
  });

  it("IST heating cost of the 1965 preset = 215 kWh/m² × 180 m² AN × 0,11 €/kWh", () => {
    const g = PRESETS.efhNachkrieg.gebaeude;
    expect(berechneHeizkosten(215, bezugsflaeche(g), g.heizung_typ)).toBe(4257);
  });

  it("class follows the Endenergie scale (A+ ≤ 30 … H > 250)", () => {
    expect(berechneEffizienzklasse(30)).toBe("A+");
    expect(berechneEffizienzklasse(155)).toBe("E");
    expect(berechneEffizienzklasse(215)).toBe("G");
    expect(berechneEffizienzklasse(260)).toBe("H");
  });

  it("score thresholds were rescaled from Wohnfläche to AN (145/180)", () => {
    expect(SCORE_EMPFOHLEN_MAX).toBeCloseTo(10.5 * 145 / 180);
    expect(SCORE_NICHT_EMPFOHLEN_MIN).toBeCloseTo(20 * 145 / 180);
  });
});

describe("Badsanierung (B1, kategorie modernisierung)", () => {
  const ALL = MASSNAHMENPAKETE.flatMap(p => p.massnahmen.map(m => m.id));
  const mitBad = (bad = {}) => berechneSzenario({ presetId: "efhNachkrieg", aktiveMassnahmen: ALL });

  it("is never pre-selected and does not change energy values or the energetic Eigenanteil", () => {
    expect(erstelleStartzustand("efhNachkrieg").aktiveMassnahmen).not.toContain("B1");
    const ohne = berechneSzenario({ presetId: "efhNachkrieg", aktiveMassnahmen: ALL.filter(id => id !== "B1") }).k;
    const mit = mitBad().k;
    expect(mit.eigenanteil).toBe(ohne.eigenanteil);
    expect(mit.primaerenergie).toBe(ohne.primaerenergie);
    expect(mit.modernisierung_invest).toBe(14800);
  });

  it("cost = €/m² of the chosen standard × bath area, with a range", () => {
    for (const [std, preis] of [["einfach", 1250], ["mittel", 1850], ["gehoben", 2850]]) {
      const pak = erstelleBasisPakete("monovalent", { ...REFERENZ_GEBAEUDE, bad_flaeche: 10, bad_standard: std });
      const b1 = pak.flatMap(p => p.massnahmen).find(m => m.id === "B1");
      expect(b1.investition).toBe(preis * 10);
      expect(b1.spanne.min).toBeLessThan(b1.investition);
      expect(b1.spanne.max).toBeGreaterThan(b1.investition);
    }
    expect(Object.keys(BAD_STANDARDS)).toEqual(["einfach", "mittel", "gehoben"]);
  });

  it("gets no subsidy and no energy step", () => {
    const b1 = MASSNAHMENPAKETE.flatMap(p => p.massnahmen).find(m => m.id === "B1");
    expect(berechneFoerderung(b1, {}).betrag).toBe(0);
    const s = berechneSzenario({ presetId: "efhNachkrieg", aktiveMassnahmen: ["B1"] });
    expect(berechneKumuliert(["B1"], s.start.ist, s.gebaeude, s.pakete)).toEqual([]);
  });
});
