/** Murmelbahn-Netz (KI-AK-16): alle Dörfer mit möglichst wenig Holz verbinden (Kruskal) */
import type { Pt2 } from "./tsp.ts";

export interface MstLevel {
  id: string;
  villages: Pt2[];
  /** mögliche Bahnstücke: [a, b, Holz] */
  edges: [number, number, number][];
}
const V = (x: number, y: number): Pt2 => ({ x, y });
/** Kanten zu den k nächsten Nachbarn, Holz = gerundete Entfernung / 10 */
function near(vs: Pt2[], k: number): [number, number, number][] {
  const out = new Map<string, [number, number, number]>();
  vs.forEach((a, i) => {
    vs.map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, k)
      .forEach(({ j, d }) => {
        const [x, y] = i < j ? [i, j] : [j, i];
        out.set(`${x}-${y}`, [x, y, Math.max(1, Math.round(d / 10))]);
      });
  });
  return [...out.values()];
}
const lv = (id: string, vs: Pt2[]): MstLevel => ({ id, villages: vs, edges: near(vs, 3) });
export const MST_LEVELS: MstLevel[] = [
  lv("m1", [V(15, 20), V(50, 12), V(85, 25), V(30, 75), V(75, 80)]),
  lv("m2", [V(10, 15), V(40, 10), V(75, 15), V(92, 50), V(65, 85), V(30, 88), V(45, 50)]),
  lv("m3", [
    V(8, 10),
    V(35, 15),
    V(62, 8),
    V(90, 20),
    V(80, 55),
    V(92, 90),
    V(55, 85),
    V(20, 80),
    V(45, 48),
  ]),
];
/** sind alle Dörfer über die gebauten Stücke verbunden? */
export function connected(n: number, built: [number, number, number][]): boolean {
  const seen = new Set([0]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [a, b] of built)
      if (seen.has(a) !== seen.has(b)) {
        seen.add(a);
        seen.add(b);
        grew = true;
      }
  }
  return seen.size === n;
}
export const cost = (es: [number, number, number][]) => es.reduce((s, e) => s + e[2], 0);
export interface KruskalStep {
  edge: number;
  take: boolean;
}
/** Kruskal: Stücke nach Holz sortiert; nimm eins, wenn es keinen Kreis schließt */
export function kruskal(l: MstLevel): { steps: KruskalStep[]; total: number; picked: number[] } {
  const parent = l.villages.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  const order = l.edges.map((_, i) => i).sort((a, b) => l.edges[a]![2] - l.edges[b]![2] || a - b);
  const steps: KruskalStep[] = [];
  const picked: number[] = [];
  for (const i of order) {
    const [a, b] = l.edges[i]!;
    const ra = find(a);
    const rb = find(b);
    const take = ra !== rb;
    if (take) {
      parent[ra] = rb;
      picked.push(i);
    }
    // alle Stücke durchgehen, damit man auch die abgelehnten (Kreis!) sieht
    steps.push({ edge: i, take });
  }
  return { steps, total: cost(picked.map((i) => l.edges[i]!)), picked };
}
