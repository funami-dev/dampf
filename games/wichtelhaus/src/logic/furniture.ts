import type { Room } from "./wichtel.ts";

/**
 * Möbelplan (WH-AK-15): Lage in Raum-Punkten. `x` zählt von links, `right` von rechts, damit
 * die Möbel in 120 und 150 Punkte breiten Räumen passen. Der Boden liegt bei FLOOR_Y,
 * `lift` hebt ein Stück an (Wandregal, Laterne auf dem Nachttisch).
 */
export interface Item {
  key: string;
  w: number;
  h: number;
  x?: number;
  right?: number;
  lift?: number;
}

export const FLOOR_Y = 102;
export const WINDOW = { w: 32, h: 26, y: 16 };
export const windowX = (roomW: number) => Math.round(roomW / 2 - WINDOW.w / 2);

export const FURNITURE: Record<Exclude<Room, "dachboden">, Item[]> = {
  kueche: [
    { key: "herd", x: 6, w: 28, h: 36 },
    { key: "tisch", x: 40, w: 32, h: 18 },
    { key: "schrank", right: 8, w: 30, h: 46 },
  ],
  wohnzimmer: [
    { key: "sofa", x: 6, w: 44, h: 26 },
    { key: "kamin", x: 54, w: 28, h: 32 },
    { key: "regal", right: 6, w: 26, h: 54 },
  ],
  werkstatt: [
    { key: "werkbank", x: 8, w: 54, h: 26 },
    { key: "wandregal", right: 6, w: 38, h: 6, lift: 50 },
  ],
  bad: [
    { key: "wanne", x: 6, w: 54, h: 24 },
    { key: "waschbecken", right: 10, w: 24, h: 40 },
  ],
  musik: [
    { key: "klavier", x: 6, w: 60, h: 50 },
    { key: "hocker", x: 26, w: 20, h: 12 },
    { key: "notenstaender", right: 20, w: 10, h: 32 },
  ],
  schlafzimmer: [
    { key: "nachttisch", x: 8, w: 20, h: 16 },
    { key: "laterne", x: 12, w: 12, h: 16, lift: 16 },
    { key: "bett", right: 6, w: 64, h: 28 },
  ],
};

/** linke obere Ecke eines Möbelstücks im Raum */
export function itemBox(it: Item, roomW: number) {
  const x = it.x ?? roomW - (it.right ?? 0) - it.w;
  const y = FLOOR_Y - (it.lift ?? 0) - it.h;
  return { x, y, w: it.w, h: it.h };
}

/** Wichtel-Bilder (WH-AK-15) */
export const WICHTEL = { w: 18, h: 44, frames: ["stand", "walk0", "walk1"] as const };
export const SLEEPER = { w: 28, h: 14 };
export const PET = {
  katze: { w: 18, h: 14 },
  igel: { w: 16, h: 11 },
  drache: { w: 20, h: 16 },
} as const;
