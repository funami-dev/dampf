/**
 * Reine Rennlogik für SemUkri Run, ohne Phaser. Unveränderlich; Bewegung wird exakt integriert
 * (exponentielles Bremsen), damit die Zielzeit nicht von der Bildrate abhängt.
 * Spec: specs/games/semukri-run.md
 */

export const DISTANCE = 100;
export const BOOST = 1;
export const MAX_SPEED = 12;
/** Bremsrate k in dv/dt = -k·v */
export const DRAG = 1;
export const STOP_SPEED = 0.2;
export const TIME_LIMIT = 60;
/** „Auf die Plätze“ (1 s) + „Fertig“ (1 s) */
export const COUNTDOWN = 2;
export const SAMPLE_INTERVAL = 0.05;

export type Side = "left" | "right";
export type Phase = "countdown" | "running" | "finished" | "aborted";

export interface RaceState {
  phase: Phase;
  /** Restzeit bis „Los!“ */
  countdown: number;
  /** Zeit seit „Los!“ */
  t: number;
  pos: number;
  speed: number;
  lastSide: Side | null;
  finishTime: number | null;
  /** Position alle 50 ms ab „Los!“ (für den Geist), letzter Punkt = 100 m im Ziel. */
  samples: number[];
  taps: number;
}

export function createRace(): RaceState {
  return {
    phase: "countdown",
    countdown: COUNTDOWN,
    t: 0,
    pos: 0,
    speed: 0,
    lastSide: null,
    finishTime: null,
    samples: [0],
    taps: 0,
  };
}

/** SR-AK-01 / SR-AK-04 */
export function press(state: RaceState, side: Side): RaceState {
  if (state.phase !== "running" || side === state.lastSide) return state;
  return {
    ...state,
    speed: Math.min(MAX_SPEED, state.speed + BOOST),
    lastSide: side,
    taps: state.taps + 1,
  };
}

/** Zurückgelegte Strecke nach Zeit dt bei Anfangstempo v (exakt). */
const travelled = (v: number, dt: number) => (v * (1 - Math.exp(-DRAG * dt))) / DRAG;

export function step(state: RaceState, dt: number): RaceState {
  if (state.phase === "countdown") {
    const countdown = state.countdown - dt;
    if (countdown > 1e-9) return { ...state, countdown };
    return { ...state, countdown: 0, phase: "running", t: 0 };
  }
  if (state.phase !== "running") return state;

  const v = state.speed < STOP_SPEED ? 0 : state.speed;
  const remaining = DISTANCE - state.pos;
  const samples = [...state.samples];
  const sampleUntil = (until: number) => {
    for (let ts = samples.length * SAMPLE_INTERVAL; ts <= until + 1e-12; ts += SAMPLE_INTERVAL) {
      samples.push(Math.min(DISTANCE, state.pos + travelled(v, ts - state.t)));
    }
  };

  // SR-AK-05: Zielzeit exakt bestimmen, falls die Linie in diesem Schritt überquert wird.
  if (v > 0 && travelled(v, dt) >= remaining) {
    const tau = -Math.log(1 - (remaining * DRAG) / v) / DRAG;
    const finishTime = state.t + tau;
    sampleUntil(finishTime);
    if (samples.at(-1) !== DISTANCE) samples.push(DISTANCE);
    return {
      ...state,
      phase: "finished",
      t: finishTime,
      pos: DISTANCE,
      speed: v * Math.exp(-DRAG * tau),
      finishTime,
      samples,
    };
  }

  const t = state.t + dt;
  sampleUntil(t);
  const speed = v * Math.exp(-DRAG * dt);
  const next: RaceState = {
    ...state,
    t,
    pos: state.pos + travelled(v, dt),
    speed: speed < STOP_SPEED ? 0 : speed,
    samples,
  };
  // SR-AK-11
  if (t >= TIME_LIMIT) return { ...next, phase: "aborted" };
  return next;
}

/** Fokusverlust o. Ä.: Lauf abbrechen (SR-AK-14). */
export function abort(state: RaceState): RaceState {
  if (state.phase === "finished" || state.phase === "aborted") return state;
  return { ...state, phase: "aborted" };
}

/** „12,34 s“ – auf Hundertstel abgeschnitten. */
export function formatTime(seconds: number): string {
  const hundredths = Math.floor(seconds * 100 + 1e-6);
  return `${Math.floor(hundredths / 100)},${String(hundredths % 100).padStart(2, "0")} s`;
}
