/**
 * Vereinfachte Welt Düsseldorf/Köln. Koordinaten in Metern: x = Osten, z = Norden, y = Höhe.
 * Abstände gegenüber der Wirklichkeit etwa halbiert. Spec: specs/games/pilot-pro.md
 */

export const BOUNDS = { minX: -15_000, maxX: 15_000, minZ: -25_000, maxZ: 25_000 } as const;

export const RIVER_WIDTH = 400;
/** Rhein von Süden nach Norden */
export const RIVER: readonly [number, number][] = [
  [4000, -25_000],
  [2500, -10_000],
  [1500, -1500],
  [-1000, 6000],
  [-4000, 11_000],
  [-7300, 14_000],
  [-8500, 18_000],
  [-10_000, 25_000],
];

export interface Runway {
  airport: string;
  /** Mitte */
  cx: number;
  cz: number;
  /** Kurs in Grad (eine Richtung; die Gegenrichtung ist +180°) */
  heading: number;
  length: number;
  width: number;
}

export interface Airport {
  id: string;
  name: string;
  x: number;
  z: number;
  runways: Runway[];
}

/** Richtungsvektor (x, z) für einen Kurs (0° = Norden, 90° = Osten). */
export const dir = (heading: number): [number, number] => {
  const r = (heading * Math.PI) / 180;
  return [Math.sin(r), Math.cos(r)];
};

function runway(
  airport: string,
  ax: number,
  az: number,
  heading: number,
  length: number,
  offset: number,
): Runway {
  const [px, pz] = dir(heading + 90);
  return { airport, cx: ax + px * offset, cz: az + pz * offset, heading, length, width: 60 };
}

export const AIRPORTS: readonly Airport[] = [
  {
    id: "DUS",
    name: "Düsseldorf",
    x: -6000,
    z: 18_000,
    runways: [
      runway("DUS", -6000, 18_000, 53, 3000, 250),
      runway("DUS", -6000, 18_000, 53, 2700, -250),
    ],
  },
  {
    id: "CGN",
    name: "Köln/Bonn",
    x: 7000,
    z: -6000,
    runways: [runway("CGN", 7000, -6000, 140, 3000, 0)],
  },
];

/** Start: Düsseldorf, Hauptbahn, nordöstliches Ende, Blick Richtung 233°. */
export const START = (() => {
  const r = AIRPORTS[0]!.runways[0]!;
  const [dx, dz] = dir(r.heading);
  const d = r.length / 2 - 100;
  return { x: r.cx + dx * d, z: r.cz + dz * d, heading: (r.heading + 180) % 360 };
})();

export interface Landmark {
  id: "rheinturm" | "medienhafen" | "dom" | "hohenzollernbruecke";
  name: string;
  x: number;
  z: number;
  height: number;
}

export const LANDMARKS: readonly Landmark[] = [
  { id: "rheinturm", name: "Rheinturm", x: -6500, z: 14_000, height: 240 },
  { id: "medienhafen", name: "Medienhafen", x: -5800, z: 13_400, height: 60 },
  { id: "dom", name: "Kölner Dom", x: 1000, z: -1500, height: 157 },
  { id: "hohenzollernbruecke", name: "Hohenzollernbrücke", x: 1400, z: -1200, height: 0 },
];

/** Stadtgebiete für die Bebauung. */
export const CITIES: readonly {
  name: string;
  x: number;
  z: number;
  radius: number;
  maxHeight: number;
}[] = [
  { name: "Düsseldorf", x: -5600, z: 14_300, radius: 2600, maxHeight: 90 },
  { name: "Köln", x: 600, z: -1800, radius: 3200, maxHeight: 70 },
  { name: "Neuss", x: -9500, z: 11_000, radius: 1400, maxHeight: 35 },
  { name: "Leverkusen", x: 1800, z: 5200, radius: 1300, maxHeight: 40 },
  { name: "Ratingen", x: -3600, z: 20_500, radius: 1000, maxHeight: 25 },
  { name: "Bonn", x: 5600, z: -19_000, radius: 1800, maxHeight: 40 },
];

/** Abstand eines Punkts zum Rhein (Mittellinie). */
export function riverDistance(x: number, z: number): number {
  let best = Infinity;
  for (let i = 1; i < RIVER.length; i++) {
    const [ax, az] = RIVER[i - 1]!;
    const [bx, bz] = RIVER[i]!;
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - (ax + t * vx), z - (az + t * vz)));
  }
  return best;
}

export const isWater = (x: number, z: number) => riverDistance(x, z) < RIVER_WIDTH / 2;

export function runwayAt(x: number, z: number): Runway | null {
  for (const a of AIRPORTS) {
    for (const r of a.runways) {
      const [dx, dz] = dir(r.heading);
      const along = (x - r.cx) * dx + (z - r.cz) * dz;
      const across = (x - r.cx) * dz - (z - r.cz) * dx;
      if (Math.abs(along) <= r.length / 2 && Math.abs(across) <= r.width / 2) return r;
    }
  }
  return null;
}

const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** Geländehöhe: flach im Rheintal, sanfte Hügel im Osten, flach an Flughäfen und am Fluss. */
export function groundHeight(x: number, z: number): number {
  const east = smooth((x - 4000) / 5000);
  if (east === 0) return 0;
  let flat = smooth((riverDistance(x, z) - 1500) / 1500);
  for (const a of AIRPORTS) flat *= smooth((Math.hypot(x - a.x, z - a.z) - 2500) / 2000);
  const hills =
    80 + 70 * Math.sin(z / 2300) * Math.cos(x / 1700) + 40 * Math.sin(z / 900 + x / 1300);
  return Math.max(0, east * flat * hills) + 0;
}

export type Surface = "runway" | "water" | "land";

export function surfaceAt(x: number, z: number): Surface {
  if (runwayAt(x, z)) return "runway";
  if (isWater(x, z)) return "water";
  return "land";
}
