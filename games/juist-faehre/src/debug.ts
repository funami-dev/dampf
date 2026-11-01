export interface DebugHooks {
  state(): Record<string, unknown>;
  /** Schiff versetzen (Logik-Koordinaten), Geschwindigkeit 0 */
  teleport(x: number, z: number, heading: number): void;
  /** Kamera fest einstellen, z. B. für Vorschaubilder */
  photo(from: [number, number, number], to: [number, number, number]): void;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
