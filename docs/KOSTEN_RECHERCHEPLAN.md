# Rechercheplan: belastbare Kostenansätze für Berlin

Ziel: die Demo-Annahmen in `build/src/kosten.js` schrittweise durch belegte Werte ersetzen,
zuerst für Einfamilienhäuser und Doppelhaushälften in Berlin, dazu eine Badsanierung.
Keine Zahl ohne Evidenzgrad und Quelle.

## 1. Ausgangslage (Stand dieses Commits)

| Ansatz | Wert heute | Einheit / Menge | Evidenz | Anteil am Invest (Referenz-EFH) |
|---|---|---|---|---|
| M5 Fassade WDVS | 38.000 € | ~190 €/m² × 200 m² | Annahme | hoch |
| M4 Wärmepumpe | 24.000–32.000 € je Variante | ~2.700 €/kW × 12 kW | Annahme | hoch |
| M2 Dach | 22.000 € | ~180 €/m² × 120 m² | Annahme | hoch |
| M3 Fenster | 19.000 € | ~750 €/m² × 25 m² | Annahme | mittel |
| M6 PV 10 kWp + 8 kWh | 18.000 € | Text ~1.500 €/kWp passt nicht zu 18.000 € | Annahme, widersprüchlich | mittel |
| M7 Fußbodenheizung | 12.000 € | ~100 €/m² × 120 m² | Annahme | mittel |
| M1 Hydraulischer Abgleich | 1.800 € | pauschal | Annahme | gering |
| Sowieso-Anteile (alle) | 0–12.000 € | — | Annahme, Herleitung fehlt | beeinflusst Förderung |
| Öltank-Rückbau, Gasanschluss | 2.500 € / 3.000–5.000 € | pauschal | Annahme | Begleitkosten |
| Badsanierung | — | — | fehlt | neu |

Mengenmodell ist umgesetzt (`berechneMengen` in data.js): Dach-, Fassaden-, Fenster- und
beheizte Fläche werden aus Wohnfläche, Nutzfläche, Geschossen, Gebäudetyp (DHH 75 %, RH 50 %
freie Außenwand) und Dachform abgeleitet. Belegte €/m²-Werte lassen sich daher direkt als
`einheitspreis` eintragen. Offen: Heizlast für die WP (heute pauschal).

## 2. Evidenzklassen (Pflichtfeld `evidenz` + Kennzeichnung)

| Klasse | Bedeutung | Beispiel |
|---|---|---|
| Berlin, dokumentiert | Wert direkt aus Quelle mit Berlin-Bezug | Angebot eines Berliner Betriebs, Berliner Förderstatistik |
| DE, dokumentiert (Fallback) | bundesweiter Wert aus belastbarer Quelle | Kostenkennwerte einer Fachpublikation |
| abgeleitet | aus dokumentierten Werten berechnet | DE-Kennwert × Regionalfaktor Berlin, indexiert aufs Bezugsjahr |
| Annahme | keine belastbare Quelle | heutiger Stand aller Werte |

Je Eintrag festhalten: Bezugsjahr, Region, brutto/netto, Einheit, Spanne (min/max) statt Punktwert
wo möglich, Quelle mit Titel/Herausgeber/Jahr/Seite/Abrufdatum.

## 3. Quellen nach Priorität

Vor Übernahme jeweils prüfen: Verfügbarkeit, Aktualität, Lizenz (z. B. Zitierrecht bei kostenpflichtigen Werken).

1. **Fachliche Kostenkennwerte (DE, professionell):** BKI Baukosten Altbau (Baukosteninformationszentrum
   Deutscher Architektenkammern) — Kostenkennwerte je Bauelement, dazu BKI-Regionalfaktoren je Kreis
   inkl. Berlin. Wahrscheinlich die beste Basis für M2, M3, M5, M7 und das Bad (kostenpflichtig).
2. **Forschungsberichte zu Kosten energetischer Modernisierung:** IWU/BBSR-Untersuchungen
   „Kosten energierelevanter Bau- und Anlagenteile bei der energetischen Modernisierung“ — liefern
   auch die Trennung Vollkosten vs. energiebedingte Mehrkosten (= Sowieso-Anteil). Aktuelle Ausgabe prüfen.
3. **Evaluationen der BEG-Förderung** (im Auftrag des BMWK, z. B. Prognos/ifeu/FIW): durchschnittliche
   förderfähige Kosten je Maßnahmenart aus echten Anträgen; prüfen, ob Auswertung nach Bundesland
   (Berlin) existiert.
4. **Preisindizes zur Fortschreibung aufs Bezugsjahr:** Destatis Baupreisindizes (Wohngebäude,
   Instandhaltung); prüfen, ob das Amt für Statistik Berlin-Brandenburg einen Berliner Index führt.
5. **Wärmepumpe:** Feldtests im Bestand (Fraunhofer ISE) für Systemkosten, falls ausgewiesen;
   ergänzend Förderstatistik (KfW 458, s. 3).
6. **PV + Speicher:** Marktstammdatenregister liefert keine Preise; Preisberichte aus Marktforschung
   prüfen, sonst Angebote.
7. **Berlin-Bezug direkt:** 2–3 schriftliche Angebote Berliner Fachbetriebe je Gewerk für ein
   konkretes Referenzhaus (EFH und DHH) → Evidenz „Berlin, dokumentiert (Angebot)“, Spanne aus min/max.
8. **Badsanierung:** BKI-Elementkosten (Sanitär, Fliesen, Abdichtung, Elektro) + Angebote;
   Verbraucherportale nur als „Annahme“ markieren. Förderung prüfen: KfW-Programme zum
   barrierereduzierenden Umbau (Zuschuss abhängig von Haushaltsmitteln) — sonst `foerderquote: 0`.

Nicht als Beleg verwenden: Kostenrechner von Vergleichs- und Vermittlungsportalen ohne Methodik.

## 3a. Bereits ausgewertet (10/2026)

**BEG-Evaluation „Förderwirkungen BEG EM 2024“** (Prognos/ifeu/FIW/ITG, Endbericht 2026, energiewechsel.de),
Tabellen 3-6 und 3-9, Wohngebäude, bundesweit. Gesamtinvestition je Förderfall (eigene Division,
alle Gebäudegrößen gemischt, ~1,9 Wohneinheiten je Förderfall, laut Bericht systematisch unterschätzt):

| Maßnahme | Förderfälle | Gesamtinvestition | je Förderfall |
|---|---|---|---|
| Wärmepumpe | 135.289 | 6.488 Mio. € | ~48.000 € |
| Fenster/Außentüren | 39.549 | 913 Mio. € | ~23.100 € |
| Dachflächen, Decken, Wände | 7.251 | 545 Mio. € | ~75.200 € |
| Außenwand | 4.557 | 324 Mio. € | ~71.100 € |

Einordnung: **DE, dokumentiert, aber nicht EFH-spezifisch** → nur Plausibilitätsprüfung, kein Ersatz für
`KOSTENANSAETZE`. Keine Auswertung nach Bundesland oder Gebäudetyp im Bericht gefunden.

**Badsanierung**: nur Ratgeber-/Anbieterseiten verfügbar (siehe `QUELLEN_BAD` in kosten.js), Evidenz „Annahme“.

## 4. Vorgehen

| Schritt | Ergebnis | Aufwand |
|---|---|---|
| 1. Mengenmodell (Flächen aus Wfl., Geschosse, Typ EFH/DHH) | erledigt; Heizlast für WP offen | — |
| 2. Referenzhaus Berlin festlegen (EFH + DHH, Baujahr, Flächen) | gemeinsame Basis für Angebote und Kennwerte | 1 h |
| 3. BKI / IWU-BBSR für M5, M2, M3, M7 auswerten (Vollkosten + Sowieso-Anteil) | DE-dokumentiert, Spannen | Recherche |
| 4. Regionalfaktor Berlin + Index aufs Bezugsjahr anwenden | „abgeleitet“, Region BE | gering |
| 5. WP, PV, Bad: Förderstatistik/Feldtests + Angebote | Spannen, Berlin-Bezug | Angebote einholen |
| 6. Einträge in `KOSTENANSAETZE_REGIONAL.BE` mit Quellen anlegen | Tests erzwingen Metadaten | Code |
| 7. UI: Spanne statt Punktwert zeigen, Region wählbar (Vorschlag, erst nach Mockup) | sichtbare Unsicherheit | Code |

Reihenfolge nach Wirkung auf den Eigenanteil: M5 → M4 → M2 → M3 → M6 → M7 → Bad → M1.
