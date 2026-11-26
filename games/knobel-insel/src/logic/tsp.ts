/** Bienen-Lieferdienst (KI-AK-16): kürzeste Rundreise durch Durchprobieren */
export interface Pt2 {
  x: number;
  y: number;
}
export interface BeeLevel {
  id: string;
  hive: Pt2;
  flowers: Pt2[];
}
export const BEE_LEVELS: BeeLevel[] = [
  {
    id: "n1",
    hive: { x: 50, y: 85 },
    flowers: [
      { x: 20, y: 30 },
      { x: 80, y: 25 },
      { x: 15, y: 70 },
      { x: 85, y: 70 },
    ],
  },
  {
    id: "n2",
    hive: { x: 50, y: 50 },
    flowers: [
      { x: 15, y: 15 },
      { x: 50, y: 10 },
      { x: 88, y: 18 },
      { x: 90, y: 80 },
      { x: 45, y: 90 },
      { x: 10, y: 75 },
    ],
  },
  {
    id: "n3",
    hive: { x: 50, y: 92 },
    flowers: [
      { x: 10, y: 20 },
      { x: 30, y: 60 },
      { x: 52, y: 15 },
      { x: 70, y: 55 },
      { x: 90, y: 12 },
      { x: 92, y: 80 },
      { x: 8, y: 85 },
      { x: 60, y: 35 },
    ],
  },
];
export const dist = (a: Pt2, b: Pt2) => Math.hypot(a.x - b.x, a.y - b.y);
/** Länge der Rundreise Stock → Blumen (Reihenfolge) → Stock */
export function tourLength(l: BeeLevel, order: number[]): number {
  let len = 0;
  let p = l.hive;
  for (const i of order) {
    len += dist(p, l.flowers[i]!);
    p = l.flowers[i]!;
  }
  return len + dist(p, l.hive);
}
/** beste Reihenfolge (alle Reihenfolgen durchprobieren), optional mit festem Anfang */
export function bestTour(l: BeeLevel, prefix: number[] = []): { order: number[]; len: number } {
  const rest = l.flowers.map((_, i) => i).filter((i) => !prefix.includes(i));
  let best = { order: [...prefix, ...rest], len: Infinity };
  const perm = (cur: number[], left: number[]) => {
    if (!left.length) {
      const len = tourLength(l, cur);
      if (len < best.len - 1e-9) best = { order: [...cur], len };
      return;
    }
    for (let k = 0; k < left.length; k++)
      perm(
        [...cur, left[k]!],
        left.filter((_, j) => j !== k),
      );
  };
  perm([...prefix], rest);
  return best;
}
/** gierig: immer zur nächsten noch nicht besuchten Blume */
export function greedyTour(l: BeeLevel): { order: number[]; len: number } {
  const order: number[] = [];
  let p = l.hive;
  while (order.length < l.flowers.length) {
    let bi = -1;
    for (let i = 0; i < l.flowers.length; i++)
      if (!order.includes(i) && (bi < 0 || dist(p, l.flowers[i]!) < dist(p, l.flowers[bi]!)))
        bi = i;
    order.push(bi);
    p = l.flowers[bi]!;
  }
  return { order, len: tourLength(l, order) };
}
