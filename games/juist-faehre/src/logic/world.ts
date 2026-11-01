/**
 * Vereinfachtes Wattenmeer zwischen Norddeich (Süden) und Juist (Norden). Meter, x = Osten, z = Norden.
 * Abstände stark verkürzt (eine Fahrt ≈ 5 Minuten). Spec: specs/games/juist-faehre.md
 */

export type Pt = [number, number];

export interface ShipType {
  id: string;
  name: string;
  /** Meter */
  length: number;
  decks: 1 | 2 | 3;
  funnel: boolean;
}

/** Nur das Aussehen unterscheidet sich (eigene, vereinfachte Modelle). */
export const SHIPS: readonly ShipType[] = [
  { id: "frisia-i", name: "Frisia I", length: 54, decks: 2, funnel: true },
  { id: "frisia-ii", name: "Frisia II", length: 50, decks: 2, funnel: true },
  { id: "frisia-iii", name: "Frisia III", length: 58, decks: 3, funnel: true },
  { id: "frisia-iv", name: "Frisia IV", length: 62, decks: 3, funnel: true },
  { id: "frisia-vii", name: "Frisia VII", length: 48, decks: 1, funnel: true },
  { id: "frisia-viii", name: "Frisia VIII", length: 56, decks: 2, funnel: true },
  { id: "frisia-ix", name: "Frisia IX", length: 50, decks: 2, funnel: true },
  { id: "frisia-e1", name: "Frisia E-I", length: 60, decks: 2, funnel: false },
];
export const shipById = (id: string) => SHIPS.find((s) => s.id === id) ?? SHIPS[0]!;

export const BOUNDS = { minX: -2500, maxX: 2500, minZ: -2400, maxZ: 2500 } as const;

/** Festland Norddeich: alles südlich der Küstenlinie, außer dem Hafenbecken. */
export const COAST_Z = -1800;
export const NORDDEICH_BASIN: [number, number, number, number] = [-100, -2150, 100, COAST_Z];
export const NORDDEICH_MOLES: [number, number, number, number][] = [
  [-115, -1800, -100, -1550],
  [100, -1800, 115, -1550],
];

/** Juist: lange, schmale Insel (Ellipse) mit Hafenbecken auf der Südseite. */
export const JUIST = { x: 0, z: 1950, rx: 4000, rz: 400 } as const;
export const JUIST_BASIN: [number, number, number, number] = [-90, 1500, 90, 1800];
export const JUIST_MOLES: [number, number, number, number][] = [
  [-105, 1400, -90, 1600],
  [90, 1400, 105, 1600],
];

export interface Berth {
  id: "norddeich" | "juist";
  name: string;
  /** Liegeplatz-Mitte */
  start: Pt;
  /** Kurs beim Ablegen */
  heading: number;
  rect: [number, number, number, number];
}

export const BERTHS: Record<Berth["id"], Berth> = {
  norddeich: {
    id: "norddeich",
    name: "Norddeich Mole",
    start: [0, -2080],
    heading: 0,
    rect: [-40, -2120, 40, -2040],
  },
  juist: {
    id: "juist",
    name: "Juist Hafen",
    start: [0, 1730],
    heading: 180,
    rect: [-40, 1690, 40, 1770],
  },
};

/** Wegpunkte des Fahrwassers (Norddeich → Juist), ohne die Liegeplätze. */
export const FAIRWAY: readonly Pt[] = [
  [0, -1600],
  [300, -900],
  [-250, -100],
  [250, 700],
  [0, 1400],
];

export interface Sandbank {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export const SANDBANKS: readonly Sandbank[] = [
  { x: -1200, z: -700, rx: 500, rz: 220 },
  { x: 1100, z: 200, rx: 450, rz: 250 },
  { x: -1100, z: 900, rx: 420, rz: 200 },
  { x: 1200, z: -1300, rx: 400, rz: 150 },
];

const inRect = (x: number, z: number, [x0, z0, x1, z1]: readonly number[]) =>
  x >= x0! && x <= x1! && z >= z0! && z <= z1!;
const inEllipse = (x: number, z: number, e: { x: number; z: number; rx: number; rz: number }) =>
  ((x - e.x) / e.rx) ** 2 + ((z - e.z) / e.rz) ** 2 <= 1;

export function isLand(x: number, z: number): boolean {
  if (z < COAST_Z && !inRect(x, z, NORDDEICH_BASIN)) return true;
  if (NORDDEICH_MOLES.some((m) => inRect(x, z, m)) || JUIST_MOLES.some((m) => inRect(x, z, m)))
    return true;
  if (inEllipse(x, z, JUIST) && !inRect(x, z, JUIST_BASIN)) return true;
  return false;
}

export const isSandbank = (x: number, z: number) => SANDBANKS.some((s) => inEllipse(x, z, s));

/** Tief genug zum Fahren (JF-AK-04/05). */
export function isNavigable(x: number, z: number): boolean {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) return false;
  return !isLand(x, z) && !isSandbank(x, z);
}

/** Innerhalb eines Hafens (Becken + Zufahrt zwischen den Molen). */
export const isHarbor = (x: number, z: number) =>
  inRect(x, z, [-130, -2160, 130, -1540]) || inRect(x, z, [-120, 1390, 120, 1810]);

export const inBerth = (b: Berth, x: number, z: number) => inRect(x, z, b.rect);

export interface Buoy {
  x: number;
  z: number;
  color: "red" | "green";
}

/** Tonnen paarweise entlang des Fahrwassers: rot im Westen (links Richtung Juist), grün im Osten. */
export const BUOYS: readonly Buoy[] = (() => {
  const out: Buoy[] = [];
  const pts: Pt[] = [[0, -1500], ...FAIRWAY.slice(1)];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1]!;
    const [bx, bz] = pts[i]!;
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len; // links (Westen bei Fahrt nach Norden)
    const nz = (bx - ax) / len;
    for (let d = 150; d < len; d += 350) {
      const x = ax + ((bx - ax) * d) / len;
      const z = az + ((bz - az) * d) / len;
      out.push(
        { x: x + nx * 70, z: z + nz * 70, color: "red" },
        { x: x - nx * 70, z: z - nz * 70, color: "green" },
      );
    }
  }
  return out;
})();
