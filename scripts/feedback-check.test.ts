import { execFile } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./feedback-check.sh", import.meta.url));
const TOKEN = "lokal-test-token-123";

let server: Server | undefined;
afterEach(() => server?.close());

/** Startet einen Ersatz-Server und gibt die Feedback-Adresse zurück */
async function mock(
  handler: (req: IncomingMessage) => { status: number; body?: unknown; delayMs?: number },
): Promise<string> {
  server = createServer((req, res) => {
    const r = handler(req);
    setTimeout(() => {
      res.writeHead(r.status, { "Content-Type": "application/json" });
      res.end(r.body === undefined ? "" : JSON.stringify(r.body));
    }, r.delayMs ?? 0);
  });
  await new Promise<void>((ok) => server!.listen(0, "127.0.0.1", ok));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}/feedback`;
}

function run(api: string, token?: string) {
  const env: NodeJS.ProcessEnv = { ...process.env, FEEDBACK_API: api };
  delete env.FEEDBACK_ADMIN_TOKEN;
  if (token) env.FEEDBACK_ADMIN_TOKEN = token;
  const start = Date.now();
  return new Promise<{ code: number; out: string; ms: number }>((ok) => {
    execFile("bash", [script], { env, timeout: 20_000 }, (err, stdout, stderr) =>
      ok({
        code: err ? ((err as { code?: number }).code ?? 1) : 0,
        out: stdout + stderr,
        ms: Date.now() - start,
      }),
    );
  });
}

const stats = (jeSpiel: Record<string, number>) => ({
  neu: { gesamt: Object.values(jeSpiel).reduce((a, b) => a + b, 0), jeSpiel },
  jeStatus: { neu: 0 },
});

describe("Hook-Skript scripts/feedback-check.sh", () => {
  it("FEEDBACK-AK-21/29: meldet neue Feedbacks je Spiel mit Spieltitel", async () => {
    const seen: string[] = [];
    const api = await mock((req) => {
      seen.push(`${req.url} ${req.headers.authorization ?? ""}`);
      return { status: 200, body: stats({ kasse: 1, waldlager: 2, portal: 1, spielidee: 1, "unbekannt-x": 1 }) };
    });
    const r = await run(api, TOKEN);
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe(
      "Feedback-Check: Es gibt 6 neue Feedbacks: 2× Waldlager, 1× Kassen-Held, 1× Spielidee, 1× Startseite, 1× unbekannt-x – ansehen?",
    );
    expect(seen).toEqual([`/feedback/stats Bearer ${TOKEN}`]);
    expect(r.out).not.toContain(TOKEN);
  });

  it("FEEDBACK-AK-21: ein neues und kein neues Feedback", async () => {
    let body = stats({ snake: 1 });
    const api = await mock(() => ({ status: 200, body }));
    expect((await run(api)).out.trim()).toBe(
      "Feedback-Check: Es gibt 1 neues Feedback: 1× Snake – ansehen?",
    );
    body = stats({});
    expect((await run(api)).out.trim()).toBe("Feedback-Check: Kein neues Feedback.");
  });

  it("FEEDBACK-AK-22/23: 401, kaputte Antwort und nicht erreichbar", async () => {
    const api = await mock((req) =>
      req.headers.authorization === `Bearer ${TOKEN}`
        ? { status: 200, body: { kaputt: true, text: "Geheimer Kindertext" } }
        : { status: 401, body: { error: "unauthorized" } },
    );
    const no = await run(api);
    expect(no).toMatchObject({ code: 0 });
    expect(no.out.trim()).toBe(
      "Feedback-Check: Feedback konnte nicht abgefragt werden (kein gültiges Token).",
    );
    const bad = await run(api, TOKEN);
    expect(bad.code).toBe(0);
    expect(bad.out).toContain("Feedback konnte nicht abgefragt werden");
    expect(bad.out).not.toContain("Geheimer Kindertext");
    expect(bad.out).not.toContain(TOKEN);
    server!.close();
    server = undefined;
    const down = await run(api, TOKEN);
    expect(down.code).toBe(0);
    expect(down.out.trim()).toBe(
      "Feedback-Check: Feedback konnte nicht abgefragt werden (Server nicht erreichbar).",
    );
  });

  it("FEEDBACK-AK-22/23: bricht nach etwa 5 Sekunden ab", { timeout: 20_000 }, async () => {
    const api = await mock(() => ({ status: 200, body: stats({ snake: 1 }), delayMs: 8000 }));
    const r = await run(api);
    expect(r.code).toBe(0);
    expect(r.out).toContain("Feedback konnte nicht abgefragt werden");
    expect(r.ms).toBeLessThan(6500);
  });
});
