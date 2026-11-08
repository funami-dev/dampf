/** Lokaler Raum-Server (Entwicklung und E2E): gleiche Logik wie auf Cloudflare. */
import { WebSocketServer } from "ws";
import { Hub, route } from "./hub.ts";

const port = Number(process.env.PORT ?? 8787);
const hub = new Hub();
const wss = new WebSocketServer({ port });
wss.on("connection", (ws, req) => {
  const r = route(new URL(req.url ?? "/", "http://x").pathname);
  if (!r) return ws.close(4004, "bad-path");
  const conn = {
    send: (t: string) => ws.send(t),
    close: (c?: number, why?: string) => ws.close(c, why),
  };
  ws.on("message", (data) => hub.message(conn, data.toString()));
  ws.on("close", () => hub.disconnect(conn));
  if (r.kind === "host") hub.host(conn);
  else hub.join(conn, r.code);
});
console.log(`Raum-Server läuft auf ws://localhost:${port}`);
