/** Frosch-Hüpfen (KI-AK-14): grüne nach rechts, braune nach links, nur vorwärts */
export type Pad = "G" | "B" | ".";
export const FROG_LEVELS = [1, 2, 3, 4].map((n, i) => ({ id: `q${i + 1}`, n }));
export const frogStart = (n: number): Pad[] => [
  ...Array<Pad>(n).fill("G"),
  ".",
  ...Array<Pad>(n).fill("B"),
];
export const frogGoal = (s: Pad[]) => {
  const n = (s.length - 1) / 2;
  return s.join("") === "B".repeat(n) + "." + "G".repeat(n);
};
export const frogMin = (n: number) => n * n + 2 * n;
/** Wohin hüpft der Frosch auf Feld i? (−1 = gar nicht) */
export function frogTarget(s: Pad[], i: number): number {
  const f = s[i];
  if (f !== "G" && f !== "B") return -1;
  const d = f === "G" ? 1 : -1;
  if (s[i + d] === ".") return i + d;
  if ((s[i + d] === "G" || s[i + d] === "B") && s[i + 2 * d] === ".") return i + 2 * d;
  return -1;
}
export function frogMove(s: Pad[], i: number): Pad[] | null {
  const t = frogTarget(s, i);
  if (t < 0) return null;
  const n = [...s];
  n[t] = n[i]!;
  n[i] = ".";
  return n;
}
export const frogStuck = (s: Pad[]) => !frogGoal(s) && s.every((_, i) => frogTarget(s, i) < 0);
/** kürzeste Zugzahl (Breitensuche) und erster guter Zug */
export function frogBest(s: Pad[]): { min: number; first: number | null } {
  const k = (x: Pad[]) => x.join("");
  const seen = new Map<string, number | null>([[k(s), null]]);
  let layer = [s];
  for (let d = 0; layer.length; d++) {
    const next: Pad[][] = [];
    for (const x of layer) {
      if (frogGoal(x)) return { min: d, first: seen.get(k(x)) ?? null };
      for (let i = 0; i < x.length; i++) {
        const n = frogMove(x, i);
        if (n && !seen.has(k(n))) {
          seen.set(k(n), seen.get(k(x)) ?? i);
          next.push(n);
        }
      }
    }
    layer = next;
  }
  return { min: -1, first: null };
}
