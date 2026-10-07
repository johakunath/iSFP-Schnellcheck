import React, { useState } from "react";
import { EFFIZIENZ_FARBEN, PAKET_FARBEN, berechneEffizienzklasse } from "../data.js";
import { fmtEur, textColorFor } from "../helpers.jsx";
import { Tooltip, InfoIcon } from "./ui.jsx";

const EEK_ZONEN = [
  { klasse: "A+", von: 0,   bis: 30   },
  { klasse: "A",  von: 30,  bis: 50   },
  { klasse: "B",  von: 50,  bis: 75   },
  { klasse: "C",  von: 75,  bis: 100  },
  { klasse: "D",  von: 100, bis: 130  },
  { klasse: "E",  von: 130, bis: 160  },
  { klasse: "F",  von: 160, bis: 200  },
  { klasse: "G",  von: 200, bis: 250  },
  { klasse: "H",  von: 250, bis: 9999 },
];

export const EnergieVerlaufChart = ({ ist, kumuliert, heizkosten = 0 }) => {
  const [metric, setMetric] = useState("pe");
  const W = 620, H = 380;
  const PAD = { top: 60, right: 36, bottom: 40, left: 52 };
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  const METRICS = {
    pe:         { label: "Primärenergie", unit: "kWh/(m²·a)", istVal: ist.primaerenergie,
                  valFn: r => r.primaerenergie, fmtVal: v => `${Math.round(v)}`,
                  ySnap: 25, yMin: 100, showEEK: true },
    co2:        { label: "CO₂", unit: "kg/(m²·a)", istVal: ist.co2,
                  valFn: r => r.co2, fmtVal: v => `${Number(v).toFixed(1)}`,
                  ySnap: 10, yMin: 20, showEEK: false },
    heizkosten: { label: "Heizkosten", unit: "€/J", istVal: heizkosten,
                  valFn: r => r.heizkosten_gesamt,
                  fmtVal: v => v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`,
                  ySnap: 500, yMin: 1000, showEEK: false },
  };
  const cfg = METRICS[metric];

  const punkte = [
    { label: "Heute", val: cfg.istVal, bg: "#6E2E1E", klasse: berechneEffizienzklasse(ist.primaerenergie) },
    ...kumuliert.map(r => ({
      label: r.paket.titel,
      val: cfg.valFn(r.nachher),
      bg: PAKET_FARBEN[r.paket.farbe].bg,
      klasse: r.nachher.effizienzklasse,
    })),
  ];

  const yMax = Math.max(Math.ceil(cfg.istVal * 1.18 / cfg.ySnap) * cfg.ySnap, cfg.yMin);
  const toY = v => PAD.top + ph * (1 - Math.min(v, yMax) / yMax);
  const toX = i => PAD.left + (punkte.length > 1 ? pw * i / (punkte.length - 1) : pw / 2);

  const visibleZonen = cfg.showEEK
    ? EEK_ZONEN.filter(z => z.von < yMax).map(z => ({ ...z, bis: Math.min(z.bis, yMax) }))
    : [];
  const gridLines = cfg.showEEK
    ? [0, 30, 50, 75, 100, 130, 160, 200, 250].filter(v => v > 0 && v <= yMax)
    : (() => { const ls = []; for (let v = cfg.ySnap; v <= yMax; v += cfg.ySnap) ls.push(v); return ls; })();

  const pathD = punkte.map((pt, i) =>
    i === 0 ? `M ${toX(i)} ${toY(pt.val)}` : `H ${toX(i)} V ${toY(pt.val)}`
  ).join(" ");
  const areaD = pathD + ` V ${toY(0)} H ${toX(0)} Z`;

  return (
    <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: "24px 28px", marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {[["pe", "PE"], ["co2", "CO₂"], ["heizkosten", "Kosten"]].map(([key, lbl]) => (
            <button key={key} onClick={() => setMetric(key)}
              style={{ fontSize: 10, fontFamily: "'Geist Mono', monospace", padding: "3px 9px",
                       borderRadius: 2, border: "1px solid var(--bdr)", cursor: "pointer",
                       background: metric === key ? "var(--acc)" : "transparent",
                       color: metric === key ? "#FFF" : "var(--sec)" }}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--sec)", fontFamily: "'Geist Mono', monospace" }}>
          {cfg.label} · {cfg.unit}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", aspectRatio: "620/380", minHeight: 220 }}>
        <defs>
          <clipPath id="evc-clip">
            <rect x={PAD.left} y={PAD.top} width={pw} height={ph} />
          </clipPath>
        </defs>
        {visibleZonen.map(z => (
          <rect key={z.klasse}
            x={PAD.left} y={toY(z.bis)} width={pw} height={toY(z.von) - toY(z.bis)}
            fill={EFFIZIENZ_FARBEN[z.klasse]} opacity={0.13}
            clipPath="url(#evc-clip)"
          />
        ))}
        {gridLines.map(v => (
          <line key={v}
            x1={PAD.left} y1={toY(v)} x2={PAD.left + pw} y2={toY(v)}
            stroke="var(--bdr)" strokeWidth={0.75} strokeDasharray="4 3"
          />
        ))}
        {[0, ...gridLines].map(v => (
          <text key={v} x={PAD.left - 6} y={toY(v) + 3.5}
            textAnchor="end" fontSize={9} fill="#9B8E82"
            fontFamily="'Geist Mono', monospace">{cfg.showEEK ? v : cfg.fmtVal(v)}</text>
        ))}
        {visibleZonen.map(z => {
          const yMid = (toY(z.von) + toY(z.bis)) / 2;
          return (
            <text key={z.klasse}
              x={PAD.left + pw + 5} y={yMid + 4}
              fontSize={9} fill={EFFIZIENZ_FARBEN[z.klasse]}
              fontFamily="'Geist Mono', monospace" fontWeight={700}
            >{z.klasse}</text>
          );
        })}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + ph} stroke="var(--bdr)" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + ph} x2={PAD.left + pw} y2={PAD.top + ph} stroke="var(--bdr)" strokeWidth={1} />
        <path d={areaD} fill="var(--txt)" opacity={0.06} clipPath="url(#evc-clip)" />
        <path d={pathD} fill="none" stroke="var(--txt)" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" clipPath="url(#evc-clip)" />
        {punkte.map((pt, i) => {
          const x = toX(i), y = toY(pt.val);
          return (
            <g key={i}>
              {cfg.showEEK ? (
                <>
                  <text x={x} y={y - 36} textAnchor="middle" fontSize={8.5} fill="#3A332B"
                    fontFamily="'Geist Mono', monospace" fontWeight={500}>{cfg.fmtVal(pt.val)}</text>
                  <rect x={x - 12} y={y - 33} width={24} height={20} rx={2}
                    fill={EFFIZIENZ_FARBEN[pt.klasse]} />
                  <text x={x} y={y - 18} textAnchor="middle" fontSize={12} fontWeight={700}
                    fontFamily="'Fraunces', serif" fill={textColorFor(pt.klasse)}>{pt.klasse}</text>
                </>
              ) : (
                <text x={x} y={y - 18} textAnchor="middle" fontSize={8.5} fill="#3A332B"
                  fontFamily="'Geist Mono', monospace" fontWeight={500}>{cfg.fmtVal(pt.val)}</text>
              )}
              <circle cx={x} cy={y} r={5.5} fill={pt.bg} stroke="#FFF" strokeWidth={2} />
              <text x={x} y={14} textAnchor="middle" fontSize={8.5} fill={pt.bg}
                fontFamily="'Geist Mono', monospace" fontWeight={600}>{pt.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ═══ 20-JAHR-KOSTENVERGLEICH (Break-even) ══════════════════════════════
// w = berechneWirtschaftlichkeit(...) — dieselbe Rechnung wie Sidebar und Bericht.
// Der Break-even-Punkt liegt auf dem tatsächlichen Schnittpunkt der Kurven
// (inkl. Preissteigerung); die statische Amortisation steht in der Sidebar.
export const KostenvergleichChart = ({ w, eskalationIst, eskalationZiel }) => {
  const H = w.jahre;
  const ohneEur = Math.round(w.ohneSanierung);
  const mitEur  = Math.round(w.mitSanierung);
  const delta   = mitEur - ohneEur;
  const breakevenJ = w.breakEvenJahre !== null ? Math.round(w.breakEvenJahre) : null;
  const eskalHeader = (eskalationIst === 0 && eskalationZiel === 0)
    ? "statische Preise"
    : `IST +${Number(eskalationIst).toFixed(1)} % / ZIEL +${Number(eskalationZiel).toFixed(1)} %/J`;
  const cumIst  = w.kumIst;
  const cumZiel = w.kumZiel;
  const maxT = breakevenJ ? Math.min(Math.max(Math.ceil(breakevenJ * 1.35), H), 40) : 30;
  const CW = 560, CH = 200;
  const CP = { top: 18, right: 18, bottom: 34, left: 52 };
  const cpw = CW - CP.left - CP.right, cph = CH - CP.top - CP.bottom;
  const pts_t = Array.from({ length: maxT + 1 }, (_, t) => t);
  const yMax_c = Math.ceil(Math.max(...pts_t.flatMap(t => [cumIst(t), cumZiel(t)])) / 25000) * 25000 || 1;
  const toXc = t => CP.left + cpw * t / maxT;
  const toYc = v => CP.top + cph * (1 - Math.max(v, 0) / yMax_c);
  const fmtK = v => `${Math.round(v / 1000)}k`;
  const istPts  = pts_t.map(t => `${toXc(t)},${toYc(cumIst(t))}`).join(' ');
  const zielPts = pts_t.map(t => `${toXc(t)},${toYc(cumZiel(t))}`).join(' ');
  const yStep_c = yMax_c >= 200000 ? 50000 : 25000;
  const yLines_c = Array.from({ length: Math.ceil(yMax_c / yStep_c) }, (_, i) => (i + 1) * yStep_c).filter(v => v <= yMax_c);
  const xTicks_c = [5, 10, 15, 20, 25, 30, 35, 40].filter(t => t > 0 && t <= maxT);
  const bx = w.breakEvenJahre !== null && w.breakEvenJahre <= maxT ? toXc(w.breakEvenJahre) : null;
  const by_cross = bx ? toYc(cumIst(w.breakEvenJahre)) : null;
  return (
    <div style={{ marginTop: 8, marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                      fontFamily: "'Geist Mono', monospace", color: "var(--acc)" }}>
          20-Jahr-Kostenvergleich · {eskalHeader}
        </div>
        <Tooltip content={<span>Nur laufende Kosten. Nicht enthalten: Heizungsersatz (ca. 12–18 T€), GEG-Pflichten bei Eigentümerwechsel (§71 GEG: 65 % EE), EEK-Wertverlust (F/G: bis −10 % Marktwert).</span>}>
          <span style={{ color: "var(--acc)", cursor: "help" }}><InfoIcon size={11} /></span>
        </Tooltip>
      </div>
      <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: "14px 18px" }}>
        <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", display: "block", aspectRatio: `${CW}/${CH}` }}>
          {/* Y grid */}
          <text x={CP.left - 5} y={toYc(0) + 3.5} textAnchor="end" fontSize={8.5} fill="var(--sec)" fontFamily="'Geist Mono', monospace">0</text>
          {yLines_c.map(v => (
            <g key={v}>
              <line x1={CP.left} y1={toYc(v)} x2={CP.left + cpw} y2={toYc(v)} stroke="var(--div)" strokeWidth={0.75} strokeDasharray="4 3" />
              <text x={CP.left - 5} y={toYc(v) + 3.5} textAnchor="end" fontSize={8.5} fill="var(--sec)" fontFamily="'Geist Mono', monospace">{fmtK(v)}</text>
            </g>
          ))}
          {/* X baseline */}
          <line x1={CP.left} y1={CP.top + cph} x2={CP.left + cpw} y2={CP.top + cph} stroke="var(--bdr)" strokeWidth={0.75} />
          {/* X ticks */}
          {xTicks_c.map(t => (
            <g key={t}>
              <line x1={toXc(t)} y1={CP.top + cph} x2={toXc(t)} y2={CP.top + cph + 3} stroke="var(--sec)" strokeWidth={0.75} />
              <text x={toXc(t)} y={CP.top + cph + 13} textAnchor="middle" fontSize={8.5} fill="var(--sec)" fontFamily="'Geist Mono', monospace">{t}</text>
            </g>
          ))}
          <text x={CP.left + cpw} y={CP.top + cph + 13} textAnchor="end" fontSize={8} fill="var(--sec)" fontFamily="'Geist Mono', monospace">J</text>
          {/* Year-20 reference */}
          <line x1={toXc(20)} y1={CP.top} x2={toXc(20)} y2={CP.top + cph} stroke="var(--acc)" strokeWidth={0.75} strokeDasharray="3 3" opacity={0.45} />
          <text x={toXc(20)} y={CP.top - 5} textAnchor="middle" fontSize={8} fill="var(--acc)" fontFamily="'Geist Mono', monospace" opacity={0.7}>20 J</text>
          {/* Lines */}
          <polyline points={istPts}  fill="none" stroke="var(--neg)" strokeWidth={1.75} strokeLinejoin="round" />
          <polyline points={zielPts} fill="none" stroke="var(--pos)" strokeWidth={1.75} strokeLinejoin="round" />
          {/* Crossover */}
          {bx && by_cross && (
            <>
              <circle cx={bx} cy={by_cross} r={3.5} fill="var(--acc)" />
              <text x={bx + 6} y={by_cross - 4} fontSize={8.5} fill="var(--acc)" fontFamily="'Geist Mono', monospace" fontWeight={600}>~{breakevenJ} J</text>
            </>
          )}
        </svg>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 10, fontFamily: "'Geist Mono', monospace", color: "var(--sec)", marginTop: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={14} height={3} style={{ flexShrink: 0 }}><line x1={0} y1={1.5} x2={14} y2={1.5} stroke="var(--neg)" strokeWidth={2} /></svg>
            Ohne Sanierung · {fmtEur(ohneEur)} nach 20 J
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={14} height={3} style={{ flexShrink: 0 }}><line x1={0} y1={1.5} x2={14} y2={1.5} stroke="var(--pos)" strokeWidth={2} /></svg>
            Mit Sanierung · {fmtEur(mitEur)} nach 20 J
          </span>
          {breakevenJ && (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--acc)", display: "inline-block", flexShrink: 0 }} />
              Break-even ~{breakevenJ} J
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", color: "var(--sec)", lineHeight: 1.5, marginTop: 6 }}>
        {delta < 0
          ? `Sanierung spart über ${H} Jahre ${fmtEur(Math.abs(delta))}.`
          : `Investitionsüberhang nach ${H} Jahren: ${fmtEur(delta)}. Nicht-sanieren bedeutet höhere laufende Kosten und ggf. spätere Pflichtinvestitionen.`}
        {breakevenJ && ` Break-even inkl. Preissteigerung bei ~${breakevenJ} Jahren.`}
      </div>
    </div>
  );
};
