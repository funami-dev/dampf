/** Speichern (KI-AK-04): Sterne je Level, Klang, schon gesehene Erklärkarten */
import { LEVELS } from "./hanoi.ts";
import { RIVER_LEVELS } from "./river.ts";
import { WAAGE_LEVELS } from "./waage.ts";
import { MAZE_LEVELS } from "./maze.ts";
import { FLIP_LEVELS } from "./flip.ts";
import { BRIDGE_LEVELS } from "./bridge.ts";
import { JUG_LEVELS } from "./jugs.ts";
import { FROG_LEVELS } from "./frogs.ts";
import { LIGHT_LEVELS } from "./lights.ts";
import { PENGUIN_LEVELS } from "./penguins.ts";
import { UHU_LEVELS } from "./uhu.ts";
import { CARD_LEVELS } from "./karten.ts";
import { CAESAR_LEVELS } from "./caesar.ts";
import { TURTLE_LEVELS } from "./turtle.ts";
import { EULER_LEVELS } from "./euler.ts";
import { BEE_LEVELS } from "./tsp.ts";
import { MST_LEVELS } from "./mst.ts";

export const KEY = "dampf.knobel-insel.v1";
export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
}
export interface Saved {
  v: 1;
  /** Sterne je Level: "h3".."h7" (Pfannkuchen), "f1".."f3" (Fluss), "w1".. (Waage) usw. */
  stars: Record<string, number>;
  /** Erklärkarten schon gezeigt */
  cards: string[];
  volume: number;
  muted: boolean;
}
export const HANOI_IDS = LEVELS.map((n) => `h${n}`);
export const RIVER_IDS = RIVER_LEVELS.map((l) => l.id);
/** Level-Kennungen je Kapitel (der Reihe nach freigeschaltet) */
export const CHAPTER_IDS: string[][] = [
  HANOI_IDS,
  RIVER_IDS,
  WAAGE_LEVELS.map((l) => l.id),
  MAZE_LEVELS.map((l) => l.id),
  FLIP_LEVELS.map((l) => l.id),
  BRIDGE_LEVELS.map((l) => l.id),
  JUG_LEVELS.map((l) => l.id),
  FROG_LEVELS.map((l) => l.id),
  LIGHT_LEVELS.map((l) => l.id),
  PENGUIN_LEVELS.map((l) => l.id),
  UHU_LEVELS.map((l) => l.id),
  CARD_LEVELS.map((l) => l.id),
  CAESAR_LEVELS.map((l) => l.id),
  TURTLE_LEVELS.map((l) => l.id),
  EULER_LEVELS.map((l) => l.id),
  BEE_LEVELS.map((l) => l.id),
  MST_LEVELS.map((l) => l.id),
];
const ALL = CHAPTER_IDS.flat();

export const fresh = (): Saved => ({ v: 1, stars: {}, cards: [], volume: 0.3, muted: false });

/** Level werden je Kapitel der Reihe nach frei */
export function unlocked(s: Saved, id: string): boolean {
  for (const list of CHAPTER_IDS) {
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
