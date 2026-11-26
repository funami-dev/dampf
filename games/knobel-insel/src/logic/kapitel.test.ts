import { describe, expect, it } from "vitest";
import {
  WAAGE_LEVELS,
  found,
  outcomeFor,
  split,
  startCands,
  weigh,
  type Cand,
  type Outcome,
} from "./waage.ts";
import { MAZE_LEVELS, distances, extend, free, makeMaze, shortestPath } from "./maze.ts";
import { FLIP_LEVELS, flip, hintFlip, minFlips, sorted } from "./flip.ts";
import { BRIDGE_LEVELS, bBest, bCheck, bCost, bGoal, bMove, bStart } from "./bridge.ts";
import { fresh, load, record, save, unlocked, type Store } from "./save.ts";

describe("KI-AK-10: Keks-Waage", () => {
  const [w1, w2, w3] = WAAGE_LEVELS as [
    (typeof WAAGE_LEVELS)[0],
    (typeof WAAGE_LEVELS)[0],
    (typeof WAAGE_LEVELS)[0],
  ];
  it("Waage zeigt richtig; ungleich viele → vollere Seite", () => {
    expect(outcomeFor({ k: 0, d: 1 }, [0], [1])).toBe("links");
    expect(outcomeFor({ k: 0, d: -1 }, [0], [1])).toBe("rechts");
    expect(outcomeFor({ k: 2, d: 1 }, [0], [1])).toBe("gleich");
    expect(outcomeFor({ k: 0, d: 1 }, [1, 2], [0])).toBe("links");
  });
  it("Gegenspieler bleibt ehrlich; beste Strategie: 1 bzw. 2 Wiegungen", () => {
    let c = startCands(w1);
    const r = weigh(c, [0], [1]);
    for (const x of r.cands) expect(outcomeFor(x, [0], [1])).toBe(r.outcome);
    c = r.cands;
    expect(found(c)).not.toBeNull();
    // 9 Kekse: 3 gegen 3, dann 1 gegen 1 – jeder Ausgang führt zum Keks
    const c9 = startCands(w2);
    const p = split(c9, [0, 1, 2], [3, 4, 5]);
    for (const o of ["links", "gleich", "rechts"] as Outcome[]) {
      const g = p[o].map((x) => x.k);
      const q = split(p[o], [g[0]!], [g[1]!]);
      for (const o2 of ["links", "gleich", "rechts"] as Outcome[])
        if (q[o2].length) expect(found(q[o2])).not.toBeNull();
    }
    // mit nur einer Wiegung bleiben bei 9 immer mindestens 3 übrig
    for (let a = 1; a <= 4; a++) {
      const left = [...Array(a).keys()];
      const right = left.map((x) => x + a);
      expect(weigh(c9, left, right).cands.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("12 Kekse, schwerer oder leichter: der klassische Plan schafft es in 3 Wiegungen", () => {
    // Entscheidungsbaum: alle Zweige durchgehen
    type Plan = (hist: Outcome[], c: Cand[]) => [number[], number[]];
    const plan: Plan = (hist, c) => {
      if (hist.length === 0)
        return [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
        ];
      if (hist[0] === "gleich") {
        if (hist.length === 1)
          return [
            [8, 9, 10],
            [0, 1, 2],
          ];
        const ks = [...new Set(c.map((x) => x.k))];
        return ks.length === 1 ? [[ks[0]!], [0]] : [[ks[0]!], [ks[1]!]];
      }
      // erste Wiegung ungleich: „leicht“-Gruppe L und „schwer“-Gruppe S
      const [L, S] =
        hist[0] === "rechts"
          ? [
              [0, 1, 2, 3],
              [4, 5, 6, 7],
            ]
          : [
              [4, 5, 6, 7],
              [0, 1, 2, 3],
            ];
      if (hist.length === 1)
        return [
          [L[0]!, L[1]!, S[0]!],
          [L[2]!, S[1]!, 8],
        ];
      const ks = [...new Set(c.map((x) => x.k))];
      if (ks.length === 1) return [[ks[0]!], [8]];
      // zwei oder drei Möglichkeiten: zwei gleicher Art gegeneinander, sonst einer gegen guten
      const heavy = c.filter((x) => x.d === 1);
      const light = c.filter((x) => x.d === -1);
      const same = heavy.length >= 2 ? heavy : light;
      if (same.length >= 2) return [[same[0]!.k], [same[1]!.k]];
      return [[c[0]!.k], [8]];
    };
    const walk = (hist: Outcome[], c: Cand[]): void => {
      if (hist.length === 3 || found(c) !== null) {
        expect(found(c), hist.join(",")).not.toBeNull();
        return;
      }
      const [l, r] = plan(hist, c);
      const parts = split(c, l, r);
      for (const o of ["links", "gleich", "rechts"] as Outcome[])
        if (parts[o].length) walk([...hist, o], parts[o]);
    };
    walk([], startCands(w3));
    // mit 2 Wiegungen geht es nicht sicher: 24 Möglichkeiten > 3 × 3
    expect(startCands(w3)).toHaveLength(24);
  });
});

describe("KI-AK-11: Käse-Labyrinth", () => {
  it("Weg zum Käse, Abstände, gemalter Weg, Profi-Zahl", () => {
    const want = [8, 20, 24];
    MAZE_LEVELS.forEach((l, i) => {
      const m = makeMaze(l);
      expect(m.wall).toHaveLength(l.size);
      const d = distances(m);
      expect(d[m.goal[1]]![m.goal[0]]).toBe(want[i]);
      const p = shortestPath(m);
      expect(p).toHaveLength(want[i]! + 1);
      p.forEach(([x, y], k) => {
        expect(free(m, x, y)).toBe(true);
        expect(d[y]![x]).toBe(k);
      });
    });
    const m = makeMaze(MAZE_LEVELS[0]!);
    let path: [number, number][] = [m.start];
    path = extend(m, path, 0, 1); // Hecke
    expect(path).toHaveLength(1);
    path = extend(m, path, 3, 3); // nicht benachbart
    expect(path).toHaveLength(1);
    const next = shortestPath(m)[1]!;
    path = extend(m, path, next[0], next[1]);
    expect(path).toHaveLength(2);
    path = extend(m, path, 1, 1); // zurück
    expect(path).toHaveLength(1);
  });
});

describe("KI-AK-12: Pfannkuchen wenden", () => {
  it("Wenden, lösbar, Profi-Zahl, Tipp-Regel löst jeden Stapel", () => {
    expect(flip([1, 2, 3, 4], 1)).toEqual([1, 4, 3, 2]);
    expect(sorted([4, 3, 2, 1])).toBe(true);
    expect(FLIP_LEVELS.map((l) => minFlips(l.start))).toEqual([4, 5, 7]);
    for (const l of FLIP_LEVELS) {
      expect(sorted(l.start)).toBe(false);
      let s = l.start;
      let k = 0;
      for (; k < 3 * s.length && !sorted(s); k++) s = flip(s, hintFlip(s)!);
      expect(sorted(s)).toBe(true);
      expect(k).toBeLessThanOrEqual(2 * s.length);
    }
    expect(hintFlip([4, 3, 2, 1])).toBeNull();
  });
});

describe("KI-AK-13: Brücke bei Nacht", () => {
  it("Regeln, Tempo des Langsameren, kürzeste Zeiten", () => {
    const [b1, b2, b3] = BRIDGE_LEVELS as [
      (typeof BRIDGE_LEVELS)[0],
      (typeof BRIDGE_LEVELS)[0],
      (typeof BRIDGE_LEVELS)[0],
    ];
    const s = bStart(b2);
    expect(bCheck(b2, s, [])).toMatch(/Wer/);
    expect(bCheck(b2, s, ["hase", "igel", "kroete"])).toMatch(/höchstens zwei/);
    const n = bMove(b2, s, ["hase", "schnecke"])!;
    expect(bCost(b2, ["hase", "schnecke"])).toBe(10);
    expect(bCheck(b2, n, ["igel"])).toMatch(/Laterne/);
    expect([bBest(b1).min, bBest(b2).min, bBest(b3).min]).toEqual([8, 17, 29]);
    // der naheliegende Plan (Hase begleitet jeden) braucht 19 statt 17
    let t = 0;
    let st = bStart(b2);
    for (const g of [
      ["hase", "igel"],
      ["hase"],
      ["hase", "kroete"],
      ["hase"],
      ["hase", "schnecke"],
    ]) {
      t += bCost(b2, g);
      st = bMove(b2, st, g)!;
    }
    expect(bGoal(b2, st)).toBe(true);
    expect(t).toBe(19);
    // Tipp führt immer zum besten Ziel
    let cur = bStart(b2);
    let total = 0;
    while (!bGoal(b2, cur)) {
      const g = bBest(b2, cur).first!;
      total += bCost(b2, g);
      cur = bMove(b2, cur, g)!;
    }
    expect(total).toBe(17);
  });
});

describe("KI-AK-09: neue Kapitel im Speicher", () => {
  it("Level der Reihe nach frei, Sterne bleiben", () => {
    const data = new Map<string, string>();
    const st: Store = { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
    const s = fresh();
    for (const first of ["w1", "l1", "p1", "b1"]) expect(unlocked(s, first)).toBe(true);
    for (const second of ["w2", "l2", "p2", "b2"]) expect(unlocked(s, second)).toBe(false);
    record(s, "w1", 3);
    record(s, "b2", 2);
    save(st, s);
    const b = load(st);
    expect(b.stars).toEqual({ w1: 3, b2: 2 });
    expect(unlocked(b, "w2")).toBe(true);
    expect(unlocked(b, "b3")).toBe(true);
  });
});

describe("Pixelfiguren", () => {
  it("jede Figur ist rechteckig und nutzt nur ihre Farben", async () => {
    const { SPRITES } = await import("../art/sprites.ts");
    for (const [name, sp] of Object.entries(SPRITES)) {
      const w = sp.rows[0]!.length;
      for (const r of sp.rows) {
        expect(r.length, name).toBe(w);
        for (const ch of r) if (ch !== ".") expect(sp.pal[ch], `${name}:${ch}`).toBeDefined();
      }
    }
  });
});
