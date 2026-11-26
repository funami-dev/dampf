/** Brücken-Spaziergang (KI-AK-16): jede Brücke genau einmal (Eulerweg) */
export interface Island {
  id: string;
  x: number;
  y: number;
}
export interface EulerLevel {
  id: string;
  islands: Island[];
  bridges: [string, string][];
}
const I = (id: string, x: number, y: number): Island => ({ id, x, y });
export const EULER_LEVELS: EulerLevel[] = [
  {
    id: "e1",
    islands: [I("A", 20, 25), I("B", 80, 25), I("C", 80, 75), I("D", 20, 75)],
    bridges: [
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
      ["D", "A"],
    ],
  },
  {
    id: "e2",
    islands: [I("A", 20, 25), I("B", 80, 25), I("C", 80, 75), I("D", 20, 75)],
    bridges: [
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
      ["D", "A"],
      ["A", "C"],
    ],
  },
  {
    // wie in Königsberg: 4 Inseln, 7 Brücken
    id: "e3",
    islands: [I("A", 50, 50), I("B", 50, 12), I("C", 50, 88), I("D", 88, 50)],
    bridges: [
      ["A", "B"],
      ["A", "B"],
      ["A", "C"],
      ["A", "C"],
      ["A", "D"],
      ["B", "D"],
      ["C", "D"],
    ],
  },
];
export function degrees(l: EulerLevel): Record<string, number> {
  const d: Record<string, number> = Object.fromEntries(l.islands.map((i) => [i.id, 0]));
  for (const [a, b] of l.bridges) {
    d[a]!++;
    d[b]!++;
  }
  return d;
}
/** Rundgang (alle gerade), Weg (2 ungerade: dort starten) oder unmöglich */
export function eulerKind(l: EulerLevel): { kind: "kreis" | "weg" | "unmoeglich"; odd: string[] } {
  const odd = Object.entries(degrees(l))
    .filter(([, n]) => n % 2 === 1)
    .map(([id]) => id);
  return { kind: odd.length === 0 ? "kreis" : odd.length === 2 ? "weg" : "unmoeglich", odd };
}
export interface Walk {
  at: string | null;
  used: boolean[];
  path: string[];
}
export const newWalk = (l: EulerLevel): Walk => ({
  at: null,
  used: l.bridges.map(() => false),
  path: [],
});
/** zur Insel `to` gehen (über eine unbenutzte Brücke); null, wenn das nicht geht */
export function walkTo(l: EulerLevel, w: Walk, to: string): Walk | null {
  if (w.at === null) return { at: to, used: [...w.used], path: [to] };
  const i = l.bridges.findIndex(
    ([a, b], k) => !w.used[k] && ((a === w.at && b === to) || (b === w.at && a === to)),
  );
  if (i < 0) return null;
  const used = [...w.used];
  used[i] = true;
  return { at: to, used, path: [...w.path, to] };
}
export const allUsed = (w: Walk) => w.used.every(Boolean);
export const stuck = (l: EulerLevel, w: Walk) =>
  w.at !== null &&
  !allUsed(w) &&
  !l.bridges.some(([a, b], k) => !w.used[k] && (a === w.at || b === w.at));
/** Tipp (Fleury): eine Brücke, nach der noch alle übrigen erreichbar bleiben */
export function nextIsland(l: EulerLevel, w: Walk): string | null {
  if (w.at === null) {
    const { kind, odd } = eulerKind(l);
    return kind === "unmoeglich" ? null : (odd[0] ?? l.islands[0]!.id);
  }
  const options = l.bridges
    .map(([a, b], k) => ({ k, to: a === w.at ? b : b === w.at ? a : null }))
    .filter((o) => o.to !== null && !w.used[o.k]);
  const remainingOk = (used: boolean[], from: string) => {
    // alle unbenutzten Brücken müssen von `from` aus erreichbar sein
    const left = l.bridges.filter((_, k) => !used[k]);
    if (!left.length) return true;
    const seen = new Set([from]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const [a, b] of left)
        if (seen.has(a) !== seen.has(b)) {
          seen.add(a);
          seen.add(b);
          grew = true;
        }
    }
    return left.every(([a]) => seen.has(a));
  };
  for (const o of options) {
    const used = [...w.used];
    used[o.k] = true;
    if (remainingOk(used, o.to!)) return o.to!;
  }
  return options[0]?.to ?? null;
}
