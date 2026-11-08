import { describe, expect, it } from "vitest";
import { SEA_MARGIN, SIZE, T, generateWorld, idx, reachable, terrainWalkable } from "./world.ts";

describe("WL-AK-01: Insel", () => {
  it("gleicher Seed ergibt die gleiche Welt, anderer Seed eine andere", () => {
    const a = generateWorld(7);
    const b = generateWorld(7);
    const c = generateWorld(8);
    expect(a.size).toBe(512);
    expect(Array.from(a.terrain)).toEqual(Array.from(b.terrain));
    expect(a.trees).toEqual(b.trees);
    expect(a.plane).toEqual(b.plane);
    expect(Array.from(a.terrain)).not.toEqual(Array.from(c.terrain));
  });

  for (const seed of [1, 2, 3, 42, 1234]) {
    it(`Seed ${seed}: Meer rundum, Gelände, Flüsse, Erreichbarkeit, unter 3 s`, () => {
      const t0 = performance.now();
      const w = generateWorld(seed);
      expect(performance.now() - t0).toBeLessThan(3000);
      expect(w.size).toBe(SIZE);
      const count = (t: number) => w.terrain.filter((x) => x === t).length;
      // Meer-Rand
      for (let y = 0; y < w.size; y++)
        for (let x = 0; x < w.size; x++)
          if (Math.min(x, y, w.size - 1 - x, w.size - 1 - y) < SEA_MARGIN)
            expect(w.terrain[idx(w, x, y)]).toBe(T.SEA);
      const land = w.terrain.length - count(T.SEA);
      expect(land / w.terrain.length).toBeGreaterThanOrEqual(0.35);
      expect(count(T.SAND)).toBeGreaterThan(500);
      expect(count(T.GRASS)).toBeGreaterThan(5000);
      expect(count(T.FOREST)).toBeGreaterThan(5000);
      expect(count(T.ROCK)).toBeGreaterThan(10);
      expect(w.rivers).toBeGreaterThanOrEqual(3);
      expect(w.rivers).toBeLessThanOrEqual(5);
      expect(count(T.FORD) + count(T.BRIDGE)).toBeGreaterThanOrEqual(2 * w.rivers);
      expect(w.height.reduce((m, h) => Math.max(m, h), 0)).toBeGreaterThanOrEqual(2);
      // Keine Klippen
      for (let y = 0; y < w.size; y++)
        for (let x = 1; x < w.size; x++)
          expect(
            Math.abs(w.height[idx(w, x, y)]! - w.height[idx(w, x - 1, y)]!),
          ).toBeLessThanOrEqual(1);
      // Kein Übergang über das Meer
      for (let i = 0; i < w.terrain.length; i++)
        if (w.terrain[i] === T.FORD || w.terrain[i] === T.BRIDGE) {
          const x = i % w.size;
          const y = Math.floor(i / w.size);
          expect(Math.min(x, y, w.size - 1 - x, w.size - 1 - y)).toBeGreaterThanOrEqual(SEA_MARGIN);
        }
      // Alle begehbaren Felder hängen zusammen
      const seen = reachable(w);
      for (let i = 0; i < w.size * w.size; i++)
        if (terrainWalkable(w.terrain[i]!) && !w.treeAt[i]) expect(seen[i]).toBe(1);
    });
  }
});

describe("WL-AK-24: Flugzeugwrack", () => {
  for (const seed of [1, 2, 42]) {
    it(`Seed ${seed}: genau ein Wrack auf ebenem Land, nicht begehbar, aber erreichbar`, () => {
      const w = generateWorld(seed);
      const cells = w.terrain.filter((t) => t === T.WRECK).length;
      expect(cells).toBe(w.plane.cells.length);
      expect(cells).toBeGreaterThanOrEqual(6);
      const hs = new Set(w.plane.cells.map(([x, y]) => w.height[idx(w, x, y)]));
      expect(hs.size).toBe(1);
      for (const [x, y] of w.plane.cells)
        expect(terrainWalkable(w.terrain[idx(w, x, y)]!)).toBe(false);
      // ein freies Nachbarfeld ist erreichbar
      const seen = reachable(w);
      const around = w.plane.cells.flatMap(([x, y]) => [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]);
      expect(around.some(([x, y]) => seen[idx(w, x!, y!)] === 1)).toBe(true);
    });
  }
});
