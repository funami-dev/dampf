/**
 * Spielwelt → echte Koordinaten und OpenStreetMap-Kacheln (Spec: Live-Karte, PP-AK-14).
 * Linear je Achse, so dass beide Flughäfen genau an ihrer echten Stelle liegen.
 */
import { AIRPORTS } from "./world.ts";

export const REAL = {
  DUS: { lat: 51.2895, lon: 6.7668 },
  CGN: { lat: 50.8659, lon: 7.1427 },
} as const;

const dus = AIRPORTS.find((a) => a.id === "DUS")!;
const cgn = AIRPORTS.find((a) => a.id === "CGN")!;
const lonPerX = (REAL.CGN.lon - REAL.DUS.lon) / (cgn.x - dus.x);
const latPerZ = (REAL.CGN.lat - REAL.DUS.lat) / (cgn.z - dus.z);

export function toLatLon(x: number, z: number): { lat: number; lon: number } {
  return { lat: REAL.DUS.lat + (z - dus.z) * latPerZ, lon: REAL.DUS.lon + (x - dus.x) * lonPerX };
}

/** Web-Mercator: Breite/Länge → Kachel-Koordinaten (mit Nachkommastellen) bei Zoom z */
export function toTile(lat: number, lon: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n,
  };
}

export const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
export const TILE_SIZE = 256;
export const ZOOM = { small: 11, min: 8, max: 14, big: 11 };
export const MAX_LOADING = 4;
