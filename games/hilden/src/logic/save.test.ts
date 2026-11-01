import { describe, expect, it } from "vitest";
import { EMPTY, KEY, addStar, hasBadge, load, save, type KeyValueStore } from "./save.ts";

function store(raw?: string): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  if (raw !== undefined) map.set(KEY, raw);
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

describe("Speicherung (HI-AK-09)", () => {
  it("speichert Haus, Sterne und Entdeckungen und lädt sie wieder", () => {
    const s = store();
    const data = {
      ...EMPTY,
      house: 2 as const,
      stars: { ...EMPTY.stars, post: 3 },
      discovered: ["bahnhof"],
    };
    expect(save(s, data)).toBe(true);
    expect(load(s)).toEqual(data);
  });

  it.each([
    "{x",
    "null",
    '{"version":2}',
    '{"version":1,"house":7}',
    '{"version":1,"stars":{"post":"x"}}',
  ])("kaputte Daten %s → Neustart", (raw) => expect(load(store(raw))).toEqual(EMPTY));

  it("gesperrter Speicher stürzt nicht ab", () => {
    const bad: KeyValueStore = {
      getItem: () => {
        throw new Error("x");
      },
      setItem: () => {
        throw new Error("x");
      },
    };
    expect(load(bad)).toEqual(EMPTY);
    expect(save(bad, EMPTY)).toBe(false);
    expect(load(null)).toEqual(EMPTY);
  });

  it("Sterne zählen, Abzeichen ab 5 (HI-AK-06)", () => {
    let d = EMPTY;
    for (let i = 0; i < 4; i++) d = addStar(d, "fire");
    expect(hasBadge(d, "fire")).toBe(false);
    d = addStar(d, "fire");
    expect(d.stars.fire).toBe(5);
    expect(hasBadge(d, "fire")).toBe(true);
    expect(EMPTY.stars.fire).toBe(0);
  });
});
