/**
 * Pfannkuchen wenden (KI-AK-12): Stapel (unten → oben, Größen 1..n) nur durch Umdrehen des oberen
 * Teils sortieren. Ziel: groß unten, klein oben.
 */
export interface FlipLevel {
  id: string;
  start: number[];
}
export const FLIP_LEVELS: FlipLevel[] = [
  { id: "p1", start: [2, 4, 1, 3] },
  { id: "p2", start: [4, 6, 1, 5, 3, 2] },
  { id: "p3", start: [3, 8, 1, 6, 2, 7, 4, 5] },
];
/** den Pfannkuchen an Stelle i (von unten) und alles darüber umdrehen */
export const flip = (s: number[], i: number) => [...s.slice(0, i), ...s.slice(i).reverse()];
export const sorted = (s: number[]) => s.every((d, i) => d === s.length - i);
/** kleinste Zahl von Wendungen (Breitensuche) */
export function minFlips(start: number[]): number {
  const k = (s: number[]) => s.join(",");
  const seen = new Set([k(start)]);
  let layer = [start];
  for (let d = 0; layer.length; d++) {
    const next: number[][] = [];
    for (const s of layer) {
      if (sorted(s)) return d;
      for (let i = 0; i < s.length - 1; i++) {
        const t = flip(s, i);
        if (!seen.has(k(t))) {
          seen.add(k(t));
          next.push(t);
        }
      }
    }
    layer = next;
  }
  return -1;
}
/** Tipp-Regel: größten falsch liegenden nach oben holen, dann an seinen Platz wenden */
export function hintFlip(s: number[]): number | null {
  if (sorted(s)) return null;
  const n = s.length;
  let i = 0;
  while (s[i] === n - i) i++; // unten liegen schon richtig
  const want = n - i; // dieser gehört an Stelle i
  const at = s.indexOf(want);
  return at === n - 1 ? i : at;
}
export const flipStars = (f: number, min: number) => (f <= min ? 3 : f <= min * 1.5 ? 2 : 1);
