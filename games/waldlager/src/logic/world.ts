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

export const SIZE = 256;
/** Meer-Rand an jeder Seite (WL-AK-01) */
export const SEA_MARGIN = 12;

export interface Tree {
  x: number;
  y: number;
  /** Apfelbaum (WL-AK-40) */
  apple?: boolean;
  /** in der Absturz-Schneise umgeknickt und angekohlt (WL-AK-46) */
  fallen?: boolean;
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

/** Trümmerteil der Absturzspur */
export interface Debris {
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
  /** Mitte der Insel: Ersatz-Zuhause */
  start: { x: number; y: number };
  plane: Plane;
  rivers: number;
  debris: Debris[];
  /** die verlassene Hütte (WL-AK-39) */
  hut: { x: number; y: number };
  /** angesengte Felder der Absturz-Schneise (WL-AK-46) */
  scorch: number[];
}

/** Hütte und Apfelbäume (WL-AK-39/40) */
export const HUT = { minStart: 40, minPlane: 15, see: 4 };
export const APPLE_SHARE = 0.1;
/** Absturz-Schneise (WL-AK-46) */
export const SWATH = { min: 30, max: 40, halfWidth: 1.5 };

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
  return true;
}

function removeTree(w: World, ti: number) {
  const t = w.trees[ti]!;
  w.treeAt[idx(w, t.x, t.y)] = 0;
  t.x = -1;
  t.y = -1;
}

const open = (w: World, i: number) => terrainWalkable(w.terrain[i]!) && !w.treeAt[i];

/**
 * Felder ohne Baum, die zu Fuß erreichbar sind (ab Inselmitte).
 * Mit `bridged` zählen Flussfelder als überbrückbar (man kann dort Brücken bauen).
 */
export function reachable(w: World, bridged = false): Uint8Array {
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
      if (!seen[j] && (open(w, j) || (bridged && w.terrain[j] === T.WATER))) {
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
  const reached = reachable(w, true);
  const cost = (i: number) => {
    const t = w.terrain[i]!;
    if (t === T.SEA || t === T.WRECK) return -1;
    if (t === T.WATER) return 1; // Fluss: dort kann man Brücken bauen
    if (t === T.ROCK) return 8;
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
    if (done[i] || !(open(w, i) || w.terrain[i] === T.WATER) || prev[i] === -1) continue;
    for (let j = i; j !== -1 && !done[j]; j = prev[j]!) {
      done[j] = 1;
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

/** Trümmerspur: 15–25 Teile, 10–90 Felder vom Wrack, nahe am Wrack dichter (WL-AK-29) */
export const DEBRIS = { min: 15, max: 25, near: 10, far: 90 };
function placeDebris(w: World, rand: Rand): Debris[] {
  const n = DEBRIS.min + Math.floor(rand() * (DEBRIS.max - DEBRIS.min + 1));
  const dir = rand() * Math.PI * 2;
  const out: Debris[] = [];
  const used = new Set<number>();
  // nicht auf Beerensträucher: dort würde „Beeren pflücken“ das Ansehen verdecken
  const bush = new Set(w.bushes.map((b) => idx(w, b.x, b.y)));
  const ok = (x: number, y: number) => {
    if (!inside(w, x, y)) return false;
    const i = idx(w, x, y);
    const t = w.terrain[i]!;
    return (
      (t === T.GRASS || t === T.FOREST || t === T.SAND) &&
      !w.treeAt[i] &&
      !bush.has(i) &&
      !used.has(i)
    );
  };
  // Erst entlang der Spur; liegt sie z. B. über dem Meer, mit immer breiterem Fächer weitersuchen
  for (let k = 0; k < n * 200 && out.length < n; k++) {
    const f = Math.pow(rand(), 1.6); // mehr Teile nahe am Wrack
    const d = DEBRIS.near + f * (DEBRIS.far - DEBRIS.near);
    const spread = Math.min(Math.PI * 2, 0.7 + Math.floor(k / (n * 8)) * 0.6);
    const a = dir + (rand() - 0.5) * spread;
    const x = Math.round(w.plane.x + Math.cos(a) * d);
    const y = Math.round(w.plane.y + Math.sin(a) * d);
    // nächstes passendes Feld in der Nähe suchen
    let placed = false;
    for (let r = 0; r <= 3 && !placed; r++)
      for (let dy = -r; dy <= r && !placed; dy++)
        for (let dx = -r; dx <= r && !placed; dx++) {
          const px = x + dx;
          const py = y + dy;
          const dd = Math.hypot(px - w.plane.x, py - w.plane.y);
          if (dd < DEBRIS.near || dd > DEBRIS.far || !ok(px, py)) continue;
          used.add(idx(w, px, py));
          out.push({ x: px, y: py });
          placed = true;
        }
  }
  return out;
}

const DIRECTIONS = [
  "Osten",
  "Nordosten",
  "Norden",
  "Nordwesten",
  "Westen",
  "Südwesten",
  "Süden",
  "Südosten",
];

/** Hinweis eines Trümmerteils: Himmelsrichtung (Norden = oben am Bildschirm) und Entfernung */
export function debrisHint(
  w: World,
  x: number,
  y: number,
): { dir: string; dist: string; text: string } {
  const dx = w.plane.x - x;
  const dy = w.plane.y - y;
  // isometrisch: Bildschirm-rechts = (dx − dy), Bildschirm-unten = (dx + dy) / 2
  const sx = dx - dy;
  const sy = (dx + dy) / 2;
  const ang = (Math.atan2(-sy, sx) * 180) / Math.PI;
  const dir = DIRECTIONS[((Math.round(ang / 45) % 8) + 8) % 8]!;
  const d = Math.hypot(dx, dy);
  const dist = d < 20 ? "ganz nah" : d < 50 ? "nicht mehr weit" : "noch weit weg";
  return { dir, dist, text: `Ein Stück Flugzeug! Die Spur führt nach ${dir} – ${dist}.` };
}

/** Weltgenerator: gleicher Seed → gleiche Insel (WL-AK-01). */
/** Richtung, aus der das Flugzeug kam: Mittel der Trümmerspur (WL-AK-46) */
export function swathDir(w: World): number {
  let dx = 0;
  let dy = 0;
  for (const d of w.debris) {
    const l = Math.hypot(d.x - w.plane.x, d.y - w.plane.y) || 1;
    dx += (d.x - w.plane.x) / l;
    dy += (d.y - w.plane.y) / l;
  }
  return Math.atan2(dy, dx);
}

/** Absturz-Schneise: angesengter Boden, umgeknickte Bäume, nichts wird entfernt (WL-AK-46) */
function placeSwath(w: World, rand: Rand) {
  const len = SWATH.min + Math.floor(rand() * (SWATH.max - SWATH.min + 1));
  const a = swathDir(w);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const out = new Set<number>();
  const r = Math.ceil(len + 2);
  for (let y = w.plane.y - r; y <= w.plane.y + r; y++)
    for (let x = w.plane.x - r; x <= w.plane.x + r; x++) {
      if (!inside(w, x, y)) continue;
      const rx = x - w.plane.x;
      const ry = y - w.plane.y;
      const along = rx * ux + ry * uy;
      const across = Math.abs(-rx * uy + ry * ux);
      // vorne schmaler, am Wrack breiter (ungleichmäßiger Rand)
      const half = SWATH.halfWidth + (1 - along / len) * 0.8 + (rand() - 0.5) * 0.6;
      if (along < 0 || along > len || across > half) continue;
      const i = idx(w, x, y);
      const t = w.terrain[i];
      if (t !== T.GRASS && t !== T.FOREST && t !== T.SAND) continue;
      out.add(i);
      const ti = w.treeAt[i]!;
      if (ti) {
        const tree = w.trees[ti - 1]!;
        tree.fallen = true;
        tree.apple = false;
      }
    }
  w.scorch = [...out].sort((p, q) => p - q);
}

/** Genau eine Hütte: frei, weit weg von Start und Flugzeug, erreichbar (WL-AK-39) */
function placeHut(w: World, rand: Rand): { x: number; y: number } {
  const size = w.size;
  const minStart = Math.min(HUT.minStart, Math.floor(size * 0.16));
  const reach = reachable(w, true);
  const bush = new Set(w.bushes.map((b) => idx(w, b.x, b.y)));
  const debris = new Set(w.debris.map((d) => idx(w, d.x, d.y)));
  const plane = new Set(w.plane.cells.map(([x, y]) => idx(w, x, y)));
  const ok = (x: number, y: number, planeDist: number) => {
    if (!inside(w, x, y)) return false;
    const i = idx(w, x, y);
    const t = w.terrain[i];
    if ((t !== T.GRASS && t !== T.FOREST) || w.treeAt[i] || bush.has(i) || debris.has(i))
      return false;
    if (plane.has(i) || Math.hypot(x - w.start.x, y - w.start.y) < minStart) return false;
    if (Math.hypot(x - w.plane.x, y - w.plane.y) < planeDist) return false;
    // mindestens ein Nachbar erreichbar und frei, damit man an die Kiste kommt
    return DIRS4.some(([dx, dy]) => {
      const j = idx(w, x + dx, y + dy);
      return inside(w, x + dx, y + dy) && reach[j] === 1 && !w.treeAt[j] && open(w, j);
    });
  };
  for (let k = 0; k < 20_000; k++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    if (ok(x, y, HUT.minPlane)) return { x, y };
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (ok(x, y, 0)) return { x, y };
  return { x: w.start.x + 1, y: w.start.y };
}

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
    debris: [],
    hut: { x: -1, y: -1 },
    scorch: [],
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
  const mountains = 2 + Math.floor(rand() * 3);
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
  w.debris = placeDebris(w, rand);
  // eigener Zufall, damit Inseln und Trümmer gleich bleiben wie vor der Hütte
  const extra = rng(seed ^ 0x48757474);
  w.hut = placeHut(w, extra);
  w.trees = w.trees.filter((t) => t.x >= 0);
  for (const t of w.trees) if (extra() < APPLE_SHARE) t.apple = true;
  w.treeAt.fill(0);
  w.trees.forEach((t, k) => (w.treeAt[idx(w, t.x, t.y)] = k + 1));
  // ganz zum Schluss und mit eigenem Zufall: alles andere bleibt, wie es war
  placeSwath(w, rng(seed ^ 0x53636831));
  return w;
}
