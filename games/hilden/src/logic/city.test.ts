import { describe, expect, it } from "vitest";
import {
  CELL,
  Cell,
  HALF,
  LANDMARKS,
  WORKPLACES,
  buildCity,
  isWalkable,
  reachableFrom,
} from "./city.ts";

const city = buildCity();

describe("Stadt Hilden (HI-AK-01)", () => {
  it("hat Straßen, Gebäude, Grünflächen und Wasser", () => {
    const count = (t: Cell) => city.cells.reduce((n, c) => n + (c === t ? 1 : 0), 0);
    expect(count(Cell.Road)).toBeGreaterThan(2000);
    expect(count(Cell.Building)).toBeGreaterThan(3000);
    expect(count(Cell.Park)).toBeGreaterThan(500);
    expect(count(Cell.Water)).toBeGreaterThan(200);
    expect(count(Cell.Pedestrian)).toBeGreaterThan(100);
  });

  it("enthält Alten Markt, Mittelstraße, Reformationskirche, Bahnhof, Stadtpark und Itter", () => {
    const ids = LANDMARKS.map((l) => l.id);
    for (const id of [
      "alter-markt",
      "mittelstrasse",
      "reformationskirche",
      "bahnhof",
      "stadtpark",
      "itter",
    ]) {
      expect(ids).toContain(id);
    }
    // Mittelstraße ist Fußgängerzone, Alter Markt ein Platz
    expect(city.at(0, -300)).toBe(Cell.Pedestrian);
    expect(city.at(0, 20)).toBe(Cell.Plaza);
  });

  it("ist deterministisch", () => {
    expect(buildCity().cells).toEqual(city.cells);
  });

  it("Gebäude haben Höhen, Innenstadt höher als Wohnviertel", () => {
    const h = (x: number, z: number, r: number) => {
      const hs: number[] = [];
      for (let i = 0; i < city.cells.length; i++) {
        if (city.cells[i] !== Cell.Building || city.heights[i] === 0) continue;
        const [cx, cz] = city.center(i);
        if (Math.hypot(cx - x, cz - z) < r) hs.push(city.heights[i]!);
      }
      return hs.reduce((a, b) => a + b, 0) / hs.length;
    };
    expect(h(0, -150, 250)).toBeGreaterThan(h(-550, 450, 200));
  });
});

describe("Begehbarkeit (HI-AK-02)", () => {
  it("Straße, Platz, Park begehbar; Gebäude, Wasser, Gleise nicht", () => {
    expect(isWalkable(Cell.Road)).toBe(true);
    expect(isWalkable(Cell.Plaza)).toBe(true);
    expect(isWalkable(Cell.Park)).toBe(true);
    expect(isWalkable(Cell.Building)).toBe(false);
    expect(isWalkable(Cell.Water)).toBe(false);
    expect(isWalkable(Cell.Rail)).toBe(false);
  });

  it("alle Häuser, Arbeitsorte und Wahrzeichen sind vom Alten Markt aus erreichbar", () => {
    const reach = reachableFrom(city, 0, 20);
    const points = [
      ...city.houses.map((h) => h.door),
      ...WORKPLACES.map((w) => city.workplace(w.id).door),
      city.jobBoard,
      ...LANDMARKS.map((l) => l.visit),
    ];
    for (const [x, z] of points) {
      expect(city.walkableAt(x, z)).toBe(true);
      expect(reach(x, z)).toBe(true);
    }
  });

  it("Rand ist begrenzt", () => {
    expect(city.walkableAt(HALF + 10, 0)).toBe(false);
    expect(city.walkableAt(0, -HALF - 10)).toBe(false);
    expect(CELL).toBe(5);
  });
});

describe("Häuser (HI-AK-04)", () => {
  it("genau 3 Häuser, ohne echte Adressen", () => {
    expect(city.houses.map((h) => h.name)).toEqual(["Haus 1", "Haus 2", "Haus 3"]);
    for (const h of city.houses) expect(JSON.stringify(h)).not.toMatch(/stra(ß|ss)e|hausnummer/i);
  });

  it("Häuser liegen in Wohnvierteln, nicht in der Innenstadt", () => {
    for (const h of city.houses) expect(Math.hypot(h.door[0], h.door[1])).toBeGreaterThan(250);
  });
});
