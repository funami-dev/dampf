export interface DebugHooks {
  state(): Record<string, unknown>;
  /** Bildschirmposition (clientX/Y) einer Ware bzw. der Scannermitte, für E2E-Ziehen */
  screenPos(uid: string): [number, number] | null;
  scannerPos(): [number, number];
  bagPos(): [number, number];
  /** Kamera fest einstellen, z. B. für Vorschaubilder */
  photo(from: [number, number, number], to: [number, number, number]): void;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
