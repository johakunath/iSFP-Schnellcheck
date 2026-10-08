import React, { useState } from "react";
import { FOERDERREGELN, FOERDERSTAND, SCORE_EMPFOHLEN_MAX, SCORE_NICHT_EMPFOHLEN_MIN, berechneSzenario, berechneHeizkosten, bezugsflaeche, preisFuerHeizung, traegerFuerHeizung, summiereMassnahmen } from "../data.js";
import { DATENSTAND } from "../kosten.js";
import { fmt, fmtEur } from "../helpers.jsx";

const fmtP = p => p.toFixed(2).replace(".", ",");
const fmtS = v => v.toFixed(1).replace(".", ",");

// Beispielrechnung aus der echten Rechenkette — kann nicht mehr veralten.
function beispielText() {
  const s = berechneSzenario({ presetId: "efhNachkrieg" });
  const { gebaeude, ist } = s.start;
  const { k } = s;
  const an = Math.round(bezugsflaeche(gebaeude));
  const hk = berechneHeizkosten(ist.endenergie, an, gebaeude.heizung_typ);
  const zeile = (id) => {
    const m = s.pakete.flatMap(p => p.massnahmen).find(x => x.id === id);
    if (!m || !s.aktive.includes(id)) return null;
    const f = summiereMassnahmen([m], gebaeude);
    return `${m.titel}:\n  Investition ${fmtEur(f.invest)}  ·  Förderung ca. ${fmtEur(f.foerderung)}`;
  };
  const co2Pct = Math.round((1 - k.co2 / ist.co2) * 100);
  return [
    `Haus: EFH ${gebaeude.baujahr} · ${gebaeude.wohnflaeche} m² · ${gebaeude.heizung_typ} · PE ${ist.primaerenergie} kWh/(m²·a)`,
    `IST-Heizkosten:  ${ist.endenergie} kWh/m² × ${an} m² AN × ${fmtP(preisFuerHeizung(gebaeude.heizung_typ))} €/kWh (${traegerFuerHeizung(gebaeude.heizung_typ)}) = ${fmt(hk)} €/Jahr`,
    "",
    zeile("M1"),
    zeile("M4"),
    "",
    "Gesamtfahrplan — Standardauswahl:",
    `  Endenergie ZIEL  ${k.endenergie} kWh/(m²·a)  →  Klasse ${k.effizienzklasse}  ·  Primärenergie ZIEL  ${k.primaerenergie} kWh/(m²·a)`,
    `  CO₂:  ${ist.co2} → ${k.co2} kg/(m²·a)  (−${co2Pct} %)`,
    `  ZIEL-Heizkosten: ${k.endenergie} × ${an} m² AN × ${fmtP(k.heizkosten_tarif)} €/kWh (${k.heizkosten_traeger}) = ${fmt(k.heizkosten_gesamt)} €/Jahr`,
    `  Investition ${fmtEur(k.invest_gesamt)}  ·  Förderung ${fmtEur(k.foerderung_gesamt)}  ·  Eigenanteil ${fmtEur(k.eigenanteil)}`,
  ].filter(z => z !== null).join("\n");
}

// ═══ HINTERGRÜNDE & ANNAHMEN (einklappbar) ═══════════════════════════════
const Hintergruende = ({ k }) => {
  const [offen, setOffen] = useState(false);
  return (
    <div className="mt-10 print-hide" style={{ border: "1.25px solid var(--bdr)", borderRadius: 3, background: "var(--surface2)" }}>
      <button onClick={() => setOffen(o => !o)} aria-expanded={offen}
        style={{ width: "100%", padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer",
                 display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="text-[11px] tracking-[0.22em] uppercase" style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>
          Hintergründe &amp; Annahmen
        </div>
        <span style={{ fontSize: 11, color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>
          {offen ? "▲ Schließen" : "▼ Details"}
        </span>
      </button>
      {offen && (
        <div style={{ borderTop: "1.25px solid var(--bdr)", padding: "16px 20px" }}>
          {/* Förderannahmen */}
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                        fontFamily: "'Geist Mono', monospace", color: "var(--acc)", marginBottom: 10 }}>
            Förderannahmen
            {k.invest_gesamt > 0 && (
              <span style={{ marginLeft: 10, color: "var(--pos)", fontWeight: 600 }}>
                {Math.round(k.foerderung_gesamt / k.invest_gesamt * 100)} %
              </span>
            )}
          </div>
          <div className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--sec)" }}>
            Diese Vorabschätzung nutzt vereinfachte Förderannahmen je Maßnahmentyp. Die konkrete Förderung wird in der Maßnahmenübersicht und Kostenaufstellung je Paket berücksichtigt.
          </div>
          <div className="space-y-2 mb-4">
            {[
              ["Gebäudehülle · Fenster · Optimierung", "BEG EM + iSFP-Bonus (Demo-Logik)"],
              ["Heizungstausch · Wärmepumpe", "vereinfachte KfW-/BEG-Annahme"],
              ["PV · Eigenstrom", "kein Direktzuschuss — Ertrag aus Eigenverbrauch (0,31 €/kWh) + Einspeisung (0,082 €/kWh EEG 2024)"],
            ].map(([cat, note], i) => (
              <div key={i} style={{ paddingBottom: 8, borderBottom: "1px solid var(--bdr)" }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--txt)", marginBottom: 1 }}>{cat}</div>
                <div style={{ fontSize: 11, color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>{note}</div>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--txt)" }}>Förderanteil (von Gesamtinvestition)</span>
            <span style={{ fontSize: 20, fontFamily: "'Fraunces', serif", color: "var(--pos)", fontVariantNumeric: "tabular-nums" }}>
              {k.invest_gesamt > 0
                ? `${Math.round(k.foerderung_gesamt / k.invest_gesamt * 100)} %`
                : "—"}
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--sec)", lineHeight: 1.5 }}>
            Keine Förderzusage. Förderdeckel, Eigentümerstatus, Bonuskombinationen, technische Mindestanforderungen und Antragspflichten müssen im echten Prozess geprüft werden.
          </div>

          {/* Wie funktioniert dieser Rechner */}
          {(() => {
            const Sub = ({ title, children }) => (
              <div style={{ marginBottom: 22 }}>
                <div className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>{title}</div>
                <div style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.65 }}>{children}</div>
              </div>
            );
            return (
              <div style={{ marginTop: 20, borderTop: "1px solid var(--div)", paddingTop: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                              fontFamily: "'Geist Mono', monospace", color: "var(--acc)", marginBottom: 16 }}>
                  Wie funktioniert dieser Rechner?
                </div>
                <Sub title="Was macht dieses Tool?">
                  Sie geben Gebäudedaten ein — Baujahr, Heizung, Wohnfläche, Bauteil-Zustand — und erhalten einen priorisierten Sanierungsfahrplan mit Energiekennzahlen, Kosten und BEG-Förderung. Das Tool ist kein BAFA-zertifizierter iSFP, sondern ein Demonstrator auf Basis realer Marktdaten 2026.
                </Sub>
                <Sub title="Woher kommen die Energiezahlen?">
                  <b>Endenergie</b> ist die dem Gebäude zugeführte Energie (Öl, Gas, Strom). Die Maßnahmen schätzen zuerst die Endenergie-Änderung. <b>Primärenergie</b> = Endenergie × Primärenergiefaktor nach GEG Anlage 4; <b>CO₂</b> = Endenergie × Emissionsfaktor nach GEG Anlage 9 (Faktoren aus dem GEG; seit 29.07.2026 gilt das GModG — Übernahme der Faktoren nicht geprüft). Die <b>Effizienzklasse A+–H</b> ergibt sich wie im Energieausweis aus der Endenergie je m² Nutzfläche A<sub>N</sub>. Alle Kennwerte und Heizkosten beziehen sich auf A<sub>N</sub>. Der BAFA-iSFP nutzt zusätzlich eine eigene Farbskala auf Primärenergie-Basis; die Primärenergie dient hier dem €/kWh-Ranking. Fernwärme nutzt Demo-Fallbackwerte, weil reale Energieausweise netzspezifische Faktoren verwenden.
                  <br /><br />
                  Für den Zielzustand werden PE und CO₂ nach jedem Paket neu aus der verbleibenden Endenergie und dem dann aktiven Energieträger berechnet. Bei Wärmepumpen-Szenarien wechselt der Ziel-Energieträger auf WP-Strom; bei Fernwärme bleiben die Werte bewusst als Demo-Fallback markiert, weil Netzbetreiber-Faktoren im echten Energieausweis abweichen können. Die kompakten CO₂-Hinweise an einzelnen Maßnahmen zeigen nur die grobe Richtung, nicht die verbindliche Endsumme.
                </Sub>
                <Sub title="Wie wird die Reihenfolge der Maßnahmen bestimmt?">
                  Jede Maßnahme erhält eine Punktzahl: Netto-Investition (ohne Sowieso-Anteil) ÷ jährlich eingesparte Primärenergie des ganzen Gebäudes [€/kWh PE]. Niedrig = wirtschaftlich sinnvoll. Die Pakete werden nach dieser Punktzahl sortiert und aktualisieren sich automatisch, wenn Sie Gebäudedaten oder Bauteil-Stufen ändern. Die <b>★ Empfohlen</b>-Markierung zeigt Maßnahmen mit Score unter {fmtS(SCORE_EMPFOHLEN_MAX)} €/kWh PE — besonders wirtschaftlich für Ihr Gebäude. <b>✕ Nicht empfohlen</b> kennzeichnet Maßnahmen mit Score über {fmtS(SCORE_NICHT_EMPFOHLEN_MIN)} €/kWh PE oder ohne messbaren Primärenergie-Effekt.
                </Sub>
                <Sub title="Wie werden die Förderungen berechnet?">
                      Stand: {FOERDERSTAND}. Förderfähig sind die Gesamtkosten der Maßnahme inkl. Umfeldmaßnahmen (Gerüst, Neueindeckung, Putz, Rückbau der Altanlage) — Sowieso-Kosten werden nicht abgezogen.
                      <br /><br />
                      <b>Gebäudehülle, Wärmeverteilung, Abgleich (BAFA)</b>: 15 %. Höchstgrenze {fmtEur(FOERDERREGELN.em.hoechstOhneIsfp)}, mit gefördertem iSFP {fmtEur(FOERDERREGELN.em.hoechstMitIsfp)} je Wohneinheit und Jahr. iSFP-Bonus +5 % nur auf den Teil über {fmtEur(FOERDERREGELN.em.isfpSchwelle)}.
                      <br /><br />
                      <b>Wärmepumpe (KfW 458)</b>: 30 % Grundförderung, Klimageschwindigkeitsbonus 16 % (Selbstnutzer; Öl-, Kohle-, Gasetagen-, Nachtspeicherheizung oder Gas/Biomasse ab 20 Jahren; sinkt je Halbjahr um 4 Punkte, ab Aug 2028 null), Einkommensbonus 40 / 30 / 10 %. Gedeckelt bei 70 % (80 % bis 30.000 € Einkommen). Förderfähige Kosten höchstens {fmtEur(FOERDERREGELN.heizung.hoechstStart)}, danach −750 € je Halbjahr. Kein iSFP-Bonus. Hybrid: nur der WP-Anteil.
                      <br /><br />
                      <b>Vereinfachungen</b>: jede Maßnahme zählt als eigener Antrag (Höchstgrenzen gelten real je Kalenderjahr), nur eine Wohneinheit, Bonus für besonders ineffiziente Gebäude (ab 2027) und Fachplanung/Baubegleitung (50 %) nicht berücksichtigt. Ihre Angaben unter „Förderannahmen“ steuern Boni und Antragszeitpunkt. Vor Antrag aktuelle Bedingungen bei KfW/BAFA prüfen.
                    </Sub>
                <Sub title="Beispielrechnung — EFH Nachkriegszeit 1965 (Standardauswahl, live berechnet)">
                      <pre style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--body)", margin: 0 }}>{beispielText()}</pre>
                    </Sub>
                <Sub title="Wie wird die Amortisation berechnet?">
                  <b>Gesamt-Amortisation</b> (Sidebar-KPI): Eigenanteil ÷ (IST-Heiz- und Wartungskosten − ZIEL-Heiz- und Wartungskosten + PV-Ertrag) bei statischen Energiepreisen. Der <b>Break-even</b> im 20-Jahr-Chart ist der Schnittpunkt der Kostenkurven inkl. Preissteigerung und liegt daher meist früher. Bei einer vollständigen Sanierung mit Wärmepumpe liegt die rechnerische Amortisation oft bei 30–50 Jahren — das ist ehrlich. Mit realistischer Energiepreissteigerung von 2–3 %/Jahr halbiert sich dieser Wert typisch auf 15–25 Jahre. <b>PV-Ertrag</b>: angenommen 10 kWp · 950 kWh/kWp. Eigenverbrauchsquote 35 % (ohne WP) bzw. 60 % (mit WP + Speicher). Eigenverbrauch bewertet zu 0,31 €/kWh (Haushaltstarif), Einspeisung zu 0,082 €/kWh (EEG 2024). Daraus ergibt sich ein Jahresertrag von ca. 1.330–2.020 €, Amortisation ~9–14 Jahre.
                </Sub>
                <Sub title="Wie wird die 20-Jahr-Bilanz gebildet?">
                  „Ohne Sanierung": 20 × aktuelle Heizkosten (IST) inkl. Wartung, mit Energiepreis-Eskalation. „Mit Sanierung": Eigenanteil + 20 × ZIEL-Betriebskosten, ebenfalls mit Eskalation. Die Eskalationsrate ist in den Overrides oben anpassbar — Standard: IST fossil 2,5 %/J, ZIEL Strom 2,0 %/J.
                </Sub>
                <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--sec)", fontStyle: "italic", lineHeight: 1.6 }}>
                  Kostenansätze sind derzeit undokumentierte bundesweite Annahmen (Stand {DATENSTAND}), siehe Kostenbasis je Maßnahme. Dieser Rechner ist ein Demonstrator und ersetzt keine zertifizierte iSFP-Beratung nach BAFA-Anforderungen.
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Hintergruende;
