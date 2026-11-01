import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ManifestError, parseManifest, type GameManifest } from "./manifest.ts";

/** Liest und validiert alle games/<slug>/game.json (nur zur Build-Zeit). */
export function loadManifests(gamesDir: string): GameManifest[] {
  const manifests = readdirSync(gamesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(gamesDir, d.name, "game.json")))
    .map((d) => {
      const file = join(gamesDir, d.name, "game.json");
      let data: unknown;
      try {
        data = JSON.parse(readFileSync(file, "utf8"));
      } catch (e) {
        throw new ManifestError(
          `Ungültiges Manifest ${file}:\n  - kein gültiges JSON (${String(e)})`,
        );
      }
      const m = parseManifest(data, file);
      if (m.slug !== d.name) {
        throw new ManifestError(
          `Ungültiges Manifest ${file}:\n  - slug: "${m.slug}" muss dem Ordnernamen "${d.name}" entsprechen`,
        );
      }
      if (!existsSync(join(gamesDir, d.name, "public", m.thumbnail))) {
        throw new ManifestError(
          `Ungültiges Manifest ${file}:\n  - thumbnail: public/${m.thumbnail} existiert nicht`,
        );
      }
      return m;
    });
  assertUniqueSlugs(manifests);
  return manifests;
}

export function assertUniqueSlugs(games: readonly GameManifest[]): void {
  const seen = new Set<string>();
  for (const g of games) {
    if (seen.has(g.slug)) throw new ManifestError(`Slug "${g.slug}" ist mehrfach vergeben`);
    seen.add(g.slug);
  }
}

export * from "./manifest.ts";
