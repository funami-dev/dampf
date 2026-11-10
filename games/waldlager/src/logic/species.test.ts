import { describe, expect, it } from "vitest";
import { SPECIES, UNICORN } from "./species.ts";

describe("WL-AK-18: Tierarten", () => {
  it("mindestens 29 Arten plus Einhorn, eindeutige IDs", () => {
    const ids = SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(UNICORN);
    expect(ids.filter((i) => i !== UNICORN).length).toBeGreaterThanOrEqual(29);
    for (const id of ["reh", "hase", "fuchs", "eichhoernchen"]) expect(ids).toContain(id);
  });

  it("jede Art hat Name, Lebensraum, Zeit, Seltenheit, Satz und eine gültige Pixel-Grafik", () => {
    for (const s of SPECIES) {
      expect(s.name.length).toBeGreaterThan(1);
      expect(["wald", "wiese", "wasser", "huegel", "meer", "strand"]).toContain(s.habitat);
      expect(["tag", "nacht"]).toContain(s.time);
      expect(["haeufig", "selten", "sehr-selten"]).toContain(s.rarity);
      expect(s.fact.length).toBeGreaterThan(20);
      expect(s.fact.endsWith(".") || s.fact.endsWith("!")).toBe(true);
      expect(s.pixels.length).toBeGreaterThanOrEqual(4);
      const used = new Set(s.pixels.join("").replace(/\./g, ""));
      expect(used.size).toBeGreaterThan(0);
      for (const ch of used)
        expect(s.palette[ch], `${s.id}: Farbe ${ch}`).toMatch(/^#[0-9a-f]{3,6}$/i);
      expect(Math.max(...s.pixels.map((r) => r.length))).toBeLessThanOrEqual(20);
    }
  });

  it("es gibt nachtaktive, Wasser- und Hügeltiere", () => {
    expect(SPECIES.filter((s) => s.time === "nacht").length).toBeGreaterThanOrEqual(8);
    expect(SPECIES.filter((s) => s.habitat === "wasser").length).toBeGreaterThanOrEqual(4);
    expect(SPECIES.filter((s) => s.habitat === "huegel").length).toBeGreaterThanOrEqual(2);
  });
});
