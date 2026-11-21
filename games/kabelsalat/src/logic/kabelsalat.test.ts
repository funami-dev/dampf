import { describe, expect, it } from "vitest";
import {
  PARTS,
  addPart,
  addWire,
  cycleValue,
  emptyCircuit,
  parseCircuit,
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

describe("KS-AK-11: Tipps Schritt für Schritt", () => {
  it("jede Mission 3–6 Schritte; leer nichts erledigt; richtige Lösung alles erledigt", async () => {
    const { STEPS, stepsDone } = await import("./steps.ts");
    const m = (id: number) => MISSIONS.find((x) => x.id === id)!;
    const solutions: Record<number, Circuit> = {
      1: build(
        ["batterie", "lampe"],
        [
          [0, 0, 1, 0],
          [1, 1, 0, 1],
        ],
      ),
      2: build(
        ["batterie", "lampe", "schalter"],
        [
          [0, 0, 1, 0],
          [1, 1, 2, 0],
          [2, 1, 0, 1],
        ],
      ),
      3: build(
        ["batterie", "lampe", "lampe"],
        [
          [0, 0, 1, 0],
          [1, 1, 2, 0],
          [2, 1, 0, 1],
        ],
      ),
      4: build(
        ["batterie", "lampe", "lampe"],
        [
          [0, 0, 1, 0],
          [0, 0, 2, 0],
          [1, 1, 0, 1],
          [2, 1, 0, 1],
        ],
      ),
      5: build(
        ["batterie", "lampe", "schalter", "schalter"],
        [
          [0, 0, 1, 0],
          [1, 1, 2, 0],
          [2, 1, 3, 0],
          [3, 1, 0, 1],
        ],
      ),
      6: build(
        ["batterie", "lampe", "schalter", "schalter"],
        [
          [0, 0, 1, 0],
          [1, 1, 2, 0],
          [1, 1, 3, 0],
          [2, 1, 0, 1],
          [3, 1, 0, 1],
        ],
      ),
      7: build(
        ["batterie", "lampe", "umschalter", "umschalter"],
        [
          [0, 0, 1, 0],
          [1, 1, 2, 0],
          [2, 1, 3, 1],
          [2, 2, 3, 2],
          [3, 0, 0, 1],
        ],
      ),
    };
    // 9: + → Widerstand → LED (A … K) → −
    solutions[9] = build(
      ["batterie", "widerstand", "led"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    // 10: Lämpchen am Kreis, Messgerät (V) daneben
    solutions[10] = build(
      ["batterie", "lampe", "messgeraet"],
      [
        [0, 0, 1, 0],
        [1, 1, 0, 1],
        [2, 0, 1, 0],
        [2, 1, 1, 1],
      ],
    );
    // 11: + → Messgerät (mA) → Lämpchen → −
    solutions[11] = build(
      ["batterie", "messgeraet", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    solutions[11].parts[1]!.on = true;
    const fixed8 = m(8).preset!();
    fixed8.wires = fixed8.wires.filter((w) => w.a.part !== w.b.part);
    solutions[8] = fixed8;
    for (const mi of MISSIONS) {
      const steps = STEPS[mi.id]!;
      expect(steps.length, `Mission ${mi.id}`).toBeGreaterThanOrEqual(3);
      expect(steps.length).toBeLessThanOrEqual(6);
      for (const s of steps) expect(s.text.length).toBeGreaterThan(10);
      const c = solutions[mi.id]!;
      expect(checkMission(mi, c).ok, `Lösung ${mi.id}`).toBe(true);
      expect(stepsDone(mi.id, c, solve(c), true).every(Boolean), `Mission ${mi.id}`).toBe(true);
      if (mi.id !== 8)
        expect(stepsDone(mi.id, emptyCircuit(), solve(emptyCircuit()), false).some(Boolean)).toBe(
          false,
        );
    }
    // anders angeordnet (Teile in anderer Reihenfolge, Kabel andersherum): zählt trotzdem
    const swapped = build(
      ["lampe", "batterie"],
      [
        [1, 1, 0, 1],
        [0, 0, 1, 0],
      ],
    );
    expect(stepsDone(1, swapped, solve(swapped), true).every(Boolean)).toBe(true);
  });
});

describe("KS-AK-13: LED und Widerstand", () => {
  const ledCircuit = (withRes: boolean, reversed = false) =>
    withRes
      ? build(
          ["batterie", "widerstand", "led"],
          [
            [0, 0, 1, 0],
            [1, 1, 2, reversed ? 1 : 0],
            [2, reversed ? 0 : 1, 0, 1],
          ],
        )
      : build(
          ["batterie", "led"],
          [
            [0, 0, 1, 0],
            [1, 1, 0, 1],
          ],
        );
  it("220 Ω: etwa 11 mA, hell; 1 kΩ schwach; falsch herum aus; ohne Widerstand Puff", () => {
    const c = ledCircuit(true);
    const led = c.parts[2]!;
    const r = solve(c);
    const expected = (ELEC.volt - ELEC.ledVf) / (220 + ELEC.ledR + ELEC.inner);
    expect(r.leds[led.id]!.amps).toBeGreaterThan(expected * 0.9);
    expect(r.leds[led.id]!.amps).toBeLessThan(expected * 1.1);
    expect(r.leds[led.id]!.level).toBe("hell");
    cycleValue(c, c.parts[1]!.id); // 470
    expect(cycleValue(c, c.parts[1]!.id)).toBe(1000);
    expect(solve(c).leds[led.id]!.level).toBe("schwach");
    expect(cycleValue(c, c.parts[1]!.id)).toBe(100);
    expect(cycleValue(c, c.parts[1]!.id)).toBe(220);
    expect(cycleValue(c, led.id)).toBeNull();
    const rev = ledCircuit(true, true);
    expect(solve(rev).leds[rev.parts[2]!.id]!.amps).toBe(0);
    expect(solve(rev).leds[rev.parts[2]!.id]!.level).toBe("aus");
    const bare = ledCircuit(false);
    const rb = solve(bare);
    expect(rb.leds[bare.parts[1]!.id]!.level).toBe("puff");
    expect(rb.short).toBe(false);
    for (const v of Object.values(rb.volts)) expect(Number.isFinite(v)).toBe(true);
  });
  it("Wert bleibt beim Speichern; unbekannte Werte → 220 Ω", () => {
    const c = ledCircuit(true);
    cycleValue(c, c.parts[1]!.id);
    const back = parseCircuit(JSON.parse(JSON.stringify(c)))!;
    expect(back.parts[1]!.val).toBe(2);
    const bad = JSON.parse(JSON.stringify(c));
    bad.parts[1].val = 9;
    bad.parts[2].val = 1;
    const fixed = parseCircuit(bad)!;
    expect(fixed.parts[1]!.val).toBe(1);
    expect(fixed.parts[2]!.val).toBeUndefined();
  });
});

describe("KS-AK-14: Messgerät", () => {
  it("V über dem Lämpchen, mA in Reihe, mA an der Batterie = Kurzschluss", () => {
    const alone = build(
      ["batterie", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 0, 1],
      ],
    );
    const i0 = solve(alone).lamps[alone.parts[1]!.id]!.amps;
    const v = build(
      ["batterie", "lampe", "messgeraet"],
      [
        [0, 0, 1, 0],
        [1, 1, 0, 1],
        [2, 0, 1, 0],
        [2, 1, 1, 1],
      ],
    );
    const rv = solve(v);
    const meter = v.parts[2]!;
    expect(rv.meters[meter.id]!.mode).toBe("V");
    expect(rv.meters[meter.id]!.value).toBeCloseTo(i0 * ELEC.lamp, 1);
    expect(Math.abs(rv.lamps[v.parts[1]!.id]!.amps - i0) / i0).toBeLessThan(0.01);
    expect(toggle(v, meter.id)).toBe(true);
    expect(solve(v).short).toBe(true); // mA parallel zum Lämpchen ≈ an der Batterie
    const a = build(
      ["batterie", "messgeraet", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    toggle(a, a.parts[1]!.id);
    const ra = solve(a);
    expect(ra.meters[a.parts[1]!.id]!.mode).toBe("mA");
    expect(Math.abs(ra.meters[a.parts[1]!.id]!.value - i0 * 1000) / (i0 * 1000)).toBeLessThan(0.05);
    const direct = build(
      ["batterie", "messgeraet"],
      [
        [0, 0, 1, 0],
        [1, 1, 0, 1],
      ],
    );
    toggle(direct, direct.parts[1]!.id);
    expect(solve(direct).short).toBe(true);
  });
});

describe("KS-AK-15: Missionen 9–11", () => {
  const m = (id: number) => MISSIONS.find((x) => x.id === id)!;
  it("falsche Lösungen bestehen nicht", () => {
    const reversed = build(
      ["batterie", "widerstand", "led"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 1],
        [2, 0, 0, 1],
      ],
    );
    expect(checkMission(m(9), reversed).ok).toBe(false);
    const noRes = build(
      ["batterie", "widerstand", "led"],
      [
        [0, 0, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    const v = checkMission(m(9), noRes);
    expect(v.ok).toBe(false);
    expect(v.hint).toMatch(/Puff/);
    const meterMa = build(
      ["batterie", "lampe", "messgeraet"],
      [
        [0, 0, 1, 0],
        [1, 1, 0, 1],
        [2, 0, 1, 0],
        [2, 1, 1, 1],
      ],
    );
    meterMa.parts[2]!.on = true;
    expect(checkMission(m(10), meterMa).ok).toBe(false);
    const seriesV = build(
      ["batterie", "messgeraet", "lampe"],
      [
        [0, 0, 1, 0],
        [1, 1, 2, 0],
        [2, 1, 0, 1],
      ],
    );
    expect(checkMission(m(11), seriesV).ok).toBe(false);
  });
});
