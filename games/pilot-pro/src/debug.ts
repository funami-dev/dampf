export interface DebugHooks {
  screen(): string;
  state(): Record<string, unknown>;
  /** Live-Karte (PP-AK-15..17) */
  map(): {
    mode: "tiles" | "drawn";
    loaded: number;
    failed: number;
    maxLoading: number;
    bigOpen: boolean;
    bigZoom: number;
  };
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
