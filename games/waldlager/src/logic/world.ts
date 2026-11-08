import { rng, type Rand } from "./rng.ts";

/** Geländearten (Spec: specs/games/waldlager.md, Welt: eine Insel). */
export const T = {
  GRASS: 0,
  FOREST: 1,
  WATER: 2,
  FORD: 3,
  BRIDGE: 4,
  ROCK: 5,
  SAND: 6,
  SEA: 7,
  WRECK: 8,
} as const;
export type Terrain = (typeof T)[keyof typeof T];

export const SIZE = 512;
/** Meer-Rand an jeder Seite (WL-AK-01) */
export const SEA_MARGIN = 12;

export interface Tree {
  x: number;
  y: number;
}
export interface Bush {
  x: number;
  y: number;
}
/** Flugzeugwrack: Mittelpunkt und belegte Felder */
export interface Plane {
  x: number;
  y: number;
  cells: [number, number][];
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
  /** Mitte der Insel: Ersatz-Zuhause */
  start: { x: number; y: number };
  plane: Plane;
  rivers: number;
}

export const idx = (w: { size: number }, x: number, y: number) => y * w.size + x;
export const inside = (w: { size: number }, x: number, y: number) =>
  x >= 0 && y >= 0 && x < w.size && y < w.size;

/** Gelände begehbar (ohne Bäume, Zelte usw.) */
export function terrainWalkable(t: number): boolean {
  return t !== T.WATER && t !== T.ROCK && t !== T.SEA && t !== T.WRECK;
}
export const isLand = (t: number) => t !== T.SEA;

function valueNoise(rand: Rand, size: number, cell: number) {
  const n = Math.ceil(size / cell) + 2;
  const g = new Float32Array(n * n);
  for (let i = 0; i < g.length; i++) g[i] = rand();
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

/** Höhen glätten: Nachbarn unterscheiden sich höchstens um 1 (keine Klippen). Zwei Durchläufe je Richtung genügen. */
function smoothHeights(w: World) {
  const { size, height } = w;
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let lim = 255;
        if (x > 0) lim = Math.min(lim, height[i - 1]! + 1);
        if (y > 0) lim = Math.min(lim, height[i - size]! + 1);
        if (height[i]! > lim) {
          height[i] = lim;
          changed = true;
        }
      }
    for (let y = size - 1; y >= 0; y--)
      for (let x = size - 1; x >= 0; x--) {
        const i = y * size + x;
        let lim = 255;
        if (x < size - 1) lim = Math.min(lim, height[i + 1]! + 1);
        if (y < size - 1) lim = Math.min(lim, height[i + size]! + 1);
        if (height[i]! > lim) {
          height[i] = lim;
          changed = true;
        }
      }
  }
}

/** Nur die größte Landmasse bleibt, kleine Inselchen werden Meer. */
function keepMainland(w: World) {
  const n = w.size * w.size;
  const comp = new Int32Array(n).fill(-1);
  let best = -1;
  let bestSize = 0;
  let id = 0;
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    if (comp[i] !== -1 || !isLand(w.terrain[i]!)) continue;
    let count = 0;
    comp[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      count++;
      const x = j % w.size;
      const y = (j / w.size) | 0;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(w, nx, ny)) continue;
        const k = ny * w.size + nx;
        if (comp[k] === -1 && isLand(w.terrain[k]!)) {
          comp[k] = id;
          stack.push(k);
        }
      }
    }
    if (count > bestSize) {
      bestSize = count;
      best = id;
    }
    id++;
  }
  for (let i = 0; i < n; i++)
    if (isLand(w.terrain[i]!) && comp[i] !== best) {
      w.terrain[i] = T.SEA;
      w.height[i] = 0;
    }
}

/** Fluss vom Inland zur Küste (2 Felder breit), mit Furten und Brücken */
function carveRiver(w: World, rand: Rand, cx: number, cy: number): boolean {
  // Richtung zur nächsten Küste: grob nach außen
  let ang = Math.atan2(cy - w.size / 2, cx - w.size / 2) + (rand() - 0.5) * 0.8;
  let x = cx;
  let y = cy;
  const path: [number, number][] = [];
  for (let step = 0; step < w.size; step++) {
    ang += (rand() - 0.5) * 0.35;
    x += Math.cos(ang);
    y += Math.sin(ang);
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (!inside(w, ix + 1, iy + 1) || !inside(w, ix, iy)) break;
    if (w.terrain[idx(w, ix, iy)] === T.SEA) {
      if (path.length < 25) return false;
      break;
    }
    path.push([ix, iy]);
  }
  if (path.length < 25) return false;
  for (const [px, py] of path)
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const i = idx(w, px + dx, py + dy);
      if (w.terrain[i] === T.SEA) continue;
      w.terrain[i] = T.WATER;
      w.height[i] = 0;
    }
  const crossings = Math.max(2, Math.floor(path.length / 45));
  for (let k = 0; k < crossings; k++) {
    const [px, py] = path[Math.floor(((k + 0.5) / crossings) * path.length)]!;
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 0],
      [0, -1],
      [2, 0],
      [0, 2],
    ] as const) {
      const i = idx(w, px + dx, py + dy);
      if (w.terrain[i] === T.WATER) w.terrain[i] = k % 2 === 0 ? T.FORD : T.BRIDGE;
    }
  }
  return true;
}

function removeTree(w: World, ti: number) {
  const t = w.trees[ti]!;
  w.treeAt[idx(w, t.x, t.y)] = 0;
  t.x = -1;
  t.y = -1;
}

const open = (w: World, i: number) => terrainWalkable(w.terrain[i]!) && !w.treeAt[i];

/** Felder ohne Baum, die zu Fuß erreichbar sind (ab Inselmitte). */
export function reachable(w: World): Uint8Array {
  const seen = new Uint8Array(w.size * w.size);
  const s = idx(w, w.start.x, w.start.y);
  const q = [s];
  seen[s] = 1;
  while (q.length) {
    const i = q.pop()!;
    const x = i % w.size;
    const y = (i / w.size) | 0;
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(w, nx, ny)) continue;
      const j = ny * w.size + nx;
      if (!seen[j] && open(w, j)) {
        seen[j] = 1;
        q.push(j);
      }
    }
  }
  return seen;
}

/**
 * Erreichbarkeit herstellen: ein Dijkstra von allen erreichten Feldern aus; zu jedem
 * unerreichten freien Feld wird der günstigste Weg freigeräumt (Bäume weg, Wasser → Furt, Fels → Wiese).
 */
function connectAll(w: World) {
  const n = w.size * w.size;
  const reached = reachable(w);
  const cost = (i: number) => {
    const t = w.terrain[i]!;
    if (t === T.SEA || t === T.WRECK) return -1;
    if (t === T.WATER || t === T.ROCK) return 8;
    return w.treeAt[i] ? 2 : 1;
  };
  const dist = new Int32Array(n).fill(0x7fffffff);
  const prev = new Int32Array(n).fill(-1);
  const buckets: number[][] = [[]];
  for (let i = 0; i < n; i++)
    if (reached[i]) {
      dist[i] = 0;
      buckets[0]!.push(i);
    }
  for (let d = 0; d < buckets.length; d++) {
    const b = buckets[d];
    if (!b) continue;
    for (const i of b) {
      if (dist[i] !== d) continue;
      const x = i % w.size;
      const y = (i / w.size) | 0;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(w, nx, ny)) continue;
        const j = ny * w.size + nx;
        const c = cost(j);
        if (c < 0) continue;
        const nd = d + c;
        if (nd < dist[j]!) {
          dist[j] = nd;
          prev[j] = i;
          (buckets[nd] ??= []).push(j);
        }
      }
    }
  }
  const done = reached;
  for (let i = 0; i < n; i++) {
    if (done[i] || !open(w, i) || prev[i] === -1) continue;
    for (let j = i; j !== -1 && !done[j]; j = prev[j]!) {
      done[j] = 1;
      if (w.terrain[j] === T.WATER) w.terrain[j] = T.FORD;
      if (w.terrain[j] === T.ROCK) w.terrain[j] = T.GRASS;
      const ti = w.treeAt[j]!;
      if (ti) removeTree(w, ti - 1);
    }
  }
}

/** Flugzeugwrack auf ebenem Land, 5 × 3 Felder, Umgebung frei */
function placePlane(w: World, rand: Rand): Plane {
  const fits = (x: number, y: number) => {
    const h = w.height[idx(w, x, y)];
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        if (!inside(w, x + dx, y + dy)) return false;
        const i = idx(w, x + dx, y + dy);
        const t = w.terrain[i]!;
        if (t !== T.GRASS && t !== T.FOREST && t !== T.SAND) return false;
        if (w.height[i] !== h) return false;
      }
    return true;
  };
  let px = w.start.x;
  let py = w.start.y;
  for (let tries = 0; tries < 4000; tries++) {
    const x = SEA_MARGIN + 8 + Math.floor(rand() * (w.size - 2 * SEA_MARGIN - 16));
    const y = SEA_MARGIN + 8 + Math.floor(rand() * (w.size - 2 * SEA_MARGIN - 16));
    if (fits(x, y)) {
      px = x;
      py = y;
      break;
    }
  }
  const cells: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      cells.push([px + dx, py + dy]);
    }
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const i = idx(w, px + dx, py + dy);
      if (w.terrain[i] === T.ROCK || w.terrain[i] === T.WATER) w.terrain[i] = T.GRASS;
      const ti = w.treeAt[i]!;
      if (ti) removeTree(w, ti - 1);
    }
  for (const [x, y] of cells) w.terrain[idx(w, x, y)] = T.WRECK;
  return { x: px, y: py, cells };
}

/** Weltgenerator: gleicher Seed → gleiche Insel (WL-AK-01). */
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
    plane: { x: 0, y: 0, cells: [] },
    rivers: 0,
  };
  const coast = valueNoise(rand, size, size / 6);
  const coastFine = valueNoise(rand, size, size / 20);
  const hNoise = valueNoise(rand, size, 20);
  const hDetail = valueNoise(rand, size, 7);
  const fNoise = valueNoise(rand, size, 14);
  const c = size / 2;
  const inner = c - SEA_MARGIN;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Insel: Abstand zur Mitte, verbeult durch Rauschen → Buchten und Landzungen
      const d = Math.hypot(x - c, y - c) / inner;
      const shape = d + (coast(x, y) - 0.5) * 0.55 + (coastFine(x, y) - 0.5) * 0.2;
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (shape > 0.86 || edge < SEA_MARGIN) {
        w.terrain[i] = T.SEA;
        w.height[i] = 0;
        continue;
      }
      const h = hNoise(x, y) * 0.75 + hDetail(x, y) * 0.25;
      const inland = Math.max(0, Math.min(1, (0.86 - shape) * 4)); // Küste flach
      const hh = h * inland;
      w.height[i] = hh < 0.42 ? 0 : hh < 0.55 ? 1 : hh < 0.65 ? 2 : 3;
      w.terrain[i] = fNoise(x, y) > 0.48 ? T.FOREST : T.GRASS;
    }
  keepMainland(w);
  // Inselmitte (Ersatz-Zuhause): nächstes Landfeld zur Kartenmitte
  for (let r = 0; r < size / 2; r++) {
    let found = false;
    for (let dy = -r; dy <= r && !found; dy++)
      for (let dx = -r; dx <= r && !found; dx++) {
        const t = w.terrain[idx(w, c + dx, c + dy)]!;
        if (t === T.GRASS || t === T.FOREST) {
          w.start = { x: c + dx, y: c + dy };
          found = true;
        }
      }
    if (found) break;
  }
  // Berge: einige Felshaufen
  const mountains = 4 + Math.floor(rand() * 3);
  for (let m = 0; m < mountains; m++) {
    const cx = SEA_MARGIN + 20 + Math.floor(rand() * (size - 2 * SEA_MARGIN - 40));
    const cy = SEA_MARGIN + 20 + Math.floor(rand() * (size - 2 * SEA_MARGIN - 40));
    if (w.terrain[idx(w, cx, cy)] === T.SEA) continue;
    const r = 3 + rand() * 5;
    for (let y = Math.floor(cy - r - 3); y <= cy + r + 3; y++)
      for (let x = Math.floor(cx - r - 3); x <= cx + r + 3; x++) {
        if (!inside(w, x, y)) continue;
        const i = idx(w, x, y);
        if (w.terrain[i] === T.SEA) continue;
        const dd = Math.hypot(x - cx, y - cy);
        if (dd <= r) {
          w.terrain[i] = T.ROCK;
          w.height[i] = 3;
        } else if (dd <= r + 3) w.height[i] = Math.max(w.height[i]!, 2);
      }
  }
  // Flüsse: 3–5, vom Inland zur Küste
  const want = 3 + Math.floor(rand() * 3);
  for (let tries = 0; tries < 60 && w.rivers < want; tries++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * inner * 0.35;
    const sx = Math.round(c + Math.cos(a) * r);
    const sy = Math.round(c + Math.sin(a) * r);
    if (w.terrain[idx(w, sx, sy)] === T.SEA) continue;
    if (carveRiver(w, rand, sx, sy)) w.rivers++;
  }
  smoothHeights(w);
  // Strand: Land neben dem Meer wird Sand und flach
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const t = w.terrain[i]!;
      if (t !== T.GRASS && t !== T.FOREST) continue;
      let sea = false;
      for (let dy = -2; dy <= 2 && !sea; dy++)
        for (let dx = -2; dx <= 2 && !sea; dx++)
          if (inside(w, x + dx, y + dy) && w.terrain[idx(w, x + dx, y + dy)] === T.SEA) sea = true;
      if (sea) {
        w.terrain[i] = T.SAND;
        w.height[i] = 0;
      } else if (
        DIRS4.some(([dx, dy]) => w.terrain[idx(w, x + dx, y + dy)] === T.WATER) &&
        rand() < 0.5
      )
        w.terrain[i] = T.SAND;
    }
  smoothHeights(w);
  // Bäume
  for (let i = 0; i < n; i++) {
    const t = w.terrain[i];
    const p = t === T.FOREST ? 0.5 : t === T.GRASS ? 0.04 : 0;
    if (p && rand() < p) {
      w.trees.push({ x: i % size, y: (i / size) | 0 });
      w.treeAt[i] = w.trees.length;
    }
  }
  // Inselmitte frei
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const i = idx(w, w.start.x + dx, w.start.y + dy);
      const ti = w.treeAt[i]!;
      if (ti) removeTree(w, ti - 1);
      if (!terrainWalkable(w.terrain[i]!)) w.terrain[i] = T.GRASS;
    }
  w.plane = placePlane(w, rand);
  // Beerensträucher verstreut
  for (let i = 0; i < n; i++) {
    const t = w.terrain[i];
    if ((t === T.GRASS || t === T.FOREST) && !w.treeAt[i] && rand() < 0.014)
      w.bushes.push({ x: i % size, y: (i / size) | 0 });
  }
  connectAll(w);
  w.trees = w.trees.filter((t) => t.x >= 0);
  w.treeAt.fill(0);
  w.trees.forEach((t, k) => (w.treeAt[idx(w, t.x, t.y)] = k + 1));
  return w;
}
