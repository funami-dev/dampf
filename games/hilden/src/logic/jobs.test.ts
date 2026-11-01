import { describe, expect, it } from "vitest";
import { buildCity } from "./city.ts";
import { BADGE_STARS, JOBS, createTask, currentStep, useAt, type Task } from "./jobs.ts";
import { BAKE_ZONE, bakeResult, needle } from "./baking.ts";

const city = buildCity();

/** Erledigt eine Aufgabe, indem an jedem Ziel „benutzt“ wird (Mini-Spiel = Erfolg). */
function complete(task: Task): Task {
  let t = task;
  for (let i = 0; i < 20 && !t.done; i++) {
    const s = currentStep(t)!;
    t = useAt(t, s.target[0], s.target[1], { baked: true, heldSeconds: 10 });
  }
  return t;
}

describe("Berufe (HI-AK-06)", () => {
  it("es gibt die 4 Berufe", () => {
    expect(JOBS.map((j) => j.name)).toEqual(["Postbote", "Bäcker", "Polizei", "Feuerwehr"]);
  });

  it.each(JOBS.map((j) => j.id))("%s: Aufgabe lässt sich vollständig erledigen", (id) => {
    for (let seed = 1; seed <= 20; seed++) {
      const t = complete(createTask(city, id, seed));
      expect(t.done).toBe(true);
    }
  });

  it("Postbote: abholen + 3 Briefe; Bäcker: backen + 2 Kunden; Polizei: 3 Funde + Wache", () => {
    expect(createTask(city, "post", 1).steps.map((s) => s.kind)).toEqual([
      "use",
      "use",
      "use",
      "use",
    ]);
    expect(createTask(city, "baker", 1).steps.map((s) => s.kind)).toEqual(["bake", "use", "use"]);
    expect(createTask(city, "police", 1).steps).toHaveLength(4);
    expect(["cat", "fire"]).toContain(createTask(city, "fire", 1).steps.at(-1)!.kind);
  });

  it("benutzen weit weg vom Ziel bewirkt nichts", () => {
    const t = createTask(city, "post", 3);
    const s = currentStep(t)!;
    expect(useAt(t, s.target[0] + 50, s.target[1], {})).toBe(t);
  });

  it("Backen ohne Erfolg geht nicht weiter (HI-AK-08)", () => {
    const t = createTask(city, "baker", 2);
    const s = currentStep(t)!;
    expect(useAt(t, s.target[0], s.target[1], { baked: false })).toBe(t);
  });

  it("Feuer: Benutzen muss gehalten werden", () => {
    for (let seed = 1; seed < 40; seed++) {
      const t0 = createTask(city, "fire", seed);
      if (t0.steps.at(-1)!.kind !== "fire") continue;
      let t = t0;
      while (currentStep(t)!.kind !== "fire") {
        const s = currentStep(t)!;
        t = useAt(t, s.target[0], s.target[1], {});
      }
      const s = currentStep(t)!;
      expect(useAt(t, s.target[0], s.target[1], { heldSeconds: 0.5 })).toBe(t);
      expect(useAt(t, s.target[0], s.target[1], { heldSeconds: 2 }).done).toBe(true);
      return;
    }
    throw new Error("kein Feuer-Einsatz gefunden");
  });

  it("HI-AK-07: alle Ziele liegen auf begehbaren Feldern", () => {
    for (const job of JOBS) {
      for (let seed = 1; seed <= 30; seed++) {
        for (const s of createTask(city, job.id, seed).steps) {
          expect(city.walkableAt(s.target[0], s.target[1])).toBe(true);
        }
      }
    }
  });

  it("Abzeichen ab 5 Sternen", () => {
    expect(BADGE_STARS).toBe(5);
  });
});

describe("Bäcker-Mini-Spiel (HI-AK-08)", () => {
  it("Nadel pendelt zwischen 0 und 1", () => {
    for (let t = 0; t < 10; t += 0.05) {
      expect(needle(t)).toBeGreaterThanOrEqual(0);
      expect(needle(t)).toBeLessThanOrEqual(1);
    }
  });

  it("im grünen Bereich = Erfolg, sonst nicht", () => {
    expect(bakeResult((BAKE_ZONE[0] + BAKE_ZONE[1]) / 2)).toBe(true);
    expect(bakeResult(BAKE_ZONE[0] - 0.05)).toBe(false);
    expect(bakeResult(BAKE_ZONE[1] + 0.05)).toBe(false);
  });
});
