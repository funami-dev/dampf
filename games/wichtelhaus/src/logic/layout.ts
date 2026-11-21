import type { Room } from "./wichtel.ts";

/**
 * Hausplan (WH-AK-13): 2 Räume × 3 Etagen, dazwischen ein Treppenhaus genau in der Mitte – im
 * Hoch- und im Querformat gleich (im Querformat mit mehr Wiese daneben).
 */
export interface Layout {
  portrait: boolean;
  /** virtuelle Breite (Haus plus Rand) */
  width: number;
  cols: number;
  floors: number;
  roomW: number;
  floorH: number;
  houseX: number;
  /** Breite des Treppenhauses zwischen den beiden Räumen */
  stairW: number;
  /** Dachhöhe über der obersten Etage */
  roofH: number;
  /** Platz jedes Raums; der Dachboden hat floor = floors */
  rooms: Record<Room, { floor: number; col: number }>;
}

export const FLOOR_H = 110;
/** Rand oben (Leisten) und unten (Wiese) in virtuellen Pixeln */
export const TOP_MARGIN = 64;
export const BOTTOM_MARGIN = 64;

const ROOMS_PLAN: Layout["rooms"] = {
  kueche: { floor: 0, col: 0 },
  wohnzimmer: { floor: 0, col: 1 },
  werkstatt: { floor: 1, col: 0 },
  bad: { floor: 1, col: 1 },
  musik: { floor: 2, col: 0 },
  schlafzimmer: { floor: 2, col: 1 },
  dachboden: { floor: 3, col: 0 },
};

/** Ab diesem Seitenverhältnis (Höhe / Breite) gilt das Hochformat */
export const PORTRAIT_FROM = 1;

export function layoutFor(width: number, height: number): Layout {
  const portrait = height >= width * PORTRAIT_FROM;
  const roomW = 150;
  const stairW = 36;
  const margin = portrait ? 30 : 110;
  return {
    portrait,
    width: 2 * roomW + stairW + 2 * margin,
    cols: 2,
    floors: 3,
    roomW,
    floorH: FLOOR_H,
    houseX: margin,
    stairW,
    roofH: 78,
    rooms: ROOMS_PLAN,
  };
}

/** Breite des ganzen Hauses (zwei Räume und Treppenhaus) */
export const houseWidth = (l: Layout) => l.cols * l.roomW + l.stairW;
/** linke Kante einer Raum-Spalte */
export const colX = (l: Layout, col: number) => l.houseX + col * (l.roomW + l.stairW);
/** linke Kante des Treppenhauses */
export const stairLeft = (l: Layout) => l.houseX + l.roomW;
/** Mitte des Treppenhauses (= Mitte des Hauses) */
export const stairMid = (l: Layout) => stairLeft(l) + l.stairW / 2;

/**
 * Wo steht der Wichtel im Treppenhaus? Die Treppen laufen im Zickzack: auf geraden Etagen von
 * links unten nach rechts oben, auf ungeraden umgekehrt. `y` ist die Fußhöhe, `ground` der Boden
 * der untersten Etage. Gibt den waagrechten Versatz zur Treppenhaus-Mitte und die Laufrichtung;
 * auf der obersten Etage führt eine Leiter senkrecht nach oben.
 */
export function stairOffset(l: Layout, ground: number, y: number): { dx: number; dir: 1 | -1 } {
  const h = (ground - 8 - y) / l.floorH; // 0 = unten, 1 = eine Etage höher
  const fl = Math.max(0, Math.floor(h));
  const p = Math.min(1, Math.max(0, h - fl));
  const dir: 1 | -1 = fl % 2 === 0 ? 1 : -1;
  // oberste Etage: senkrechte Leiter zum Dachboden
  if (fl >= l.floors - 1) return { dx: 0, dir };
  const run = (l.stairW - 14) / 2;
  return { dx: dir * (p * 2 - 1) * run, dir };
}

/** Höhe, die Haus, Dach und Ränder zusammen brauchen */
export const neededHeight = (l: Layout) =>
  TOP_MARGIN + l.roofH + l.floors * l.floorH + BOTTOM_MARGIN;

/**
 * Maßstab und Lage im Bild: das Haus füllt die Breite aus, steht unten auf der Wiese, und
 * oben bleibt nur so viel Himmel, wie der Bildschirm übrig lässt.
 */
export function fit(l: Layout, width: number, height: number) {
  const k = Math.min(width / l.width, height / neededHeight(l));
  const visibleH = height / k;
  const ground = visibleH - BOTTOM_MARGIN;
  return { k, ox: (width - l.width * k) / 2, ground, visibleH };
}
