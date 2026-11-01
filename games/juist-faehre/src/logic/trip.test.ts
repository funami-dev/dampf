import { describe, expect, it } from "vitest";
import {
  ARRIVAL_PUNCTUAL_MIN,
  CLOCK_SCALE,
  TRIP_MINUTES,
  canCastOff,
  canMoor,
  castOff,
  createTrip,
  formatClock,
  moor,
  result,
  stars,
  tick,
  type Trip,
} from "./trip.ts";
import { BERTHS } from "./world.ts";

const board = (t: Trip) => {
  let x = t;
  for (let i = 0; i < 2000 && !canCastOff(x); i++) x = tick(x, 0.1, {});
  return x;
};

describe("Fahrplan (JF-AK-06/07)", () => {
  it("Spieluhr läuft 30-fach; Soll-Ankunft = Abfahrt + 90 min", () => {
    expect(CLOCK_SCALE).toBe(30);
    const t = createTrip("frisia-i", "to-juist", 1);
    expect(t.due - t.departure).toBe(TRIP_MINUTES * 60);
    expect(tick(t, 10, {}).clock - t.clock).toBeCloseTo(300);
  });

  it("Ablegen erst, wenn alle an Bord sind und die Abfahrtszeit erreicht ist", () => {
    const t = createTrip("frisia-i", "to-juist", 2);
    expect(t.boarded).toBe(0);
    expect(canCastOff(t)).toBe(false);
    expect(castOff(t)).toBe(t);
    const ready = board(t);
    expect(ready.boarded).toBe(ready.passengers);
    expect(ready.clock).toBeGreaterThanOrEqual(ready.departure);
    expect(castOff(ready).phase).toBe("sailing");
  });

  it("Einsteigen dauert höchstens etwa 4 Sekunden, Abfahrt 2 Spielminuten nach Beginn", () => {
    const t = createTrip("frisia-i", "to-juist", 9);
    expect(t.departure - t.clock).toBe(120);
    let x = t;
    let real = 0;
    while (!canCastOff(x)) {
      x = tick(x, 0.1, {});
      real += 0.1;
    }
    expect(real).toBeLessThanOrEqual(4.2);
  });

  it("Passagierzahl 100–300", () => {
    for (let s = 1; s < 50; s++) {
      const t = createTrip("frisia-ix", "to-norddeich", s);
      expect(t.passengers).toBeGreaterThanOrEqual(100);
      expect(t.passengers).toBeLessThanOrEqual(300);
    }
  });

  it("Start am richtigen Anleger je Richtung", () => {
    expect(createTrip("frisia-i", "to-juist", 1).ship.z).toBe(BERTHS.norddeich.start[1]);
    expect(createTrip("frisia-i", "to-norddeich", 1).ship.z).toBe(BERTHS.juist.start[1]);
    expect(formatClock(9 * 3600 + 30 * 60)).toBe("09:30");
  });
});

describe("Anlegen (JF-AK-08)", () => {
  const sailing = () => castOff(board(createTrip("frisia-ii", "to-juist", 3)));

  it("nur im Anlegebereich und unter 1 m/s", () => {
    const t = sailing();
    const [x, z] = BERTHS.juist.start;
    expect(canMoor({ ...t, ship: { ...t.ship, x, z, speed: 0.5 } })).toBe(true);
    expect(canMoor({ ...t, ship: { ...t.ship, x, z, speed: 2 } })).toBe(false);
    expect(canMoor({ ...t, ship: { ...t.ship, x: 0, z: 0, speed: 0 } })).toBe(false);
    expect(
      canMoor({
        ...t,
        ship: {
          ...t.ship,
          ...{ x: BERTHS.norddeich.start[0], z: BERTHS.norddeich.start[1] },
          speed: 0,
        },
      }),
    ).toBe(false);
    expect(moor({ ...t, ship: { ...t.ship, x, z, speed: 0.5 } }).phase).toBe("docked");
  });

  it("Aufprall am Anleger über 1 m/s kostet 10 %", () => {
    const t = sailing();
    const after = tick(t, 0.016, { impact: 2 });
    expect(after.satisfaction).toBe(90);
    expect(tick(t, 0.016, { impact: 0.5 }).satisfaction).toBe(100);
  });
});

describe("Zufriedenheit und Sterne (JF-AK-04/09)", () => {
  const sailing = () => castOff(board(createTrip("frisia-iii", "to-juist", 4)));

  it("Grundberührung −15 %", () => {
    expect(tick(sailing(), 0.016, { grounded: true }).satisfaction).toBe(85);
  });

  it("Schräglage über der Grenze −1 % pro Sekunde", () => {
    let t = sailing();
    for (let i = 0; i < 100; i++) t = tick(t, 0.1, { heel: 6 });
    expect(t.satisfaction).toBeCloseTo(90, 5);
    expect(tick(sailing(), 10, { heel: 2 }).satisfaction).toBe(100);
  });

  it("Verspätung: bis 5 min pünktlich, danach −1 % pro Minute", () => {
    const t = sailing();
    const onTime = result({ ...t, clock: t.due + 4 * 60 });
    expect(onTime.lateMinutes).toBe(4);
    expect(onTime.satisfaction).toBe(100);
    const late = result({ ...t, clock: t.due + 15 * 60 });
    expect(late.satisfaction).toBe(100 - (15 - ARRIVAL_PUNCTUAL_MIN));
  });

  it("Sterne 1–3", () => {
    expect(stars(0, 95)).toBe(3);
    expect(stars(3, 60)).toBe(2);
    expect(stars(12, 85)).toBe(2);
    expect(stars(30, 40)).toBe(1);
    expect(stars(0, 0)).toBe(1);
  });
});
