export type Direction = "up" | "down" | "left" | "right";

export const SWIPE_MIN_DISTANCE = 30;

/** Wandelt eine Zeigerbewegung in eine Richtung um, oder null bei zu kurzer Bewegung (Tippen). */
export function detectSwipe(dx: number, dy: number, min = SWIPE_MIN_DISTANCE): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
