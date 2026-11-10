import { describe, expect, it } from "vitest";
import { FULL, eatBerry, stepNeeds } from "./needs.ts";

const idle = { night: false, running: false, moving: false, sleeping: false, atFire: false };

describe("WL-AK-03: Leisten", () => {
  it("Hunger ist nach ca. 12 Minuten leer", () => {
    let n = FULL;
    for (let i = 0; i < 700; i++) n = stepNeeds(n, 1, idle);
    expect(n.hunger).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) n = stepNeeds(n, 1, idle);
    expect(n.hunger).toBe(0);
  });
  it("Müdigkeit sinkt nachts doppelt so schnell, Schlafen und Feuer erholen", () => {
    const day = stepNeeds(FULL, 60, idle);
    const night = stepNeeds(FULL, 60, { ...idle, night: true });
    expect(100 - night.rest).toBeCloseTo(2 * (100 - day.rest), 5);
    const tired = { ...FULL, rest: 20 };
    expect(stepNeeds(tired, 10, { ...idle, sleeping: true }).rest).toBeGreaterThan(40);
    expect(stepNeeds(tired, 10, { ...idle, atFire: true }).rest).toBeGreaterThan(20);
  });
  it("Rennen kostet Fitness, Stehen und Feuer erholen", () => {
    const run = stepNeeds(FULL, 5, { ...idle, running: true, moving: true });
    expect(run.fitness).toBeLessThan(85);
    expect(run.fitness).toBeGreaterThan(80);
    const low = { ...FULL, fitness: 10 };
    expect(stepNeeds(low, 5, idle).fitness).toBeGreaterThan(30);
    expect(stepNeeds(low, 5, { ...idle, atFire: true }).fitness).toBeGreaterThan(
      stepNeeds(low, 5, idle).fitness,
    );
  });
  it("bleibt zwischen 0 und 100; Beere gibt +12 %", () => {
    expect(stepNeeds(FULL, 1e6, idle)).toEqual({ hunger: 0, rest: 0, fitness: 100, warmth: 100 });
    expect(eatBerry({ ...FULL, hunger: 50 }).hunger).toBe(62);
    expect(eatBerry(FULL).hunger).toBe(100);
  });
});
