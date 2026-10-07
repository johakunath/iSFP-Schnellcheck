# iSFP-Schnellcheck · AGENTS.md

Quick-start for AI coding agents. Read CLAUDE.md for full domain context.

## Project type

Single-page React app bundled to one `index.html`. No server, no CDN, no runtime deps.

## Source files

```
build/src/
  App.jsx               — state, handlers, derived memos, layout (~730 lines)
  data.js               — calculation engine (pure functions, no React)
  kosten.js             — cost registry (values + region/year/unit/VAT/evidence)
  warum.js              — per-measure explanation texts
  helpers.jsx           — fmt/fmtEur/textColorFor/waermeEEK/EnergyBar
  data.test.js          — Vitest unit tests for data.js / kosten.js
  components/           — ui, Erfassung, PaketBlock, Ergebnis, Diagramme,
                          ErgebnisUebersicht, Hintergruende, ISFPPrintReport, MassnahmenEditor
```

## Dev workflow

```bash
cd build
npm run build   # build + smoke test + copy dist/index.html → ../index.html
npm test        # Vitest unit tests (run after any change to data.js)
```

Run `npm run build` after every change that touches source files. Run `npm test` after any change to `data.js` or `kosten.js` — the tests pin exact PE/EEK/Eigenanteil values for efhNachkrieg. `npm run test:e2e` pins the same values in the UI and checks first-load = preset-click.

## Git push in Claude Code sessions

The `/home/user/isfp` remote defaults to bare HTTPS (push fails). Switch to the local auth proxy first — it handles GitHub auth transparently:

```bash
PROXY_PORT=$(git -C /home/user/iSFP-Schnellcheck remote get-url origin | grep -oP ':\K\d+(?=/)') && git remote set-url origin http://local_proxy@127.0.0.1:${PROXY_PORT}/git/johakunath/iSFP-Schnellcheck
git push -u origin <branch>
```

MCP `push_files` works for small files (≤~50 KB) but is unreliable for large ones (`index.html` ~1.7 MB, `package-lock.json` ~150 KB). Prefer `git push`.

## Change safety rules

1. **Never edit the root `index.html` directly** — it is overwritten by every build.
2. **Single sources**: packages via `erstelleEffektivePakete` + `ordneAbgleichNachWp`, subsidy via `berechneFoerderung`, WP variant via `bestimmeWpVariante`, economics via `berechneWirtschaftlichkeit`, costs via `kosten.js`. No raw `MASSNAHMENPAKETE` in App.jsx.
3. **Calculation reference**: `berechneSzenario({ presetId: "efhNachkrieg", aktiveMassnahmen: allIds })` must produce PE=62, CO₂=19, EEK=B, Investition=139,800, Förderung=24,600, Eigenanteil=115,200 (M4 at auto variant monoenergetisch, incl. +10 % Klimageschwindigkeitsbonus). PE/CO₂ are factor-based from target Endenergie and carrier, with PV as a separate credit; if your change shifts these, update `data.test.js` and CLAUDE.md together.
4. **One build per PR**: verify `npm run build && npm test` both pass before pushing.
5. **German naming is intentional**: `bauteile_state`, `effectivePakete`, `bewerteMassnahmen`, etc. Keep it consistent.

## Domain summary

Renovation measures M1–M7 are grouped in packages P1–P5 (P2b = Fenster). Non-energy measures (`kategorie: "modernisierung"`, e.g. a future Badsanierung) are supported by the engine and reported separately. Each measure has a state-aware `impact(bauteile_state)` function. `effectivePakete` merges user cost overrides from `massnahmenOverrides` into the base `MASSNAHMENPAKETE`. See CLAUDE.md for full EEK, BEG subsidy, and TABULA building-age logic.
