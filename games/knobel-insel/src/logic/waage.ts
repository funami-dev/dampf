/**
 * Keks-Waage (KI-AK-10): einen schwereren (oder leichteren) Keks mit möglichst wenigen Wiegungen
 * finden. Ein ehrlicher Gegenspieler legt sich erst fest, wenn er muss: Er antwortet immer so, dass
 * möglichst viele Möglichkeiten übrig bleiben, die zu allen bisherigen Wiegungen passen.
 */
export type Outcome = "links" | "gleich" | "rechts"; // welche Seite schwerer ist
/** eine Möglichkeit: Keks k ist schwerer (+1) oder leichter (−1) */
export interface Cand {
  k: number;
  d: 1 | -1;
}
export interface WaageLevel {
  id: string;
  n: number;
  /** auch leichter möglich? */
  both: boolean;
  /** Profi-Zahl: so viele Wiegungen reichen */
  min: number;
}
export const WAAGE_LEVELS: WaageLevel[] = [
  { id: "w1", n: 3, both: false, min: 1 },
  { id: "w2", n: 9, both: false, min: 2 },
  { id: "w3", n: 12, both: true, min: 3 },
];
export const startCands = (l: WaageLevel): Cand[] =>
  Array.from({ length: l.n }, (_, k) => k).flatMap((k) =>
    l.both
      ? [
          { k, d: 1 as const },
          { k, d: -1 as const },
        ]
      : [{ k, d: 1 as const }],
  );

/** Was zeigt die Waage, wenn diese Möglichkeit stimmt? */
export function outcomeFor(c: Cand, left: number[], right: number[]): Outcome {
  if (left.length !== right.length) return left.length > right.length ? "links" : "rechts";
  const l = left.includes(c.k) ? c.d : 0;
  const r = right.includes(c.k) ? c.d : 0;
  return l > r ? "links" : r > l ? "rechts" : "gleich";
}
/** Möglichkeiten nach Ausgang aufteilen */
export function split(cands: Cand[], left: number[], right: number[]) {
  const out: Record<Outcome, Cand[]> = { links: [], gleich: [], rechts: [] };
  for (const c of cands) out[outcomeFor(c, left, right)].push(c);
  return out;
}
/** Ehrlicher Gegenspieler: der Ausgang, der die meisten Möglichkeiten übrig lässt */
export function weigh(cands: Cand[], left: number[], right: number[]) {
  const parts = split(cands, left, right);
  const order: Outcome[] = ["gleich", "links", "rechts"];
  let best: Outcome = "gleich";
  for (const o of order) if (parts[o].length > parts[best].length) best = o;
  return { outcome: best, cands: parts[best] };
}
/** Steht der Keks fest? (alle Möglichkeiten zeigen auf denselben Keks) */
export const found = (cands: Cand[]) =>
  cands.length > 0 && cands.every((c) => c.k === cands[0]!.k) ? cands[0]!.k : null;
export const waageStars = (weighings: number, min: number) =>
  weighings <= min ? 3 : weighings <= min * 1.5 ? 2 : 1;
