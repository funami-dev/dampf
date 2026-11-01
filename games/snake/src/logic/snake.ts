/**
 * Reine Spiellogik für Snake, ohne Phaser. Alle Funktionen sind unveränderlich (geben neuen
 * Zustand zurück) und deterministisch über einen Seed. Spec: specs/games/snake.md
 */
export type Direction = "up" | "down" | "left" | "right";
export interface Cell {
  x: number;
  y: number;
}

export interface GameState {
  /** Kopf zuerst. */
  snake: Cell[];
  dir: Direction;
  /** Gepufferte Richtungswechsel, max. 2 (SNAKE-AK-06). */
  queue: Direction[];
  /** null, wenn das Feld komplett voll ist (gewonnen). */
  food: Cell | null;
  score: number;
  alive: boolean;
  rng: number;
}

export const GRID_SIZE = 20;
export const START_SPEED = 8;
export const MAX_SPEED = 15;
const MAX_QUEUE = 2;

const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const wrap = (n: number) => (n + GRID_SIZE) % GRID_SIZE;

/** mulberry32: kleiner, seedbarer Zufallsgenerator. */
function random(seed: number): [value: number, nextSeed: number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

function placeFood(snake: Cell[], rng: number): [Cell | null, number] {
  const free: Cell[] = [];
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++)
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
  if (free.length === 0) return [null, rng];
  const [r, next] = random(rng);
  return [free[Math.floor(r * free.length)]!, next];
}

export function createGame(seed: number): GameState {
  const mid = Math.floor(GRID_SIZE / 2);
  const snake = [0, 1, 2].map((i) => ({ x: mid - i, y: mid }));
  const [food, rng] = placeFood(snake, seed);
  return { snake, dir: "right", queue: [], food, score: 0, alive: true, rng };
}

export function turn(state: GameState, dir: Direction): GameState {
  if (!state.alive || state.queue.length >= MAX_QUEUE) return state;
  const last = state.queue.at(-1) ?? state.dir;
  if (dir === last || dir === OPPOSITE[last]) return state;
  return { ...state, queue: [...state.queue, dir] };
}

export function step(state: GameState): GameState {
  if (!state.alive) return state;
  const [dir = state.dir, ...queue] = state.queue;
  const head = state.snake[0]!;
  const d = DELTA[dir];
  const next = { x: wrap(head.x + d.x), y: wrap(head.y + d.y) };
  const grows = state.food !== null && same(next, state.food);
  // Der Schwanz rückt im selben Tick weiter, außer die Schlange wächst (SNAKE-AK-05).
  const body = grows ? state.snake : state.snake.slice(0, -1);
  if (body.some((c) => same(c, next))) return { ...state, dir, queue, alive: false };

  const snake = [next, ...body];
  if (!grows) return { ...state, snake, dir, queue };
  const [food, rng] = placeFood(snake, state.rng);
  return { ...state, snake, dir, queue, food, rng, score: state.score + 1, alive: food !== null };
}

/** Felder pro Sekunde für einen Punktestand (SNAKE-AK-07). */
export function speedFor(score: number): number {
  return Math.min(MAX_SPEED, START_SPEED + Math.floor(score / 5));
}

/** Nur für E2E-Tests: Schlange künstlich verlängern. */
export function grow(state: GameState, n: number): GameState {
  const tail = state.snake.at(-1)!;
  return { ...state, snake: [...state.snake, ...Array.from({ length: n }, () => ({ ...tail }))] };
}
