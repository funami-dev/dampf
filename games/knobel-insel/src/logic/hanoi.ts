/**
 * Pfannkuchen-Turm (Türme von Hanoi, Spec: KI-AK-01/02). Reines TypeScript, mit Vitest geprüft.
 * Teller 0 = links, 1 = Mitte, 2 = rechts. Jeder Teller ist eine Liste von unten nach oben;
 * Pfannkuchen 1 ist der kleinste, n der größte.
 */
export type Pegs = number[][];
export const PEG_NAMES = ["links", "in der Mitte", "rechts"] as const;
export const LEVELS = [3, 4, 5, 6, 7];

export const newTower = (n: number): Pegs => [Array.from({ length: n }, (_, i) => n - i), [], []];
export const top = (p: Pegs, i: number) => p[i]![p[i]!.length - 1];
export const clonePegs = (p: Pegs): Pegs => p.map((s) => [...s]);

/** Darf der oberste Pfannkuchen von `from` auf `to`? */
export function canMove(p: Pegs, from: number, to: number): boolean {
  if (from === to || from < 0 || from > 2 || to < 0 || to > 2) return false;
  const a = top(p, from);
  if (a === undefined) return false;
  const b = top(p, to);
  return b === undefined || a < b;
}
/** Zug ausführen; false, wenn er nicht erlaubt ist (dann ändert sich nichts) */
export function move(p: Pegs, from: number, to: number): boolean {
  if (!canMove(p, from, to)) return false;
  p[to]!.push(p[from]!.pop()!);
  return true;
}
export const solved = (p: Pegs, n: number) =>
  p[2]!.length === n && p[2]!.every((d, i) => d === n - i);
export const minMoves = (n: number) => 2 ** n - 1;

/** Sterne: 3 bei der Profi-Zahl, 2 bis zum Anderthalbfachen, sonst 1 */
export function starsFor(moves: number, n: number): 1 | 2 | 3 {
  const m = minMoves(n);
  return moves <= m ? 3 : moves <= m * 1.5 ? 2 : 1;
}

/** Eine Aufgabe der Zeitlupe: „Bewege den Turm aus n Pfannkuchen von … nach …“ */
export interface Task {
  n: number;
  from: number;
  to: number;
}
export interface Frame {
  from: number;
  to: number;
  disc: number;
  /** die gerade offenen Aufgaben, außen zuerst (Schachteln) */
  stack: Task[];
}

/** Beste Lösung als rekursive Zugfolge mit den offenen Aufgaben je Zug */
export function solve(n: number, from = 0, to = 2): Frame[] {
  const out: Frame[] = [];
  const stack: Task[] = [];
  const rec = (k: number, a: number, b: number) => {
    if (k === 0) return;
    const via = 3 - a - b;
    stack.push({ n: k, from: a, to: b });
    rec(k - 1, a, via);
    out.push({ from: a, to: b, disc: k, stack: stack.map((t) => ({ ...t })) });
    rec(k - 1, via, b);
    stack.pop();
  };
  rec(n, from, to);
  return out;
}

export const taskText = (t: Task) =>
  t.n === 1
    ? `Bewege Pfannkuchen 1 nach ${PEG_NAMES[t.to]}`
    : `Bewege den Turm aus ${t.n} nach ${PEG_NAMES[t.to]}`;

const pegOf = (p: Pegs, d: number) => p.findIndex((s) => s.includes(d));

/** Helfer-Modus: welcher Pfannkuchen ist dran? (der größte, der noch nicht rechts liegt) */
export function helperDisc(p: Pegs, n: number): number {
  let k = n;
  // rechts unten liegen schon n, n-1, … richtig
  for (let i = 0; i < p[2]!.length && p[2]![i] === n - i; i++) k = n - i - 1;
  return k;
}

/**
 * Helfer-Modus (KI-AK-02): Züge der Maus, die den Turm über dem Pfannkuchen `k` auf den freien
 * Teller trägt. Leere Liste, wenn schon alles bereit ist; null, wenn die kleinen Pfannkuchen
 * durcheinander liegen.
 */
export function helperPlan(p: Pegs, n: number): [number, number][] | null {
  const k = helperDisc(p, n);
  if (k <= 1) return [];
  const s = pegOf(p, k);
  const spare = 3 - s - 2;
  if (s === 2) return null;
  // alle kleineren müssen als ein Turm auf einem Teller liegen
  const t = pegOf(p, k - 1);
  const tower = p[t]!.filter((d) => d < k);
  const idx = p[t]!.indexOf(k - 1);
  const above = p[t]!.slice(idx);
  if (tower.length !== k - 1 || above.length !== k - 1) return null;
  if (!above.every((d, i) => d === k - 1 - i)) return null;
  if (t === spare) return [];
  return solve(k - 1, t, spare).map((f) => [f.from, f.to]);
}
