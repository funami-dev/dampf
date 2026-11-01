import { describe, expect, it } from "vitest";
import {
  AIRPORTS,
  BOUNDS,
  LANDMARKS,
  START,
  groundHeight,
  isWater,
  runwayAt,
  surfaceAt,
} from "./world.ts";

describe("Welt Düsseldorf/Köln", () => {
  it("Ausschnitt ca. 30 × 50 km", () => {
    expect(BOUNDS.maxX - BOUNDS.minX).toBe(30_000);
    expect(BOUNDS.maxZ - BOUNDS.minZ).toBe(50_000);
  });

  it("PP-AK-03: Start auf der Düsseldorfer Bahn mit Kurs ≈ 233°", () => {
    expect(Math.abs(START.heading - 233)).toBeLessThan(1);
    expect(runwayAt(START.x, START.z)?.airport).toBe("DUS");
  });

  it("Düsseldorf hat zwei parallele Bahnen (053/233), Köln/Bonn eine", () => {
    const dus = AIRPORTS.find((a) => a.id === "DUS")!;
    const cgn = AIRPORTS.find((a) => a.id === "CGN")!;
    expect(dus.runways).toHaveLength(2);
    expect(cgn.runways).toHaveLength(1);
    for (const r of dus.runways) expect(r.heading % 180).toBeCloseTo(53, 0);
  });

  it("Wahrzeichen liegen im Gebiet; Köln liegt südlich von Düsseldorf", () => {
    const names = LANDMARKS.map((l) => l.id);
    for (const id of ["rheinturm", "medienhafen", "dom", "hohenzollernbruecke"])
      expect(names).toContain(id);
    for (const l of LANDMARKS) {
      expect(l.x).toBeGreaterThan(BOUNDS.minX);
      expect(l.x).toBeLessThan(BOUNDS.maxX);
      expect(l.z).toBeGreaterThan(BOUNDS.minZ);
      expect(l.z).toBeLessThan(BOUNDS.maxZ);
    }
    const dom = LANDMARKS.find((l) => l.id === "dom")!;
    const turm = LANDMARKS.find((l) => l.id === "rheinturm")!;
    expect(dom.z).toBeLessThan(turm.z);
  });

  it("der Rhein ist Wasser, Flughäfen und Wahrzeichen nicht", () => {
    let water = 0;
    for (let z = BOUNDS.minZ; z <= BOUNDS.maxZ; z += 500) {
      for (let x = BOUNDS.minX; x <= BOUNDS.maxX; x += 100) {
        if (isWater(x, z)) {
          water++;
          break;
        }
      }
    }
    expect(water).toBeGreaterThan(90); // der Fluss zieht sich durchs ganze Gebiet
    for (const a of AIRPORTS) expect(isWater(a.x, a.z)).toBe(false);
    for (const l of LANDMARKS.filter((l) => l.id !== "hohenzollernbruecke"))
      expect(isWater(l.x, l.z)).toBe(false);
  });

  it("Gelände: flach an Flughäfen und am Fluss, Hügel im Osten", () => {
    for (const a of AIRPORTS) expect(groundHeight(a.x, a.z)).toBe(0);
    expect(groundHeight(-8000, 0)).toBe(0);
    let max = 0;
    for (let z = BOUNDS.minZ; z < BOUNDS.maxZ; z += 250)
      max = Math.max(max, groundHeight(12_000, z));
    expect(max).toBeGreaterThan(50);
    expect(max).toBeLessThan(300);
  });

  it("surfaceAt unterscheidet Bahn, Wasser und Land", () => {
    expect(surfaceAt(START.x, START.z)).toBe("runway");
    const dom = LANDMARKS.find((l) => l.id === "dom")!;
    expect(surfaceAt(dom.x, dom.z)).toBe("land");
    const bridge = LANDMARKS.find((l) => l.id === "hohenzollernbruecke")!;
    expect(surfaceAt(bridge.x, bridge.z)).toBe("water");
  });
});
