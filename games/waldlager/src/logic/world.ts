import { rng, type Rand } from "./rng.ts";

/** Geländearten (Spec: specs/games/waldlager.md, Welt). */
export const T = {
  GRASS: 0,
  FOREST: 1,
  WATER: 2,
  FORD: 3,
  BRIDGE: 4,
  ROCK: 5,
  SAND: 6,
} as const;
export type Terrain = (typeof T)[keyof typeof T];

export const SIZE = 96;

export interface Tree {
  x: number;
  y: number;
}
export interface Bush {
  x: number;
  y: number;
}

export interface World {
  seed: number;
  size: number;
  terrain: Uint8Array;
  height: Uint8Array;
  /** Index des Baums je Feld (+1), 0 = kein Baum */
  treeAt: Int32Array;
  trees: Tree[];
  bushes: Bush[];
  start: { x: number; y: number };
}

export const idx = (w: { size: number }, x: number, y: number) => y * w.size + x;
export const inside = (w: { size: number }, x: number, y: number) =>
  x >= 0 && y >= 0 && x < w.size && y < w.size;

/** Gelände begehbar (ohne Bäume, Zelte usw.) */
export function terrainWalkable(t: number): boolean {
  return t !== T.WATER && t !== T.ROCK;
}

function valueNoise(rand: Rand, size: number, cell: number) {
  const n = Math.ceil(size / cell) + 2;
  const g = Array.from({ length: n * n }, () => rand());
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / cell;
    const fy = y / cell;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = s(fx - x0);
    const ty = s(fy - y0);
    const v = (i: number, j: number) => g[(j % n) * n + (i % n)]!;
    const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
    const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
}

const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Höhen glätten: Nachbarn unterscheiden sich höchstens um 1 (keine Klippen). */
function smoothHeights(w: World) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < w.size; y++)
      for (let x = 0; x < w.size; x++) {
        const i = idx(w, x, y);
        for (const [dx, dy] of DIRS4) {
          const nx = x + dx;
          const ny = y + dy;
          if (!inside(w, nx, ny)) continue;
          const lim = w.height[idx(w, nx, ny)]! + 1;
          if (w.height[i]! > lim) {
            w.height[i] = lim;
            changed = true;
          }
        }
      }
  }
}

function carveRiver(w: World, rand: Rand) {
  const horizontal = rand() < 0.5;
  const path: [number, number][] = [];
  let a = 12 + Math.floor(rand() * (w.size - 24));
  let drift = 0;
  for (let b = 0; b < w.size; b++) {
    drift = Math.max(-1, Math.min(1, drift + (rand() - 0.5) * 0.6));
    a = Math.max(4, Math.min(w.size - 5, Math.round(a + drift)));
    for (let k = 0; k < 2; k++) {
      const [x, y] = horizontal ? [b, a + k] : [a + k, b];
      const i = idx(w, x, y);
      w.terrain[i] = T.WATER;
      w.height[i] = 0;
    }
    path.push(horizontal ? [b, a] : [a, b]);
  }
  // Furten und Brücken: mindestens zwei je Fluss
  const n = 2 + Math.floor(rand() * 2);
  for (let k = 0; k < n; k++) {
    const b = Math.floor(((k + 0.5) / n) * w.size);
    const [x, y] = path[b]!;
    for (let j = 0; j < 2; j++) {
      const [cx, cy] = horizontal ? [x, y + j] : [x + j, y];
      w.terrain[idx(w, cx, cy)] = k % 2 === 0 ? T.FORD : T.BRIDGE;
    }
  }
}

/** Dijkstra von den erreichten Feldern zu einem unerreichten Feld; Hindernisse auf dem Weg werden entfernt. */
function connect(w: World, reached: Uint8Array, from: number) {
  const cost = (i: number) => {
    const t = w.terrain[i]!;
    if (t === T.WATER || t === T.ROCK) return 8;
    return w.treeAt[i] ? 2 : 1;
  };
  const dist = new Float64Array(w.size * w.size).fill(Infinity);
  const prev = new Int32Array(w.size * w.size).fill(-1);
  dist[from] = 0;
  // einfache Warteschlange nach Kosten (Buckets)
  const buckets: number[][] = [[from]];
  for (let d = 0; d < buckets.length; d++) {
    for (const i of buckets[d] ?? []) {
      if (dist[i] !== d) continue;
      if (reached[i]) {
        for (let j = i; j !== -1; j = prev[j]!) {
          if (w.terrain[j] === T.WATER) w.terrain[j] = T.FORD;
          if (w.terrain[j] === T.ROCK) w.terrain[j] = T.GRASS;
          const ti = w.treeAt[j]!;
          if (ti) removeTree(w, ti - 1);
        }
        return;
      }
      const x = i % w.size;
      const y = Math.floor(i / w.size);
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(w, nx, ny)) continue;
        const j = idx(w, nx, ny);
        const nd = d + cost(j);
        if (nd < dist[j]!) {
          dist[j] = nd;
          prev[j] = i;
          (buckets[nd] ??= []).push(j);
        }
      }
    }
  }
}

function removeTree(w: World, ti: number) {
  const t = w.trees[ti]!;
  w.treeAt[idx(w, t.x, t.y)] = 0;
  t.x = -1;
  t.y = -1;
}

/** Felder ohne Baum, die zu Fuß erreichbar sind (ab Start). */
export function reachable(w: World): Uint8Array {
  const seen = new Uint8Array(w.size * w.size);
  const open = (i: number) => terrainWalkable(w.terrain[i]!) && !w.treeAt[i];
  const s = idx(w, w.start.x, w.start.y);
  const q = [s];
  seen[s] = 1;
  while (q.length) {
    const i = q.pop()!;
    const x = i % w.size;
    const y = Math.floor(i / w.size);
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(w, nx, ny)) continue;
      const j = idx(w, nx, ny);
      if (!seen[j] && open(j)) {
        seen[j] = 1;
        q.push(j);
      }
    }
  }
  return seen;
}

/** Weltgenerator: gleicher Seed → gleiche Welt (WL-AK-01). */
export function generateWorld(seed: number, size = SIZE): World {
  const rand = rng(seed);
  const n = size * size;
  const w: World = {
    seed,
    size,
    terrain: new Uint8Array(n),
    height: new Uint8Array(n),
    treeAt: new Int32Array(n),
    trees: [],
    bushes: [],
    start: { x: size >> 1, y: size >> 1 },
  };
  const hNoise = valueNoise(rand, size, 20);
  const hDetail = valueNoise(rand, size, 7);
  const fNoise = valueNoise(rand, size, 14);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const h = hNoise(x, y) * 0.75 + hDetail(x, y) * 0.25;
      const i = idx(w, x, y);
      w.height[i] = h < 0.5 ? 0 : h < 0.62 ? 1 : h < 0.72 ? 2 : 3;
      w.terrain[i] = fNoise(x, y) > 0.48 ? T.FOREST : T.GRASS;
    }
  // Wenige Berge: 2–3 Felshaufen
  const mountains = 2 + Math.floor(rand() * 2);
  for (let m = 0; m < mountains; m++) {
    const cx = 8 + Math.floor(rand() * (size - 16));
    const cy = 8 + Math.floor(rand() * (size - 16));
    const r = 2.5 + rand() * 2.5;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (!inside(w, x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) {
          const i = idx(w, x, y);
          w.terrain[i] = T.ROCK;
          w.height[i] = 3;
        } else if (d <= r + 2) w.height[idx(w, x, y)] = Math.max(w.height[idx(w, x, y)]!, 2);
      }
  }
  carveRiver(w, rand);
  carveRiver(w, rand);
  smoothHeights(w);
  // Ufer
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = idx(w, x, y);
      if (w.terrain[i] !== T.GRASS && w.terrain[i] !== T.FOREST) continue;
      if (
        DIRS4.some(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          return inside(w, nx, ny) && w.terrain[idx(w, nx, ny)] === T.WATER;
        }) &&
        rand() < 0.6
      )
        w.terrain[i] = T.SAND;
    }
  // Bäume
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = idx(w, x, y);
      const t = w.terrain[i];
      const p = t === T.FOREST ? 0.5 : t === T.GRASS ? 0.04 : 0;
      if (rand() < p) {
        w.trees.push({ x, y });
        w.treeAt[i] = w.trees.length;
      }
    }
  // Start: Lichtung auf Wiese nahe Wasser, nahe der Mitte
  let best = { x: size >> 1, y: size >> 1, score: Infinity };
  for (let y = 10; y < size - 10; y++)
    for (let x = 10; x < size - 10; x++) {
      const i = idx(w, x, y);
      if (w.terrain[i] !== T.GRASS) continue;
      let water = 99;
      for (let dy = -10; dy <= 10; dy++)
        for (let dx = -10; dx <= 10; dx++)
          if (w.terrain[idx(w, x + dx, y + dy)] === T.WATER)
            water = Math.min(water, Math.abs(dx) + Math.abs(dy));
      if (water < 4 || water > 10) continue;
      const score = Math.hypot(x - size / 2, y - size / 2) + water;
      if (score < best.score) best = { x, y, score };
    }
  w.start = { x: best.x, y: best.y };
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      const x = w.start.x + dx;
      const y = w.start.y + dy;
      if (!inside(w, x, y)) continue;
      const i = idx(w, x, y);
      const ti = w.treeAt[i]!;
      if (ti) removeTree(w, ti - 1);
      if (w.terrain[i] === T.ROCK || w.terrain[i] === T.WATER) w.terrain[i] = T.GRASS;
    }
  // Beerensträucher: drei am Start, weitere verstreut
  const bushOk = (x: number, y: number) => {
    if (!inside(w, x, y)) return false;
    const i = idx(w, x, y);
    const t = w.terrain[i]!;
    return (
      (t === T.GRASS || t === T.FOREST) && !w.treeAt[i] && !(x === w.start.x && y === w.start.y)
    );
  };
  for (const [dx, dy] of [
    [2, -1],
    [-2, 2],
    [1, 3],
  ] as const) {
    const x = w.start.x + dx;
    const y = w.start.y + dy;
    if (bushOk(x, y)) w.bushes.push({ x, y });
  }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (Math.hypot(x - w.start.x, y - w.start.y) > 4 && bushOk(x, y) && rand() < 0.012)
        w.bushes.push({ x, y });
  // Erreichbarkeit herstellen
  for (;;) {
    const seen = reachable(w);
    let missing = -1;
    for (let i = 0; i < n; i++)
      if (!seen[i] && terrainWalkable(w.terrain[i]!) && !w.treeAt[i]) {
        missing = i;
        break;
      }
    if (missing < 0) break;
    connect(w, seen, missing);
  }
  w.trees = w.trees.filter((t) => t.x >= 0);
  w.treeAt.fill(0);
  w.trees.forEach((t, k) => (w.treeAt[idx(w, t.x, t.y)] = k + 1));
  return w;
}
