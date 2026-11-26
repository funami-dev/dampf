/** Lichter aus (KI-AK-14): Antippen schaltet die Laterne und ihre vier Nachbarn um */
export interface LightLevel {
  id: string;
  n: number;
  /** so entsteht das Startbild aus „alles aus“ */
  presses: [number, number][];
}
export const LIGHT_LEVELS: LightLevel[] = [
  {
    id: "x1",
    n: 3,
    presses: [
      [0, 0],
      [2, 2],
    ],
  },
  {
    id: "x2",
    n: 4,
    presses: [
      [0, 1],
      [2, 2],
      [3, 0],
      [1, 3],
    ],
  },
  {
    id: "x3",
    n: 5,
    presses: [
      [0, 0],
      [1, 2],
      [2, 4],
      [3, 1],
      [4, 3],
      [2, 2],
    ],
  },
];
export type Grid = boolean[][];
export function press(g: Grid, x: number, y: number): Grid {
  const n = g.length;
  const out = g.map((r) => [...r]);
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const a = x + dx;
    const b = y + dy;
    if (a >= 0 && b >= 0 && a < n && b < n) out[b]![a] = !out[b]![a];
  }
  return out;
}
export function lightStart(l: LightLevel): Grid {
  let g: Grid = Array.from({ length: l.n }, () => Array<boolean>(l.n).fill(false));
  for (const [x, y] of l.presses) g = press(g, x, y);
  return g;
}
export const allOff = (g: Grid) => g.every((r) => r.every((v) => !v));
/**
 * Kleinste Menge von Tipps, die alles ausschaltet (Gleichungssystem über 0/1; alle Lösungen aus
 * dem Nullraum durchprobieren). null, wenn unlösbar.
 */
export function lightSolve(g: Grid): [number, number][] | null {
  const n = g.length;
  const N = n * n;
  const rows: number[][] = [];
  for (let i = 0; i < N; i++) {
    const x = i % n;
    const y = Math.floor(i / n);
    const row = Array<number>(N + 1).fill(0);
    for (let j = 0; j < N; j++) {
      const a = j % n;
      const b = Math.floor(j / n);
      if (Math.abs(a - x) + Math.abs(b - y) <= 1) row[j] = 1;
    }
    row[N] = g[y]![x] ? 1 : 0;
    rows.push(row);
  }
  const pivotCol: number[] = [];
  let r = 0;
  for (let c = 0; c < N && r < N; c++) {
    const p = rows.findIndex((row, i) => i >= r && row[c] === 1);
    if (p < 0) continue;
    [rows[r], rows[p]] = [rows[p]!, rows[r]!];
    for (let i = 0; i < N; i++)
      if (i !== r && rows[i]![c] === 1) for (let k = c; k <= N; k++) rows[i]![k]! ^= rows[r]![k]!;
    pivotCol.push(c);
    r++;
  }
  for (let i = r; i < N; i++) if (rows[i]![N] === 1) return null;
  const freeCols = [...Array(N).keys()].filter((c) => !pivotCol.includes(c));
  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << freeCols.length; mask++) {
    const x = Array<number>(N).fill(0);
    freeCols.forEach((c, i) => (x[c] = (mask >> i) & 1));
    pivotCol.forEach((c, i) => {
      let v = rows[i]![N]!;
      for (const f of freeCols) v ^= rows[i]![f]! & x[f]!;
      x[c] = v;
    });
    if (!best || x.reduce((a, b) => a + b, 0) < best.reduce((a, b) => a + b, 0)) best = x;
  }
  return best!.flatMap((v, i) => (v ? [[i % n, Math.floor(i / n)] as [number, number]] : []));
}
