export interface DebugHooks {
  state(): Record<string, unknown>;
  teleport(x: number, z: number): void;
  /** Bäcker-Mini-Spiel als Erfolg abschließen (gleicher Codepfad wie der Button) */
  bakeSuccess(): void;
  /** Kamera fest einstellen (Weltkoordinaten x Ost, y Höhe, z Nord), z. B. für Vorschaubilder */
  photo(from: [number, number, number], to: [number, number, number]): void;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
