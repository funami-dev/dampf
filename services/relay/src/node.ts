/** Lokaler Raum-Server (Entwicklung und E2E): gleiche Logik wie auf Cloudflare. */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { CORS, Hub, route } from "./hub.ts";

const port = Number(process.env.PORT ?? 8787);
const hub = new Hub();
const server = createServer((req, res) => {
  const r = route(new URL(req.url ?? "/", "http://x").pathname);
  if (r?.kind === "list") {
    res.writeHead(200, CORS);
    res.end(JSON.stringify(hub.list()));
    return;
  }
  res.writeHead(r ? 426 : 404, { "Content-Type": "text/plain" });
  res.end(r ? "WebSocket erwartet" : "Nicht gefunden");
});
const wss = new WebSocketServer({ server });
wss.on("connection", (ws, req) => {
  const r = route(new URL(req.url ?? "/", "http://x").pathname);
  if (!r || r.kind === "list") return ws.close(4004, "bad-path");
  const conn = {
    send: (t: string) => ws.send(t),
    close: (c?: number, why?: string) => ws.close(c, why),
  };
  ws.on("message", (data) => hub.message(conn, data.toString()));
  ws.on("close", () => hub.disconnect(conn));
  if (r.kind === "host") hub.host(conn);
  else hub.join(conn, r.code);
});
server.listen(port, () => console.log(`Raum-Server läuft auf ws://localhost:${port}`));
