import { describe, expect, it } from "vitest";
import { ghostPosition, ghostTimeAt } from "./ghost.ts";

const samples = [0, 0.5, 1.5, 3, 5]; // alle 50 ms

describe("Geist (SR-AK-06)", () => {
  it("interpoliert zwischen Messpunkten", () => {
    expect(ghostPosition(samples, 0)).toBe(0);
    expect(ghostPosition(samples, 0.05)).toBe(0.5);
    expect(ghostPosition(samples, 0.075)).toBeCloseTo(1);
    expect(ghostPosition(samples, 0.175)).toBeCloseTo(4);
  });

  it("steht nach dem Ziel beim letzten Punkt", () => {
    expect(ghostPosition(samples, 10)).toBe(5);
  });

  it("ohne Aufzeichnung gibt es keinen Geist", () => {
    expect(ghostPosition([], 1)).toBeNull();
    expect(ghostTimeAt([], 1)).toBeNull();
  });

  it("ghostTimeAt ist die Umkehrung", () => {
    expect(ghostTimeAt(samples, 1)).toBeCloseTo(0.075);
    expect(ghostTimeAt(samples, 0)).toBe(0);
    expect(ghostTimeAt(samples, 99)).toBeNull();
  });
});
