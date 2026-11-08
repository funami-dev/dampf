/**
 * Raum-Server-Logik (WL-AK-11): vergibt Raum-Codes, leitet Nachrichten zwischen Gastgeber und
 * Gästen weiter, setzt Grenzen durch. Keine Spiellogik, keine gespeicherten Daten.
 * Läuft gleich in Node (lokal/Tests) und in Cloudflare (Durable Object).
 */
export const LIMITS = { peers: 6, perSecond: 20, bytes: 16 * 1024, listed: 50, name: 12 };
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export interface Conn {
  send(text: string): void;
  close(code?: number, reason?: string): void;
}

interface Peer {
  conn: Conn;
  id: string;
  room: Room;
  windowStart: number;
  count: number;
}

interface Room {
  code: string;
  host: Peer;
  guests: Map<string, Peer>;
  nextId: number;
  created: number;
  /** vom Gastgeber gemeldet: sein Name und die Namen aller Spieler */
  meta: { host: string; players: string[] } | null;
}

/** Eintrag in der Liste offener Welten */
export interface RoomInfo {
  code: string;
  host: string;
  players: string[];
  count: number;
  max: number;
}

/** Namen kürzen und Steuerzeichen entfernen */
export function cleanName(x: unknown): string {
  if (typeof x !== "string") return "";
  // Steuer- und unsichtbare Zeichen entfernen (Codepunkte statt Regex-Bereich, wegen Lint)
  const bad = (c: number) =>
    c < 0x20 ||
    (c >= 0x7f && c <= 0x9f) ||
    (c >= 0x200b && c <= 0x200f) ||
    (c >= 0x2028 && c <= 0x202e);
  return [
    ...[...x]
      .filter((ch) => !bad(ch.codePointAt(0)!))
      .join("")
      .trim(),
  ]
    .slice(0, LIMITS.name)
    .join("");
}

export type ServerMsg =
  | { t: "room"; code: string; id: "host" }
  | { t: "joined"; code: string; id: string }
  | { t: "peer-join"; id: string }
  | { t: "peer-leave"; id: string }
  | { t: "from"; id: string; d: unknown }
  | { t: "msg"; d: unknown }
  | { t: "closed" }
  | { t: "error"; reason: "no-room" | "full" | "bad-code" };

const send = (c: Conn, m: ServerMsg) => {
  try {
    c.send(JSON.stringify(m));
  } catch {
    /* Verbindung schon zu */
  }
};

export class Hub {
  rooms = new Map<string, Room>();
  peers = new Map<Conn, Peer>();
  constructor(
    private rand: () => number = Math.random,
    private now: () => number = Date.now,
  ) {}

  newCode(): string {
    for (;;) {
      let c = "";
      for (let i = 0; i < 4; i++) c += ALPHABET[Math.floor(this.rand() * ALPHABET.length)];
      if (!this.rooms.has(c)) return c;
    }
  }

  /** Gastgeber eröffnet einen Raum */
  host(conn: Conn): string {
    const code = this.newCode();
    const room: Room = {
      code,
      guests: new Map(),
      nextId: 1,
      host: undefined as unknown as Peer,
      created: this.now(),
      meta: null,
    };
    const peer: Peer = { conn, id: "host", room, windowStart: this.now(), count: 0 };
    room.host = peer;
    this.rooms.set(code, room);
    this.peers.set(conn, peer);
    send(conn, { t: "room", code, id: "host" });
    return code;
  }

  /** Gast tritt mit Code bei */
  join(conn: Conn, rawCode: string): string | null {
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return this.reject(conn, "bad-code");
    const room = this.rooms.get(code);
    if (!room) return this.reject(conn, "no-room");
    if (room.guests.size + 1 >= LIMITS.peers) return this.reject(conn, "full");
    const id = `g${room.nextId++}`;
    const peer: Peer = { conn, id, room, windowStart: this.now(), count: 0 };
    room.guests.set(id, peer);
    this.peers.set(conn, peer);
    send(conn, { t: "joined", code, id });
    send(room.host.conn, { t: "peer-join", id });
    return id;
  }

  private reject(conn: Conn, reason: "no-room" | "full" | "bad-code"): null {
    send(conn, { t: "error", reason });
    conn.close(4000, reason);
    return null;
  }

  /** Grenzen: Größe und Rate je Verbindung */
  private allowed(p: Peer, text: string): boolean {
    if (text.length > LIMITS.bytes) return false;
    const now = this.now();
    if (now - p.windowStart >= 1000) {
      p.windowStart = now;
      p.count = 0;
    }
    p.count++;
    return p.count <= LIMITS.perSecond;
  }

  message(conn: Conn, text: string) {
    const p = this.peers.get(conn);
    if (!p || !this.allowed(p, text)) return;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }
    const room = p.room;
    if (p.id === "host") {
      const m = data as { t?: string; to?: string; d?: unknown; host?: unknown; players?: unknown };
      if (m?.t === "meta") {
        const host = cleanName(m.host);
        if (!host) return;
        const players = Array.isArray(m.players)
          ? m.players.map(cleanName).filter(Boolean).slice(0, LIMITS.peers)
          : [];
        room.meta = { host, players: players.length ? players : [host] };
        return;
      }
      if (m?.t !== "to") return;
      const targets = m.to ? [room.guests.get(m.to)].filter(Boolean) : [...room.guests.values()];
      for (const g of targets) send(g!.conn, { t: "msg", d: m.d });
    } else send(room.host.conn, { t: "from", id: p.id, d: data });
  }

  /** Liste offener Welten (nur mit gemeldetem Namen), neueste zuerst */
  list(): RoomInfo[] {
    return [...this.rooms.values()]
      .filter((r) => r.meta)
      .sort((a, b) => b.created - a.created)
      .slice(0, LIMITS.listed)
      .map((r) => ({
        code: r.code,
        host: r.meta!.host,
        players: r.meta!.players,
        count: r.guests.size + 1,
        max: LIMITS.peers,
      }));
  }

  disconnect(conn: Conn) {
    const p = this.peers.get(conn);
    if (!p) return;
    this.peers.delete(conn);
    const room = p.room;
    if (p.id === "host") {
      // Gastgeber weg → Raum schließen
      for (const g of room.guests.values()) {
        send(g.conn, { t: "closed" });
        this.peers.delete(g.conn);
        g.conn.close(4001, "host-left");
      }
      this.rooms.delete(room.code);
    } else {
      room.guests.delete(p.id);
      send(room.host.conn, { t: "peer-leave", id: p.id });
    }
  }
}

/** Pfad → Rolle: /host oder /join/ABCD */
export function route(
  path: string,
): { kind: "host" } | { kind: "join"; code: string } | { kind: "list" } | null {
  if (path === "/host") return { kind: "host" };
  if (path === "/rooms") return { kind: "list" };
  const m = /^\/join\/([A-Za-z]{4})$/.exec(path);
  return m ? { kind: "join", code: m[1]! } : null;
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
