import { describe, expect, it } from "vitest";
import { AIRCRAFT, AIRLINES, SYMBOLS } from "./catalog.ts";

describe("Katalog (PP-AK-01, PP-AK-02)", () => {
  it("hat genau die 4 Flugzeugtypen", () => {
    expect(AIRCRAFT.map((a) => a.name)).toEqual(["A320", "A321", "A340", "A380"]);
  });

  it("hat genau die 7 Airlines", () => {
    expect(AIRLINES.map((a) => a.name)).toEqual([
      "Lufthansa",
      "Emirates",
      "Eurowings",
      "Condor",
      "British Airways",
      "La Compagnie",
      "US Airways",
    ]);
  });

  it("Flugzeuge: plausible Maße, 2 oder 4 Triebwerke, A380 doppelstöckig", () => {
    for (const a of AIRCRAFT) {
      expect(a.length).toBeGreaterThan(30);
      expect(a.span).toBeGreaterThan(30);
      expect([2, 4]).toContain(a.engines);
    }
    const by = Object.fromEntries(AIRCRAFT.map((a) => [a.id, a]));
    expect(by.a321!.length).toBeGreaterThan(by.a320!.length);
    expect(by.a340!.engines).toBe(4);
    expect(by.a380!.engines).toBe(4);
    expect(by.a380!.decks).toBe(2);
    expect(by.a320!.decks).toBe(1);
  });

  it("jede Airline hat Name, gültige Farben und ein eigenes Symbol, keine Bilddateien", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const a of AIRLINES) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(SYMBOLS).toContain(a.symbol);
      for (const c of [a.tail, a.accent, a.text, a.belly]) expect(c).toMatch(hex);
      expect(JSON.stringify(a)).not.toMatch(/\.(png|jpe?g|svg|gif|webp)|url\(|https?:/i);
    }
  });

  it("IDs sind eindeutig", () => {
    for (const list of [AIRCRAFT, AIRLINES]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });
});
