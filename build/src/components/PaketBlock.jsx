import React, { useState } from "react";
import {
  WP_VARIANTEN, BAD_STANDARDS, BAD_DEFAULT, berechneFoerderung, summiereMassnahmen, berechnePvErtrag, istEnergetisch,
} from "../data.js";
import { KOSTENANSAETZE, kostenStatusText } from "../kosten.js";
import { fmtEur } from "../helpers.jsx";
import { getWarum } from "../warum.js";
import { PaketHaus, Tooltip, InfoIcon } from "./ui.jsx";

// wp = bestimmeWpVariante-Ergebnis (key, autoKey, vorlauftemp, envAvg)
const PaketBlock = ({ paket, aktiv, onToggle, onToggleMassnahme = () => {}, aktiveMassnahmen, empfohleneMassnahmen = [], nichtEmpfohleneMassnahmen = [], gebaeude = {}, bauteile_state = {}, wp, onWpVarianteChange = () => {}, onGebaeudeChange = () => {} }) => {
  const aktiveMassnahmenInPaket = paket.massnahmen.filter(massnahme => aktiveMassnahmen.includes(massnahme.id));
  const summen        = summiereMassnahmen(aktiveMassnahmenInPaket, gebaeude);
  const summe_invest  = summen.invest;
  const summe_foerder = summen.foerderung;
  const eigenanteil   = summen.eigenanteil;
  const foerderPct    = summen.foerderfaehig > 0 ? Math.round(summe_foerder / summen.foerderfaehig * 100) : 0;
  const firstM        = aktiveMassnahmenInPaket[0];
  const [warumOffen, setWarumOffen] = useState(new Set());
  const toggleWarum = mid => setWarumOffen(prev => { const s = new Set(prev); s.has(mid) ? s.delete(mid) : s.add(mid); return s; });
  const [vorOrtOffen, setVorOrtOffen] = useState(false);

  return (
    <div id={`paket-${paket.id}`} className="transition-all" style={{
      background: "var(--surface)",
      border: aktiv ? "1.75px solid var(--txt)" : "1.25px solid var(--bdr)",
      borderRadius: 3, overflow: "hidden", opacity: aktiv ? 1 : 0.55,
    }}>
      <div className="flex items-stretch">
        <div className="flex items-center justify-center shrink-0" style={{ width: 88, background: "var(--bg)", borderRight: "1.25px solid var(--bdr)" }}>
          <PaketHaus farbe={paket.farbe} aktiv={aktiv} nummer={paket.nummer} size={62} />
        </div>
        <div className="flex-1 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>
                Paket {paket.nummer}
              </span>
            </div>
            <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 500, color: "var(--txt)" }}>{paket.titel}</h3>
          </div>
          <button onClick={onToggle} className="flex items-center gap-2.5 transition print-hide" aria-pressed={aktiv}
            style={{ padding: "8px 16px",
                     border: `1.25px solid ${aktiv ? "var(--txt)" : "var(--bdr)"}`, borderRadius: 3,
                     background: aktiv ? "var(--txt)" : "transparent",
                     color: aktiv ? "var(--bg)" : "var(--body)",
                     fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
            <span className="inline-block relative" style={{
              width: 14, height: 14, borderRadius: 2,
              background: aktiv ? "var(--bg)" : "transparent",
              border: aktiv ? "none" : "1.25px solid var(--sec)",
            }}>
              {aktiv && (
                <svg viewBox="0 0 14 14" width="14" height="14" style={{ position: "absolute", top: 0, left: 0 }}>
                  <path d="M3 7.5 L6 10.5 L11 4.5" stroke="var(--txt)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            {aktiv ? "Im Fahrplan" : "Ausgeblendet"}
          </button>
        </div>
      </div>

      <div>
        {paket.massnahmen.map((massnahme, i) => {
          const massnahmeAktiv = aktiveMassnahmen.includes(massnahme.id);
          const warum = getWarum(massnahme.id, {
            bauteile_state, gebaeude, aktiveMassnahmen, wp,
            empfohlen: empfohleneMassnahmen.includes(massnahme.id),
            nichtEmpfohlen: nichtEmpfohleneMassnahmen.includes(massnahme.id),
          });
          const foerderung = berechneFoerderung(massnahme, gebaeude);
          const kostenansatz = KOSTENANSAETZE[massnahme.kostenansatz];
          return (
          <div key={massnahme.id} className="p-5" style={{ borderBottom: i < paket.massnahmen.length - 1 ? "1px solid #E2DBD0" : "none", opacity: massnahmeAktiv ? 1 : 0.45, transition: "opacity 0.15s" }}>
            <div className="mb-4">
              <div className="mb-1.5" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                <div className="text-[14.5px] font-medium flex items-center gap-2 flex-wrap" style={{ color: "var(--txt)", flex: 1 }}>
                <label className="print-hide" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "var(--sec)", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.05em" }}>
                  <input type="checkbox" checked={massnahmeAktiv} onChange={() => onToggleMassnahme(massnahme.id)}
                    aria-label={`${massnahme.titel} in den Fahrplan aufnehmen`}
                    style={{ accentColor: "#2A8B7A", width: 14, height: 14, cursor: "pointer" }} />
                </label>
                <span style={{ textDecoration: aktiv && !massnahmeAktiv ? "line-through" : "none" }}>{massnahme.titel}</span>
                {massnahme._isMovedAbgleich && (
                  <span style={{ background: "var(--info-bg)", color: "var(--info-txt)", border: "1px solid var(--info-bdr)", padding: "1px 8px", borderRadius: 100, fontSize: 10, fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
                    Pflicht nach BEG
                  </span>
                )}
                {empfohleneMassnahmen.includes(massnahme.id) && (
                  <Tooltip content={
                    <span>
                      <b>Warum empfohlen:</b><br />{warum.grund}
                      {massnahme.rolle === "synergie" && aktiveMassnahmen.includes("M4") && (
                        <><br /><br />⚡ <b>Synergie mit Wärmepumpe:</b> Eigenstrom deckt WP-Betrieb — senkt Betriebskosten und verbessert CO₂-Bilanz.</>
                      )}
                    </span>
                  }>
                    <span className="print-hide" style={{ background: "#F6D400", color: "#1E1A15", padding: "1px 8px", borderRadius: 100, fontSize: 10, fontFamily: "'Geist Mono', monospace", fontWeight: 600, letterSpacing: "0.06em", flexShrink: 0, cursor: "help" }}>
                      ★ Empfohlen
                    </span>
                  </Tooltip>
                )}
                {empfohleneMassnahmen.includes(massnahme.id) && !massnahmeAktiv && (
                  <span className="print-hide" title="Empfohlene Maßnahme wurde deaktiviert" style={{ background: "var(--warn-bg)", color: "var(--acc)", border: "1px solid var(--warn-bdr)", padding: "1px 8px", borderRadius: 100, fontSize: 10, fontFamily: "'Geist Mono', monospace", fontWeight: 600, letterSpacing: "0.06em", flexShrink: 0 }}>
                    ⚠ Abgewählt
                  </span>
                )}
                {nichtEmpfohleneMassnahmen.includes(massnahme.id) && !empfohleneMassnahmen.includes(massnahme.id) && (
                  <Tooltip content={<span><b>Wirtschaftlichkeit gering:</b><br />{warum.jetzt}</span>}>
                    <span className="print-hide" style={{ background: "var(--div)", color: "var(--sec)", padding: "1px 8px", borderRadius: 100, fontSize: 10, fontFamily: "'Geist Mono', monospace", fontWeight: 600, letterSpacing: "0.06em", flexShrink: 0, cursor: "help" }}>
                      ✕ Nicht empfohlen
                    </span>
                  </Tooltip>
                )}
                <Tooltip content={
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Kosten-Herleitung</div>
                    <div style={{ fontSize: 11.5, marginBottom: 8 }}>{massnahme.kostenherleitung}</div>
                    {massnahme.menge && (
                      <div style={{ fontSize: 11.5, marginBottom: 8 }}>
                        Ihr Gebäude: ~{massnahme.menge.wert} {massnahme.menge.einheit} (Mengenmodell) → {fmtEur(massnahme.investition)}
                      </div>
                    )}
                    <div style={{ fontWeight: 600, marginBottom: 4, marginTop: 8 }}>Förderung</div>
                    <div style={{ fontSize: 11.5 }}>
                      {massnahme.foerderung_rechtsgrundlage} · durchgeführt durch {massnahme.foerderung_stelle}
                      {foerderung.hinweis && <><br/>{foerderung.hinweis}</>}
                      {foerderung.betrag > 0 && (
                        <>
                          <br/>Förderfähig: {fmtEur(foerderung.foerderfaehig)}
                          {foerderung.bestandteile.map(b => <React.Fragment key={b.label}><br/>{b.label}: {b.betrag < 0 ? "−" : ""}{fmtEur(Math.abs(b.betrag))}</React.Fragment>)}
                        </>
                      )}
                    </div>
                    {kostenansatz && (
                      <div style={{ fontSize: 10.5, marginTop: 8, opacity: 0.8 }}>Kostenbasis: {kostenStatusText(kostenansatz)}</div>
                    )}
                  </div>
                }>
                  <span style={{ color: "var(--acc)" }}><InfoIcon /></span>
                </Tooltip>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 140 }}>
                  {istEnergetisch(massnahme) && massnahme.co2_reduktion > 0 && (
                    <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: "var(--sec)", textAlign: "right" }}>
                      CO₂ −{massnahme.co2_reduktion} kg/(m²·a)
                    </div>
                  )}
                  <button className="print-hide" onClick={() => toggleWarum(massnahme.id)} aria-expanded={warumOffen.has(massnahme.id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5,
                             color: "var(--acc)", background: "none", border: "none", padding: 0,
                             cursor: "pointer", fontFamily: "'Geist Mono', monospace" }}>
                    Warum {warumOffen.has(massnahme.id) ? "▾" : "▸"}
                  </button>
                </div>
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: "var(--body)" }}>{massnahme.beschreibung}</div>
              {massnahme.investition > 0 && (
                <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: "var(--sec)", marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--txt)" }}>{fmtEur(massnahme.investition)}</span>
                  {massnahme.id === "M6"
                    ? (() => {
                        const mitWP = aktiveMassnahmen.includes("M4");
                        const { gesamtEur, evEur, einsEur } = berechnePvErtrag(mitWP);
                        const amort = Math.round(massnahme.investition / gesamtEur);
                        return (
                          <>
                            <span>·</span>
                            <span style={{ color: "var(--pos)" }}>{fmtEur(gesamtEur)}/J Ertrag</span>
                            <span style={{ fontSize: 10.5 }}>(10 kWp · {fmtEur(evEur)} Eigenverbrauch{mitWP ? " inkl. WP" : ""} + {fmtEur(einsEur)} Einspeisung)</span>
                            <span>· Amortisation ~{amort} J</span>
                          </>
                        );
                      })()
                    : foerderung.betrag > 0
                      ? (
                          <>
                            <span>·</span>
                            <span title={`${Math.round(foerderung.quote * 100)} % der Investition (förderfähig: ${fmtEur(foerderung.foerderfaehig)})`}>
                              {Math.round(foerderung.quote * 100)} % BEG → −{fmtEur(foerderung.betrag)}
                            </span>
                          </>
                        )
                      : null
                  }
                </div>
              )}
            </div>
            {massnahme.id === "M4" && (() => {
              const { vorlauftemp: vt, envAvg, autoKey, key: resolvedWpVariante } = wp;
              const istOel = /Heizöl/i.test(gebaeude.heizung_typ || "");
              const hatGas = /Gas/i.test(gebaeude.heizung_typ || "");
              const hybridOhneGas = resolvedWpVariante === "hybrid" && !hatGas;
              const hybridMitOel  = resolvedWpVariante === "hybrid" && istOel;
              return (
                <div style={{ marginBottom: 12, background: "var(--bg)", border: "1px solid var(--bdr)", borderRadius: 3, padding: "10px 12px", fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: "var(--txt)", marginBottom: 8 }} id={`wp-variante-${paket.id}`}>WP-Variante</div>
                  <div role="radiogroup" aria-labelledby={`wp-variante-${paket.id}`} style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                    {Object.entries(WP_VARIANTEN).map(([key, v]) => {
                      const isSelected = key === resolvedWpVariante;
                      const isAuto = key === autoKey;
                      return (
                        <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 3, background: isSelected ? "rgba(42,139,122,0.15)" : "transparent", border: isSelected ? "1px solid var(--acc)" : "1px solid transparent" }}>
                          <input type="radio" name={`wp-${paket.id}`} value={key} checked={isSelected} onChange={() => onWpVarianteChange(key)} style={{ accentColor: "#2A8B7A" }} />
                          <span style={{ color: "var(--txt)", fontWeight: isSelected ? 600 : 400 }}>{v.label}</span>
                          {isAuto && <span style={{ fontSize: 10, color: "#2A8B7A", fontFamily: "'Geist Mono', monospace" }}>empfohlen</span>}
                        </label>
                      );
                    })}
                  </div>
                  {hybridMitOel && (
                    <div style={{ color: "var(--acc)", fontSize: 11.5, marginTop: 2, marginBottom: 6, padding: "5px 8px", background: "var(--warn-bg)", borderRadius: 3, border: "1px solid var(--warn-bdr)" }}>
                      ⚠ Hybrid-Gas schafft neue fossile Infrastruktur beim Ölgebäude. Monovalent oder Monoenergetisch bevorzugen.
                    </div>
                  )}
                  {/* HP-Eignungseinschätzung */}
                  <div style={{
                    marginTop: 6, fontSize: 11.5, padding: "7px 10px", borderRadius: 3,
                    background: vt <= 50 && envAvg >= 4 ? "rgba(27,104,58,0.08)" : "var(--surface2)",
                    color: "var(--body)",
                    border: `1px solid ${vt <= 50 && envAvg >= 4 ? "var(--info-bdr)" : "var(--bdr)"}`,
                  }}>
                    {vt <= 50 && envAvg >= 4
                      ? `✓ Thermisch sehr gut geeignet (VT ${vt} °C) — Monovalent-Betrieb realistisch.`
                      : vt <= 55
                      ? `Thermisch geeignet bei VT ${vt} °C — ${WP_VARIANTEN[autoKey]?.label} empfohlen.`
                      : `VT ${vt} °C zu hoch — erst Hülle sanieren und/oder M7 (Wärmeverteilung) aktivieren.`
                    }
                  </div>
                  {/* Vor-Ort-Klärung */}
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => setVorOrtOffen(v => !v)} aria-expanded={vorOrtOffen}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
                               fontSize: 11.5, color: "var(--acc)", fontFamily: "'Geist Mono', monospace",
                               display: "flex", alignItems: "center", gap: 4 }}>
                      Vor-Ort zu klären {vorOrtOffen ? "▾" : "▸"}
                    </button>
                    {vorOrtOffen && (
                      <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: "2px solid var(--bdr)",
                                    fontSize: 11, color: "var(--body)", display: "flex", flexDirection: "column", gap: 7 }}>
                        <div><b>Aufstellort Außengerät</b> — Mindestabstand 3 m zur Nachbargrenze (TA Lärm). Bei Reihenhaus oft kritisch.</div>
                        <div><b>Stromanschluss</b> — 3-Phasen 400 V mit freiem 3×16 A (oder 3×25 A). Altbauten oft 1-phasig oder 35 A Hausanschluss → Erneuerung ca. 1.500–4.000 €.</div>
                        <div><b>Trinkwarmwasser</b> — Bei &gt;4 Personen Pufferspeicher 300+ L oder separate Brauchwasser-WP empfohlen.</div>
                        <div><b>Heizflächen-Reserve</b> — Auch bei VT 50 °C können Einzelräume (Bad, Eckzimmer) unterdimensionierte Heizkörper haben → punktueller Tausch ggf. nötig.</div>
                        <div><b>Schallimmission</b> — Aufstellung ≥ 3 m vom Nachbar-Schlafraum (TA Lärm: 35 dB(A) nachts am Immissionsort).</div>
                      </div>
                    )}
                  </div>
                  {(istOel || hybridOhneGas) && (
                    <div style={{ marginTop: 10, borderTop: "1px solid var(--bdr)", paddingTop: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 10.5, color: "var(--sec)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Geist Mono', monospace" }}>Begleitkosten</div>
                      {istOel && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--body)", marginBottom: 3 }}>
                          <span>{KOSTENANSAETZE.OELTANK_RUECKBAU.label}</span>
                          <span style={{ fontFamily: "'Geist Mono', monospace" }}>~{fmtEur(KOSTENANSAETZE.OELTANK_RUECKBAU.wert)}</span>
                        </div>
                      )}
                      {hybridOhneGas && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--body)" }}>
                          <span>{KOSTENANSAETZE.GASANSCHLUSS_NEU.label}</span>
                          <span style={{ fontFamily: "'Geist Mono', monospace" }}>~{fmtEur(KOSTENANSAETZE.GASANSCHLUSS_NEU.spanne.min).replace(" €", "")}–{fmtEur(KOSTENANSAETZE.GASANSCHLUSS_NEU.spanne.max)}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: "var(--sec)", marginTop: 5, fontStyle: "italic" }}>Nicht förderfähig — erhöhen den Eigenanteil.</div>
                    </div>
                  )}
                </div>
              );
            })()}
            {massnahme.id === "B1" && (
              <div style={{ marginBottom: 12, background: "var(--bg)", border: "1px solid var(--bdr)", borderRadius: 3, padding: "10px 12px", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <label htmlFor={`bad-flaeche-${paket.id}`} style={{ fontWeight: 600, color: "var(--txt)" }}>Badfläche</label>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <input id={`bad-flaeche-${paket.id}`} type="number" min={2} max={40} step={0.5}
                      value={gebaeude.bad_flaeche ?? BAD_DEFAULT.flaeche}
                      onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v > 0) onGebaeudeChange("bad_flaeche", Math.min(40, v)); }}
                      style={{ width: 64, fontFamily: "'Geist Mono', monospace", fontSize: 12.5, textAlign: "right", background: "transparent",
                               color: "var(--txt)", border: "1px solid var(--bdr)", borderRadius: 2, padding: "3px 6px" }} />
                    <span style={{ color: "var(--sec)" }}>m²</span>
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: "var(--txt)", marginBottom: 6 }} id={`bad-standard-${paket.id}`}>Ausstattung</div>
                <div role="radiogroup" aria-labelledby={`bad-standard-${paket.id}`} style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                  {Object.entries(BAD_STANDARDS).map(([key, st]) => {
                    const isSelected = key === (massnahme.badStandard || BAD_DEFAULT.standard);
                    const ansatz = KOSTENANSAETZE[`BAD_${key}`];
                    return (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 3, background: isSelected ? "rgba(42,139,122,0.15)" : "transparent", border: isSelected ? "1px solid var(--acc)" : "1px solid transparent" }}>
                        <input type="radio" name={`bad-${paket.id}`} value={key} checked={isSelected} onChange={() => onGebaeudeChange("bad_standard", key)} style={{ accentColor: "#2A8B7A" }} />
                        <span style={{ color: "var(--txt)", fontWeight: isSelected ? 600 : 400, minWidth: 92 }}>{st.label}</span>
                        <span style={{ color: "var(--sec)", fontSize: 11 }}>{ansatz.herleitung}</span>
                      </label>
                    );
                  })}
                </div>
                {massnahme.spanne && (
                  <div style={{ fontSize: 11.5, padding: "7px 10px", borderRadius: 3, background: "var(--surface2)", color: "var(--body)", border: "1px solid var(--bdr)" }}>
                    Spanne für {massnahme.menge?.wert ?? BAD_DEFAULT.flaeche} m²: <b style={{ fontFamily: "'Geist Mono', monospace" }}>{fmtEur(massnahme.spanne.min)} – {fmtEur(massnahme.spanne.max)}</b> · gerechnet wird mit {fmtEur(massnahme.investition)}.
                    <div style={{ marginTop: 4, color: "var(--sec)", fontSize: 10.5 }}>Orientierungswerte aus Ratgeber- und Anbieterseiten, keine Erhebung. Wird getrennt vom energetischen Eigenanteil ausgewiesen.</div>
                  </div>
                )}
              </div>
            )}
            {warumOffen.has(massnahme.id) && (
              <div style={{ marginTop: 8, background: "var(--info-bg)", border: "1px solid var(--info-bdr)",
                            borderRadius: 3, padding: "12px 14px", fontSize: 12, lineHeight: 1.6, color: "var(--info-txt)" }}>
                {warum.grund && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, color: "var(--acc)" }}>Warum diese Maßnahme: </span>{warum.grund}
                  </div>
                )}
                {warum.jetzt && (
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--acc)" }}>Warum jetzt: </span>{warum.jetzt}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>

      <div className="px-5 py-4 grid grid-cols-3 gap-4" style={{ background: "var(--bg)", borderTop: "1.25px solid var(--bdr)" }}>
        <div>
          <div className="text-[10.5px] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>Investition</div>
          <div className="text-[15px]" style={{ fontFamily: "'Geist Mono', monospace", color: "var(--txt)", fontVariantNumeric: "tabular-nums" }}>{fmtEur(summe_invest)}</div>
        </div>
        <div>
          <div className="text-[10.5px] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--pos)", fontFamily: "'Geist Mono', monospace" }}>Förderung</div>
          <div className="text-[15px]" style={{ fontFamily: "'Geist Mono', monospace", color: "var(--pos)", fontVariantNumeric: "tabular-nums" }}>
            {summe_foerder > 0 ? `− ${fmtEur(summe_foerder)}` : "—"}
          </div>
          {firstM && foerderPct > 0 && (
            <div className="text-[10.5px] mt-0.5" style={{ color: "var(--pos)", fontFamily: "'Geist Mono', monospace" }}>
              {foerderPct} % · {firstM.foerderung_rechtsgrundlage}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10.5px] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--txt)", fontFamily: "'Geist Mono', monospace" }}>Eigenanteil</div>
          <div className="text-[15px]" style={{ fontFamily: "'Geist Mono', monospace", color: "var(--txt)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{fmtEur(eigenanteil)}</div>
        </div>
      </div>
    </div>
  );
};

export default PaketBlock;
