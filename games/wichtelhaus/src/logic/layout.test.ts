import { describe, expect, it } from "vitest";
import { fit, layoutFor, neededHeight } from "./layout.ts";
import { ROOMS, type Room } from "./wichtel.ts";

describe("WH-AK-13: Hausplan", () => {
  for (const [name, w, h, cols, floors] of [
    ["Querformat", 1300, 700, 3, 2],
    ["Hochformat", 375, 600, 2, 3],
    ["iPhone mit Leisten", 400, 450, 2, 3],
  ] as const)
    it(`${name}: ${cols} Räume × ${floors} Etagen, jeder Raum hat genau einen Platz`, () => {
      const l = layoutFor(w, h);
      expect([l.cols, l.floors]).toEqual([cols, floors]);
      const rooms = Object.keys(ROOMS).filter((r) => r !== "dachboden") as Room[];
      const spots = rooms.map((r) => `${l.rooms[r].floor}:${l.rooms[r].col}`);
      expect(new Set(spots).size).toBe(6);
      for (const r of rooms) {
        expect(l.rooms[r].floor).toBeLessThan(l.floors);
        expect(l.rooms[r].col).toBeLessThan(l.cols);
      }
      expect(l.rooms.dachboden.floor).toBe(l.floors);
      expect(l.roofH).toBeLessThanOrEqual(l.floorH * 0.75);
    });

  it("das Haus passt immer ins Bild und steht unten", () => {
    for (const [w, h] of [
      [375, 600],
      [400, 450],
      [1300, 700],
      [800, 300],
    ] as const) {
      const l = layoutFor(w, h);
      const f = fit(l, w, h);
      expect(l.width * f.k).toBeLessThanOrEqual(w + 0.01);
      expect(neededHeight(l) * f.k).toBeLessThanOrEqual(h + 0.01);
      expect(f.ground + 64).toBeCloseTo(f.visibleH);
    }
  });
});
