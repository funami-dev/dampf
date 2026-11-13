/**
 * E2E-Prüfung nur für den geänderten Bereich (Spec 001, BUILD-AK-15):
 *   tsx scripts/e2e-changed.ts           lokal: baut und testet die geänderten Spiele
 *                                        (gegenüber origin/master, inkl. nicht committeter Dateien)
 *   tsx scripts/e2e-changed.ts --prod    gegen Production: was der letzte Merge geändert hat
 *   --full                               immer alles
 * Bei gemeinsamem Code läuft automatisch alles.
 */
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadManifests } from "../packages/game-kit/src/node.ts";
import { selectE2E } from "./e2e-select.ts";

const args = process.argv.slice(2);
const prod = args.includes("--prod");
const sh = (c: string) => execSync(c, { encoding: "utf8" }).trim();
const lines = (t: string) => t.split("\n").filter(Boolean);

const slugs = loadManifests(fileURLToPath(new URL("../games/", import.meta.url))).map(
  (m) => m.slug,
);
let files: string[];
if (prod) {
  // letzter Merge auf master: Unterschied zum vorherigen Stand
  files = lines(sh("git diff --name-only HEAD^1 HEAD"));
} else {
  let base: string;
  try {
    base = sh("git merge-base HEAD origin/master");
  } catch {
    // ohne origin: gegen HEAD
    base = "HEAD";
  }
  files = [
    ...lines(sh(`git diff --name-only ${base}`)),
    ...lines(sh("git ls-files --others --exclude-standard")),
  ];
}
const sel = args.includes("--full")
  ? { full: true, specs: [], reason: "--full" }
  : selectE2E([...new Set(files)], slugs);
console.log(`E2E-Auswahl: ${sel.full ? "alles" : "nur Geändertes"} (${sel.reason})`);
if (!sel.full && sel.specs.length === 0) process.exit(0);

const env = { ...process.env, ...(prod ? { DAMPF_URL: "https://dampf.vercel.app" } : {}) };
const run = (cmd: string, a: string[]) => {
  const r = spawnSync(cmd, a, { stdio: "inherit", env, shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
if (!prod) run("npm", ["run", "build"]);
run("npx", ["playwright", "test", ...(sel.full ? [] : sel.specs)]);
