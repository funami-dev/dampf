/**
 * Hilden, von Hand vereinfacht nachgebaut, als Raster aus 5-m-Feldern.
 * Koordinaten in Metern: x = Osten, z = Norden, Ursprung am Alten Markt.
 * Spec: specs/games/hilden.md
 */

export const CELL = 5;
export const SIZE = 1600;
export const HALF = SIZE / 2;
export const N = SIZE / CELL;

export enum Cell {
  Grass = 0,
  Road = 1,
  Pedestrian = 2,
  Plaza = 3,
  Park = 4,
  Water = 5,
  Rail = 6,
  Building = 7,
  Blocked = 8,
}

const WALKABLE = new Set([Cell.Grass, Cell.Road, Cell.Pedestrian, Cell.Plaza, Cell.Park]);
export const isWalkable = (c: Cell) => WALKABLE.has(c);
const isStreet = (c: Cell) => c === Cell.Road || c === Cell.Pedestrian || c === Cell.Plaza;

type Pt = [number, number];

export const STREETS: readonly { name: string; points: Pt[]; width: number; kind: Cell }[] = [
  {
    name: "Mittelstraße",
    points: [
      [0, -5],
      [0, -600],
    ],
    width: 16,
    kind: Cell.Pedestrian,
  },
  {
    name: "Benrather Straße",
    points: [
      [-40, 25],
      [-800, 60],
    ],
    width: 14,
    kind: Cell.Road,
  },
  {
    name: "Gerresheimer Straße",
    points: [
      [10, 60],
      [20, 160],
      [20, 800],
    ],
    width: 14,
    kind: Cell.Road,
  },
  {
    name: "Bahnhofsallee",
    points: [
      [40, 25],
      [300, -100],
      [600, -262],
    ],
    width: 14,
    kind: Cell.Road,
  },
  {
    name: "Walder Straße",
    points: [
      [0, -600],
      [-120, -800],
    ],
    width: 14,
    kind: Cell.Road,
  },
];

export const ITTER: readonly Pt[] = [
  [800, -690],
  [450, -640],
  [100, -700],
  [-250, -650],
  [-550, -700],
  [-800, -660],
];
const RAIL_X = 735;

/** Kleine Gassen in der Innenstadt (ohne Namen). */
const LANES: readonly Pt[][] = [
  [
    [-75, -600],
    [-75, -10],
  ],
  [
    [75, -600],
    [75, -10],
  ],
  [
    [-130, -150],
    [130, -150],
  ],
  [
    [-130, -350],
    [130, -350],
  ],
  [
    [-130, -520],
    [130, -520],
  ],
];

/** Bereiche ohne Raster-Nebenstraßen (Innenstadt, Park). */
const NO_GRID: readonly [number, number, number, number][] = [
  [-130, -620, 130, 120],
  [-500, -560, -230, -330],
];

export interface Landmark {
  id: "alter-markt" | "mittelstrasse" | "reformationskirche" | "bahnhof" | "stadtpark" | "itter";
  name: string;
  /** Beschriftung */
  x: number;
  z: number;
  /** begehbarer Punkt zum „Entdecken“ */
  visit: Pt;
}

export const LANDMARKS: readonly Landmark[] = [
  { id: "alter-markt", name: "Alter Markt", x: 0, z: 20, visit: [0, 15] },
  { id: "mittelstrasse", name: "Mittelstraße", x: 0, z: -300, visit: [0, -300] },
  { id: "reformationskirche", name: "Reformationskirche", x: -5, z: 48, visit: [-5, 28] },
  { id: "bahnhof", name: "Bahnhof Hilden", x: 675, z: -262, visit: [600, -262] },
  { id: "stadtpark", name: "Stadtpark", x: -365, z: -445, visit: [-300, -400] },
  { id: "itter", name: "Itter", x: -460, z: -685, visit: [-460, -685] },
];

/** Sonderbauten (eigene 3D-Modelle, keine Rasterblöcke). */
export const SPECIAL_BUILDINGS: readonly { id: string; rect: [number, number, number, number] }[] =
  [
    { id: "reformationskirche", rect: [-25, 35, 15, 62] },
    { id: "bahnhof", rect: [640, -300, 710, -225] },
  ];

export interface Workplace {
  id: "post" | "baker" | "police" | "fire";
  name: string;
  sign: string;
  rect: [number, number, number, number];
  door: Pt;
  color: number;
}

/** Arbeitsorte, fiktiv platziert. */
export const WORKPLACES: readonly Workplace[] = [
  {
    id: "post",
    name: "Post",
    sign: "POST",
    rect: [-28, -215, -10, -185],
    door: [-5, -200],
    color: 0xffcc00,
  },
  {
    id: "baker",
    name: "Bäckerei",
    sign: "BÄCKEREI",
    rect: [10, -130, 26, -110],
    door: [5, -120],
    color: 0xc98b4a,
  },
  {
    id: "police",
    name: "Polizeiwache",
    sign: "POLIZEI",
    rect: [-320, 48, -290, 70],
    door: [-305, 39],
    color: 0x2f6fb3,
  },
  {
    id: "fire",
    name: "Feuerwache",
    sign: "FEUERWEHR",
    rect: [30, 285, 62, 320],
    door: [20, 302],
    color: 0xd32f2f,
  },
];

export const JOB_BOARD: Pt = [25, 15];

const HOUSE_ANCHORS: readonly Pt[] = [
  [-580, -250],
  [450, 420],
  [-460, 470],
];

export interface House {
  id: 1 | 2 | 3;
  name: string;
  /** Mitte des Gebäudefelds */
  cell: Pt;
  /** begehbarer Punkt vor der Tür */
  door: Pt;
}

function hash(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function segDist(px: number, pz: number, [ax, az]: Pt, [bx, bz]: Pt) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}

export interface City {
  cells: Uint8Array;
  /** Gebäudehöhe in Metern (0 = kein Rasterblock) */
  heights: Uint8Array;
  houses: House[];
  /** Haustüren in Wohnvierteln (für Lieferungen) */
  doors: Pt[];
  /** zufällige Straßenpunkte (für Fundsachen und Einsätze) */
  spots: Pt[];
  jobBoard: Pt;
  index(x: number, z: number): number;
  center(i: number): Pt;
  at(x: number, z: number): Cell;
  walkableAt(x: number, z: number): boolean;
  workplace(id: Workplace["id"]): Workplace;
}

export function buildCity(): City {
  const cells = new Uint8Array(N * N).fill(Cell.Grass);
  const heights = new Uint8Array(N * N);
  const idx = (c: number, r: number) => r * N + c;
  const center = (i: number): Pt => [
    (i % N) * CELL - HALF + CELL / 2,
    Math.floor(i / N) * CELL - HALF + CELL / 2,
  ];
  const index = (x: number, z: number) => {
    const c = Math.floor((x + HALF) / CELL);
    const r = Math.floor((z + HALF) / CELL);
    return c < 0 || r < 0 || c >= N || r >= N ? -1 : idx(c, r);
  };
  const each = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    fn: (i: number, x: number, z: number) => void,
  ) => {
    for (
      let r = Math.max(0, Math.floor((z0 + HALF) / CELL));
      r <= Math.min(N - 1, Math.floor((z1 + HALF) / CELL));
      r++
    )
      for (
        let c = Math.max(0, Math.floor((x0 + HALF) / CELL));
        c <= Math.min(N - 1, Math.floor((x1 + HALF) / CELL));
        c++
      ) {
        const i = idx(c, r);
        const [x, z] = center(i);
        fn(i, x, z);
      }
  };
  const rect = (x0: number, z0: number, x1: number, z1: number, t: Cell) =>
    each(x0, z0, x1, z1, (i, x, z) => {
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1) cells[i] = t;
    });
  const line = (
    pts: readonly Pt[],
    width: number,
    t: Cell,
    skip?: (x: number, z: number) => boolean,
  ) => {
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1]!;
      const b = pts[k]!;
      each(
        Math.min(a[0], b[0]) - width,
        Math.min(a[1], b[1]) - width,
        Math.max(a[0], b[0]) + width,
        Math.max(a[1], b[1]) + width,
        (i, x, z) => {
          if (segDist(x, z, a, b) <= width / 2 && !skip?.(x, z)) cells[i] = t;
        },
      );
    }
  };
  const inside = (x: number, z: number, [x0, z0, x1, z1]: readonly number[]) =>
    x >= x0! && x <= x1! && z >= z0! && z <= z1!;

  // Wasser, Nebenstraßen (Raster), Hauptstraßen, Park, Plätze, Gleise
  line(ITTER, 14, Cell.Water);
  const noGrid = (x: number, z: number) => NO_GRID.some((r) => inside(x, z, r));
  for (let x = -700; x <= 700; x += 120)
    line(
      [
        [x, -HALF],
        [x, HALF],
      ],
      10,
      Cell.Road,
      noGrid,
    );
  for (let z = -740; z <= 760; z += 120)
    line(
      [
        [-HALF, z],
        [HALF, z],
      ],
      10,
      Cell.Road,
      noGrid,
    );
  for (const l of LANES) line(l, 8, Cell.Road);
  for (const s of STREETS) if (s.kind === Cell.Road) line(s.points, s.width, s.kind);
  rect(-500, -560, -230, -330, Cell.Park);
  each(-420, -480, -320, -420, (i, x, z) => {
    if (((x + 370) / 45) ** 2 + ((z + 450) / 28) ** 2 <= 1) cells[i] = Cell.Water;
  });
  rect(-45, -5, 45, 65, Cell.Plaza);
  rect(580, -310, 640, -215, Cell.Plaza);
  for (const s of STREETS) if (s.kind === Cell.Pedestrian) line(s.points, s.width, s.kind);
  line(
    [
      [RAIL_X, -HALF],
      [RAIL_X, HALF],
    ],
    14,
    Cell.Rail,
  );
  rect(RAIL_X + 7, -HALF, HALF, HALF, Cell.Blocked);
  for (let k = 0; k < N; k++) {
    cells[idx(k, 0)] =
      cells[idx(k, N - 1)] =
      cells[idx(0, k)] =
      cells[idx(N - 1, k)] =
        Cell.Blocked;
  }

  // Bebauung entlang der Straßen (Abstand zur Straße per Breitensuche)
  const dist = new Int16Array(N * N).fill(-1);
  const queue: number[] = [];
  cells.forEach((t, i) => {
    if (isStreet(t)) {
      dist[i] = 0;
      queue.push(i);
    }
  });
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const c = i % N;
    const r = Math.floor(i / N);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= N || nr >= N) continue;
      const j = idx(nc, nr);
      if (dist[j] === -1) {
        dist[j] = dist[i]! + 1;
        queue.push(j);
      }
    }
  }
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== Cell.Grass) continue;
    const [x, z] = center(i);
    const d = dist[i]!;
    const central = inside(x, z, [-260, -650, 260, 200]);
    const lot = hash(Math.floor(x / 15), Math.floor(z / 15));
    if (central ? d >= 1 && d <= 4 : d >= 2 && d <= 3 && lot > 0.12) {
      cells[i] = Cell.Building;
      heights[i] = central ? 10 + Math.floor(lot * 3) * 2 : 6 + Math.floor(lot * 2) * 2;
    }
  }

  // Sonderbauten und Arbeitsorte
  for (const b of SPECIAL_BUILDINGS) {
    rect(...b.rect, Cell.Building);
    each(...b.rect, (i) => (heights[i] = 0));
  }
  for (const w of WORKPLACES) {
    rect(...w.rect, Cell.Building);
    each(...w.rect, (i, x, z) => {
      if (inside(x, z, w.rect)) heights[i] = 0;
    });
  }

  const at = (x: number, z: number): Cell => {
    const i = index(x, z);
    return i < 0 ? Cell.Blocked : (cells[i] as Cell);
  };
  const walkableAt = (x: number, z: number) => isWalkable(at(x, z));

  // Haustüren: Wohnhaus-Feld mit Straße direkt daneben
  const special = (x: number, z: number) =>
    WORKPLACES.some((w) =>
      inside(x, z, [w.rect[0] - 20, w.rect[1] - 20, w.rect[2] + 20, w.rect[3] + 20]),
    ) || SPECIAL_BUILDINGS.some((b) => inside(x, z, b.rect));
  const reach = reachableCells(cells, index(0, 20));
  const doorsWithCell: { cell: Pt; door: Pt }[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== Cell.Building || heights[i] === 0) continue;
    const [x, z] = center(i);
    if (special(x, z) || inside(x, z, [-260, -650, 260, 200])) continue;
    for (const [dx, dz] of [
      [CELL, 0],
      [-CELL, 0],
      [0, CELL],
      [0, -CELL],
    ] as const) {
      const j = index(x + dx, z + dz);
      if (j >= 0 && isWalkable(cells[j] as Cell) && reach[j]) {
        doorsWithCell.push({ cell: [x, z], door: center(j) });
        break;
      }
    }
  }
  const doors = doorsWithCell.filter((_, k) => k % 7 === 0).map((d) => d.door);

  const houses: House[] = HOUSE_ANCHORS.map(([ax, az], k) => {
    let best = doorsWithCell[0]!;
    let bd = Infinity;
    for (const d of doorsWithCell) {
      const dd = Math.hypot(d.cell[0] - ax, d.cell[1] - az);
      if (dd < bd) {
        bd = dd;
        best = d;
      }
    }
    return { id: (k + 1) as 1 | 2 | 3, name: `Haus ${k + 1}`, cell: best.cell, door: best.door };
  });

  const spots: Pt[] = [];
  for (let i = 0; i < cells.length; i += 37) {
    if ((cells[i] === Cell.Road || cells[i] === Cell.Park) && reach[i]) spots.push(center(i));
  }

  return {
    cells,
    heights,
    houses,
    doors,
    spots,
    jobBoard: JOB_BOARD,
    index,
    center,
    at,
    walkableAt,
    workplace: (id) => WORKPLACES.find((w) => w.id === id)!,
  };
}

function reachableCells(cells: Uint8Array, start: number): Uint8Array {
  const seen = new Uint8Array(cells.length);
  if (start < 0 || !isWalkable(cells[start] as Cell)) return seen;
  const queue = [start];
  seen[start] = 1;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const c = i % N;
    for (const j of [c + 1 < N ? i + 1 : -1, c > 0 ? i - 1 : -1, i + N, i - N]) {
      if (j < 0 || j >= cells.length || seen[j] || !isWalkable(cells[j] as Cell)) continue;
      seen[j] = 1;
      queue.push(j);
    }
  }
  return seen;
}

/** Erreichbarkeit zu Fuß ab einem Punkt (HI-AK-02). */
export function reachableFrom(city: City, x: number, z: number) {
  const seen = reachableCells(city.cells, city.index(x, z));
  return (tx: number, tz: number) => {
    const i = city.index(tx, tz);
    return i >= 0 && seen[i] === 1;
  };
}
