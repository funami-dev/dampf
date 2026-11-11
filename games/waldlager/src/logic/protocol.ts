import type { World } from "./world.ts";
import {
  ANIMALS,
  FOOD_KINDS,
  ITEM_KINDS,
  isColor,
  type Animal,
  type Chest,
  type ItemKind,
  type Fire,
  type FoodKind,
  type Player,
  type State,
} from "./sim.ts";

/** Netzwerk-Protokoll (WL-AK-12): JSON mit Versionsnummer, ungültige Nachrichten → null. */
export const VERSION = 1;

export type GuestMsg =
  | { v: 1; k: "hello"; name: string; color: string }
  | {
      v: 1;
      k: "move";
      x: number;
      y: number;
      fx: number;
      fy: number;
      moving: boolean;
      running: boolean;
    }
  | { v: 1; k: "act" }
  | { v: 1; k: "eat"; food?: FoodKind }
  | { v: 1; k: "build"; kind: "tent" | "fire" | "bridge" | "rod" }
  | { v: 1; k: "chest"; kind: ItemKind; dir: "put" | "take" }
  | { v: 1; k: "give"; food: FoodKind };

export interface PlayerSnap {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  fx: number;
  fy: number;
  moving: boolean;
  sleeping: boolean;
  tent: { x: number; y: number } | null;
  /** warmth fehlt bei älteren Gastgebern → 100 */
  needs: { hunger: number; rest: number; fitness: number; warmth?: number };
  wood: number;
  berries: number;
  /** Vorräte (fehlen bei älteren Gastgebern → 0) */
  apples?: number;
  mushrooms?: number;
  cans?: number;
  /** Angeln (WL-AK-54; fehlen bei älteren Gastgebern) */
  fish?: number;
  rod?: boolean;
  radio: boolean;
  landing: number;
}

/** Nur was in der Nähe der Gäste liegt wird geschickt (große Insel, max. 16 KB je Nachricht) */
export const SNAP_RADIUS = 30;

export interface Snap {
  v: 1;
  k: "snap";
  total: number;
  stumps: number[];
  /** [Strauch-Index, Beeren] der Sträucher in der Nähe */
  berries: [number, number][];
  fires: Fire[];
  /** gebaute Brückenfelder (Feld-Index) */
  bridges: number[];
  /** Regenbogenspur rund um die Gäste: [Feld-Index, sichtbar bis] (fehlt bei älteren Gastgebern) */
  trail?: [number, number][];
  /** [Art-Index, x, y] */
  animals: [number, number, number][];
  players: PlayerSnap[];
  /** Hütte und Essen (WL-AK-42; fehlen bei älteren Gastgebern) */
  appleEmpty?: [number, number][];
  mushrooms?: number[];
  /** ältere Gastgeber (vor der Truhe) */
  hutCans?: number;
  /** Truhen (WL-AK-56) */
  hutChest?: Chest;
  tentChests?: Record<string, Chest>;
  /** ruhende Fischstellen [Index, bis] (WL-AK-54) */
  fishRest?: [number, number][];
}

export type HostMsg =
  { v: 1; k: "welcome"; seed: number } | Snap | { v: 1; k: "toast"; text: string };

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const str = (x: unknown, max = 200): x is string => typeof x === "string" && x.length <= max;
const bool = (x: unknown): x is boolean => typeof x === "boolean";
const obj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);

export function parseGuest(d: unknown): GuestMsg | null {
  if (!obj(d) || d.v !== VERSION) return null;
  switch (d.k) {
    case "hello":
      return str(d.name, 12) && isColor(d.color)
        ? { v: 1, k: "hello", name: d.name, color: d.color }
        : null;
    case "move":
      return num(d.x) && num(d.y) && num(d.fx) && num(d.fy) && bool(d.moving) && bool(d.running)
        ? {
            v: 1,
            k: "move",
            x: d.x,
            y: d.y,
            fx: d.fx,
            fy: d.fy,
            moving: d.moving,
            running: d.running,
          }
        : null;
    case "act":
      return { v: 1, k: "act" };
    case "eat":
      if (d.food === undefined) return { v: 1, k: "eat" };
      return (FOOD_KINDS as unknown[]).includes(d.food)
        ? { v: 1, k: "eat", food: d.food as FoodKind }
        : null;
    case "build":
      return d.kind === "tent" || d.kind === "fire" || d.kind === "bridge" || d.kind === "rod"
        ? { v: 1, k: "build", kind: d.kind }
        : null;
    case "chest":
      return (ITEM_KINDS as readonly unknown[]).includes(d.kind) &&
        (d.dir === "put" || d.dir === "take")
        ? { v: 1, k: "chest", kind: d.kind as ItemKind, dir: d.dir }
        : null;
    case "give":
      return (FOOD_KINDS as unknown[]).includes(d.food)
        ? { v: 1, k: "give", food: d.food as FoodKind }
        : null;
    default:
      return null;
  }
}

function playerSnap(p: unknown): p is PlayerSnap {
  if (!obj(p) || !obj(p.needs)) return false;
  const t = p.tent;
  return (
    str(p.id, 20) &&
    str(p.name, 12) &&
    isColor(p.color) &&
    num(p.x) &&
    num(p.y) &&
    num(p.fx) &&
    num(p.fy) &&
    bool(p.moving) &&
    bool(p.sleeping) &&
    (t === null || (obj(t) && num(t.x) && num(t.y))) &&
    num(p.needs.hunger) &&
    num(p.needs.rest) &&
    num(p.needs.fitness) &&
    (p.needs.warmth === undefined || num(p.needs.warmth)) &&
    num(p.wood) &&
    num(p.berries) &&
    (["apples", "mushrooms", "cans", "fish"] as const).every(
      (k) => p[k] === undefined || num(p[k]),
    ) &&
    (p.rod === undefined || bool(p.rod)) &&
    bool(p.radio) &&
    num(p.landing)
  );
}

export function parseHost(d: unknown): HostMsg | null {
  if (!obj(d) || d.v !== VERSION) return null;
  if (d.k === "welcome") return num(d.seed) ? { v: 1, k: "welcome", seed: d.seed } : null;
  if (d.k === "toast") return str(d.text) ? { v: 1, k: "toast", text: d.text } : null;
  if (d.k !== "snap") return null;
  if (
    !num(d.total) ||
    !Array.isArray(d.stumps) ||
    !d.stumps.every(num) ||
    !Array.isArray(d.berries) ||
    !d.berries.every((b) => Array.isArray(b) && b.length === 2 && b.every(num)) ||
    !Array.isArray(d.bridges) ||
    !d.bridges.every(num) ||
    (d.trail !== undefined &&
      (!Array.isArray(d.trail) ||
        !d.trail.every((t) => Array.isArray(t) && t.length === 2 && t.every(num)))) ||
    (d.appleEmpty !== undefined &&
      (!Array.isArray(d.appleEmpty) ||
        !d.appleEmpty.every((t) => Array.isArray(t) && t.length === 2 && t.every(num)))) ||
    (d.mushrooms !== undefined && (!Array.isArray(d.mushrooms) || !d.mushrooms.every(num))) ||
    (d.hutCans !== undefined && !num(d.hutCans)) ||
    (d.hutChest !== undefined && !isChest(d.hutChest)) ||
    (d.tentChests !== undefined &&
      (!obj(d.tentChests) || !Object.values(d.tentChests).every(isChest))) ||
    (d.fishRest !== undefined &&
      (!Array.isArray(d.fishRest) ||
        !d.fishRest.every((t) => Array.isArray(t) && t.length === 2 && t.every(num)))) ||
    !Array.isArray(d.fires) ||
    !d.fires.every((f) => obj(f) && num(f.id) && num(f.x) && num(f.y) && num(f.until)) ||
    !Array.isArray(d.animals) ||
    !d.animals.every(
      (a) =>
        Array.isArray(a) && a.length === 3 && a.every(num) && ANIMALS[a[0] as number] !== undefined,
    ) ||
    !Array.isArray(d.players) ||
    !d.players.every(playerSnap)
  )
    return null;
  return d as unknown as Snap;
}

/** Gastgeber: Zustand → Schnappschuss (nur rund um die angegebenen Orte, meist die Gäste) */
export function toSnap(w: World, s: State, focus: { x: number; y: number }[]): Snap {
  const near = (x: number, y: number) =>
    focus.some((f) => Math.abs(f.x - x) <= SNAP_RADIUS && Math.abs(f.y - y) <= SNAP_RADIUS);
  return {
    v: 1,
    k: "snap",
    total: s.total,
    stumps: Object.keys(s.stumps)
      .map(Number)
      .filter((k) => {
        const t = w.trees[k];
        return !!t && near(t.x, t.y);
      }),
    berries: w.bushes.flatMap((b, i): [number, number][] =>
      near(b.x, b.y) ? [[i, s.berries[i]!]] : [],
    ),
    fires: s.fires.filter((f) => near(f.x, f.y)).map((f) => ({ ...f })),
    bridges: Object.keys(s.bridges).map(Number),
    trail: Object.entries(s.trail)
      .map(([k, until]): [number, number] => [Number(k), until])
      .filter(([k, until]) => until > s.total && near(k % w.size, Math.floor(k / w.size))),
    appleEmpty: Object.entries(s.appleEmpty)
      .map(([k, until]): [number, number] => [Number(k), until])
      .filter(([k]) => {
        const t = w.trees[k];
        return !!t && near(t.x, t.y);
      }),
    mushrooms: s.mushrooms.filter((m) => near(m % w.size, Math.floor(m / w.size))),
    hutChest: { ...s.hutChest },
    tentChests: Object.fromEntries(
      Object.entries(s.tentChests).filter(([id]) => {
        const t = s.players[id]?.tent;
        return !!t && near(t.x, t.y);
      }),
    ),
    fishRest: Object.entries(s.fishRest)
      .map(([k, until]): [number, number] => [Number(k), until])
      .filter(([k, until]) => {
        const f = w.fish[k];
        return until > s.total && !!f && near(f.x, f.y);
      }),
    animals: s.animals
      .filter((a) => near(a.x, a.y))
      .map((a) => [ANIMALS.indexOf(a.kind), +a.x.toFixed(2), +a.y.toFixed(2)]),
    players: Object.values(s.players).map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      x: +p.x.toFixed(2),
      y: +p.y.toFixed(2),
      fx: +p.fx.toFixed(2),
      fy: +p.fy.toFixed(2),
      moving: p.moving,
      sleeping: p.sleeping,
      tent: p.tent,
      needs: p.needs,
      wood: p.wood,
      berries: p.berries,
      apples: p.apples,
      mushrooms: p.mushrooms,
      cans: p.cans,
      fish: p.fish,
      rod: p.rod,
      radio: p.radio,
      landing: +p.landing.toFixed(2),
    })),
  };
}

/** Gast: Schnappschuss übernehmen; die eigene Position bleibt lokal. */
export function applySnap(s: State, snap: Snap, me: string, first: boolean) {
  s.total = snap.total;
  s.stumps = Object.fromEntries(snap.stumps.map((k) => [k, Infinity]));
  for (const [i, n] of snap.berries) if (i >= 0 && i < s.berries.length) s.berries[i] = n;
  s.fires = snap.fires;
  s.bridges = Object.fromEntries(snap.bridges.map((i) => [i, 1 as const]));
  s.trail = Object.fromEntries(snap.trail ?? []);
  s.appleEmpty = Object.fromEntries(snap.appleEmpty ?? []);
  s.mushrooms = snap.mushrooms ?? [];
  if (snap.hutChest) s.hutChest = snap.hutChest;
  else if (snap.hutCans !== undefined) s.hutChest = { cans: snap.hutCans };
  if (snap.tentChests) s.tentChests = snap.tentChests;
  s.fishRest = Object.fromEntries(snap.fishRest ?? []);
  s.animals = snap.animals.map(([k, x, y], i): Animal => {
    const prev = s.animals[i];
    return prev && prev.kind === ANIMALS[k]
      ? Object.assign(prev, { x, y, tx: x, ty: y })
      : { kind: ANIMALS[k]!, x, y, tx: x, ty: y, fleeing: false };
  });
  const keep = new Set<string>();
  for (const q of snap.players) {
    keep.add(q.id);
    const p: Player =
      s.players[q.id] ??
      (s.players[q.id] = {
        ...q,
        needs: { ...q.needs, warmth: q.needs.warmth ?? 100 },
        apples: 0,
        mushrooms: 0,
        cans: 0,
        fish: 0,
        rod: false,
        hutSeen: true,
        exhausted: false,
        running: false,
        chop: null,
        home: { x: Math.floor(q.x), y: Math.floor(q.y) },
      });
    const local = q.id === me && !first;
    Object.assign(p, {
      name: q.name,
      color: q.color,
      tent: q.tent,
      needs: { ...q.needs, warmth: q.needs.warmth ?? 100 },
      wood: q.wood,
      berries: q.berries,
      apples: q.apples ?? 0,
      mushrooms: q.mushrooms ?? 0,
      cans: q.cans ?? 0,
      fish: q.fish ?? 0,
      rod: q.rod === true,
      radio: q.radio,
      landing: q.landing,
      sleeping: local ? p.sleeping && q.sleeping : q.sleeping,
    });
    if (!local) Object.assign(p, { x: q.x, y: q.y, fx: q.fx, fy: q.fy, moving: q.moving });
  }
  for (const id of Object.keys(s.players)) if (!keep.has(id)) delete s.players[id];
}

/** Truhen-Inhalt: nur bekannte Sachen mit Zahlen */
export function isChest(c: unknown): c is Chest {
  return (
    obj(c) &&
    Object.entries(c).every(
      ([k, v]) => (ITEM_KINDS as readonly string[]).includes(k) && num(v) && v >= 0,
    )
  );
}
