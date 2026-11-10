import { describe, expect, it } from "vitest";
import { bearing, mapPoint } from "./compass.ts";

describe("WL-AK-44: Kompass und Karte", () => {
  it("Himmelsrichtungen wie im Spielbild (Norden oben)", () => {
    expect(bearing(-1, -1)).toBeCloseTo(0);
    expect(bearing(1, -1)).toBeCloseTo(90);
    expect(bearing(1, 1)).toBeCloseTo(180);
    expect(bearing(-1, 1)).toBeCloseTo(270);
    // gleiche Achsen wie der Trümmer-Hinweis: (+10, +10) liegt „unten“ = Süden
    expect(bearing(10, 10)).toBeCloseTo(180);
  });
  it("Karte: Mitte bleibt Mitte, Norden oben, Osten rechts, alles passt hinein", () => {
    const size = 256;
    const px = 256;
    expect(mapPoint(128, 128, size, px)).toEqual([128, 128]);
    const [, ny] = mapPoint(28, 28, size, px); // Richtung Norden
    expect(ny).toBeLessThan(128);
    const [ex] = mapPoint(228, 28, size, px); // Richtung Osten
    expect(ex).toBeGreaterThan(128);
    for (const [x, y] of [
      [0, 0],
      [255, 0],
      [0, 255],
      [255, 255],
    ] as const) {
      const [a, b] = mapPoint(x, y, size, px);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(px);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(px);
    }
  });
});
