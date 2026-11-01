/**
 * Reine Spiellogik für Himmelhüpfer, ohne Phaser. Unveränderlich und deterministisch über einen
 * Seed. Welt-Einheiten (WE), y zeigt nach OBEN (y = Höhe). Spec: specs/games/himmelhuepfer.md
 */

export const WIDTH = 400;
export const VIEW_HEIGHT = 700;
export const GRAVITY = 1500;
export const JUMP_SPEED = 900;
export const MOVE_SPEED = 300;
export const MAX_GAP = 200;
export const UNITS_PER_METER = 100;
/** Halbe Fußbreite: so weit darf die Figur über den Plattformrand hinausragen und landet noch. */
export const FOOT = 16;
/** Kamera hält die Figur ungefähr auf dieser Höhe im Bild (Anteil von unten). */
const CAMERA_ANCHOR = 0.45;
const STAR_CHANCE = 1 / 6;
const STAR_OFFSET = 60;
const STAR_RADIUS = 40;
/** Rumpfmitte über den Füßen, für die Stern-Kollision. */
const BODY_OFFSET = 32;
const START_PLATFORM_WIDTH = 200;
/** Start-Kamera: Startplattform liegt 100 WE über dem unteren Rand. */
export const START_CAMERA_Y = -100;

export interface Input {
  left: boolean;
  right: boolean;
}

export interface Platform {
  id: number;
  /** Mitte */
  x: number;
  /** Oberkante */
  y: number;
  w: number;
}

export interface Star {
  id: number;
  x: number;
  y: number;
}

export interface Player {
  /** Mitte der Füße */
  x: number;
  y: number;
  vy: number;
  facing: "left" | "right";
}

export interface GameState {
  player: Player;
  platforms: Platform[];
  stars: Star[];
  /** Unterkante des Sichtbereichs in WE. */
  cameraY: number;
  /** Höchster erreichter Punkt der Füße. */
  maxY: number;
  heightMeters: number;
  starCount: number;
  /** Anzahl Absprünge (für die Absprung-Animation). */
  jumps: number;
  alive: boolean;
  nextPlatformY: number;
  nextId: number;
  rng: number;
}

/** mulberry32 */
function random(seed: number): [value: number, next: number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Plattformabstand und -breite für eine Höhe (HH-AK-07): linear bis 50 m, danach konstant. */
export function difficulty(y: number) {
  const t = Math.min(1, Math.max(0, y / (50 * UNITS_PER_METER)));
  return { gapMin: lerp(60, 140, t), gapMax: lerp(110, MAX_GAP, t), width: lerp(90, 60, t) };
}

/** Erzeugt Plattformen (und Sterne) bis mindestens `untilY`. */
function generate(state: GameState, untilY: number): GameState {
  if (state.nextPlatformY > untilY) return state;
  let { rng, nextId, nextPlatformY } = state;
  const platforms = [...state.platforms];
  const stars = [...state.stars];
  const rand = () => {
    const [v, n] = random(rng);
    rng = n;
    return v;
  };
  while (nextPlatformY <= untilY) {
    const { gapMin, gapMax, width } = difficulty(nextPlatformY);
    const x = width / 2 + rand() * (WIDTH - width);
    platforms.push({ id: nextId++, x, y: nextPlatformY, w: width });
    if (rand() < STAR_CHANCE) stars.push({ id: nextId++, x, y: nextPlatformY + STAR_OFFSET });
    nextPlatformY += gapMin + rand() * (gapMax - gapMin);
  }
  return { ...state, platforms, stars, rng, nextId, nextPlatformY };
}

export function createGame(seed: number): GameState {
  const start: Platform = { id: 0, x: WIDTH / 2, y: 0, w: START_PLATFORM_WIDTH };
  const { gapMin } = difficulty(0);
  const state: GameState = {
    player: { x: WIDTH / 2, y: 0, vy: 0, facing: "right" },
    platforms: [start],
    stars: [],
    cameraY: START_CAMERA_Y,
    maxY: 0,
    heightMeters: 0,
    starCount: 0,
    jumps: 0,
    alive: true,
    nextPlatformY: gapMin + 40,
    nextId: 1,
    rng: seed | 0,
  };
  return generate(state, VIEW_HEIGHT + 200);
}

const wrap = (x: number) => ((x % WIDTH) + WIDTH) % WIDTH;

export function step(state: GameState, input: Input, dt: number): GameState {
  if (!state.alive) return state;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const p = state.player;

  const x = wrap(p.x + dir * MOVE_SPEED * dt);
  const facing = dir < 0 ? "left" : dir > 0 ? "right" : p.facing;
  let vy = p.vy - GRAVITY * dt;
  let y = p.y + vy * dt;
  let jumps = state.jumps;

  // HH-AK-02: nur fallend landen.
  if (vy < 0) {
    const hit = state.platforms.find(
      (pl) => p.y >= pl.y && y <= pl.y && Math.abs(x - pl.x) <= pl.w / 2 + FOOT,
    );
    if (hit) {
      y = hit.y;
      vy = JUMP_SPEED;
      jumps++;
    }
  }

  const maxY = Math.max(state.maxY, y);
  const cameraY = Math.max(state.cameraY, y - VIEW_HEIGHT * CAMERA_ANCHOR);

  // HH-AK-08: Sterne einsammeln.
  const cy = y + BODY_OFFSET;
  const remaining = state.stars.filter((s) => Math.hypot(s.x - x, s.y - cy) >= STAR_RADIUS);
  const starCount = state.starCount + state.stars.length - remaining.length;

  let next: GameState = {
    ...state,
    player: { x, y, vy, facing },
    stars: remaining,
    cameraY,
    maxY,
    heightMeters: Math.max(state.heightMeters, Math.floor(maxY / UNITS_PER_METER)),
    starCount,
    jumps,
    // HH-AK-09: unter den Sichtbereich gefallen.
    alive: y > cameraY - 80,
  };
  next = generate(next, cameraY + VIEW_HEIGHT + 200);
  // Alles unterhalb des Sichtbereichs entfernen (nach dem Erzeugen, damit nichts liegen bleibt).
  return {
    ...next,
    platforms: next.platforms.filter((pl) => pl.y > cameraY - 150),
    stars: next.stars.filter((s) => s.y > cameraY - 100),
  };
}

/** Nur für E2E-Tests: alle Plattformen entfernen, damit die Figur abstürzt. */
export function removePlatforms(state: GameState): GameState {
  return { ...state, platforms: [], nextPlatformY: Number.POSITIVE_INFINITY };
}
