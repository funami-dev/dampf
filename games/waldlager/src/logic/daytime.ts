/** Tag und Nacht (WL-AK-08): ein Zyklus dauert 10 Minuten. */
export const DAY = 600;
export const PHASES = [
  { name: "morgen", from: 0, to: 30, clockFrom: 6 * 60, clockTo: 7 * 60 },
  { name: "tag", from: 30, to: 360, clockFrom: 7 * 60, clockTo: 19 * 60 },
  { name: "daemmerung", from: 360, to: 420, clockFrom: 19 * 60, clockTo: 21 * 60 },
  { name: "nacht", from: 420, to: 600, clockFrom: 21 * 60, clockTo: 30 * 60 },
] as const;
export type Phase = (typeof PHASES)[number]["name"];

const at = (total: number) => ((total % DAY) + DAY) % DAY;

export function phaseOf(total: number): Phase {
  const t = at(total);
  return PHASES.find((p) => t >= p.from && t < p.to)!.name;
}

/** Uhrzeit „HH:MM“ */
export function clockOf(total: number): string {
  const t = at(total);
  const p = PHASES.find((q) => t >= q.from && t < q.to)!;
  const m = Math.floor(p.clockFrom + ((t - p.from) / (p.to - p.from)) * (p.clockTo - p.clockFrom));
  const mm = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}

export const isNight = (total: number) => phaseOf(total) === "nacht";

/** Dunkelheit 0 (hell) bis 0.78 (Nacht) und Farbton der Dämmerung */
export function darkness(total: number): { dark: number; dusk: number } {
  const t = at(total);
  if (t < 30) return { dark: 0.78 * (1 - t / 30), dusk: 0.4 * (1 - t / 30) };
  if (t < 360) return { dark: 0, dusk: 0 };
  if (t < 420) {
    const k = (t - 360) / 60;
    return { dark: 0.78 * k, dusk: Math.sin(k * Math.PI) };
  }
  return { dark: 0.78, dusk: 0 };
}

/** Start einer neuen Welt: 07:00 */
export const START_TIME = 30;
