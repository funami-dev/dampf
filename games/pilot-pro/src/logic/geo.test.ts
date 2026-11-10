import { describe, expect, it } from "vitest";
import { REAL, TILE_URL, toLatLon, toTile } from "./geo.ts";
import { AIRPORTS } from "./world.ts";

describe("PP-AK-14: Spielwelt → echte Karte", () => {
  it("die Flughäfen liegen genau an ihrer echten Stelle", () => {
    for (const a of AIRPORTS) {
      const r = REAL[a.id as keyof typeof REAL];
      const p = toLatLon(a.x, a.z);
      expect(Math.abs(p.lat - r.lat)).toBeLessThan(0.0001);
      expect(Math.abs(p.lon - r.lon)).toBeLessThan(0.0001);
    }
  });
  it("Norden ist oben, Osten rechts; etwa doppelte Abstände", () => {
    const a = toLatLon(0, 0);
    const b = toLatLon(1000, 1000);
    expect(b.lat).toBeGreaterThan(a.lat);
    expect(b.lon).toBeGreaterThan(a.lon);
    // 1 km im Spiel ≈ 2 km in echt (Breite: 1° ≈ 111 km)
    expect((b.lat - a.lat) * 111).toBeGreaterThan(1.8);
    expect((b.lat - a.lat) * 111).toBeLessThan(2.2);
  });
  it("Web-Mercator-Kacheln stimmen für bekannte Punkte", () => {
    expect(toTile(0, 0, 1)).toEqual({ x: 1, y: 1 });
    const k = toTile(51.2895, 6.7668, 11);
    expect(Math.floor(k.x)).toBe(1062);
    expect(Math.floor(k.y)).toBe(682);
    expect(TILE_URL(11, 1062, 682)).toBe("https://tile.openstreetmap.org/11/1062/682.png");
  });
});
