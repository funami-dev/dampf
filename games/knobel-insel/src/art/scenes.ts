/**
 * Hintergründe und Pixel-Zeichnungen der drei Ansichten: Insel-Karte, Pfannkuchen-Küche und die
 * isometrische Flusswelt. Alles in eine kleine Bildfläche (wenige hundert Pixel breit) gezeichnet.
 */
import { seeded } from "./sprites.ts";

type G = CanvasRenderingContext2D;
const R = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
/** Pixel-Ellipse (Zeile für Zeile, ohne Kantenglättung) */
export function ellipse(g: G, cx: number, cy: number, rx: number, ry: number, c: string) {
  g.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1))));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

// --- Pfannkuchen-Küche --------------------------------------------------------------
export interface KitchenLayout {
  pegX: [number, number, number];
  tableY: number;
  discH: number;
  maxW: number;
  minW: number;
}
export function kitchenLayout(vw: number, vh: number, n: number): KitchenLayout {
  const maxW = Math.min(Math.floor(vw * 0.29), 84);
  const discH = Math.max(5, Math.min(8, Math.floor((vh * 0.42) / (n + 1))));
  return {
    pegX: [Math.round(vw * 0.19), Math.round(vw * 0.5), Math.round(vw * 0.81)],
    tableY: Math.round(vh * 0.8),
    discH,
    maxW,
    minW: Math.max(12, Math.round(maxW * 0.3)),
  };
}
export const discWidth = (k: KitchenLayout, d: number, n: number) =>
  Math.round(k.minW + ((k.maxW - k.minW) * (d - 1)) / Math.max(1, n - 1));

const PANCAKE = ["#f5cf7a", "#f2c26b", "#e8a44a", "#efb35a", "#d98e3a", "#e39a45", "#cf8235"];

export function drawKitchen(g: G, vw: number, vh: number, k: KitchenLayout, night = false) {
  // Fliesenwand
  for (let y = 0; y < k.tableY; y += 8)
    for (let x = 0; x < vw; x += 8) R(g, x, y, 8, 8, ((x + y) / 8) % 2 ? "#f4e6c8" : "#efdcb6");
  for (let y = 7; y < k.tableY; y += 8) R(g, 0, y, vw, 1, "#e2cda4");
  // Fenster mit Himmel
  const fw = Math.min(70, Math.round(vw * 0.22));
  const fx = Math.round(vw * 0.62);
  R(g, fx - 3, 10, fw + 6, 40, "#8a5a33");
  R(g, fx, 13, fw, 34, night ? "#2a3560" : "#a8d8f0");
  R(g, fx, 38, fw, 9, night ? "#1d2440" : "#bfe6c3");
  R(g, fx + fw / 2 - 1, 13, 2, 34, "#8a5a33");
  R(g, fx, 29, fw, 2, "#8a5a33");
  // Regal mit Töpfen
  R(g, 8, 26, Math.min(80, vw * 0.25), 3, "#8a5a33");
  ellipse(g, 20, 21, 7, 4, "#c0504d");
  R(g, 13, 18, 14, 3, "#c0504d");
  ellipse(g, 42, 22, 6, 3, "#5d8fc7");
  R(g, 36, 19, 12, 3, "#5d8fc7");
  // Tisch
  R(g, 0, k.tableY, vw, vh - k.tableY, "#b9783e");
  for (let y = k.tableY + 4; y < vh; y += 6) R(g, 0, y, vw, 1, "#a1652f");
  R(g, 0, k.tableY, vw, 2, "#d49a5c");
  // Teller
  for (const x of k.pegX) {
    ellipse(g, x, k.tableY + 3, Math.round(k.maxW / 2) + 7, 4, "#c9ccd1");
    ellipse(g, x, k.tableY + 2, Math.round(k.maxW / 2) + 5, 3, "#f7f7f2");
    ellipse(g, x, k.tableY + 2, Math.round(k.maxW / 2) - 2, 2, "#e6e8ec");
  }
}

/** Ein Pfannkuchen mit Gesicht (x = Mitte, y = Oberkante) */
export function drawPancake(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  d: number,
  opts: { blink?: boolean; ouch?: boolean; topping?: boolean; glow?: number } = {},
) {
  const c = PANCAKE[(d - 1) % PANCAKE.length]!;
  const left = Math.round(x - w / 2);
  if (opts.glow) {
    g.globalAlpha = opts.glow;
    R(g, left - 2, y - 2, w + 4, h + 4, "#fff6a8");
    g.globalAlpha = 1;
  }
  R(g, left + 1, y, w - 2, h, c);
  R(g, left, y + 1, w, h - 2, c);
  R(g, left + 2, y, w - 4, 1, "#fbe3a7"); // heller Rand oben
  R(g, left + 1, y + h - 1, w - 2, 1, "#b8742e"); // dunkler Rand unten
  // Gesicht
  const ey = y + Math.max(1, Math.floor(h / 2) - 1);
  const gap = Math.max(3, Math.round(w / 8));
  if (opts.ouch) {
    R(g, x - gap - 1, ey, 2, 1, "#2b2233");
    R(g, x + gap, ey, 2, 1, "#2b2233");
    R(g, x - 1, ey + 2, 3, 2, "#c0504d");
  } else if (opts.blink) {
    R(g, x - gap - 1, ey + 1, 2, 1, "#2b2233");
    R(g, x + gap, ey + 1, 2, 1, "#2b2233");
  } else {
    R(g, x - gap, ey, 1, 2, "#2b2233");
    R(g, x + gap, ey, 1, 2, "#2b2233");
    if (h >= 6) R(g, x - 1, ey + 2, 3, 1, "#8a4b2a");
  }
  R(g, x - gap - 3, ey + 2, 2, 1, "#f4a0a8");
  R(g, x + gap + 2, ey + 2, 2, 1, "#f4a0a8");
  if (opts.topping) {
    R(g, x - 3, y - 2, 6, 2, "#fff1a8"); // Butter
    R(g, x - 3, y - 2, 6, 1, "#fffbe0");
    R(g, left + 2, y, 3, 1, "#8b4a1f"); // Sirup
    R(g, left + 2, y + 1, 1, 2, "#8b4a1f");
    R(g, left + w - 6, y, 4, 1, "#8b4a1f");
    R(g, left + w - 4, y + 1, 1, 3, "#8b4a1f");
  }
}

// --- Insel-Karte --------------------------------------------------------------------
export function drawIsland(g: G, vw: number, vh: number, t: number) {
  R(g, 0, 0, vw, vh, "#5fb3e0");
  const rnd = seeded(7);
  // ruhige Wellen (Zyklus 4 s)
  for (let i = 0; i < 60; i++) {
    const x = rnd() * vw;
    const y = rnd() * vh;
    const a = (Math.sin(t * (Math.PI / 2) + i) + 1) / 2;
    R(g, x, y, 4, 1, a > 0.5 ? "#8fd0f0" : "#76c2ea");
  }
  const cx = vw / 2;
  const cy = vh / 2 + 6;
  const rx = Math.min(vw * 0.42, 170);
  const ry = Math.min(vh * 0.34, 80);
  ellipse(g, cx, cy + 4, rx + 6, ry + 5, "#f2dc9b");
  ellipse(g, cx, cy, rx, ry, "#6fbf5a");
  ellipse(g, cx - rx * 0.2, cy - ry * 0.2, rx * 0.6, ry * 0.5, "#7fcc68");
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 0.85;
    R(
      g,
      cx + Math.cos(a) * rx * r,
      cy + Math.sin(a) * ry * r,
      1,
      1,
      rnd() > 0.5 ? "#f6d55c" : "#f7f7f2",
    );
  }
  // Küchenhütte links
  const hx = cx - rx * 0.5;
  const hy = cy - 4;
  R(g, hx - 14, hy - 10, 28, 18, "#c88a52");
  for (let y = hy - 8; y < hy + 8; y += 4) R(g, hx - 14, y, 28, 1, "#a8703f");
  g.fillStyle = "#c0504d";
  for (let i = 0; i < 12; i++)
    g.fillRect(Math.round(hx - 16 + i), Math.round(hy - 10 - i), 32 - i * 2, 1);
  R(g, hx - 3, hy, 6, 8, "#6b4226");
  R(g, hx + 6, hy - 6, 6, 5, "#a8d8f0");
  R(g, hx + 7, hy - 24, 4, 10, "#7a5230");
  for (let i = 0; i < 3; i++) {
    const p = (((t / 3 + i / 3) % 1) + 1) % 1;
    g.globalAlpha = 0.6 * (1 - p);
    ellipse(g, hx + 9 + Math.sin(p * 6) * 2, hy - 26 - p * 18, 2 + p * 3, 2 + p * 2, "#ffffff");
    g.globalAlpha = 1;
  }
  // Markt-Stand (Keks-Waage) neben der Hütte
  const mx = cx - rx * 0.22;
  const my = cy + ry * 0.28;
  R(g, mx - 10, my - 6, 20, 8, "#c88a52");
  for (let i = 0; i < 5; i++) R(g, mx - 12 + i * 5, my - 12, 5, 6, i % 2 ? "#f7f7f2" : "#e74c3c");
  R(g, mx - 3, my - 8, 6, 2, "#d9a35b");
  // Heckenlabyrinth oben
  const hx2 = cx + rx * 0.05;
  const hy2 = cy - ry * 0.55;
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 7; x++)
      if (x === 0 || y === 0 || x === 6 || y === 4 || (x % 2 === 0 && y % 2 === 0))
        R(g, hx2 + x * 3, hy2 + y * 3, 3, 3, "#3e7a34");
  R(g, hx2 + 15, hy2 + 9, 2, 2, "#f6d55c");
  // Hängebrücke über eine kleine Schlucht unten links
  const bx2 = cx - rx * 0.62;
  const by2 = cy + ry * 0.45;
  R(g, bx2 - 2, by2 - 2, 26, 8, "#4a4458");
  for (let x = 0; x < 22; x += 3)
    R(g, bx2 + x, by2 + Math.round(Math.sin((x / 22) * Math.PI) * 2), 2, 2, "#a8703f");
  // Leuchtturm am Rand (Codes & Muster)
  const lx = cx + rx * 0.82;
  const ly = cy - ry * 0.35;
  for (let i = 0; i < 6; i++) R(g, lx - 3, ly - 18 + i * 3, 6, 3, i % 2 ? "#e74c3c" : "#f7f7f2");
  R(g, lx - 4, ly - 22, 8, 4, "#2b2233");
  g.globalAlpha = 0.35 + 0.25 * Math.sin(t * (Math.PI / 2));
  R(g, lx - 2, ly - 21, 4, 2, "#f6e58d");
  g.globalAlpha = 1;
  // Fluss rechts mit Boot
  const fx = cx + rx * 0.45;
  g.fillStyle = "#4a90d9";
  for (let y = -ry * 0.8; y < ry * 0.8; y++)
    g.fillRect(Math.round(fx + y * 0.35 - 5), Math.round(cy + y), 11, 1);
  R(g, fx - 7, cy - 2, 14, 4, "#8b5a2b");
  R(g, fx - 6, cy - 3, 12, 1, "#a87040");
}

// --- Iso-Flusswelt ---------------------------------------------------------------------
export interface Iso {
  G: number;
  c: number;
  vw: number;
  vh: number;
}
export const isoFor = (vw: number, vh: number): Iso => {
  const G = Math.ceil(vw / 16 + vh / 8) + 4;
  return { G, c: Math.floor(G / 2), vw, vh };
};
/** Bildschirm-Punkt der Mitte einer Kachel */
export const tile = (iso: Iso, tx: number, ty: number) => ({
  x: (tx - ty) * 8 + iso.vw / 2,
  y: (tx + ty - 2 * iso.c) * 4 + iso.vh / 2,
});
export type TileKind = "grass" | "water" | "sand" | "dock";
/** Fluss: 5 Kacheln breit (|d| ≤ 2), Sandufer bei |d| = 3, Stege in Spalte c */
export const RIVER_HALF = 2;
export function tileKind(iso: Iso, tx: number, ty: number): TileKind {
  const d = Math.abs(ty - iso.c);
  if (d <= RIVER_HALF) return tx === iso.c && d === RIVER_HALF ? "dock" : "water";
  if (d === RIVER_HALF + 1) return tx === iso.c ? "dock" : "sand";
  return "grass";
}

function diamond(g: G, cx: number, cy: number, color: (row: number, col: number) => string) {
  for (let r = 0; r < 8; r++) {
    const hw = r < 4 ? (r + 1) * 2 : (8 - r) * 2;
    for (let x = -hw; x < hw; x++) {
      g.fillStyle = color(r, x);
      g.fillRect(Math.round(cx + x), Math.round(cy - 4 + r), 1, 1);
    }
  }
}

/** ruhender Hintergrund der Flusswelt (einmal je Größe gezeichnet) */
export function drawRiverWorld(g: G, iso: Iso) {
  R(g, 0, 0, iso.vw, iso.vh, "#7cc45e");
  const rnd = seeded(42);
  const list: { tx: number; ty: number }[] = [];
  for (let tx = 0; tx < iso.G; tx++) for (let ty = 0; ty < iso.G; ty++) list.push({ tx, ty });
  list.sort((a, b) => a.tx + a.ty - (b.tx + b.ty));
  const trees: { x: number; y: number }[] = [];
  for (const { tx, ty } of list) {
    const p = tile(iso, tx, ty);
    if (p.x < -10 || p.x > iso.vw + 10 || p.y < -8 || p.y > iso.vh + 8) continue;
    const k = tileKind(iso, tx, ty);
    const seed = rnd();
    if (k === "grass")
      diamond(g, p.x, p.y, (r, c) => {
        const n = (r * 7 + c * 13 + tx * 5 + ty * 3) % 11;
        return n === 0 ? "#69b04c" : n === 3 ? "#8fd46c" : r === 0 ? "#9be07a" : "#7cc45e";
      });
    else if (k === "sand")
      diamond(g, p.x, p.y, (r, c) => ((r + c + tx) % 7 === 0 ? "#e8cf8a" : "#f2dc9b"));
    else if (k === "dock")
      diamond(g, p.x, p.y, (r, c) => ((c + 40 - r * 2) % 4 === 0 ? "#7a4f2a" : "#a8703f"));
    else diamond(g, p.x, p.y, (r) => (r < 2 ? "#5aa0e6" : "#4a90d9"));
    // Erdkante am oberen Ufer zum Wasser hin
    if (ty - iso.c === -(RIVER_HALF + 1)) {
      // untere linke Kante der Kachel: Erde sichtbar
      for (let x = -8; x < 0; x++) R(g, p.x + x, p.y + Math.floor((x + 8) / 2), 1, 2, "#9a6a3c");
    }
    if (k === "grass" && Math.abs(ty - iso.c) > RIVER_HALF + 3) {
      if (seed < 0.18) {
        const col = seed < 0.06 ? "#f4a0a8" : seed < 0.12 ? "#f6d55c" : "#f7f7f2";
        R(g, p.x - 2, p.y - 1, 1, 1, col);
        R(g, p.x + 3, p.y + 1, 1, 1, col);
      } else if (seed > 0.93 && Math.abs(tx - iso.c) > 7) trees.push(p);
    }
    // Schilf am Wasser
    if (k === "sand" && seed < 0.25 && tx !== iso.c) {
      R(g, p.x - 1, p.y - 5, 1, 5, "#4f8a43");
      R(g, p.x + 1, p.y - 4, 1, 4, "#5f9e4f");
      R(g, p.x - 1, p.y - 6, 1, 1, "#8a5a33");
    }
  }
  for (const p of trees) {
    R(g, p.x - 1, p.y - 8, 3, 8, "#7a5230");
    ellipse(g, p.x, p.y - 13, 7, 6, "#3e8e3e");
    ellipse(g, p.x - 2, p.y - 15, 4, 3, "#5aae4f");
  }
}

/** bewegtes Glitzern auf dem Wasser (ruhig, Zyklus 4 s) */
export function drawWaterSparkle(g: G, iso: Iso, t: number) {
  const rnd = seeded(9);
  for (let i = 0; i < 70; i++) {
    const tx = Math.floor(rnd() * iso.G);
    const ty = iso.c - RIVER_HALF + Math.floor(rnd() * (2 * RIVER_HALF + 1));
    if (tx === iso.c) continue;
    const p = tile(iso, tx, ty);
    const a = (Math.sin(t * (Math.PI / 2) + i * 1.7) + 1) / 2;
    if (a > 0.55) R(g, p.x - 2 + (i % 3), p.y - 1, 3, 1, "#cfeaff");
  }
}

/** Ruderboot (x/y = Mitte unten) */
export function drawBoat(g: G, x: number, y: number) {
  R(g, x - 12, y - 4, 24, 4, "#8b5a2b");
  R(g, x - 10, y, 20, 2, "#6b4226");
  R(g, x - 13, y - 5, 26, 1, "#a87040");
  R(g, x - 4, y - 4, 2, 4, "#6b4226");
  R(g, x + 4, y - 4, 2, 4, "#6b4226");
}

// --- gemeinsame Kleinigkeiten ----------------------------------------------------------------
/** Koch-Bär in der Durchreiche (x = linke Kante, doppelt so groß) */
export function drawBear(
  g: G,
  bx: number,
  by: number,
  sprite: { rows: string[]; pal: Record<string, string> },
  mood: "" | "happy" | "surprised",
) {
  R(g, bx - 8, 2, 48, 46, "#8a5a33");
  R(g, bx - 5, 5, 42, 40, "#5a3a22");
  sprite.rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx]!;
      if (ch === ".") continue;
      R(g, bx + rx * 2, by + ry * 2, 2, 2, sprite.pal[ch] ?? "#f0f");
    }
  });
  if (mood === "happy") {
    R(g, bx + 8, by + 14, 2, 2, "#9a6233");
    R(g, bx + 22, by + 14, 2, 2, "#9a6233");
    for (const x of [6, 10, 20, 24]) R(g, bx + x, by + 15, 2, 1, "#2b2233");
  }
  if (mood === "surprised") R(g, bx + 14, by + 20, 4, 4, "#2b2233");
  R(g, bx - 10, 44, 52, 5, "#c88a52");
}

/** winzige Pixel-Ziffern (3 × 5) */
const DIGITS = [
  "111101101101111",
  "010110010010111",
  "111001111100111",
  "111001111001111",
  "101101111001001",
  "111100111001111",
  "111100111101111",
  "111001001001001",
  "111101111101111",
  "111101111001111",
];
export function drawNumber(g: G, n: number, cx: number, cy: number, color: string) {
  const s = String(n);
  const w = s.length * 4 - 1;
  let x = Math.round(cx - w / 2);
  const y = Math.round(cy - 2);
  g.fillStyle = color;
  for (const ch of s) {
    const bits = DIGITS[Number(ch)]!;
    for (let i = 0; i < 15; i++)
      if (bits[i] === "1") g.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1);
    x += 4;
  }
}

/** Raute beliebiger Größe (Iso-Kachel), Mitte cx/cy, Breite w (gerade) */
export function rhombus(g: G, cx: number, cy: number, w: number, color: string) {
  const h = w / 2;
  g.fillStyle = color;
  for (let r = 0; r < h; r++) {
    const hw = Math.max(1, Math.round((w / 2) * (1 - Math.abs(r + 0.5 - h / 2) / (h / 2))));
    g.fillRect(Math.round(cx - hw), Math.round(cy - h / 2 + r), hw * 2, 1);
  }
}

/** ruhig funkelnde Sterne (Zyklus ≥ 4 s); hell, wenn `bright` */
export function seededStars(g: G, vw: number, h: number, t: number, bright = false) {
  const r = seeded(5);
  for (let i = 0; i < 50; i++) {
    const a = (Math.sin(t * (Math.PI / 2) + i) + 1) / 2;
    g.fillStyle = bright || a > 0.5 ? "#ffffff" : "#8a96c8";
    g.fillRect(Math.round(r() * vw), Math.round(r() * h), 1, 1);
  }
}
