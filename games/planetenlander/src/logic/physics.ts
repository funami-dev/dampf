/** Flugphysik in echten SI-Einheiten (Spec: Physik, PL-AK-02..05) */
import type { Body } from "./bodies.ts";
import type { Terrain } from "./terrain.ts";
import { groundAt } from "./terrain.ts";

export const LANDER = {
  dry: 1500, // kg
  fuel: 600, // kg
  thrust: 30_000, // N
  flow: 10, // kg/s Hauptdüse
  rcsFlow: 0.5, // kg/s Seitendüsen
  turnAcc: (360 * Math.PI) / 180, // rad/s² hoch- und abbremsen der Drehung
  turnRate: (90 * Math.PI) / 180, // rad/s höchstens
  maxTilt: Math.PI / 2,
  cw: 1.2,
  area: 10, // m²
  halfWidth: 2.5, // m (Beine)
};
export const SAFE = { down: 2, side: 1, tilt: (10 * Math.PI) / 180 };
export const START = { height: 300, offset: 150 };
export const STEP = 1 / 120;

export interface Lander {
  x: number;
  /** Höhe der Fußpunkte (m) */
  y: number;
  vx: number;
  /** nach oben positiv */
  vy: number;
  /** Neigung in rad, 0 = aufrecht, positiv = nach rechts gekippt */
  angle: number;
  omega: number;
  fuel: number;
  t: number;
}

export interface Controls {
  thrust: boolean;
  left: boolean;
  right: boolean;
}

export const mass = (l: Lander) => LANDER.dry + l.fuel;

export function startLander(t: Terrain): Lander {
  const x = t.pad.center - START.offset;
  return {
    x,
    y: groundAt(t, x) + START.height,
    vx: 0,
    vy: 0,
    angle: 0,
    omega: 0,
    fuel: LANDER.fuel,
    t: 0,
  };
}

/** Ein fester Rechenschritt dt (Sekunden) */
export function step(l: Lander, c: Controls, b: Body, dt: number, width: number) {
  const m = mass(l);
  let ax = 0;
  let ay = -b.g;
  // Hauptdüse entlang der Fähren-Achse
  if (c.thrust && l.fuel > 0) {
    const a = LANDER.thrust / m;
    ax += a * Math.sin(l.angle);
    ay += a * Math.cos(l.angle);
    l.fuel = Math.max(0, l.fuel - LANDER.flow * dt);
  }
  // Luftwiderstand: F = ½ ρ v² c_w A, entgegen der Bewegung
  if (b.rho > 0) {
    const v = Math.hypot(l.vx, l.vy);
    if (v > 0) {
      const f = 0.5 * b.rho * v * v * LANDER.cw * LANDER.area;
      ax -= (f / m) * (l.vx / v);
      ay -= (f / m) * (l.vy / v);
    }
  }
  // Drehen mit den Seitendüsen; ohne Eingabe bremsen sie die Drehung ab
  const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
  if (l.fuel > 0 && (dir !== 0 || l.omega !== 0)) {
    const target = dir * LANDER.turnRate;
    const d = target - l.omega;
    const maxD = LANDER.turnAcc * dt;
    l.omega += Math.max(-maxD, Math.min(maxD, d));
    l.fuel = Math.max(0, l.fuel - LANDER.rcsFlow * dt);
  }
  l.angle += l.omega * dt;
  if (Math.abs(l.angle) > LANDER.maxTilt) {
    l.angle = Math.sign(l.angle) * LANDER.maxTilt;
    l.omega = 0;
  }
  // Ort mit konstanter Beschleunigung im Schritt (exakt für freien Fall), dann Geschwindigkeit
  l.x += l.vx * dt + 0.5 * ax * dt * dt;
  l.y += l.vy * dt + 0.5 * ay * dt * dt;
  l.vx += ax * dt;
  l.vy += ay * dt;
  l.t += dt;
  // seitliche Wände
  const minX = LANDER.halfWidth;
  const maxX = width - LANDER.halfWidth;
  if (l.x < minX || l.x > maxX) {
    l.x = Math.max(minX, Math.min(maxX, l.x));
    l.vx = 0;
  }
}

/** Berührt die Fähre den Boden? (Mitte oder eines der Beine) */
export function touching(l: Lander, t: Terrain): boolean {
  return [l.x - LANDER.halfWidth, l.x, l.x + LANDER.halfWidth].some((x) => l.y <= groundAt(t, x));
}

export interface Verdict {
  landed: boolean;
  onPad: boolean;
  down: number;
  side: number;
  tilt: number;
  reason: "ok" | "neben" | "hart" | "seitlich" | "schief";
}

/** Urteil beim Aufsetzen (PL-AK-05) */
export function judge(l: Lander, t: Terrain): Verdict {
  const onPad = l.x - LANDER.halfWidth >= t.pad.x0 && l.x + LANDER.halfWidth <= t.pad.x1;
  const down = Math.max(0, -l.vy);
  const side = Math.abs(l.vx);
  const tilt = Math.abs(l.angle);
  let reason: Verdict["reason"] = "ok";
  if (!onPad) reason = "neben";
  else if (down > SAFE.down) reason = "hart";
  else if (side > SAFE.side) reason = "seitlich";
  else if (tilt > SAFE.tilt) reason = "schief";
  return { landed: reason === "ok", onPad, down, side, tilt, reason };
}

/** Sterne (Spec: Sterne) */
export function stars(v: Verdict, fuel: number): 0 | 1 | 2 | 3 {
  if (!v.landed) return 0;
  if (v.down > 1) return 1;
  return fuel >= LANDER.fuel * 0.3 ? 3 : 2;
}

/** Endgeschwindigkeit im freien Fall (PL-AK-04) */
export const terminalVelocity = (b: Body, m: number) =>
  b.rho > 0 ? Math.sqrt((2 * m * b.g) / (b.rho * LANDER.cw * LANDER.area)) : Infinity;
