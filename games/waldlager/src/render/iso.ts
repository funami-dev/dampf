/** Isometrische Projektion: Kachel (x, y, Höhe) → Bildpunkt in Welt-Pixeln. */
export const TW = 32;
export const TH = 16;
export const HS = 8;

export const isoX = (x: number, y: number) => (x - y) * (TW / 2);
export const isoY = (x: number, y: number, h = 0) => (x + y) * (TH / 2) - h * HS;

/** Bildpunkt → Kachel (auf Höhe 0) */
export const tileX = (sx: number, sy: number) => (sx / (TW / 2) + sy / (TH / 2)) / 2;
export const tileY = (sx: number, sy: number) => (sy / (TH / 2) - sx / (TW / 2)) / 2;
