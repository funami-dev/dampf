import { describe, expect, it } from "vitest";
import { DAY, PHASES } from "./daytime.ts";
import { FULL, RATES, fitnessFactor, speedFactor, stepNeeds } from "./needs.ts";
import { SHARK, activeAt } from "./sim.ts";
import { SPECIES } from "./species.ts";

const ctx = { night: false, running: false, moving: false, sleeping: false, atFire: false };

describe("WL-AK-34: Schwäche", () => {
  it("Tempo hängt an Fitness und Hunger, die stärkere Bremse zählt", () => {
    expect(speedFactor({ ...FULL })).toBe(1);
    expect(speedFactor({ ...FULL, fitness: 25 })).toBe(1);
    expect(speedFactor({ ...FULL, fitness: 24 })).toBe(0.8);
    expect(speedFactor({ ...FULL, fitness: 10 })).toBe(0.8);
    expect(speedFactor({ ...FULL, fitness: 9 })).toBe(0.6);
    expect(speedFactor({ ...FULL, hunger: 0 })).toBe(0.6);
    expect(speedFactor({ ...FULL, hunger: 0, fitness: 5 })).toBe(0.6);
    expect(speedFactor({ ...FULL, hunger: 10, fitness: 50 })).toBe(1);
  });

  it("Hunger unter 25 %: doppelte Kosten, halbe Erholung", () => {
    expect(fitnessFactor({ ...FULL })).toEqual({ cost: 1, recover: 1 });
    expect(fitnessFactor({ ...FULL, hunger: 25 })).toEqual({ cost: 1, recover: 1 });
    expect(fitnessFactor({ ...FULL, hunger: 24 })).toEqual({ cost: 2, recover: 0.5 });

    const run = { ...ctx, running: true, moving: true };
    const fed = stepNeeds({ ...FULL, fitness: 50 }, 1, run);
    const hungry = stepNeeds({ ...FULL, hunger: 20, fitness: 50 }, 1, run);
    expect(50 - fed.fitness).toBeCloseTo(RATES.runPerSec);
    expect(50 - hungry.fitness).toBeCloseTo(RATES.runPerSec * 2);

    const rest = stepNeeds({ ...FULL, fitness: 50 }, 1, ctx);
    const restHungry = stepNeeds({ ...FULL, hunger: 20, fitness: 50 }, 1, ctx);
    expect(rest.fitness - 50).toBeCloseTo(RATES.fitStand);
    expect(restHungry.fitness - 50).toBeCloseTo(RATES.fitStand / 2);
  });
});

describe("WL-AK-35: Gerade aktiv", () => {
  const mid = (name: string) => {
    const p = PHASES.find((q) => q.name === name)!;
    return (p.from + p.to) / 2;
  };
  const day = SPECIES.find((s) => s.time === "tag" && s.id !== "hai")!;
  const night = SPECIES.find((s) => s.time === "nacht")!;

  it("tag- und nachtaktive Tiere je nach Tageszeit", () => {
    const want: Record<string, [boolean, boolean]> = {
      morgen: [true, false],
      tag: [true, false],
      daemmerung: [true, true],
      nacht: [false, true],
    };
    for (const [ph, [d, n]] of Object.entries(want)) {
      expect(activeAt(day.id, mid(ph)), `${day.id} ${ph}`).toBe(d);
      expect(activeAt(night.id, mid(ph) + DAY), `${night.id} ${ph}`).toBe(n);
    }
  });

  it("der Hai ist aktiv, wenn die Flosse zu sehen ist", () => {
    expect(activeAt("hai", 0)).toBe(true);
    expect(activeAt("hai", SHARK.up - 1)).toBe(true);
    expect(activeAt("hai", SHARK.up + 1)).toBe(false);
    expect(activeAt("hai", SHARK.cycle + 1)).toBe(true);
  });
});
