import type { JobId } from "./jobs.ts";
import { BADGE_STARS } from "./jobs.ts";

export const KEY = "dampf.hilden.v1";

export interface SaveData {
  version: 1;
  house: 1 | 2 | 3 | null;
  stars: Record<JobId, number>;
  discovered: string[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const EMPTY: SaveData = Object.freeze({
  version: 1,
  house: null,
  stars: Object.freeze({ post: 0, baker: 0, police: 0, fire: 0 }),
  discovered: Object.freeze([]) as unknown as string[],
}) as SaveData;

const isCount = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0;

export function load(store: KeyValueStore | null): SaveData {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return EMPTY;
    const d = JSON.parse(raw) as Partial<SaveData> | null;
    if (!d || d.version !== 1) return EMPTY;
    if (d.house !== null && d.house !== undefined && ![1, 2, 3].includes(d.house)) return EMPTY;
    const stars = { ...EMPTY.stars, ...(d.stars ?? {}) };
    if (!Object.values(stars).every(isCount)) return EMPTY;
    const discovered = Array.isArray(d.discovered)
      ? d.discovered.filter((x) => typeof x === "string")
      : [];
    return { version: 1, house: d.house ?? null, stars, discovered };
  } catch {
    return EMPTY;
  }
}

export function save(store: KeyValueStore | null, data: SaveData): boolean {
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export const addStar = (d: SaveData, job: JobId): SaveData => ({
  ...d,
  stars: { ...d.stars, [job]: d.stars[job] + 1 },
});
export const hasBadge = (d: SaveData, job: JobId) => d.stars[job] >= BADGE_STARS;

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
