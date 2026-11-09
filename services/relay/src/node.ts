/** Lokaler Raum-Server (Entwicklung und E2E): gleiche Logik wie auf Cloudflare. */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { CORS, Hub, route } from "./hub.ts";
import { FB_LIMITS, FeedbackService, MemoryRepo, isFeedbackPath } from "./feedback.ts";

const port = Number(process.env.PORT ?? 8787);
const hub = new Hub();
/** Feedback (Spec 004) im Arbeitsspeicher; Admin-Token nur aus der Umgebung (E2E: Testwert) */
const feedback = new FeedbackService(new MemoryRepo(), {
  adminToken: process.env.FEEDBACK_ADMIN_TOKEN,
});
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (isFeedbackPath(url.pathname)) {
    // Body höchstens bis knapp über die Grenze lesen
    let body = "";
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > FB_LIMITS.bytes + 1) break;
      body += String(chunk);
    }
    const r = feedback.handle({
      method: req.method ?? "GET",
      path: url.pathname,
      query: url.searchParams,
      header: (n) => {
        const v = req.headers[n.toLowerCase()];
        return Array.isArray(v) ? v.join(", ") : (v ?? null);
      },
      body: size > FB_LIMITS.bytes ? "x".repeat(FB_LIMITS.bytes + 1) : body,
      // Nur lokal: Tests geben je Test einen eigenen Absender vor (Rate-Limit)
      ip: String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? ""),
    });
    res.writeHead(r.status, r.headers);
    res.end(r.body);
    return;
  }
  const r = route(url.pathname);
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
