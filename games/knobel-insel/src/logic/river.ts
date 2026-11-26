/**
 * Über den Fluss (Spec: KI-AK-03): allgemeine Fluss-Rätsel mit Plätzen, Gewicht, Ruderern und
 * Regeln je Ufer. Zustände, Fahrten, Breitensuche und Zustandsgraph. Reines TypeScript.
 */
export interface Actor {
  id: string;
  kind: string;
  name: string;
  /** kann rudern */
  rows: boolean;
  /** belegte Plätze im Boot */
  weight: number;
}
export interface RiverLevel {
  id: string;
  title: string;
  text: string;
  actors: Actor[];
  /** Plätze im Boot */
  seats: number;
  /** Prüft eine Gruppe an einem Ufer; gibt den Hinweis zurück, wenn das schiefgeht */
  rule: (kinds: Record<string, number>) => string | null;
}
/** Wer steht wo: 0 = Startufer, 1 = Zielufer; dazu die Seite des Bootes */
export interface State {
  side: Record<string, 0 | 1>;
  boat: 0 | 1;
}

const many = (kind: string, name: string, n: number, extra: Partial<Actor> = {}): Actor[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${kind}${i + 1}`,
    kind,
    name,
    rows: true,
    weight: 1,
    ...extra,
  }));

export const RIVER_LEVELS: RiverLevel[] = [
  {
    id: "f1",
    title: "Fuchs, Gans und Korn",
    text: "Die Bäuerin will mit Fuchs, Gans und einem Sack Korn über den Fluss. Ins Boot passen sie und ein Passagier. Allein darf der Fuchs nicht bei der Gans bleiben – und die Gans nicht beim Korn!",
    seats: 2,
    actors: [
      { id: "baeuerin", kind: "baeuerin", name: "Bäuerin", rows: true, weight: 1 },
      { id: "fuchs", kind: "fuchs", name: "Fuchs", rows: false, weight: 1 },
      { id: "gans", kind: "gans", name: "Gans", rows: false, weight: 1 },
      { id: "korn", kind: "korn", name: "Korn", rows: false, weight: 1 },
    ],
    rule: (k) => {
      if (k.baeuerin) return null;
      if (k.fuchs && k.gans) return "Oh nein! Fuchs und Gans allein – der Fuchs jagt die Gans.";
      if (k.gans && k.korn) return "Hoppla! Die Gans pickt das ganze Korn auf.";
      return null;
    },
  },
  {
    id: "f2",
    title: "Hasen und Füchse",
    text: "Drei Hasen und drei Füchse wollen hinüber. Das Boot hat zwei Plätze, jedes Tier kann rudern. Sind irgendwo mehr Füchse als Hasen, bekommen die Hasen Angst!",
    seats: 2,
    actors: [...many("hase", "Hase", 3), ...many("fuchs", "Fuchs", 3)],
    rule: (k) =>
      (k.hase ?? 0) > 0 && (k.fuchs ?? 0) > (k.hase ?? 0)
        ? "Mehr Füchse als Hasen – die Hasen erschrecken sich!"
        : null,
  },
  {
    id: "f3",
    title: "Biber-Familie",
    text: "Zwei große und zwei kleine Biber wollen über den Fluss. Das Boot trägt einen großen Biber oder zwei kleine. Alle können rudern.",
    seats: 2,
    actors: [
      ...many("gross", "großer Biber", 2, { weight: 2 }),
      ...many("klein", "kleiner Biber", 2),
    ],
    rule: () => null,
  },
];

export const startState = (l: RiverLevel): State => ({
  side: Object.fromEntries(l.actors.map((a) => [a.id, 0 as const])),
  boat: 0,
});
export const cloneState = (s: State): State => ({ side: { ...s.side }, boat: s.boat });
export const isGoal = (l: RiverLevel, s: State) => l.actors.every((a) => s.side[a.id] === 1);

/** Anzahl je Art an einem Ufer */
export function kindsAt(l: RiverLevel, s: State, bank: 0 | 1): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of l.actors) if (s.side[a.id] === bank) out[a.kind] = (out[a.kind] ?? 0) + 1;
  return out;
}
/** Hinweis, wenn an einem Ufer etwas schiefgeht; sonst null */
export function problem(l: RiverLevel, s: State): string | null {
  return l.rule(kindsAt(l, s, 0)) ?? l.rule(kindsAt(l, s, 1));
}
export const valid = (l: RiverLevel, s: State) => problem(l, s) === null;

/** Passt diese Gruppe ins Boot und kann losfahren? (Grund, wenn nicht) */
export function boatCheck(l: RiverLevel, s: State, ids: string[]): string | null {
  const group = l.actors.filter((a) => ids.includes(a.id));
  if (!group.length) return "Das Boot ist leer – wer soll rudern?";
  if (group.some((a) => s.side[a.id] !== s.boat))
    return "Nur wer am Ufer des Bootes steht, kann einsteigen.";
  if (group.reduce((w, a) => w + a.weight, 0) > l.seats) return "So viel passt nicht ins Boot!";
  if (!group.some((a) => a.rows)) return "Niemand im Boot kann rudern.";
  return null;
}
/** Fahrt: die Gruppe fährt mit dem Boot hinüber (ohne Regelprüfung am Ufer) */
export function cross(l: RiverLevel, s: State, ids: string[]): State | null {
  if (boatCheck(l, s, ids)) return null;
  const n = cloneState(s);
  const to = (1 - s.boat) as 0 | 1;
  for (const id of ids) n.side[id] = to;
  n.boat = to;
  return n;
}

/** gleichwertige Lagen zusammenfassen (gleiche Arten zählen nur als Anzahl) */
export function key(l: RiverLevel, s: State): string {
  const k = kindsAt(l, s, 1);
  const kinds = [...new Set(l.actors.map((a) => a.kind))];
  return `${kinds.map((x) => k[x] ?? 0).join(",")}|${s.boat}`;
}

/** alle möglichen Gruppen fürs Boot vom aktuellen Ufer */
export function groups(l: RiverLevel, s: State): string[][] {
  const here = l.actors.filter((a) => s.side[a.id] === s.boat);
  const out: string[][] = [];
  const seen = new Set<string>();
  for (let mask = 1; mask < 1 << here.length; mask++) {
    const ids = here.filter((_, i) => mask & (1 << i)).map((a) => a.id);
    if (boatCheck(l, s, ids)) continue;
    // gleiche Arten nur einmal (z. B. „ein Hase“ statt jeder Hase einzeln)
    const sig = ids
      .map((id) => l.actors.find((a) => a.id === id)!.kind)
      .sort()
      .join("+");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(ids);
  }
  return out;
}

export interface Graph {
  /** Lagen (Schlüssel) mit Abstand vom Start */
  nodes: { key: string; dist: number; goal: boolean }[];
  edges: [string, string][];
}

/** Breitensuche über alle erlaubten Lagen ab `from` */
export function explore(l: RiverLevel, from: State = startState(l)) {
  const dist = new Map<string, number>();
  const prev = new Map<string, { key: string; ids: string[] } | null>();
  const states = new Map<string, State>();
  const edges: [string, string][] = [];
  const k0 = key(l, from);
  dist.set(k0, 0);
  prev.set(k0, null);
  states.set(k0, from);
  const queue = [from];
  while (queue.length) {
    const s = queue.shift()!;
    const ks = key(l, s);
    for (const ids of groups(l, s)) {
      const n = cross(l, s, ids)!;
      if (!valid(l, n)) continue;
      const kn = key(l, n);
      if (ks < kn) edges.push([ks, kn]);
      if (dist.has(kn)) continue;
      dist.set(kn, dist.get(ks)! + 1);
      prev.set(kn, { key: ks, ids });
      states.set(kn, n);
      queue.push(n);
    }
  }
  return { dist, prev, states, edges };
}

/** kürzeste Lösung als Folge von Bootsgruppen; null, wenn unlösbar */
export function shortest(l: RiverLevel, from: State = startState(l)): string[][] | null {
  const { prev, states } = explore(l, from);
  const goal = [...states.entries()].find(([, s]) => isGoal(l, s));
  if (!goal) return null;
  const path: string[][] = [];
  let k: string | undefined = goal[0];
  while (k && prev.get(k)) {
    const p: { key: string; ids: string[] } = prev.get(k)!;
    path.unshift(p.ids);
    k = p.key;
  }
  return path;
}

/** Tipp: die nächste Bootsgruppe auf dem kürzesten Weg vom aktuellen Stand */
export function hint(l: RiverLevel, s: State): string[] | null {
  if (isGoal(l, s) || !valid(l, s)) return null;
  return shortest(l, s)?.[0] ?? null;
}

/** Zustandsgraph für die Rätsel-Landkarte */
export function graph(l: RiverLevel): Graph {
  const { dist, states, edges } = explore(l);
  return {
    nodes: [...dist.entries()].map(([k, d]) => ({
      key: k,
      dist: d,
      goal: isGoal(l, states.get(k)!),
    })),
    edges,
  };
}
