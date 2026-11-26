import { describe, expect, it } from "vitest";
import { DAY } from "./daytime.ts";
import { load, save, type Store } from "./save.ts";
import { HERDS, addPlayer, createState, free, stepWorld } from "./sim.ts";
import { SHEEP } from "./species.ts";
import { BURROW, T, generateWorld, idx, reachable } from "./world.ts";

const SEEDS = [1, 7, 21, 42, 1234];
const worlds = new Map(SEEDS.map((seed) => [seed, generateWorld(seed)]));

describe("WL-AK-63: Schafherden", () => {
  for (const seed of SEEDS) {
    it(`Seed ${seed}: 2 Herden mit 7–13 Schafen, beisammen, auf Wiese`, () => {
      const w = worlds.get(seed)!;
      const s = createState(w);
      expect(s.herds).toHaveLength(2);
      s.herds.forEach((h, k) => {
        const sheep = s.animals.filter((a) => a.herd === k);
        expect(sheep.length).toBeGreaterThanOrEqual(HERDS.min);
        expect(sheep.length).toBeLessThanOrEqual(HERDS.max);
        expect(sheep.every((a) => a.kind === SHEEP)).toBe(true);
        expect(w.terrain[idx(w, Math.floor(h.x), Math.floor(h.y))]).toBe(T.GRASS);
        expect(Math.hypot(h.x - w.start.x, h.y - w.start.y)).toBeGreaterThanOrEqual(15);
        for (const a of sheep) expect(Math.hypot(a.x - h.x, a.y - h.y)).toBeLessThanOrEqual(3.01);
      });
      expect(s.animals.filter((a) => a.kind === SHEEP && a.herd === undefined)).toHaveLength(0);
      const start = s.herds.map((h) => ({ ...h }));
      for (let t = 0; t < 5 * DAY; t += 0.25) stepWorld(w, s, 0.25);
      s.herds.forEach((h, k) => {
        expect(w.terrain[idx(w, Math.floor(h.x), Math.floor(h.y))]).toBe(T.GRASS);
        for (const a of s.animals.filter((x) => x.herd === k))
          expect(Math.hypot(a.x - h.x, a.y - h.y)).toBeLessThanOrEqual(6);
      });
      expect(s.herds.some((h, k) => Math.hypot(h.x - start[k]!.x, h.y - start[k]!.y) > 1)).toBe(
        true,
      );
    }, 30_000);
  }

  it("gleicher Seed → gleiche Herden", () => {
    const w = worlds.get(42)!;
    const a = createState(w);
    const b = createState(w);
    expect(a.animals).toEqual(b.animals);
    expect(a.herds).toEqual(b.herds);
  });
});

describe("WL-AK-64: versteckte Hügelhöhle", () => {
  for (const seed of SEEDS) {
    it(`Seed ${seed}: genau eine Höhle auf dem Hügel, mit Abständen, erreichbar`, () => {
      const w = worlds.get(seed)!;
      const { x, y } = w.burrow;
      expect(x).toBeGreaterThanOrEqual(0);
      const i = idx(w, x, y);
      expect(w.height[i]).toBeGreaterThanOrEqual(BURROW.minHeight);
      expect([T.GRASS, T.FOREST]).toContain(w.terrain[i]);
      expect(Math.hypot(x - w.start.x, y - w.start.y)).toBeGreaterThanOrEqual(BURROW.minStart);
      expect(Math.hypot(x - w.hut.x, y - w.hut.y)).toBeGreaterThanOrEqual(BURROW.minHut);
      expect(Math.hypot(x - w.plane.x, y - w.plane.y)).toBeGreaterThanOrEqual(BURROW.minPlane);
      const s = createState(w);
      expect(free(w, s, x, y)).toBe(false);
      const reach = reachable(w, true);
      const next = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => reach[idx(w, x + dx!, y + dy!)] === 1 && free(w, s, x + dx!, y + dy!));
      expect(next).toBe(true);
    });
  }

  it("„gefunden“ kommt genau einmal und wird gespeichert", () => {
    const w = worlds.get(21)!;
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Kim", "#e74c3c");
    p.landing = 0;
    const text = "🍵 Du hast die versteckte Hügelhöhle gefunden!";
    const far = stepWorld(w, s, 0.1).filter((e) => e.text === text);
    expect(far).toHaveLength(0);
    p.x = w.burrow.x + 2.5;
    p.y = w.burrow.y + 0.5;
    expect(stepWorld(w, s, 0.1).filter((e) => e.text === text)).toHaveLength(1);
    expect(p.burrowSeen).toBe(true);
    expect(stepWorld(w, s, 0.1).filter((e) => e.text === text)).toHaveLength(0);
    const data = new Map<string, string>();
    const store: Store = { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
    save(store, 21, s, "me");
    expect(load(store)!.state.players.me!.burrowSeen).toBe(true);
  });
});
