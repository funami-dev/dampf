/** Test-Schnittstelle, nur mit ?e2e in der URL */
export interface DebugHooks {
  state(): Record<string, unknown>;
  /** Spielzeit um s Sekunden weiterlaufen lassen */
  advance(s: number): void;
  setNeeds(n: Partial<Record<"hunger" | "energy" | "fun" | "clean", number>>): void;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
