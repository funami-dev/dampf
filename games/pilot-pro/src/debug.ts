export interface DebugHooks {
  screen(): string;
  state(): Record<string, unknown>;
}

declare global {
  interface Window {
    __dampf?: DebugHooks;
  }
}

export const debugEnabled = new URLSearchParams(location.search).has("e2e");
