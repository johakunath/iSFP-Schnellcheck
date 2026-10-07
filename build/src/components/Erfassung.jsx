import React from "react";
import { PRESETS, BAUTEIL_STUFEN, NOTE_FARBEN } from "../data.js";
import { CheckIcon } from "./ui.jsx";

// ═══ PRESET PICKER ═════════════════════════════════════════════════════
export const PresetPicker = ({ activeId, onPick, onUploadClick, uploadLoading }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
    {Object.values(PRESETS).map(preset => {
      const active = activeId === preset.id;
      return (
        <button key={preset.id} onClick={() => onPick(preset.id)}
          className="print-hide"
          style={{
            padding: 0, textAlign: "left",
            background: active ? "var(--txt)" : "var(--surface)",
            color: active ? "var(--bg)" : "var(--txt)",
            border: active ? "1.5px solid var(--txt)" : "1.25px solid var(--bdr)",
            borderRadius: 3, cursor: "pointer", transition: "all 0.12s",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--acc)"; }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--bdr)"; }}
        >
          {preset.photoUrl && (
            <div style={{ position: "relative" }}>
              <img src={preset.photoUrl} alt={preset.label}
                style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
              {preset.photoCredit && (
                <div style={{ position: "absolute", bottom: 0, right: 0, fontSize: 8,
                              color: "rgba(255,255,255,0.75)", background: "rgba(0,0,0,0.35)",
                              padding: "1px 5px", lineHeight: 1.4 }}>
                  {preset.photoCredit}
                </div>
              )}
            </div>
          )}
          <div style={{ padding: "14px 18px" }}>
            <div className="text-[10.5px] tracking-[0.2em] uppercase mb-1.5"
                 style={{ color: active ? "#F6A400" : "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>
              Preset
            </div>
            <div className="font-serif text-[17px] leading-tight mb-1" style={{ fontWeight: 500 }}>
              {preset.label}
            </div>
            <div className="text-[12px]" style={{ color: active ? "var(--bg)" : "var(--sec)", opacity: active ? 0.72 : 1 }}>
              {preset.beschreibung}
            </div>
          </div>
        </button>
      );
    })}
    <button className="print-hide" onClick={onUploadClick}
      style={{
        padding: "16px 20px", textAlign: "left",
        background: "var(--surface)", color: "var(--txt)",
        border: "1.5px dashed var(--bdr)",
        borderRadius: 3, cursor: "pointer", transition: "all 0.12s",
        outline: "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--acc)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--bdr)"; }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10.5px] tracking-[0.2em] uppercase"
          style={{ color: "var(--acc)", fontFamily: "'Geist Mono', monospace" }}>Energieausweis</span>
        <span className="text-[9.5px] tracking-[0.1em] uppercase px-1.5 py-0.5"
          style={{ color: "var(--sec)", border: "1px solid var(--bdr)", borderRadius: 100,
                   fontFamily: "'Geist Mono', monospace" }}>Demo</span>
      </div>
      <div className="font-serif text-[17px] leading-tight mb-1" style={{ fontWeight: 500 }}>
        {uploadLoading ? "Wird ausgelesen …" : "PDF hochladen"}
      </div>
      <div className="text-[12px]" style={{ color: "var(--sec)" }}>
        Energieausweis einlesen — experimentell, manuelle Nachbearbeitung empfohlen
      </div>
    </button>
  </div>
);

// ═══ PDF-IMPORT: Prüfung & Ergebnis ════════════════════════════════════

export const PdfReviewPanel = ({ result, onApply, onReject }) => {
  const [selected, setSelected] = React.useState(() => {
    const s = new Set();
    for (const m of result.matched || []) s.add(m.key + "/" + m.targetName);
    return s;
  });

  const toggle = (key, targetName) => {
    const composite = key + "/" + targetName;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(composite)) next.delete(composite); else next.add(composite);
      return next;
    });
  };

  const gebaeudeFields = (result.matched || []).filter(m => m.targetName === "gebaeude");
  const istFields = (result.matched || []).filter(m => m.targetName === "ist");

  const FieldRow = ({ m }) => {
    const composite = m.key + "/" + m.targetName;
    const isChecked = selected.has(composite);
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                      padding: "5px 0", borderBottom: "1px solid var(--div)" }}>
        <input type="checkbox" checked={isChecked} onChange={() => toggle(m.key, m.targetName)}
          style={{ accentColor: "#00843D", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--sec)", minWidth: 130, flexShrink: 0 }}>{m.label}</span>
        <span style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", color: isChecked ? "var(--txt)" : "var(--sec)" }}>
          {String(m.value)}
        </span>
      </label>
    );
  };

  return (
    <div className="print-hide" style={{
      background: "var(--surface)", border: "1.25px solid #B5623E",
      borderRadius: 3, padding: "16px 20px",
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--txt)", marginBottom: 4 }}>
        {result.fileName} — {result.matched?.length ?? 0} Felder erkannt
      </div>
      <div style={{ fontSize: 12, color: "var(--sec)", marginBottom: 12 }}>
        Prüfen Sie die extrahierten Werte und wählen Sie, welche übernommen werden sollen.
      </div>
      {gebaeudeFields.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                        fontFamily: "'Geist Mono', monospace", color: "var(--acc)", marginBottom: 4 }}>Gebäudedaten</div>
          {gebaeudeFields.map(m => <FieldRow key={m.key + "/" + m.targetName} m={m} />)}
        </div>
      )}
      {istFields.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                        fontFamily: "'Geist Mono', monospace", color: "var(--acc)", marginBottom: 4 }}>Energiekennzahlen</div>
          {istFields.map(m => <FieldRow key={m.key + "/" + m.targetName} m={m} />)}
        </div>
      )}
      {(result.missed?.length ?? 0) > 0 && (
        <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--sec)", marginBottom: 10 }}>
          Nicht erkannt: {result.missed.join(", ")}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onApply(selected)}
          style={{ padding: "7px 16px", background: "#00843D", color: "#FFF", border: "none",
                   borderRadius: 3, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          Übernehmen ({selected.size} Felder)
        </button>
        <button onClick={onReject}
          style={{ padding: "7px 14px", background: "transparent", color: "var(--sec)",
                   border: "1.25px solid var(--bdr)", borderRadius: 3, cursor: "pointer", fontSize: 13 }}>
          Verwerfen
        </button>
      </div>
    </div>
  );
};

export const ExtractionResult = ({ result, onDismiss }) => {
  const matchedCount = result.matched?.length ?? 0;
  return (
    <div className="print-hide" style={{
      background: matchedCount > 0 ? "#F1F7F1" : "#FBF2E8",
      border: `1.25px solid ${matchedCount > 0 ? "#34A030" : "#F07D00"}`,
      borderRadius: 3, padding: "18px 22px",
    }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {matchedCount > 0 ? (
              <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: 100,
                             background: "#00843D", alignItems: "center", justifyContent: "center" }}>
                <CheckIcon size={12} color="#FFF" />
              </span>
            ) : (
              <span style={{ color: "#F07D00", fontSize: 18, fontWeight: 700 }}>!</span>
            )}
            <span className="text-[14.5px] font-medium" style={{ color: "var(--txt)" }}>
              {matchedCount > 0
                ? `${matchedCount} Felder aus ${result.fileName} übernommen`
                : `Aus ${result.fileName} konnten keine Standardfelder erkannt werden`}
            </span>
          </div>
          {matchedCount > 0 && (
            <div className="text-[12.5px] leading-relaxed" style={{ color: "var(--body)" }}>
              {result.matched.map((m, i) => (
                <span key={i}>
                  <span style={{ color: "var(--sec)" }}>{m.label}:</span>{" "}
                  <span style={{ fontFamily: "'Geist Mono', monospace", color: "var(--txt)" }}>{String(m.value)}</span>
                  {i < (result.matched?.length ?? 0) - 1 && <span style={{ color: "var(--bdr)" }}>  ·  </span>}
                </span>
              ))}
            </div>
          )}
          {(result.missed?.length ?? 0) > 0 && (
            <div className="text-[11.5px] mt-2 italic" style={{ color: "var(--sec)" }}>
              Nicht automatisch erkannt: {result.missed.join(", ")} — bitte manuell prüfen.
            </div>
          )}
        </div>
        <button onClick={onDismiss} style={{ background: "transparent", border: "none",
          color: "var(--sec)", fontSize: 18, cursor: "pointer", padding: 4 }} aria-label="Schließen">✕</button>
      </div>
    </div>
  );
};

// ═══ BAUTEIL-KACHEL mit benannten Stufen ══════════════════════════════
export const BauteilKachel = ({ bauteil, onNoteChange }) => {
  const farbe = NOTE_FARBEN[bauteil.note];
  const stufenLabels = BAUTEIL_STUFEN[bauteil.id] || {};
  const currentLabel = stufenLabels[bauteil.note] || bauteil.info;
  return (
    <div style={{ background: "var(--surface)", border: "1.25px solid var(--bdr)", borderRadius: 3, padding: 16,
                  display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13.5px] font-medium" style={{ color: "var(--txt)" }}>{bauteil.label}</span>
        <span className="inline-flex items-center justify-center text-[11px] font-medium"
          style={{ width: 24, height: 24, borderRadius: 100, background: farbe, color: "#FFFFFF",
                   fontFamily: "'Geist Mono', monospace" }}>{bauteil.note}</span>
      </div>
      <div style={{
        height: 4, borderRadius: 100,
        background: `linear-gradient(to right, ${farbe} 0%, ${farbe} ${(bauteil.note / 7) * 100}%, #E2DBD0 ${(bauteil.note / 7) * 100}%)`,
      }} />
      <input type="range" min={1} max={7} step={1} value={bauteil.note}
        aria-label={`${bauteil.label}: Stufe 1 bis 7`} aria-valuetext={`Stufe ${bauteil.note}: ${currentLabel}`}
        onChange={(e) => onNoteChange(bauteil.id, parseInt(e.target.value, 10))}
        className="print-hide"
        style={{ width: "100%", height: 4, margin: 0, background: "transparent", accentColor: "#B5623E", cursor: "pointer" }} />
      <div className="text-[11.5px] leading-snug font-medium" style={{ color: "var(--txt)" }}>
        {currentLabel}
      </div>
      {bauteil.info && stufenLabels[bauteil.note] && stufenLabels[bauteil.note] !== bauteil.info && (
        <div className="text-[10.5px]" style={{ color: "var(--sec)", fontStyle: "italic" }}>{bauteil.info}</div>
      )}
    </div>
  );
};
