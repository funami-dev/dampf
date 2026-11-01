export interface DebugHooks {
  scene(): string;
  /** aktuell gewählte Figur */
  character(): string;
  state(): Record<string, unknown> | null;
  texts(): string[];
  /** Bildschirmposition (CSS-Pixel) eines benannten Objekts. */
  point(name: string): { x: number; y: number } | null;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
