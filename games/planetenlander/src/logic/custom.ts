/** Eigener Planet (PL-AK-16, Feedback fb_6wcw7h1r): Editor-Werte, Speichern, Wurfkurve */
import type { Body } from "./bodies.ts";
import type { Store } from "./progress.ts";

export const CUSTOM_KEY = "dampf.planetenlander.eigene";
export const MAX_CUSTOM = 3;
export const GRAVITY = { min: 0.5, max: 25, step: 0.1 };
export const MARKS = [
  { name: "Mond", g: 1.62 },
  { name: "Mars", g: 3.71 },
  { name: "Erde", g: 9.81 },
  { name: "Jupiter", g: 24.79 },
];
export const SKIES = [
  { name: "Weltall", top: "#000000", bottom: "#070a16" },
  { name: "Tiefblau", top: "#0b1a4a", bottom: "#2c5aa0" },
  { name: "Himmelblau", top: "#3a7bd5", bottom: "#a6d1f5" },
  { name: "Abendrot", top: "#3b1a4a", bottom: "#f08a4b" },
  { name: "Giftgrün", top: "#0f3b2e", bottom: "#7bd38a" },
  { name: "Lila", top: "#2a0f45", bottom: "#9b6fd6" },
  { name: "Sandsturm", top: "#6b4a1e", bottom: "#e0b36a" },
  { name: "Rosa", top: "#5a1f45", bottom: "#f5a3c7" },
];
export const GROUNDS = [
  { name: "Grau", ground: "#8d8d92", edge: "#c9c9cf" },
  { name: "Rost", ground: "#a3492e", edge: "#d9774f" },
  { name: "Sand", ground: "#c9a36b", edge: "#ead39f" },
  { name: "Eis", ground: "#bfe3f0", edge: "#f2fbff" },
  { name: "Wiese", ground: "#4f8a43", edge: "#86c06c" },
  { name: "Lava", ground: "#3a2a2a", edge: "#ff6b3d" },
  { name: "Lila", ground: "#6a4c93", edge: "#a98bd6" },
  { name: "Kohle", ground: "#2b2b2f", edge: "#5a5a63" },
];
export const AIR = [
  { id: "keine", name: "keine Luft", rho: 0 },
  { id: "duenn", name: "dünn", rho: 0.02 },
  { id: "erde", name: "wie auf der Erde", rho: 1.2 },
  { id: "dicht", name: "dicht", rho: 5 },
] as const;
export type AirId = (typeof AIR)[number]["id"];

export interface Custom {
  id: string;
  name: string;
  sky: number;
  ground: number;
  g: number;
  air: AirId;
}

const clampInt = (n: unknown, max: number) =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) < max ? (n as number) : 0;

/** Werte auf die erlaubten Bereiche begrenzen */
export function normalize(c: Partial<Custom> & { id: string }): Custom {
  const g = typeof c.g === "number" && Number.isFinite(c.g) ? c.g : 9.81;
  return {
    id: c.id,
    name: (typeof c.name === "string" ? c.name.trim() : "").slice(0, 14) || "Mein Planet",
    sky: clampInt(c.sky, SKIES.length),
    ground: clampInt(c.ground, GROUNDS.length),
    g: Math.round(Math.max(GRAVITY.min, Math.min(GRAVITY.max, g)) * 10) / 10,
    air: AIR.some((a) => a.id === c.air) ? (c.air as AirId) : "keine",
  };
}

/** Eigener Planet als spielbarer Ort */
export function toBody(c: Custom): Body {
  const sky = SKIES[c.sky]!;
  const gr = GROUNDS[c.ground]!;
  const rho = AIR.find((a) => a.id === c.air)!.rho;
  return {
    id: c.id,
    name: c.name,
    icon: "🪐",
    g: c.g,
    rho,
    playable: true,
    fact: `Diesen Planeten hast du selbst erfunden – mit ${AIR.find((a) => a.id === c.air)!.name}.`,
    colors: {
      skyTop: sky.top,
      skyBottom: sky.bottom,
      ground: gr.ground,
      edge: gr.edge,
      ...(rho >= 5 ? { haze: "rgba(230,200,150,0.18)" } : {}),
    },
    stars: rho < 0.1,
  };
}

export const isCustomId = (id: string) => /^eigen-\d+$/.test(id);

export function loadCustom(s: Store): Custom[] {
  try {
    const d = JSON.parse(s.get(CUSTOM_KEY) ?? "[]") as unknown;
    if (!Array.isArray(d)) return [];
    return d
      .filter((c): c is Custom => !!c && typeof c === "object" && isCustomId((c as Custom).id))
      .slice(0, MAX_CUSTOM)
      .map((c) => normalize(c));
  } catch {
    return [];
  }
}
export function saveCustom(s: Store, list: Custom[]) {
  try {
    s.set(CUSTOM_KEY, JSON.stringify(list.slice(0, MAX_CUSTOM)));
  } catch {
    /* gesperrt */
  }
}
/** freie Id für einen neuen Planeten (oder null, wenn schon 3 da sind) */
export function nextId(list: Custom[]): string | null {
  if (list.length >= MAX_CUSTOM) return null;
  for (let i = 1; ; i++) if (!list.some((c) => c.id === `eigen-${i}`)) return `eigen-${i}`;
}

/**
 * Wurfkurve für die Vorschau: Ball (wie die Fähre gerechnet, nur kleiner) waagerecht mit v0 aus
 * der Höhe h; mit Luft bremst er (Kugel, 0,2 m, 0,4 kg).
 */
export function throwPath(g: number, rho: number, v0 = 10, h = 20) {
  const cw = 0.47;
  const area = Math.PI * 0.1 * 0.1;
  const m = 0.4;
  let x = 0;
  let y = h;
  let vx = v0;
  let vy = 0;
  let t = 0;
  const dt = 1 / 200;
  const pts = [{ x, y }];
  while (y > 0 && t < 60) {
    const v = Math.hypot(vx, vy);
    const f = rho > 0 && v > 0 ? (0.5 * rho * v * v * cw * area) / m : 0;
    const ax = v > 0 ? -f * (vx / v) : 0;
    const ay = -g - (v > 0 ? f * (vy / v) : 0);
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    vx += ax * dt;
    vy += ay * dt;
    t += dt;
    if (Math.round(t / dt) % 10 === 0 || y <= 0) pts.push({ x, y: Math.max(0, y) });
  }
  return { pts, time: t, distance: x };
}
