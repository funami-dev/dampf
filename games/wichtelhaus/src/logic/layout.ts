import type { Room } from "./wichtel.ts";

/** Hausplan (WH-AK-13): Querformat 3 Räume × 2 Etagen, Hochformat 2 Räume × 3 Etagen */
export interface Layout {
  portrait: boolean;
  /** virtuelle Breite (Haus plus Rand) */
  width: number;
  cols: number;
  floors: number;
  roomW: number;
  floorH: number;
  houseX: number;
  /** Dachhöhe über der obersten Etage */
  roofH: number;
  /** Platz jedes Raums; der Dachboden hat floor = floors */
  rooms: Record<Room, { floor: number; col: number }>;
}

export const FLOOR_H = 110;
/** Rand oben (Leisten) und unten (Wiese) in virtuellen Pixeln */
export const TOP_MARGIN = 64;
export const BOTTOM_MARGIN = 64;

const LANDSCAPE: Layout["rooms"] = {
  kueche: { floor: 0, col: 0 },
  wohnzimmer: { floor: 0, col: 1 },
  werkstatt: { floor: 0, col: 2 },
  bad: { floor: 1, col: 0 },
  musik: { floor: 1, col: 1 },
  schlafzimmer: { floor: 1, col: 2 },
  dachboden: { floor: 2, col: 1 },
};
const PORTRAIT: Layout["rooms"] = {
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
  const cols = portrait ? 2 : 3;
  const roomW = portrait ? 150 : 120;
  const margin = 30;
  return {
    portrait,
    width: cols * roomW + 2 * margin,
    cols,
    floors: portrait ? 3 : 2,
    roomW,
    floorH: FLOOR_H,
    houseX: margin,
    roofH: 78,
    rooms: portrait ? PORTRAIT : LANDSCAPE,
  };
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
