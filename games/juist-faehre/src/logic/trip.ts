import type { ShipState } from "./ship.ts";
import { BERTHS, inBerth } from "./world.ts";

export const CLOCK_SCALE = 18;
export const TRIP_MINUTES = 90;
export const ARRIVAL_PUNCTUAL_MIN = 5;
export const HEEL_LIMIT = 4;
export const BOARD_RATE = 40;
const BOARD_LEAD_MINUTES = 4;

export type Direction = "to-juist" | "to-norddeich";

export interface Trip {
  shipId: string;
  direction: Direction;
  phase: "boarding" | "sailing" | "docked";
  /** Spielzeit in Sekunden seit Mitternacht */
  clock: number;
  departure: number;
  due: number;
  arrivalClock: number | null;
  passengers: number;
  boarded: number;
  /** 0 … 100 */
  satisfaction: number;
  ship: ShipState;
}

const DEPARTURES: Record<Direction, number> = {
  "to-juist": 9 * 3600 + 30 * 60,
  "to-norddeich": 12 * 3600,
};

export const fromBerth = (d: Direction) => (d === "to-juist" ? BERTHS.norddeich : BERTHS.juist);
export const toBerth = (d: Direction) => (d === "to-juist" ? BERTHS.juist : BERTHS.norddeich);

export function createTrip(shipId: string, direction: Direction, seed: number): Trip {
  let s = seed | 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  const r = ((s ^ (s >>> 16)) >>> 0) / 4294967296;
  const b = fromBerth(direction);
  const departure = DEPARTURES[direction];
  return {
    shipId,
    direction,
    phase: "boarding",
    clock: departure - BOARD_LEAD_MINUTES * 60,
    departure,
    due: departure + TRIP_MINUTES * 60,
    arrivalClock: null,
    passengers: 100 + Math.floor(r * 201),
    boarded: 0,
    satisfaction: 100,
    ship: { x: b.start[0], z: b.start[1], heading: b.heading, speed: 0, rudder: 0, heel: 0 },
  };
}

export interface TripEvents {
  grounded?: boolean;
  impact?: number;
  heel?: number;
}

/** dt = echte Sekunden. */
export function tick(t: Trip, dt: number, e: TripEvents): Trip {
  if (t.phase === "docked") return t;
  const clock = t.clock + dt * CLOCK_SCALE;
  if (t.phase === "boarding")
    return { ...t, clock, boarded: Math.min(t.passengers, t.boarded + BOARD_RATE * dt) };
  let sat = t.satisfaction;
  if (e.grounded) sat -= 15;
  if ((e.impact ?? 0) > 1) sat -= 10;
  if (Math.abs(e.heel ?? 0) > HEEL_LIMIT) sat -= 1 * dt;
  return { ...t, clock, satisfaction: Math.max(0, Math.min(100, sat)) };
}

export const canCastOff = (t: Trip) =>
  t.phase === "boarding" && t.boarded >= t.passengers && t.clock >= t.departure;
export const castOff = (t: Trip): Trip => (canCastOff(t) ? { ...t, phase: "sailing" } : t);

export const canMoor = (t: Trip) =>
  t.phase === "sailing" &&
  inBerth(toBerth(t.direction), t.ship.x, t.ship.z) &&
  Math.abs(t.ship.speed) < 1;
export const moor = (t: Trip): Trip =>
  canMoor(t) ? { ...t, phase: "docked", arrivalClock: t.clock } : t;

export function stars(lateMinutes: number, satisfaction: number): 1 | 2 | 3 {
  const punctual = lateMinutes <= ARRIVAL_PUNCTUAL_MIN;
  if (punctual && satisfaction >= 80) return 3;
  if ((punctual && satisfaction >= 50) || (lateMinutes <= 15 && satisfaction >= 80)) return 2;
  return 1;
}

export function result(t: Trip) {
  const arrival = t.arrivalClock ?? t.clock;
  const lateMinutes = Math.max(0, Math.floor((arrival - t.due) / 60));
  const satisfaction = Math.max(
    0,
    Math.round(t.satisfaction - Math.max(0, lateMinutes - ARRIVAL_PUNCTUAL_MIN)),
  );
  return { lateMinutes, satisfaction, stars: stars(lateMinutes, satisfaction) };
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
