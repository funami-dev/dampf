import { describe, expect, it } from "vitest";
import { BERTHS, BUOYS, FAIRWAY, SHIPS, SANDBANKS, inBerth, isNavigable } from "./world.ts";

describe("Schiffe (JF-AK-01)", () => {
  it("genau die 8 Frisia-Schiffe", () => {
    expect(SHIPS.map((s) => s.name)).toEqual([
      "Frisia I",
      "Frisia II",
      "Frisia III",
      "Frisia IV",
      "Frisia VII",
      "Frisia VIII",
      "Frisia IX",
      "Frisia E-I",
    ]);
  });

  it("nur Aussehen unterscheidet sich; keine Bilddateien; E-I ohne Schornstein", () => {
    for (const s of SHIPS) {
      expect(s.length).toBeGreaterThan(30);
      expect([1, 2, 3]).toContain(s.decks);
      expect(JSON.stringify(s)).not.toMatch(/\.(png|jpe?g|svg|webp)|url\(|https?:/i);
    }
    expect(SHIPS.find((s) => s.id === "frisia-e1")!.funnel).toBe(false);
    expect(SHIPS.filter((s) => s.funnel).length).toBe(7);
    expect(new Set(SHIPS.map((s) => s.id)).size).toBe(8);
  });
});

describe("Welt (JF-AK-05)", () => {
  it("beide Anleger liegen im Wasser", () => {
    for (const b of Object.values(BERTHS)) {
      expect(isNavigable(b.start[0], b.start[1])).toBe(true);
      expect(inBerth(b, b.start[0], b.start[1])).toBe(true);
    }
  });

  it("Fahrwasser von Hafen zu Hafen ist durchgehend befahrbar", () => {
    const pts = [BERTHS.norddeich.start, ...FAIRWAY, BERTHS.juist.start];
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1]!;
      const [bx, bz] = pts[i]!;
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 5);
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        expect(isNavigable(x, z), `(${x.toFixed(0)}, ${z.toFixed(0)})`).toBe(true);
      }
    }
  });

  it("Tonnen liegen im Wasser, rot links (Westen), grün rechts", () => {
    expect(BUOYS.length).toBeGreaterThanOrEqual(8);
    for (const b of BUOYS) expect(isNavigable(b.x, b.z)).toBe(true);
    expect(BUOYS.some((b) => b.color === "red")).toBe(true);
    expect(BUOYS.some((b) => b.color === "green")).toBe(true);
  });

  it("Land und Sandbänke sind nicht befahrbar", () => {
    expect(isNavigable(800, -2300)).toBe(false); // Festland
    expect(isNavigable(1500, 1900)).toBe(false); // Juist
    for (const s of SANDBANKS) expect(isNavigable(s.x, s.z)).toBe(false);
    expect(isNavigable(0, 0)).toBe(true);
  });

  it("Strecke ist so lang, dass eine Fahrt etwa 2–3 Minuten dauert", () => {
    const pts = [BERTHS.norddeich.start, ...FAIRWAY, BERTHS.juist.start];
    let len = 0;
    for (let i = 1; i < pts.length; i++)
      len += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
    // bei Reisetempo 16 m/s reine Fahrzeit ≈ 2,5 min; mit Beschleunigen und Anlegen 2–3 Minuten
    expect(len / 16).toBeGreaterThan(120);
    expect(len / 16).toBeLessThan(170);
  });
});
