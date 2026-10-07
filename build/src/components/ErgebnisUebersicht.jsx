import React, { useState } from "react";
import { EFFIZIENZ_FARBEN, PAKET_FARBEN } from "../data.js";
import { fmtEur } from "../helpers.jsx";
import { getWarum } from "../warum.js";
import { Tooltip, eekTextFarbe } from "./ui.jsx";

// ═══ ERGEBNIS-ÜBERSICHT ════════════════════════════════════════════════
// Gemeinsamer Inhalt für Desktop-Sidebar und Mobile-Drawer.
// w = berechneWirtschaftlichkeit(...), warumCtx = { bauteile_state, gebaeude, aktiveMassnahmen, wp }
export const ErgebnisUebersicht = ({ effizienzklasse, k, ist, heizkosten, w, wohnflaeche,
  reportSummaryPackages, empfohleneMassnahmen = [], nichtEmpfohleneMassnahmen = [], warumCtx, scrollToTab = () => {} }) => (
  <>
    {/* EEK comparison */}
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ flex: 1, background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3,
                    padding: "8px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--sec)",
                      fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", marginBottom: 6 }}>Heute</div>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 36, height: 36, background: EFFIZIENZ_FARBEN[effizienzklasse] || "#6B6259",
                      borderRadius: 3, fontSize: 18, fontWeight: 600, fontFamily: "'Fraunces', serif",
                      color: eekTextFarbe(effizienzklasse) }}>{effizienzklasse}</div>
      </div>
      <span style={{ fontSize: 22, color: "var(--acc)", flexShrink: 0 }}>→</span>
      <div style={{ flex: 1, background: EFFIZIENZ_FARBEN[k.effizienzklasse] || "#00843D",
                    border: "1.25px solid var(--txt)", borderRadius: 3, padding: "8px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", fontFamily: "'Geist Mono', monospace",
                      textTransform: "uppercase", marginBottom: 6,
                      color: eekTextFarbe(k.effizienzklasse) === "#FFFFFF" ? "rgba(248,245,239,0.75)" : "rgba(30,26,21,0.65)" }}>Ziel</div>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 36, height: 36, background: "var(--bg)",
                      borderRadius: 3, fontSize: 18, fontWeight: 600, fontFamily: "'Fraunces', serif",
                      color: EFFIZIENZ_FARBEN[k.effizienzklasse] || "#00843D" }}>{k.effizienzklasse}</div>
      </div>
    </div>

    {/* Paket-Übersicht */}
    <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: "10px 12px", marginBottom: 10 }}>
      <div className="text-[10.5px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>Paket-Übersicht</div>
      {reportSummaryPackages.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--sec)" }}>Noch keine Maßnahmen aktiv.</div>
      ) : reportSummaryPackages.map((pkg, idx) => (
        <div key={pkg.id} style={{ padding: "8px 0", borderBottom: idx < reportSummaryPackages.length - 1 ? "1px solid var(--div)" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: PAKET_FARBEN[pkg.farbe]?.bg || "#6B6259", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "var(--txt)", fontWeight: 500 }}>Paket {pkg.nummer} · {pkg.titel}</span>
            </div>
            <span style={{ fontSize: 10.5, fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>{fmtEur(pkg.kosten)}</span>
          </div>
          <div style={{ paddingLeft: 16 }}>
            {pkg.massnahmen_aktiv_obj.map(m => {
              const istEmpf = empfohleneMassnahmen.includes(m.id);
              const istNichtEmpf = nichtEmpfohleneMassnahmen.includes(m.id) && !istEmpf;
              const warum = getWarum(m.id, { ...warumCtx, empfohlen: istEmpf, nichtEmpfohlen: istNichtEmpf });
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5, minHeight: 22, marginBottom: 1 }}>
                  <button type="button"
                        onClick={() => scrollToTab(`paket-${pkg.id}`)}
                        style={{ fontSize: 11, color: "var(--body)", cursor: "pointer", flex: 1, textAlign: "left",
                                 background: "none", border: "none", padding: 0, font: "inherit" }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                      >{m.kurztitel}</button>
                  {istEmpf && (
                    <Tooltip content={<span><b>Warum empfohlen:</b><br />{warum.grund}</span>}>
                      <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 2, background: "#F6D400", color: "#1E1A15", fontFamily: "'Geist Mono', monospace", fontWeight: 600, flexShrink: 0 }}>★</span>
                    </Tooltip>
                  )}
                  {istNichtEmpf && (
                    <Tooltip content={<span><b>Wirtschaftlichkeit gering:</b><br />{warum.jetzt}</span>}>
                      <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 2, background: "var(--div)", color: "var(--sec)", fontFamily: "'Geist Mono', monospace", fontWeight: 600, flexShrink: 0 }}>✕</span>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    {/* KPI Scorecards 2×2 */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
      {[
        { label: "Primärenergie", istVal: ist.primaerenergie, zielVal: k.primaerenergie, unit: "kWh/(m²·a)", posColor: "var(--pos)" },
        { label: "Endenergie",    istVal: ist.endenergie,     zielVal: k.endenergie,     unit: "kWh/(m²·a)", posColor: "var(--pos)" },
        { label: "CO₂",          istVal: ist.co2,            zielVal: k.co2,            unit: "kg/(m²·a)",  posColor: "var(--pos)" },
        { label: "Heizkosten",   istVal: heizkosten,          zielVal: k.heizkosten_gesamt, unit: "€/a",    posColor: "var(--gold)" },
      ].map(({ label, istVal, zielVal, unit, posColor }) => {
        const pct = istVal > 0 ? Math.round(Math.abs(zielVal - istVal) / istVal * 100) : 0;
        const down = zielVal < istVal;
        const fill = istVal > 0 ? Math.round(Math.min(zielVal / istVal, 1) * 100) : 0;
        const fmtV = n => unit === "€/a" ? fmtEur(n) : new Intl.NumberFormat("de-DE").format(Math.round(n));
        const barColor = down ? posColor : "var(--neg)";
        return (
          <div key={label} style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)",
                                    borderRadius: 3, padding: "10px 11px" }}>
            <div style={{ fontSize: 8, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.14em",
                          textTransform: "uppercase", color: "var(--sec)", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 19, fontWeight: 600, fontFamily: "'Geist Mono', monospace",
                          color: down ? posColor : "var(--neg)", marginBottom: 4, lineHeight: 1 }}>
              {down ? "−" : "+"}{pct}%
            </div>
            <div style={{ height: 4, background: "var(--div)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
              <div style={{ height: "100%", width: `${fill}%`, background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 8.5, fontFamily: "'Geist Mono', monospace", color: "var(--sec)", lineHeight: 1.3 }}>
              {fmtV(istVal)} → {fmtV(zielVal)} {unit}
            </div>
          </div>
        );
      })}
    </div>

    {/* Amortisation + PE-Ausbeute — sidebar */}
    {k.eigenanteil > 0 && (() => {
          const annualSaving = Math.round(w.jaehrlicheEinsparung);
          const amortYears = annualSaving > 0 ? Math.round(k.eigenanteil / annualSaving) : null;
          const peSavedTotal = Math.round((ist.primaerenergie - k.primaerenergie) * (wohnflaeche ?? 0));
          const peAusbeute = peSavedTotal > 0 ? Math.round(peSavedTotal / k.eigenanteil * 1000) : null;
          if (!amortYears && !peAusbeute) return null;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {amortYears ? (
            <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)",
                          borderRadius: 3, padding: "10px 11px" }}>
              <div style={{ fontSize: 8, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.14em",
                            textTransform: "uppercase", color: "var(--sec)", marginBottom: 3 }}>Amortisation</div>
              <div style={{ fontSize: 19, fontWeight: 600, fontFamily: "'Geist Mono', monospace",
                            color: "var(--gold)", marginBottom: 4, lineHeight: 1 }}>~{amortYears} J</div>
              <div style={{ height: 4, background: "var(--div)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ height: "100%", width: `${Math.min(Math.round(20 / amortYears * 100), 100)}%`,
                              background: amortYears <= 20 ? "var(--pos)" : "var(--gold)", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 8.5, fontFamily: "'Geist Mono', monospace", color: "var(--sec)", lineHeight: 1.3 }}>
                {fmtEur(k.eigenanteil)} / {fmtEur(annualSaving)}/J
              </div>
            </div>
          ) : <div />}
          {peAusbeute ? (
            <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)",
                          borderRadius: 3, padding: "10px 11px" }}>
              <div style={{ fontSize: 8, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.14em",
                            textTransform: "uppercase", color: "var(--sec)", marginBottom: 3 }}>PE-Ausbeute</div>
              <div style={{ fontSize: 19, fontWeight: 600, fontFamily: "'Geist Mono', monospace",
                            color: "var(--pos)", marginBottom: 8, lineHeight: 1 }}>{peAusbeute}</div>
              <div style={{ fontSize: 8.5, fontFamily: "'Geist Mono', monospace", color: "var(--sec)", lineHeight: 1.3 }}>
                kWh PE / 1.000 € · {new Intl.NumberFormat("de-DE").format(peSavedTotal)} kWh/a
              </div>
            </div>
          ) : <div />}
        </div>
      );
    })()}

    {/* Investment summary */}
    <div style={{ background: "var(--bg)", border: "1px solid var(--bdr)",
                  borderRadius: 3, padding: "10px 12px", fontSize: 12 }}>
      <div className="flex justify-between mb-1.5" style={{ color: "var(--body)" }}>
        <span>Investition</span>
        <span style={{ fontFamily: "'Geist Mono', monospace" }}>{fmtEur(k.invest_gesamt)}</span>
      </div>
      <div className="flex justify-between mb-1.5" style={{ color: "var(--pos)" }}>
        <span>Förderung</span>
        <span style={{ fontFamily: "'Geist Mono', monospace" }}>−{fmtEur(k.foerderung_gesamt)}</span>
      </div>
      <div className="flex justify-between font-medium"
           style={{ color: "var(--txt)", marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--bdr)" }}>
        <span>Eigenanteil</span>
            <span style={{ fontFamily: "'Geist Mono', monospace" }}>{fmtEur(k.eigenanteil)}</span>
          </div>
          {k.modernisierung_invest > 0 && (
            <>
              <div className="flex justify-between mt-2" style={{ color: "var(--body)" }}>
                <span>Weitere Modernisierung</span>
                <span style={{ fontFamily: "'Geist Mono', monospace" }}>{fmtEur(k.modernisierung_eigenanteil)}</span>
              </div>
              <div className="flex justify-between font-medium"
                   style={{ color: "var(--txt)", marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--bdr)" }}>
                <span>Gesamtbudget</span>
                <span style={{ fontFamily: "'Geist Mono', monospace" }}>{fmtEur(k.eigenanteil + k.modernisierung_eigenanteil)}</span>
              </div>
            </>
          )}
        </div>
  </>
);

// ═══ MOBILE RESULTS DRAWER ═════════════════════════════════════════════
export const MobileResultsDrawer = (props) => {
  const { effizienzklasse, k, ist } = props;
  const [open, setOpen] = useState(false);
  const peReduction = ist.primaerenergie > 0 ? Math.round((1 - k.primaerenergie / ist.primaerenergie) * 100) : 0;
  const zielColor = EFFIZIENZ_FARBEN[k.effizienzklasse] || "#00843D";
  const istColor  = EFFIZIENZ_FARBEN[effizienzklasse]   || "#6B6259";
  const zielText  = eekTextFarbe(k.effizienzklasse);
  const istText   = eekTextFarbe(effizienzklasse);

  return (
    <div className="flex flex-col lg:hidden print:hidden" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
      transform: open ? "translateY(0)" : "translateY(calc(100% - 68px))",
      transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      maxHeight: "75vh",
      background: "var(--bg)",
      borderTop: "1.5px solid var(--bdr)",
      borderRadius: "12px 12px 0 0",
      boxShadow: "0 -6px 32px rgba(0,0,0,0.18)",
    }}>
      {/* Collapsed handle strip — always visible, tappable */}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? "Ergebnis einklappen" : "Ergebnis ausklappen"} style={{
        width: "100%", padding: "6px 16px 10px", background: "transparent", border: "none",
        cursor: "pointer", flexShrink: 0, textAlign: "left",
      }}>
        <div style={{ width: 36, height: 4, background: "var(--bdr)", borderRadius: 2, margin: "0 auto 8px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* EEK IST → ZIEL */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, background: istColor, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif", color: istText }}>{effizienzklasse}</div>
            <span style={{ fontSize: 13, color: "var(--acc)" }}>→</span>
            <div style={{ width: 30, height: 30, background: zielColor, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif", color: zielText }}>{k.effizienzklasse}</div>
          </div>
          {/* Key numbers */}
          <div style={{ flex: 1, display: "flex", gap: 14, fontSize: 11, fontFamily: "'Geist Mono', monospace", color: "var(--body)", flexWrap: "wrap" }}>
            <span style={{ color: "var(--pos)", fontWeight: 600 }}>PE −{peReduction} %</span>
            <span>Eigenanteil {fmtEur(k.eigenanteil)}</span>
          </div>
          <span style={{ fontSize: 10, color: "var(--sec)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.28s", flexShrink: 0 }}>▼</span>
        </div>
      </button>

      {/* Expanded scrollable content */}
      <div style={{ overflowY: "auto", padding: "4px 16px 32px", flex: 1, scrollbarWidth: "thin" }}>
        <div className="text-[9.5px] tracking-[0.18em] uppercase mb-3"
             style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>Ergebnis · Live</div>

        <ErgebnisUebersicht {...props} />
      </div>
    </div>
  );
};
