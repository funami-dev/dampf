import { isHarbor, isNavigable } from "./world.ts";

export const MAX_AHEAD = 16;
export const MAX_ASTERN = 4;
export const ACCEL_RATE = 0.15;
export const MAX_RUDDER = 35;
const RUDDER_RATE = 30;
const TURN_PER_SPEED = 0.9;
const MAX_TURN = 8;
const HEEL_FACTOR = 0.6;

export interface ShipState {
  x: number;
  z: number;
  /** Grad, 0 = Norden */
  heading: number;
  /** m/s, negativ = rückwärts */
  speed: number;
  /** Grad */
  rudder: number;
  /** Schräglage in Grad */
  heel: number;
}

export interface ShipControls {
  /** −1 … 1 */
  throttle: number;
  /** −1 … 1 (rechts positiv) */
  rudder: number;
}

export interface StepResult {
  state: ShipState;
  /** auf Grund gelaufen (Land/Sandbank außerhalb des Hafens) */
  grounded: boolean;
  /** Aufprallgeschwindigkeit im Hafen (Anleger/Mole), 0 = kein Aufprall */
  impact: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function stepShip(s: ShipState, c: ShipControls, dt: number): StepResult {
  const lever = clamp(c.throttle, -1, 1);
  const target = lever >= 0 ? lever * MAX_AHEAD : lever * MAX_ASTERN;
  const speed = s.speed + (target - s.speed) * ACCEL_RATE * dt;

  const wantRudder = clamp(c.rudder, -1, 1) * MAX_RUDDER;
  const rudder =
    s.rudder < wantRudder
      ? Math.min(wantRudder, s.rudder + RUDDER_RATE * dt)
      : Math.max(wantRudder, s.rudder - RUDDER_RATE * dt);

  // JF-AK-03: Drehrate wächst mit der Geschwindigkeit, im Stand keine Drehung
  const turn = clamp((rudder / MAX_RUDDER) * TURN_PER_SPEED * speed, -MAX_TURN, MAX_TURN);
  const heading = (((s.heading + turn * dt) % 360) + 360) % 360;
  const heel = (rudder / MAX_RUDDER) * speed * HEEL_FACTOR;

  const h = (heading * Math.PI) / 180;
  const x = s.x + Math.sin(h) * speed * dt;
  const z = s.z + Math.cos(h) * speed * dt;
  if (!isNavigable(x, z)) {
    // JF-AK-04: nicht auf Land fahren, stoppen, heil bleiben
    const harbor = isHarbor(s.x, s.z);
    return {
      state: { ...s, heading, rudder, speed: 0, heel: 0 },
      grounded: !harbor && Math.abs(speed) > 0.05,
      impact: harbor ? Math.abs(speed) : 0,
    };
  }
  return { state: { x, z, heading, speed, rudder, heel }, grounded: false, impact: 0 };
}
