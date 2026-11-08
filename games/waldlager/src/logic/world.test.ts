import { describe, expect, it } from "vitest";
import { T, generateWorld, idx, reachable, terrainWalkable } from "./world.ts";

describe("WL-AK-01: Weltgenerator", () => {
  it("gleicher Seed ergibt die gleiche Welt, anderer Seed eine andere", () => {
    const a = generateWorld(7);
    const b = generateWorld(7);
    const c = generateWorld(8);
    expect(Array.from(a.terrain)).toEqual(Array.from(b.terrain));
    expect(a.trees).toEqual(b.trees);
    expect(a.start).toEqual(b.start);
    expect(Array.from(a.terrain)).not.toEqual(Array.from(c.terrain));
  });

  for (const seed of [1, 2, 3, 42, 1234]) {
    it(`Seed ${seed}: alle Geländearten, Furten, Erreichbarkeit, Lichtung mit Beeren`, () => {
      const w = generateWorld(seed);
      const count = (t: number) => w.terrain.filter((x) => x === t).length;
      expect(count(T.GRASS)).toBeGreaterThan(500);
      expect(count(T.FOREST)).toBeGreaterThan(500);
      expect(count(T.WATER)).toBeGreaterThan(100);
      expect(count(T.FORD) + count(T.BRIDGE)).toBeGreaterThanOrEqual(8);
      expect(count(T.ROCK)).toBeGreaterThan(10);
      expect(count(T.ROCK)).toBeLessThan(w.size * w.size * 0.06);
      expect(Math.max(...w.height)).toBeGreaterThanOrEqual(2);
      expect(w.trees.length).toBeGreaterThan(800);
      // Keine Klippen: Nachbarn unterscheiden sich höchstens um 1
      for (let y = 0; y < w.size; y++)
        for (let x = 1; x < w.size; x++)
          expect(
            Math.abs(w.height[idx(w, x, y)]! - w.height[idx(w, x - 1, y)]!),
          ).toBeLessThanOrEqual(1);
      // Alle begehbaren Felder hängen zusammen
      const seen = reachable(w);
      for (let i = 0; i < w.size * w.size; i++)
        if (terrainWalkable(w.terrain[i]!) && !w.treeAt[i]) expect(seen[i]).toBe(1);
      // Lichtung: kein Baum im Umkreis 3, Beeren in Reichweite
      for (const t of w.trees)
        expect(Math.max(Math.abs(t.x - w.start.x), Math.abs(t.y - w.start.y))).toBeGreaterThan(3);
      expect(
        w.bushes.filter((b) => Math.hypot(b.x - w.start.x, b.y - w.start.y) <= 4).length,
      ).toBeGreaterThanOrEqual(2);
      expect(w.terrain[idx(w, w.start.x, w.start.y)]).toBe(T.GRASS);
    });
  }
});
