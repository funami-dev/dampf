/**
 * Feuerwerk aus der Hütte (Spec „Feuerwerk aus der Hütte“, WL-AK-65/66).
 * Reine Daten: Formen der 8 Stile als Partikel-Ziele (Einheit: Radius 1 = volle Ausdehnung).
 */
import { rng } from "./rng.ts";

export const FIREWORK = {
  /** Raketen in der Hütte bei einer neuen Welt */
  hutStart: 99,
  /** höchstens so viele in der Tasche */
  pocket: 10,
  /** Sekunden: Aufstieg, Zerplatzen bis verblasst */
  rise: 1.5,
  burst: 2.5,
  /** Sekunden zwischen zwei eigenen Raketen */
  cooldown: 2,
  /** gleichzeitig am Himmel */
  max: 6,
  maxParticles: 800,
  /** Steighöhe in Pixeln */
  height: 85,
  /** Radius der vollen Ausdehnung in Pixeln */
  radius: 44,
} as const;

export const STYLES = [
  "baelle",
  "stern",
  "vogel",
  "herz",
  "ring",
  "weide",
  "spirale",
  "blume",
] as const;
export type FireworkStyle = (typeof STYLES)[number];

export const STYLE_NAME: Record<FireworkStyle, string> = {
  baelle: "Bälle",
  stern: "Stern",
  vogel: "Vogel",
  herz: "Herz",
  ring: "Ring",
  weide: "Weide",
  spirale: "Spirale",
  blume: "Blume",
};

export interface Firework {
  id: number;
  /** Abschussfeld (Kachel-Koordinaten, Mitte) */
  x: number;
  y: number;
  style: FireworkStyle;
  /** Spielzeit beim Zünden */
  at: number;
  /** Zufall für Farben und kleine Abweichungen */
  seed: number;
}

export interface Particle {
  /** Ziel bei voller Ausdehnung (y nach unten) */
  dx: number;
  dy: number;
  color: string;
  /** Wie stark die Schwerkraft zieht (Weide: lange hängende Funken) */
  fall: number;
  /** Drehung während des Ausbreitens (Spirale) */
  spin: number;
}

const PALETTES: Record<FireworkStyle, string[]> = {
  baelle: ["#ff4d6d", "#ffd23f", "#3ec1d3", "#a06cd5", "#7bd389"],
  stern: ["#ffe66d", "#fff6bf", "#ffb703"],
  vogel: ["#7dd3fc", "#e0f2fe", "#38bdf8"],
  herz: ["#ff5d8f", "#ff97b7", "#ffc2d4"],
  ring: ["#80ffdb", "#64dfdf", "#c77dff"],
  weide: ["#ffd166", "#f4a261", "#ffe8a3"],
  spirale: ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff"],
  blume: ["#f72585", "#b5179e", "#ff8fab"],
};
const FLOWER_CENTER = "#ffd60a";

/** Punkte gleichmäßig entlang eines geschlossenen Linienzugs */
function alongPolygon(pts: [number, number][], n: number): [number, number][] {
  const segs = pts.map((p, i) => [p, pts[(i + 1) % pts.length]!] as const);
  const len = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  const total = len.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let d = (k / n) * total;
    let i = 0;
    while (d > len[i]! && i < segs.length - 1) d -= len[i++]!;
    const [a, b] = segs[i]!;
    const t = len[i]! ? d / len[i]! : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** Partikel eines Stils; gleicher Seed → gleiches Bild */
export function particlesFor(style: FireworkStyle, seed: number): Particle[] {
  const r = rng(seed ^ 0x46697277);
  const pal = PALETTES[style];
  const pick = () => pal[Math.floor(r() * pal.length)]!;
  const jit = (v: number, a = 0.03) => v + (r() - 0.5) * 2 * a;
  const out: Particle[] = [];
  const add = (dx: number, dy: number, color = pick(), fall = 0.25, spin = 0) =>
    out.push({ dx, dy, color, fall, spin });
  switch (style) {
    case "baelle": {
      // eine runde Kugel: Hülle und etwas Füllung
      const n = 90 + Math.floor(r() * 30);
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const d = k % 3 === 0 ? 0.35 + r() * 0.5 : 0.9 + r() * 0.1;
        add(Math.cos(a) * d, Math.sin(a) * d);
      }
      break;
    }
    case "stern": {
      const pts: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const d = k % 2 === 0 ? 1 : 0.42;
        pts.push([Math.cos(a) * d, Math.sin(a) * d]);
      }
      for (const [x, y] of alongPolygon(pts, 100)) add(jit(x), jit(y));
      break;
    }
    case "vogel": {
      // Vogel mit ausgebreiteten Flügeln, genau links-rechts-symmetrisch
      const half: [number, number][] = [];
      for (let k = 0; k < 26; k++) {
        const t = (k + 0.5) / 26; // 0 = Körper, 1 = Flügelspitze
        // Oberkante des Flügels: hebt sich und senkt sich zur Spitze
        half.push([t, -0.55 * Math.sin(Math.PI * t * 0.9) + 0.15 * t]);
        // Unterkante etwas tiefer, zur Spitze hin zusammenlaufend
        if (k % 2 === 0)
          half.push([t * 0.92, -0.55 * Math.sin(Math.PI * t * 0.9) + 0.15 * t + 0.22 * (1 - t)]);
      }
      for (const [x, y] of half) {
        const c = pick();
        add(x, y, c);
        add(-x, y, c);
      }
      // Körper und Kopf in der Mitte
      for (let k = 0; k < 8; k++) add(0, -0.05 + k * 0.06, "#ffffff");
      add(0, -0.12, "#ffffff");
      break;
    }
    case "herz": {
      const n = 110;
      for (let k = 0; k < n; k++) {
        const t = (k / n) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        add(jit(x / 17), jit(-y / 17 + 0.1));
      }
      break;
    }
    case "ring": {
      const n = 96;
      const c = pick();
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const d = jit(1, 0.02);
        add(Math.cos(a) * d, Math.sin(a) * d, k % 6 === 0 ? "#ffffff" : c);
      }
      break;
    }
    case "weide": {
      const n = 80 + Math.floor(r() * 20);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r() * 0.1;
        const d = 0.6 + r() * 0.35;
        add(Math.cos(a) * d, Math.sin(a) * d * 0.7 - 0.2, pick(), 1.6);
      }
      break;
    }
    case "spirale": {
      const arms = 4;
      const per = 26;
      for (let a = 0; a < arms; a++) {
        const c = pal[a % pal.length]!;
        for (let k = 0; k < per; k++) {
          const d = 0.12 + (k / per) * 0.88;
          const ang = (a * Math.PI * 2) / arms + d * Math.PI * 1.6;
          add(Math.cos(ang) * d, Math.sin(ang) * d, c, 0.2, 1.4);
        }
      }
      break;
    }
    case "blume": {
      const petals = 6;
      const n = 96;
      for (let k = 0; k < n; k++) {
        const t = (k / n) * Math.PI * 2;
        const d = Math.abs(Math.cos((petals / 2) * t)) * 0.85 + 0.15;
        add(jit(Math.cos(t) * d), jit(Math.sin(t) * d));
      }
      for (let k = 0; k < 18; k++) {
        const a = r() * Math.PI * 2;
        const d = r() * 0.18;
        add(Math.cos(a) * d, Math.sin(a) * d, FLOWER_CENTER);
      }
      break;
    }
  }
  return out;
}

/** Stand eines Feuerwerks zur Zeit `t` (Sekunden seit Zünden) */
export function fireworkPhase(t: number): "steigt" | "platzt" | "vorbei" {
  if (t < FIREWORK.rise) return "steigt";
  if (t < FIREWORK.rise + FIREWORK.burst) return "platzt";
  return "vorbei";
}

/**
 * Bildschirm-Versatz eines Partikels (Pixel, relativ zum Platzpunkt) und Deckkraft.
 * `u` = Sekunden seit dem Zerplatzen.
 */
export function particleAt(p: Particle, u: number): { x: number; y: number; alpha: number } {
  const k = Math.min(1, u / FIREWORK.burst);
  const grow = 1 - (1 - Math.min(1, u / 0.6)) ** 3;
  const ang = p.spin * k;
  const cx = p.dx * Math.cos(ang) - p.dy * Math.sin(ang);
  const cy = p.dx * Math.sin(ang) + p.dy * Math.cos(ang);
  const drop = p.fall * 22 * k * k;
  return {
    x: cx * FIREWORK.radius * grow,
    y: cy * FIREWORK.radius * grow + drop,
    alpha: k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4),
  };
}
