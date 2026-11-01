import { describe, expect, it } from "vitest";
import { detectSwipe } from "./swipe.ts";

describe("detectSwipe (SNAKE-AK-09)", () => {
  it.each([
    [40, 0, "right"],
    [-40, 5, "left"],
    [3, -50, "up"],
    [-10, 60, "down"],
  ] as const)("dx=%d dy=%d → %s", (dx, dy, dir) => {
    expect(detectSwipe(dx, dy)).toBe(dir);
  });

  it("unter 30 px ist kein Swipe (sondern ein Tippen)", () => {
    expect(detectSwipe(29, 0)).toBeNull();
    expect(detectSwipe(10, -20)).toBeNull();
  });
});
