/** Pinguin-Parade (KI-AK-14): nur Nachbarn tauschen; Wettrennen der Sortierverfahren */
export const PENGUIN_LEVELS = [
  { id: "g1", start: [3, 1, 5, 2, 4] },
  { id: "g2", start: [4, 7, 1, 6, 2, 5, 3] },
  { id: "g3", start: [6, 2, 9, 4, 1, 8, 3, 7, 5] },
];
export const swapAt = (s: number[], i: number) => {
  const n = [...s];
  [n[i], n[i + 1]] = [n[i + 1]!, n[i]!];
  return n;
};
export const isSorted = (s: number[]) => s.every((v, i) => i === 0 || s[i - 1]! <= v);
/** Fehlstände = wenigste Nachbar-Tausche */
export function inversions(s: number[]): number {
  let c = 0;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if (s[i]! > s[j]!) c++;
  return c;
}
/** Bubblesort: Bild nach jedem Vergleich */
export function bubbleFrames(s0: number[]): number[][] {
  const s = [...s0];
  const out: number[][] = [];
  for (let end = s.length - 1; end > 0; end--)
    for (let i = 0; i < end; i++) {
      if (s[i]! > s[i + 1]!) [s[i], s[i + 1]] = [s[i + 1]!, s[i]!];
      out.push([...s]);
    }
  return out;
}
/** Mischen (Mergesort von unten): Bild nach jedem Vergleich */
export function mergeFrames(s0: number[]): number[][] {
  let s = [...s0];
  const out: number[][] = [];
  for (let w = 1; w < s.length; w *= 2) {
    for (let lo = 0; lo < s.length; lo += 2 * w) {
      const mid = Math.min(lo + w, s.length);
      const hi = Math.min(lo + 2 * w, s.length);
      const a = s.slice(lo, mid);
      const b = s.slice(mid, hi);
      const merged: number[] = [];
      while (a.length && b.length) {
        merged.push(a[0]! <= b[0]! ? a.shift()! : b.shift()!);
        s = [...s.slice(0, lo), ...merged, ...a, ...b, ...s.slice(hi)];
        out.push([...s]);
      }
      s = [...s.slice(0, lo), ...merged, ...a, ...b, ...s.slice(hi)];
    }
  }
  if (!out.length || out.at(-1)!.join() !== s.join()) out.push([...s]);
  return out;
}
