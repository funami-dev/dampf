// Minimaler statischer Server für dist/ (lokale Vorschau und E2E-Tests), verhält sich wie Vercel:
// /pfad/ → /pfad/index.html, unbekannte Pfade → 404.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dist } from "./paths.ts";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
};

const port = Number(process.env.PORT ?? 4321);

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  let file = normalize(join(dist, url));
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.endsWith("/")) return res.writeHead(308, { location: `${url}/` }).end();
    file = join(file, "index.html");
  }
  if (!existsSync(file)) return res.writeHead(404, { "content-type": "text/plain" }).end("404");
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Dampf läuft auf http://localhost:${port}`));
