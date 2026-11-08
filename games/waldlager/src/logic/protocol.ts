import type { World } from "./world.ts";
import { ANIMALS, COLORS, type Animal, type Fire, type Player, type State } from "./sim.ts";

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
  | { v: 1; k: "eat" }
  | { v: 1; k: "build"; kind: "tent" | "fire" | "bridge" };

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
  needs: { hunger: number; rest: number; fitness: number };
  wood: number;
  berries: number;
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
  /** [Art-Index, x, y] */
  animals: [number, number, number][];
  players: PlayerSnap[];
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
      return str(d.name, 12) && str(d.color, 9) && (COLORS as readonly string[]).includes(d.color)
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
    case "eat":
      return { v: 1, k: d.k };
    case "build":
      return d.kind === "tent" || d.kind === "fire" || d.kind === "bridge"
        ? { v: 1, k: "build", kind: d.kind }
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
    str(p.color, 9) &&
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
    num(p.wood) &&
    num(p.berries) &&
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
      needs: q.needs,
      wood: q.wood,
      berries: q.berries,
      radio: q.radio,
      landing: q.landing,
      sleeping: local ? p.sleeping && q.sleeping : q.sleeping,
    });
    if (!local) Object.assign(p, { x: q.x, y: q.y, fx: q.fx, fy: q.fy, moving: q.moving });
  }
  for (const id of Object.keys(s.players)) if (!keep.has(id)) delete s.players[id];
}
