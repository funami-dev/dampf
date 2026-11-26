/**
 * Brücke bei Nacht (KI-AK-13): höchstens zwei gehen gleichzeitig, nur mit der Laterne, im Tempo
 * des Langsameren. Kürzeste Gesamtzeit per Dijkstra.
 */
export interface Walker {
  id: string;
  kind: string;
  name: string;
  min: number;
}
export interface BridgeLevel {
  id: string;
  walkers: Walker[];
}
const w = (kind: string, name: string, min: number): Walker => ({ id: kind, kind, name, min });
export const BRIDGE_LEVELS: BridgeLevel[] = [
  {
    id: "b1",
    walkers: [w("hase", "Hase", 1), w("igel", "Igel", 2), w("kroete", "Schildkröte", 5)],
  },
  {
    id: "b2",
    walkers: [
      w("hase", "Hase", 1),
      w("igel", "Igel", 2),
      w("kroete", "Schildkröte", 5),
      w("schnecke", "Schnecke", 10),
    ],
  },
  {
    id: "b3",
    walkers: [
      w("hase", "Hase", 1),
      w("igel", "Igel", 3),
      w("eule", "Eule", 6),
      w("kroete", "Schildkröte", 8),
      w("schnecke", "Schnecke", 12),
    ],
  },
];
/** Stand: Seite je Tier (0 = Start) und Seite der Laterne */
export interface BState {
  side: Record<string, 0 | 1>;
  lamp: 0 | 1;
}
export const bStart = (l: BridgeLevel): BState => ({
  side: Object.fromEntries(l.walkers.map((x) => [x.id, 0 as const])),
  lamp: 0,
});
export const bGoal = (l: BridgeLevel, s: BState) => l.walkers.every((x) => s.side[x.id] === 1);
/** Gruppe prüfen; Grund, wenn es nicht geht */
export function bCheck(l: BridgeLevel, s: BState, ids: string[]): string | null {
  if (!ids.length) return "Wer soll gehen? Tippe ein oder zwei Tiere an.";
  if (ids.length > 2) return "Die Brücke trägt höchstens zwei!";
  if (ids.some((id) => s.side[id] !== s.lamp)) return "Ohne Laterne ist es zu dunkel!";
  return null;
}
export const bCost = (l: BridgeLevel, ids: string[]) =>
  Math.max(...ids.map((id) => l.walkers.find((x) => x.id === id)!.min));
export function bMove(l: BridgeLevel, s: BState, ids: string[]): BState | null {
  if (bCheck(l, s, ids)) return null;
  const to = (1 - s.lamp) as 0 | 1;
  const n: BState = { side: { ...s.side }, lamp: to };
  for (const id of ids) n.side[id] = to;
  return n;
}
const bKey = (l: BridgeLevel, s: BState) => l.walkers.map((x) => s.side[x.id]).join("") + s.lamp;
function groupsOf(l: BridgeLevel, s: BState): string[][] {
  const here = l.walkers.filter((x) => s.side[x.id] === s.lamp).map((x) => x.id);
  const out: string[][] = here.map((a) => [a]);
  for (let i = 0; i < here.length; i++)
    for (let j = i + 1; j < here.length; j++) out.push([here[i]!, here[j]!]);
  return out;
}
/** kürzeste Gesamtzeit und erster Schritt dahin (Dijkstra) */
export function bBest(
  l: BridgeLevel,
  from: BState = bStart(l),
): { min: number; first: string[] | null } {
  const dist = new Map<string, number>([[bKey(l, from), 0]]);
  const first = new Map<string, string[] | null>([[bKey(l, from), null]]);
  const open: { s: BState; d: number }[] = [{ s: from, d: 0 }];
  while (open.length) {
    open.sort((a, b) => a.d - b.d);
    const { s, d } = open.shift()!;
    if (d > (dist.get(bKey(l, s)) ?? Infinity)) continue;
    if (bGoal(l, s)) return { min: d, first: first.get(bKey(l, s)) ?? null };
    for (const g of groupsOf(l, s)) {
      const n = bMove(l, s, g)!;
      const nd = d + bCost(l, g);
      const k = bKey(l, n);
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd);
        first.set(k, first.get(bKey(l, s)) ?? g);
        open.push({ s: n, d: nd });
      }
    }
  }
  return { min: Infinity, first: null };
}
export const bStars = (t: number, min: number) => (t <= min ? 3 : t <= min * 1.5 ? 2 : 1);
