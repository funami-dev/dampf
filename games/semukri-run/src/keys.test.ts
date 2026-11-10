import { describe, expect, it } from "vitest";
import { fresh } from "./keys.ts";

describe("SR-AK-15: jeder Tastendruck zählt genau einmal", () => {
  it("dasselbe Ereignis wird nur einmal behandelt, neue Ereignisse schon", () => {
    let n = 0;
    const h = fresh(() => n++);
    const a = { key: "ArrowRight" } as KeyboardEvent;
    const b = { key: "ArrowRight" } as KeyboardEvent;
    h(a);
    h(a);
    h(b);
    expect(n).toBe(2);
  });
});
