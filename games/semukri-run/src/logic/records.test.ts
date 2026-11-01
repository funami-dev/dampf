import { describe, expect, it } from "vitest";
import {
  EMPTY,
  STORAGE_KEY,
  insertRecord,
  load,
  normalizeName,
  qualifies,
  save,
  updateBest,
  type RecordEntry,
  type KeyValueStore,
} from "./records.ts";

const entry = (name: string, time: number, date = "2026-11-01T10:00:00.000Z"): RecordEntry => ({
  name,
  time,
  character: "ukri",
  date,
});

function memory(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("Rekordliste (SR-AK-07)", () => {
  it("sortiert aufsteigend nach Zeit", () => {
    let top: RecordEntry[] = [];
    for (const t of [12, 10, 15, 11]) top = insertRecord(top, entry(`P${t}`, t));
    expect(top.map((e) => e.time)).toEqual([10, 11, 12, 15]);
  });

  it("hält höchstens 10 Einträge", () => {
    let top: RecordEntry[] = [];
    for (let i = 0; i < 15; i++) top = insertRecord(top, entry(`P${i}`, 20 - i));
    expect(top).toHaveLength(10);
    expect(top[0]!.time).toBe(6);
    expect(top[9]!.time).toBe(15);
  });

  it("bei gleicher Zeit steht der ältere Eintrag vorne", () => {
    let top: RecordEntry[] = [];
    top = insertRecord(top, entry("NEU", 10, "2026-11-02T00:00:00.000Z"));
    top = insertRecord(top, entry("ALT", 10, "2026-11-01T00:00:00.000Z"));
    expect(top.map((e) => e.name)).toEqual(["ALT", "NEU"]);
  });

  it("qualifies", () => {
    const full = Array.from({ length: 10 }, (_, i) => entry(`P${i}`, 10 + i));
    expect(qualifies([], 99)).toBe(true);
    expect(qualifies(full.slice(0, 9), 99)).toBe(true);
    expect(qualifies(full, 18.99)).toBe(true);
    expect(qualifies(full, 19)).toBe(false); // gleiche Zeit: der ältere bleibt
    expect(qualifies(full, 25)).toBe(false);
  });
});

describe("Bestzeit (SR-AK-08)", () => {
  it("wird nur bei schnellerer Zeit ersetzt", () => {
    const a = updateBest(null, 12, "ukri", [0, 1]);
    expect(a).toEqual({ time: 12, character: "ukri", ghost: [0, 1] });
    expect(updateBest(a, 13, "billy", [9])).toBe(a);
    expect(updateBest(a, 12, "billy", [9])).toBe(a);
    expect(updateBest(a, 11.5, "billy", [7])).toEqual({
      time: 11.5,
      character: "billy",
      ghost: [7],
    });
  });
});

describe("Speichern (SR-AK-09)", () => {
  it("leerer Speicher → leerer Zustand", () => {
    expect(load(memory())).toEqual(EMPTY);
  });

  it.each([
    ["{kaputt"],
    ["null"],
    ['{"version":99}'],
    ['{"version":1,"top":"x"}'],
    ['{"version":1,"top":[{"name":5}]}'],
  ])("kaputte Daten %s → leerer Zustand", (raw) => {
    expect(load(memory(raw))).toEqual(EMPTY);
  });

  it("speichert und lädt wieder", () => {
    const store = memory();
    const data = {
      ...EMPTY,
      top: [entry("MAT", 11)],
      lastName: "MAT",
      best: { time: 11, character: "ukri", ghost: [0, 100] },
    };
    expect(save(store, data)).toBe(true);
    expect(load(store)).toEqual(data);
  });

  it("nicht verfügbarer Speicher stürzt nicht ab", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    expect(load(broken)).toEqual(EMPTY);
    expect(save(broken, EMPTY)).toBe(false);
    expect(load(null)).toEqual(EMPTY);
    expect(save(null, EMPTY)).toBe(false);
  });
});

describe("Namen (SR-AK-10)", () => {
  it("trimmt und begrenzt auf 10 Zeichen", () => {
    expect(normalizeName("  Matti  ")).toBe("Matti");
    expect(normalizeName("Supersprinter123")).toBe("Supersprin");
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName("")).toBeNull();
  });
});
