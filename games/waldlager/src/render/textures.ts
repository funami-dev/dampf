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
  [T.LAKE]: ["#2f6fb8", "#5b98dc"],
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
          r > TH / 2 + 2 &&
          Number(t) !== T.WATER &&
          Number(t) !== T.ROCK &&
          Number(t) !== T.SEA &&
          Number(t) !== T.LAKE;
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
        Number(t) === T.WATER || Number(t) === T.SEA || Number(t) === T.LAKE ? 4 : 9,
        Number(t) * 31 + v * 7 + 1,
      );
      if (Number(t) === T.BRIDGE) {
        g.fillStyle = "#5a3818";
        for (let k = 2; k < TH; k += 3) g.fillRect(4, k, TW - 8, 1);
      }
      if (Number(t) === T.FORD) {
        // steinige Furt: deutlich sichtbare Trittsteine mit Schatten (WL-AK-50)
        for (const [x, y] of [
          [8, 5],
          [15, 7],
          [22, 6],
          [12, 10],
          [19, 11],
        ]) {
          g.fillStyle = "#4b5560";
          g.fillRect(x!, y! + 2, 5, 1);
          g.fillStyle = "#9aa0a6";
          g.fillRect(x!, y!, 5, 3);
          g.fillStyle = "#c8cdd2";
          g.fillRect(x! + 1, y!, 3, 1);
        }
      }
      tex.addCanvas(tileKey(Number(t), v), c);
    }
  }
}

/** Kiefer, Laubbaum (auch Apfelbaum) und Birke (WL-AK-51) */
function addMoreTrees(tex: Phaser.Textures.TextureManager, v: number) {
  // Kiefer: hoher, schlanker Stamm, flache Krone oben
  {
    const [c, g] = canvas(24, 44);
    g.fillStyle = "#6b3f22";
    g.fillRect(11, 14, 3, 30);
    const leaf = v ? ["#2f5d32", "#3d7340"] : ["#29513a", "#386b48"];
    for (const [y, w] of [
      [4, 16],
      [9, 20],
      [14, 14],
    ] as const) {
      g.fillStyle = leaf[0]!;
      g.fillRect(12 - w / 2, y, w, 6);
      g.fillStyle = leaf[1]!;
      g.fillRect(12 - w / 2 + 2, y, w - 6, 2);
    }
    tex.addCanvas(`kiefer${v}`, c);
  }
  // Laubbaum: runde Krone aus Kreisen; mit Äpfeln als Apfelbaum
  for (const apples of [false, true]) {
    const [c, g] = canvas(26, 40);
    g.fillStyle = "#5b3a1e";
    g.fillRect(11, 24, 4, 15);
    const leaf = v ? ["#3f8a35", "#57a34a", "#2f6e28"] : ["#4a8f3c", "#65b055", "#367328"];
    const blob = (x: number, y: number, r: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    };
    blob(13, 16, 11, leaf[2]!);
    blob(9, 14, 8, leaf[0]!);
    blob(17, 13, 8, leaf[0]!);
    blob(13, 9, 8, leaf[0]!);
    blob(11, 10, 3, leaf[1]!);
    blob(17, 12, 3, leaf[1]!);
    if (apples) {
      g.fillStyle = "#e0301e";
      for (const [x, y] of [
        [7, 15],
        [15, 18],
        [11, 11],
        [19, 13],
        [13, 20],
        [9, 7],
      ])
        g.fillRect(x!, y!, 2, 2);
    }
    tex.addCanvas(`${apples ? "apple" : "laub"}${v}`, c);
  }
  // Birke: weißer Stamm mit dunklen Strichen, hellgrüne, lockere Krone
  {
    const [c, g] = canvas(22, 40);
    g.fillStyle = "#eeeeea";
    g.fillRect(10, 14, 3, 25);
    g.fillStyle = "#3b3b3b";
    for (const y of [17, 22, 27, 32, 36]) g.fillRect(10 + (y % 2), y, 2, 1);
    g.fillStyle = v ? "#8cc56a" : "#9bd17a";
    for (const [x, y, w, h] of [
      [5, 6, 12, 8],
      [3, 11, 16, 6],
      [7, 2, 8, 5],
    ])
      g.fillRect(x!, y!, w!, h!);
    g.fillStyle = "#b8e39c";
    g.fillRect(8, 5, 3, 2);
    g.fillRect(13, 10, 3, 2);
    tex.addCanvas(`birke${v}`, c);
  }
}

/** Felsgipfel in drei Höhen, der höchste mit Schnee (WL-AK-51) */
function addPeaks(tex: Phaser.Textures.TextureManager) {
  for (const k of [0, 1, 2]) {
    const h = [26, 38, 52][k]!;
    const [c, g] = canvas(32, h + 8);
    const base = h + 6;
    // linke helle und rechte dunkle Flanke
    g.fillStyle = "#9a9a9a";
    g.beginPath();
    g.moveTo(2, base);
    g.lineTo(16, 4);
    g.lineTo(16, base);
    g.fill();
    g.fillStyle = "#707070";
    g.beginPath();
    g.moveTo(16, 4);
    g.lineTo(30, base);
    g.lineTo(16, base);
    g.fill();
    g.fillStyle = "#5c5c5c";
    for (let y = 12; y < base; y += 7) g.fillRect(18 + ((y * 3) % 7), y, 3, 1);
    if (k === 2) {
      g.fillStyle = "#f4f6f8";
      g.beginPath();
      g.moveTo(10, 18);
      g.lineTo(16, 4);
      g.lineTo(22, 18);
      g.lineTo(18, 15);
      g.lineTo(15, 19);
      g.fill();
    }
    tex.addCanvas(`peak${k}`, c);
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
    tex.addCanvas(`tanne${v}`, c);
    addMoreTrees(tex, v);
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
/** Kleine Trümmerteile (drei Varianten) */
function addDebris(tex: Phaser.Textures.TextureManager) {
  const shapes = [
    (g: Ctx) => {
      g.fillStyle = "#c7ccd2";
      g.fillRect(2, 4, 10, 3);
      g.fillStyle = "#8c939b";
      g.fillRect(2, 7, 10, 1);
      g.fillStyle = "#2c3e50";
      g.fillRect(5, 5, 2, 1);
    },
    (g: Ctx) => {
      g.fillStyle = "#bfc5cc";
      for (let r = 0; r < 5; r++) g.fillRect(3 + r, 2 + r, 8 - r, 1);
      g.fillStyle = "#7d848c";
      g.fillRect(3, 7, 8, 1);
    },
    (g: Ctx) => {
      g.fillStyle = "#9aa0a6";
      g.fillRect(3, 5, 4, 3);
      g.fillRect(8, 4, 3, 2);
      g.fillStyle = "#d9dde2";
      g.fillRect(4, 3, 6, 2);
    },
  ];
  shapes.forEach((fn, i) => {
    const [c, g] = canvas(14, 10);
    fn(g);
    tex.addCanvas(`debris${i}`, c);
  });
}

function addWreck(tex: Phaser.Textures.TextureManager) {
  // Brandstelle mit kleinem, einmotorigem Hochdecker (ohne Marke/Logo), Feedback fb_90g9p14c
  const [c, g] = canvas(112, 64);
  g.fillStyle = "rgba(30,26,20,0.45)";
  g.beginPath();
  g.ellipse(56, 46, 54, 16, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(20,18,14,0.35)";
  g.beginPath();
  g.ellipse(58, 46, 34, 10, 0, 0, Math.PI * 2);
  g.fill();
  // Rumpf: kurz, nach hinten schmaler (isometrisch schräg)
  for (let k = 0; k < 40; k++) {
    const x = 34 + k;
    const y = 44 - k * 0.42;
    const h = Math.max(4, 10 - k * 0.15);
    g.fillStyle = "#eef0f2";
    g.fillRect(x, y - h + 3, 2, h);
    g.fillStyle = "#c0392b"; // farbiger Streifen
    g.fillRect(x, y, 2, 2);
    g.fillStyle = "#b9bfc6";
    g.fillRect(x, y + 2, 2, 2);
  }
  // Kabinenfenster
  g.fillStyle = "#2c3e50";
  g.fillRect(40, 34, 6, 3);
  g.fillRect(47, 31, 5, 3);
  // Hochdecker-Flügel oben auf der Kabine (rechts noch dran)
  g.fillStyle = "#f5f6f7";
  for (let r = 0; r < 6; r++) g.fillRect(44 + r * 2, 26 - r * 2 + 0.5, 30, 2);
  g.fillStyle = "#c0392b";
  g.fillRect(70, 17, 4, 4);
  // linker Flügel abgeknickt am Boden
  g.fillStyle = "#e3e6e9";
  for (let r = 0; r < 5; r++) g.fillRect(12 + r * 3, 50 + r, 24, 2);
  g.fillStyle = "#9aa0a6";
  g.fillRect(36, 49, 3, 6);
  // Nase mit verbogenem Propeller
  g.fillStyle = "#7f8c8d";
  g.fillRect(30, 40, 5, 6);
  g.fillStyle = "#3d3d3d";
  g.fillRect(28, 34, 2, 8);
  g.fillRect(26, 42, 4, 2);
  g.fillRect(24, 44, 2, 3);
  // Leitwerk
  g.fillStyle = "#eef0f2";
  for (let r = 0; r < 10; r++) g.fillRect(72 + r * 0.3, 12 + r, 6 - r * 0.3, 1);
  g.fillStyle = "#c0392b";
  g.fillRect(73, 14, 3, 3);
  // Fahrwerk und kleine Teile
  g.fillStyle = "#2b2b2b";
  g.fillRect(44, 46, 3, 3);
  g.fillStyle = "#9aa0a6";
  for (const [x, y] of [
    [8, 46],
    [92, 44],
    [98, 52],
    [76, 54],
    [86, 34],
  ])
    g.fillRect(x!, y!, 4, 2);
  tex.addCanvas("wreck", c);

  // umgeknickter, angekohlter Baumstamm (zwei Richtungen) und Stumpf
  for (const v of [0, 1]) {
    const [f, fg] = canvas(26, 14);
    fg.fillStyle = "#2a1f17";
    fg.fillRect(v ? 2 : 18, 5, 6, 6); // Stumpf
    fg.fillStyle = "#1b1410";
    for (let k = 0; k < 18; k++) {
      const x = v ? 6 + k : 2 + k;
      const y = v ? 9 - k * 0.3 : 4 + k * 0.3;
      fg.fillRect(x, y, 2, 3);
    }
    fg.fillStyle = "#4a3426";
    for (let k = 0; k < 18; k += 4)
      fg.fillRect(v ? 6 + k : 2 + k, v ? 9 - k * 0.3 : 4 + k * 0.3, 1, 1);
    fg.fillStyle = "#c0561d"; // Glut
    fg.fillRect(v ? 5 : 19, 6, 1, 1);
    tex.addCanvas(`fallen${v}`, f);
  }
  // angesengter Boden (Raute) und Rauch-Wölkchen
  const [sc, sg] = canvas(32, 16);
  diamond(sg, 0, "rgba(24,20,16,0.42)");
  tex.addCanvas("scorch", sc);
  const [sm, smg] = canvas(16, 16);
  smg.fillStyle = "rgba(200,200,200,0.9)";
  smg.beginPath();
  smg.arc(8, 8, 7, 0, Math.PI * 2);
  smg.fill();
  smg.fillStyle = "rgba(160,160,160,0.6)";
  smg.beginPath();
  smg.arc(10, 6, 4, 0, Math.PI * 2);
  smg.fill();
  tex.addCanvas("smoke", sm);
  // Fische (WL-AK-52): flacher Wasserring und kleines Bläschen
  const [rc, rg] = canvas(32, 16);
  rg.strokeStyle = "rgba(230,245,255,0.9)";
  rg.lineWidth = 1.5;
  rg.beginPath();
  rg.ellipse(16, 8, 14, 6, 0, 0, Math.PI * 2);
  rg.stroke();
  tex.addCanvas("ripple", rc);
  const [bc, bg] = canvas(6, 6);
  bg.strokeStyle = "rgba(235,248,255,0.95)";
  bg.lineWidth = 1;
  bg.beginPath();
  bg.arc(3, 3, 2, 0, Math.PI * 2);
  bg.stroke();
  tex.addCanvas("bubble", bc);
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
  // Regenbogenspur (WL-AK-37): kleiner Bogen in Regenbogenfarben mit Glitzerpunkt
  const [r, rg] = canvas(14, 7);
  ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"].forEach((col, i) => {
    rg.fillStyle = col;
    const y = 1 + i;
    const half = 6 - Math.floor(i / 2);
    rg.fillRect(7 - half, y, half * 2, 1);
  });
  rg.fillStyle = "#ffffff";
  rg.fillRect(3, 0, 1, 1);
  rg.fillRect(10, 2, 1, 1);
  tex.addCanvas("rainbow", r);
}

/** Verlassene Hütte und Pilz (WL-AK-39/41) */
function addHutAndMushroom(tex: Phaser.Textures.TextureManager) {
  const [c, g] = canvas(34, 32);
  // Wände (zwei sichtbare Seiten)
  g.fillStyle = "#7a5230";
  g.fillRect(5, 14, 12, 14);
  g.fillStyle = "#5e3d22";
  g.fillRect(17, 14, 12, 14);
  // Bretter
  g.fillStyle = "#4a2f19";
  for (let y = 17; y < 28; y += 3) g.fillRect(5, y, 24, 1);
  // Dach
  g.fillStyle = "#3b2414";
  for (let r = 0; r < 12; r++) g.fillRect(17 - (r + 2), 3 + r, (r + 2) * 2, 1);
  g.fillStyle = "#5a3a1f";
  g.fillRect(6, 13, 22, 2);
  // Tür und Fenster
  g.fillStyle = "#2a1a0e";
  g.fillRect(9, 20, 5, 8);
  g.fillStyle = "#9ec3d6";
  g.fillRect(21, 18, 4, 3);
  // Moos
  g.fillStyle = "#4f7a35";
  g.fillRect(8, 9, 3, 2);
  g.fillRect(22, 11, 4, 2);
  tex.addCanvas("hut", c);

  const [m, mg] = canvas(10, 9);
  mg.fillStyle = "#f2e8d5";
  mg.fillRect(4, 4, 2, 4);
  mg.fillStyle = "#c0392b";
  mg.fillRect(1, 2, 8, 3);
  mg.fillRect(2, 1, 6, 1);
  mg.fillStyle = "#ffffff";
  mg.fillRect(3, 2, 1, 1);
  mg.fillRect(6, 3, 1, 1);
  tex.addCanvas("mushroom", m);
}

export function addTextures(tex: Phaser.Textures.TextureManager) {
  addTiles(tex);
  addPeaks(tex);
  addHutAndMushroom(tex);
  addTree(tex);
  addBush(tex);
  addFire(tex);
  addAnimals(tex);
  addWreck(tex);
  addDebris(tex);
  const [c, g] = canvas(TW, TH);
  diamond(g, 0, "rgba(255,255,255,0.45)");
  tex.addCanvas("ghost", c);
  const [c2, g2] = canvas(TW, TH);
  diamond(g2, 0, "rgba(231,76,60,0.5)");
  tex.addCanvas("ghostBad", c2);
}
