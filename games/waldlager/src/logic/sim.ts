import { DAY, START_TIME, isNight } from "./daytime.ts";
import { FULL, RATES, eatBerry, stepNeeds, type Needs } from "./needs.ts";
import { T, idx, inside, terrainWalkable, type World } from "./world.ts";

/** Spielstand einer Welt (Spec: specs/games/waldlager.md). Reine Daten, serialisierbar. */
export const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#e67e22", "#1abc9c"] as const;
export const ANIMALS = ["reh", "hase", "fuchs", "eichhoernchen"] as const;
export type AnimalKind = (typeof ANIMALS)[number];

export const LIMITS = { wood: 30, berries: 20 };
export const COSTS = { tent: 8, fire: 3 };
export const TREE = { hits: 4, wood: 3, regrow: DAY };
export const BUSH = { berries: 4, refill: DAY / 2 };
export const FIRE = { burn: 180, stoke: 120, max: 600, warm: 2.5 };
export const SPEED = { walk: 3, run: 5.5, hungry: 0.6 };
const RADIUS = 0.3;
const REACH = 1.3;

export interface Player {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  fx: number;
  fy: number;
  needs: Needs;
  wood: number;
  berries: number;
  tent: { x: number; y: number } | null;
  sleeping: boolean;
  exhausted: boolean;
  moving: boolean;
  running: boolean;
  chop: { tree: number; hits: number } | null;
}

export interface Fire {
  id: number;
  x: number;
  y: number;
  until: number;
}

export interface Animal {
  kind: AnimalKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  fleeing: boolean;
}

export interface State {
  total: number;
  /** Baum-Index → Zeitpunkt des Nachwachsens (Baumstumpf) */
  stumps: Record<number, number>;
  /** Beeren je Strauch */
  berries: number[];
  /** Strauch-Index → Zeitpunkt des Nachfüllens */
  refill: Record<number, number>;
  fires: Fire[];
  nextFire: number;
  animals: Animal[];
  players: Record<string, Player>;
  rand: number;
}

export interface Input {
  x: number;
  y: number;
  run: boolean;
}

function nextRand(s: State): number {
  s.rand = (s.rand + 0x6d2b79f5) | 0;
  let t = s.rand;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createState(w: World): State {
  const s: State = {
    total: START_TIME,
    stumps: {},
    berries: w.bushes.map(() => BUSH.berries),
    refill: {},
    fires: [],
    nextFire: 1,
    animals: [],
    players: {},
    rand: w.seed ^ 0x5eed,
  };
  for (let k = 0; k < 32; k++) {
    for (let tries = 0; tries < 50; tries++) {
      const x = Math.floor(nextRand(s) * w.size);
      const y = Math.floor(nextRand(s) * w.size);
      if (Math.hypot(x - w.start.x, y - w.start.y) < 8 || !free(w, s, x, y)) continue;
      s.animals.push({
        kind: ANIMALS[k % ANIMALS.length]!,
        x: x + 0.5,
        y: y + 0.5,
        tx: x + 0.5,
        ty: y + 0.5,
        fleeing: false,
      });
      break;
    }
  }
  return s;
}

export function addPlayer(w: World, s: State, id: string, name: string, color: string): Player {
  const p: Player = {
    id,
    name: name.trim().slice(0, 12) || "Wanderer",
    color,
    x: w.start.x + 0.5,
    y: w.start.y + 0.5,
    fx: 1,
    fy: 0,
    needs: { ...FULL },
    wood: 0,
    berries: 0,
    tent: null,
    sleeping: false,
    exhausted: false,
    moving: false,
    running: false,
    chop: null,
  };
  s.players[id] = p;
  return p;
}

export const isStump = (s: State, tree: number) => s.stumps[tree] !== undefined;
const fireAt = (s: State, x: number, y: number) => s.fires.find((f) => f.x === x && f.y === y);
const tentAt = (s: State, x: number, y: number) =>
  Object.values(s.players).some((p) => p.tent && p.tent.x === x && p.tent.y === y);

/** Feld frei begehbar (WL-AK-02): kein Wasser/Fels, kein stehender Baum, kein Zelt, kein Feuer. */
export function free(w: World, s: State, x: number, y: number): boolean {
  if (!inside(w, x, y)) return false;
  const i = idx(w, x, y);
  if (!terrainWalkable(w.terrain[i]!)) return false;
  const tree = w.treeAt[i]!;
  if (tree && !isStump(s, tree - 1)) return false;
  return !tentAt(s, x, y) && !fireAt(s, x, y);
}

function canStand(w: World, s: State, x: number, y: number): boolean {
  for (const [dx, dy] of [
    [-RADIUS, -RADIUS],
    [RADIUS, -RADIUS],
    [-RADIUS, RADIUS],
    [RADIUS, RADIUS],
  ] as const)
    if (!free(w, s, Math.floor(x + dx), Math.floor(y + dy))) return false;
  return true;
}

/** Bewegt mit Gleiten an Hindernissen entlang. */
function moveBody(w: World, s: State, b: { x: number; y: number }, dx: number, dy: number) {
  if (canStand(w, s, b.x + dx, b.y)) b.x += dx;
  if (canStand(w, s, b.x, b.y + dy)) b.y += dy;
}

/** Bildschirm-Eingabe (rechts/unten) → Kachel-Richtung (isometrisch). */
export function screenToTile(sx: number, sy: number): [number, number] {
  return [(sx + sy) / Math.SQRT2, (sy - sx) / Math.SQRT2];
}

export function movePlayer(w: World, s: State, p: Player, input: Input, dt: number) {
  const len = Math.hypot(input.x, input.y);
  p.moving = len > 0.15 && !p.sleeping;
  if (len > 0.15 && p.sleeping) wake(p);
  if (!p.moving) {
    p.running = false;
    return;
  }
  p.chop = null;
  const n = Math.min(1, len);
  const [tx, ty] = screenToTile(input.x / len, input.y / len);
  p.fx = tx;
  p.fy = ty;
  p.running = input.run && !p.exhausted;
  let speed = p.running ? SPEED.run : SPEED.walk;
  if (p.needs.hunger <= 0) speed *= SPEED.hungry;
  const step = speed * n * dt;
  // kleine Schritte gegen Tunneln
  const parts = Math.ceil(step / 0.2);
  for (let k = 0; k < parts; k++) moveBody(w, s, p, (tx * step) / parts, (ty * step) / parts);
}

export const atFire = (s: State, p: { x: number; y: number }) =>
  s.fires.some(
    (f) => f.until > s.total && Math.hypot(f.x + 0.5 - p.x, f.y + 0.5 - p.y) <= FIRE.warm,
  );

function wake(p: Player) {
  p.sleeping = false;
}

export interface GameEvent {
  player: string;
  text: string;
}

/** Ein Zeitschritt der Welt: Uhr, Nachwachsen, Feuer, Tiere, Leisten (WL-AK-03..09). */
export function stepWorld(w: World, s: State, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  const players = Object.values(s.players);
  const night = isNight(s.total);
  const allAsleep = players.length > 0 && players.every((p) => p.sleeping);
  s.total += dt * (allAsleep && night ? 4 : 1);
  for (const [k, at] of Object.entries(s.stumps)) if (at <= s.total) delete s.stumps[Number(k)];
  for (const [k, at] of Object.entries(s.refill))
    if (at <= s.total) {
      s.berries[Number(k)] = BUSH.berries;
      delete s.refill[Number(k)];
    }
  stepAnimals(w, s, dt, night);
  for (const p of players) {
    p.needs = stepNeeds(p.needs, dt, {
      night,
      running: p.running,
      moving: p.moving,
      sleeping: p.sleeping,
      atFire: atFire(s, p),
    });
    if (p.needs.fitness <= 0) p.exhausted = true;
    if (p.exhausted && p.needs.fitness >= 20) p.exhausted = false;
    if (p.sleeping && p.needs.rest >= 100) {
      wake(p);
      events.push({ player: p.id, text: "Ausgeschlafen!" });
    }
    if (p.needs.rest <= 0 && !p.sleeping) {
      // WL-AK-04: einschlafen, am Zelt bzw. Startpunkt aufwachen
      const home = p.tent ? nearFree(w, s, p.tent.x, p.tent.y) : { x: w.start.x, y: w.start.y };
      p.x = home.x + 0.5;
      p.y = home.y + 0.5;
      p.needs = { ...p.needs, rest: 50 };
      p.chop = null;
      events.push({ player: p.id, text: "Du bist vor Müdigkeit eingeschlafen …" });
    }
  }
  return events;
}

function nearFree(w: World, s: State, x: number, y: number) {
  for (let r = 1; r < 6; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (free(w, s, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  return { x: w.start.x, y: w.start.y };
}

function stepAnimals(w: World, s: State, dt: number, night: boolean) {
  const players = Object.values(s.players);
  for (const a of s.animals) {
    const near = players.find((p) => Math.hypot(p.x - a.x, p.y - a.y) < 4);
    if (near) {
      const d = Math.hypot(a.x - near.x, a.y - near.y) || 1;
      a.tx = a.x + ((a.x - near.x) / d) * 5;
      a.ty = a.y + ((a.y - near.y) / d) * 5;
      a.fleeing = true;
    } else if (a.fleeing || Math.hypot(a.tx - a.x, a.ty - a.y) < 0.2 || nextRand(s) < dt * 0.05) {
      a.fleeing = false;
      if (nextRand(s) < 0.6) {
        a.tx = a.x + (nextRand(s) - 0.5) * 10;
        a.ty = a.y + (nextRand(s) - 0.5) * 10;
      } else {
        a.tx = a.x;
        a.ty = a.y;
      }
    }
    if (night && !a.fleeing) continue;
    const dx = a.tx - a.x;
    const dy = a.ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) continue;
    const step = Math.min(d, (a.fleeing ? 4 : 1.2) * dt);
    const bx = a.x;
    const by = a.y;
    moveBody(w, s, a, (dx / d) * step, (dy / d) * step);
    if (a.x === bx && a.y === by) {
      a.tx = a.x;
      a.ty = a.y;
    }
  }
}

export type ActionKind = "chop" | "pick" | "sleep" | "wake" | "stoke";

/** Was die Aktionstaste gerade tun würde (für Button-Beschriftung). */
export function actionFor(
  w: World,
  s: State,
  p: Player,
): { kind: ActionKind; label: string; target: number } | null {
  if (p.sleeping) return { kind: "wake", label: "Aufstehen", target: -1 };
  const opts: { kind: ActionKind; label: string; target: number; d: number }[] = [];
  const cx = Math.floor(p.x);
  const cy = Math.floor(p.y);
  for (let y = cy - 2; y <= cy + 2; y++)
    for (let x = cx - 2; x <= cx + 2; x++) {
      if (!inside(w, x, y)) continue;
      const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
      if (d > REACH + 0.3) continue;
      const tree = w.treeAt[idx(w, x, y)]!;
      if (tree && !isStump(s, tree - 1))
        opts.push({ kind: "chop", label: "Holz hacken", target: tree - 1, d });
    }
  w.bushes.forEach((b, i) => {
    const d = Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y);
    if (d <= REACH && s.berries[i]! > 0)
      opts.push({ kind: "pick", label: "Beeren pflücken", target: i, d });
  });
  for (const f of s.fires) {
    const d = Math.hypot(f.x + 0.5 - p.x, f.y + 0.5 - p.y);
    if (d <= REACH + 0.3 && p.wood > 0)
      opts.push({
        kind: "stoke",
        label: f.until > s.total ? "Holz nachlegen" : "Feuer anzünden",
        target: f.id,
        d,
      });
  }
  if (p.tent && Math.hypot(p.tent.x + 0.5 - p.x, p.tent.y + 0.5 - p.y) <= REACH + 0.3)
    opts.push({ kind: "sleep", label: "Schlafen", target: -1, d: 0.5 });
  opts.sort((a, b) => a.d - b.d);
  const best = opts[0];
  return best ? { kind: best.kind, label: best.label, target: best.target } : null;
}

/** Aktion ausführen (WL-AK-05/06/07). Gibt eine Meldung zurück oder null. */
export function act(w: World, s: State, p: Player): string | null {
  const a = actionFor(w, s, p);
  if (!a) return null;
  switch (a.kind) {
    case "wake":
      wake(p);
      return "Guten Morgen!";
    case "sleep":
      p.sleeping = true;
      p.chop = null;
      return "Gute Nacht …";
    case "chop": {
      if (p.exhausted) return "Zu erschöpft – kurz ausruhen.";
      if (p.wood >= LIMITS.wood) return "Du kannst nicht mehr Holz tragen.";
      const t = w.trees[a.target]!;
      p.fx = t.x + 0.5 - p.x;
      p.fy = t.y + 0.5 - p.y;
      if (!p.chop || p.chop.tree !== a.target) p.chop = { tree: a.target, hits: 0 };
      p.chop.hits++;
      p.needs = { ...p.needs, fitness: Math.max(0, p.needs.fitness - RATES.chopCost) };
      if (p.needs.fitness <= 0) p.exhausted = true;
      if (p.chop.hits < TREE.hits) return "Tock!";
      p.chop = null;
      s.stumps[a.target] = s.total + TREE.regrow;
      p.wood = Math.min(LIMITS.wood, p.wood + TREE.wood);
      return `+${TREE.wood} Holz`;
    }
    case "pick": {
      if (p.berries >= LIMITS.berries) return "Deine Taschen sind voll.";
      const n = Math.min(s.berries[a.target]!, LIMITS.berries - p.berries);
      p.berries += n;
      s.berries[a.target]! -= n;
      if (s.berries[a.target] === 0) s.refill[a.target] = s.total + BUSH.refill;
      return `+${n} Beeren`;
    }
    case "stoke": {
      const f = s.fires.find((x) => x.id === a.target)!;
      p.wood--;
      f.until = Math.min(s.total + FIRE.max, Math.max(f.until, s.total) + FIRE.stoke);
      return "Das Feuer brennt.";
    }
  }
}

export function eat(p: Player): string {
  if (p.berries <= 0) return "Keine Beeren dabei – such einen Strauch!";
  p.berries--;
  p.needs = eatBerry(p.needs);
  return "Lecker!";
}

/** Feld vor der Figur, auf dem gebaut wird */
export function buildSpot(p: Player) {
  const d = Math.hypot(p.fx, p.fy) || 1;
  return { x: Math.floor(p.x + (p.fx / d) * 1.2), y: Math.floor(p.y + (p.fy / d) * 1.2) };
}

/** Frei, eben, begehbar, ohne Strauch, nicht unter einer Figur */
export function canBuildAt(w: World, s: State, x: number, y: number): boolean {
  if (!free(w, s, x, y)) return false;
  const i = idx(w, x, y);
  if (w.terrain[i] === T.FORD || w.terrain[i] === T.BRIDGE || w.treeAt[i]) return false;
  if (w.bushes.some((b) => b.x === x && b.y === y)) return false;
  const h = w.height[i];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const)
    if (inside(w, x + dx, y + dy) && w.height[idx(w, x + dx, y + dy)] !== h) return false;
  return !Object.values(s.players).some((q) => Math.floor(q.x) === x && Math.floor(q.y) === y);
}

export function build(w: World, s: State, p: Player, kind: "tent" | "fire"): string {
  const cost = COSTS[kind];
  if (p.wood < cost) return `Dafür brauchst du ${cost} Holz.`;
  const { x, y } = buildSpot(p);
  if (!canBuildAt(w, s, x, y)) return "Hier ist kein Platz – such ein freies, ebenes Feld.";
  p.wood -= cost;
  if (kind === "tent") {
    p.tent = { x, y };
    return "Dein Zelt steht!";
  }
  s.fires.push({ id: s.nextFire++, x, y, until: s.total + FIRE.burn });
  return "Das Lagerfeuer brennt!";
}
