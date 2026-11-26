/**
 * Käse-Labyrinth (KI-AK-11): Labyrinth aus Hecken, Breitensuche mit Abständen, gemalte Wege.
 * Felder mit ungeraden Koordinaten sind Gänge; true = Hecke.
 */
export interface MazeLevel {
  id: string;
  size: number;
  /** zusätzliche Öffnungen für mehrere Wege */
  loops: number;
  seed: number;
}
export const MAZE_LEVELS: MazeLevel[] = [
  { id: "l1", size: 7, loops: 0, seed: 3 },
  { id: "l2", size: 11, loops: 3, seed: 11 },
  { id: "l3", size: 15, loops: 8, seed: 27 },
];
export interface Maze {
  size: number;
  wall: boolean[][];
  start: [number, number];
  goal: [number, number];
}
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function makeMaze(l: MazeLevel): Maze {
  const n = l.size;
  const r = rng(l.seed);
  const wall = Array.from({ length: n }, () => Array.from({ length: n }, () => true));
  const stack: [number, number][] = [[1, 1]];
  wall[1]![1] = false;
  while (stack.length) {
    const [x, y] = stack.at(-1)!;
    const dirs = (
      [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ] as const
    ).filter(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx > 0 && ny > 0 && nx < n - 1 && ny < n - 1 && wall[ny]![nx];
    });
    if (!dirs.length) {
      stack.pop();
      continue;
    }
    const [dx, dy] = dirs[Math.floor(r() * dirs.length)]!;
    wall[y + dy / 2]![x + dx / 2] = false;
    wall[y + dy]![x + dx] = false;
    stack.push([x + dx, y + dy]);
  }
  // ein paar zusätzliche Durchgänge → mehrere Wege
  let opened = 0;
  for (let tries = 0; opened < l.loops && tries < 500; tries++) {
    const x = 1 + Math.floor(r() * (n - 2));
    const y = 1 + Math.floor(r() * (n - 2));
    if (!wall[y]![x] || (x % 2 === 1 && y % 2 === 1)) continue;
    const horiz = x % 2 === 0 && y % 2 === 1 && !wall[y]![x - 1] && !wall[y]![x + 1];
    const vert = y % 2 === 0 && x % 2 === 1 && !wall[y - 1]![x] && !wall[y + 1]![x];
    if (horiz || vert) {
      wall[y]![x] = false;
      opened++;
    }
  }
  return { size: n, wall, start: [1, 1], goal: [n - 2, n - 2] };
}
export const free = (m: Maze, x: number, y: number) =>
  x >= 0 && y >= 0 && x < m.size && y < m.size && !m.wall[y]![x];
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
/** Breitensuche: Abstand jedes Feldes vom Start (−1 = unerreichbar) */
export function distances(m: Maze, from = m.start): number[][] {
  const d = Array.from({ length: m.size }, () => Array.from({ length: m.size }, () => -1));
  d[from[1]]![from[0]] = 0;
  const q: [number, number][] = [from];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (free(m, nx, ny) && d[ny]![nx] === -1) {
        d[ny]![nx] = d[y]![x]! + 1;
        q.push([nx, ny]);
      }
    }
  }
  return d;
}
/** kürzester Weg (Felder vom Start zum Ziel) */
export function shortestPath(m: Maze): [number, number][] {
  const d = distances(m);
  let [x, y] = m.goal;
  if (d[y]![x]! < 0) return [];
  const path: [number, number][] = [[x, y]];
  while (d[y]![x] !== 0) {
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (free(m, nx, ny) && d[ny]![nx] === d[y]![x]! - 1) {
        x = nx;
        y = ny;
        break;
      }
    }
    path.unshift([x, y]);
  }
  return path;
}
/** gemalten Weg um ein Feld verlängern (oder zurücknehmen); gibt den neuen Weg */
export function extend(m: Maze, path: [number, number][], x: number, y: number) {
  const last = path.at(-1)!;
  const prev = path.at(-2);
  if (prev && prev[0] === x && prev[1] === y) return path.slice(0, -1);
  if (Math.abs(last[0] - x) + Math.abs(last[1] - y) !== 1 || !free(m, x, y)) return path;
  if (path.some(([a, b]) => a === x && b === y)) return path;
  return [...path, [x, y] as [number, number]];
}
