import { describe, expect, it } from "vitest";
import { EMPTY, KEY, load, record, save, type KeyValueStore } from "./logbook.ts";

const mem = (raw?: string): KeyValueStore => {
  const m = new Map<string, string>();
  if (raw !== undefined) m.set(KEY, raw);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe("Logbuch (JF-AK-10)", () => {
  it("speichert beste Sterne je Schiff und Richtung und zählt Fahrten", () => {
    let d = record(EMPTY, "frisia-i", "to-juist", 2);
    d = record(d, "frisia-i", "to-juist", 1);
    d = record(d, "frisia-i", "to-norddeich", 3);
    expect(d.best["frisia-i"]).toEqual({ "to-juist": 2, "to-norddeich": 3 });
    expect(d.trips).toBe(3);
    d = record(d, "frisia-i", "to-juist", 3);
    expect(d.best["frisia-i"]!["to-juist"]).toBe(3);
  });

  it("speichert und lädt", () => {
    const s = mem();
    const d = record(EMPTY, "frisia-e1", "to-juist", 3);
    expect(save(s, d)).toBe(true);
    expect(load(s)).toEqual(d);
  });

  it.each([
    "{",
    "null",
    '{"version":2}',
    '{"version":1,"trips":-1,"best":{}}',
    '{"version":1,"trips":1,"best":{"x":{"to-juist":9}}}',
  ])("kaputte Daten %s → leer", (raw) => expect(load(mem(raw))).toEqual(EMPTY));

  it("gesperrter Speicher stürzt nicht ab", () => {
    const bad: KeyValueStore = {
      getItem: () => {
        throw new Error();
      },
      setItem: () => {
        throw new Error();
      },
    };
    expect(load(bad)).toEqual(EMPTY);
    expect(save(bad, EMPTY)).toBe(false);
  });
});
