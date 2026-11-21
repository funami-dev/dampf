import { describe, expect, it } from "vitest";
import { GRACE_MS, Hub, LIMITS, route, type Conn, type ServerMsg } from "./hub.ts";

function fake() {
  const got: ServerMsg[] = [];
  const c: Conn & { got: ServerMsg[]; closed: boolean } = {
    got,
    closed: false,
    send: (t) => got.push(JSON.parse(t) as ServerMsg),
    close() {
      c.closed = true;
    },
  };
  return c;
}

describe("WL-AK-11: Raum-Server", () => {
  it("vergibt eindeutige 4-Buchstaben-Codes", () => {
    let k = 0;
    const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    const hub = new Hub(() => seq[k++ % seq.length]!);
    const a = hub.host(fake());
    const b = hub.host(fake());
    expect(a).toMatch(/^[A-Z]{4}$/);
    expect(b).not.toBe(a);
  });

  it("leitet zwischen Gastgeber und Gästen weiter", () => {
    const hub = new Hub();
    const h = fake();
    const code = hub.host(h);
    const g1 = fake();
    const g2 = fake();
    expect(hub.join(g1, code.toLowerCase())).toBe("g1");
    expect(hub.join(g2, code)).toBe("g2");
    expect(h.got).toContainEqual({ t: "peer-join", id: "g1" });
    hub.message(g1, JSON.stringify({ hi: 1 }));
    expect(h.got).toContainEqual({ t: "from", id: "g1", d: { hi: 1 } });
    hub.message(h, JSON.stringify({ t: "to", d: "alle" }));
    expect(g1.got).toContainEqual({ t: "msg", d: "alle" });
    expect(g2.got).toContainEqual({ t: "msg", d: "alle" });
    hub.message(h, JSON.stringify({ t: "to", to: "g2", d: "nur2" }));
    expect(g2.got).toContainEqual({ t: "msg", d: "nur2" });
    expect(g1.got).not.toContainEqual({ t: "msg", d: "nur2" });
    // Gäste sehen sich nicht direkt
    expect(g2.got.some((m) => m.t === "from")).toBe(false);
  });

  it("höchstens 6 Spieler je Raum, unbekannte Codes werden abgelehnt", () => {
    const hub = new Hub();
    const code = hub.host(fake());
    for (let i = 0; i < LIMITS.peers - 1; i++) expect(hub.join(fake(), code)).not.toBeNull();
    const extra = fake();
    expect(hub.join(extra, code)).toBeNull();
    expect(extra.got).toContainEqual({ t: "error", reason: "full" });
    expect(extra.closed).toBe(true);
    const wrong = fake();
    expect(hub.join(wrong, "ZZZZ")).toBeNull();
    expect(wrong.got).toContainEqual({ t: "error", reason: "no-room" });
    expect(hub.join(fake(), "12")).toBeNull();
  });

  it("setzt Rate (20/s) und Größe (16 KB) durch", () => {
    let t = 0;
    const hub = new Hub(Math.random, () => t);
    const h = fake();
    const code = hub.host(h);
    const g = fake();
    hub.join(g, code);
    for (let i = 0; i < 30; i++) hub.message(g, JSON.stringify(i));
    expect(h.got.filter((m) => m.t === "from")).toHaveLength(LIMITS.perSecond);
    t = 1000;
    hub.message(g, JSON.stringify("weiter"));
    expect(h.got).toContainEqual({ t: "from", id: "g1", d: "weiter" });
    const before = h.got.length;
    hub.message(g, JSON.stringify("x".repeat(LIMITS.bytes)));
    expect(h.got.length).toBe(before);
    hub.message(g, "kein json");
    expect(h.got.length).toBe(before);
  });

  it("bewusst gehen: Gastgeber → Raum geschlossen, Gäste informiert; Gast → Gastgeber informiert", () => {
    const hub = new Hub();
    const h = fake();
    const code = hub.host(h);
    const g1 = fake();
    const g2 = fake();
    hub.join(g1, code);
    hub.join(g2, code);
    hub.message(g1, JSON.stringify({ t: "bye" }));
    expect(h.got).toContainEqual({ t: "peer-leave", id: "g1" });
    hub.message(h, JSON.stringify({ t: "bye" }));
    expect(g2.got).toContainEqual({ t: "closed" });
    expect(g2.closed).toBe(true);
    expect(hub.rooms.size).toBe(0);
    expect(hub.join(fake(), code)).toBeNull();
  });
  it("Pfade", () => {
    expect(route("/host")).toEqual({ kind: "host" });
    expect(route("/join/abcd")).toEqual({ kind: "join", code: "abcd" });
    expect(route("/join/ab")).toBeNull();
    expect(route("/x")).toBeNull();
  });
});

describe("WL-AK-11: Liste offener Welten", () => {
  it("nur Räume mit gemeldetem Namen, mit Gastgeber, Spielern und Anzahl", () => {
    let t = 0;
    const hub = new Hub(Math.random, () => t++);
    const h1 = fake();
    const c1 = hub.host(h1);
    expect(hub.list()).toEqual([]);
    hub.message(h1, JSON.stringify({ t: "meta", host: "Mia", players: ["Mia"] }));
    const g = fake();
    hub.join(g, c1);
    hub.message(h1, JSON.stringify({ t: "meta", host: "Mia", players: ["Mia", "Ben"] }));
    const h2 = fake();
    const c2 = hub.host(h2);
    hub.message(h2, JSON.stringify({ t: "meta", host: "Lea" }));
    const l = hub.list();
    expect(l.map((r) => r.code)).toEqual([c2, c1]);
    expect(l[1]).toEqual({ code: c1, host: "Mia", players: ["Mia", "Ben"], count: 2, max: 6 });
    expect(l[0]!.players).toEqual(["Lea"]);
    // meta wird nicht an Gäste weitergeleitet
    expect(g.got.some((m) => m.t === "msg")).toBe(false);
    hub.disconnect(h1);
    expect(hub.list().map((r) => r.code)).toEqual([c2]);
  });

  it("Namen werden gekürzt und bereinigt, leere Namen ignoriert", () => {
    const hub = new Hub();
    const h = fake();
    hub.host(h);
    hub.message(h, JSON.stringify({ t: "meta", host: "   " }));
    expect(hub.list()).toEqual([]);
    hub.message(
      h,
      JSON.stringify({ t: "meta", host: "Sehr\u0000Langer​Name123", players: [1, "", "Ben\n"] }),
    );
    const r = hub.list()[0]!;
    expect(r.host).toBe("SehrLangerNa");
    expect(r.host.length).toBeLessThanOrEqual(12);
    expect(r.players).toEqual(["Ben"]);
  });

  it("höchstens 50 Einträge", () => {
    const hub = new Hub();
    for (let i = 0; i < 60; i++) {
      const h = fake();
      hub.host(h);
      hub.message(h, JSON.stringify({ t: "meta", host: `S${i}` }));
    }
    expect(hub.list()).toHaveLength(50);
  });

  it("Pfad /rooms", () => {
    expect(route("/rooms")).toEqual({ kind: "list" });
  });
});

describe("WL-AK-60: Wiederverbinden und Gnadenfrist", () => {
  const clock = () => {
    let t = 1000;
    const timers: { at: number; fn: () => void }[] = [];
    return {
      now: () => t,
      schedule: (fn: () => void, ms: number) => void timers.push({ at: t + ms, fn }),
      advance(ms: number) {
        t += ms;
        for (const x of timers.filter((x) => x.at <= t)) x.fn();
      },
    };
  };
  it("gleicher Schlüssel: kein zweiter Platz, altes Fenster wird getrennt", () => {
    const hub = new Hub();
    const h = fake();
    const code = hub.host(h);
    const a = fake();
    const b = fake();
    expect(hub.join(a, code, "geraet12345")).toBe("g1");
    expect(hub.join(b, code, "geraet12345")).toBe("g1");
    expect(a.got).toContainEqual({ t: "replaced" });
    expect(a.closed).toBe(true);
    expect(hub.rooms.get(code)!.guests.size).toBe(1);
    expect(h.got).toContainEqual({ t: "peer-back", id: "g1" });
    // ohne Schlüssel: neuer Platz
    expect(hub.join(fake(), code)).toBe("g2");
  });
  it("Gast reißt ab: 2 Minuten frei, Rückkehr mit gleicher Id; danach weg", () => {
    const c = clock();
    const hub = new Hub(Math.random, c.now, c.schedule);
    const h = fake();
    const code = hub.host(h);
    const g = fake();
    hub.join(g, code, "geraet12345");
    hub.disconnect(g);
    expect(h.got).toContainEqual({ t: "peer-away", id: "g1" });
    expect(h.got).not.toContainEqual({ t: "peer-leave", id: "g1" });
    c.advance(60_000);
    const back = fake();
    expect(hub.join(back, code, "geraet12345")).toBe("g1");
    hub.disconnect(back);
    c.advance(GRACE_MS + 100);
    expect(h.got).toContainEqual({ t: "peer-leave", id: "g1" });
    expect(hub.rooms.get(code)!.guests.size).toBe(0);
  });
  it("Gastgeber reißt ab: Gäste warten, Rückkehr mit Token; ohne Rückkehr endet die Welt", () => {
    const c = clock();
    const hub = new Hub(Math.random, c.now, c.schedule);
    const h = fake();
    const code = hub.host(h);
    const token = (h.got[0] as { token: string }).token;
    expect(token).toMatch(/^[A-Z]{16}$/);
    const g = fake();
    hub.join(g, code);
    hub.disconnect(h);
    expect(g.got).toContainEqual({ t: "host-away" });
    expect(g.closed).toBe(false);
    // falsches Token: neuer Raum statt Übernahme
    const thief = fake();
    expect(hub.host(thief, { code, token: "FALSCH" })).not.toBe(code);
    const h2 = fake();
    expect(hub.host(h2, { code, token })).toBe(code);
    expect(h2.got[0]).toMatchObject({ t: "room", code, resumed: true });
    expect(g.got).toContainEqual({ t: "host-back" });
    hub.message(g, JSON.stringify({ hi: 1 }));
    expect(h2.got).toContainEqual({ t: "from", id: "g1", d: { hi: 1 } });
    hub.disconnect(h2);
    c.advance(GRACE_MS + 100);
    expect(g.got).toContainEqual({ t: "closed" });
    expect(hub.rooms.has(code)).toBe(false);
  });
});
