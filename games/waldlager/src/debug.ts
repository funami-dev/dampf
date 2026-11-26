import type { FireworkStyle } from "./logic/fireworks.ts";

export interface DebugHooks {
  state(): Record<string, unknown>;
  /** Figur versetzen (Kachel-Koordinaten) */
  /** Netz-Abriss nachstellen (WL-AK-60) */
  dropNet: () => void;
  teleport(x: number, y: number, fx?: number, fy?: number): void;
  /** Stehfeld neben der Hütte bzw. einem Apfelbaum mit Äpfeln: [x, y, Stehfeld x, y] */
  /** ein umgeknickter Baum der Absturz-Schneise: [x, y] */
  fallenTree(): [number, number] | null;
  hutSpot(): [number, number, number, number] | null;
  /** freies Feld neben der Hügelhöhle: [x, y, Stehfeld x, y] (WL-AK-64) */
  burrowSpot(): [number, number, number, number] | null;
  /** Feuerwerk mit festem Stil zünden (Test-Hilfe, WL-AK-67) */
  firework(style: FireworkStyle, dx?: number, dy?: number, delay?: number): void;
  appleSpot(): [number, number, number, number] | null;
  /** Fallschirm-Landung sofort beenden (Test-Hilfe) */
  finishLanding(): void;
  /** Regenbogenspur auf ein Feld legen (Test-Hilfe, WL-AK-37) */
  markTrail(x: number, y: number): void;
  /** Feld-Infos (für Tests) */
  cell(x: number, y: number): { terrain: number; free: boolean; tree: number };
  /** Ufer-Feld mit Flusswasser daneben: [x, y, Blickrichtung fx, fy] */
  riverSpot(): [number, number, number, number] | null;
  lakeSpot(): [number, number, number, number] | null;
  fishSpot(): [number, number, number, number] | null;
  /** Inventar setzen (Holz, Beeren, Fische) */
  give(items: Partial<Record<"wood" | "berries" | "fish" | "rockets", number>>): void;
  /** nächstes sichtbares, noch nicht entdecktes Tier: [x, y, Art] */
  nearestAnimal(): [number, number, string] | null;
  /** Weltzeit setzen (Sekunden, 600 = ein Tag) */
  setTime(total: number): void;
  /** Leisten setzen */
  setNeeds(n: { hunger?: number; rest?: number; fitness?: number }): void;
  /** nächster stehender Baum mit freiem Feld daneben: [Baum x, y, Stehfeld x, y] */
  nearestTree(): [number, number, number, number] | null;
  /** nächster Strauch mit Beeren und freiem Feld daneben: [Stehfeld x, y] */
  nearestBush(): [number, number] | null;
  /** freies, ebenes Feld zum Bauen: [Stehfeld x, y, Blickrichtung fx, fy] */
  buildSpot(): [number, number, number, number] | null;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
