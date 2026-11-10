import { describe, expect, it } from "vitest";
import { DAY, PHASES } from "./daytime.ts";
import { FREEZE, FULL, RATES, stepNeeds } from "./needs.ts";
import { NEIGH, addPlayer, createState, free, habitatOk, stepWorld } from "./sim.ts";
import { SPECIES, UNICORN } from "./species.ts";
import { EXTRA_FORDS, T, directionName, generateWorld, idx } from "./world.ts";

const ctx = { night: true, running: false, moving: false, sleeping: false, atFire: false };
const night = (PHASES.find((p) => p.name === "nacht")!.from + 10) % DAY;

describe("WL-AK-48: Frieren und Fitness beim Gehen", () => {
  it("nachts draußen sinkt die Wärme, Feuer und Schlafen wärmen, tagsüber erholt sie sich", () => {
    const cold = stepNeeds({ ...FULL }, 10, { ...ctx, cold: true });
    expect(cold.warmth).toBeCloseTo(100 - RATES.coldPerSec * 10);
    expect(
      stepNeeds({ ...FULL, warmth: 50 }, 1, { ...ctx, cold: true, atFire: true }).warmth,
    ).toBeCloseTo(50 + RATES.warmFire);
    expect(
      stepNeeds({ ...FULL, warmth: 50 }, 1, { ...ctx, cold: true, sleeping: true }).warmth,
    ).toBeCloseTo(50 + RATES.warmSleep);
    expect(stepNeeds({ ...FULL, warmth: 50 }, 1, { ...ctx, night: false }).warmth).toBeCloseTo(
      50 + RATES.warmDay,
    );
    // voll → leer in ca. 2,5 Minuten
    expect(100 / RATES.coldPerSec).toBeCloseTo(150);
  });

  it("wer friert, verliert zusätzlich Fitness; Meldung genau einmal", () => {
    const warm = stepNeeds({ ...FULL, fitness: 50, warmth: 80 }, 1, { ...ctx, night: false });
    const frozen = stepNeeds({ ...FULL, fitness: 50, warmth: FREEZE - 1 }, 1, {
      ...ctx,
      night: false,
    });
    expect(warm.fitness - frozen.fitness).toBeCloseTo(RATES.freezeFit);
    const w = generateWorld(4);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    p.landing = 0;
    s.total = night;
    s.fires = [];
    p.needs.warmth = FREEZE + 0.5;
    const texts: string[] = [];
    for (let k = 0; k < 20; k++) texts.push(...stepWorld(w, s, 0.5).map((e) => e.text));
    expect(texts.filter((t) => t.startsWith("🥶")).length).toBe(1);
  });

  it("Gehen kostet leicht Fitness, Stehen erholt", () => {
    const walk = stepNeeds({ ...FULL, fitness: 50 }, 10, { ...ctx, night: false, moving: true });
    const stand = stepNeeds({ ...FULL, fitness: 50 }, 10, { ...ctx, night: false });
    expect(walk.fitness).toBeCloseTo(45);
    expect(stand.fitness).toBeGreaterThan(50);
  });
});

describe("WL-AK-49: Einhorn wiehern", () => {
  it("Richtung stimmt (Norden oben), nur wenn es weiter weg ist", () => {
    expect(directionName(-10, -10)).toBe("Norden");
    expect(directionName(10, -10)).toBe("Osten");
    const w = generateWorld(6);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    p.landing = 0;
    s.total = 100;
    s.day = 0;
    s.animals = [
      { kind: UNICORN, x: p.x - 30, y: p.y - 30, tx: p.x - 30, ty: p.y - 30, fleeing: false },
    ];
    const texts: string[] = [];
    for (let k = 0; k < 2000; k++) texts.push(...stepWorld(w, s, 0.25).map((e) => e.text));
    const neigh = texts.filter((t) => t.startsWith("🦄"));
    expect(neigh.length).toBeGreaterThan(0);
    // 500 s, im Mittel alle 120 s → grob 1–12 Mal
    expect(neigh.length).toBeLessThan(15);
    expect(neigh[0]).toMatch(/^🦄 Du hörst ein Einhorn wiehern – irgendwo im [A-Z][a-z]+!$/);
    // nah dran: kein Wiehern
    s.animals = [{ kind: UNICORN, x: p.x + 2, y: p.y, tx: p.x + 2, ty: p.y, fleeing: false }];
    const near: string[] = [];
    for (let k = 0; k < 400; k++) near.push(...stepWorld(w, s, 0.25).map((e) => e.text));
    expect(near.filter((t) => t.startsWith("🦄")).length).toBe(0);
    expect(NEIGH.minDist).toBe(12);
  });
});

describe("WL-AK-50: Strandkrabben und Furten", () => {
  it("Krabben nur auf Sand am Meer, im Tierbuch", () => {
    expect(SPECIES.some((s) => s.id === "krebs")).toBe(true);
    const w = generateWorld(10);
    const s = createState(w);
    const crabs = s.animals.filter((a) => a.kind === "krebs");
    expect(crabs.length).toBeGreaterThan(0);
    for (const c of crabs) {
      expect(w.terrain[idx(w, Math.floor(c.x), Math.floor(c.y))]).toBe(T.SAND);
      expect(habitatOk(w, "krebs", Math.floor(c.x), Math.floor(c.y))).toBe(true);
    }
    expect(habitatOk(w, "krebs", w.start.x, w.start.y)).toBe(false);
  });
  it("3–6 steinige Furten, schmal und begehbar (viele Seeds)", () => {
    for (let k = 1; k <= 15; k++) {
      const w = generateWorld(k * 7919 + 13);
      const s = createState(w);
      const fords = [...w.terrain.keys()].filter((i) => w.terrain[i] === T.FORD);
      expect(fords.length, `Seed ${k}`).toBeGreaterThan(0);
      expect(fords.length).toBeLessThanOrEqual(EXTRA_FORDS.max * EXTRA_FORDS.maxWidth);
      for (const i of fords) expect(free(w, s, i % w.size, Math.floor(i / w.size))).toBe(true);
    }
  });
});
