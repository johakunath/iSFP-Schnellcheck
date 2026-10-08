import React from "react";
import {
  EFFIZIENZ_FARBEN, PAKET_FARBEN, berechneEffizienzklasse, bezugsflaeche, preisFuerHeizung, traegerFuerHeizung, berechnePvErtrag,
} from "../data.js";
import { fmt, fmtEur } from "../helpers.jsx";
import { Tooltip, InfoIcon, EffizienzBadge, valueStyle, eekTextFarbe } from "./ui.jsx";

export const VorherNachher = ({ ist, k, heizkostenIst, gebaeude }) => {
  const istTarif   = preisFuerHeizung(gebaeude.heizung_typ);
  const istTraeger = traegerFuerHeizung(gebaeude.heizung_typ);
  const fmtN       = n => new Intl.NumberFormat("de-DE").format(Math.round(n));
  const fmtP       = p => p.toFixed(2).replace(".", ",");

  const istTooltip = (
    <span>
      <b>Berechnung IST:</b><br />
      {fmtN(ist.endenergie)} kWh/m² × {fmtN(bezugsflaeche(gebaeude))} m² AN<br />
      × {fmtP(istTarif)} €/kWh ({istTraeger})<br />
      = <b>{fmtN(heizkostenIst)} €/Jahr</b>
    </span>
  );
  const higher = k.heizkosten_gesamt > heizkostenIst;
  const zielTooltip = (
    <span>
      <b>Berechnung ZIEL:</b><br />
      {fmtN(k.endenergie)} kWh/m² × {fmtN(bezugsflaeche(gebaeude))} m² AN<br />
      × {fmtP(k.heizkosten_tarif)} €/kWh ({k.heizkosten_traeger})<br />
      = <b>{fmtN(k.heizkosten_gesamt)} €/Jahr</b>
      {higher && <><br /><span style={{ color: "var(--acc)" }}>Höher als IST: WP-Stromtarif ({fmtP(k.heizkosten_tarif)} €/kWh) ist teurer als {istTraeger} ({fmtP(istTarif)} €/kWh), aber Endenergie sinkt stark — Hüllsanierung würde dies korrigieren.</span></>}
    </span>
  );

  const stdRows = (rows, border) => rows.map((r, i) => (
    <div key={i} className="flex items-baseline justify-between gap-3"
         style={{ padding: "9px 0", borderBottom: i < rows.length - 1 ? border : "none", fontSize: 13 }}>
      <span style={{ color: "var(--body)" }}>{r[0]}</span>
      <span style={valueStyle}>
        {r[1]}<span style={{ fontSize: 12, color: "var(--sec)", marginLeft: 4 }}>{r[2]}</span>
      </span>
    </div>
  ));

  const dark = eekTextFarbe(k.effizienzklasse) !== "#FFFFFF";

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-6 items-center">
      {/* IST */}
      <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: "28px 26px" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[11px] tracking-[0.22em] uppercase" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>Heute</div>
          <EffizienzBadge klasse={berechneEffizienzklasse(ist.endenergie)} size="md" />
        </div>
        <div className="space-y-3">
          {stdRows([
            ["Endenergie",    ist.endenergie,    "kWh/(m²·a)"],
            ["Primärenergie", ist.primaerenergie, "kWh/(m²·a)"],
            ["CO₂-Emissionen",ist.co2,            "kg/(m²·a)"],
          ], "1px solid #E2DBD0")}
          <div className="flex items-baseline justify-between gap-3" style={{ padding: "9px 0", fontSize: 13 }}>
            <span style={{ color: "var(--body)" }}>Heizkosten gesamt</span>
            <span style={valueStyle}>
              {fmt(heizkostenIst)}
              <span style={{ fontSize: 12, color: "var(--sec)", marginLeft: 4 }}>€/a</span>
              <Tooltip content={istTooltip}>
                <span style={{ marginLeft: 5, verticalAlign: "middle", color: "var(--acc)", cursor: "help" }}><InfoIcon size={11} /></span>
              </Tooltip>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <span className="font-serif text-[28px]" style={{ color: "var(--acc)" }}>→</span>
        <span className="text-[10.5px] tracking-[0.22em] uppercase" style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>Sanierungsfahrplan</span>
      </div>

      {/* ZIEL */}
      <div style={{ background: EFFIZIENZ_FARBEN[k.effizienzklasse] || "#00843D", border: "1.25px solid var(--txt)", borderRadius: 3, padding: "28px 26px", color: dark ? "#1E1A15" : "#F8F5EF" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[11px] tracking-[0.22em] uppercase" style={{ color: dark ? "rgba(30,26,21,0.65)" : "rgba(248,245,239,0.75)", fontFamily: "'Geist Mono', monospace" }}>Ihr Haus in der Zukunft</div>
          <div className="inline-flex items-center justify-center font-serif"
               style={{ width: 60, height: 60, background: "var(--bg)", color: EFFIZIENZ_FARBEN[k.effizienzklasse], borderRadius: 3, fontSize: 28, fontWeight: 500 }}>{k.effizienzklasse}</div>
        </div>
        <div className="space-y-3">
          {[
            ["Endenergie",    k.endenergie,    "kWh/(m²·a)"],
            ["Primärenergie", k.primaerenergie, "kWh/(m²·a)"],
            ["CO₂-Emissionen",k.co2,            "kg/(m²·a)"],
          ].map((r, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3"
                 style={{ padding: "9px 0", borderBottom: `1px solid ${dark ? "rgba(30,26,21,0.18)" : "rgba(248,245,239,0.18)"}`, fontSize: 13 }}>
              <span>{r[0]}</span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontVariantNumeric: "tabular-nums", fontSize: 14 }}>
                {r[1]}<span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>{r[2]}</span>
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3" style={{ padding: "9px 0", fontSize: 13 }}>
            <span>Heizkosten gesamt</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontVariantNumeric: "tabular-nums", fontSize: 14 }}>
              {fmt(k.heizkosten_gesamt)}
              <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>€/a</span>
              <Tooltip content={zielTooltip}>
                <span style={{ marginLeft: 5, verticalAlign: "middle", opacity: 0.75, cursor: "help" }}><InfoIcon size={11} /></span>
              </Tooltip>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DeltaKPI = ({ label, vorher, nachher, unit }) => {
  const delta = nachher - vorher;
  const pct = vorher > 0 ? Math.round(Math.abs(delta) / vorher * 100) : 0;
  return (
    <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: "22px 24px" }}>
      <div className="text-[11px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>{label}</div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-serif" style={{ fontSize: 34, fontWeight: 500, color: "var(--txt)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          −{pct}%
        </span>
        <span className="text-[12px]" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>
          {fmt(vorher)}{unit && ` ${unit}`} → {fmt(nachher)}{unit && ` ${unit}`}
        </span>
      </div>
    </div>
  );
};

// ═══ EEK ARROW SCALE ═══════════════════════════════════════════════════
const EEK_ARROW_FARBEN = {
  "H":  { bg: "#8B1A14", txt: "#fff" },
  "G":  { bg: "#B83A2E", txt: "#fff" },
  "F":  { bg: "#B83A2E", txt: "#fff" },
  "E":  { bg: "#C8820A", txt: "#fff" },
  "D":  { bg: "#C8820A", txt: "#1E1A15" },
  "C":  { bg: "#6B9E1F", txt: "#fff" },
  "B":  { bg: "#1B6B3A", txt: "#fff" },
  "A":  { bg: "#1B6B3A", txt: "#fff" },
  "A+": { bg: "#1B6B3A", txt: "#fff" },
};
const EEK_CLASSES = ["H","G","F","E","D","C","B","A","A+"];

export const EekArrowScale = ({ istKlasse, zielKlasse, istPe, zielPe }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                  fontFamily: "'Geist Mono', monospace", color: "var(--acc)", marginBottom: 10 }}>
      Energieeffizienzklasse · Heute → Ziel
    </div>
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
      {EEK_CLASSES.map(cls => {
        const isIst  = cls === istKlasse;
        const isZiel = cls === zielKlasse;
        const active = isIst || isZiel;
        const { bg, txt } = EEK_ARROW_FARBEN[cls] || { bg: "#6B6259", txt: "#fff" };
        return (
          <div key={cls} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: "100%", height: active ? 38 : 24,
              background: bg,
              opacity: active ? 1 : 0.3,
              clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: active ? 13 : 10, fontWeight: 600,
              fontFamily: "'Fraunces', Georgia, serif", color: txt,
              outline: isIst ? "2.5px solid var(--txt)" : isZiel ? "2.5px solid var(--pos)" : "none",
              outlineOffset: 1,
              transition: "height 0.2s, opacity 0.2s",
            }}>{cls}</div>
            {(isIst || isZiel) && (
              <div style={{ fontSize: 8, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.06em",
                            textTransform: "uppercase", textAlign: "center", lineHeight: 1.4,
                            marginTop: 4, color: isZiel ? "var(--pos)" : "var(--sec)",
                            whiteSpace: "pre-line" }}>
                {isIst ? `Heute\n${istPe}` : `Ziel\n${zielPe}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// ═══ SCHRITT-TABELLE (Energie + Kosten pro Paket) ═══════════════════════
export const MergedTable = ({ kumuliert, ist, heizkosten = 0 }) => {
  const maxEE = ist.endenergie || 1;
  const maxPE = ist.primaerenergie || 1;
  const maxCO2 = ist.co2 || 1;

  const totalInvest = kumuliert.length ? kumuliert[kumuliert.length - 1].nachher.invest_gesamt : 0;
  const totalFoerd  = kumuliert.length ? kumuliert[kumuliert.length - 1].nachher.foerderung_gesamt : 0;

  return (
    <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: "24px 28px" }}>
      <div className="text-[11px] tracking-[0.22em] uppercase mb-4 flex items-center gap-2"
           style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>
        Kumulierte Wirkung pro Paket
        <Tooltip content="BAFA-Logik: jedes Paket wird auf dem Ergebnis des vorigen aufbauend berechnet. Zeigt den Fortschritt Schritt für Schritt.">
          <span><InfoIcon size={11} /></span>
        </Tooltip>
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table className="w-full text-[12.5px]" style={{ fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr style={{ borderBottom: "1.25px solid var(--txt)" }}>
            <th className="text-left py-2.5 font-medium" style={{ width: 180 }}>Schritt</th>
            <th className="text-right py-2.5 font-medium">
              <Tooltip content="Gelieferte Energie in kWh pro m² Nutzfläche AN und Jahr. Basis für die Effizienzklasse (wie im Energieausweis).">
                <span style={{ color: "var(--acc)", display: "inline-flex", verticalAlign: "middle" }}><InfoIcon size={11} /></span><span style={{ marginLeft: 5 }}>Endenergie</span>
              </Tooltip>
            </th>
            <th className="text-right py-2.5 font-medium">
              <Tooltip content="Gesamtenergieeinsatz inkl. Vorkette. Basis für das €/kWh-Ranking der Maßnahmen.">
                <span style={{ color: "var(--acc)", display: "inline-flex", verticalAlign: "middle" }}><InfoIcon size={11} /></span><span style={{ marginLeft: 5 }}>Primärenergie</span>
              </Tooltip>
            </th>
            <th className="text-right py-2.5 font-medium">
              <Tooltip content="CO₂-Emissionen in kg pro m² und Jahr.">
                <span style={{ color: "var(--acc)", display: "inline-flex", verticalAlign: "middle" }}><InfoIcon size={11} /></span><span style={{ marginLeft: 5 }}>CO₂</span>
              </Tooltip>
            </th>
            <th className="text-right py-2.5 font-medium">Klasse</th>
            <th className="text-right py-2.5 font-medium">
              <Tooltip content="Investitionskosten für diesen Sanierungsschritt.">
                <span style={{ color: "var(--acc)", display: "inline-flex", verticalAlign: "middle" }}><InfoIcon size={11} /></span><span style={{ marginLeft: 5 }}>Invest</span>
              </Tooltip>
            </th>
            <th className="text-right py-2.5 font-medium">Förderung</th>
            <th className="text-right py-2.5 font-medium">Eigenanteil</th>
            <th className="text-right py-2.5 font-medium">
              <Tooltip content="Eigenanteil ÷ jährliche Nettoeinsparung (Energie + PV). Statische Preise.">
                <span style={{ color: "var(--acc)", display: "inline-flex", verticalAlign: "middle" }}><InfoIcon size={11} /></span><span style={{ marginLeft: 5 }}>Amortis.</span>
              </Tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--div)", background: "var(--surface2)" }}>
            <td className="py-2.5" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span className="text-[11px] tracking-[0.18em] uppercase mr-2" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>0</span>
              Ausgangszustand
            </td>
            <td className="text-right py-2.5">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span style={{ fontFamily: "'Geist Mono', monospace" }}>{ist.endenergie}</span>
                <div style={{ width: 40, height: 3, background: "var(--div)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: "100%", background: EFFIZIENZ_FARBEN[berechneEffizienzklasse(ist.endenergie)] || "var(--sec)", borderRadius: 2 }} />
                </div>
              </div>
            </td>
            <td className="text-right py-2.5">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span style={{ fontFamily: "'Geist Mono', monospace" }}>{ist.primaerenergie}</span>
                <div style={{ width: 40, height: 3, background: "var(--div)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: "100%", background: EFFIZIENZ_FARBEN[berechneEffizienzklasse(ist.endenergie)] || "var(--sec)", borderRadius: 2 }} />
                </div>
              </div>
            </td>
            <td className="text-right py-2.5">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span style={{ fontFamily: "'Geist Mono', monospace" }}>{ist.co2}</span>
                <div style={{ width: 40, height: 3, background: "var(--div)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: "100%", background: EFFIZIENZ_FARBEN[berechneEffizienzklasse(ist.endenergie)] || "var(--sec)", borderRadius: 2 }} />
                </div>
              </div>
            </td>
            <td className="text-right py-2.5">
              <EffizienzBadge klasse={berechneEffizienzklasse(ist.endenergie)} size="sm" />
            </td>
            <td className="text-right py-2.5" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>—</td>
            <td className="text-right py-2.5" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>—</td>
            <td className="text-right py-2.5" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>—</td>
            <td className="text-right py-2.5" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>—</td>
          </tr>
          {kumuliert.map((r, i) => {
            const prevInvest = i === 0 ? 0 : kumuliert[i-1].nachher.invest_gesamt;
            const prevFoerd  = i === 0 ? 0 : kumuliert[i-1].nachher.foerderung_gesamt;
            const stepInvest = r.nachher.invest_gesamt - prevInvest;
            const stepFoerd  = r.nachher.foerderung_gesamt - prevFoerd;
            const stepEigen  = stepInvest - stepFoerd;
            const prevHK = i === 0 ? heizkosten : kumuliert[i-1].nachher.heizkosten_gesamt;
            const energySaving = prevHK - r.nachher.heizkosten_gesamt;
            const hasPVStep = r.paket.massnahmen.some(m => m.id === "M6");
            const mitWPStep = kumuliert.slice(0, i+1).some(s => s.paket.massnahmen.some(m => m.id === "M4"));
            const pvRev = hasPVStep ? berechnePvErtrag(mitWPStep).gesamtEur : 0;
            const annualSavingStep = energySaving + pvRev;
            const amortYears = annualSavingStep > 0 && stepEigen > 0 ? Math.round(stepEigen / annualSavingStep) : null;
            const barColor = EFFIZIENZ_FARBEN[r.nachher.effizienzklasse] || "var(--sec)";
            const eeW = Math.round(Math.min(r.nachher.endenergie / maxEE, 1) * 100);
            const peW = Math.round(Math.min(r.nachher.primaerenergie / maxPE, 1) * 100);
            const coW = Math.round(Math.min(r.nachher.co2 / maxCO2, 1) * 100);
            return (
              <tr key={r.paket.id} style={{ borderBottom: i < kumuliert.length - 1 ? "1px solid var(--div)" : "none" }}>
                <td className="py-2.5" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: 100, background: PAKET_FARBEN[r.paket.farbe]?.bg, display: "inline-block", flexShrink: 0 }} />
                    <span className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>P{r.paket.nummer}</span>
                    <span style={{ color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis" }}>{r.paket.titel}</span>
                  </div>
                </td>
                <td className="text-right py-2.5">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    <span style={{ fontFamily: "'Geist Mono', monospace" }}>{r.nachher.endenergie}</span>
                    <div style={{ width: 40, height: 3, background: "var(--div)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${eeW}%`, background: barColor, borderRadius: 2 }} />
                    </div>
                  </div>
                </td>
                <td className="text-right py-2.5">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    <span style={{ fontFamily: "'Geist Mono', monospace" }}>{r.nachher.primaerenergie}</span>
                    <div style={{ width: 40, height: 3, background: "var(--div)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${peW}%`, background: barColor, borderRadius: 2 }} />
                    </div>
                  </div>
                </td>
                <td className="text-right py-2.5">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    <span style={{ fontFamily: "'Geist Mono', monospace" }}>{r.nachher.co2}</span>
                    <div style={{ width: 40, height: 3, background: "var(--div)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${coW}%`, background: barColor, borderRadius: 2 }} />
                    </div>
                  </div>
                </td>
                <td className="text-right py-2.5">
                  <EffizienzBadge klasse={r.nachher.effizienzklasse} size="sm" />
                </td>
                <td className="text-right py-2.5" style={{ fontFamily: "'Geist Mono', monospace" }}>{stepInvest > 0 ? fmtEur(stepInvest) : "—"}</td>
                <td className="text-right py-2.5" style={{ fontFamily: "'Geist Mono', monospace", color: stepFoerd > 0 ? "var(--pos)" : "var(--sec)" }}>
                  {stepFoerd > 0 ? `−${fmtEur(stepFoerd)}` : "—"}
                </td>
                <td className="text-right py-2.5" style={{ fontFamily: "'Geist Mono', monospace" }}>{stepEigen > 0 ? fmtEur(stepEigen) : "—"}</td>
                <td className="text-right py-2.5" style={{ fontFamily: "'Geist Mono', monospace", color: amortYears ? (amortYears <= 20 ? "var(--pos)" : "var(--gold)") : "var(--sec)" }}>
                  {amortYears ? `~${amortYears} J` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "1.5px solid var(--txt)", background: "var(--surface2)" }}>
            <td className="py-2.5 font-medium" colSpan={5}>Gesamt</td>
            <td className="text-right py-2.5 font-medium" style={{ fontFamily: "'Geist Mono', monospace" }}>{fmtEur(totalInvest)}</td>
            <td className="text-right py-2.5 font-medium" style={{ fontFamily: "'Geist Mono', monospace", color: totalFoerd > 0 ? "var(--pos)" : "var(--sec)" }}>
              {totalFoerd > 0 ? `−${fmtEur(totalFoerd)}` : "—"}
            </td>
            <td className="text-right py-2.5 font-medium" style={{ fontFamily: "'Geist Mono', monospace" }}>{fmtEur(totalInvest - totalFoerd)}</td>
            <td className="text-right py-2.5" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>—</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
};
