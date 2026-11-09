import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  FB_LIMITS,
  FeedbackService,
  MemoryRepo,
  STATUSES,
  TRANSITIONS,
  type FbRequest,
  type Feedback,
  type FeedbackRepo,
  type Status,
} from "./feedback.ts";
import { SqlRepo, type SqlLike } from "./feedback-sql.ts";

const TOKEN = "test-geheim";
const T0 = Date.parse("2026-11-09T10:00:00.000Z");
const MIN = 60_000;

/** SQLite aus Node als Ersatz für die Durable-Object-SQL-API */
function nodeSql(): SqlLike {
  const db = new DatabaseSync(":memory:");
  return {
    exec(q: string, ...b: unknown[]) {
      const stmt = db.prepare(q);
      const args = b as (string | number | null)[];
      const rows = /^\s*SELECT/i.test(q) ? stmt.all(...args) : (stmt.run(...args), []);
      return { toArray: () => rows as Record<string, unknown>[] };
    },
  };
}

const repos: [string, () => FeedbackRepo][] = [
  ["Arbeitsspeicher", () => new MemoryRepo()],
  ["SQLite", () => new SqlRepo(nodeSql())],
];

const valid = () => ({
  game: "waldlager",
  gameVersion: "1.1.0",
  text: "Die Zelte sollen bunt sein",
  device: { mobile: true, touch: true, viewport: "400x700", browser: "Safari 18", os: "iOS" },
});

function setup(makeRepo: () => FeedbackRepo = () => new MemoryRepo(), token = TOKEN) {
  let t = T0;
  let k = 0;
  const repo = makeRepo();
  const svc = new FeedbackService(repo, {
    adminToken: token,
    now: () => t,
    randomId: () => "fb_" + String(k++).padStart(8, "0"),
  });
  const req = (
    method: string,
    pathAndQuery: string,
    o: { body?: string; headers?: Record<string, string>; ip?: string } = {},
  ) => {
    const u = new URL(pathAndQuery, "http://x");
    const headers = Object.fromEntries(
      Object.entries(o.headers ?? {}).map(([a, b]) => [a.toLowerCase(), b]),
    );
    const r: FbRequest = {
      method,
      path: u.pathname,
      query: u.searchParams,
      header: (n) => headers[n.toLowerCase()] ?? null,
      body: o.body ?? "",
      ip: o.ip ?? "1.2.3.4",
    };
    const res = svc.handle(r);
    return { ...res, data: res.body ? (JSON.parse(res.body) as Record<string, unknown>) : null };
  };
  const post = (body: unknown, o: { ip?: string; headers?: Record<string, string> } = {}) =>
    req("POST", "/feedback", {
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...o.headers },
      ip: o.ip,
    });
  const admin = (method: string, path: string, body?: unknown, tok = TOKEN) =>
    req(method, path, {
      body: body === undefined ? "" : JSON.stringify(body),
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
  const add = (text = "Bitte mehr Tiere", game = "waldlager", ip = `ip-${k}`) => {
    const r = post({ ...valid(), text, game }, { ip });
    expect(r.status).toBe(201);
    return r.data!.id as string;
  };
  return {
    svc,
    repo,
    req,
    post,
    admin,
    add,
    tick: (ms: number) => (t += ms),
    setTime: (x: number) => (t = x),
  };
}

for (const [name, makeRepo] of repos) {
  describe(`Feedback-Server (${name})`, () => {
    it("FEEDBACK-AK-01: speichert gültiges Feedback mit Status neu", () => {
      const s = setup(makeRepo);
      const r = s.post({ ...valid(), text: "  Die Zelte sollen bunt sein  " });
      expect(r.status).toBe(201);
      expect(r.data).toEqual({ id: "fb_00000000" });
      const e = s.repo.get("fb_00000000")!;
      expect(e).toMatchObject({
        status: "neu",
        game: "waldlager",
        gameVersion: "1.1.0",
        text: "Die Zelte sollen bunt sein",
        createdAt: "2026-11-09T10:00:00.000Z",
        history: [],
      });
      s.add("Noch ein Wunsch");
      expect(s.repo.count()).toBe(2);
    });

    it("FEEDBACK-AK-07/08: Liste, Filter, Statistik und Übergänge", () => {
      const s = setup(makeRepo);
      const a = s.add("Wunsch eins", "waldlager");
      s.tick(MIN);
      const b = s.add("Wunsch zwei", "kasse");
      s.tick(MIN);
      const c = s.add("Wunsch drei", "waldlager");
      const list = s.admin("GET", "/feedback?game=waldlager").data as unknown as Feedback[];
      expect(list.map((e) => e.id)).toEqual([a, c]);
      expect(s.admin("PATCH", `/feedback/${b}`, { status: "archiviert" }).status).toBe(200);
      const neu = s.admin("GET", "/feedback?status=neu&limit=1").data as unknown as Feedback[];
      expect(neu.map((e) => e.id)).toEqual([a]);
      expect(s.admin("GET", "/feedback/stats").data).toEqual({
        neu: { gesamt: 2, jeSpiel: { waldlager: 2 } },
        jeStatus: {
          neu: 2,
          entwurf: 0,
          freigegeben: 0,
          umgesetzt: 0,
          abgelehnt: 0,
          archiviert: 1,
        },
      });
      expect(s.admin("DELETE", `/feedback/${a}`).status).toBe(204);
      expect(s.admin("DELETE", `/feedback/${a}`).status).toBe(404);
    });

    it("FEEDBACK-AK-09: Duplikate", () => {
      const s = setup(makeRepo);
      const a = s.add("Mehr Tiere");
      const b = s.add("Mehr Tiere bitte");
      const c = s.add("Ganz viele Tiere");
      expect(
        s.admin("PATCH", `/feedback/${b}`, { status: "archiviert", duplicateOf: a }).status,
      ).toBe(200);
      // auf ein Duplikat zeigen geht nicht
      expect(
        s.admin("PATCH", `/feedback/${c}`, { status: "archiviert", duplicateOf: b }).data,
      ).toMatchObject({ field: "duplicateOf" });
      // a hat Duplikate und kann selbst keins werden
      expect(
        s.admin("PATCH", `/feedback/${a}`, { status: "archiviert", duplicateOf: c }).status,
      ).toBe(400);
    });

    it("FEEDBACK-AK-11: Aufräumen nach Aufbewahrungsfristen", () => {
      const s = setup(makeRepo);
      const alt = s.add("Sehr alter Wunsch");
      const done = s.add("Erledigter Wunsch");
      const open = s.add("Offener Wunsch");
      s.admin("PATCH", `/feedback/${done}`, { status: "archiviert" });
      s.tick(91 * 24 * 60 * MIN);
      expect(s.svc.cleanup()).toBe(1);
      expect(s.repo.get(done)).toBeUndefined();
      const fresh = s.add("Neuer Wunsch");
      s.admin("PATCH", `/feedback/${fresh}`, { status: "archiviert" });
      expect(s.svc.cleanup()).toBe(0);
      expect(s.repo.get(open)).toBeDefined();
      expect(s.repo.get(fresh)).toBeDefined();
      s.tick(275 * 24 * 60 * MIN);
      s.svc.cleanup();
      expect(s.repo.get(alt)).toBeUndefined();
      expect(s.repo.get(open)).toBeUndefined();
    });
  });
}

describe("Feedback-Server: Prüfung und Schutz", () => {
  it("FEEDBACK-AK-02: lehnt Ungültiges mit Feldname ab", () => {
    const s = setup();
    const cases: [Record<string, unknown>, string][] = [
      [{ ...valid(), text: "ab" }, "text"],
      [{ ...valid(), text: "  a\u0000b  " }, "text"],
      [{ ...valid(), text: "x".repeat(501) }, "text"],
      [{ ...valid(), text: 42 }, "text"],
      [{ ...valid(), game: "Wald Lager" }, "game"],
      [{ ...valid(), game: undefined }, "game"],
      [{ ...valid(), gameVersion: "1.0" }, "gameVersion"],
      [{ ...valid(), gameVersion: "v1.0.0" }, "gameVersion"],
      [{ ...valid(), gameVersion: null }, "gameVersion"],
      [{ ...valid(), game: "portal", gameVersion: "1.0.0" }, "gameVersion"],
      [{ ...valid(), device: undefined }, "device"],
      [{ ...valid(), device: { ...valid().device, viewport: "groß" } }, "device"],
      [{ ...valid(), device: { ...valid().device, mobile: "ja" } }, "device"],
      [{ ...valid(), device: { ...valid().device, browser: "<script>" } }, "device"],
    ];
    for (const [body, field] of cases) {
      const r = s.post(body);
      expect(r.status, field).toBe(400);
      expect(r.data).toMatchObject({ error: "invalid", field });
    }
    expect(s.post("{kaputt").data).toMatchObject({ field: "body" });
    expect(s.repo.count()).toBe(0);
  });

  it("FEEDBACK-AK-02: Portal ohne Version, unbekannte Felder und Steuerzeichen fliegen raus", () => {
    const s = setup();
    const r = s.post({
      game: "portal",
      gameVersion: null,
      text: "Hal\u0007lo​ Dampf!\r\nZweite Zeile",
      device: { ...valid().device, extra: "x", userAgent: "Mozilla/5.0" },
      name: "Mia",
      kind: "idee",
    });
    expect(r.status).toBe(201);
    const e = s.repo.get(r.data!.id as string)!;
    expect(e.text).toBe("Hallo Dampf!\nZweite Zeile");
    expect(e.gameVersion).toBeNull();
    expect(Object.keys(e).sort()).toEqual([
      "createdAt",
      "device",
      "game",
      "gameVersion",
      "history",
      "id",
      "status",
      "text",
      "updatedAt",
    ]);
    expect(Object.keys(e.device).sort()).toEqual(["browser", "mobile", "os", "touch", "viewport"]);
  });

  it("FEEDBACK-AK-03: über 4 KB ergibt 413, falscher Content-Type 400", () => {
    const s = setup();
    const big = JSON.stringify({ ...valid(), pad: "x".repeat(FB_LIMITS.bytes) });
    expect(s.post(big).status).toBe(413);
    expect(
      s.post(valid(), { headers: { "Content-Length": String(FB_LIMITS.bytes + 1) } }).status,
    ).toBe(413);
    const r = s.post(valid(), { headers: { "Content-Type": "text/plain" } });
    expect(r.status).toBe(400);
    expect(r.data).toMatchObject({ field: "content-type" });
  });

  it("FEEDBACK-AK-04: Rate-Limit je Absender (10 Minuten, Tag) und gesamt", () => {
    const s = setup();
    for (let i = 0; i < 3; i++)
      expect(s.post({ ...valid(), text: `Wunsch ${i}` }).status).toBe(201);
    expect(s.post({ ...valid(), text: "Wunsch 3" }).status).toBe(429);
    expect(s.post({ ...valid(), text: "Anderer Absender" }, { ip: "5.6.7.8" }).status).toBe(201);
    s.tick(10 * MIN);
    expect(s.post({ ...valid(), text: "Wunsch 3" }).status).toBe(201);
    // bis 20 am Tag
    let sent = 4;
    while (sent < 20) {
      s.tick(10 * MIN);
      for (let i = 0; i < 3 && sent < 20; i++, sent++)
        expect(s.post({ ...valid(), text: `Tag ${sent}` }).status).toBe(201);
    }
    s.tick(10 * MIN);
    expect(s.post({ ...valid(), text: "Nummer 21" }).status).toBe(429);
    // nächster Tag
    s.setTime(Date.parse("2026-11-10T00:01:00.000Z"));
    expect(s.post({ ...valid(), text: "Neuer Tag" }).status).toBe(201);
  });

  it("FEEDBACK-AK-04: höchstens 500 pro Tag insgesamt", () => {
    const s = setup();
    for (let i = 0; i < FB_LIMITS.globalPerDay; i++)
      expect(s.post({ ...valid(), text: `Wunsch ${i}` }, { ip: `10.0.0.${i}` }).status).toBe(201);
    expect(s.post({ ...valid(), text: "Zu viel" }, { ip: "9.9.9.9" }).status).toBe(429);
    s.setTime(Date.parse("2026-11-10T00:01:00.000Z"));
    expect(s.post({ ...valid(), text: "Morgen wieder" }, { ip: "9.9.9.9" }).status).toBe(201);
  });

  it("FEEDBACK-AK-05: Honigtopf und doppelter Text", () => {
    const s = setup();
    const h = s.post({ ...valid(), website: "http://spam.example" });
    expect(h.status).toBe(201);
    expect(s.repo.count()).toBe(0);
    const a = s.post(valid());
    const b = s.post(valid());
    expect(b.status).toBe(201);
    expect(b.data!.id).toBe(a.data!.id);
    expect(s.repo.count()).toBe(1);
    s.tick(10 * MIN);
    expect(s.post(valid()).data!.id).not.toBe(a.data!.id);
  });

  it("FEEDBACK-AK-06: keine IP und kein User-Agent im Eintrag", () => {
    const s = setup();
    const id = s.post(valid(), { ip: "203.0.113.77", headers: { "User-Agent": "Mozilla/5.0 X" } })
      .data!.id as string;
    const raw = JSON.stringify(s.repo.get(id));
    expect(raw).not.toContain("203.0.113.77");
    expect(raw).not.toContain("Mozilla");
  });

  it("FEEDBACK-AK-07: Admin-Endpunkte brauchen das richtige Token", () => {
    const s = setup();
    s.add();
    for (const [m, p] of [
      ["GET", "/feedback"],
      ["GET", "/feedback/stats"],
      ["PATCH", "/feedback/fb_00000000"],
      ["DELETE", "/feedback/fb_00000000"],
    ] as const) {
      for (const tok of ["", "falsch", `${TOKEN}x`, TOKEN.slice(0, -1)]) {
        const r = s.admin(m, p, m === "PATCH" ? { status: "archiviert" } : undefined, tok);
        expect(r.status, `${m} ${p} ${tok}`).toBe(401);
        expect(r.body).not.toContain("Bitte mehr Tiere");
      }
    }
    // ohne eingerichtetes Token ist alles gesperrt
    const none = setup(undefined, "");
    none.add();
    expect(none.admin("GET", "/feedback", undefined, "").status).toBe(401);
    expect(none.admin("GET", "/feedback", undefined, "irgendwas").status).toBe(401);
  });

  it("FEEDBACK-AK-07: Zeitraum, Limit und ungültige Filter", () => {
    const s = setup();
    const a = s.add("Montag");
    s.setTime(Date.parse("2026-11-11T12:00:00.000Z"));
    const b = s.add("Mittwoch");
    s.setTime(Date.parse("2026-11-13T12:00:00.000Z"));
    s.add("Freitag");
    const ids = (q: string) =>
      (s.admin("GET", `/feedback${q}`).data as unknown as Feedback[]).map((e) => e.id);
    expect(ids("?from=2026-11-10&to=2026-11-12")).toEqual([b]);
    expect(ids("?to=2026-11-09")).toEqual([a]);
    expect(ids("?limit=2")).toHaveLength(2);
    for (const q of ["?status=offen", "?game=Wald!", "?from=gestern", "?limit=0", "?limit=201"])
      expect(s.admin("GET", `/feedback${q}`).status, q).toBe(400);
  });

  it("FEEDBACK-AK-08: genau die erlaubten Übergänge", () => {
    const reach: Record<Status, Status[]> = {
      neu: [],
      entwurf: ["entwurf"],
      freigegeben: ["entwurf", "freigegeben"],
      umgesetzt: ["entwurf", "freigegeben", "umgesetzt"],
      abgelehnt: ["abgelehnt"],
      archiviert: ["archiviert"],
    };
    const extra = (to: Status) =>
      to === "freigegeben"
        ? { approvedBy: "Nutzer im Chat https://claude.ai/code/session_x" }
        : to === "abgelehnt"
          ? { note: "passt nicht" }
          : {};
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        if (from === to) continue;
        const s = setup();
        const id = s.add();
        for (const step of reach[from])
          expect(s.admin("PATCH", `/feedback/${id}`, { status: step, ...extra(step) }).status).toBe(
            200,
          );
        const r = s.admin("PATCH", `/feedback/${id}`, { status: to, ...extra(to) });
        expect(r.status, `${from}→${to}`).toBe(TRANSITIONS[from].includes(to) ? 200 : 409);
      }
    }
  });

  it("FEEDBACK-AK-08: Pflichtangaben, Verlauf und Freigabe", () => {
    const s = setup();
    const id = s.add();
    expect(s.admin("PATCH", `/feedback/${id}`, { status: "abgelehnt" }).data).toMatchObject({
      field: "note",
    });
    s.tick(MIN);
    const e1 = s.admin("PATCH", `/feedback/${id}`, {
      status: "entwurf",
      specPath: "specs/games/waldlager.md",
    });
    expect(e1.data).toMatchObject({ status: "entwurf", specPath: "specs/games/waldlager.md" });
    expect(s.admin("PATCH", `/feedback/${id}`, { status: "freigegeben" }).data).toMatchObject({
      field: "approvedBy",
    });
    expect(s.admin("PATCH", `/feedback/${id}`, { approvedBy: "jemand" }).status).toBe(400);
    expect(s.admin("PATCH", `/feedback/${id}`, { specPath: "../etc/passwd" }).status).toBe(400);
    expect(s.admin("PATCH", `/feedback/${id}`, { prUrl: "javascript:alert(1)" }).status).toBe(400);
    expect(s.admin("PATCH", `/feedback/${id}`, { note: "x".repeat(301) }).status).toBe(400);
    s.tick(MIN);
    const f = s.admin("PATCH", `/feedback/${id}`, {
      status: "freigegeben",
      approvedBy: "Nutzer im Chat https://claude.ai/code/session_x",
    }).data as unknown as Feedback;
    expect(f.approvedBy).toBe("Nutzer im Chat https://claude.ai/code/session_x");
    expect(f.approvedAt).toBe("2026-11-09T10:02:00.000Z");
    expect(f.updatedAt).toBe("2026-11-09T10:02:00.000Z");
    const u = s.admin("PATCH", `/feedback/${id}`, {
      status: "umgesetzt",
      prUrl: "https://github.com/funami-dev/dampf/pull/21",
    }).data as unknown as Feedback;
    expect(u.history.map((h) => `${h.from}→${h.to}`)).toEqual([
      "neu→entwurf",
      "entwurf→freigegeben",
      "freigegeben→umgesetzt",
    ]);
    expect(s.admin("PATCH", "/feedback/fb_zzzzzzzz", { note: "x" }).status).toBe(404);
  });

  it("FEEDBACK-AK-12: CORS nur für POST und erlaubte Origins", () => {
    const s = setup();
    const ok = s.post(valid(), { headers: { Origin: "https://dampf.vercel.app" } });
    expect(ok.status).toBe(201);
    expect(ok.headers["Access-Control-Allow-Origin"]).toBe("https://dampf.vercel.app");
    const local = s.req("OPTIONS", "/feedback", { headers: { Origin: "http://localhost:4321" } });
    expect(local.status).toBe(204);
    expect(local.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:4321");
    expect(local.headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
    const evil = s.post(
      { ...valid(), text: "Von woanders" },
      { headers: { Origin: "https://evil.example" } },
    );
    expect(evil.status).toBe(403);
    expect(evil.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(s.repo.count()).toBe(1);
    const list = s.req("GET", "/feedback", {
      headers: { Authorization: `Bearer ${TOKEN}`, Origin: "https://dampf.vercel.app" },
    });
    expect(list.status).toBe(200);
    expect(Object.keys(list.headers).some((h) => h.startsWith("Access-Control"))).toBe(false);
  });
});
