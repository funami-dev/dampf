import { describe, expect, it } from "vitest";
import {
  PARTS,
  addPart,
  addWire,
  emptyCircuit,
  movePart,
  pinPos,
  removePart,
  rotatePart,
  toggle,
  type Circuit,
  type Kind,
} from "./circuit.ts";
import { MISSIONS, checkMission, starsFor } from "./missions.ts";
import { KEY, fresh, freeKinds, load, save, unlocked, type Store } from "./save.ts";
import { ELEC, solve } from "./solve.ts";

const memory = (): Store => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};
/** kleine Bau-Hilfe: Teile anlegen, Kabel als [Teil-Index, Punkt] Paare */
function build(kinds: Kind[], wires: [number, number, number, number][]): Circuit {
  const c = emptyCircuit();
  const ps = kinds.map((k, i) => addPart(c, k, 100 + i * 120, 200)!);
  for (const [a, ap, b, bp] of wires)
    expect(addWire(c, { part: ps[a]!.id, pin: ap }, { part: ps[b]!.id, pin: bp })).not.toBeNull();
  return c;
}
const I1 = ELEC.volt / (ELEC.lamp + ELEC.inner);

describe("KS-AK-01: Blöcke, Punkte und Kabel", () => {
  it("richtige Zahl Punkte, Kabel-Regeln, Entfernen, Drehen", () => {
    expect(PARTS.batterie.pins).toHaveLength(2);
    expect(PARTS.lampe.pins).toHaveLength(2);
    expect(PARTS.schalter.pins).toHaveLength(2);
    expect(PARTS.umschalter.pins).toHaveLength(3);
    const c = emptyCircuit();
    const a = addPart(c, "batterie", 101, 99)!;
    const b = addPart(c, "lampe", 300, 100)!;
    expect([a.x, a.y]).toEqual([100, 100]); // Raster
    expect(addWire(c, { part: a.id, pin: 0 }, { part: a.id, pin: 0 })).toBeNull();
    expect(addWire(c, { part: a.id, pin: 0 }, { part: b.id, pin: 0 })).not.toBeNull();
    expect(addWire(c, { part: b.id, pin: 0 }, { part: a.id, pin: 0 })).toBeNull(); // doppelt
    expect(addWire(c, { part: a.id, pin: 5 }, { part: b.id, pin: 1 })).toBeNull();
    const before = pinPos(a, 0);
    rotatePart(c, a.id);
    expect(pinPos(a, 0)).not.toEqual(before);
    movePart(c, a.id, 500, 400);
    expect(c.wires).toHaveLength(1);
    removePart(c, b.id);
    expect(c.wires).toHaveLength(0);
  });
});

describe("KS-AK-02: Simulation", () => {
  it("Batterie + Lämpchen nach ohmschem Gesetz", () => {
    const c = build(
      ["batterie", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 0, 1],
      ],
    );
    const r = solve(c);
    const l = Object.values(r.lamps)[0]!;
    expect(l.amps).toBeGreaterThan(I1 * 0.98);
    expect(l.amps).toBeLessThan(I1 * 1.02);
    expect(l.level).toBe("hell");
    expect(Object.values(r.batteries)[0]).toBeCloseTo(l.amps, 2);
    expect(r.short).toBe(false);
  });
  it("Reihe: halber Strom, schwächer; parallel: wie allein", () => {
    const reihe = solve(
      build(
        ["batterie", "lampe", "lampe"],
        [
          [0, 0, 1, 0],
          [1, 1, 2, 0],
          [2, 1, 0, 1],
        ],
      ),
    );
    for (const l of Object.values(reihe.lamps)) {
      expect(l.amps).toBeCloseTo(ELEC.volt / (2 * ELEC.lamp + ELEC.inner), 2);
      expect(l.level).toBe("schwach");
    }
    const par = solve(
      build(
        ["batterie", "lampe", "lampe"],
        [
          [0, 0, 1, 0],
          [0, 0, 2, 0],
          [1, 1, 0, 1],
          [2, 1, 0, 1],
        ],
      ),
    );
    for (const l of Object.values(par.lamps)) {
      expect(Math.abs(l.amps - I1) / I1).toBeLessThan(0.05);
      expect(l.level).toBe("hell");
    }
  });
  it("Schalter offen/zu, Umschalter, lose Teile", () => {
    const c = build(
      ["batterie", "lampe", "schalter", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    expect(Object.values(solve(c).lamps)[0]!.level).toBe("aus");
    toggle(c, c.parts[2]!.id);
    const r = solve(c);
    expect(r.lamps[c.parts[1]!.id]!.level).toBe("hell");
    expect(r.lamps[c.parts[3]!.id]!.level).toBe("aus"); // nicht angeschlossen
    const u = build(
      ["batterie", "lampe", "umschalter"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    expect(Object.values(solve(u).lamps)[0]!.level).toBe("hell"); // Mitte–A
    toggle(u, u.parts[2]!.id);
    expect(Object.values(solve(u).lamps)[0]!.level).toBe("aus"); // Mitte–B, B frei
  });
});

describe("KS-AK-03: Kurzschluss", () => {
  it("Pole direkt verbunden → Kurzschluss, Lämpchen aus, keine ungültigen Zahlen", () => {
    const c = build(
      ["batterie", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 0, 1],
        [0, 0, 0, 1],
      ],
    );
    const r = solve(c);
    expect(r.short).toBe(true);
    expect(Object.values(r.lamps)[0]!.level).toBe("aus");
    // Schleife ohne Batterie und leere Schaltung
    const loop = build(
      ["lampe", "schalter"],
      [
        [0, 0, 1, 0],
        [0, 1, 1, 1],
      ],
    );
    const r2 = solve(loop);
    expect(Object.values(r2.volts).every(Number.isFinite)).toBe(true);
    expect(Object.values(r2.wires).every(Number.isFinite)).toBe(true);
    expect(solve(emptyCircuit()).short).toBe(false);
  });
});

describe("KS-AK-04: Missionen", () => {
  const m = (id: number) => MISSIONS.find((x) => x.id === id)!;
  const lampLoop: [number, number, number, number][] = [
    [0, 0, 1, 0],
    [1, 1, 0, 1],
  ];
  it("1–4: richtige und falsche Lösungen", () => {
    expect(checkMission(m(1), build(["batterie", "lampe"], lampLoop)).ok).toBe(true);
    expect(checkMission(m(1), build(["batterie", "lampe"], [[0, 0, 1, 0]])).ok).toBe(false);
    const sw = build(
      ["batterie", "lampe", "schalter"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    expect(checkMission(m(2), sw).ok).toBe(true);
    expect(checkMission(m(2), build(["batterie", "lampe", "schalter"], lampLoop)).ok).toBe(false);
    const reihe = build(
      ["batterie", "lampe", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    const par = build(
      ["batterie", "lampe", "lampe"],
      [
        [0, 0, 1, 0],
        [0, 0, 2, 0],
        [1, 1, 0, 1],
        [2, 1, 0, 1],
      ],
    );
    expect(checkMission(m(3), reihe).ok).toBe(true);
    expect(checkMission(m(3), par).ok).toBe(false);
    expect(checkMission(m(4), par).ok).toBe(true);
    expect(checkMission(m(4), reihe).ok).toBe(false);
  });
  it("5–6: UND und ODER sind verschieden", () => {
    const und = build(
      ["batterie", "lampe", "schalter", "schalter"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 3, 0],
        [3, 1, 0, 1],
      ],
    );
    const oder = build(
      ["batterie", "lampe", "schalter", "schalter"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [1, 1, 3, 0],
        [2, 1, 0, 1],
        [3, 1, 0, 1],
      ],
    );
    expect(checkMission(m(5), und).ok).toBe(true);
    expect(checkMission(m(5), oder).ok).toBe(false);
    expect(checkMission(m(6), oder).ok).toBe(true);
    expect(checkMission(m(6), und).ok).toBe(false);
  });
  it("7: Treppenhaus mit zwei Umschaltern", () => {
    // + → Lampe → Mitte U1; U1.A–U2.A, U1.B–U2.B; Mitte U2 → −
    const ok = build(
      ["batterie", "lampe", "umschalter", "umschalter"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 3, 1],
        [2, 2, 3, 2],
        [3, 0, 0, 1],
      ],
    );
    expect(checkMission(m(7), ok).ok).toBe(true);
    // nur über A verbunden: B-Stellungen machen es nicht richtig
    const bad = build(
      ["batterie", "lampe", "umschalter", "umschalter"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 3, 1],
        [3, 0, 0, 1],
      ],
    );
    expect(checkMission(m(7), bad).ok).toBe(false);
  });
  it("8: Kurzschluss erkennen und beheben", () => {
    const c = m(8).preset!();
    const v = checkMission(m(8), c);
    expect(v).toMatchObject({ ok: false, short: true });
    const bad = c.wires.find((w) => w.a.part === w.b.part)!;
    c.wires = c.wires.filter((w) => w !== bad);
    expect(checkMission(m(8), c).ok).toBe(true);
    expect(starsFor(m(8), c)).toBe(2);
  });
  it("Sterne und Freischalten der Reihe nach", () => {
    const s = fresh();
    expect(unlocked(s, 1)).toBe(true);
    expect(unlocked(s, 2)).toBe(false);
    s.stars[1] = 2;
    expect(unlocked(s, 2)).toBe(true);
    expect(freeKinds(s)).toEqual(["batterie", "lampe"]);
    s.stars[2] = 1;
    expect(freeKinds(s)).toContain("schalter");
    expect(starsFor(m(1), build(["batterie", "lampe"], lampLoop))).toBe(2);
  });
});

describe("KS-AK-05: Speichern", () => {
  it("übersteht Neuladen; kaputte Daten → Neustart", () => {
    const store = memory();
    const s = fresh();
    s.stars[1] = 2;
    s.free = build(["batterie", "lampe", "schalter"], [[0, 0, 1, 0]]);
    s.free.parts[2]!.on = true;
    s.builds[2] = build(["batterie"], []);
    s.muted = true;
    save(store, s);
    const r = load(store);
    expect(r.stars).toEqual({ 1: 2 });
    expect(r.free.parts).toHaveLength(3);
    expect(r.free.wires).toHaveLength(1);
    expect(r.free.parts[2]!.on).toBe(true);
    expect(r.builds[2]!.parts).toHaveLength(1);
    expect(r.muted).toBe(true);
    expect(KEY).toBe("dampf.kabelsalat.v1");
    for (const bad of ["{", "null", '{"v":2}', '{"v":1,"free":{"parts":[{"id":"x"}],"wires":[]}}'])
      expect(load({ get: () => bad, set() {} }).stars).toBeDefined();
    expect(
      load({ get: () => '{"v":1,"free":{"parts":[{"id":"x"}],"wires":[]}}', set() {} }).free.parts,
    ).toEqual([]);
  });
});
