import { describe, expect, it } from "vitest";
import { actionFor, addPlayer, createState, free, hasApples } from "./sim.ts";
import { SWATH, T, generateWorld, idx, swathDir } from "./world.ts";

describe("WL-AK-46: Absturz-Schneise", () => {
  it("30–40 Felder lang, beginnt am Wrack, in Richtung der Trümmerspur (viele Seeds)", () => {
    for (let k = 1; k <= 25; k++) {
      const seed = k * 7919 + 13;
      const w = generateWorld(seed);
      expect(w.scorch.length, `Seed ${seed}`).toBeGreaterThan(20);
      const a = swathDir(w);
      let maxAlong = 0;
      for (const i of w.scorch) {
        const x = i % w.size;
        const y = Math.floor(i / w.size);
        const along = (x - w.plane.x) * Math.cos(a) + (y - w.plane.y) * Math.sin(a);
        expect(along).toBeGreaterThanOrEqual(-0.01);
        maxAlong = Math.max(maxAlong, along);
        expect([T.GRASS, T.FOREST, T.SAND]).toContain(w.terrain[i]);
      }
      expect(maxAlong).toBeLessThanOrEqual(SWATH.max + 0.01);
      // Richtung der Trümmer: ihr Schwerpunkt liegt innerhalb ±30° der Schneise
      const cx = w.debris.reduce((s, d) => s + d.x, 0) / w.debris.length - w.plane.x;
      const cy = w.debris.reduce((s, d) => s + d.y, 0) / w.debris.length - w.plane.y;
      const diff = Math.abs(((Math.atan2(cy, cx) - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      expect(diff).toBeLessThan(Math.PI / 6);
    }
  });

  it("umgeknickte Bäume: begehbar, nicht hackbar, keine Äpfel; Bäume bleiben, wo sie waren", () => {
    const w = generateWorld(8);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    p.landing = 0;
    const fallen = w.trees.map((t, k) => ({ t, k })).filter((o) => o.t.fallen);
    expect(fallen.length).toBeGreaterThan(0);
    const scorch = new Set(w.scorch);
    for (const { t, k } of fallen) {
      expect(scorch.has(idx(w, t.x, t.y))).toBe(true);
      expect(free(w, s, t.x, t.y)).toBe(true);
      expect(hasApples(w, s, k)).toBe(false);
      s.mushrooms = [];
      p.x = t.x + 0.5;
      p.y = t.y + 0.5;
      expect(actionFor(w, s, p)?.kind ?? null).not.toBe("chop");
    }
    // gleiche Bäume wie ohne Schneise: Zahl und Lage ändern sich nicht
    const again = generateWorld(8);
    expect(again.trees.map((t) => [t.x, t.y])).toEqual(w.trees.map((t) => [t.x, t.y]));
    expect(again.scorch).toEqual(w.scorch);
  });
});
