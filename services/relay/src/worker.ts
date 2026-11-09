/**
 * Cloudflare Worker + Durable Objects: „Hub“ hält alle Räume im Speicher, „FeedbackStore“
 * speichert Feedback in SQLite (Spec 004).
 */
import { CORS, Hub, route } from "./hub.ts";
import { FB_LIMITS, FeedbackService, isFeedbackPath } from "./feedback.ts";
import { SqlRepo, type SqlLike } from "./feedback-sql.ts";

interface Namespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(req: Request): Promise<Response> };
}

interface Env {
  HUB: Namespace;
  FEEDBACK: Namespace;
  /** Worker-Secret (`wrangler secret put FEEDBACK_ADMIN_TOKEN`), nie im Repo */
  FEEDBACK_ADMIN_TOKEN?: string;
}

interface CfSocket {
  accept(): void;
  send(text: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "message", fn: (e: { data: unknown }) => void): void;
  addEventListener(type: "close" | "error", fn: () => void): void;
}
declare const WebSocketPair: { new (): { 0: CfSocket; 1: CfSocket } };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response("Dampf-Raum-Server", { status: 200 });
    if (isFeedbackPath(url.pathname))
      return env.FEEDBACK.get(env.FEEDBACK.idFromName("feedback")).fetch(req);
    const r = route(url.pathname);
    if (!r) return new Response("Nicht gefunden", { status: 404 });
    if (r.kind === "list") return env.HUB.get(env.HUB.idFromName("hub")).fetch(req);
    if (req.headers.get("Upgrade") !== "websocket")
      return new Response("WebSocket erwartet", { status: 426 });
    return env.HUB.get(env.HUB.idFromName("hub")).fetch(req);
  },
};

export class Hub_DO {
  hub = new Hub();
  async fetch(req: Request): Promise<Response> {
    const r = route(new URL(req.url).pathname)!;
    if (r.kind === "list") return new Response(JSON.stringify(this.hub.list()), { headers: CORS });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    const conn = {
      send: (t: string) => server.send(t),
      close: (c?: number, why?: string) => server.close(c, why),
    };
    server.addEventListener("message", (e) => this.hub.message(conn, String(e.data)));
    const gone = () => this.hub.disconnect(conn);
    server.addEventListener("close", gone);
    server.addEventListener("error", gone);
    if (r.kind === "host") this.hub.host(conn);
    else this.hub.join(conn, r.code);
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }
}
export { Hub_DO as Hub };

/** Feedback-Speicher (Spec 004): ein Objekt für alles Feedback, SQLite im Durable Object */
export class FeedbackStore {
  service: FeedbackService;
  constructor(state: { storage: { sql: SqlLike } }, env: Env) {
    this.service = new FeedbackService(new SqlRepo(state.storage.sql), {
      adminToken: env.FEEDBACK_ADMIN_TOKEN,
    });
  }
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const len = Number(req.headers.get("Content-Length") ?? 0);
    const body =
      len > FB_LIMITS.bytes || req.method === "GET" || req.method === "OPTIONS"
        ? ""
        : await req.text();
    const res = this.service.handle({
      method: req.method,
      path: url.pathname,
      query: url.searchParams,
      header: (n) => req.headers.get(n),
      body,
      ip: req.headers.get("CF-Connecting-IP") ?? "",
    });
    return new Response(res.body || null, { status: res.status, headers: res.headers });
  }
}
