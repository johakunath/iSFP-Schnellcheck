import React, { useState, useRef, useEffect } from "react";
import { PAKET_FARBEN, EFFIZIENZ_FARBEN } from "../data.js";

// Textfarbe auf EEK-Farbfläche (helle Flächen C–E → dunkle Schrift)
export const eekTextFarbe = (klasse) => ["C", "D", "E"].includes(klasse) ? "#1E1A15" : "#FFFFFF";

// ═══ ICONS ══════════════════════════════════════════════════════════════
export const HouseIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 28 L4 14 L16 6 L28 14 L28 28 Z" />
    <line x1="4" y1="28" x2="28" y2="28" strokeWidth="1.8" />
    <rect x="8.5" y="17" width="3" height="3.2" />
    <rect x="14.5" y="17" width="3" height="3.2" />
    <rect x="20.5" y="17" width="3" height="3.2" />
    <rect x="8.5" y="22.5" width="3" height="3.2" />
    <rect x="14.5" y="22.5" width="3" height="3.2" />
    <rect x="20.5" y="22.5" width="3" height="3.2" />
  </svg>
);

export const InfoIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="5" r="0.9" fill="currentColor" />
    <line x1="8" y1="7.5" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ size = 14, color = "#00843D" }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M2 7.5 L5.5 11 L12 4" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SparkleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5 L9.5 6.5 L14.5 8 L9.5 9.5 L8 14.5 L6.5 9.5 L1.5 8 L6.5 6.5 Z" />
  </svg>
);

export const PaketHaus = ({ farbe, aktiv, nummer, size = 68 }) => {
  const f = PAKET_FARBEN[farbe] || PAKET_FARBEN.rot;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ opacity: aktiv ? 1 : 0.28 }}>
      <path d="M8 70 L8 36 L40 12 L72 36 L72 70 Z" fill={f.bg} stroke="#1E1A15" strokeWidth="1.5" strokeLinejoin="round"/>
      <text x="40" y="55" textAnchor="middle" fontFamily="'Fraunces', serif" fontSize="26" fontWeight="500" fill={f.text}>{nummer}</text>
    </svg>
  );
};

// ═══ TOOLTIP ═══════════════════════════════════════════════════════════
export const Tooltip = ({ content, children, align = "center" }) => {
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const open = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ cx: r.left + r.width / 2, top: r.top });
  };
  const close = () => setPos(null);

  let left = null;
  let caretLeft = 140;
  if (pos) {
    const raw = align === "right" ? pos.cx - 280 : align === "left" ? pos.cx : pos.cx - 140;
    left = Math.max(8, Math.min(raw, (typeof window !== "undefined" ? window.innerWidth : 800) - 296));
    caretLeft = Math.max(10, Math.min(pos.cx - left, 270));
  }

  return (
    <span ref={triggerRef} tabIndex={0}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}
      onKeyDown={(e) => { if (e.key === "Escape") close(); }}
      onClick={() => pos ? close() : open()}>
      {children}
      {pos && (
        <span role="tooltip" style={{
          position: "fixed",
          top: pos.top - 8,
          left,
          transform: "translateY(-100%)",
          zIndex: 9999,
          background: "#1E1A15", color: "#F8F5EF",
          padding: "10px 14px", borderRadius: 3, fontSize: 12,
          lineHeight: 1.5, width: 280, textAlign: "left",
          boxShadow: "0 4px 18px rgba(30,26,21,0.25)", fontWeight: 400,
          pointerEvents: "none",
        }}>
          {content}
          <span style={{
            position: "absolute", top: "100%", left: caretLeft,
            transform: "translateX(-50%)", width: 0, height: 0,
            borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
            borderTop: "6px solid #1E1A15",
          }} />
        </span>
      )}
    </span>
  );
};

// ═══ EDITABLE INPUTS ═══════════════════════════════════════════════════
export const labelStyle = { color: "var(--body)", fontSize: 13 };
export const valueStyle = {
  fontFamily: "'Geist Mono', ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums", color: "var(--txt)", fontSize: 14,
};

export const RowShell = ({ children }) => (
  <div className="flex items-baseline justify-between gap-3"
       style={{ padding: "9px 0", borderBottom: "1px solid var(--div)", minHeight: 38 }}>
    {children}
  </div>
);

export const NumberInput = ({ label, value, onChange, unit, min, max, step = 1, tooltip }) => {
  const [local, setLocal] = useState(String(value ?? ""));
  useEffect(() => { setLocal(String(value ?? "")); }, [value]);
  const commit = () => {
    const n = parseFloat(local.replace(",", "."));
    if (Number.isFinite(n)) {
      const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));
      onChange(clamped);
    } else {
      setLocal(String(value ?? ""));
    }
  };
  return (
    <RowShell>
      <span style={{ ...labelStyle, minWidth: 0 }} className="flex items-center gap-1.5 flex-wrap">
        {label}
        {tooltip && <Tooltip align="right" content={tooltip}><span style={{ color: "var(--acc)" }}><InfoIcon /></span></Tooltip>}
      </span>
      <span className="flex items-baseline gap-1.5" style={{ flexShrink: 0 }}>
        <input type="text" inputMode="decimal" value={local} aria-label={typeof label === "string" ? label : undefined}
          onChange={(e) => setLocal(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          style={{ ...valueStyle, background: "transparent", border: "none",
                   borderBottom: "1px dotted var(--bdr)", outline: "none",
                   textAlign: "right", width: 92, padding: "2px 2px", fontSize: 14 }} />
        {unit && <span style={{ fontSize: 12, color: "var(--sec)", whiteSpace: "nowrap" }}>{unit}</span>}
      </span>
    </RowShell>
  );
};

export const TextInput = ({ label, value, onChange, placeholder }) => (
  <RowShell>
    <span style={labelStyle}>{label}</span>
    <input type="text" value={value ?? ""} aria-label={typeof label === "string" ? label : undefined}
      onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...valueStyle, background: "transparent", border: "none",
               borderBottom: "1px dotted var(--bdr)", outline: "none",
               textAlign: "right", flex: 1, marginLeft: 12, padding: "2px 2px", minWidth: 0 }} />
  </RowShell>
);

export const SelectInput = ({ label, value, onChange, options, tooltip }) => (
  <RowShell>
    <span style={{ ...labelStyle, flexShrink: 0 }} className="flex items-center gap-1.5">
      {label}
      {tooltip && <Tooltip content={tooltip}><span style={{ color: "var(--acc)" }}><InfoIcon /></span></Tooltip>}
    </span>
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-label={typeof label === "string" ? label : undefined}
      style={{ ...valueStyle, background: "transparent",
               border: "1px solid var(--bdr)", borderRadius: 2,
               padding: "4px 26px 4px 8px", appearance: "none",
               backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%236B6259' fill='none' stroke-width='1.2'/></svg>\")",
               backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
               cursor: "pointer", outline: "none", fontSize: 13,
               minWidth: 0, maxWidth: "min(220px, 55%)" }}>
      {options.map(o => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  </RowShell>
);

export const ComputedRow = ({ label, value, unit, tooltip }) => (
  <div className="flex items-baseline justify-between gap-3"
       style={{ padding: "9px 0", borderBottom: "1px solid var(--div)", minHeight: 38 }}>
    <span className="flex items-center gap-1.5" style={labelStyle}>
      {label}
      <span style={{ color: "var(--acc)" }} title="Automatisch berechnet"><SparkleIcon size={11} /></span>
      {tooltip && <Tooltip content={tooltip}><span style={{ color: "var(--acc)" }}><InfoIcon /></span></Tooltip>}
    </span>
    <span className="text-right" style={valueStyle}>
      {value}{unit && <span style={{ fontSize: 12, color: "var(--sec)", marginLeft: 4 }}>{unit}</span>}
    </span>
  </div>
);

// ═══ LAYOUT SHELLS ═════════════════════════════════════════════════════
export const Section = ({ id, eyebrow, title, subtitle, children }) => (
  <section id={id} className="mb-16" style={{ scrollMarginTop: 92 }}>
    {eyebrow && (
      <div className="text-[11px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>
        {eyebrow}
      </div>
    )}
    {title && (
      <h2 className="font-serif leading-[1.05] mb-3" style={{ fontSize: 32, fontWeight: 400, color: "var(--txt)", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
    )}
    {subtitle && (
      <p className="max-w-2xl text-[15px] leading-relaxed mb-8" style={{ color: "var(--body)" }}>
        {subtitle}
      </p>
    )}
    {children}
  </section>
);

export const Card = ({ children, style }) => (
  <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: 24, ...style }}>
    {children}
  </div>
);

export const CardEyebrow = ({ children }) => (
  <div className="text-[11px] tracking-[0.22em] uppercase mb-4"
       style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>
    {children}
  </div>
);

export const EffizienzBadge = ({ klasse, size = "md" }) => {
  const farbe = EFFIZIENZ_FARBEN[klasse] || "#6B6259";
  const dim = size === "lg" ? 84 : size === "md" ? 60 : 36;
  const fs = size === "lg" ? 42 : size === "md" ? 28 : 16;
  return (
    <div className="inline-flex items-center justify-center font-serif"
      style={{ width: dim, height: dim, background: farbe,
               color: eekTextFarbe(klasse),
               borderRadius: 3, fontSize: fs, fontWeight: 500 }}>{klasse}</div>
  );
};
