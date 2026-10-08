# iSFP-Schnellcheck · CLAUDE.md

## What this is

A single-page React **demonstrator** for energy renovation planning of German single-family homes (EFH). It generates an **individueller Sanierungsfahrplan (iSFP)** — a BAFA-style staged renovation roadmap — with live energy calculations, cost/subsidy breakdowns, and a printable PDF report.

Not a BAFA-certified iSFP; carries no legal weight. EFH-focused only — do not add MFH support without rethinking the entire energy model.

Eligible building types: Einfamilienhaus (EFH), Zweifamilienhaus (ZFH), Doppelhaushälfte (DHH), Reihenhaus — max ~4 Wohneinheiten.

---

## Architecture

**Single compiled HTML file** — no CDN, no runtime bundler, no server needed.

```
build/
  src/
    App.jsx               — State, handlers, derived memos, page layout (~730 lines)
    data.js               — Data model, measures, presets, calculation engine (pure, no React)
    kosten.js             — Cost registry: every investment value + region/year/unit/VAT/evidence
    warum.js              — "Warum diese Maßnahme / warum jetzt" texts
    helpers.jsx           — Shared formatting helpers + EnergyBar component
    data.test.js          — Vitest unit tests for data.js / kosten.js
    pdfExtract.js         — PDF energy certificate parsing (pdf.js)
    printExport.js        — window.print() export helper
    input.css             — Tailwind source + CSS variable tokens
    components/
      ui.jsx              — Icons, Tooltip, inputs, Section/Card, EffizienzBadge, eekTextFarbe
      Erfassung.jsx       — PresetPicker, PDF review panel, BauteilKachel
      PaketBlock.jsx      — One package with its measures, WP variant picker, cost lines
      Ergebnis.jsx        — VorherNachher, EekArrowScale, MergedTable (step table)
      Diagramme.jsx       — EnergieVerlaufChart, KostenvergleichChart (20-year break-even)
      ErgebnisUebersicht.jsx — Shared sidebar/drawer content + MobileResultsDrawer
      Hintergruende.jsx   — "Hintergründe & Annahmen" incl. live example calculation
      ISFPPrintReport.jsx — Print-only iSFP report
      MassnahmenEditor.jsx — Collapsible cost/Förderquote editor
  build.mjs / assemble.mjs / verify.mjs — build pipeline
  dist/index.html         — Build output (do not edit directly)
index.html                — Repo root copy, served by GitHub Pages
```

### Build pipeline

`npm run build` from `build/` runs all 4 steps: `node build.mjs` → Tailwind compile → `node assemble.mjs` → `node verify.mjs` → copies to `../index.html`. Exit non-zero on failure.

Run `npm test` from `build/` after any change to `data.js`.

**Never edit `index.html` (repo root) directly.** Always edit sources in `build/src/`.

### Key components

- **`App.jsx`** — main state + UI wiring; all derived values come from `data.js` builders
- **`ErgebnisUebersicht`** — one component rendered in the desktop sidebar AND the mobile drawer (no duplicate markup)
- **`MobileResultsDrawer`** — bottom-sheet for mobile (<1024 px)
- **`ISFPPrintReport`** — `.print-only` component; stays light (not dark-mode themed)
- **`MassnahmenEditor`** — collapsible per-measure `investition`/`foerderquote` editor

---

## Key concepts

### effectivePakete

Derivation chain (all pure functions in `data.js`, used by App and by `berechneSzenario` in tests):

1. `erstelleStartzustand(presetId)` — gebaeude, ist, bauteile (incl. `bauteile_overrides`), default measures. Used for initial state AND preset clicks.
2. `erstelleEffektivenBauteilState(...)` — M7 active → `verteilung: 7`; `bestimmeWpVariante` resolves the WP variant (the only place that does).
3. `erstelleBasisPakete(variante, gebaeude)` — M4 takes cost/quote of the variant; area-based costs are scaled by the quantity model (editor shows these as defaults).
4. `erstelleEffektivePakete(...)` — + user `massnahmenOverrides` (overrides win over variant costs), sorted by score.
5. `ordneAbgleichNachWp(...)` — M1 moves to the end of P3 when M4 is active → `dynamicPakete`.

All cost/subsidy display uses `dynamicPakete`/`effectivePakete` plus `berechneFoerderung`/`summiereMassnahmen`. App.jsx has no raw `MASSNAHMENPAKETE` reference. Never derive costs in a `useEffect` that writes into overrides (that caused first-load ≠ preset-click numbers).

### bauteile_state

Each building has stufe (1–7) ratings for: `waende`, `dach`, `boden`, `fenster`, `lueftung`, `heizung`, `warmwasser`, `verteilung`. Stufe 1 = unrenovated, Stufe 7 = Passivhaus. Derived via `ableiteBauteile(baujahr, heizung_typ, lueftung, warmwasser)`, manually adjustable.

### bewerteMassnahmen (priority scorer)

`score = invest_netto / pe_saved` [€ per kWh PE saved]. Lower = better value.

- `empfohlen: true` — score < **10.5** (absolute threshold, not relative)
- `nichtEmpfohlen: true` — score > **20.0** or Infinity

BADGE_EXEMPT roles (`pflichtschritt`, `enabler`, `systempfad`, `begleitkosten`) never receive badges.

### Subsidies (`berechneFoerderung`, `FOERDERREGELN`) — BEG ab 21.07.2026

Single function for every Förder number on screen and in print. Rules (KfW-Merkblatt 458 Stand 09/2026, BEG-EM-Richtlinie ab 21.07.2026):

- Routing per measure via `foerderprogramm`: `heizung` (M4, KfW 458), `em_huelle` (M2/M3/M5), `em_optimierung` (M1/M7), none (M6).
- Förderfähig = full measure cost (Umfeldmaßnahmen incl.), **no Sowieso deduction**; `ohnehin_anteil` is informational only.
- EM: 15 % base; cap 30.000 € (60.000 € with BAFA-funded iSFP); iSFP bonus +5 % only on eligible cost above 30.000 €; minimum invest 2.000 € (optimisation 300 €).
- Heizung: 30 % base + Klimageschwindigkeitsbonus 16 % (self-user; oil/coal/Gasetage/Nachtspeicher any age, gas/biomass ≥ 20 years; −4 points per half year, 0 from 08/2028) + income bonus 40/30/10 %; cap 70 % (80 % for income ≤ 30.000 €); eligible cost cap 28.000 € −750 € per half year; no iSFP bonus; hybrid only 60 % eligible.
- Household context lives in App state `foerderKontext` (`DEFAULT_FOERDERKONTEXT`: self-user, > 50.000 €, iSFP yes, application period 0) and is passed as `gebaeude.foerderung`. It survives preset changes.
- Simplifications: each measure = one application (caps per measure, not per calendar year), one dwelling, no WPB bonus (from 2027), no Fachplanung/Baubegleitung.

### Quantity model (`berechneMengen`, `wendeMengenAn`)

Area-based costs (`mengenbezug` in `kosten.js`: roof, façade, window, heated area) scale relative to `REFERENZ_GEBAEUDE` (= efhNachkrieg: 145 m² Wfl, 180 m² AN, 2 floors, EFH, pitched roof), which reproduces the registry quantities exactly. Footprint = AN ÷ floors; roof ∝ footprint (flat roof = footprint); façade ∝ √footprint × floors × exposed share (EFH/ZFH 1, DHH 0.75, RH 0.5); windows and floor heating ∝ Wohnfläche. Lump sums (M1, M4, M6) do not scale. User overrides win.

### Measure categories

`kategorie: "energetisch"` (default) or `"modernisierung"` (no energy effect, e.g. Badsanierung). Non-energy measures: no impact, no score/badge, never pre-selected, no energy step in `berechneKumuliert`, costs in `k.modernisierung_*` (not in `eigenanteil`/amortisation). Sidebar shows "Weitere Modernisierung" + "Gesamtbudget" only when such a measure is active.

### Cost registry (`kosten.js`)

Every `investition`/`ohnehin_anteil` comes from `KOSTENANSAETZE` (measures reference it via `kostenansatz`). Each entry carries `region`, `bezugsjahr`, `mwst`, `einheit`, `einheitspreis`/`menge`, `spanne`, `evidenz` (`dokumentiert` | `abgeleitet` | `annahme`) and `quellen`. All current values are `annahme` (no documented source). Regional values go into `KOSTENANSAETZE_REGIONAL.BE`; `kostenAnsatzFuer(id, "BE")` falls back to DE with `fallback: true`. Tests enforce the metadata and that a non-`annahme` entry has sources. Do not add numbers without an evidence level.

### State model

```
gebaeude          — building metadata
ist               — current energy state (endenergie, primaerenergie, co2)
bauteile          — array of {id, label, note(1-7)} — editable sliders
aktiveMassnahmen  — active measure IDs e.g. ["M1","M2","M3","M4","M5","M6"]
massnahmenOverrides — {M1: {investition, foerderquote}, …}

Derived (useMemo):
  effectivePakete, bauteile_state, k (ZIEL values), kumuliert, bewertung
```

---

## Presets

| Preset | Year | Heating | IST PE | EEK |
|--------|------|---------|--------|-----|
| efhNachkrieg | 1965 | Heizöl | 236 | G |
| efh70er | 1978 | Erdgas Brennwert | 172 | F |
| efh2000er | 2002 | Erdgas Brennwert | 118 | D |

Applying a preset resets all state. efh70er has `bauteile_overrides: { fenster: 5 }` (windows already replaced).

---

## Calculation reference (efhNachkrieg, all measures active)

| | IST | ZIEL |
|--|-----|------|
| Primärenergie | 236 kWh/(m²·a) | 62 kWh/(m²·a) |
| CO₂ | 63 kg/(m²·a) | 19 kg/(m²·a) |
| EEK | G | B |
| Investition | 139.800 € (M4 at auto variant „monoenergetisch“ = 29.000 €) | |
| BEG-Förderung | 27.200 € (BEG 2026 default context; M4: 28.000 € cap × 46 %) | |
| Eigenanteil | 112.600 € | |

With variant „monovalent“ forced: Investition 142.800 €. Pinned by `data.test.js` (via `berechneSzenario`, the app path) and `tests/e2e/golden-paths.spec.js`. Update all together when changing impact functions, factors, costs, subsidy rules or presets.

### Primary energy and CO₂ factors

Measure impact tables estimate the end-energy delta. Target Primärenergie and CO₂ are then recalculated from the resulting end energy and the active energy carrier:

- `Primärenergie = Endenergie × ENERGIE_TRAEGER_FAKTOREN[carrier].primaerenergie`
- `CO₂ = Endenergie × ENERGIE_TRAEGER_FAKTOREN[carrier].co2KgProKwh`
- Defaults follow GEG Anlage 4 for non-renewable primary energy factors and GEG Anlage 9 for emissions factors.
- Heat pumps and direct electric heating use net electricity defaults: PE factor `1.8`, CO₂ `0.560 kg/kWh`.
- Oil uses PE `1.1`, CO₂ `0.310 kg/kWh`; gas uses PE `1.1`, CO₂ `0.240 kg/kWh`; pellets/wood use PE `0.2`, CO₂ `0.020 kg/kWh`.
- Fernwärme remains a demonstrator fallback because real energy certificates require network-specific factors.

### PV revenue model (`berechnePvErtrag` in data.js)

Constants (all exported from `data.js`):

| Constant | Value | Note |
|----------|-------|------|
| `PV_KWP` | 10 | kWp system size assumed |
| `PV_SPEZ_ERTRAG` | 950 | kWh/kWp/year, average German site |
| `STROMPREIS_HAUSHALT` | 0.31 | €/kWh household tariff 2026 |
| `EINSPEISETARIF` | 0.082 | €/kWh EEG 2024, <10 kWp |
| `PV_EV_QUOTE_OHNE_WP` | 0.35 | self-consumption share without WP |
| `PV_EV_QUOTE_MIT_WP` | 0.60 | self-consumption share with WP + Speicher |

`berechnePvErtrag(mitWP)` returns `{ gesamtEur, evEur, einsEur }`. Called in M6 cost line (PaketBlock) with `mitWP = aktiveMassnahmen.includes("M4")`.

Expected outputs: ~1.330 €/year without WP (amortisation ~14 J), ~2.020 €/year with WP (amortisation ~9 J).

### Amortisation model

One function, `berechneWirtschaftlichkeit`, feeds sidebar, drawer, 20-year chart and print report (incl. user overrides from the editor).

- **Sidebar/Drawer KPI „Amortisation“**: `Eigenanteil ÷ (IST − ZIEL Heiz- + Wartungskosten + PV-Ertrag)` at static prices.
- **20-Jahr-Chart / print „20-Jahr-Bilanz“**: cumulative costs with price escalation (default IST fossil 2,5 %, ZIEL 2,0 % p. a.). „Break-even“ = actual crossing of both curves, therefore usually earlier than the static amortisation.

---

## Deployment

GitHub Pages serves `index.html` from the `main` branch root.

```bash
# The proxy port changes each session — look it up:
PROXY_PORT=$(git -C /home/user/iSFP-Schnellcheck remote get-url origin | grep -oP ':\K\d+(?=/)')
git remote set-url origin http://local_proxy@127.0.0.1:${PROXY_PORT}/git/johakunath/iSFP-Schnellcheck
git push -u origin <branch>
```

**MCP `push_files` as fallback**: For individual files ≤~50 KB. Avoid for large files (index.html ~1.7 MB, package-lock.json ~150 KB) — use `git push`.

---

## Known failure patterns (do not repeat)

### Variable naming in `.map()` callbacks
Never use `p` as a loop variable when `p` is already in outer scope. The `p is not defined` crash (PRs #27–#32) came from `MASSNAHMENPAKETE.map(p => …)`. Use descriptive names: `pak`, `paket`, `pkg`.

### Missing `?? 0` on optional number fields
`m.ohnehin_anteil`, `m.foerderquote`, `m.investition` can be undefined. Always write `m.ohnehin_anteil ?? 0`.

### effectivePakete vs MASSNAHMENPAKETE
All cost/subsidy display must use `effectivePakete`. If you see an unmarked `MASSNAHMENPAKETE` reference in a cost context, it is a bug.

### Git signing server
When `git commit` fails with signing error, use git plumbing:
```bash
TREE=$(git write-tree)
COMMIT=$(git commit-tree $TREE -p HEAD -m "message")
git update-ref refs/heads/<branch> $COMMIT
```

### Auth proxy port changes each session
```bash
PROXY_PORT=$(git -C /home/user/iSFP-Schnellcheck remote get-url origin | grep -oP ':\K\d+(?=/)')
git remote set-url origin http://local_proxy@127.0.0.1:${PROXY_PORT}/git/johakunath/iSFP-Schnellcheck
```

---

## Permanent maintenance rules

After every task, verify the following invariants are still satisfied:

| Invariant | How to check |
|-----------|-------------|
| **Golden values** | `npm test` must pass. If PE/EEK/Eigenanteil shift, update `data.test.js` AND this file AND `AGENTS.md` together. |
| **Offline guarantee** | `npm run build && npm test` must pass including the CDN-check in `verify.mjs`. No `googleapis.com`, `gstatic.com`, `cdnjs.cloudflare.com`, or `unpkg.com` references allowed in `dist/index.html`. |
| **Print/live consistency** | `ISFPPrintReport` receives `dynamicPakete` and the same `wirtschaftlichkeit` object as the sidebar. It shows only active measures per package. |
| **Recommendation logic** | `getDefaultAktiveMassnahmen` is the only default-selection rule (start state, preset, field change, PDF import via `uebernehmeGebaeude`). `massnahmeIstSchonVorhanden` gates M4 and M6. |
| **Single sources** | Subsidy → `berechneFoerderung`; WP variant → `bestimmeWpVariante`; carrier price/label/maintenance → `faktorKeyFuerHeizung` + `TRAEGER_INFO`; costs → `kosten.js`. Do not re-implement these inline in components. |
| **PDF confirmation** | PDF extraction must never mutate state without user confirmation (`pendingExtraction` → review UI → `applyPendingExtraction`). Do not shortcut this flow. |

---

## Technical debt (known simplifications)

| Area | Simplification |
|------|---------------|
| Subsidy amounts | BEG 2026 rules per measure; caps applied per measure instead of per calendar year; no WPB bonus, no Fachplanung/Baubegleitung (see `FOERDERREGELN` comment) |
| Cost scaling | Geometric quantity model (square footprint); WP, PV and M1 stay lump sums |
| Cost evidence | All `KOSTENANSAETZE` are `annahme` (undocumented, bundesweit) |
| EEK basis | Class from Primärenergie with GEG Anlage-10 thresholds; real Energieausweis (GEG §86) classifies by Endenergie |
| Wohnfläche | Heuristic GNF / 1.3 when not from PDF |
| WP COP | Wärmeverteilung affects WP impact through variant multipliers and flow-temperature malus, but no full hourly COP model |
| CO₂ values | Target CO₂ is factor-based from Endenergie and carrier; per-measure CO₂ labels are still static hints |
| Multi-WE | Treats ZFH/DHH/RH identically to EFH |
| Amortisation | Sidebar KPI static; 20-year chart uses escalation |
| Legal basis | GEG replaced by GModG on 29.07.2026; PE/CO₂ factors still labelled GEG Anlage 4/9 (carry-over not verified) |
| PV revenue | Fixed 10 kWp assumed; no shading, orientation, or roof-area checks |
| PV EV quote | Fixed 35 %/60 % split; real value depends on household consumption profile |
