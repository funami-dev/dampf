import { describe, expect, it } from "vitest";
import {
  BOTTOM_MARGIN,
  colX,
  fit,
  houseWidth,
  layoutFor,
  neededHeight,
  stairLeft,
  stairMid,
  stairOffset,
} from "./layout.ts";
import { ROOMS, type Room } from "./wichtel.ts";

describe("WH-AK-13: Hausplan", () => {
  for (const [name, w, h] of [
    ["Querformat", 1300, 700],
    ["Hochformat", 375, 600],
    ["iPhone mit Leisten", 400, 450],
  ] as const)
    it(`${name}: 2 Räume × 3 Etagen, Treppenhaus in der Mitte`, () => {
      const l = layoutFor(w, h);
      expect([l.cols, l.floors]).toEqual([2, 3]);
      const rooms = Object.keys(ROOMS).filter((r) => r !== "dachboden") as Room[];
      const spots = rooms.map((r) => `${l.rooms[r].floor}:${l.rooms[r].col}`);
      expect(new Set(spots).size).toBe(6);
      for (const r of rooms) {
        expect(l.rooms[r].floor).toBeLessThan(l.floors);
        expect(l.rooms[r].col).toBeLessThan(l.cols);
        // kein Raum überdeckt das Treppenhaus
        const x0 = colX(l, l.rooms[r].col);
        const x1 = x0 + l.roomW;
        expect(x1 <= stairLeft(l) || x0 >= stairLeft(l) + l.stairW).toBe(true);
      }
      expect(l.rooms.dachboden.floor).toBe(l.floors);
      expect(l.roofH).toBeLessThanOrEqual(l.floorH * 0.75);
      // Treppenhaus genau in der Mitte des Hauses und des Bildes
      expect(stairMid(l)).toBeCloseTo(l.houseX + houseWidth(l) / 2);
      expect(stairMid(l)).toBeCloseTo(l.width / 2);
      expect(l.stairW).toBeGreaterThanOrEqual(30);
    });

  it("Zickzack-Treppe bleibt im Treppenhaus und wechselt je Etage die Richtung", () => {
    const l = layoutFor(375, 600);
    const g = 500;
    for (let y = g - 8; y > g - 8 - 3 * l.floorH; y -= 7) {
      const { dx } = stairOffset(l, g, y);
      expect(Math.abs(dx)).toBeLessThanOrEqual(l.stairW / 2);
    }
    expect(stairOffset(l, g, g - 8 - 10).dir).toBe(1);
    expect(stairOffset(l, g, g - 8 - l.floorH - 10).dir).toBe(-1);
    expect(stairOffset(l, g, g - 8).dx).toBeLessThan(0);
    expect(stairOffset(l, g, g - 8 - l.floorH * 0.99).dx).toBeGreaterThan(0);
    expect(stairOffset(l, g, g - 8 - l.floorH * 2.5).dx).toBe(0); // Leiter
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
      expect(f.ground + BOTTOM_MARGIN).toBeCloseTo(f.visibleH);
    }
  });
});
