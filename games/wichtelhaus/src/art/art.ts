/**
 * Feinere Pixel-Art (WH-AK-15/16): alles per Code auf kleine Leinwände gezeichnet, ein
 * Bildpunkt = eine Haus-Einheit. Die Bilder werden einmal erzeugt und dann nur verschoben.
 */
import { FLOOR_Y, PET, SLEEPER, WICHTEL, WINDOW, windowX } from "../logic/furniture.ts";
import type { Pet, Room } from "../logic/wichtel.ts";

type Ctx = CanvasRenderingContext2D;

export function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

/** Farbe aufhellen (f > 1) oder abdunkeln (f < 1) */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const R = (g: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
/** Kasten mit Licht oben/links und Schatten unten/rechts */
function box(g: Ctx, x: number, y: number, w: number, h: number, c: string) {
  R(g, x, y, w, h, c);
  R(g, x, y, w, 1, shade(c, 1.35));
  R(g, x, y + 1, 1, h - 1, shade(c, 1.15));
  R(g, x, y + h - 1, w, 1, shade(c, 0.6));
  R(g, x + w - 1, y + 1, 1, h - 1, shade(c, 0.75));
}
/** kleiner Zufall, immer gleich je Zahl */
const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

// --- Räume ------------------------------------------------------------------------
const WALL: Record<Room, string> = {
  kueche: "#e9d8b4",
  wohnzimmer: "#d9c6a5",
  werkstatt: "#cdb48e",
  bad: "#c9dde0",
  musik: "#e2cfe0",
  schlafzimmer: "#c9cfe8",
  dachboden: "#b89a74",
};

/** Wand mit Tapete, Dielen, Fußleiste; das Fenster bleibt durchsichtig (Himmel dahinter) */
export function roomArt(room: Room, w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const base = WALL[room];
  R(g, 0, 0, w, h, base);
  // Tapete: je Raum ein leises Muster
  const pat = shade(base, 0.92);
  const light = shade(base, 1.08);
  for (let y = 0; y < FLOOR_Y - 10; y++)
    for (let x = 0; x < w; x++) {
      let on: boolean;
      switch (room) {
        case "kueche": // kleine Karos
          on = (x % 8 === 0 || y % 8 === 0) && (x + y) % 2 === 0;
          break;
        case "wohnzimmer": // Streifen
          on = x % 10 < 2;
          break;
        case "werkstatt": // Holzbretter
          on = y % 12 === 0 || (x + Math.floor(y / 12) * 17) % 40 === 0;
          break;
        case "bad": // Fliesen unten, oben glatt
          on = y > 52 && (x % 9 === 0 || y % 9 === 0);
          break;
        case "musik": // Notenpünktchen
          on = (x % 12 === 3 && y % 14 === 5) || (x % 12 === 9 && y % 14 === 12);
          break;
        case "schlafzimmer": // Sterne
          on =
            (x % 16 === 8 && y % 16 >= 6 && y % 16 <= 8) ||
            (y % 16 === 7 && x % 16 >= 7 && x % 16 <= 9);
          break;
        default:
          on = false;
      }
      if (on) R(g, x, y, 1, 1, pat);
    }
  // Schatten unter der Decke
  R(g, 0, 0, w, 2, shade(base, 0.8));
  R(g, 0, 2, w, 1, shade(base, 0.9));
  // Wandleiste und Fußleiste
  R(g, 0, FLOOR_Y - 12, w, 1, light);
  R(g, 0, FLOOR_Y - 3, w, 3, "#e8dcc6");
  R(g, 0, FLOOR_Y - 3, w, 1, "#fff6e6");
  // Dielen mit Maserung
  const wood = "#9a7350";
  R(g, 0, FLOOR_Y, w, h - FLOOR_Y, wood);
  for (let y = FLOOR_Y; y < h; y += 3) {
    R(g, 0, y, w, 1, shade(wood, 1.15));
    const off = Math.floor(hash(y) * 30);
    for (let x = off; x < w; x += 30) R(g, x, y, 1, 3, shade(wood, 0.7));
  }
  for (let k = 0; k < w / 6; k++)
    R(g, Math.floor(hash(k * 7) * w), FLOOR_Y + 1 + (k % 6), 2, 1, shade(wood, 0.85));
  // linke Wand (Balken)
  R(g, 0, 0, 3, h, "#5a4434");
  R(g, 2, 0, 1, h, "#6d5442");
  // Fenster: Rahmen, Sprossen, Fensterbank, Gardinen; Glas bleibt frei
  const wx = windowX(w);
  const { y: wy, w: ww, h: wh } = WINDOW;
  box(g, wx - 2, wy - 2, ww + 4, wh + 4, "#6b4f37");
  g.clearRect(wx, wy, ww, wh);
  R(g, wx + ww / 2 - 1, wy, 2, wh, "#6b4f37");
  R(g, wx, wy + wh / 2 - 1, ww, 2, "#6b4f37");
  box(g, wx - 4, wy + wh + 2, ww + 8, 3, "#8a6a4a");
  const curtain = room === "bad" ? "#e9f3f6" : shade(base, 1.25);
  for (const [cx, dir] of [
    [wx - 5, 1],
    [wx + ww - 1, -1],
  ] as const) {
    for (let y = wy - 3; y < wy + wh + 1; y++) {
      const width = 6 - Math.floor((y - wy) / 10);
      R(g, dir > 0 ? cx : cx + 6 - width, y, Math.max(2, width), 1, curtain);
      if (y % 3 === 0) R(g, cx + 2, y, 1, 1, shade(curtain, 0.85));
    }
  }
  R(g, wx - 7, wy - 4, ww + 14, 2, "#5a4434"); // Gardinenstange
  return c;
}

/** Fensterglas-Bereich im Raumbild (für den Himmel dahinter) */
export const windowRect = (roomW: number) => ({
  x: windowX(roomW),
  y: WINDOW.y,
  w: WINDOW.w,
  h: WINDOW.h,
});

// --- Möbel ------------------------------------------------------------------------
type Draw = (g: Ctx, w: number, h: number) => void;
const ART: Record<string, Draw> = {
  herd(g, w, h) {
    box(g, 0, 4, w, h - 4, "#9aa0a8");
    R(g, 0, 4, w, 3, "#7d838b");
    for (const x of [4, 15]) {
      R(g, x, 1, 9, 3, "#3b3f44"); // Platten
      R(g, x + 1, 2, 7, 1, "#5b6168");
    }
    box(g, 3, 12, w - 6, h - 18, "#2f3338"); // Ofentür
    R(g, 5, 14, w - 10, 5, "#4a5058");
    R(g, 6, 15, 6, 1, "#7e8791");
    R(g, 8, 10, w - 16, 1, "#c9ced4"); // Griff
    for (const x of [4, 10, 16, 22]) R(g, x, 7, 2, 2, "#dfe3e7");
  },
  tisch(g, w, h) {
    box(g, 0, 0, w, 4, "#8a5a3a");
    R(g, 1, 4, w - 2, 1, "#5e3c26");
    for (const x of [3, w - 6]) box(g, x, 4, 3, h - 4, "#7a4f33");
  },
  schrank(g, w, h) {
    box(g, 0, 0, w, h, "#a77b4f");
    R(g, 0, 0, w, 2, "#8a6040");
    for (let y = 6; y < h - 4; y += 12) {
      R(g, 2, y + 9, w - 4, 2, "#7d5636"); // Regalböden
      R(g, 2, y + 9, w - 4, 1, "#c09468");
    }
    R(g, 2, 3, w - 4, h - 6, "rgba(40,24,12,0.12)");
  },
  sofa(g, w, h) {
    box(g, 0, 6, w, h - 10, "#a65454"); // Lehne
    box(g, 2, 14, w - 4, 8, "#b86464"); // Sitz
    for (let x = 4; x < w - 4; x += 12) R(g, x + 11, 15, 1, 6, "#8f4646");
    box(g, 0, 12, 6, h - 16, "#944a4a"); // Armlehnen
    box(g, w - 6, 12, 6, h - 16, "#944a4a");
    box(g, w - 18, 4, 9, 9, "#e6c26e"); // Kissen
    R(g, w - 15, 7, 3, 3, "#f3d991");
    for (const x of [2, w - 4]) R(g, x, h - 4, 2, 4, "#5e3c26");
  },
  kamin(g, w, h) {
    box(g, 0, 0, w, 4, "#8a7a6a"); // Sims
    for (let y = 4; y < h; y += 4)
      for (let x = (y / 4) % 2 ? 0 : 3; x < w; x += 7) box(g, x, y, 6, 4, "#8d7d6d");
    R(g, 6, 10, w - 12, h - 10, "#2a1d16");
    R(g, 6, 10, w - 12, 2, "#1a120d");
    R(g, 8, h - 4, w - 16, 2, "#5a3a24"); // Holzscheite
    R(g, 10, h - 6, w - 20, 2, "#6b4a2e");
  },
  regal(g, w, h) {
    box(g, 0, 0, w, h, "#6b4a2e");
    const books = ["#c0392b", "#2e86c1", "#27ae60", "#d68910", "#8e44ad", "#16a085"];
    for (let s = 0; s < 4; s++) {
      const y = 3 + s * 13;
      R(g, 2, y, w - 4, 11, "#4a3220");
      let x = 3;
      let i = s * 3;
      while (x < w - 4) {
        const bw = 2 + Math.floor(hash(i) * 3);
        const bh = 7 + Math.floor(hash(i + 50) * 4);
        const c = books[i % books.length]!;
        R(g, x, y + 11 - bh, bw, bh, c);
        R(g, x, y + 11 - bh, 1, bh, shade(c, 1.3));
        R(g, x, y + 13 - bh, bw, 1, shade(c, 1.6));
        x += bw + 1;
        i++;
      }
      R(g, 1, y + 11, w - 2, 2, "#7d5a3a");
    }
  },
  werkbank(g, w, h) {
    box(g, 0, 0, w, 5, "#a06a40");
    for (let x = 2; x < w; x += 9) R(g, x, 1, 5, 1, "#b8805a");
    for (const x of [3, w - 7]) box(g, x, 5, 4, h - 5, "#8a5a3a");
    R(g, 7, 15, w - 14, 2, "#7a4f33");
    // Hammer
    R(g, 8, 1, 8, 2, "#7a7f86");
    R(g, 16, 1, 6, 1, "#8a5a3a");
    box(g, 30, h - 8, 14, 8, "#c97a3a"); // Kiste
  },
  wandregal(g, w, h) {
    box(g, 0, 0, w, 3, "#6b4a2e");
    R(g, 2, 3, 2, h - 3, "#5a3e26");
    R(g, w - 4, 3, 2, h - 3, "#5a3e26");
  },
  wanne(g, w, h) {
    box(g, 0, 4, w, h - 8, "#f4f6f7");
    R(g, 2, 4, w - 4, 4, "#9fd3e8"); // Wasser
    R(g, 4, 4, 8, 1, "#d4eef7");
    R(g, w - 6, 0, 2, 5, "#c0c6cc"); // Hahn
    R(g, w - 9, 0, 5, 2, "#c0c6cc");
    for (const x of [3, w - 6]) R(g, x, h - 4, 3, 4, "#c9a227");
    R(g, 10, 1, 4, 3, "#f1c40f"); // Badeente
    R(g, 14, 2, 2, 1, "#e67e22");
  },
  waschbecken(g, w, h) {
    box(g, 2, 0, w - 4, 18, "#d0e6ea"); // Spiegel
    R(g, 4, 2, w - 8, 14, "#e9f6f8");
    R(g, 6, 4, 2, 6, "#ffffff");
    box(g, 0, 22, w, 6, "#f4f6f7"); // Becken
    R(g, w / 2 - 1, 19, 2, 3, "#c0c6cc");
    box(g, w / 2 - 3, 28, 6, h - 28, "#e3e8ea");
  },
  klavier(g, w, h) {
    box(g, 0, 0, w, h - 12, "#2b2b2b");
    R(g, 0, 0, w, 3, "#3d3d3d");
    R(g, 2, 4, w - 4, 1, "#454545");
    box(g, 20, 6, 20, 10, "#f3ead8"); // Noten
    for (let y = 8; y < 15; y += 2) R(g, 22, y, 16, 1, "#b8ad98");
    R(g, 0, h - 30, w, 2, "#1d1d1d");
    R(g, 2, h - 28, w - 4, 7, "#fafafa"); // Tasten
    for (let x = 2; x < w - 2; x += 4) R(g, x, h - 28, 1, 7, "#c9c9c9");
    for (let i = 0; i < 13; i++)
      if (i % 7 !== 2 && i % 7 !== 6) R(g, 5 + i * 4, h - 28, 2, 4, "#111111");
    R(g, 0, h - 21, w, 3, "#2b2b2b");
    for (const x of [3, w - 6]) box(g, x, h - 18, 3, 18, "#2b2b2b");
    R(g, 20, h - 3, 8, 2, "#c9a227"); // Pedale
  },
  hocker(g, w, h) {
    box(g, 0, 0, w, 4, "#8a5a3a");
    R(g, 1, 1, w - 2, 1, "#a8724a");
    for (const x of [2, w - 5]) box(g, x, 4, 3, h - 4, "#7a4f33");
  },
  notenstaender(g, w, h) {
    box(g, 0, 0, w, 9, "#d4a017");
    R(g, 2, 2, w - 4, 5, "#f3ead8");
    R(g, w / 2 - 1, 9, 2, h - 12, "#b88a14");
    R(g, 1, h - 3, w - 2, 3, "#b88a14");
  },
  nachttisch(g, w, h) {
    box(g, 0, 0, w, h, "#8a6040");
    box(g, 2, 5, w - 4, 8, "#9a7050");
    R(g, w / 2 - 2, 8, 4, 1, "#d4a017");
  },
  laterne(g, w, h) {
    R(g, w / 2 - 1, 0, 2, 2, "#3a2a20");
    box(g, 2, 2, w - 4, 2, "#5a4434");
    box(g, 1, h - 2, w - 2, 2, "#5a4434");
    R(g, 3, 4, w - 6, h - 6, "#ffe7a8");
    R(g, 3, 4, 1, h - 6, "#5a4434");
    R(g, w - 4, 4, 1, h - 6, "#5a4434");
    R(g, w / 2 - 1, 7, 2, 4, "#ffffff");
  },
  bett(g, w, h) {
    box(g, 0, 2, 5, h - 2, "#7a4f33"); // Kopfteil
    box(g, w - 4, 10, 4, h - 10, "#7a4f33");
    box(g, 3, 12, w - 6, 8, "#f4f1ea"); // Matratze
    box(g, 6, 9, 14, 6, "#ffffff"); // Kissen
    box(g, 18, 11, w - 22, 10, "#6b8acb"); // Decke
    for (let x = 20; x < w - 6; x += 6)
      for (let y = 13; y < 20; y += 4) R(g, x + ((y / 4) % 2) * 3, y, 2, 2, "#8aa5dc");
    R(g, 3, 20, w - 6, 3, "#7a4f33");
    for (const x of [4, w - 7]) R(g, x, h - 5, 3, 5, "#5e3c26");
  },
};

export const furnitureKeys = Object.keys(ART);

export function furnitureArt(key: string, w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  ART[key]?.(g, w, h);
  return c;
}

// --- Wichtel und Haustiere -----------------------------------------------------------
/** Wichtel von der Seite (Blick nach rechts); Spiegeln für links */
export function wichtelArt(hat: string, frame: (typeof WICHTEL.frames)[number]) {
  const { w, h } = WICHTEL;
  const [c, g] = canvas(w, h);
  const skin = "#f5d0b0";
  const coat = "#5d7a3a";
  const cx = 9;
  // Mütze: Zipfel nach hinten geneigt
  const hatTop = 2;
  for (let y = hatTop; y < 20; y++) {
    const t = (y - hatTop) / (20 - hatTop);
    const half = Math.round(1 + t * 6);
    const lean = Math.round((1 - t) * -4);
    R(g, cx - half + lean, y, half * 2, 1, y < 6 ? shade(hat, 1.2) : hat);
    R(g, cx - half + lean, y, 1, 1, shade(hat, 0.7));
  }
  R(g, cx - 5, hatTop - 1, 3, 3, "#fff8ee"); // Bommel
  R(g, cx - 7, 19, 14, 2, shade(hat, 0.75)); // Krempe
  // Kopf
  R(g, cx - 5, 21, 10, 8, skin);
  R(g, cx - 5, 21, 10, 1, shade(skin, 0.9));
  R(g, cx + 2, 23, 2, 2, "#2b2b2b"); // Auge
  R(g, cx + 2, 23, 1, 1, "#ffffff");
  R(g, cx + 4, 25, 3, 2, "#e8a487"); // Nase
  R(g, cx - 3, 24, 2, 1, "#f2b8a0"); // Wange
  // Bart
  for (let y = 27; y < 34; y++) {
    const half = 6 - Math.floor((y - 27) / 2);
    R(g, cx - half + 1, y, half * 2, 1, y % 2 ? "#ffffff" : "#eef0f2");
  }
  // Körper
  R(g, cx - 5, 31, 10, 9, coat);
  R(g, cx - 5, 31, 2, 9, shade(coat, 1.2));
  R(g, cx + 3, 31, 2, 9, shade(coat, 0.8));
  R(g, cx - 5, 37, 10, 1, "#3b2a1e"); // Gürtel
  R(g, cx, 37, 2, 1, "#d4a017");
  // Arm
  const swing = frame === "walk0" ? -1 : frame === "walk1" ? 1 : 0;
  R(g, cx - 1 + swing, 32, 3, 6, shade(coat, 0.85));
  R(g, cx - 1 + swing, 38, 3, 2, skin);
  // Beine und Schuhe
  const [a, b] = frame === "walk0" ? [-2, 1] : frame === "walk1" ? [1, -2] : [0, 0];
  R(g, cx - 4 + a, 40, 3, 2, "#4a3a2e");
  R(g, cx + 1 + b, 40, 3, 2, "#4a3a2e");
  R(g, cx - 4 + a, 42, 4, 2, "#3b2a1e");
  R(g, cx + 1 + b, 42, 4, 2, "#3b2a1e");
  return c;
}

/** schlafender Wichtel (liegt, Kopf rechts) */
export function sleeperArt(hat: string) {
  const [c, g] = canvas(SLEEPER.w, SLEEPER.h);
  R(g, 0, 6, 20, 7, "#5d7a3a");
  R(g, 0, 6, 20, 1, "#7a9a52");
  R(g, 18, 4, 7, 7, "#f5d0b0");
  R(g, 22, 6, 2, 1, "#8a6a5a"); // geschlossenes Auge
  R(g, 17, 9, 6, 4, "#ffffff");
  for (let x = 0; x < 10; x++) R(g, 18 + x, 4 - Math.floor(x / 3), 1, 3, hat);
  R(g, 26, 0, 2, 2, "#fff8ee");
  return c;
}

export function petArt(pet: Pet) {
  const { w, h } = PET[pet];
  const [c, g] = canvas(w, h);
  if (pet === "katze") {
    const f = "#d68910";
    R(g, 3, 6, 11, 6, f); // Körper
    for (let x = 4; x < 13; x += 3) R(g, x, 7, 1, 4, shade(f, 0.75)); // Streifen
    R(g, 11, 2, 6, 6, f); // Kopf
    R(g, 11, 0, 2, 2, f); // Ohren
    R(g, 15, 0, 2, 2, f);
    R(g, 14, 4, 1, 1, "#2b2b2b");
    R(g, 16, 5, 1, 1, "#e8a487");
    R(g, 0, 3, 2, 6, f); // Schwanz
    R(g, 1, 3, 2, 1, f);
    for (const x of [4, 7, 10, 13]) R(g, x, 12, 2, 2, shade(f, 0.8));
    R(g, 12, 7, 4, 1, "#f5f0e6");
  } else if (pet === "igel") {
    const s = "#6b4f37";
    for (let x = 0; x < 12; x++) {
      const top = 2 + Math.abs(6 - x) / 2;
      R(g, x, top, 1, 9 - top, x % 2 ? s : shade(s, 0.7));
      if (x % 2) R(g, x, top - 1, 1, 1, shade(s, 0.55));
    }
    R(g, 10, 5, 5, 4, "#c9a07a"); // Gesicht
    R(g, 15, 7, 1, 1, "#2b2b2b"); // Nase
    R(g, 12, 6, 1, 1, "#2b2b2b");
    for (const x of [2, 9]) R(g, x, 9, 2, 2, "#8a6a4a");
  } else {
    const d = "#48a36a";
    R(g, 3, 7, 11, 6, d); // Körper
    R(g, 4, 11, 8, 2, "#9fd8a8"); // Bauch
    R(g, 13, 3, 6, 6, d); // Kopf
    R(g, 16, 5, 1, 1, "#2b2b2b");
    R(g, 18, 6, 2, 1, shade(d, 0.7));
    R(g, 13, 1, 1, 2, "#e6c26e"); // Hörnchen
    R(g, 16, 1, 1, 2, "#e6c26e");
    R(g, 5, 3, 6, 4, "#2e7d4f"); // Flügel
    R(g, 6, 2, 4, 1, "#2e7d4f");
    R(g, 0, 8, 4, 2, d); // Schwanz
    R(g, 0, 7, 1, 1, "#e6c26e");
    for (const x of [4, 10]) R(g, x, 13, 3, 3, shade(d, 0.8));
  }
  return c;
}
