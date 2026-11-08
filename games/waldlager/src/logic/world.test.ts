import { describe, expect, it } from "vitest";
import {
  DEBRIS,
  SEA_MARGIN,
  SIZE,
  T,
  debrisHint,
  generateWorld,
  idx,
  reachable,
  terrainWalkable,
} from "./world.ts";

describe("WL-AK-01: Insel", () => {
  it("gleicher Seed ergibt die gleiche Welt, anderer Seed eine andere", () => {
    const a = generateWorld(7);
    const b = generateWorld(7);
    const c = generateWorld(8);
    expect(a.size).toBe(256);
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
      expect(count(T.SAND)).toBeGreaterThan(300);
      expect(count(T.GRASS)).toBeGreaterThan(2000);
      expect(count(T.FOREST)).toBeGreaterThan(2000);
      expect(count(T.ROCK)).toBeGreaterThan(10);
      expect(w.rivers).toBeGreaterThanOrEqual(3);
      expect(w.rivers).toBeLessThanOrEqual(5);
      // keine fertigen Übergänge
      expect(count(T.FORD) + count(T.BRIDGE)).toBe(0);
      expect(w.height.reduce((m, h) => Math.max(m, h), 0)).toBeGreaterThanOrEqual(2);
      // Keine Klippen
      for (let y = 0; y < w.size; y++)
        for (let x = 1; x < w.size; x++)
          expect(
            Math.abs(w.height[idx(w, x, y)]! - w.height[idx(w, x - 1, y)]!),
          ).toBeLessThanOrEqual(1);
      // Mit Brücken über die Flüsse hängen alle begehbaren Felder zusammen
      const seen = reachable(w, true);
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

describe("WL-AK-29: Trümmerspur", () => {
  for (const seed of [1, 2, 42, 7]) {
    it(`Seed ${seed}: 15–25 Teile auf begehbarem Land, 10–90 Felder vom Wrack`, () => {
      const w = generateWorld(seed);
      expect(w.debris.length).toBeGreaterThanOrEqual(DEBRIS.min);
      expect(w.debris.length).toBeLessThanOrEqual(DEBRIS.max);
      for (const d of w.debris) {
        const i = idx(w, d.x, d.y);
        expect(terrainWalkable(w.terrain[i]!)).toBe(true);
        expect(w.terrain[i]).not.toBe(T.WATER);
        expect(w.treeAt[i]).toBe(0);
        const dist = Math.hypot(d.x - w.plane.x, d.y - w.plane.y);
        expect(dist).toBeGreaterThanOrEqual(10);
        expect(dist).toBeLessThanOrEqual(90);
      }
    });
  }

  it("Hinweis: Himmelsrichtung (Norden = oben) und Entfernungsstufe", () => {
    const w = generateWorld(3);
    const { x, y } = w.plane;
    // Bildschirm-oben = Kachelrichtung (−1, −1): Wrack liegt „oben“ → Norden
    expect(debrisHint(w, x + 10, y + 10).dir).toBe("Norden");
    expect(debrisHint(w, x - 10, y - 10).dir).toBe("Süden");
    // Bildschirm-rechts = (+1, −1)
    expect(debrisHint(w, x - 10, y + 10).dir).toBe("Osten");
    expect(debrisHint(w, x + 10, y - 10).dir).toBe("Westen");
    expect(debrisHint(w, x, y + 15).dir).toBe("Nordosten");
    expect(debrisHint(w, x + 10, y).dist).toBe("ganz nah");
    expect(debrisHint(w, x + 35, y).dist).toBe("nicht mehr weit");
    expect(debrisHint(w, x + 70, y).dist).toBe("noch weit weg");
    expect(debrisHint(w, x + 70, y).text).toMatch(
      /^Ein Stück Flugzeug! Die Spur führt nach \S+ – noch weit weg\.$/,
    );
  });
});
