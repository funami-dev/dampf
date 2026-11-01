import * as THREE from "three";
import type { Airline } from "../logic/catalog.ts";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Leitwerk-Lackierung: eigenes, schlichtes Symbol in Airline-Farben (keine Logos).
 * `poly` ist der Umriss des Leitwerks in Einheitskoordinaten (0…1), y nach oben.
 */
export function tailTexture(a: Airline, poly: [number, number][]): THREE.Texture {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.beginPath();
  poly.forEach(([x, y], i) => (i ? g.lineTo(x * S, (1 - y) * S) : g.moveTo(x * S, (1 - y) * S)));
  g.closePath();
  g.clip();
  g.fillStyle = a.tail;
  g.fillRect(0, 0, S, S);
  const stripes = (colors: string[], from = 0, to = 1) => {
    const h = ((to - from) * S) / colors.length;
    colors.forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(0, (1 - to) * S + i * h, S, h + 1);
    });
  };
  switch (a.symbol) {
    case "circle":
      g.fillStyle = a.accent;
      g.beginPath();
      g.arc(S * 0.62, S * 0.5, S * 0.2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = a.tail;
      g.lineWidth = S * 0.02;
      g.beginPath();
      g.arc(S * 0.62, S * 0.5, S * 0.15, 0, Math.PI * 2);
      g.stroke();
      break;
    case "flag-stripes":
      stripes([a.accent2, "#ffffff", "#000000"], 0.15, 0.75);
      g.fillStyle = a.accent;
      g.fillRect(S * 0.35, 0, S * 0.12, S);
      break;
    case "arc":
      g.strokeStyle = a.accent;
      g.lineWidth = S * 0.09;
      g.beginPath();
      g.arc(S * 0.1, S * 1.1, S * 0.8, -Math.PI / 2, 0);
      g.stroke();
      break;
    case "h-stripes":
      stripes(Array.from({ length: 10 }, (_, i) => (i % 2 ? a.accent : a.accent2)));
      break;
    case "waves":
      for (const [col, off, w] of [
        [a.accent, 0.55, 0.12],
        [a.accent2, 0.7, 0.06],
        [a.accent, 0.82, 0.05],
      ] as const) {
        g.strokeStyle = col;
        g.lineWidth = S * w;
        g.beginPath();
        g.moveTo(0, S * off);
        g.bezierCurveTo(S * 0.35, S * (off - 0.25), S * 0.65, S * (off + 0.15), S, S * (off - 0.2));
        g.stroke();
      }
      break;
    case "line":
      g.strokeStyle = a.accent;
      g.lineWidth = S * 0.025;
      g.beginPath();
      g.moveTo(S * 0.15, S);
      g.lineTo(S * 0.95, 0);
      g.stroke();
      break;
    case "star-stripes":
      stripes(
        Array.from({ length: 6 }, (_, i) => (i % 2 ? a.accent2 : a.accent)),
        0,
        0.45,
      );
      g.fillStyle = a.accent2;
      for (let i = 0; i < 5; i++)
        star(g, S * (0.45 + (i % 3) * 0.15), S * (0.2 + Math.floor(i / 3) * 0.14), S * 0.04);
      break;
  }
  const t = texture(c);
  return t;
}

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
  }
  g.closePath();
  g.fill();
}

/** Rumpfseite: Fensterreihen und Airline-Name (neutrale Schrift). `flip` spiegelt für die linke Seite. */
export function fuselageSideTexture(a: Airline, decks: 1 | 2, flip: boolean): THREE.Texture {
  const W = 2048;
  const H = 256;
  const [c, g] = canvas(W, H);
  if (flip) {
    g.translate(W, 0);
    g.scale(-1, 1);
  }
  // Fenster (bei flip gespiegelt gezeichnet, damit sie zur Nase passen)
  g.fillStyle = "#26323f";
  const rows = decks === 2 ? [0.62, 0.36] : [0.55];
  for (const r of rows) for (let x = W * 0.12; x < W * 0.86; x += 26) g.fillRect(x, H * r, 12, 18);
  // Cockpitfenster vorn (links = Nase)
  g.fillRect(W * 0.015, H * 0.4, 70, 26);
  // Name: immer lesbar, daher nicht spiegeln
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = a.text;
  g.font = `bold ${decks === 2 ? 64 : 76}px "Helvetica Neue", Arial, sans-serif`;
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText(a.name, W * (flip ? 0.62 : 0.38), H * (decks === 2 ? 0.16 : 0.26));
  return texture(c);
}

export function runwayTexture(): THREE.Texture {
  const [c, g] = canvas(64, 1024);
  g.fillStyle = "#3b3f45";
  g.fillRect(0, 0, 64, 1024);
  g.fillStyle = "#f2f2f2";
  for (let y = 40; y < 984; y += 48) g.fillRect(30, y, 4, 24); // Mittellinie
  for (const y of [4, 1004]) for (let x = 6; x < 58; x += 8) g.fillRect(x, y, 4, 16); // Schwellen
  g.fillRect(2, 0, 2, 1024);
  g.fillRect(60, 0, 2, 1024);
  const t = texture(c);
  return t;
}
