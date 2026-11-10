import { describe, expect, it } from "vitest";
import { UNITS_KEY, gauges, loadUnits } from "./units.ts";

describe("PP-AK-18: Einheiten", () => {
  const s = { speed: 70, y: 304.8, vs: 5.08 };
  it("metrisch ist Standard: km/h, m, m/s", () => {
    expect(gauges(s, "metrisch")).toEqual({ spd: "252", alt: "305", vs: "5,1" });
    expect(gauges({ speed: 0, y: 0, vs: -0.01 }, "metrisch").vs).toBe("0,0");
    expect(loadUnits(() => null)).toBe("metrisch");
    expect(loadUnits(() => "kaputt")).toBe("metrisch");
  });
  it("wie echte Piloten: Knoten, Fuß, Fuß/min", () => {
    expect(gauges(s, "luftfahrt")).toEqual({ spd: "136", alt: "1000", vs: "1000" });
    expect(loadUnits((k) => (k === UNITS_KEY ? "luftfahrt" : null))).toBe("luftfahrt");
    expect(
      loadUnits(() => {
        throw new Error("gesperrt");
      }),
    ).toBe("metrisch");
  });
});
