import { describe, expect, it } from "vitest";
import { installAt } from "./compat.ts";

describe("BUILD-AK-12: .at() wird nachgerüstet", () => {
  it("verhält sich wie das Original, auch bei negativen Indizes", () => {
    class Fake {
      length = 3;
      0 = "a";
      1 = "b";
      2 = "c";
    }
    installAt([Fake.prototype]);
    const f = new Fake() as unknown as { at(i: number): string | undefined };
    expect(f.at(0)).toBe("a");
    expect(f.at(-1)).toBe("c");
    expect(f.at(-3)).toBe("a");
    expect(f.at(3)).toBeUndefined();
    expect(f.at(-4)).toBeUndefined();
    expect(f.at(1.7)).toBe("b");
  });

  it("überschreibt ein vorhandenes .at() nicht", () => {
    const original = Array.prototype.at;
    installAt([Array.prototype]);
    expect(Array.prototype.at).toBe(original);
  });
});
