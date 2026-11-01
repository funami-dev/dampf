import type { City } from "./city.ts";

export const WALK_SPEED = 5;
export const RUN_SPEED = 9;
export const RADIUS = 0.4;

export interface Player {
  x: number;
  z: number;
  /** Blickrichtung in Grad (0 = Norden, 90 = Osten) */
  heading: number;
  moving: boolean;
}

export interface MoveInput {
  /** -1 … 1, rechts */
  x: number;
  /** -1 … 1, vorwärts */
  z: number;
  run: boolean;
}

const free = (city: City, x: number, z: number) =>
  city.walkableAt(x - RADIUS, z - RADIUS) &&
  city.walkableAt(x + RADIUS, z - RADIUS) &&
  city.walkableAt(x - RADIUS, z + RADIUS) &&
  city.walkableAt(x + RADIUS, z + RADIUS);

/**
 * Bewegt die Figur relativ zur Kamera (cameraHeading in Grad) mit Kollision (HI-AK-03).
 * Achsen getrennt prüfen → man gleitet an Wänden entlang.
 */
export function movePlayer(
  city: City,
  p: Player,
  input: MoveInput,
  cameraHeading: number,
  dt: number,
): Player {
  let ix = input.x;
  let iz = input.z;
  const len = Math.hypot(ix, iz);
  if (len < 0.05) return { ...p, moving: false };
  if (len > 1) {
    ix /= len;
    iz /= len;
  }
  const h = (cameraHeading * Math.PI) / 180;
  // vorwärts = (sin h, cos h), rechts = (cos h, −sin h)
  const dx = (Math.sin(h) * iz + Math.cos(h) * ix) * (input.run ? RUN_SPEED : WALK_SPEED) * dt;
  const dz = (Math.cos(h) * iz - Math.sin(h) * ix) * (input.run ? RUN_SPEED : WALK_SPEED) * dt;
  let { x, z } = p;
  if (free(city, x + dx, z)) x += dx;
  if (free(city, x, z + dz)) z += dz;
  const heading = ((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360;
  return { x, z, heading, moving: true };
}
