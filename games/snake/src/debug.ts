import type { GameState } from "./logic/snake.ts";

/**
 * Lese-Schnittstelle für E2E-Tests. Nur aktiv mit ?e2e in der URL, damit der normale
 * Spielbetrieb keine Cheats anbietet.
 */
export interface DebugHooks {
  scene(): string;
  state(): (GameState & { paused: boolean }) | null;
  grow(n: number): void;
  /** Sichtbare Texte der aktiven Szene (Canvas-Inhalt ist sonst nicht auslesbar). */
  texts(): string[];
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
