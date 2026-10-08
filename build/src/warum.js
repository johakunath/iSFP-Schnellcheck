// ============================================================================
// "Warum diese Maßnahme / warum jetzt" — Texte je Maßnahme und Gebäudezustand.
// Neue Maßnahmen (z. B. Badsanierung) ergänzen hier einen case; ohne case
// bleibt der Warum-Bereich leer.
// ============================================================================
import { WP_VARIANTEN, vorlauftemperaturFuer, heizungsFoerderParameter, klimabonusBerechtigt, DEFAULT_FOERDERKONTEXT } from "./data.js";

// ctx.wp = Ergebnis von bestimmeWpVariante (gleiche Variante wie in der Rechnung)
export function getWarum(measureId, ctx) {
  const { bauteile_state: bs, gebaeude, aktiveMassnahmen, nichtEmpfohlen, wp } = ctx;
  switch (measureId) {
    case "M1": {
      const grund = "Hydraulischer Abgleich verteilt das Heizwasser gleichmäßig auf alle Räume — kein Heizkörper läuft mehr zu kalt oder zu heiß.";
      const jetzt = aktiveMassnahmen.includes("M4")
        ? "Nach WP-Einbau zwingend: BEG-Pflicht und neue Massenströme machen einen erneuten Abgleich nötig."
        : "Sofort umsetzbar — geringe Investition, schnelle Heizkostenwirkung, Voraussetzung für viele BEG-Anträge.";
      return { grund, jetzt };
    }
    case "M2": {
      const note = bs.dach || 2;
      const grund = note <= 2
        ? "Ihr Dach ist ungedämmt. Bis zu 30 % der Heizenergie geht über das Dach verloren — höchstes Einsparpotenzial im Gebäude."
        : note <= 4
        ? "Ihr Dach hat Teildämmung. Eine Aufdopplung bringt noch spürbare Einsparungen."
        : "Ihr Dach ist bereits gut gedämmt. Zusätzliche Dämmung lohnt sich kaum.";
      const jetzt = aktiveMassnahmen.includes("M4")
        ? "Vor der Wärmepumpe einplanen: schlechte Hülle macht eine größer dimensionierte (teurere) WP nötig."
        : "Frühzeitig umsetzen — kurze Bauzeit, hohe Wirkung pro investiertem Euro.";
      return { grund, jetzt };
    }
    case "M3": {
      const note = bs.fenster || 2;
      const grund = note <= 2
        ? "Ihre Fenster sind alt und undicht — Zugluft und hohe Wärmeverluste. Sehr hohes Einsparpotenzial."
        : note <= 3
        ? "Ihre Fenster haben ältere Zweifachverglasung. Mit 3-fach-Verglasung sind noch spürbare Primärenergieeinsparungen möglich."
        : note <= 4
        ? "Ihre Fenster sind auf mittlerem Standard. 3-fach-Verglasung bringt noch mäßige Einsparung."
        : "Fenster bereits auf hohem Standard — Tausch lohnt energetisch kaum.";
      const jetzt = nichtEmpfohlen
        ? "Hoher Investitionsbetrag bei kleiner PE-Wirkung — Dachdämmung oder WP zuerst priorisieren."
        : "Sinnvoll bei größerer Hüllsanierung; Fensterlaibungen bei der Fassadendämmung mitdenken.";
      return { grund, jetzt };
    }
    case "M4": {
      const vt = wp.vorlauftemp;
      const autoKey = wp.autoKey;
      const wpReady = vt <= 50;
      const grund = wpReady
        ? `Vorlauftemperatur ${vt} °C — Gebäude ist sofort WP-ready (${WP_VARIANTEN[autoKey]?.label}). Senkt Heizenergie um Faktor 3–4.`
        : aktiveMassnahmen.includes("M7")
        ? `Mit Erneuerung Wärmeverteilung (M7): Vorlauftemperatur sinkt auf 35 °C → Monovalent-Betrieb möglich (COP ~4–5).`
        : `Aktuelle Vorlauftemperatur ${vt} °C zu hoch für effizienten WP-Betrieb. Ohne M7 nur ${WP_VARIANTEN[autoKey]?.label} sinnvoll.`;
      const jetzt = aktiveMassnahmen.includes("M7")
        ? "Nach Wärmeverteilung-Umbau einbauen — dann ist Monovalent-Betrieb (höchster COP) erreichbar."
        : (aktiveMassnahmen.includes("M2") || aktiveMassnahmen.includes("M5"))
        ? "Nach Hüllsanierung einbauen — WP kann kleiner dimensioniert werden, was Investition senkt."
        : (() => {
            const kontext = { ...DEFAULT_FOERDERKONTEXT, ...(gebaeude.foerderung || {}) };
            const { klimabonus } = heizungsFoerderParameter(kontext.antragszeitraum);
            return klimabonus > 0 && klimabonusBerechtigt(gebaeude, kontext)
              ? `Klimageschwindigkeitsbonus aktuell ${Math.round(klimabonus * 100)} %, sinkt je Halbjahr um 4 Punkte und entfällt ab Aug 2028 — früher Antrag lohnt sich.`
              : "Seit dem GModG (29.07.2026) gibt es keine 65-%-EE-Pflicht mehr; neue Öl-/Gaskessel brauchen aber ab 2029 einen steigenden Bioanteil.";
          })();
      return { grund, jetzt };
    }
    case "M5": {
      const note = bs.waende || 2;
      const grund = note <= 2
        ? "Ihre Außenwände sind ungedämmt — größter Verlust- und Schimmelrisiko-Faktor der Gebäudehülle."
        : note <= 4
        ? "Wände teilgedämmt — Aufdopplung lohnt nur bei sowieso fälliger Putzerneuerung."
        : "Fassade bereits gut gedämmt — Dämmung lohnt energetisch kaum.";
      const jetzt = nichtEmpfohlen
        ? "Ihr €/kWh-Score liegt über der Schwelle für „nicht empfohlen“ — andere Maßnahmen bringen mehr Einsparung je investiertem Euro."
        : "Idealerweise gemeinsam mit fälliger Putzerneuerung umsetzen — Gerüstkosten bereits eingerechnet.";
      return { grund, jetzt };
    }
    case "M6": {
      const grund = aktiveMassnahmen.includes("M4")
        ? "Mit Wärmepumpe besonders attraktiv: Eigenstrom senkt WP-Betriebskosten direkt und verbessert die CO₂-Bilanz."
        : "Wirtschaftlich auch ohne WP — amortisiert sich über Eigenverbrauch und EEG-Einspeisung in 8–12 Jahren.";
      const jetzt = "Reihenfolge flexibel — sinnvoll am Schluss, wenn Strombedarf der WP geplant ist.";
      return { grund, jetzt };
    }
    case "M7": {
      const vt = vorlauftemperaturFuer(gebaeude.waermeverteilung);
      const grund = vt > 55
        ? `Aktuelle Vorlauftemperatur ${vt} °C ist zu hoch für effizienten WP-Betrieb. Umbau senkt VT auf ~35 °C.`
        : vt > 45
        ? `Vorlauftemperatur ${vt} °C — Umbau ermöglicht Monovalent statt Monoenergetisch.`
        : `Vorlauftemperatur bereits niedrig (${vt} °C). Umbau bringt nur noch geringen Effizienzgewinn.`;
      const jetzt = aktiveMassnahmen.includes("M4")
        ? "Vor WP-Einbau erledigen — sonst muss man Estrich/Heizkreis zweimal anfassen."
        : "Eigenständig kaum lohnend — Wirkung entsteht erst durch Wärmepumpe.";
      return { grund, jetzt };
    }
    default:
      return { grund: "", jetzt: "" };
  }
}
