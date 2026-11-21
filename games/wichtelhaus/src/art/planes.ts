/**
 * Flugzeuge in 16-Bit-Pixelgrafik (WH-AK-19): je Sorte ein kleines Bild, Nase nach rechts.
 * Die Maße stehen als Daten hier (testbar ohne Browser), gezeichnet wird erst im Spiel.
 */
import type { Category } from "../logic/planes.ts";

export interface PlaneArt {
  w: number;
  h: number;
  /** Rumpflänge, Rumpfhöhe, Triebwerke je Seite (sichtbar), Leitwerksfarbe */
  len: number;
  body: number;
  engines: number;
  tail: string;
  kind: "jet" | "prop" | "small" | "heli";
}

export const PLANE_ART: Record<Category, PlaneArt> = {
  kurz: { w: 30, h: 12, len: 30, body: 3, engines: 1, tail: "#2e5fa3", kind: "jet" },
  lang: { w: 36, h: 12, len: 36, body: 3, engines: 1, tail: "#c0392b", kind: "jet" },
  gross: { w: 42, h: 14, len: 42, body: 4, engines: 1, tail: "#16a085", kind: "jet" },
  jumbo: { w: 46, h: 15, len: 46, body: 5, engines: 2, tail: "#d68910", kind: "jet" },
  regional: { w: 24, h: 10, len: 24, body: 3, engines: 1, tail: "#8e44ad", kind: "jet" },
  propeller: { w: 26, h: 12, len: 26, body: 3, engines: 1, tail: "#27ae60", kind: "prop" },
  klein: { w: 16, h: 9, len: 16, body: 2, engines: 0, tail: "#e74c3c", kind: "small" },
  heli: { w: 22, h: 12, len: 22, body: 4, engines: 0, tail: "#f1c40f", kind: "heli" },
};

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

/** Farbe und Deckkraft der Umrisse bei Nacht (wie vom Mond beschienen) */
export const NIGHT_SHAPE = { color: "#6f7ca3", alpha: 0.55 };

/**
 * Pixelbild einer Sorte (Nase rechts); nachts ein matter, halb durchsichtiger Umriss mit ruhigen
 * Positionslichtern
 */
export function planeCanvas(cat: Category, night: boolean): HTMLCanvasElement {
  if (night) {
    const day = planeCanvas(cat, false);
    const c = document.createElement("canvas");
    c.width = day.width;
    c.height = day.height;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    // Umriss: Tagesbild einfärben und halb durchsichtig zeichnen
    const s = document.createElement("canvas");
    s.width = day.width;
    s.height = day.height;
    const sg = s.getContext("2d")!;
    sg.drawImage(day, 0, 0);
    sg.globalCompositeOperation = "source-atop";
    sg.fillStyle = NIGHT_SHAPE.color;
    sg.fillRect(0, 0, s.width, s.height);
    g.globalAlpha = NIGHT_SHAPE.alpha;
    g.drawImage(s, 0, 0);
    g.globalAlpha = 1;
    lights(g, PLANE_ART[cat]);
    return c;
  }
  const a = PLANE_ART[cat];
  const c = document.createElement("canvas");
  c.width = a.w;
  c.height = a.h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  const by = a.h - a.body - 4; // Oberkante Rumpf
  const white = "#f4f6f8";
  const grey = "#b8c2cc";
  const dark = "#4a5560";
  if (a.kind === "heli") {
    R(4, by, 12, a.body, a.tail); // Kabine
    R(4, by, 12, 1, shade(a.tail, 1.2));
    R(12, by + 1, 4, 2, "#9fd3e8"); // Fenster
    R(0, by + 1, 5, 1, a.tail); // Heckausleger
    R(0, by - 1, 1, 3, dark); // Heckrotor
    R(9, by - 2, 2, 2, dark); // Mast
    R(1, by - 3, 20, 1, dark); // Rotor
    R(4, by + a.body + 1, 12, 1, dark); // Kufen
    R(6, by + a.body, 1, 1, dark);
    R(13, by + a.body, 1, 1, dark);
    return c;
  }
  const L = a.len;
  // Rumpf mit runder Nase und schmalem Heck
  R(2, by, L - 5, a.body, white);
  R(L - 3, by + 1, 2, a.body - 1, white);
  R(L - 1, by + Math.floor(a.body / 2), 1, 1, white);
  R(2, by + a.body - 1, L - 4, 1, grey); // Bauch-Schatten
  R(0, by, 3, a.body - 1, white);
  // Leitwerk
  const fin = Math.min(6, a.body + 3);
  for (let i = 0; i < fin; i++)
    R(1 + Math.floor(i / 2), by - fin + i, Math.max(2, 5 - Math.floor(i / 2)), 1, a.tail);
  R(0, by + 1, 5, 1, shade(a.tail, 0.8)); // Höhenleitwerk
  // Fenster und Cockpit
  if (a.kind !== "small") for (let x = 6; x < L - 6; x += 2) R(x, by + 1, 1, 1, "#2e5fa3");
  R(L - 4, by + 1, 2, 1, "#2b3e50");
  // Zierstreifen
  R(3, by + a.body - 2, L - 8, 1, shade(a.tail, 1.1));
  // Flügel (Tiefdecker für Jets, Hochdecker für Propeller/Kleinflugzeug)
  const wx = Math.round(L * 0.45);
  if (a.kind === "jet") {
    for (let i = 0; i < 4; i++) R(wx - i * 2, by + a.body + i, 4, 1, dark);
    for (let e = 0; e < a.engines; e++) {
      const ex = wx - 2 - e * 6;
      R(ex, by + a.body + 1 + e, 4, 2, grey);
      R(ex + 3, by + a.body + 1 + e, 1, 2, dark);
    }
  } else {
    R(wx - 5, by - 1, 10, 1, dark); // Flügel oben
    if (a.kind === "prop") {
      R(wx + 1, by - 1, 3, 2, grey); // Triebwerk
      R(wx + 4, by - 3, 1, 5, "#7f8c8d"); // Propellerkreis
    } else {
      R(L - 1, by - 1, 1, a.body + 2, "#7f8c8d"); // Propeller vorn
      R(4, by + a.body, 1, 2, dark); // Fahrwerk
      R(L - 5, by + a.body, 1, 2, dark);
    }
  }
  return c;
}

/** ruhige Positionslichter: rot (links), grün (rechts), weiß hinten – kein Blinken */
function lights(g: CanvasRenderingContext2D, a: PlaneArt) {
  const by = a.h - a.body - 4;
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  R(Math.round(a.len * 0.45), by + a.body + 1, 2, 2, "#ff4d4d");
  R(Math.round(a.len * 0.55), by + a.body, 2, 2, "#4dff88");
  R(1, by - 1, 2, 2, "#ffffff");
}
