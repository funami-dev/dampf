/**
 * Schnittstelle für E2E-Tests, nur aktiv mit ?e2e in der URL.
 */
export interface DebugHooks {
  scene(): string;
  state(): Record<string, unknown> | null;
  texts(): string[];
  /** Bildschirmposition (CSS-Pixel) eines benannten Objekts, z. B. "card-mauli". */
  point(name: string): { x: number; y: number } | null;
  /** Alle Plattformen entfernen → Figur stürzt ab. */
  fall(): void;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
