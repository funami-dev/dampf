// Fügt Portal und Spiele zu dist/ zusammen (BUILD-AK-02):
//   dist/index.html              ← Portal
//   dist/games/<slug>/index.html ← Spiel
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadManifests } from "@dampf/game-kit/node";
import { dist, gamesDir, portalDist } from "./paths.ts";

rmSync(dist, { recursive: true, force: true });
cpSync(portalDist, dist, { recursive: true });

for (const game of loadManifests(gamesDir)) {
  const from = join(gamesDir, game.slug, "dist");
  const html = join(from, "index.html");
  if (!existsSync(html)) throw new Error(`Spiel "${game.slug}" wurde nicht gebaut (${html} fehlt)`);
  const base = `/games/${game.slug}/`;
  if (!readFileSync(html, "utf8").includes(base)) {
    throw new Error(`Spiel "${game.slug}": vite.config.ts muss base: "${base}" setzen`);
  }
  cpSync(from, join(dist, "games", game.slug), { recursive: true });
}
console.log(`✓ dist/ zusammengestellt`);
