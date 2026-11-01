import { describe, expect, it } from "vitest";
import { buildCity } from "./city.ts";
import { RADIUS, RUN_SPEED, WALK_SPEED, movePlayer, type Player } from "./player.ts";

const city = buildCity();
const at = (x: number, z: number): Player => ({ x, z, heading: 0, moving: false });

describe("Bewegung (HI-AK-03)", () => {
  it("läuft mit fester Geschwindigkeit, rennt schneller", () => {
    const p = movePlayer(city, at(0, -300), { x: 0, z: -1, run: false }, 0, 1);
    expect(p.z).toBeCloseTo(-300 - WALK_SPEED, 5);
    const r = movePlayer(city, at(0, -300), { x: 0, z: -1, run: true }, 0, 1);
    expect(r.z).toBeCloseTo(-300 - RUN_SPEED, 5);
    expect(RUN_SPEED).toBeGreaterThan(WALK_SPEED);
  });

  it("Eingabe relativ zur Kamera: vorwärts bei Kamera-Kurs 90° = Osten", () => {
    const p = movePlayer(city, at(0, 20), { x: 0, z: 1, run: false }, 90, 0.5);
    expect(p.x).toBeGreaterThan(1);
    expect(Math.abs(p.z - 20)).toBeLessThan(0.01);
    expect(p.heading).toBeCloseTo(90);
  });

  it("schräge Eingabe ist nicht schneller", () => {
    const p = movePlayer(city, at(0, -300), { x: 1, z: 1, run: false }, 0, 0.1);
    expect(Math.hypot(p.x, p.z + 300)).toBeLessThanOrEqual(WALK_SPEED * 0.1 + 1e-9);
  });

  it("läuft nicht in Gebäude, sondern gleitet an der Wand entlang", () => {
    // Von der Mittelstraße nach Westen/Nordwesten gegen die Häuserzeile laufen
    let p = at(0, -300);
    for (let i = 0; i < 300; i++) p = movePlayer(city, p, { x: -1, z: 0.3, run: false }, 0, 1 / 30);
    expect(city.walkableAt(p.x, p.z)).toBe(true);
    for (const [dx, dz] of [
      [RADIUS, 0],
      [-RADIUS, 0],
      [0, RADIUS],
      [0, -RADIUS],
    ]) {
      expect(city.walkableAt(p.x + dx!, p.z + dz!)).toBe(true);
    }
    expect(p.z).toBeGreaterThan(-300); // ist an der Wand entlang nach Norden geglitten
  });

  it("ohne Eingabe bleibt die Figur stehen", () => {
    const p = movePlayer(city, at(3, 4), { x: 0, z: 0, run: false }, 0, 1);
    expect([p.x, p.z, p.moving]).toEqual([3, 4, false]);
  });
});
