import { describe, expect, it } from "vitest";
import { rockPeak, treeKind } from "./looks.ts";
import { T, generateWorld } from "./world.ts";

describe("WL-AK-51: vielfältigere Bäume und höhere Berge", () => {
  it("mindestens drei Baumarten, je Feld immer gleich; Apfelbäume sind Laubbäume", () => {
    const w = generateWorld(12);
    const kinds = new Map<string, number>();
    w.trees.forEach((_, k) => kinds.set(treeKind(w, k), (kinds.get(treeKind(w, k)) ?? 0) + 1));
    expect(kinds.size).toBe(4);
    for (const n of kinds.values()) expect(n).toBeGreaterThan(w.trees.length * 0.03);
    expect(w.trees.map((_, k) => treeKind(w, k))).toEqual(
      generateWorld(12).trees.map((_, k) => treeKind(w, k)),
    );
    w.trees.forEach((t, k) => t.apple && expect(treeKind(w, k)).toBe("laub"));
    // im Wald überwiegen Nadelbäume
    const forest = w.trees
      .map((t, k) => ({ t, k }))
      .filter((o) => w.terrain[o.t.y * w.size + o.t.x] === T.FOREST);
    const conifer = forest.filter((o) => ["tanne", "kiefer"].includes(treeKind(w, o.k))).length;
    expect(conifer / forest.length).toBeGreaterThan(0.5);
  });
  it("Felsgipfel in drei Höhen", () => {
    const seen = new Set<number>();
    for (let x = 0; x < 30; x++) seen.add(rockPeak(x, x * 3));
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });
});
