/** Zaubertrick mit Karten (KI-AK-15): Binärzahlen */
export const CARD_LEVELS = [
  { id: "k1", cards: 3, target: 5 },
  { id: "k2", cards: 4, target: 11 },
  { id: "k3", cards: 5, target: 22 },
];
/** Zahlen auf Karte i (alle Zahlen bis 2^k − 1, bei denen Bit i gesetzt ist) */
export const cardNumbers = (k: number, i: number) =>
  Array.from({ length: 2 ** k - 1 }, (_, n) => n + 1).filter((n) => (n >> i) & 1);
/** Summe der ersten Zahlen der Karten mit „Ja“ */
export const trickSum = (yes: boolean[]) => yes.reduce((s, y, i) => s + (y ? 2 ** i : 0), 0);
export const bitsOf = (n: number, k: number) =>
  Array.from({ length: k }, (_, i) => ((n >> i) & 1) === 1);
export const valueOf = (bits: boolean[]) => trickSum(bits);
export const popcount = (n: number) =>
  n
    .toString(2)
    .split("")
    .filter((c) => c === "1").length;
