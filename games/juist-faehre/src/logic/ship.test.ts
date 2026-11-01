import { describe, expect, it } from "vitest";
import { MAX_AHEAD, MAX_ASTERN, MAX_RUDDER, stepShip, type ShipState } from "./ship.ts";
import { SANDBANKS } from "./world.ts";

const at = (over: Partial<ShipState> = {}): ShipState => ({
  x: 0,
  z: 0,
  heading: 0,
  speed: 0,
  rudder: 0,
  heel: 0,
  ...over,
});
const run = (s: ShipState, sec: number, c: { throttle: number; rudder: number }) => {
  let r = { state: s, grounded: false, impact: 0 };
  for (let t = 0; t < sec; t += 1 / 60) {
    const n = stepShip(r.state, c, 1 / 60);
    r = {
      state: n.state,
      grounded: r.grounded || n.grounded,
      impact: Math.max(r.impact, n.impact),
    };
  }
  return r;
};

describe("Fahrmodell", () => {
  it("JF-AK-02: Fahrhebel → Hebel × 16 m/s, rückwärts max. 4 m/s", () => {
    expect(MAX_AHEAD).toBe(16);
    expect(MAX_ASTERN).toBe(4);
    // 40 s reichen bei 15 %/s; Start im offenen Fahrwasser, damit kein Land im Weg ist
    const open = at({ z: -300 });
    expect(run(open, 40, { throttle: 0.5, rudder: 0 }).state.speed).toBeCloseTo(8, 1);
    expect(run(open, 40, { throttle: 1, rudder: 0 }).state.speed).toBeCloseTo(16, 1);
    expect(run(open, 40, { throttle: -1, rudder: 0 }).state.speed).toBeCloseTo(-4, 1);
  });

  it("nähert sich mit 15 %/s an", () => {
    const s = stepShip(at(), { throttle: 1, rudder: 0 }, 1).state;
    expect(s.speed).toBeCloseTo(16 * 0.15, 5);
  });

  it("fährt in Kursrichtung (0° = Norden)", () => {
    const s = run(at({ speed: 10 }), 1, { throttle: 10 / 16, rudder: 0 }).state;
    expect(s.z).toBeGreaterThan(9);
    expect(Math.abs(s.x)).toBeLessThan(0.01);
  });

  it("JF-AK-03: keine Drehung im Stand, Drehrate wächst mit der Geschwindigkeit", () => {
    expect(run(at(), 5, { throttle: 0, rudder: 1 }).state.heading).toBe(0);
    const rate = (v: number) => {
      const s = at({ speed: v, rudder: MAX_RUDDER });
      const n = stepShip(s, { throttle: v / 16, rudder: 1 }, 0.1).state;
      return ((n.heading - s.heading + 540) % 360) - 180;
    };
    expect(rate(2)).toBeGreaterThan(0);
    expect(rate(6)).toBeGreaterThan(rate(2));
    expect(rate(-2)).toBeLessThan(0); // rückwärts dreht es andersherum
  });

  it("Ruder läuft bis ±35° und bleibt stehen", () => {
    expect(run(at(), 5, { throttle: 0, rudder: 1 }).state.rudder).toBe(MAX_RUDDER);
    expect(run(at(), 5, { throttle: 0, rudder: -1 }).state.rudder).toBe(-MAX_RUDDER);
  });

  it("Schräglage wächst mit Ruder × Geschwindigkeit", () => {
    const slow = stepShip(at({ speed: 3, rudder: MAX_RUDDER }), { throttle: 0.25, rudder: 1 }, 0.1)
      .state.heel;
    const fast = stepShip(at({ speed: 12, rudder: MAX_RUDDER }), { throttle: 1, rudder: 1 }, 0.1)
      .state.heel;
    expect(Math.abs(fast)).toBeGreaterThan(Math.abs(slow));
    expect(stepShip(at({ speed: 12 }), { throttle: 1, rudder: 0 }, 0.1).state.heel).toBe(0);
  });

  it("JF-AK-04: fährt nicht auf eine Sandbank, stoppt und bleibt im Wasser", () => {
    const sb = SANDBANKS[0]!;
    // von Süden auf die Sandbank zu
    const start = at({ x: sb.x, z: sb.z - sb.rz - 60, speed: 8, heading: 0 });
    const r = run(start, 30, { throttle: 0.7, rudder: 0 });
    expect(r.grounded).toBe(true);
    expect(r.state.z).toBeLessThan(sb.z - sb.rz + 1);
  });
});
