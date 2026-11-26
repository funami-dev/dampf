/** Speichern (KI-AK-04): Sterne je Level, Klang, schon gesehene Erklärkarten */
import { LEVELS } from "./hanoi.ts";
import { RIVER_LEVELS } from "./river.ts";

export const KEY = "dampf.knobel-insel.v1";
export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
}
export interface Saved {
  v: 1;
  /** Sterne je Level: "h3".."h7" (Pfannkuchen), "f1".."f3" (Fluss) */
  stars: Record<string, number>;
  /** Erklärkarten schon gezeigt */
  cards: string[];
  volume: number;
  muted: boolean;
}
export const HANOI_IDS = LEVELS.map((n) => `h${n}`);
export const RIVER_IDS = RIVER_LEVELS.map((l) => l.id);
const ALL = [...HANOI_IDS, ...RIVER_IDS];

export const fresh = (): Saved => ({ v: 1, stars: {}, cards: [], volume: 0.3, muted: false });

/** Level werden je Kapitel der Reihe nach frei */
export function unlocked(s: Saved, id: string): boolean {
  for (const list of [HANOI_IDS, RIVER_IDS]) {
    const i = list.indexOf(id);
    if (i === 0) return true;
    if (i > 0) return (s.stars[list[i - 1]!] ?? 0) > 0;
  }
  return false;
}
/** beste Sterne merken */
export function record(s: Saved, id: string, stars: number) {
  s.stars[id] = Math.max(s.stars[id] ?? 0, stars);
}

export function save(store: Store, s: Saved) {
  try {
    store.set(KEY, JSON.stringify(s));
  } catch {
    /* Speicher gesperrt */
  }
}
const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
export function load(store: Store): Saved {
  try {
    const d = JSON.parse(store.get(KEY) ?? "null") as Partial<Saved> | null;
    if (!d || d.v !== 1) return fresh();
    const stars: Record<string, number> = {};
    for (const [k, v] of Object.entries(d.stars ?? {}))
      if (ALL.includes(k) && num(v) && v >= 1 && v <= 3) stars[k] = Math.round(v);
    return {
      v: 1,
      stars,
      cards: Array.isArray(d.cards) ? d.cards.filter((c) => typeof c === "string") : [],
      volume: num(d.volume) ? Math.max(0, Math.min(1, d.volume)) : 0.3,
      muted: d.muted === true,
    };
  } catch {
    return fresh();
  }
}
