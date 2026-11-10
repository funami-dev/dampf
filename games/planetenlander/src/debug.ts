/** Test-Schnittstelle, nur mit ?e2e in der URL (keine Cheats im normalen Spiel) */
export interface DebugHooks {
  state(): {
    screen: string;
    paused: boolean;
    body: string | null;
    alt: number;
    x: number;
    vx: number;
    vy: number;
    angle: number;
    fuel: number;
    padCenter: number;
    result: { landed: boolean; reason: string; stars: number } | null;
    best: Record<string, number>;
  };
  /** Fähre über die Plattformmitte setzen: Höhe über Boden, Geschwindigkeiten, Neigung in Grad */
  place(alt: number, vy: number, vx?: number, angle?: number): void;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
