import { describe, expect, it } from "vitest";
import {
  BRAKE_DECEL,
  G,
  MAX_ALTITUDE,
  MAX_PITCH,
  MAX_ROLL,
  ROTATE_SPEED,
  STALL_SPEED,
  createFlight,
  step,
  type Controls,
  type FlightState,
} from "./flight.ts";
import { BOUNDS, START, groundHeight } from "./world.ts";

const DT = 1 / 60;
const idle: Controls = { pitch: 0, roll: 0, throttle: 0, brake: false };

function fly(s: FlightState, seconds: number, c: Partial<Controls> = {}): FlightState {
  const controls = { ...idle, ...c };
  for (let t = 0; t < seconds; t += DT) s = step(s, controls, DT);
  return s;
}

/** Fliegt in sicherer Höhe geradeaus mit Reisegeschwindigkeit. */
function cruising(over: Partial<FlightState> = {}): FlightState {
  return {
    ...createFlight(),
    x: 0,
    z: 0,
    y: 3000,
    speed: 180,
    throttle: 0.75,
    onGround: false,
    heading: 0,
    ...over,
  };
}

describe("Flugmodell", () => {
  it("PP-AK-03: Start steht auf der Bahn, Kurs ≈ 233°, Geschwindigkeit 0", () => {
    const s = createFlight();
    expect(s.onGround).toBe(true);
    expect(s.speed).toBe(0);
    expect(s.heading).toBeCloseTo(START.heading);
    expect(s.x).toBe(START.x);
    expect(s.z).toBe(START.z);
  });

  it("PP-AK-04: Schub beschleunigt Richtung Zielgeschwindigkeit", () => {
    let s = fly(createFlight(), 5, { throttle: 1 });
    expect(s.speed).toBeGreaterThan(40);
    // Zielgeschwindigkeit bei 25 % Schub = 60 m/s, wird nicht überschritten (am Boden)
    s = fly({ ...createFlight(), speed: 30 }, 120, { throttle: 0.25 });
    expect(s.speed).toBeGreaterThan(55);
    expect(s.speed).toBeLessThanOrEqual(60.5);
  });

  it("PP-AK-04: Bremse am Boden mit 6 m/s²", () => {
    const s0 = { ...createFlight(), speed: 30 };
    const s1 = fly(s0, 1, { brake: true });
    // Bremse + Rollreibung (Schub 0 → Ziel 0)
    expect(s0.speed - s1.speed).toBeGreaterThanOrEqual(BRAKE_DECEL - 0.1);
    expect(fly(s0, 10, { brake: true }).speed).toBe(0);
  });

  it("PP-AK-05: unter 75 m/s kein Abheben, darüber mit Nase hoch schon", () => {
    const slow = fly({ ...createFlight(), speed: 60, throttle: 0.3 }, 3, {
      pitch: 1,
      throttle: 0.3,
    });
    expect(slow.onGround).toBe(true);
    expect(slow.y).toBe(groundHeight(slow.x, slow.z));
    const fast = fly({ ...createFlight(), speed: ROTATE_SPEED + 5, throttle: 1 }, 4, {
      pitch: 1,
      throttle: 1,
    });
    expect(fast.onGround).toBe(false);
    expect(fast.y).toBeGreaterThan(5);
  });

  it("vom Start aus: Vollgas, rotieren, steigen", () => {
    let s = fly(createFlight(), 12, { throttle: 1 });
    expect(s.speed).toBeGreaterThan(ROTATE_SPEED);
    s = fly(s, 6, { throttle: 1, pitch: 1 });
    expect(s.onGround).toBe(false);
    expect(s.y).toBeGreaterThan(50);
  });

  it("PP-AK-06: Nick- und Rollwinkel begrenzt und kehren zurück", () => {
    let s = fly(cruising(), 5, { pitch: 1, roll: 1, throttle: 1 });
    expect(s.pitch).toBeCloseTo(MAX_PITCH, 5);
    expect(s.roll).toBeCloseTo(MAX_ROLL, 5);
    s = fly(cruising(), 5, { pitch: -1, roll: -1, throttle: 1 });
    expect(s.pitch).toBeCloseTo(-MAX_PITCH, 5);
    expect(s.roll).toBeCloseTo(-MAX_ROLL, 5);
    s = fly(s, 10, { throttle: 1 });
    expect(Math.abs(s.pitch)).toBeLessThan(0.5);
    expect(Math.abs(s.roll)).toBeLessThan(0.5);
  });

  it("PP-AK-07: Drehrate = g·tan(Rollwinkel)/v", () => {
    const s = cruising({ roll: 30, speed: 150 });
    const n = step(s, { ...idle, throttle: 0.625, roll: 0 }, 0.001); // praktisch ohne Rücklauf
    const rate = (n.heading - s.heading) / 0.001;
    const expected = ((G * Math.tan((30 * Math.PI) / 180)) / 150) * (180 / Math.PI);
    expect(rate).toBeCloseTo(expected, 1);
  });

  it("Kurs: 0° = Norden (+z), 90° = Osten (+x)", () => {
    const n = fly(cruising({ heading: 0 }), 1, { throttle: 0.75 });
    expect(n.z).toBeGreaterThan(100);
    const e = fly(cruising({ heading: 90 }), 1, { throttle: 0.75 });
    expect(e.x).toBeGreaterThan(100);
  });

  it("PP-AK-08: unter 60 m/s in der Luft senkt sich die Nase", () => {
    let s = cruising({ speed: STALL_SPEED - 10, pitch: 10, throttle: 0 });
    s = fly(s, 1, { pitch: 1 });
    expect(s.stalled).toBe(true);
    expect(s.pitch).toBeLessThan(10);
    s = fly(s, 20, { throttle: 1 });
    expect(s.stalled).toBe(false);
  });

  it("PP-AK-09: Boden/Wasser außerhalb einer Bahn – heil, auf der Oberfläche, waagerecht, langsam", () => {
    for (const [x, z] of [
      [-12_000, 0], // Feld
      [-1000, 6000], // Rhein
    ] as const) {
      let s = cruising({ x, z, y: groundHeight(x, z) + 2, pitch: -20, roll: 30, speed: 150 });
      s = fly(s, 2, { throttle: 0.6 });
      expect(s.onGround).toBe(true);
      expect(s.y).toBe(groundHeight(s.x, s.z));
      expect(s.pitch).toBe(0);
      expect(s.roll).toBe(0);
      expect(s.speed).toBeLessThan(60);
    }
  });

  it("weiche Landung auf einer Bahn behält die Geschwindigkeit", () => {
    let s = cruising({
      x: START.x,
      z: START.z,
      y: 0.5,
      pitch: -1,
      roll: 0,
      speed: 70,
      heading: START.heading,
    });
    s = fly(s, 0.5, { throttle: 0.2, pitch: -0.3 });
    expect(s.onGround).toBe(true);
    expect(s.speed).toBeGreaterThan(55);
  });

  it("PP-AK-10: nie höher als 12 000 m", () => {
    const s = fly(cruising({ y: MAX_ALTITUDE - 100, speed: 240, throttle: 1 }), 30, {
      pitch: 1,
      throttle: 1,
    });
    expect(s.y).toBeLessThanOrEqual(MAX_ALTITUDE);
  });

  it("PP-AK-10: am Gebietsrand dreht das Flugzeug um", () => {
    let s = cruising({ x: BOUNDS.maxX - 50, heading: 90, speed: 200 });
    s = fly(s, 2, { throttle: 0.8 });
    expect(s.x).toBeLessThanOrEqual(BOUNDS.maxX);
    expect(Math.abs(((s.heading - 270 + 540) % 360) - 180)).toBeLessThan(5);
    expect(s.notice).toBe("Ende des Gebiets");
  });

  it("Steig-/Sinkrate wird mitgeführt", () => {
    const s = fly(cruising({ pitch: 10 }), 0.1, { throttle: 0.8, pitch: 1 });
    expect(s.vs).toBeGreaterThan(0);
  });
});
