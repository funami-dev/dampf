/** Speichern (KS-AK-05): Fortschritt, Freibau-Schaltung, Klang */
import { emptyCircuit, parseCircuit, type Circuit, type Kind, KINDS } from "./circuit.ts";
import { MISSIONS } from "./missions.ts";

export const KEY = "dampf.kabelsalat.v1";

export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
}

export interface Saved {
  v: 1;
  /** Sterne je geschaffter Mission (1 oder 2) */
  stars: Record<number, number>;
  /** Schaltung je Mission (angefangen) und im Freibau */
  builds: Record<number, Circuit>;
  free: Circuit;
  /** im Bauteile-Buch schon gesehen */
  seen: Kind[];
  volume: number;
  muted: boolean;
}

export const fresh = (): Saved => ({
  v: 1,
  stars: {},
  builds: {},
  free: emptyCircuit(),
  seen: [],
  volume: 0.3,
  muted: false,
});

/** Missionen werden der Reihe nach frei */
export const unlocked = (s: Saved, id: number) => id === 1 || !!s.stars[id - 1];

/** Freibau: alle Teile, die in geschafften (oder der ersten) Missionen vorkamen */
export function freeKinds(s: Saved): Kind[] {
  const out = new Set<Kind>(["batterie", "lampe"]);
  for (const m of MISSIONS)
    if (s.stars[m.id]) for (const k of Object.keys(m.kit) as Kind[]) out.add(k);
  return KINDS.filter((k) => out.has(k));
}

export function save(store: Store, s: Saved) {
  try {
    store.set(KEY, JSON.stringify(s));
  } catch {
    /* Speicher gesperrt */
  }
}

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export function load(store: Store): Saved {
  try {
    const d = JSON.parse(store.get(KEY) ?? "null") as Saved | null;
    if (!d || d.v !== 1) return fresh();
    const stars: Record<number, number> = {};
    for (const [k, v] of Object.entries(d.stars ?? {}))
      if (MISSIONS.some((m) => m.id === Number(k)) && (v === 1 || v === 2)) stars[Number(k)] = v;
    const builds: Record<number, Circuit> = {};
    for (const [k, v] of Object.entries(d.builds ?? {})) {
      const c = parseCircuit(v);
      if (c && MISSIONS.some((m) => m.id === Number(k))) builds[Number(k)] = c;
    }
    return {
      v: 1,
      stars,
      builds,
      free: parseCircuit(d.free) ?? emptyCircuit(),
      seen: Array.isArray(d.seen) ? d.seen.filter((k) => (KINDS as unknown[]).includes(k)) : [],
      volume: num(d.volume) ? Math.max(0, Math.min(1, d.volume)) : 0.3,
      muted: d.muted === true,
    };
  } catch {
    return fresh();
  }
}
