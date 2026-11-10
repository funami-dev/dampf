/** Fortschritt lokal speichern (PL-AK-06) */
import { PLAYABLE } from "./bodies.ts";

export const KEY = "dampf.planetenlander.v1";

export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
}

/** Alle Orte sind sofort spielbar (Feedback fb_2rpon5ao); gespeichert werden nur die Sterne. */
export interface Progress {
  /** beste Sterne je Ort */
  best: Record<string, number>;
}

export const fresh = (): Progress => ({ best: {} });

export function loadProgress(s: Store): Progress {
  try {
    const d = JSON.parse(s.get(KEY) ?? "null") as { v?: number } & Partial<Progress>;
    if (!d || d.v !== 1 || typeof d.best !== "object" || !d.best) return fresh();
    const best: Record<string, number> = {};
    for (const b of PLAYABLE) {
      const n = (d.best as Record<string, unknown>)[b.id];
      if (Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 3) best[b.id] = n as number;
    }
    return { best };
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

/** Ergebnis eintragen: Bestwert je Ort */
export function record(p: Progress, id: string, stars: number): Progress {
  if (!PLAYABLE.some((b) => b.id === id) || stars < 1) return p;
  return { best: { ...p.best, [id]: Math.max(p.best[id] ?? 0, stars) } };
}
