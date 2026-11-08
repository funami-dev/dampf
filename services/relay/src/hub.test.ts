import { describe, expect, it } from "vitest";
import { Hub, LIMITS, route, type Conn, type ServerMsg } from "./hub.ts";

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

  it("Gastgeber geht → Raum geschlossen, Gäste informiert; Gast geht → Gastgeber informiert", () => {
    const hub = new Hub();
    const h = fake();
    const code = hub.host(h);
    const g1 = fake();
    const g2 = fake();
    hub.join(g1, code);
    hub.join(g2, code);
    hub.disconnect(g1);
    expect(h.got).toContainEqual({ t: "peer-leave", id: "g1" });
    hub.disconnect(h);
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
