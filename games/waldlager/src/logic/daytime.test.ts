import { describe, expect, it } from "vitest";
import { DAY, clockOf, darkness, isNight, phaseOf } from "./daytime.ts";

describe("WL-AK-08: Tag und Nacht", () => {
  it("ein Zyklus dauert 10 Minuten mit Morgen, Tag, Dämmerung, Nacht", () => {
    expect(DAY).toBe(600);
    expect(phaseOf(10)).toBe("morgen");
    expect(phaseOf(100)).toBe("tag");
    expect(phaseOf(380)).toBe("daemmerung");
    expect(phaseOf(500)).toBe("nacht");
    expect(phaseOf(610)).toBe("morgen");
    expect(isNight(500)).toBe(true);
  });
  it("Uhrzeit und Dunkelheit passen zur Phase", () => {
    expect(clockOf(0)).toBe("06:00");
    expect(clockOf(30)).toBe("07:00");
    expect(clockOf(360)).toBe("19:00");
    expect(clockOf(420)).toBe("21:00");
    expect(clockOf(599)).toMatch(/^05:5\d$/);
    expect(darkness(100).dark).toBe(0);
    expect(darkness(500).dark).toBeGreaterThan(0.7);
    expect(darkness(390).dusk).toBeGreaterThan(0.5);
  });
});
