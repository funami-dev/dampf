import { describe, expect, it } from "vitest";
import {
  LEVELS,
  canMove,
  clonePegs,
  helperDisc,
  helperPlan,
  minMoves,
  move,
  newTower,
  solve,
  solved,
  starsFor,
  type Pegs,
} from "./hanoi.ts";
import {
  RIVER_LEVELS,
  boatCheck,
  cloneState,
  cross,
  explore,
  graph,
  hint,
  isGoal,
  problem,
  shortest,
  startState,
  valid,
  type State,
} from "./river.ts";
import { KEY, fresh, load, record, save, unlocked, type Store } from "./save.ts";

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe("KI-AK-01: Pfannkuchen-Turm", () => {
  it("nur oben, nie groß auf klein, Ziel erkannt", () => {
    const p = newTower(3);
    expect(p).toEqual([[3, 2, 1], [], []]);
    expect(canMove(p, 1, 0)).toBe(false); // leerer Teller
    expect(move(p, 0, 2)).toBe(true);
    expect(move(p, 0, 2)).toBe(false); // 2 auf 1
    expect(p).toEqual([[3, 2], [], [1]]);
    expect(canMove(p, 0, 0)).toBe(false);
    expect(solved(p, 3)).toBe(false);
    expect(solved([[], [], [3, 2, 1]], 3)).toBe(true);
    expect(solved([[], [3, 2, 1], []], 3)).toBe(false);
  });
  it("Profi-Zahl, gültige Lösung genau so lang, Sterne", () => {
    for (const n of LEVELS) {
      expect(minMoves(n)).toBe(2 ** n - 1);
      const frames = solve(n);
      expect(frames).toHaveLength(minMoves(n));
      const p = newTower(n);
      for (const f of frames) {
        expect(p[f.from]!.at(-1)).toBe(f.disc);
        expect(move(p, f.from, f.to)).toBe(true);
      }
      expect(solved(p, n)).toBe(true);
    }
    expect(starsFor(7, 3)).toBe(3);
    expect(starsFor(10, 3)).toBe(2);
    expect(starsFor(11, 3)).toBe(1);
  });
  it("Zeitlupe: Schachteln passen zu den Zügen", () => {
    const f = solve(3);
    // äußerste Aufgabe ist immer „Turm aus 3 nach rechts“
    for (const x of f) expect(x.stack[0]).toEqual({ n: 3, from: 0, to: 2 });
    // die innerste Aufgabe gehört zum bewegten Pfannkuchen
    for (const x of f) {
      const inner = x.stack.at(-1)!;
      expect(inner.n).toBe(x.disc);
      expect([inner.from, inner.to]).toEqual([x.from, x.to]);
      expect(x.stack).toHaveLength(3 - x.disc + 1);
    }
    // der kleinste ist jeden zweiten Zug dran
    f.forEach((x, i) => expect(x.disc === 1).toBe(i % 2 === 0));
  });
});

describe("KI-AK-02: Helfer-Modus", () => {
  it("Maus trägt den kleineren Turm regelgerecht weg", () => {
    for (const n of [4, 5]) {
      const p: Pegs = newTower(n);
      let total = 0;
      for (let k = n; k >= 1; k--) {
        expect(helperDisc(p, n)).toBe(k);
        const plan = helperPlan(p, n)!;
        expect(plan).not.toBeNull();
        if (k === n) expect(plan).toHaveLength(2 ** (n - 1) - 1);
        for (const [a, b] of plan) expect(move(p, a, b)).toBe(true);
        total += plan.length;
        // jetzt liegt k frei oben und darf nach rechts
        const from = p.findIndex((s) => s.at(-1) === k);
        expect(from).toBeGreaterThanOrEqual(0);
        expect(move(p, from, 2)).toBe(true);
        total++;
      }
      expect(solved(p, n)).toBe(true);
      expect(total).toBe(minMoves(n));
    }
    // durcheinander → kein Plan
    expect(helperPlan([[4, 1], [3], [2]], 4)).toBeNull();
    const done = clonePegs([[], [], [4, 3, 2, 1]]);
    expect(helperPlan(done, 4)).toEqual([]);
  });
});

describe("KI-AK-03: Über den Fluss", () => {
  const [f1, f2, f3] = RIVER_LEVELS as [
    (typeof RIVER_LEVELS)[0],
    (typeof RIVER_LEVELS)[0],
    (typeof RIVER_LEVELS)[0],
  ];
  it("Regeln, Plätze, Ruderer", () => {
    const s = startState(f1);
    expect(boatCheck(f1, s, [])).toMatch(/leer/);
    expect(boatCheck(f1, s, ["fuchs"])).toMatch(/rudern/);
    expect(boatCheck(f1, s, ["baeuerin", "fuchs", "gans"])).toMatch(/passt nicht/);
    // Bäuerin nimmt den Fuchs mit → Gans und Korn allein
    const bad = cross(f1, s, ["baeuerin", "fuchs"])!;
    expect(problem(f1, bad)).toMatch(/Gans pickt/);
    const bad2 = cross(f1, s, ["baeuerin", "korn"])!;
    expect(problem(f1, bad2)).toMatch(/Fuchs und Gans/);
    expect(valid(f1, cross(f1, s, ["baeuerin", "gans"])!)).toBe(true);
    // Hasen und Füchse
    const h = startState(f2);
    const two = cross(f2, h, ["hase1", "hase2"])!;
    expect(problem(f2, two)).toMatch(/Mehr Füchse/);
    expect(valid(f2, cross(f2, h, ["fuchs1", "fuchs2"])!)).toBe(true);
    // Biber: großer belegt beide Plätze
    const b = startState(f3);
    expect(boatCheck(f3, b, ["gross1", "klein1"])).toMatch(/passt nicht/);
    expect(boatCheck(f3, b, ["gross1"])).toBeNull();
    expect(boatCheck(f3, b, ["klein1", "klein2"])).toBeNull();
  });
  it("kürzeste Lösungen 7, 11, 9; Graph nur erlaubt; Tipp führt immer ans Ziel", () => {
    const want = [7, 11, 9];
    RIVER_LEVELS.forEach((l, i) => {
      const path = shortest(l)!;
      expect(path, l.id).toHaveLength(want[i]!);
      let s: State = startState(l);
      for (const ids of path) {
        s = cross(l, s, ids)!;
        expect(valid(l, s)).toBe(true);
      }
      expect(isGoal(l, s)).toBe(true);
      const g = graph(l);
      expect(g.nodes.some((n) => n.goal)).toBe(true);
      // von jeder erreichbaren Lage führt der Tipp zum Ziel
      const { states } = explore(l);
      for (const st of states.values()) {
        let cur = cloneState(st);
        for (let k = 0; k < 30 && !isGoal(l, cur); k++) {
          const ids = hint(l, cur)!;
          expect(ids).not.toBeNull();
          cur = cross(l, cur, ids)!;
          expect(valid(l, cur)).toBe(true);
        }
        expect(isGoal(l, cur)).toBe(true);
      }
    });
  });
  it("Zurück stellt die Lage genau wieder her", () => {
    const s = startState(f1);
    const history = [cloneState(s)];
    const n = cross(f1, s, ["baeuerin", "gans"])!;
    history.push(n);
    expect(history.at(-2)).toEqual(startState(f1));
    expect(n).not.toEqual(s);
    expect(s).toEqual(startState(f1)); // cross verändert die alte Lage nicht
  });
});

describe("KI-AK-04: Speichern", () => {
  it("Sterne, Freischalten, Klang; kaputte Daten → Neustart", () => {
    const st = memory();
    const s = fresh();
    expect(unlocked(s, "h3")).toBe(true);
    expect(unlocked(s, "h4")).toBe(false);
    expect(unlocked(s, "f1")).toBe(true);
    expect(unlocked(s, "f2")).toBe(false);
    record(s, "h3", 2);
    record(s, "h3", 1);
    record(s, "f1", 3);
    s.volume = 0.5;
    s.muted = true;
    save(st, s);
    const b = load(st);
    expect(b.stars).toEqual({ h3: 2, f1: 3 });
    expect(unlocked(b, "h4")).toBe(true);
    expect(unlocked(b, "f2")).toBe(true);
    expect(unlocked(b, "f3")).toBe(false);
    expect([b.volume, b.muted]).toEqual([0.5, true]);
    st.data.set(KEY, "{kaputt");
    expect(load(st)).toEqual(fresh());
    st.data.set(KEY, JSON.stringify({ v: 1, stars: { h3: 9, xx: 2, f2: 1 }, volume: "laut" }));
    expect(load(st).stars).toEqual({ f2: 1 });
    expect(load(st).volume).toBe(0.3);
  });
});
