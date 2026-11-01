/**
 * Bestzeit und Rekordliste, gespeichert im Browser (SR-AK-07 bis SR-AK-10).
 * Speicherzugriffe sind abgesichert: kaputte Daten oder gesperrter Speicher führen nie zum Absturz.
 */

export const STORAGE_KEY = "dampf.semukri-run.v1";
export const MAX_RECORDS = 10;
export const MAX_NAME_LENGTH = 10;

export interface RecordEntry {
  name: string;
  time: number;
  character: string;
  /** ISO-Zeitpunkt */
  date: string;
}

export interface Best {
  time: number;
  character: string;
  ghost: number[];
}

export interface SaveData {
  version: 1;
  best: Best | null;
  top: RecordEntry[];
  lastName: string;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const EMPTY: SaveData = Object.freeze({
  version: 1,
  best: null,
  top: [],
  lastName: "",
}) as SaveData;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";

function isEntry(v: unknown): v is RecordEntry {
  const e = v as RecordEntry;
  return !!e && isStr(e.name) && isNum(e.time) && isStr(e.character) && isStr(e.date);
}

function isBest(v: unknown): v is Best {
  const b = v as Best;
  return (
    !!b && isNum(b.time) && isStr(b.character) && Array.isArray(b.ghost) && b.ghost.every(isNum)
  );
}

export function load(store: KeyValueStore | null): SaveData {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const d = JSON.parse(raw) as Partial<SaveData> | null;
    if (!d || d.version !== 1 || !Array.isArray(d.top) || !d.top.every(isEntry))
      return { ...EMPTY };
    if (d.best !== null && !isBest(d.best)) return { ...EMPTY };
    return {
      version: 1,
      best: d.best ?? null,
      top: d.top.slice(0, MAX_RECORDS),
      lastName: isStr(d.lastName) ? d.lastName : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Gibt false zurück, wenn nicht gespeichert werden konnte. */
export function save(store: KeyValueStore | null, data: SaveData): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

const byTimeThenDate = (a: RecordEntry, b: RecordEntry) =>
  a.time - b.time || a.date.localeCompare(b.date);

export function insertRecord(top: readonly RecordEntry[], entry: RecordEntry): RecordEntry[] {
  return [...top, entry].sort(byTimeThenDate).slice(0, MAX_RECORDS);
}

/** Schafft es diese Zeit in die Top 10? Bei Gleichstand bleibt der ältere Eintrag. */
export function qualifies(top: readonly RecordEntry[], time: number): boolean {
  return top.length < MAX_RECORDS || time < top.at(-1)!.time;
}

export function updateBest(
  best: Best | null,
  time: number,
  character: string,
  ghost: number[],
): Best | null {
  if (best && best.time <= time) return best;
  return { time, character, ghost };
}

export function normalizeName(name: string): string | null {
  const n = name.trim().slice(0, MAX_NAME_LENGTH);
  return n.length > 0 ? n : null;
}

/** localStorage, falls nutzbar (im privaten Modus mancher Browser wirft schon der Zugriff). */
export function browserStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = `${STORAGE_KEY}.probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
