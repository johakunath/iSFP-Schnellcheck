import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  ableiteBauteile,
  OPTIONS_GEBAEUDETYP, OPTIONS_HEIZUNG, OPTIONS_DACH, OPTIONS_KELLER,
  OPTIONS_LUEFTUNG, OPTIONS_WARMWASSER, OPTIONS_ERNEUERBARE, OPTIONS_WAERMEVERTEILUNG,
  BAUTEIL_STUFEN,
  berechneNachMassnahmen, berechneKumuliert, berechneEffizienzklasse, berechneHeizkosten,
  preisFuerHeizung, traegerFuerHeizung,
  bewerteMassnahmen, berechnePvErtrag, berechneHeizungWartung,
  getDefaultAktiveMassnahmen, summiereMassnahmen, bezugsflaeche, nichtEnergetischeIds,
  SCORE_EMPFOHLEN_MAX, SCORE_NICHT_EMPFOHLEN_MIN,
  MASSNAHMENPAKETE as MASSNAHMENPAKETE_BASIS, // intentional: nur für die Liste der opt-in-Ids, nicht für Kosten
  bauteileAlsState, erstelleStartzustand, erstelleEffektivenBauteilState,
  erstelleBasisPakete, erstelleEffektivePakete, ordneAbgleichNachWp, berechneWirtschaftlichkeit,
  DEFAULT_FOERDERKONTEXT, ANTRAGSZEITRAEUME, EINKOMMENSSTUFEN, FOERDERSTAND,
  EFFIZIENZ_FARBEN,
} from "./data.js";
import { DATENSTAND } from "./kosten.js";
import { extractFromPDF } from "./pdfExtract.js";
import { exportAsPDF } from "./printExport.js";
import { fmt } from "./helpers.jsx";
import ISFPPrintReport from "./components/ISFPPrintReport.jsx";
import MassnahmenEditor from "./components/MassnahmenEditor.jsx";
import PaketBlock from "./components/PaketBlock.jsx";
import Hintergruende from "./components/Hintergruende.jsx";
import {
  HouseIcon, InfoIcon, SparkleIcon, PaketHaus, Tooltip, labelStyle,
  NumberInput, TextInput, SelectInput, ComputedRow, Section, Card, CardEyebrow, eekTextFarbe,
} from "./components/ui.jsx";
import { PresetPicker, PdfReviewPanel, ExtractionResult, BauteilKachel } from "./components/Erfassung.jsx";
import { VorherNachher, DeltaKPI, EekArrowScale, MergedTable } from "./components/Ergebnis.jsx";
import { EnergieVerlaufChart, KostenvergleichChart } from "./components/Diagramme.jsx";
import { ErgebnisUebersicht, MobileResultsDrawer } from "./components/ErgebnisUebersicht.jsx";

// Felder, deren Änderung Bauteil-Noten bzw. die Maßnahmen-Vorauswahl neu ableitet
const fmtScore = (v) => v.toFixed(1).replace(".", ",");
const BAUTEILE_NEU_FELDER = ["baujahr", "heizung_typ", "lueftung", "warmwasser"];
const MASSNAHMEN_NEU_FELDER = ["baujahr", "heizung_typ", "lueftung", "warmwasser", "waermeverteilung", "erneuerbare"];

const SANIERUNGSSTAND_STUFEN = {
  unsaniert:  { waende: 2, dach: 2, boden: 2, fenster: 2 },
  teilsaniert:{ waende: 3, dach: 4, boden: 3, fenster: 4 },
  saniert:    { waende: 5, dach: 5, boden: 4, fenster: 5 },
  neubau:     { waende: 6, dach: 6, boden: 5, fenster: 6 },
};
const SANIERUNGSSTAND_LEVEL_ORDER = ["unsaniert", "teilsaniert", "saniert", "neubau"];
const SANIERUNGSSTAND_OPTIONS = [
  { value: "unsaniert",   label: "Unsaniert",   note: "Ungedämmt, kein Wärmedämmverbundsystem" },
  { value: "teilsaniert", label: "Teilsaniert", note: "Einzelne Maßnahmen, z.B. neue Fenster" },
  { value: "saniert",     label: "Saniert",     note: "Zeitgemäß gedämmt, EnEV-Niveau" },
  { value: "neubau",      label: "Neubau/KfW",  note: "Neubau- oder KfW-Standard" },
];
const SANIERUNGSSTAND_BAUTEILE = [
  { id: "waende", label: "Wände" },
  { id: "dach", label: "Dach" },
  { id: "boden", label: "Boden" },
  { id: "fenster", label: "Fenster" },
];
const SANIERUNGSSTAND_BAUTEIL_TOOLTIPS = {
  waende: "Außenwand-Qualität steuert vor allem die Wirkung der Fassadendämmung (M5) und die spätere Heizlast.",
  dach: "Dachzustand beeinflusst direkt das Potenzial der Dachdämmung (M2). Schlechter Zustand = hohe Einsparwirkung.",
  boden: "Boden/Kellerdecke wirkt indirekt auf die Gebäudehülle und Heizlast; wichtig für das Gesamtniveau vor Heizungstausch.",
  fenster: "Fensterzustand bestimmt die Wirkung des Fenstertauschs (M3) und beeinflusst Komfort/Zugluft stark.",
};
const sanierungsstandAusBauteile = (bauteile) => {
  const result = {};
  SANIERUNGSSTAND_BAUTEILE.forEach(({ id }) => {
    const note = bauteile.find(b => b.id === id)?.note ?? 2;
    const level = SANIERUNGSSTAND_LEVEL_ORDER.reduce((best, key) => {
      const target = SANIERUNGSSTAND_STUFEN[key][id];
      const bestTarget = SANIERUNGSSTAND_STUFEN[best][id];
      return Math.abs(note - target) < Math.abs(note - bestTarget) ? key : best;
    }, SANIERUNGSSTAND_LEVEL_ORDER[0]);
    result[id] = level;
  });
  return result;
};
const bauteilMitAktualisierterNote = (bauteil, note) => ({
  ...bauteil,
  note,
  info: (BAUTEIL_STUFEN[bauteil.id] && BAUTEIL_STUFEN[bauteil.id][note]) || bauteil.info,
});

// ═══ ERROR BOUNDARY ════════════════════════════════════════════════════
export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "'Geist Mono', monospace", color: "var(--acc)", background: "var(--bg)", minHeight: "100vh" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>App-Fehler — bitte Seite neu laden</div>
          <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--body)", marginBottom: 16 }}>
            {this.state.error.message}
          </pre>
          <button onClick={() => window.location.reload()}
            style={{ padding: "8px 16px", background: "#B5623E", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
            Neu versuchen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══ STICKY TAB NAV ════════════════════════════════════════════════════
const TABS = [
  { id: "gebaeude",    label: "Gebäude" },
  { id: "bauteile",    label: "Energetischer Zustand" },
  { id: "fahrplan",    label: "Fahrplan" },
  { id: "ergebnis",    label: "Ergebnis" },
];

const StickyTabs = ({ activeId, onClick }) => (
  <div className="flex items-center gap-1 overflow-auto" style={{ scrollbarWidth: "none" }}>
    {TABS.map((t, i) => {
      const active = activeId === t.id;
      return (
        <button key={t.id} onClick={() => onClick(t.id)}
          style={{
            padding: "10px 16px", whiteSpace: "nowrap",
            border: "none", borderBottom: active ? "2.5px solid var(--acc)" : "2.5px solid transparent",
            background: "transparent",
            color: active ? "var(--txt)" : "var(--sec)",
            fontSize: 13.5, fontWeight: active ? 600 : 400,
            letterSpacing: "0.01em", cursor: "pointer",
            transition: "color 0.12s, border-color 0.12s",
          }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--txt)"; }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--sec)"; }}
        >
          <span className="text-[10px] tracking-[0.18em]" style={{ color: active ? "var(--acc)" : "var(--sec)", fontFamily: "'Geist Mono', monospace", marginRight: 8 }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          {t.label}
        </button>
      );
    })}
  </div>
);

// ═══ MAIN APP ══════════════════════════════════════════════════════════

export default function App() {
  // Startzustand = gleicher Weg wie ein Klick auf das Preset (erstelleStartzustand)
  const [start] = useState(() => erstelleStartzustand("efhNachkrieg"));
  const [presetId, setPresetId] = useState("efhNachkrieg");
  const [gebaeude, setGebaeude] = useState(start.gebaeude);
  const [ist, setIst] = useState(start.ist);
  const [bauteile, setBauteile] = useState(start.bauteile);
  const [aktiveMassnahmen, setAktiveMassnahmen] = useState(start.aktiveMassnahmen);
  const [massnahmenOverrides, setMassnahmenOverrides] = useState({});
  const [wpVariante, setWpVariante] = useState("auto");
  const [extraction, setExtraction] = useState(null);
  const [pendingExtraction, setPendingExtraction] = useState(null);
  const [sanierungsstandProBauteil, setSanierungsstandProBauteil] = useState(() => sanierungsstandAusBauteile(start.bauteile));
  const [activeTab, setActiveTab] = useState("gebaeude");
  const [darkMode, setDarkMode] = useState(false);
  const [wirtschaftlichkeitOverrides, setWirtschaftlichkeitOverrides] = useState({});
  const [sanierungsstandOffen, setSanierungsstandOffen] = useState(false);
  // Förderannahmen betreffen den Haushalt, nicht das Gebäude → bleiben beim Preset-Wechsel erhalten.
  const [foerderKontext, setFoerderKontext] = useState(DEFAULT_FOERDERKONTEXT);
  const [foerderOffen, setFoerderOffen] = useState(false);
  const updateFoerderKontext = useCallback((feld, wert) => setFoerderKontext(prev => ({ ...prev, [feld]: wert })), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Scroll observer für sticky tabs
  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY + 130;
      for (let i = TABS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TABS[i].id);
        if (el && el.offsetTop <= scrollY) {
          setActiveTab(TABS[i].id);
          return;
        }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Übernimmt Gebäudefelder und leitet abhängige Zustände neu ab (Bauteile, Maßnahmenauswahl).
  // Gleiche Regeln für Formularänderung und PDF-Import.
  const uebernehmeGebaeude = useCallback((felder) => {
    const next = { ...gebaeude, ...felder };
    const geaendert = Object.keys(felder);
    setGebaeude(next);
    let naechsteBauteile = bauteile;
    if (geaendert.some(f => BAUTEILE_NEU_FELDER.includes(f))) {
      naechsteBauteile = ableiteBauteile(next.baujahr, next.heizung_typ, next.lueftung, next.warmwasser);
      setBauteile(naechsteBauteile);
      setSanierungsstandProBauteil(sanierungsstandAusBauteile(naechsteBauteile));
    }
    if (geaendert.some(f => MASSNAHMEN_NEU_FELDER.includes(f))) {
      // Energetische Auswahl neu ableiten; gewählte Modernisierungen (z. B. Bad) bleiben erhalten
      const optIn = nichtEnergetischeIds(MASSNAHMENPAKETE_BASIS);
      setAktiveMassnahmen(prev => [
        ...getDefaultAktiveMassnahmen(next, bauteileAlsState(naechsteBauteile)),
        ...prev.filter(id => optIn.includes(id)),
      ]);
    }
  }, [gebaeude, bauteile]);

  const updateGebaeude = useCallback((field, value) => uebernehmeGebaeude({ [field]: value }), [uebernehmeGebaeude]);

  const updateIst = useCallback((field, value) => {
    setIst(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateBauteilNote = useCallback((id, note) => {
    setBauteile(prev => {
      const next = prev.map(b => b.id === id ? bauteilMitAktualisierterNote(b, note) : b);
      setSanierungsstandProBauteil(sanierungsstandAusBauteile(next));
      return next;
    });
  }, []);

  const applyPreset = useCallback((id) => {
    const s = erstelleStartzustand(id);
    if (!s) return;
    setPresetId(id);
    setGebaeude(s.gebaeude);
    setIst(s.ist);
    setBauteile(s.bauteile);
    setAktiveMassnahmen(s.aktiveMassnahmen);
    setMassnahmenOverrides({});
    setWpVariante("auto");
    setExtraction(null);
    setSanierungsstandProBauteil(sanierungsstandAusBauteile(s.bauteile));
  }, []);
  const applySanierungsstandFuerBauteil = useCallback((bauteilId, level) => {
    const stufen = SANIERUNGSSTAND_STUFEN[level];
    if (!stufen || stufen[bauteilId] === undefined) return;
    setBauteile(prev => prev.map(b => b.id === bauteilId ? bauteilMitAktualisierterNote(b, stufen[bauteilId]) : b));
    setSanierungsstandProBauteil(prev => ({ ...prev, [bauteilId]: level }));
  }, []);

  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleUpload = useCallback((result) => {
    if (result.gebaeude && Object.keys(result.gebaeude).length > 0) {
      uebernehmeGebaeude(result.gebaeude);
    }
    if (result.ist && Object.keys(result.ist).length > 0) {
      setIst(prev => ({ ...prev, ...result.ist }));
    }
    setPresetId(null);
    setExtraction(result);
  }, [uebernehmeGebaeude]);

  const applyPendingExtraction = useCallback((selectedKeys) => {
    if (!pendingExtraction) return;
    const filteredGebaeude = {};
    const filteredIst = {};
    for (const m of pendingExtraction.matched || []) {
      if (!selectedKeys.has(m.key + "/" + m.targetName)) continue;
      if (m.targetName === "ist") filteredIst[m.key] = m.value;
      else filteredGebaeude[m.key] = m.value;
    }
    handleUpload({
      ...pendingExtraction,
      gebaeude: filteredGebaeude,
      ist: filteredIst,
      matched: (pendingExtraction.matched || []).filter(m => selectedKeys.has(m.key + "/" + m.targetName)),
    });
    setPendingExtraction(null);
  }, [pendingExtraction, handleUpload]);

  const rejectPendingExtraction = useCallback(() => {
    setPendingExtraction(null);
  }, []);

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) { setUploadError("Bitte PDF-Datei verwenden."); return; }
    setUploadError(null);
    setUploadLoading(true);
    try {
      const result = await extractFromPDF(file);
      result.fileName = file.name;
      if ((result.matched?.length ?? 0) === 0) {
        // Nothing matched — skip review, show the "no fields" result banner directly
        handleUpload(result);
      } else {
        setPendingExtraction(result);
        setExtraction(null);
      }
    } catch (e) {
      setUploadError("Datei konnte nicht gelesen werden: " + (e.message || "unbekannter Fehler"));
    } finally {
      setUploadLoading(false);
    }
  }, [handleUpload]);

  const scrollToTab = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Package toggle = "select all / deselect all" of its measures.
  // Off if any measure is active; turning on activates all measures of the package.
  const togglePaket = (id) => {
    const paket = dynamicPakete.find(p => p.id === id);
    if (!paket) return;
    const mIds = paket.massnahmen.map(m => m.id);
    const anyActive = mIds.some(mid => aktiveMassnahmen.includes(mid));
    setAktiveMassnahmen(prev => anyActive
      ? prev.filter(x => !mIds.includes(x))
      : [...prev.filter(x => !mIds.includes(x)), ...mIds]
    );
  };

  const toggleMassnahme = (mid) => {
    setAktiveMassnahmen(prev => prev.includes(mid)
      ? prev.filter(x => x !== mid)
      : [...prev, mid]
    );
  };

  const updateMassnahme = useCallback((id, field, value) => {
    setMassnahmenOverrides(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }, []);

  const resetMassnahme = useCallback((id) => {
    setMassnahmenOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const updateWirtschaftlichkeit = useCallback((key, value) => {
    setWirtschaftlichkeitOverrides(prev => ({ ...prev, [key]: value }));
  }, []);
  const resetWirtschaftlichkeit = useCallback((key) => {
    setWirtschaftlichkeitOverrides(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  // ─── Derived values ──
  const bauteile_state = useMemo(() => bauteileAlsState(bauteile), [bauteile]);

  // Effektiver Bauteilzustand (M7 → Flächenheizung) + WP-Variante — eine Quelle für Rechnung und UI.
  const { state: effectiveBauteilState, wp } = useMemo(
    () => erstelleEffektivenBauteilState({ bauteile_state, gebaeude, aktiveMassnahmen, wpWahl: wpVariante }),
    [bauteile_state, gebaeude, aktiveMassnahmen, wpVariante]
  );
  const resolvedWpVariante = wp.key;

  // Variante → Basiswerte (für den Editor); + Nutzer-Overrides, sortiert → effectivePakete.
  const basisPakete = useMemo(() => erstelleBasisPakete(resolvedWpVariante, gebaeude), [resolvedWpVariante, gebaeude]);
  // Gebäude + Förderannahmen: Grundlage aller Förderbeträge (berechneFoerderung liest gebaeude.foerderung).
  const gebaeudeF = useMemo(
    () => ({ ...gebaeude, foerderung: { ...foerderKontext, istEndenergie: ist.endenergie } }),
    [gebaeude, foerderKontext, ist.endenergie]
  );
  const effectivePakete = useMemo(
    () => erstelleEffektivePakete({ overrides: massnahmenOverrides, varianteKey: resolvedWpVariante, bauteile_state: effectiveBauteilState, gebaeude }),
    [massnahmenOverrides, resolvedWpVariante, effectiveBauteilState, gebaeude]
  );
  // M1 wandert bei aktiver WP hinter die WP (P3) — Basis für Anzeige, Rechnung und Bericht.
  const dynamicPakete = useMemo(() => ordneAbgleichNachWp(effectivePakete, aktiveMassnahmen), [effectivePakete, aktiveMassnahmen]);

  const aktivePakete = useMemo(() =>
    dynamicPakete.filter(p => p.massnahmen.some(m => aktiveMassnahmen.includes(m.id))).map(p => p.id),
    [dynamicPakete, aktiveMassnahmen]
  );

  const heizkosten = useMemo(
    () => berechneHeizkosten(ist.endenergie, bezugsflaeche(gebaeude), gebaeude.heizung_typ),
    [ist.endenergie, gebaeude, gebaeude.heizung_typ]
  );
  const hatWP = aktiveMassnahmen.includes("M4");
  const hatPV = aktiveMassnahmen.includes("M6");
  const wartungCalcResult = useMemo(
    () => berechneHeizungWartung({ heizungTyp: gebaeude.heizung_typ, wpVariante: resolvedWpVariante, hatWP, hatPV }),
    [gebaeude.heizung_typ, resolvedWpVariante, hatWP, hatPV]
  );
  const wartungIstCalc  = wartungCalcResult.istJahr;
  const wartungZielCalc = wartungCalcResult.zielJahr;
  const effizienzklasse = useMemo(() => berechneEffizienzklasse(ist.endenergie), [ist.endenergie]);
  const gebaeudeWithState = useMemo(() => ({ ...gebaeudeF, bauteile_state: effectiveBauteilState }), [gebaeudeF, effectiveBauteilState]);
  const k = useMemo(() => berechneNachMassnahmen(aktiveMassnahmen, ist, gebaeudeWithState, dynamicPakete), [aktiveMassnahmen, ist, gebaeudeWithState, dynamicPakete]);
  const kumuliert = useMemo(() => berechneKumuliert(aktiveMassnahmen, ist, gebaeudeWithState, dynamicPakete), [aktiveMassnahmen, ist, gebaeudeWithState, dynamicPakete]);

  const isFossil = /Heizöl|Erdgas|Fernwärme/i.test(gebaeude.heizung_typ || "");
  const DEFAULT_ESKAL_IST  = isFossil ? 2.5 : 2.0;
  const DEFAULT_ESKAL_ZIEL = 2.0;
  const effEskalIst  = wirtschaftlichkeitOverrides.eskalationIst  ?? DEFAULT_ESKAL_IST;
  const effEskalZiel = wirtschaftlichkeitOverrides.eskalationZiel ?? DEFAULT_ESKAL_ZIEL;
  // Eine Wirtschaftlichkeitsrechnung für Sidebar, Drawer, Chart und Bericht (inkl. Overrides).
  const wirtschaftlichkeit = useMemo(() => berechneWirtschaftlichkeit({
    heizkostenIst:  wirtschaftlichkeitOverrides.heizkostenIst  ?? heizkosten,
    heizkostenZiel: wirtschaftlichkeitOverrides.heizkostenZiel ?? k.heizkosten_gesamt,
    wartungIst:     wirtschaftlichkeitOverrides.wartungIst     ?? wartungIstCalc,
    wartungZiel:    wirtschaftlichkeitOverrides.wartungZiel    ?? wartungZielCalc,
    pvErtrag: hatPV ? berechnePvErtrag(hatWP).gesamtEur : 0,
    eigenanteil: k.eigenanteil,
    eskalationIst: effEskalIst, eskalationZiel: effEskalZiel, jahre: 20,
  }), [wirtschaftlichkeitOverrides, heizkosten, k, wartungIstCalc, wartungZielCalc, hatPV, hatWP, effEskalIst, effEskalZiel]);

  const bewertung = useMemo(() =>
    bewerteMassnahmen(effectivePakete.flatMap(p => p.massnahmen), effectiveBauteilState, gebaeude),
    [effectivePakete, effectiveBauteilState, gebaeude]
  );
  const empfohleneMassnahmen      = useMemo(() => bewertung.filter(m => m.empfohlen).map(m => m.id),      [bewertung]);
  const nichtEmpfohleneMassnahmen = useMemo(() => bewertung.filter(m => m.nichtEmpfohlen).map(m => m.id), [bewertung]);
  const reportSummaryPackages = useMemo(() => {
    return dynamicPakete.map((paket) => {
      const aktiveInPaket = paket.massnahmen.filter((m) => aktiveMassnahmen.includes(m.id));
      if (aktiveInPaket.length === 0) return null;
      const { eigenanteil } = summiereMassnahmen(aktiveInPaket, gebaeudeF);
      return { id: paket.id, nummer: paket.nummer, titel: paket.titel, farbe: paket.farbe, kosten: eigenanteil, massnahmen_aktiv: aktiveInPaket.map(m => m.id), massnahmen_aktiv_obj: aktiveInPaket.map(m => ({ id: m.id, kurztitel: m.kurztitel || m.id })) };
    }).filter(Boolean);
  }, [dynamicPakete, aktiveMassnahmen, gebaeudeF]);
  const warumCtx = useMemo(() => ({ bauteile_state: effectiveBauteilState, gebaeude: gebaeudeF, aktiveMassnahmen, wp }), [effectiveBauteilState, gebaeudeF, aktiveMassnahmen, wp]);
  const ergebnisProps = {
    effizienzklasse, k, ist, heizkosten, w: wirtschaftlichkeit, wohnflaeche: bezugsflaeche(gebaeude),
    reportSummaryPackages, empfohleneMassnahmen, nichtEmpfohleneMassnahmen, warumCtx, scrollToTab,
  };

  const handleExport = () => {
    exportAsPDF();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--txt)" }}>
      {/* Header mit Sticky-Tabs */}
      <header className="print-hide" style={{
        borderBottom: "1px solid var(--bdr)",
        background: darkMode ? "rgba(14,13,11,0.96)" : "rgba(248,245,239,0.96)",
        position: "sticky", top: 0, zIndex: 30,
        backdropFilter: "blur(8px)",
      }}>
        <div className="mx-auto max-w-[1400px] px-5 md:px-10" style={{ paddingTop: 14 }}>
          <div className="flex items-center justify-between gap-6 flex-wrap mb-3">
            <div className="flex items-center gap-3">
              <div style={{ color: "var(--acc)" }}><HouseIcon size={26} /></div>
              <div>
                <div className="font-serif" style={{ fontSize: 18, fontWeight: 500, color: "var(--txt)", lineHeight: 1.1 }}>
                  iSFP-Schnellcheck
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setDarkMode(d => !d)}
                title={darkMode ? "Zum hellen Modus" : "Zum dunklen Modus"}
                style={{ width: 34, height: 34, border: "1px solid var(--bdr)", borderRadius: 3,
                         background: "var(--surface)", color: "var(--sec)",
                         cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {darkMode ? "☀" : "☾"}
              </button>
              <button onClick={handleExport}
                style={{ padding: "9px 18px", background: "var(--txt)", color: "var(--bg)",
                         borderRadius: 3, fontSize: 13, fontWeight: 500, border: "none",
                         cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--acc)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "var(--txt)"}>
                Als PDF exportieren →
              </button>
            </div>
          </div>
          <StickyTabs activeId={activeTab} onClick={scrollToTab} />
        </div>
      </header>

      {/* Print-Title (nur im PDF) */}
      <ISFPPrintReport ist={ist} k={k} heizkostenIst={heizkosten} aktivePakete={aktivePakete} aktiveMassnahmen={aktiveMassnahmen} gebaeude={gebaeudeF} kumuliert={kumuliert} effectivePakete={dynamicPakete} wirtschaftlichkeit={wirtschaftlichkeit} eskalationIst={effEskalIst} eskalationZiel={effEskalZiel} />

      <main className="mx-auto max-w-[1400px] print-hide px-5 md:px-10" style={{ paddingTop: 36, paddingBottom: 80 }}>

        {/* 2-col layout on xl+: left=scrollable content, right=sticky Ergebnis sidebar */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>


        {/* Preset-Picker */}
        <Section id="presets" eyebrow="Schnellstart">
          <Card style={{ padding: 20 }}>
            <div className="flex items-center justify-between gap-4 mb-5 print-hide">
              <h2 className="font-serif leading-[1.05]" style={{ fontSize: 22, fontWeight: 500, color: "var(--txt)" }}>
                Startpunkt wählen
              </h2>
            </div>
            <PresetPicker activeId={presetId} onPick={applyPreset}
              onUploadClick={() => fileInputRef.current?.click()}
              uploadLoading={uploadLoading} />
            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }}
              onChange={(e) => { handleFileSelect(e.target.files?.[0]); e.target.value = ""; }} />
            {uploadError && (
              <div className="mt-3 text-[13px]" style={{ color: "#E30613" }}>{uploadError}</div>
            )}
            {pendingExtraction && (
              <div className="mt-3">
                <PdfReviewPanel result={pendingExtraction} onApply={applyPendingExtraction} onReject={rejectPendingExtraction} />
              </div>
            )}
            {!pendingExtraction && extraction && (
              <div className="mt-3">
                <ExtractionResult result={extraction} onDismiss={() => setExtraction(null)} />
              </div>
            )}
          </Card>
        </Section>

        {/* Gebäude & Bestand */}
        <Section id="gebaeude" eyebrow="Schritt 1 · Erfassung" title="Ihr Gebäude heute"
          subtitle="Alle Felder editierbar — Änderungen wirken sofort auf Fahrplan und Ergebnis.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card>
              <CardEyebrow>Stammdaten</CardEyebrow>
              <TextInput   label="Standort"             value={gebaeude.standort}            onChange={v => updateGebaeude("standort", v)} />
              <TextInput   label="Adresse"              value={gebaeude.strasse}             onChange={v => updateGebaeude("strasse", v)} />
              <TextInput   label="PLZ"                  value={gebaeude.plz}                 onChange={v => updateGebaeude("plz", v)} />
              <SelectInput label="Gebäudetyp"           value={gebaeude.typ}                 onChange={v => updateGebaeude("typ", v)} options={OPTIONS_GEBAEUDETYP} />
              <NumberInput label="Baujahr"              value={gebaeude.baujahr}             onChange={v => updateGebaeude("baujahr", v)} min={1700} max={2030}
                tooltip="Wird zur automatischen Ableitung der Bauteil-Noten verwendet (TABULA-Baualtersklassen)." />
              <NumberInput label="Wohneinheiten"        value={gebaeude.wohneinheiten}       onChange={v => updateGebaeude("wohneinheiten", v)} min={1} max={1000}
                tooltip="Bestimmt die Förder-Höchstgrenzen (je weitere Wohneinheit höher). Klimageschwindigkeits- und Einkommensbonus gelten nur anteilig für eine selbstgenutzte Wohneinheit. Kein Einfluss auf die Energiebilanz." />
              <NumberInput label="Wohnfläche"           value={gebaeude.wohnflaeche}         onChange={v => updateGebaeude("wohnflaeche", v)} unit="m²" min={20}
                tooltip="Bestimmt Heizkosten sowie Fenster- und Fußbodenheizungsfläche im Mengenmodell." />
              <NumberInput label="Gebäudenutzfläche AN" value={gebaeude.gebaeudenutzflaeche} onChange={v => updateGebaeude("gebaeudenutzflaeche", v)} unit="m²" min={20}
                tooltip="AN = beheizbare Nettogrundfläche nach DIN V 18599. Bezugsfläche für Energieausweis-Kennzahlen (PE, CO₂). Faustregel: AN ≈ 1,2–1,4 × Wohnfläche. Mengenmodell: AN ÷ Vollgeschosse = Grundfläche → Dach- und Fassadenfläche." />
              <NumberInput label="Vollgeschosse"        value={gebaeude.vollgeschosse}       onChange={v => updateGebaeude("vollgeschosse", v)} min={1} max={4}
                tooltip="Mengenmodell: mehr Geschosse bei gleicher Fläche → kleineres Dach, höhere Fassade." />
              <div style={{ marginTop: 14 }}>
                <button onClick={() => setFoerderOffen(o => !o)} aria-expanded={foerderOffen}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                           width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--sec)", fontFamily: "'Geist Mono', monospace",
                                textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Förderannahmen
                  </div>
                  <span style={{ fontSize: 11, color: "var(--acc)" }}>{foerderOffen ? "▲" : "▼"}</span>
                </button>
                {!foerderOffen && (
                  <div style={{ fontSize: 10, color: "var(--sec)", marginTop: 3, lineHeight: 1.4 }}>
                    {[
                      foerderKontext.selbstnutzer ? "Selbstnutzer" : "Vermietet",
                      `Einkommen ${EINKOMMENSSTUFEN.find(e => e.value === foerderKontext.einkommen)?.label}`,
                      foerderKontext.isfp ? "mit iSFP" : "ohne iSFP",
                      `Antrag ${ANTRAGSZEITRAEUME[foerderKontext.antragszeitraum]?.label}`,
                    ].join(" · ")}
                  </div>
                )}
                {foerderOffen && (
                  <div style={{ marginTop: 8 }}>
                    <SelectInput label="Selbstnutzung" value={foerderKontext.selbstnutzer ? "ja" : "nein"}
                      onChange={v => updateFoerderKontext("selbstnutzer", v === "ja")}
                      options={[{ value: "ja", label: "ja" }, { value: "nein", label: "vermietet" }]}
                      tooltip="Klimageschwindigkeits- und Einkommensbonus der Heizungsförderung gibt es nur für selbstnutzende Eigentümer." />
                    <SelectInput label="Haushaltseinkommen" value={foerderKontext.einkommen}
                      onChange={v => updateFoerderKontext("einkommen", v)} options={EINKOMMENSSTUFEN}
                      tooltip="Zu versteuerndes Haushaltseinkommen (Mittel der letzten zwei Jahre). Ohne Angabe: > 50.000 €. Einkommensbonus 40 / 30 / 10 % bis 30.000 / 40.000 / 50.000 €; Kinder unter 18 senken das anzusetzende Einkommen einmalig um 10.000 €." />
                    <SelectInput label="iSFP (BAFA-gefördert)" value={foerderKontext.isfp ? "ja" : "nein"}
                      onChange={v => updateFoerderKontext("isfp", v === "ja")}
                      options={[{ value: "ja", label: "ja" }, { value: "nein", label: "nein" }]}
                      tooltip="Ein geförderter iSFP hebt die Höchstgrenze für Hülle/Optimierung auf 60.000 € und gibt +5 % auf förderfähige Kosten über 30.000 €. Dieser Schnellcheck ist kein solcher iSFP." />
                    <SelectInput label="Antragszeitraum" value={String(foerderKontext.antragszeitraum)}
                      onChange={v => updateFoerderKontext("antragszeitraum", Number(v))}
                      options={ANTRAGSZEITRAEUME.map(z => ({ value: String(z.index), label: z.label }))}
                      tooltip="Förderbedingungen zum Zeitpunkt des Antrags, für alle Maßnahmen. Heizung: Klimageschwindigkeitsbonus 16 % bis 01/2027, dann −4 Punkte je Halbjahr, ab 08/2028 entfallen; förderfähige Kosten 28.000 €, dann −750 € je Halbjahr. Ab Q1 2027: WP-Grundförderung 15 % (+15 % bei EU-Ursprung), WPB-Bonus +5 % auf Dämmung." />
                    <SelectInput label="WP aus EU-Produktion" value={foerderKontext.wpEuUrsprung ? "ja" : "nein"}
                      onChange={v => updateFoerderKontext("wpEuUrsprung", v === "ja")}
                      options={[{ value: "ja", label: "ja" }, { value: "nein", label: "nein" }]}
                      tooltip="Ab Q1 2027 gibt es den Wertschöpfungsbonus (+15 %) nur für Wärmepumpen mit Ursprung in der EU. Die Nachweisregeln sind noch nicht veröffentlicht." />
                    <div style={{ fontSize: 10, color: "var(--sec)", marginTop: 6, lineHeight: 1.4 }}>Stand: {FOERDERSTAND}. Keine Förderzusage.</div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardEyebrow>Anlagentechnik</CardEyebrow>
              <SelectInput label="Heizung"           value={gebaeude.heizung_typ} onChange={v => updateGebaeude("heizung_typ", v)} options={OPTIONS_HEIZUNG}
                tooltip="Bestimmt Primärenergiefaktor und Heizkosten-Tarif. Änderung setzt auch die Bauteil-Note 'Heizung' zurück." />
              <NumberInput label="Baujahr Heizung"   value={gebaeude.heizung_bj}  onChange={v => updateGebaeude("heizung_bj", v)} min={1950} max={2030} />
              <SelectInput label="Warmwasser"        value={gebaeude.warmwasser}  onChange={v => updateGebaeude("warmwasser", v)} options={OPTIONS_WARMWASSER} />
              <SelectInput label="Lüftung"           value={gebaeude.lueftung}    onChange={v => updateGebaeude("lueftung", v)} options={OPTIONS_LUEFTUNG}
                tooltip="WRG = Wärmerückgewinnung. Eine Lüftungsanlage mit WRG entzieht der Abluft Wärme und gibt sie an die Frischluft ab — spart 10–15 kWh/(m²·a) Primärenergie ggü. Fensterlüftung." />
              <SelectInput label="Erneuerbare"       value={gebaeude.erneuerbare} onChange={v => updateGebaeude("erneuerbare", v)} options={OPTIONS_ERNEUERBARE}
                tooltip="Wird automatisch vorgeschlagen, wenn Heizung auf Wärmepumpe oder Pellets steht. Manuelle Überschreibung möglich." />
              <SelectInput label="Dach"              value={gebaeude.dach}        onChange={v => updateGebaeude("dach", v)} options={OPTIONS_DACH} />
              <SelectInput label="Keller"            value={gebaeude.keller}      onChange={v => updateGebaeude("keller", v)} options={OPTIONS_KELLER} />
              <SelectInput label="Wärmeverteilung"   value={gebaeude.waermeverteilung || OPTIONS_WAERMEVERTEILUNG[0]} onChange={v => updateGebaeude("waermeverteilung", v)} options={OPTIONS_WAERMEVERTEILUNG}
                tooltip="Bestimmt Vorlauftemperatur und empfohlene WP-Betriebsart (Monovalent / Monoenergetic / Bivalent)." />
              <div style={{ marginTop: 14 }}>
                <button onClick={() => setSanierungsstandOffen(o => !o)} aria-expanded={sanierungsstandOffen}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                           width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--sec)", fontFamily: "'Geist Mono', monospace",
                                textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Sanierungsstand Hülle
                  </div>
                  <span style={{ fontSize: 11, color: "var(--acc)" }}>
                    {sanierungsstandOffen ? "▲" : "▼"}
                  </span>
                </button>
                {!sanierungsstandOffen && (
                  <div style={{ fontSize: 10, color: "var(--sec)", marginTop: 3, lineHeight: 1.4 }}>
                    {SANIERUNGSSTAND_BAUTEILE.map(({ id, label }) => {
                      const v = sanierungsstandProBauteil[id] || "unsaniert";
                      return `${label}: ${SANIERUNGSSTAND_OPTIONS.find(o => o.value === v)?.label || v}`;
                    }).join(" · ")}
                  </div>
                )}
                {sanierungsstandOffen && (
                  <div style={{ marginTop: 8 }}>
                    {SANIERUNGSSTAND_BAUTEILE.map(({ id, label }) => {
                      const selVal = sanierungsstandProBauteil[id] || "unsaniert";
                      const selNote = SANIERUNGSSTAND_OPTIONS.find(o => o.value === selVal)?.note;
                      return (
                        <div key={id}>
                          <SelectInput
                            label={label}
                            value={selVal}
                            onChange={v => applySanierungsstandFuerBauteil(id, v)}
                            options={SANIERUNGSSTAND_OPTIONS}
                            tooltip={SANIERUNGSSTAND_BAUTEIL_TOOLTIPS[id]}
                          />
                          {selNote && <div style={{ fontSize: 10, color: "var(--sec)", paddingLeft: 12, marginTop: 3, marginBottom: 6 }}>{selNote}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardEyebrow>Energie­kennzahlen (Ist)</CardEyebrow>
              <NumberInput label="Endenergie"       value={ist.endenergie}     onChange={v => updateIst("endenergie", v)} unit="kWh/(m²·a)" min={0} max={600}
                tooltip="Die dem Gebäude zugeführte Energie je m² Nutzfläche AN. Basis für Heizkosten und Effizienzklasse. Bedarfsausweise liegen bei unsanierten Häusern oft deutlich über dem tatsächlichen Verbrauch — reale Heizkosten lassen sich unter „Wirtschaftlichkeit“ eintragen." />
              <NumberInput label="Primärenergie"    value={ist.primaerenergie} onChange={v => updateIst("primaerenergie", v)} unit="kWh/(m²·a)" min={0} max={700}
                tooltip="Berücksichtigt die 'Vorkette' (Energieträger-Gewinnung, Transport). Basis für die Effizienzklasse in diesem Tool. Der Energieausweis nach GEG §86 klassifiziert dagegen nach Endenergie." />
              <NumberInput label="CO₂-Emissionen"   value={ist.co2}            onChange={v => updateIst("co2", v)} unit="kg/(m²·a)" min={0} max={200} step={0.1} />
              <div className="flex items-center justify-between gap-3" style={{ padding: "9px 0", borderBottom: "1px solid var(--div)", minHeight: 38 }}>
                <span className="flex items-center gap-1.5" style={labelStyle}>
                  Effizienzklasse
                  <span style={{ color: "var(--acc)" }} title="Automatisch berechnet"><SparkleIcon size={11} /></span>
                  <Tooltip content="Wie im Energieausweis aus der Endenergie je m² Nutzfläche AN (Skala A+ bis H). Der BAFA-iSFP nutzt zusätzlich eine eigene Farbskala auf Primärenergie-Basis."><span style={{ color: "var(--acc)" }}><InfoIcon /></span></Tooltip>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: EFFIZIENZ_FARBEN[effizienzklasse] || "#6B6259", color: eekTextFarbe(effizienzklasse), borderRadius: 3, fontSize: 15, fontWeight: 600, width: 34, height: 28, fontFamily: "'Fraunces', serif" }}>{effizienzklasse}</span>
              </div>
              <ComputedRow label="Heizkosten gesamt"   value={fmt(heizkosten)}   unit="€/a"
                tooltip={`${ist.endenergie} kWh/m² × ${Math.round(bezugsflaeche(gebaeude))} m² AN × ${preisFuerHeizung(gebaeude.heizung_typ).toFixed(2)} €/kWh (${traegerFuerHeizung(gebaeude.heizung_typ)}) = ${fmt(heizkosten)} €/Jahr`} />
            </Card>
          </div>
        </Section>

        {/* Energetischer Zustand — Bauteile */}
        <Section id="bauteile" eyebrow="Energetischer Zustand" title="Bauteilbewertung"
          subtitle="Noten 1 (rot, sehr schlecht) bis 7 (grün, sehr gut) — pro Bauteil mit benannten Stufen. Defaults werden aus Baujahr und Anlagentechnik abgeleitet, sind aber manuell anpassbar.">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px]" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>sehr schlecht</span>
            <div style={{ flex: 1, height: 6, borderRadius: 100, background: "linear-gradient(to right, #E30613, #E3501C, #F07D00, #F6A400, #C5D62E, #34A030, #00843D)" }} />
            <span className="text-[11px]" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>sehr gut</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bauteile.map(b => <BauteilKachel key={b.id} bauteil={b} onNoteChange={updateBauteilNote} />)}
          </div>
        </Section>

        {/* Fahrplan */}
        <Section id="fahrplan" eyebrow="Schritt 2 · Fahrplan" title="Empfohlene Maßnahmenpakete"
          subtitle={`Reihenfolge nach Kosten-Nutzen (€ je jährlich eingesparter kWh Primärenergie). ★ = Score < ${fmtScore(SCORE_EMPFOHLEN_MAX)} €/kWh (empfohlen); ✕ = Score > ${fmtScore(SCORE_NICHT_EMPFOHLEN_MIN)} €/kWh oder kein PE-Effekt.`}>
          {(() => {
            const totalCols = dynamicPakete.length + 2;
            const lineOffset = `${50 / totalCols}%`;
            return (
              <div className="mb-10" style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${totalCols}, 1fr)`, gap: 0 }}>
                <div className="absolute" style={{ left: lineOffset, right: lineOffset, top: 24, height: 2, background: "linear-gradient(to right, #E30613, #F07D00, #7C3AED, #F6D400, #00843D, #2563EB)", pointerEvents: "none" }} />
                <div className="flex flex-col items-center gap-1.5 relative">
                  <div style={{ width: 46, height: 50, background: EFFIZIENZ_FARBEN[effizienzklasse] || "#6B6259", borderRadius: 3, border: "1.5px solid var(--txt)", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="font-serif text-[16px]" style={{ color: eekTextFarbe(effizienzklasse) }}>{effizienzklasse}</span></div>
                  <div className="text-[9px] tracking-[0.18em] uppercase text-center" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>Heute</div>
                  <div className="text-[10px]" style={{ color: "var(--body)" }}>Kl. {effizienzklasse}</div>
                </div>
                {dynamicPakete.map(p => (
                  <div key={p.id} className="flex flex-col items-center gap-1.5 relative" style={{ opacity: aktivePakete.includes(p.id) ? 1 : 0.3 }}>
                    <button className="print-hide" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block" }}
                      onClick={() => document.getElementById(`paket-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      title={`Zu Paket ${p.nummer}: ${p.titel} springen`}>
                      <PaketHaus farbe={p.farbe} aktiv={aktivePakete.includes(p.id)} nummer={p.nummer} size={48} />
                    </button>
                    <div className="text-[10px] text-center leading-tight px-0.5" style={{ color: "var(--body)", maxWidth: "100%" }}>{p.titel}</div>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-1.5 relative">
                  <div style={{ width: 46, height: 50, background: EFFIZIENZ_FARBEN[k.effizienzklasse] || "#00843D", borderRadius: 3, border: "1.5px solid var(--txt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="font-serif text-[16px]" style={{ color: eekTextFarbe(k.effizienzklasse) }}>{k.effizienzklasse}</span>
                  </div>
                  <div className="text-[9px] tracking-[0.18em] uppercase text-center" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>Ziel</div>
                  <div className="text-[10px]" style={{ color: "var(--body)" }}>Kl. {k.effizienzklasse}</div>
                </div>
              </div>
            );
          })()}

          <div className="space-y-5">
            {dynamicPakete.map(p => (
              <PaketBlock key={p.id} paket={p} aktiv={aktivePakete.includes(p.id)} onToggle={() => togglePaket(p.id)}
                onToggleMassnahme={toggleMassnahme}
                aktiveMassnahmen={aktiveMassnahmen}
                empfohleneMassnahmen={empfohleneMassnahmen}
                nichtEmpfohleneMassnahmen={nichtEmpfohleneMassnahmen}
                gebaeude={gebaeudeF}
                bauteile_state={effectiveBauteilState}
                wp={wp}
                onWpVarianteChange={setWpVariante}
                onGebaeudeChange={updateGebaeude} />
            ))}
          </div>
        </Section>

        {/* Ergebnis section — inside left column so sidebar stays visible throughout */}
        <Section id="ergebnis" eyebrow="Schritt 3 · Ergebnis" title="Ihr Gebäude nach der Sanierung"
          subtitle="Alle Kennzahlen, Einsparungen und Förderungen im Überblick. Kumulierte Wirkung nach BAFA-Logik: jedes Paket baut auf dem vorigen auf.">
          {/* VorherNachher: hidden on screen (sidebar on lg+, drawer on mobile); kept for print */}
          <div className="hidden print:block">
            <VorherNachher ist={ist} k={k} heizkostenIst={heizkosten} gebaeude={gebaeude} />
            <div className="mt-10">
              <h3 className="font-serif mb-4" style={{ fontSize: 22, fontWeight: 500, color: "var(--txt)" }}>Einsparungen im Überblick</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <DeltaKPI label="Endenergie" vorher={ist.endenergie} nachher={k.endenergie} unit="kWh/(m²·a)" />
                <DeltaKPI label="CO₂-Emissionen" vorher={ist.co2} nachher={k.co2} unit="kg/(m²·a)" />
                <DeltaKPI label="Heizkosten" vorher={heizkosten} nachher={k.heizkosten_gesamt} unit="€/a" />
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-serif mb-4" style={{ fontSize: 22, fontWeight: 500, color: "var(--txt)" }}>Schritt-für-Schritt-Wirkung</h3>
            <EekArrowScale
              istKlasse={effizienzklasse}
              zielKlasse={k.effizienzklasse}
              istPe={`EE ${ist.endenergie} kWh`}
              zielPe={`EE ${k.endenergie} kWh`}
            />
            <MergedTable kumuliert={kumuliert} ist={ist} heizkosten={heizkosten} />
          </div>

          <EnergieVerlaufChart ist={ist} kumuliert={kumuliert} heizkosten={heizkosten} />

          {/* 20-Jahr-Kostenvergleich */}
          {wirtschaftlichkeit.laufendIst > 0 && wirtschaftlichkeit.laufendZiel > 0 && (
            <KostenvergleichChart w={wirtschaftlichkeit} eskalationIst={effEskalIst} eskalationZiel={effEskalZiel} />
          )}

          <MassnahmenEditor basisPakete={basisPakete} overrides={massnahmenOverrides} onUpdate={updateMassnahme} onReset={resetMassnahme}
            wirtschaftlichkeitOverrides={wirtschaftlichkeitOverrides}
            heizkostenIstCalc={heizkosten}
            heizkostenZielCalc={k.heizkosten_gesamt}
            wartungIstCalc={wartungIstCalc}
            wartungZielCalc={wartungZielCalc}
            eskalationIstCalc={DEFAULT_ESKAL_IST}
            eskalationZielCalc={DEFAULT_ESKAL_ZIEL}
            onUpdateWirtschaftlichkeit={updateWirtschaftlichkeit}
            onResetWirtschaftlichkeit={resetWirtschaftlichkeit} />

          <Hintergruende k={k} />
        </Section>

        </div>{/* end left column */}

        {/* Sidebar — sticky right column on lg+; hidden on mobile (replaced by MobileResultsDrawer) */}
        <aside className="hidden lg:block print:hidden lg:sticky lg:top-[92px] lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto"
               style={{ scrollbarWidth: "thin", paddingBottom: 24, paddingTop: 20, paddingLeft: 24, paddingRight: 20, background: "var(--surface)", borderLeft: "1.25px solid var(--bdr)" }}>
          <div className="text-[9.5px] tracking-[0.18em] uppercase mb-3"
               style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>Ergebnis · Live</div>

          <ErgebnisUebersicht {...ergebnisProps} />
        </aside>

        </div>{/* end 2-col grid */}

      </main>

      <MobileResultsDrawer {...ergebnisProps} />

      <footer className="print-hide px-5 md:px-10" style={{ borderTop: "1px solid var(--bdr)", paddingTop: 32, paddingBottom: 32, marginTop: 40 }}>
        <div className="mx-auto max-w-[1400px] flex items-center justify-between flex-wrap gap-4 text-[11.5px]"
             style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.05em" }}>
          <span>Demonstrator · keine rechtsverbindliche Energieberatung</span>
          <span>Stand {DATENSTAND} · BEG + GEG · TABULA-Baseline</span>
        </div>
      </footer>

      {/* Print-Footer */}
      <div className="print-only" style={{ padding: "24px 40px", borderTop: "1px solid var(--bdr)", fontSize: 10, color: "var(--sec)", fontFamily: "'Geist Mono', monospace", textAlign: "center" }}>
        Demonstrator — kein BAFA-iSFP. Stand {DATENSTAND}.
      </div>
    </div>
  );
}
