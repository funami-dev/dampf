import type Phaser from "phaser";
import { T } from "../logic/world.ts";
import { HS, TH, TW } from "./iso.ts";
import { SPECIES, type Species } from "../logic/species.ts";

/** Pixel-Grafiken, alle per Code gezeichnet (keine Bilddateien). */
type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Raute Zeile für Zeile, damit die Kanten pixelig bleiben */
function diamond(g: Ctx, top: number, color: string) {
  g.fillStyle = color;
  for (let r = 0; r < TH; r++) {
    const half = r < TH / 2 ? (r + 1) * 2 : (TH - r) * 2;
    g.fillRect(TW / 2 - half, top + r, half * 2, 1);
  }
}

function speckle(g: Ctx, top: number, color: string, n: number, seed: number) {
  g.fillStyle = color;
  let s = seed;
  for (let k = 0; k < n; k++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const r = 2 + (s % (TH - 4));
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const half = r < TH / 2 ? (r + 1) * 2 : (TH - r) * 2;
    const x = TW / 2 - half + 2 + (s % Math.max(1, half * 2 - 4));
    g.fillRect(x, top + r, 1, 1);
  }
}

const TILE_COLORS: Record<number, [string, string]> = {
  [T.GRASS]: ["#6aa84f", "#8cc66a"],
  [T.FOREST]: ["#3f7a34", "#2f5f27"],
  [T.WATER]: ["#3a7bd5", "#6fa7ea"],
  [T.FORD]: ["#5f9bd8", "#c9c2a8"],
  [T.BRIDGE]: ["#8b5a2b", "#6b421d"],
  [T.ROCK]: ["#8d8d8d", "#b3b3b3"],
  [T.SAND]: ["#d9c58a", "#c4ae6f"],
  [T.SEA]: ["#1f4f8f", "#5d8fd0"],
  [T.WRECK]: ["#6f7550", "#545a3a"],
};

export const tileKey = (t: number, v: number) => `tile${t}_${v}`;

function addTiles(tex: Phaser.Textures.TextureManager) {
  for (const [t, [base, dot]] of Object.entries(TILE_COLORS)) {
    for (let v = 0; v < 3; v++) {
      const [c, g] = canvas(TW, TH + HS);
      // Seitenflächen (Erde) unter der Raute
      // Seiten in einem dunkleren Ton der Oberfläche, darunter etwas Erde
      const side = shade(base, 0.62);
      for (let r = 0; r < HS + TH / 2; r++) {
        const earth =
          r > TH / 2 + 2 && Number(t) !== T.WATER && Number(t) !== T.ROCK && Number(t) !== T.SEA;
        g.fillStyle = earth ? "#5e4630" : shade(base, 0.5);
        g.fillRect(0, TH / 2 + r, TW / 2, 1);
        g.fillStyle = earth ? "#6e5238" : side;
        g.fillRect(TW / 2, TH / 2 + r, TW / 2, 1);
      }
      // Kanten der Seiten an die Raute anpassen (unten spitz)
      g.clearRect(0, TH + HS - 1, TW, 1);
      diamond(g, 0, base);
      speckle(
        g,
        0,
        dot,
        Number(t) === T.WATER || Number(t) === T.SEA ? 4 : 9,
        Number(t) * 31 + v * 7 + 1,
      );
      if (Number(t) === T.BRIDGE) {
        g.fillStyle = "#5a3818";
        for (let k = 2; k < TH; k += 3) g.fillRect(4, k, TW - 8, 1);
      }
      if (Number(t) === T.FORD) {
        g.fillStyle = "#d8d2bb";
        for (const [x, y] of [
          [10, 6],
          [16, 8],
          [21, 7],
          [14, 11],
        ])
          g.fillRect(x!, y!, 3, 2);
      }
      tex.addCanvas(tileKey(Number(t), v), c);
    }
  }
}

function addTree(tex: Phaser.Textures.TextureManager) {
  for (let v = 0; v < 2; v++) {
    const [c, g] = canvas(24, 40);
    g.fillStyle = "#5b3a1e";
    g.fillRect(10, 30, 4, 9);
    const leaf = v ? ["#2e6b2a", "#3f8a35", "#245520"] : ["#2a5e3a", "#3b7d4c", "#1f4a2d"];
    for (const [y, w] of [
      [22, 22],
      [14, 18],
      [7, 13],
      [1, 7],
    ] as const) {
      g.fillStyle = leaf[2]!;
      g.fillRect(12 - w / 2, y + 6, w, 3);
      g.fillStyle = leaf[0]!;
      for (let r = 0; r < 8; r++) {
        const ww = Math.round((w * (r + 1)) / 8);
        g.fillRect(12 - ww / 2, y + r - 1, ww, 1);
      }
      g.fillStyle = leaf[1]!;
      g.fillRect(12 - w / 4, y + 3, 2, 2);
    }
    tex.addCanvas(`tree${v}`, c);
  }
  const [c, g] = canvas(12, 8);
  g.fillStyle = "#6b4423";
  g.fillRect(2, 2, 8, 5);
  g.fillStyle = "#c9a26b";
  g.fillRect(2, 1, 8, 2);
  g.fillStyle = "#8b5a2b";
  g.fillRect(5, 1, 2, 1);
  tex.addCanvas("stump", c);
}

function addBush(tex: Phaser.Textures.TextureManager) {
  for (const full of [true, false]) {
    const [c, g] = canvas(16, 12);
    g.fillStyle = "#2f6b2a";
    g.fillRect(2, 4, 12, 7);
    g.fillRect(4, 2, 8, 9);
    g.fillStyle = "#3f8a35";
    g.fillRect(4, 3, 4, 3);
    g.fillRect(9, 5, 3, 3);
    if (full) {
      g.fillStyle = "#c2185b";
      for (const [x, y] of [
        [4, 6],
        [8, 4],
        [11, 7],
        [6, 9],
        [10, 9],
      ])
        g.fillRect(x!, y!, 2, 2);
    }
    tex.addCanvas(full ? "bush" : "bushEmpty", c);
  }
}

export function addTent(tex: Phaser.Textures.TextureManager, color: string) {
  const key = `tent${color}`;
  if (tex.exists(key)) return key;
  const [c, g] = canvas(28, 22);
  for (let r = 0; r < 18; r++) {
    const w = Math.round(2 + r * 1.4);
    g.fillStyle = shade(color, 0.75);
    g.fillRect(14 - w, 2 + r, w, 1);
    g.fillStyle = color;
    g.fillRect(14, 2 + r, w, 1);
  }
  g.fillStyle = "#2b2b2b";
  for (let r = 8; r < 18; r++)
    g.fillRect(13 - Math.round((r - 8) * 0.4), 2 + r, 1 + Math.round((r - 8) * 0.8), 1);
  g.fillStyle = "#5b3a1e";
  g.fillRect(13, 0, 2, 3);
  tex.addCanvas(key, c);
  return key;
}

function addFire(tex: Phaser.Textures.TextureManager) {
  for (let f = 0; f < 3; f++) {
    const [c, g] = canvas(16, 18);
    g.fillStyle = "#6b4423";
    g.fillRect(2, 14, 12, 3);
    g.fillStyle = "#8b5a2b";
    g.fillRect(4, 13, 8, 2);
    g.fillStyle = "#777";
    for (const x of [1, 5, 10, 13]) g.fillRect(x, 16, 2, 2);
    if (f < 2) {
      const o = f;
      g.fillStyle = "#e65100";
      g.fillRect(4, 6 + o, 8, 8 - o);
      g.fillStyle = "#ff9800";
      g.fillRect(5, 3 + o, 6, 9 - o);
      g.fillStyle = "#ffeb3b";
      g.fillRect(7, 6 + o, 3, 6 - o);
      g.fillRect(6 + o, 1 + o, 2, 3);
    }
    tex.addCanvas(f < 2 ? `fire${f}` : "ash", c);
  }
}

/** Fallschirm in der Farbe des Spielers */
export function addChute(tex: Phaser.Textures.TextureManager, color: string) {
  const key = `chute${color}`;
  if (tex.exists(key)) return key;
  const [c, g] = canvas(26, 26);
  for (let r = 0; r < 9; r++) {
    const w = Math.round(Math.sqrt(1 - ((8 - r) / 9) ** 2) * 13);
    for (let x = 13 - w; x < 13 + w; x++) {
      g.fillStyle = Math.floor((x - (13 - w)) / 4) % 2 ? color : "#ffffff";
      g.fillRect(x, r, 1, 1);
    }
  }
  g.fillStyle = "#444";
  for (let k = 0; k < 16; k++) {
    g.fillRect(1 + Math.round((k * 11) / 15), 9 + k, 1, 1);
    g.fillRect(24 - Math.round((k * 11) / 15), 9 + k, 1, 1);
  }
  tex.addCanvas(key, c);
  return key;
}

/** Abgestürztes Flugzeug (ohne Logo) */
function addWreck(tex: Phaser.Textures.TextureManager) {
  const [c, g] = canvas(112, 64);
  // Trümmer und verbrannter Boden
  g.fillStyle = "rgba(40,36,28,0.35)";
  g.beginPath();
  g.ellipse(56, 46, 54, 16, 0, 0, Math.PI * 2);
  g.fill();
  // Rumpf (diagonal, isometrisch)
  for (let k = 0; k < 64; k++) {
    const x = 18 + k;
    const y = 44 - k * 0.42;
    g.fillStyle = "#d9dde2";
    g.fillRect(x, y - 7, 2, 12);
    g.fillStyle = "#a9b0b8";
    g.fillRect(x, y + 3, 2, 3);
    if (k % 6 === 2 && k > 8 && k < 52) {
      g.fillStyle = "#2c3e50";
      g.fillRect(x, y - 4, 2, 2);
    }
  }
  // Abgebrochene Bruchkante vorn
  g.fillStyle = "#555";
  g.fillRect(16, 36, 4, 14);
  // Leitwerk
  g.fillStyle = "#c7ccd2";
  for (let r = 0; r < 14; r++) g.fillRect(78 + r * 0.3, 10 + r, 8 - r * 0.4, 1);
  // Abgebrochener Flügel daneben
  g.fillStyle = "#bfc5cc";
  for (let r = 0; r < 8; r++) g.fillRect(30 + r * 3, 52 + r * 0.5, 26, 2);
  g.fillStyle = "#8c939b";
  g.fillRect(30, 52, 2, 6);
  // Kleine Trümmerteile
  g.fillStyle = "#9aa0a6";
  for (const [x, y] of [
    [8, 50],
    [96, 40],
    [100, 52],
    [70, 56],
    [86, 30],
  ])
    g.fillRect(x!, y!, 4, 2);
  tex.addCanvas("wreck", c);
}

export function addPlayerTex(tex: Phaser.Textures.TextureManager, color: string) {
  const key = `player${color}`;
  if (tex.exists(key)) return key;
  const [c, g] = canvas(12, 22);
  g.fillStyle = "#3b3b5c"; // Hose
  g.fillRect(3, 15, 3, 6);
  g.fillRect(7, 15, 3, 6);
  g.fillStyle = "#2b2b2b";
  g.fillRect(3, 20, 3, 2);
  g.fillRect(7, 20, 3, 2);
  g.fillStyle = color; // Jacke
  g.fillRect(2, 8, 9, 8);
  g.fillRect(1, 9, 1, 5);
  g.fillRect(11, 9, 1, 5);
  g.fillStyle = shade(color, 0.7);
  g.fillRect(6, 8, 1, 8);
  g.fillStyle = "#f2c9a0"; // Kopf
  g.fillRect(3, 2, 7, 6);
  g.fillStyle = "#6b4423"; // Haare
  g.fillRect(3, 1, 7, 2);
  g.fillRect(3, 3, 1, 2);
  g.fillStyle = "#222";
  g.fillRect(7, 4, 1, 1);
  g.fillRect(9, 4, 1, 1);
  tex.addCanvas(key, c);
  return key;
}

/** Pixel-Raster einer Tierart als Canvas (für Phaser und das Tierbuch) */
export function speciesCanvas(sp: Species, scale = 1): HTMLCanvasElement {
  const w = Math.max(...sp.pixels.map((r) => r.length));
  const [c, g] = canvas(w * scale, sp.pixels.length * scale);
  sp.pixels.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle = sp.palette[ch]!;
      g.fillRect(x * scale, y * scale, scale, scale);
    }),
  );
  return c;
}

function addAnimals(tex: Phaser.Textures.TextureManager) {
  for (const sp of SPECIES) tex.addCanvas(`animal:${sp.id}`, speciesCanvas(sp));
  // Funkeln für das Einhorn
  const [c, g] = canvas(5, 5);
  g.fillStyle = "#fff6b0";
  g.fillRect(2, 0, 1, 5);
  g.fillRect(0, 2, 5, 1);
  tex.addCanvas("sparkle", c);
}

export function addTextures(tex: Phaser.Textures.TextureManager) {
  addTiles(tex);
  addTree(tex);
  addBush(tex);
  addFire(tex);
  addAnimals(tex);
  addWreck(tex);
  const [c, g] = canvas(TW, TH);
  diamond(g, 0, "rgba(255,255,255,0.45)");
  tex.addCanvas("ghost", c);
  const [c2, g2] = canvas(TW, TH);
  diamond(g2, 0, "rgba(231,76,60,0.5)");
  tex.addCanvas("ghostBad", c2);
}
