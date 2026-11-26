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
}
export interface Pt {
  x: number;
  y: number;
}
export interface Kit {
  clock(): number;
  speed(): number;
  sound: Sound;
  toast(text: string, secs?: number): void;
  /** Start-Fenster mit Erklärung und „Los!“ */
  intro(title: string, html: string): void;
  setTop(title: string, tools: Tool[], on: (id: string) => void): void;
  setCount(text: string): void;
  /** Ergebnis: Sterne merken, beim ersten Mal die Computer-Karte, dann Ergebnis-Fenster */
  finish(o: {
    chapter: string;
    level: string;
    stars: number;
    text: string;
    next: (() => void) | null;
    again: () => void;
  }): void;
  map(): void;
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
