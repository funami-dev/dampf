/**
 * Feedback-Logik (Spec 004): prüfen, bereinigen, Rate-Limit, Statusübergänge, Admin-API.
 * Reines TypeScript mit austauschbarem Speicher – läuft in Node (lokal/Tests, Speicher im
 * Arbeitsspeicher) und in Cloudflare (Durable Object `FeedbackStore` mit SQLite).
 */

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

export const FB_LIMITS = {
  bytes: 4096,
  minText: 3,
  maxText: 500,
  perWindow: 3,
  windowMs: 10 * MIN,
  perDay: 20,
  globalPerDay: 500,
  maxEntries: 10_000,
  note: 300,
  listDefault: 50,
  listMax: 200,
  keepDoneMs: 90 * DAY,
  keepMaxMs: 365 * DAY,
  cleanupEveryMs: 60 * MIN,
};

export const STATUSES = [
  "neu",
  "entwurf",
  "freigegeben",
  "umgesetzt",
  "abgelehnt",
  "archiviert",
] as const;
export type Status = (typeof STATUSES)[number];
const DONE: Status[] = ["umgesetzt", "abgelehnt", "archiviert"];

/** Erlaubte Übergänge (Spec 004, Status-Lebenszyklus) */
export const TRANSITIONS: Record<Status, Status[]> = {
  neu: ["entwurf", "abgelehnt", "archiviert"],
  entwurf: ["freigegeben", "abgelehnt"],
  freigegeben: ["umgesetzt", "abgelehnt"],
  umgesetzt: [],
  abgelehnt: [],
  archiviert: ["neu"],
};

export interface Device {
  mobile: boolean;
  touch: boolean;
  viewport: string;
  browser: string;
  os: string;
}

export interface Feedback {
  id: string;
  createdAt: string;
  updatedAt: string;
  game: string;
  gameVersion: string | null;
  text: string;
  device: Device;
  status: Status;
  duplicateOf?: string;
  specPath?: string;
  prUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  note?: string;
  history: { at: string; from: Status; to: Status }[];
}

export interface ListFilter {
  status?: Status;
  game?: string;
  /** ISO-Zeitpunkt, einschließlich */
  from?: string;
  /** ISO-Zeitpunkt, ausschließlich */
  to?: string;
  limit: number;
}

/** Speicher für Feedback-Einträge (synchron: Arbeitsspeicher oder Durable-Object-SQLite) */
export interface FeedbackRepo {
  insert(e: Feedback): void;
  get(id: string): Feedback | undefined;
  update(e: Feedback): void;
  remove(id: string): boolean;
  /** älteste zuerst */
  list(f: ListFilter): Feedback[];
  count(): number;
  countBy(): { status: Status; game: string; n: number }[];
  /** Löscht abgeschlossene Einträge mit `updatedAt` < doneBefore und alle mit `createdAt` < anyBefore */
  purge(doneBefore: string, anyBefore: string): number;
  /** Gibt es einen Eintrag, der auf `id` als Duplikat zeigt? */
  hasDuplicatesOf(id: string): boolean;
}

export function matches(e: Feedback, f: Omit<ListFilter, "limit">): boolean {
  return (
    (!f.status || e.status === f.status) &&
    (!f.game || e.game === f.game) &&
    (!f.from || e.createdAt >= f.from) &&
    (!f.to || e.createdAt < f.to)
  );
}

/** Speicher im Arbeitsspeicher (lokaler Server, Tests) */
export class MemoryRepo implements FeedbackRepo {
  rows = new Map<string, Feedback>();
  insert(e: Feedback) {
    this.rows.set(e.id, structuredClone(e));
  }
  get(id: string) {
    const e = this.rows.get(id);
    return e && structuredClone(e);
  }
  update(e: Feedback) {
    this.rows.set(e.id, structuredClone(e));
  }
  remove(id: string) {
    return this.rows.delete(id);
  }
  list(f: ListFilter) {
    return [...this.rows.values()]
      .filter((e) => matches(e, f))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
      .slice(0, f.limit)
      .map((e) => structuredClone(e));
  }
  count() {
    return this.rows.size;
  }
  countBy() {
    const m = new Map<string, { status: Status; game: string; n: number }>();
    for (const e of this.rows.values()) {
      const k = `${e.status}\n${e.game}`;
      const c = m.get(k) ?? { status: e.status, game: e.game, n: 0 };
      c.n += 1;
      m.set(k, c);
    }
    return [...m.values()];
  }
  purge(doneBefore: string, anyBefore: string) {
    let n = 0;
    for (const e of [...this.rows.values()]) {
      if ((DONE.includes(e.status) && e.updatedAt < doneBefore) || e.createdAt < anyBefore) {
        this.rows.delete(e.id);
        n += 1;
      }
    }
    return n;
  }
  hasDuplicatesOf(id: string) {
    return [...this.rows.values()].some((e) => e.duplicateOf === id);
  }
}

// --- Prüfen und Bereinigen -------------------------------------------------

const SLUG = /^[a-z0-9-]{1,40}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ID = /^fb_[a-z0-9]{8}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SPEC_PATH = /^specs\/[A-Za-z0-9._/-]+\.md$/;
const PR_URL = /^https:\/\/github\.com\/[A-Za-z0-9._/#-]+$/;
const LABEL = /^[\p{L}\p{N} ._-]+$/u;

/** Steuer- und unsichtbare Zeichen entfernen (Zeilenumbrüche bleiben), Rand kürzen */
export function cleanText(x: string): string {
  const bad = (c: number) =>
    (c < 0x20 && c !== 0x0a) ||
    (c >= 0x7f && c <= 0x9f) ||
    (c >= 0x200b && c <= 0x200f) ||
    (c >= 0x2028 && c <= 0x202e);
  return [...x.replace(/\r\n?/g, "\n").replace(/\t/g, " ")]
    .filter((ch) => !bad(ch.codePointAt(0)!))
    .join("")
    .trim();
}

class Invalid extends Error {
  constructor(public field: string) {
    super(field);
  }
}

function label(x: unknown, field: string, max: number): string {
  if (typeof x !== "string" || x.length < 1 || x.length > max || !LABEL.test(x))
    throw new Invalid(field);
  return x;
}

/** Prüft ein eingehendes Feedback und gibt nur die erlaubten, bereinigten Felder zurück */
export function parseSubmission(
  body: unknown,
): Pick<Feedback, "game" | "gameVersion" | "text" | "device"> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Invalid("body");
  const b = body as Record<string, unknown>;
  if (typeof b.game !== "string" || !SLUG.test(b.game)) throw new Invalid("game");
  let gameVersion: string | null;
  if (b.game === "portal") {
    if (b.gameVersion !== null && b.gameVersion !== undefined) throw new Invalid("gameVersion");
    gameVersion = null;
  } else {
    if (typeof b.gameVersion !== "string" || !SEMVER.test(b.gameVersion))
      throw new Invalid("gameVersion");
    gameVersion = b.gameVersion;
  }
  if (typeof b.text !== "string") throw new Invalid("text");
  const text = cleanText(b.text);
  const len = [...text].length;
  if (len < FB_LIMITS.minText || len > FB_LIMITS.maxText) throw new Invalid("text");
  const d = b.device;
  if (!d || typeof d !== "object" || Array.isArray(d)) throw new Invalid("device");
  const dv = d as Record<string, unknown>;
  if (typeof dv.mobile !== "boolean" || typeof dv.touch !== "boolean") throw new Invalid("device");
  if (typeof dv.viewport !== "string" || !/^\d{1,5}x\d{1,5}$/.test(dv.viewport))
    throw new Invalid("device");
  const device: Device = {
    mobile: dv.mobile,
    touch: dv.touch,
    viewport: dv.viewport,
    browser: label(dv.browser, "device", 30),
    os: label(dv.os, "device", 20),
  };
  return { game: b.game, gameVersion, text, device };
}

/** Vergleich in konstanter Zeit (bezogen auf die Länge des erwarteten Werts) */
export function safeEqual(given: string, expected: string): boolean {
  if (!given || !expected) return false;
  let diff = given.length ^ expected.length;
  for (let i = 0; i < expected.length; i++)
    diff |= (given.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** FNV-1a: Absender-Kennung nur für das Rate-Limit im Arbeitsspeicher */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function originAllowed(origin: string): boolean {
  return (
    origin === "https://dampf.vercel.app" ||
    /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/.test(origin)
  );
}

// --- HTTP ------------------------------------------------------------------

export interface FbRequest {
  method: string;
  /** Pfad ohne Query, z. B. `/feedback/stats` */
  path: string;
  query: URLSearchParams;
  header(name: string): string | null;
  body: string;
  /** Absender (IP), wird nie gespeichert */
  ip: string;
}

export interface FbResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export function isFeedbackPath(path: string): boolean {
  return path === "/feedback" || path.startsWith("/feedback/");
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export interface ServiceOptions {
  adminToken?: string;
  now?: () => number;
  randomId?: () => string;
}

function defaultId(): string {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return "fb_" + [...bytes].map((b) => a[b % a.length]).join("");
}

interface Sender {
  times: number[];
  dayCount: number;
}

export class FeedbackService {
  private now: () => number;
  private randomId: () => string;
  private adminToken: string;
  private day = "";
  private salt = "";
  private senders = new Map<string, Sender>();
  private recent = new Map<string, { id: string; at: number }>();
  private globalCount = 0;
  private lastCleanup = 0;

  constructor(
    private repo: FeedbackRepo,
    opts: ServiceOptions = {},
  ) {
    this.now = opts.now ?? Date.now;
    this.randomId = opts.randomId ?? defaultId;
    this.adminToken = opts.adminToken ?? "";
  }

  /** Aufräumen nach Aufbewahrungsfristen (FEEDBACK-AK-11) */
  cleanup(): number {
    const t = this.now();
    this.lastCleanup = t;
    return this.repo.purge(
      new Date(t - FB_LIMITS.keepDoneMs).toISOString(),
      new Date(t - FB_LIMITS.keepMaxMs).toISOString(),
    );
  }

  handle(req: FbRequest): FbResponse {
    if (this.now() - this.lastCleanup >= FB_LIMITS.cleanupEveryMs) this.cleanup();
    const p = req.path.replace(/\/+$/, "");
    if (p === "/feedback" && (req.method === "POST" || req.method === "OPTIONS"))
      return this.submit(req);
    if (!this.authorized(req)) return this.json(401, { error: "unauthorized" });
    if (p === "/feedback" && req.method === "GET") return this.list(req.query);
    if (p === "/feedback/stats" && req.method === "GET") return this.stats();
    const m = /^\/feedback\/([^/]+)$/.exec(p);
    if (m && m[1] !== "stats") {
      if (req.method === "PATCH") return this.patch(m[1]!, req.body);
      if (req.method === "DELETE")
        return this.repo.remove(m[1]!)
          ? { status: 204, headers: { "Cache-Control": "no-store" }, body: "" }
          : this.json(404, { error: "not-found" });
    }
    return this.json(404, { error: "not-found" });
  }

  private json(status: number, data: unknown, extra: Record<string, string> = {}): FbResponse {
    return { status, headers: { ...JSON_HEADERS, ...extra }, body: JSON.stringify(data) };
  }

  private authorized(req: FbRequest): boolean {
    const h = req.header("Authorization") ?? "";
    const m = /^Bearer (.+)$/.exec(h);
    if (!this.adminToken || !m) return false;
    return safeEqual(m[1]!, this.adminToken);
  }

  // --- POST /feedback ---

  private submit(req: FbRequest): FbResponse {
    const origin = req.header("Origin");
    if (origin && !originAllowed(origin)) return this.json(403, { error: "origin" });
    const cors: Record<string, string> = origin
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        }
      : {};
    if (req.method === "OPTIONS") return { status: 204, headers: cors, body: "" };
    const len = Number(req.header("Content-Length") ?? 0);
    if (len > FB_LIMITS.bytes || new TextEncoder().encode(req.body).length > FB_LIMITS.bytes)
      return this.json(413, { error: "too-large" }, cors);
    if (!/^application\/json\b/i.test(req.header("Content-Type") ?? ""))
      return this.json(400, { error: "invalid", field: "content-type" }, cors);
    let raw: unknown;
    try {
      raw = JSON.parse(req.body);
    } catch {
      return this.json(400, { error: "invalid", field: "body" }, cors);
    }
    // Honigtopf: so tun, als sei alles gut
    const website = (raw as Record<string, unknown> | null)?.website;
    if (typeof website === "string" && website.trim() !== "")
      return this.json(201, { id: this.randomId() }, cors);
    let data: ReturnType<typeof parseSubmission>;
    try {
      data = parseSubmission(raw);
    } catch (e) {
      return this.json(
        400,
        { error: "invalid", field: e instanceof Invalid ? e.field : "body" },
        cors,
      );
    }
    const t = this.now();
    this.rollDay(t);
    const sender = hash(this.salt + req.ip);
    const dupKey = `${sender}\n${data.game}\n${data.text}`;
    const dup = this.recent.get(dupKey);
    if (dup && t - dup.at < FB_LIMITS.windowMs && this.repo.get(dup.id))
      return this.json(201, { id: dup.id }, cors);
    const s = this.senders.get(sender) ?? { times: [], dayCount: 0 };
    s.times = s.times.filter((x) => t - x < FB_LIMITS.windowMs);
    if (
      s.times.length >= FB_LIMITS.perWindow ||
      s.dayCount >= FB_LIMITS.perDay ||
      this.globalCount >= FB_LIMITS.globalPerDay ||
      this.repo.count() >= FB_LIMITS.maxEntries
    ) {
      this.senders.set(sender, s);
      return this.json(429, { error: "rate-limit" }, cors);
    }
    let id = this.randomId();
    while (this.repo.get(id)) id = this.randomId();
    const at = new Date(t).toISOString();
    this.repo.insert({ id, createdAt: at, updatedAt: at, status: "neu", history: [], ...data });
    s.times.push(t);
    s.dayCount += 1;
    this.senders.set(sender, s);
    this.globalCount += 1;
    for (const [k, v] of this.recent) if (t - v.at >= FB_LIMITS.windowMs) this.recent.delete(k);
    this.recent.set(dupKey, { id, at: t });
    return this.json(201, { id }, cors);
  }

  /** Neuer UTC-Tag: Tageszähler und Salz zurücksetzen */
  private rollDay(t: number) {
    const day = new Date(t).toISOString().slice(0, 10);
    if (day === this.day) return;
    this.day = day;
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    this.salt = [...salt].map((b) => b.toString(16)).join("");
    this.senders.clear();
    this.recent.clear();
    this.globalCount = 0;
  }

  // --- Admin ---

  private list(q: URLSearchParams): FbResponse {
    const f: ListFilter = { limit: FB_LIMITS.listDefault };
    const status = q.get("status");
    if (status !== null) {
      if (!STATUSES.includes(status as Status))
        return this.json(400, { error: "invalid", field: "status" });
      f.status = status as Status;
    }
    const game = q.get("game");
    if (game !== null) {
      if (!SLUG.test(game)) return this.json(400, { error: "invalid", field: "game" });
      f.game = game;
    }
    for (const key of ["from", "to"] as const) {
      const v = q.get(key);
      if (v === null) continue;
      const d = new Date(`${v}T00:00:00.000Z`);
      if (!DATE.test(v) || isNaN(d.getTime()))
        return this.json(400, { error: "invalid", field: key });
      f[key] = (key === "to" ? new Date(d.getTime() + DAY) : d).toISOString();
    }
    const limit = q.get("limit");
    if (limit !== null) {
      const n = Number(limit);
      if (!Number.isInteger(n) || n < 1 || n > FB_LIMITS.listMax)
        return this.json(400, { error: "invalid", field: "limit" });
      f.limit = n;
    }
    return this.json(200, this.repo.list(f));
  }

  private stats(): FbResponse {
    const jeStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    const jeSpiel: Record<string, number> = {};
    for (const r of this.repo.countBy()) {
      jeStatus[r.status] += r.n;
      if (r.status === "neu") jeSpiel[r.game] = (jeSpiel[r.game] ?? 0) + r.n;
    }
    return this.json(200, { neu: { gesamt: jeStatus.neu, jeSpiel }, jeStatus });
  }

  private patch(id: string, body: string): FbResponse {
    const e = this.repo.get(id);
    if (!e) return this.json(404, { error: "not-found" });
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      return this.json(400, { error: "invalid", field: "body" });
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      return this.json(400, { error: "invalid", field: "body" });
    const b = raw as Record<string, unknown>;
    const bad = (field: string) => this.json(400, { error: "invalid", field });
    const str = (v: unknown, max: number, re?: RegExp) =>
      typeof v === "string" && v.length >= 1 && v.length <= max && (!re || re.test(v));

    const next = structuredClone(e);
    if (b.note !== undefined) {
      if (b.note === null || b.note === "") delete next.note;
      else if (typeof b.note === "string" && cleanText(b.note).length >= 1) {
        const note = cleanText(b.note);
        if ([...note].length > FB_LIMITS.note) return bad("note");
        next.note = note;
      } else return bad("note");
    }
    if (b.specPath !== undefined) {
      if (!str(b.specPath, 200, SPEC_PATH)) return bad("specPath");
      next.specPath = b.specPath as string;
    }
    if (b.prUrl !== undefined) {
      if (!str(b.prUrl, 300, PR_URL)) return bad("prUrl");
      next.prUrl = b.prUrl as string;
    }
    const t = new Date(this.now()).toISOString();
    if (b.status !== undefined && b.status !== e.status) {
      if (!STATUSES.includes(b.status as Status)) return bad("status");
      const to = b.status as Status;
      if (!TRANSITIONS[e.status].includes(to))
        return this.json(409, { error: "transition", from: e.status, to });
      next.status = to;
      next.history.push({ at: t, from: e.status, to });
      if (to === "abgelehnt" && !next.note) return bad("note");
      if (to === "neu") delete next.duplicateOf;
      if (to === "freigegeben") {
        if (!str(b.approvedBy, 300)) return bad("approvedBy");
        next.approvedBy = cleanText(b.approvedBy as string);
        next.approvedAt = t;
      }
    }
    if (b.approvedBy !== undefined && next.status !== "freigegeben") return bad("approvedBy");
    if (b.duplicateOf !== undefined) {
      const target = typeof b.duplicateOf === "string" ? this.repo.get(b.duplicateOf) : undefined;
      if (
        !target ||
        !ID.test(target.id) ||
        target.id === e.id ||
        target.duplicateOf ||
        next.status !== "archiviert" ||
        this.repo.hasDuplicatesOf(e.id)
      )
        return bad("duplicateOf");
      next.duplicateOf = target.id;
    }
    next.updatedAt = t;
    this.repo.update(next);
    return this.json(200, next);
  }
}
