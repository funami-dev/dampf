/**
 * Schildkröten-Programm (KI-AK-15): Befehlskarten ⬆ vorwärts, ↻ rechts, ↺ links,
 * 🔁 n× (wiederholt alles bis „⏹ Ende“ bzw. bis zum Schluss) – Schritt für Schritt ausgeführt.
 */
export type Card = "F" | "R" | "L" | "R2" | "R3" | "R4" | "END";
export interface TurtleLevel {
  id: string;
  w: number;
  h: number;
  start: [number, number];
  /** 0 = rechts, 1 = unten, 2 = links, 3 = oben */
  dir: number;
  goal: [number, number];
  ponds: [number, number][];
  min: number;
}
const free = (w: number, h: number, keep: [number, number][]) => {
  const out: [number, number][] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (!keep.some(([a, b]) => a === x && b === y)) out.push([x, y]);
  return out;
};
const stairs: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [2, 1],
  [2, 2],
  [3, 2],
  [3, 3],
  [4, 3],
  [4, 4],
];
export const TURTLE_LEVELS: TurtleLevel[] = [
  { id: "t1", w: 7, h: 1, start: [0, 0], dir: 0, goal: [6, 0], ponds: [], min: 3 },
  {
    id: "t2",
    w: 4,
    h: 4,
    start: [0, 0],
    dir: 0,
    goal: [3, 3],
    ponds: [
      [1, 1],
      [2, 2],
      [1, 2],
      [2, 1],
      [0, 3],
      [0, 2],
      [0, 1],
    ],
    min: 5,
  },
  { id: "t3", w: 5, h: 5, start: [0, 0], dir: 0, goal: [4, 4], ponds: free(5, 5, stairs), min: 5 },
];
const D: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
export interface Step {
  x: number;
  y: number;
  dir: number;
  /** welche Karte gerade läuft */
  card: number;
}
export type RunEnd = "ziel" | "teich" | "rand" | "unterwegs";
/** Programm ausführen; höchstens 200 Schritte */
export function run(l: TurtleLevel, prog: Card[]): { steps: Step[]; end: RunEnd } {
  let x = l.start[0];
  let y = l.start[1];
  let dir = l.dir;
  const steps: Step[] = [];
  let end: RunEnd = "unterwegs";
  const exec = (from: number, to: number): boolean => {
    let i = from;
    while (i < to) {
      const c = prog[i]!;
      if (c === "R2" || c === "R3" || c === "R4") {
        // Schleife bis zum passenden Ende
        let depth = 0;
        let j = i + 1;
        for (; j < to; j++) {
          if (prog[j] === "R2" || prog[j] === "R3" || prog[j] === "R4") depth++;
          if (prog[j] === "END") {
            if (depth === 0) break;
            depth--;
          }
        }
        const times = Number(c.slice(1));
        for (let k = 0; k < times; k++) if (!exec(i + 1, j)) return false;
        i = j + 1;
        continue;
      }
      if (c === "F") {
        x += D[dir]![0];
        y += D[dir]![1];
        if (x < 0 || y < 0 || x >= l.w || y >= l.h) {
          end = "rand";
          steps.push({ x, y, dir, card: i });
          return false;
        }
        if (l.ponds.some(([a, b]) => a === x && b === y)) {
          end = "teich";
          steps.push({ x, y, dir, card: i });
          return false;
        }
      } else if (c === "R") dir = (dir + 1) % 4;
      else if (c === "L") dir = (dir + 3) % 4;
      if (c !== "END") steps.push({ x, y, dir, card: i });
      if (steps.length > 200) return false;
      i++;
    }
    return true;
  };
  exec(0, prog.length);
  if (end === "unterwegs" && x === l.goal[0] && y === l.goal[1]) end = "ziel";
  return { steps, end };
}
export const CARD_LABEL: Record<Card, string> = {
  F: "⬆",
  R: "↻",
  L: "↺",
  R2: "🔁2×",
  R3: "🔁3×",
  R4: "🔁4×",
  END: "⏹",
};
