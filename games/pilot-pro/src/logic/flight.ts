/**
 * Vereinfachtes, arcade-artiges Flugmodell für Pilot Pro. Reine Funktion, unveränderlich.
 * Winkel in Grad, Längen in Metern, Zeit in Sekunden. Spec: specs/games/pilot-pro.md
 */
import { BOUNDS, START, dir, groundHeight, surfaceAt } from "./world.ts";

export const G = 9.81;
export const MAX_SPEED = 240;
/** Annäherung an die Zielgeschwindigkeit: 5 % der Differenz pro Sekunde */
export const ACCEL_RATE = 0.05;
export const BRAKE_DECEL = 6;
export const ROTATE_SPEED = 75;
export const STALL_SPEED = 60;
export const STALL_RECOVER_SPEED = 65;
export const MAX_PITCH = 25;
export const MAX_ROLL = 45;
export const PITCH_RATE = 15;
export const ROLL_RATE = 40;
export const PITCH_RETURN = 5;
export const ROLL_RETURN = 20;
export const GROUND_STEER_RATE = 10;
export const MAX_ALTITUDE = 12_000;
/** Bei Bodenberührung außerhalb einer Bahn verbleibender Anteil der Geschwindigkeit */
export const CRASH_SPEED_FACTOR = 0.3;
const LIFTOFF_PITCH = 3;
const NOTICE_TIME = 3;

export interface Controls {
  /** -1 … 1, positiv = Nase hoch */
  pitch: number;
  /** -1 … 1, positiv = rechts */
  roll: number;
  /** 0 … 1 */
  throttle: number;
  brake: boolean;
}

export interface FlightState {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  /** Steig-/Sinkrate m/s */
  vs: number;
  throttle: number;
  onGround: boolean;
  stalled: boolean;
  notice: string | null;
  noticeTime: number;
}

export function createFlight(): FlightState {
  return {
    x: START.x,
    z: START.z,
    y: groundHeight(START.x, START.z),
    heading: START.heading,
    pitch: 0,
    roll: 0,
    speed: 0,
    vs: 0,
    throttle: 0,
    onGround: true,
    stalled: false,
    notice: null,
    noticeTime: 0,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const toward = (v: number, target: number, rate: number) =>
  v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);
const rad = (d: number) => (d * Math.PI) / 180;
const wrap360 = (h: number) => ((h % 360) + 360) % 360;

export function step(s: FlightState, c: Controls, dt: number): FlightState {
  const throttle = clamp(c.throttle, 0, 1);
  const pitchIn = clamp(c.pitch, -1, 1);
  const rollIn = clamp(c.roll, -1, 1);
  let { pitch, roll, heading, speed, onGround, stalled } = s;

  // Geschwindigkeit: Schub, Bremse, Schwerkraftanteil
  speed += (throttle * MAX_SPEED - speed) * ACCEL_RATE * dt;
  if (onGround && c.brake) speed -= BRAKE_DECEL * dt;
  if (!onGround) speed -= G * Math.sin(rad(pitch)) * dt;
  speed = clamp(speed, 0, MAX_SPEED * 1.2);

  if (onGround) {
    roll = 0;
    if (speed > 1) heading += rollIn * GROUND_STEER_RATE * dt;
    // Nase hoch erst ab Rotationsgeschwindigkeit (PP-AK-05)
    pitch = speed >= ROTATE_SPEED ? clamp(pitch + pitchIn * PITCH_RATE * dt, 0, MAX_PITCH) : 0;
    if (pitchIn <= 0) pitch = toward(pitch, 0, PITCH_RETURN * dt);
    if (pitch > LIFTOFF_PITCH && speed >= ROTATE_SPEED) onGround = false;
  } else {
    // Strömungsabriss (PP-AK-08)
    if (speed < STALL_SPEED) stalled = true;
    else if (speed >= STALL_RECOVER_SPEED) stalled = false;

    if (stalled) pitch = toward(pitch, -10, 10 * dt);
    else if (pitchIn !== 0) pitch = clamp(pitch + pitchIn * PITCH_RATE * dt, -MAX_PITCH, MAX_PITCH);
    else pitch = toward(pitch, 0, PITCH_RETURN * dt);

    if (rollIn !== 0) roll = clamp(roll + rollIn * ROLL_RATE * dt, -MAX_ROLL, MAX_ROLL);
    else roll = toward(roll, 0, ROLL_RETURN * dt);

    // Kurvenflug (PP-AK-07)
    if (speed > 1) heading += ((G * Math.tan(rad(roll))) / speed) * (180 / Math.PI) * dt;
  }
  heading = wrap360(heading);

  // Bewegung
  const horizontal = speed * Math.cos(rad(pitch));
  const [dx, dz] = dir(heading);
  let x = s.x + dx * horizontal * dt;
  let z = s.z + dz * horizontal * dt;
  let vs = onGround ? 0 : speed * Math.sin(rad(pitch));
  let y = s.y + vs * dt;

  // Höhenbegrenzung (PP-AK-10)
  if (y > MAX_ALTITUDE) {
    y = MAX_ALTITUDE;
    vs = Math.min(vs, 0);
  }

  // Gebietsrand: umdrehen (PP-AK-10)
  let notice = s.notice;
  let noticeTime = Math.max(0, s.noticeTime - dt);
  if (noticeTime === 0) notice = null;
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) {
    x = clamp(x, BOUNDS.minX + 10, BOUNDS.maxX - 10);
    z = clamp(z, BOUNDS.minZ + 10, BOUNDS.maxZ - 10);
    heading = wrap360(heading + 180);
    notice = "Ende des Gebiets";
    noticeTime = NOTICE_TIME;
  }

  // Boden
  const ground = groundHeight(x, z);
  if (onGround) {
    y = ground;
  } else if (y <= ground) {
    y = ground;
    vs = 0;
    onGround = true;
    stalled = false;
    if (surfaceAt(x, z) !== "runway") {
      // Unzerstörbar (PP-AK-09): heil auf die Oberfläche setzen und stark abbremsen
      speed *= CRASH_SPEED_FACTOR;
      notice = "Aufgesetzt!";
      noticeTime = NOTICE_TIME;
    }
    pitch = 0;
    roll = 0;
  }
  if (stalled && !notice) {
    notice = "Zu langsam!";
    noticeTime = 0.5;
  }

  return {
    x,
    y,
    z,
    heading,
    pitch,
    roll,
    speed,
    vs,
    throttle,
    onGround,
    stalled,
    notice,
    noticeTime,
  };
}

export const KNOTS = 1.943844;
export const FEET = 3.28084;
