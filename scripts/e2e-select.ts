/**
 * Welche E2E-Tests müssen laufen? (Spec 001, BUILD-AK-15)
 * - Nur ein Spiel geändert → dessen E2E-Datei + Smoke-Tests.
 * - Nur Doku/Specs → nur Smoke-Tests.
 * - Gemeinsamer Code (game-kit, Portal, Server, Skripte, Konfiguration, gemeinsame E2E-Dateien)
 *   oder Unbekanntes → alles.
 */
export interface Selection {
  full: boolean;
  /** E2E-Dateien zusätzlich zu den Smoke-Tests (leer bei full) */
  specs: string[];
  reason: string;
}

const SMOKE = "e2e/smoke.spec.ts";
const DOCS = /^(specs\/|README\.md$|CLAUDE\.md$|.*\.md$)/;

export function selectE2E(files: readonly string[], slugs: readonly string[]): Selection {
  const specs = new Set<string>();
  for (const f of files) {
    if (!f || DOCS.test(f)) continue;
    const game = /^games\/([a-z0-9-]+)\//.exec(f);
    if (game && slugs.includes(game[1]!)) {
      specs.add(`e2e/${game[1]}.spec.ts`);
      // Version und Neuigkeiten erscheinen auf der Startseite
      if (f.endsWith("/game.json")) specs.add("e2e/portal.spec.ts");
      continue;
    }
    const spec = /^e2e\/([a-z0-9-]+)\.spec\.ts$/.exec(f);
    if (spec && slugs.includes(spec[1]!)) {
      specs.add(f);
      continue;
    }
    if (f === SMOKE) continue;
    return { full: true, specs: [], reason: `gemeinsame Datei geändert: ${f}` };
  }
  const list = [...specs].sort();
  return {
    full: false,
    specs: list,
    reason: list.length ? `nur Spiele geändert: ${list.join(", ")}` : "nur Doku/Specs geändert",
  };
}

export { SMOKE };
