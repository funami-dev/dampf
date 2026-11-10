import { describe, expect, it } from "vitest";
import { KEY, load, save, type Store } from "./save.ts";
import { addPlayer, createState, free, habitatOk } from "./sim.ts";
import { LAKES, T, generateWorld, idx, reachable, terrainWalkable } from "./world.ts";

const memory = (): Store => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

/** Seefelder je See (zusammenhängend ab der Mitte) */
function lakeCells(w: ReturnType<typeof generateWorld>, x: number, y: number): number[] {
  const out: number[] = [];
  const seen = new Set([idx(w, x, y)]);
  const q = [idx(w, x, y)];
  while (q.length) {
    const i = q.pop()!;
    out.push(i);
    const cx = i % w.size;
    const cy = Math.floor(i / w.size);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const j = idx(w, cx + dx, cy + dy);
      if (!seen.has(j) && w.terrain[j] === T.LAKE) {
        seen.add(j);
        q.push(j);
      }
    }
  }
  return out;
}

describe("WL-AK-52: Seen und Fische", () => {
  for (const seed of [1, 2, 3, 42, 1234, 99991, 31337]) {
    it(`Seed ${seed}: 3–6 Seen, frei von Dingen, nicht am Meer, alles erreichbar`, () => {
      const w = generateWorld(seed);
      expect(w.lakes.length).toBeGreaterThanOrEqual(LAKES.min);
      expect(w.lakes.length).toBeLessThanOrEqual(LAKES.max);
      let total = 0;
      for (const l of w.lakes) {
        const cells = lakeCells(w, l.x, l.y);
        expect(cells.length).toBe(l.cells);
        expect(cells.length).toBeGreaterThanOrEqual(12);
        expect(cells.length).toBeLessThanOrEqual(60);
        total += cells.length;
        for (const i of cells) {
          const x = i % w.size;
          const y = Math.floor(i / w.size);
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
              expect(w.terrain[idx(w, x + dx, y + dy)]).not.toBe(T.SEA);
        }
        // 1–2 Fischstellen je See
        const fish = w.fish.filter((f) => cells.includes(idx(w, f.x, f.y)));
        expect(fish.length).toBeGreaterThanOrEqual(1);
        expect(fish.length).toBeLessThanOrEqual(2);
      }
      expect(w.terrain.filter((t) => t === T.LAKE).length).toBe(total);
      const lake = (x: number, y: number) => w.terrain[idx(w, x, y)] === T.LAKE;
      for (const t of w.trees) expect(lake(t.x, t.y)).toBe(false);
      for (const b of w.bushes) expect(lake(b.x, b.y)).toBe(false);
      for (const d of w.debris) expect(lake(d.x, d.y)).toBe(false);
      for (const [x, y] of w.plane.cells) expect(lake(x, y)).toBe(false);
      expect(lake(w.hut.x, w.hut.y)).toBe(false);
      for (const i of w.scorch) expect(w.terrain[i]).not.toBe(T.LAKE);
      // nicht begehbar, alles andere bleibt erreichbar (WL-AK-01)
      expect(terrainWalkable(T.LAKE)).toBe(false);
      const seen = reachable(w, true);
      for (let i = 0; i < w.size * w.size; i++)
        if (terrainWalkable(w.terrain[i]!) && !w.treeAt[i]) expect(seen[i]).toBe(1);
      // Fischstellen nur in Fluss oder See
      expect(w.fish.length).toBeGreaterThan(w.lakes.length);
      for (const f of w.fish) expect([T.WATER, T.LAKE]).toContain(w.terrain[idx(w, f.x, f.y)]);
    });
  }

  it("immer gleich je Seed", () => {
    const a = generateWorld(4711);
    const b = generateWorld(4711);
    expect(a.lakes).toEqual(b.lakes);
    expect(a.fish).toEqual(b.fish);
    expect(Array.from(a.terrain)).toEqual(Array.from(b.terrain));
  });

  it("Seefelder: nicht begehbar; Wassertiere leben auch am See", () => {
    const w = generateWorld(42);
    const s = createState(w);
    const l = w.lakes[0]!;
    expect(free(w, s, l.x, l.y)).toBe(false);
    expect(habitatOk(w, "biber", l.x + 1, l.y)).toBe(true);
  });

  it("alter Spielstand mit Figur im See: landet auf einem freien Feld", () => {
    const w = generateWorld(42);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    const l = w.lakes[0]!;
    p.x = l.x + 0.5;
    p.y = l.y + 0.5;
    p.home = { x: l.x, y: l.y };
    p.tent = { x: l.x, y: l.y };
    const store = memory();
    save(store, 42, s, "me");
    expect(store.get(KEY)).toBeTruthy();
    const r = load(store)!;
    const q = r.state.players.me!;
    expect(free(r.world, r.state, Math.floor(q.x), Math.floor(q.y))).toBe(true);
    expect(Math.hypot(q.x - l.x, q.y - l.y)).toBeLessThan(10);
    expect(q.tent).toBeNull();
    expect(r.world.terrain[idx(r.world, q.home.x, q.home.y)]).not.toBe(T.LAKE);
  });
});
