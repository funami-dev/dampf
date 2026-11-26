/**
 * Orakel-Uhu (KI-AK-15): Zahl raten mit „höher“/„tiefer“. Der Uhu ist ein ehrlicher Gegenspieler:
 * Er legt sich erst fest, wenn nur noch eine Zahl passt (er behält immer die größere Hälfte).
 */
export const UHU_LEVELS = [
  { id: "u1", max: 10 },
  { id: "u2", max: 100 },
  { id: "u3", max: 1000 },
];
/** kleinste Fragezahl, die immer reicht (binäre Suche) */
export const uhuMin = (max: number) => Math.ceil(Math.log2(max + 1));
export type Answer = "höher" | "tiefer" | "richtig";
export function uhuAnswer(
  lo: number,
  hi: number,
  g: number,
): { answer: Answer; lo: number; hi: number } {
  if (g < lo) return { answer: "höher", lo, hi };
  if (g > hi) return { answer: "tiefer", lo, hi };
  if (lo === hi) return { answer: "richtig", lo, hi };
  // die größere Seite behalten
  const above = hi - g;
  const below = g - lo;
  return above >= below ? { answer: "höher", lo: g + 1, hi } : { answer: "tiefer", lo, hi: g - 1 };
}
/** Uhu rät deine Zahl: immer die Mitte */
export const uhuGuess = (lo: number, hi: number) => Math.floor((lo + hi) / 2);
