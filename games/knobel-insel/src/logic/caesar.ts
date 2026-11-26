/** Geheimschrift der Eule (KI-AK-15): Cäsar-Verschiebung und Buchstaben-Häufigkeit */
export const CAESAR_LEVELS = [
  { id: "c1", plain: "HALLO FREUND", key: 3, shown: true, word: "" },
  { id: "c2", plain: "DIE EULE GRUESST DICH", key: 5, shown: false, word: "EULE" },
  {
    id: "c3",
    plain: "WIR TREFFEN UNS HEUTE AM SEE BEI DER ALTEN EICHE",
    key: 8,
    shown: false,
    word: "",
  },
];
const A = "A".charCodeAt(0);
export function shift(text: string, k: number): string {
  return text
    .toUpperCase()
    .replace(/[A-Z]/g, (c) =>
      String.fromCharCode(((((c.charCodeAt(0) - A + k) % 26) + 26) % 26) + A),
    );
}
export const encode = (t: string, k: number) => shift(t, k);
export const decode = (t: string, k: number) => shift(t, -k);
/** Häufigkeit jedes Buchstabens */
export function counts(t: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of t.toUpperCase()) if (c >= "A" && c <= "Z") out[c] = (out[c] ?? 0) + 1;
  return out;
}
/** wahrscheinlichster Schlüssel: der häufigste Buchstabe war wohl ein E */
export function guessKey(cipher: string): number {
  const c = counts(cipher);
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "E";
  return (((top.charCodeAt(0) - "E".charCodeAt(0)) % 26) + 26) % 26;
}
/** wenigste Drehungen der Scheibe von 0 bis k */
export const turnsFor = (k: number) => Math.min(k, 26 - k);
