// Validiert alle game.json, bevor gebaut wird (BUILD-AK-04, BUILD-AK-05).
import { loadManifests, ManifestError } from "@dampf/game-kit/node";
import { gamesDir } from "./paths.ts";

try {
  const games = loadManifests(gamesDir);
  console.log(`✓ ${games.length} Spiel-Manifest(e) gültig: ${games.map((g) => g.slug).join(", ")}`);
} catch (e) {
  if (!(e instanceof ManifestError)) throw e;
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
