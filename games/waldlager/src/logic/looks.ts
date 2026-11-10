/**
 * Aussehen der Bäume und Berge (Feedback fb_5rohgojr, fb_owbtcbd8; WL-AK-51).
 * Nur Grafik: Spielregeln und Weltgenerierung bleiben gleich.
 */
import { T, type World } from "./world.ts";

export type TreeKind = "tanne" | "kiefer" | "laub" | "birke";

/** kleiner, fester Hash je Feld */
export const cellHash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/** Welche Baumart steht hier? Im Wald vor allem Nadelbäume, auf Wiesen Laubbäume und Birken. */
export function treeKind(w: World, tree: number): TreeKind {
  const t = w.trees[tree]!;
  if (t.apple) return "laub";
  const h = cellHash(t.x, t.y) % 10;
  const forest = w.terrain[t.y * w.size + t.x] === T.FOREST;
  if (forest) return h < 5 ? "tanne" : h < 7 ? "kiefer" : h < 9 ? "laub" : "birke";
  return h < 4 ? "laub" : h < 7 ? "birke" : h < 9 ? "tanne" : "kiefer";
}

/** Felsgipfel: Höhe 0–2 (klein, mittel, hoch mit Schnee) */
export const rockPeak = (x: number, y: number) => cellHash(x + 7, y + 3) % 3;
