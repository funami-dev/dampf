// Baut jedes Spiel unter games/* mit seinem eigenen Vite-Build.
import { execFileSync } from "node:child_process";
import { loadManifests } from "@dampf/game-kit/node";
import { gamesDir } from "./paths.ts";

for (const game of loadManifests(gamesDir)) {
  console.log(`\n▶ Baue Spiel "${game.slug}"`);
  execFileSync("npm", ["run", "build", "-w", `games/${game.slug}`], { stdio: "inherit" });
}
