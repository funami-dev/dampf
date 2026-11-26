/** Wasserkrüge (KI-AK-14): füllen, ausgießen, umschütten; Breitensuche und Zustandsgraph */
export interface JugLevel {
  id: string;
  caps: number[];
  start: number[];
  /** am Teich füllen und ausgießen erlaubt? */
  pond: boolean;
  /** Ziel: irgendein Krug mit genau `target` – oder (`twice`) zwei Krüge damit */
  target: number;
  twice: boolean;
}
export const JUG_LEVELS: JugLevel[] = [
  { id: "j1", caps: [3, 5], start: [0, 0], pond: true, target: 4, twice: false },
  { id: "j2", caps: [4, 9], start: [0, 0], pond: true, target: 6, twice: false },
  { id: "j3", caps: [3, 5, 8], start: [0, 0, 8], pond: false, target: 4, twice: true },
];
export type JugAction =
  { kind: "fill" | "empty"; i: number } | { kind: "pour"; i: number; j: number };
export function apply(l: JugLevel, s: number[], a: JugAction): number[] | null {
  const n = [...s];
  if (a.kind === "pour") {
    if (a.i === a.j) return null;
    const amount = Math.min(s[a.i]!, l.caps[a.j]! - s[a.j]!);
    if (amount <= 0) return null;
    n[a.i] = s[a.i]! - amount;
    n[a.j] = s[a.j]! + amount;
  } else if (a.kind === "fill") {
    if (!l.pond || s[a.i] === l.caps[a.i]) return null;
    n[a.i] = l.caps[a.i]!;
  } else {
    if (!l.pond || s[a.i] === 0) return null;
    n[a.i] = 0;
  }
  return n;
}
export const jugGoal = (l: JugLevel, s: number[]) =>
  s.filter((x) => x === l.target).length >= (l.twice ? 2 : 1);
export function actions(l: JugLevel): JugAction[] {
  const out: JugAction[] = [];
  l.caps.forEach((_, i) => {
    if (l.pond) out.push({ kind: "fill", i }, { kind: "empty", i });
    l.caps.forEach((__, j) => {
      if (i !== j) out.push({ kind: "pour", i, j });
    });
  });
  return out;
}
export const jugKey = (s: number[]) => s.join("-");
/** Breitensuche ab s: Abstände, Vorgänger und Kanten */
export function jugSearch(l: JugLevel, from: number[] = l.start) {
  const dist = new Map<string, number>([[jugKey(from), 0]]);
  const prev = new Map<string, { key: string; a: JugAction } | null>([[jugKey(from), null]]);
  const states = new Map<string, number[]>([[jugKey(from), from]]);
  const edges: [string, string][] = [];
  const q = [from];
  while (q.length) {
    const s = q.shift()!;
    for (const a of actions(l)) {
      const n = apply(l, s, a);
      if (!n) continue;
      const k = jugKey(n);
      if (jugKey(s) < k) edges.push([jugKey(s), k]);
      if (dist.has(k)) continue;
      dist.set(k, dist.get(jugKey(s))! + 1);
      prev.set(k, { key: jugKey(s), a });
      states.set(k, n);
      q.push(n);
    }
  }
  return { dist, prev, states, edges };
}
/** kürzester Weg (Folge von Aktionen) ab s; null, wenn unlösbar */
export function jugShortest(l: JugLevel, from: number[] = l.start): JugAction[] | null {
  const { dist, prev, states } = jugSearch(l, from);
  let goal: string | null = null;
  for (const [k, s] of states)
    if (jugGoal(l, s) && (!goal || dist.get(k)! < dist.get(goal)!)) goal = k;
  if (!goal) return null;
  const out: JugAction[] = [];
  let k: string | undefined = goal;
  while (k && prev.get(k)) {
    const p: { key: string; a: JugAction } = prev.get(k)!;
    out.unshift(p.a);
    k = p.key;
  }
  return out;
}
