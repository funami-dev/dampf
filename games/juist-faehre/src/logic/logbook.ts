import type { Direction } from "./trip.ts";

export const KEY = "dampf.juist-faehre.v1";

export interface Logbook {
  version: 1;
  trips: number;
  best: Record<string, Partial<Record<Direction, number>>>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const EMPTY: Logbook = Object.freeze({
  version: 1,
  trips: 0,
  best: Object.freeze({}),
}) as Logbook;

export function record(d: Logbook, shipId: string, dir: Direction, stars: number): Logbook {
  const prev = d.best[shipId] ?? {};
  return {
    ...d,
    trips: d.trips + 1,
    best: { ...d.best, [shipId]: { ...prev, [dir]: Math.max(prev[dir] ?? 0, stars) } },
  };
}

const validStars = (v: unknown) =>
  v === undefined || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 3);

export function load(store: KeyValueStore | null): Logbook {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return EMPTY;
    const d = JSON.parse(raw) as Logbook | null;
    if (
      !d ||
      d.version !== 1 ||
      !Number.isInteger(d.trips) ||
      d.trips < 0 ||
      typeof d.best !== "object" ||
      !d.best
    )
      return EMPTY;
    for (const v of Object.values(d.best)) {
      if (
        typeof v !== "object" ||
        !v ||
        !validStars(v["to-juist"]) ||
        !validStars(v["to-norddeich"])
      )
        return EMPTY;
    }
    return { version: 1, trips: d.trips, best: d.best };
  } catch {
    return EMPTY;
  }
}

export function save(store: KeyValueStore | null, d: Logbook): boolean {
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function browserStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    s.setItem(`${KEY}.probe`, "1");
    s.removeItem(`${KEY}.probe`);
    return s;
  } catch {
    return null;
  }
}
