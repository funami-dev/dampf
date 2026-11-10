/** Fortschritt lokal speichern (PL-AK-06) */
import { PLAYABLE } from "./bodies.ts";

export const KEY = "dampf.planetenlander.v1";

export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
}

export interface Progress {
  /** Anzahl freigeschalteter Orte (mindestens 1: der Mond) */
  unlocked: number;
  /** beste Sterne je Ort */
  best: Record<string, number>;
}

export const fresh = (): Progress => ({ unlocked: 1, best: {} });

export function loadProgress(s: Store): Progress {
  try {
    const d = JSON.parse(s.get(KEY) ?? "null") as { v?: number } & Partial<Progress>;
    if (!d || d.v !== 1 || !Number.isInteger(d.unlocked) || typeof d.best !== "object" || !d.best)
      return fresh();
    const unlocked = Math.max(1, Math.min(PLAYABLE.length, d.unlocked!));
    const best: Record<string, number> = {};
    for (const b of PLAYABLE) {
      const n = (d.best as Record<string, unknown>)[b.id];
      if (Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 3) best[b.id] = n as number;
    }
    return { unlocked, best };
  } catch {
    return fresh();
  }
}

export function saveProgress(s: Store, p: Progress) {
  try {
    s.set(KEY, JSON.stringify({ v: 1, ...p }));
  } catch {
    /* Speicher voll oder gesperrt – egal */
  }
}

/** Ergebnis eintragen: Bestwert und nächsten Ort freischalten */
export function record(p: Progress, id: string, stars: number): Progress {
  const i = PLAYABLE.findIndex((b) => b.id === id);
  if (i < 0 || stars < 1) return p;
  return {
    unlocked: Math.max(p.unlocked, Math.min(PLAYABLE.length, i + 2)),
    best: { ...p.best, [id]: Math.max(p.best[id] ?? 0, stars) },
  };
}
