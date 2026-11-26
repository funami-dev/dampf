/**
 * Gemeinsame Schnittstelle der Kapitel (Spec: Weitere Kapitel). Jedes Kapitel zeichnet in die
 * kleine Pixel-Fläche und nutzt das „Kit“ für Oberfläche, Klang und Ergebnis.
 */
import type { Sound } from "../audio.ts";

export type Region = "suchen" | "wege" | "logik" | "codes";
export const REGIONS: Record<Region, { title: string; color: string }> = {
  suchen: { title: "🔍 Suchen & Sortieren", color: "#f6d55c" },
  wege: { title: "🧭 Wege & Netze", color: "#7fcc68" },
  logik: { title: "🧩 Logik & Zustände", color: "#76c2ea" },
  codes: { title: "🔐 Codes & Muster", color: "#f4a0a8" },
};

export interface Tool {
  id: string;
  label: string;
  primary?: boolean;
  pressed?: boolean;
  /** Zahlenfeld statt Knopf (der Wert geht mit jedem Knopfdruck mit) */
  number?: { min: number; max: number; value: number };
}
export interface Pt {
  x: number;
  y: number;
}
export interface Kit {
  clock(): number;
  /** Mindest-Trefferradius in Bildflächen-Punkten (44 × 44 Bildschirmpunkte) */
  hitR(): number;
  speed(): number;
  sound: Sound;
  toast(text: string, secs?: number): void;
  /** Start-Fenster mit Erklärung und „Los!“ */
  intro(title: string, html: string): void;
  setTop(title: string, tools: Tool[], on: (id: string, value?: number) => void): void;
  /** Infokasten unter der Leiste (null = ausblenden) */
  info(html: string | null): void;
  /** eigenes Fenster (Dialog) */
  panel(html: string, label: string): HTMLElement;
  setCount(text: string): void;
  /** Ergebnis: Sterne merken, beim ersten Mal die Computer-Karte, dann Ergebnis-Fenster */
  finish(o: {
    chapter: string;
    level: string;
    stars: number;
    text: string;
    next: (() => void) | null;
    again: () => void;
    /** zusätzlicher Knopf im Ergebnis (z. B. Rätsel-Landkarte, Wettrennen) */
    extra?: { label: string; fn: () => void };
  }): void;
  map(): void;
  /** Rätsel-Landkarte: Lagen, Schritte, eigener und kürzester Weg */
  stateMap(
    g: { nodes: { key: string; dist: number; goal: boolean }[]; edges: [string, string][] },
    mine: string[],
    best: string[],
    card: string,
    after: () => void,
  ): void;
  closePanel(): void;
}
export interface Chapter {
  id: string;
  icon: string;
  title: string;
  region: Region;
  levels: { id: string; label: string }[];
  /** Karte „So denkt ein Computer“ (HTML) */
  card: string;
  start(i: number): void;
  tick(dt: number): void;
  draw(g: CanvasRenderingContext2D, vw: number, vh: number): void;
  down(p: Pt): void;
  move?(p: Pt): void;
  up?(p: Pt): void;
  key?(e: KeyboardEvent): boolean;
  /** Test-Schnittstelle */
  debug(): Record<string, unknown>;
  point?(what: string): Pt | null;
}
export const starsOf = (value: number, min: number) =>
  value <= min ? 3 : value <= min * 1.5 ? 2 : 1;

/** Mindest-Tippfläche in Bildschirmpunkten (halbe Kantenlänge von 44 × 44, KI-AK-18) */
export const TAP_CSS = 22;
/**
 * Nächstgelegenes Ziel zu p (Index) oder −1. Jedes Ziel trifft mindestens im Umkreis `minR`
 * (z. B. TAP_CSS / Maßstab), größere Ziele mit ihrem eigenen Radius `r`.
 */
export function pickNearest(items: { x: number; y: number; r?: number }[], p: Pt, minR: number) {
  let best = -1;
  let bd = Infinity;
  items.forEach((it, i) => {
    const d = Math.hypot(p.x - it.x, p.y - it.y);
    if (d <= Math.max(it.r ?? 0, minR) && d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
