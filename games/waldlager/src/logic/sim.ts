import { DAY, START_TIME, isNight, phaseOf } from "./daytime.ts";
import { SPECIES, UNICORN, speciesById } from "./species.ts";
import {
  FULL,
  RATES,
  eatBerry,
  fitnessFactor,
  speedFactor,
  stepNeeds,
  type Needs,
} from "./needs.ts";
import { T, debrisHint, idx, inside, terrainWalkable, type World } from "./world.ts";

/** Spielstand einer Welt (Spec: specs/games/waldlager.md). Reine Daten, serialisierbar. */
export const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#e67e22", "#1abc9c"] as const;
/** Gültige Spielerfarbe (WL-AK-31): genau `#rrggbb`, klein geschrieben */
export const isColor = (c: unknown): c is string =>
  typeof c === "string" && /^#[0-9a-f]{6}$/.test(c);
/** Alle Tierarten-IDs (Reihenfolge = Index im Netzwerk-Protokoll) */
export const ANIMALS: readonly string[] = SPECIES.map((x) => x.id);
export type AnimalKind = string;
export const UNICORN_CHANCE = 0.15;
export const LANDING = { seconds: 3, minPlaneDist: 60, bushDist: 6, trees: 10, treeDist: 15 };
export const RADIO_REACH = 2;
/** Hai: taucht in jedem 90-s-Zyklus 30 s lang auf */
export const SHARK = { cycle: 90, up: 30, max: 2 };
export const SIGHT = { day: 5, night: 3, fire: 6 };

export const LIMITS = { wood: 30, berries: 20 };
export const COSTS = { tent: 8, fire: 3, bridge: 3 };
export const TREE = { hits: 4, wood: 3, regrow: DAY };
export const BUSH = { berries: 4, refill: DAY / 2 };
export const FIRE = { burn: 180, stoke: 120, max: 600, warm: 2.5 };
export const SPEED = { walk: 3, run: 5.5 };
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
  /** Landeplatz (Zuhause ohne Zelt) */
  home: { x: number; y: number };
  /** Funkgerät aus dem Flugzeug (pro Welt) */
  radio: boolean;
  /** Restzeit der Fallschirm-Landung in Sekunden */
  landing: number;
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
  /** aktueller Spieltag (für das Einhorn) */
  day: number;
  /** gebaute Brückenfelder (Feld-Index → 1) */
  bridges: Record<number, 1>;
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

const COUNT = { haeufig: 3, selten: 2, "sehr-selten": 1 } as const;

/** Liegt das Feld im Lebensraum der Art? (Spawn; Wasser- und Hügeltiere bleiben auch dort) */
export function habitatOk(w: World, kind: string, x: number, y: number, strict = true): boolean {
  if (!inside(w, x, y)) return false;
  const sp = speciesById(kind);
  if (!sp) return false;
  const i = idx(w, x, y);
  switch (sp.habitat) {
    case "wasser":
      return nearWater(w, x, y, 3);
    case "huegel":
      return w.height[i]! >= 2;
    case "meer":
      return w.terrain[i] === T.SEA && nearLand(w, x, y, 5);
    case "wald":
      return !strict || w.terrain[i] === T.FOREST;
    case "wiese":
      return !strict || w.terrain[i] === T.GRASS || w.terrain[i] === T.SAND;
  }
}

function nearLand(w: World, x: number, y: number, r: number): boolean {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (inside(w, nx, ny) && w.terrain[idx(w, nx, ny)] !== T.SEA) return true;
    }
  return false;
}

function nearWater(w: World, x: number, y: number, r: number): boolean {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > r) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inside(w, nx, ny) && w.terrain[idx(w, nx, ny)] === T.WATER) return true;
    }
  return false;
}

/** Nachtaktive Tiere sind am Morgen und tagsüber versteckt (WL-AK-19) */
export function hiddenAt(kind: string, total: number): boolean {
  if (kind === "hai") return ((total % SHARK.cycle) + SHARK.cycle) % SHARK.cycle >= SHARK.up;
  const ph = phaseOf(total);
  return speciesById(kind)?.time === "nacht" && (ph === "tag" || ph === "morgen");
}

/** Ist die Art gerade unterwegs? (WL-AK-35, fürs Tierbuch) */
export function activeAt(kind: string, total: number): boolean {
  if (kind === "hai") return !hiddenAt(kind, total);
  const ph = phaseOf(total);
  return speciesById(kind)?.time === "nacht"
    ? ph === "nacht" || ph === "daemmerung"
    : ph !== "nacht";
}

function spawn(w: World, s: State, kind: string, far: (x: number, y: number) => boolean): boolean {
  for (let tries = 0; tries < 400; tries++) {
    const x = Math.floor(nextRand(s) * w.size);
    const y = Math.floor(nextRand(s) * w.size);
    const sea = speciesById(kind)?.habitat === "meer";
    if ((!sea && !free(w, s, x, y)) || !habitatOk(w, kind, x, y) || !far(x, y)) continue;
    s.animals.push({ kind, x: x + 0.5, y: y + 0.5, tx: x + 0.5, ty: y + 0.5, fleeing: false });
    return true;
  }
  return false;
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
    day: -1,
    bridges: {},
  };
  const awayFromStart = (x: number, y: number) => Math.hypot(x - w.start.x, y - w.start.y) >= 6;
  const scale = Math.max(1, Math.min(4, Math.round(w.size / 128)));
  for (const sp of SPECIES) {
    if (sp.id === UNICORN) continue;
    const n =
      sp.id === "hai"
        ? SHARK.max
        : sp.rarity === "selten"
          ? 1 + Math.floor(nextRand(s) * COUNT.selten)
          : sp.rarity === "haeufig"
            ? COUNT.haeufig * scale
            : COUNT[sp.rarity];
    for (let k = 0; k < n; k++)
      if (!spawn(w, s, sp.id, awayFromStart) && k === 0) spawn(w, s, sp.id, () => true);
  }
  newDay(w, s);
  return s;
}

/** Neuer Spieltag: altes Einhorn geht, mit 15 % Chance kommt ein neues (WL-AK-20) */
export function newDay(w: World, s: State) {
  s.day = Math.floor(s.total / DAY);
  s.animals = s.animals.filter((a) => a.kind !== UNICORN);
  if (nextRand(s) >= UNICORN_CHANCE) return;
  const players = Object.values(s.players);
  const far = (x: number, y: number) =>
    w.terrain[idx(w, x, y)] === T.GRASS &&
    players.every((p) => Math.hypot(p.x - x, p.y - y) > 25) &&
    Math.hypot(x - w.start.x, y - w.start.y) > (players.length ? 0 : 25);
  spawn(w, s, UNICORN, far);
}

/** Zufälliger Landeplatz: frei, weit weg vom Flugzeug, Beeren in der Nähe (WL-AK-23) */
export function landingSpot(w: World, s: State): { x: number; y: number } {
  const minDist = Math.min(LANDING.minPlaneDist, w.size * 0.23);
  const treesNear = (x: number, y: number) => {
    let n = 0;
    for (let dy = -LANDING.treeDist; dy <= LANDING.treeDist; dy++)
      for (let dx = -LANDING.treeDist; dx <= LANDING.treeDist; dx++)
        if (
          inside(w, x + dx, y + dy) &&
          w.treeAt[idx(w, x + dx, y + dy)] &&
          dx * dx + dy * dy <= LANDING.treeDist ** 2
        )
          n++;
    return n;
  };
  let fallback: { x: number; y: number } | null = null;
  for (let tries = 0; tries < 5000; tries++) {
    const x = Math.floor(nextRand(s) * w.size);
    const y = Math.floor(nextRand(s) * w.size);
    if (!free(w, s, x, y)) continue;
    const t = w.terrain[idx(w, x, y)];
    if (t === T.FORD || t === T.BRIDGE) continue;
    if (Math.hypot(x - w.plane.x, y - w.plane.y) < minDist) continue;
    if (treesNear(x, y) < LANDING.trees) continue;
    fallback ??= { x, y };
    if (w.bushes.some((b) => Math.hypot(b.x - x, b.y - y) <= LANDING.bushDist)) return { x, y };
  }
  return fallback ?? { x: w.start.x, y: w.start.y };
}

export function addPlayer(
  w: World,
  s: State,
  id: string,
  name: string,
  color: string,
  home = landingSpot(w, s),
): Player {
  const p: Player = {
    id,
    name: name.trim().slice(0, 12) || "Wanderer",
    color,
    x: home.x + 0.5,
    y: home.y + 0.5,
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
    home,
    radio: false,
    landing: LANDING.seconds,
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
  if (!terrainWalkable(w.terrain[i]!) && !(w.terrain[i] === T.WATER && s.bridges[i])) return false;
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
function moveBody(
  w: World,
  s: State,
  b: { x: number; y: number },
  dx: number,
  dy: number,
  ok: (x: number, y: number) => boolean = () => true,
) {
  if (canStand(w, s, b.x + dx, b.y) && ok(Math.floor(b.x + dx), Math.floor(b.y))) b.x += dx;
  if (canStand(w, s, b.x, b.y + dy) && ok(Math.floor(b.x), Math.floor(b.y + dy))) b.y += dy;
}

/** Bildschirm-Eingabe (rechts/unten) → Kachel-Richtung (isometrisch). */
export function screenToTile(sx: number, sy: number): [number, number] {
  return [(sx + sy) / Math.SQRT2, (sy - sx) / Math.SQRT2];
}

export function movePlayer(w: World, s: State, p: Player, input: Input, dt: number) {
  const len = Math.hypot(input.x, input.y);
  if (p.landing > 0) {
    p.moving = false;
    p.running = false;
    return;
  }
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
  const speed = (p.running ? SPEED.run : SPEED.walk) * speedFactor(p.needs);
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
  if (Math.floor(s.total / DAY) !== s.day) newDay(w, s);
  for (const [k, at] of Object.entries(s.stumps)) if (at <= s.total) delete s.stumps[Number(k)];
  for (const [k, at] of Object.entries(s.refill))
    if (at <= s.total) {
      s.berries[Number(k)] = BUSH.berries;
      delete s.refill[Number(k)];
    }
  stepAnimals(w, s, dt, night);
  for (const p of players) {
    if (p.landing > 0) p.landing = Math.max(0, p.landing - dt);
    // Funkgerät im Flugzeug (WL-AK-24)
    if (!p.radio && nearPlane(w, p)) {
      p.radio = true;
      events.push({ player: p.id, text: "📻 Du hast im Flugzeug ein Funkgerät gefunden!" });
    }
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
      const home = p.tent
        ? nearFree(w, s, p.tent.x, p.tent.y)
        : nearFree(w, s, p.home.x, p.home.y, true);
      p.x = home.x + 0.5;
      p.y = home.y + 0.5;
      p.needs = { ...p.needs, rest: 50 };
      p.chop = null;
      events.push({ player: p.id, text: "Du bist vor Müdigkeit eingeschlafen …" });
    }
  }
  return events;
}

/** Abstand zum nächsten Wrack-Feld */
export function nearPlane(w: World, p: { x: number; y: number }): boolean {
  return w.plane.cells.some(
    ([cx, cy]) => Math.max(Math.abs(cx + 0.5 - p.x), Math.abs(cy + 0.5 - p.y)) <= RADIO_REACH + 0.5,
  );
}

function nearFree(w: World, s: State, x: number, y: number, self = false) {
  if (self && free(w, s, x, y)) return { x, y };
  for (let r = 1; r < 6; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (free(w, s, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  return { x: w.start.x, y: w.start.y };
}

function stepAnimals(w: World, s: State, dt: number, night: boolean) {
  const players = Object.values(s.players);
  for (const a of s.animals) {
    if (hiddenAt(a.kind, s.total)) continue;
    const sp = speciesById(a.kind);
    const ok = (x: number, y: number) => habitatOk(w, a.kind, x, y, false);
    const sea = sp?.habitat === "meer";
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
    // Tagaktive ruhen nachts, nachtaktive tagsüber (dann sind sie ohnehin versteckt)
    const resting = sp?.time === "nacht" ? !night && phaseOf(s.total) !== "daemmerung" : night;
    if (resting && !a.fleeing) continue;
    const dx = a.tx - a.x;
    const dy = a.ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) continue;
    const step = Math.min(d, (a.fleeing ? 4 : 1.2) * dt);
    const bx = a.x;
    const by = a.y;
    if (sea) {
      const nx = a.x + (dx / d) * step;
      const ny = a.y + (dy / d) * step;
      if (ok(Math.floor(nx), Math.floor(a.y))) a.x = nx;
      if (ok(Math.floor(a.x), Math.floor(ny))) a.y = ny;
    } else moveBody(w, s, a, (dx / d) * step, (dy / d) * step, ok);
    if (a.x === bx && a.y === by) {
      a.tx = a.x;
      a.ty = a.y;
    }
  }
}

/** Tiere, die die Figur gerade sehen kann (WL-AK-21) */
export function visibleAnimals(s: State, p: { x: number; y: number }): Animal[] {
  const night = isNight(s.total) || phaseOf(s.total) === "daemmerung";
  const burning = s.fires.filter((f) => f.until > s.total);
  return s.animals.filter((a) => {
    if (hiddenAt(a.kind, s.total)) return false;
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= (night ? SIGHT.night : SIGHT.day)) return true;
    return (
      night &&
      d <= SIGHT.fire + 4 &&
      burning.some((f) => Math.hypot(f.x + 0.5 - a.x, f.y + 0.5 - a.y) <= SIGHT.fire)
    );
  });
}

export type ActionKind = "chop" | "pick" | "sleep" | "wake" | "stoke" | "inspect";

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
  w.debris.forEach((b, i) => {
    const d = Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y);
    if (d <= REACH) opts.push({ kind: "inspect", label: "Trümmer ansehen", target: i, d });
  });
  if (p.tent) {
    const d = Math.hypot(p.tent.x + 0.5 - p.x, p.tent.y + 0.5 - p.y);
    if (d <= REACH + 0.3) opts.push({ kind: "sleep", label: "Schlafen", target: -1, d });
  }
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
      p.needs = {
        ...p.needs,
        fitness: Math.max(0, p.needs.fitness - RATES.chopCost * fitnessFactor(p.needs).cost),
      };
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
    case "inspect": {
      const b = w.debris[a.target]!;
      return debrisHint(w, b.x, b.y).text;
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
  if (w.terrain[i] === T.FORD || w.terrain[i] === T.BRIDGE || w.treeAt[i] || s.bridges[i])
    return false;
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

/** Brücke: nur auf ein Flussfeld (nicht Meer), das noch keine Brücke hat (WL-AK-28) */
export function canBridgeAt(w: World, s: State, x: number, y: number): boolean {
  if (!inside(w, x, y)) return false;
  const i = idx(w, x, y);
  return w.terrain[i] === T.WATER && !s.bridges[i];
}

export type BuildKind = "tent" | "fire" | "bridge";

export function build(w: World, s: State, p: Player, kind: BuildKind): string {
  const cost = COSTS[kind];
  if (p.wood < cost) return `Dafür brauchst du ${cost} Holz.`;
  const { x, y } = buildSpot(p);
  if (kind === "bridge") {
    if (!canBridgeAt(w, s, x, y)) return "Brücken baut man auf das Flusswasser vor dir.";
    p.wood -= cost;
    s.bridges[idx(w, x, y)] = 1;
    return "Ein Stück Brücke steht!";
  }
  if (!canBuildAt(w, s, x, y)) return "Hier ist kein Platz – such ein freies, ebenes Feld.";
  p.wood -= cost;
  if (kind === "tent") {
    p.tent = { x, y };
    return "Dein Zelt steht!";
  }
  s.fires.push({ id: s.nextFire++, x, y, until: s.total + FIRE.burn });
  return "Das Lagerfeuer brennt!";
}
