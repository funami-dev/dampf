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

describe("KI-AK-14: Wasserkrüge, Frosch-Hüpfen, Lichter aus, Pinguin-Parade", () => {
  it("Wasserkrüge: Regeln, kürzeste Wege 6/8/7, Lösung erreicht das Ziel", async () => {
    const { JUG_LEVELS, apply, jugGoal, jugShortest, jugSearch } = await import("./jugs.ts");
    const [j1, , j3] = JUG_LEVELS as [(typeof JUG_LEVELS)[0], unknown, (typeof JUG_LEVELS)[0]];
    expect(apply(j1, [0, 0], { kind: "fill", i: 1 })).toEqual([0, 5]);
    expect(apply(j1, [0, 5], { kind: "pour", i: 1, j: 0 })).toEqual([3, 2]);
    expect(apply(j1, [0, 0], { kind: "empty", i: 0 })).toBeNull();
    expect(apply(j3, [0, 0, 8], { kind: "fill", i: 0 })).toBeNull(); // kein Teich
    expect(JUG_LEVELS.map((l) => jugShortest(l)!.length)).toEqual([6, 8, 7]);
    for (const l of JUG_LEVELS) {
      let s = l.start;
      for (const a of jugShortest(l)!) s = apply(l, s, a)!;
      expect(jugGoal(l, s)).toBe(true);
      const { states } = jugSearch(l);
      for (const st of states.values())
        expect(st.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(
          l.caps.reduce((a, b) => a + b, 0),
        );
    }
  });
  it("Frösche: nur vorwärts, n² + 2n, festhüpfen erkannt", async () => {
    const { FROG_LEVELS, frogBest, frogGoal, frogMin, frogMove, frogStart, frogStuck, frogTarget } =
      await import("./frogs.ts");
    const s = frogStart(2);
    expect(s.join("")).toBe("GG.BB");
    expect(frogTarget(s, 1)).toBe(2);
    expect(frogTarget(s, 0)).toBe(2); // über einen Frosch springen
    for (const l of FROG_LEVELS) expect(frogBest(frogStart(l.n)).min).toBe(frogMin(l.n));
    // Sackgassen gibt es: alle erreichbaren Lagen durchsuchen
    const seen = new Set<string>();
    const stuck: string[] = [];
    const walk = (x: ("G" | "B" | ".")[]) => {
      const k = x.join("");
      if (seen.has(k)) return;
      seen.add(k);
      if (frogStuck(x)) stuck.push(k);
      x.forEach((_, i) => {
        const n = frogMove(x, i);
        if (n) walk(n);
      });
    };
    walk(frogStart(2));
    expect(stuck.length).toBeGreaterThan(0);
    for (const k of stuck) {
      const x = k.split("") as ("G" | "B" | ".")[];
      expect(frogGoal(x)).toBe(false);
      expect(x.every((_, i) => frogTarget(x, i) < 0)).toBe(true);
    }
    expect(frogGoal("BB.GG".split("") as ("G" | "B" | ".")[])).toBe(true);
    // Tipp führt immer zum Ziel
    let cur = frogStart(3);
    for (let k = 0; k < 20 && !frogGoal(cur); k++) cur = frogMove(cur, frogBest(cur).first!)!;
    expect(frogGoal(cur)).toBe(true);
  });
  it("Lichter aus: Umschalten, kleinste Tippzahl 2/4/6, Lösung macht alles aus", async () => {
    const { LIGHT_LEVELS, allOff, lightSolve, lightStart, press } = await import("./lights.ts");
    const g = press(lightStart(LIGHT_LEVELS[0]!), 1, 1);
    expect(press(press(g, 0, 0), 0, 0)).toEqual(g); // zweimal hebt sich auf
    expect(LIGHT_LEVELS.map((l) => lightSolve(lightStart(l))!.length)).toEqual([2, 4, 6]);
    for (const l of LIGHT_LEVELS) {
      let s = lightStart(l);
      expect(allOff(s)).toBe(false);
      for (const [x, y] of lightSolve(s)!) s = press(s, x, y);
      expect(allOff(s)).toBe(true);
    }
  });
  it("Pinguine: Fehlstände = wenigste Tausche; Wettrennen zählt richtig", async () => {
    const { PENGUIN_LEVELS, bubbleFrames, inversions, isSorted, mergeFrames, swapAt } =
      await import("./penguins.ts");
    expect(PENGUIN_LEVELS.map((l) => inversions(l.start))).toEqual([4, 12, 18]);
    let s = PENGUIN_LEVELS[0]!.start;
    let swaps = 0;
    while (!isSorted(s)) {
      const i = s.findIndex((v, k) => k < s.length - 1 && v > s[k + 1]!);
      s = swapAt(s, i);
      swaps++;
    }
    expect(swaps).toBe(4);
    const r = Array.from({ length: 20 }, (_, i) => (i * 7) % 20);
    const b = bubbleFrames(r);
    const m = mergeFrames(r);
    expect(b).toHaveLength((20 * 19) / 2);
    expect(m.length).toBeLessThanOrEqual(20 * 5);
    expect(isSorted(b.at(-1)!)).toBe(true);
    expect(isSorted(m.at(-1)!)).toBe(true);
    expect([...m.at(-1)!].sort((a, c) => a - c)).toEqual([...r].sort((a, c) => a - c));
  });
});

describe("KI-AK-15: Orakel-Uhu, Zaubertrick, Geheimschrift, Schildkröten-Programm", () => {
  it("Uhu: Halbieren findet jede Zahl in der Profi-Zahl; ehrlicher Gegenspieler", async () => {
    const { UHU_LEVELS, uhuAnswer, uhuGuess, uhuMin } = await import("./uhu.ts");
    expect(UHU_LEVELS.map((l) => uhuMin(l.max))).toEqual([4, 7, 10]);
    for (const l of UHU_LEVELS) {
      // Kind halbiert gegen den Gegenspieler
      let lo = 1;
      let hi = l.max;
      let q = 0;
      for (;;) {
        q++;
        const r = uhuAnswer(lo, hi, uhuGuess(lo, hi));
        if (r.answer === "richtig") break;
        lo = r.lo;
        hi = r.hi;
      }
      expect(q).toBeLessThanOrEqual(uhuMin(l.max));
      // Uhu errät jede deine Zahl in höchstens uhuMin Fragen
      for (let secret = 1; secret <= l.max; secret += Math.max(1, Math.floor(l.max / 37))) {
        let a = 1;
        let b = l.max;
        let k = 0;
        for (;;) {
          k++;
          const g = uhuGuess(a, b);
          if (g === secret) break;
          if (g < secret) a = g + 1;
          else b = g - 1;
        }
        expect(k).toBeLessThanOrEqual(uhuMin(l.max));
      }
    }
    expect(uhuAnswer(1, 10, 0).answer).toBe("höher");
    expect(uhuAnswer(4, 4, 4).answer).toBe("richtig");
  });
  it("Zaubertrick: jede Zahl eindeutig aus den Karten", async () => {
    const { CARD_LEVELS, bitsOf, cardNumbers, trickSum, valueOf } = await import("./karten.ts");
    for (const l of CARD_LEVELS) {
      const k = l.cards;
      for (let n = 1; n < 2 ** k; n++) {
        const yes = Array.from({ length: k }, (_, i) => cardNumbers(k, i).includes(n));
        expect(trickSum(yes)).toBe(n);
        expect(valueOf(bitsOf(n, k))).toBe(n);
      }
      expect(cardNumbers(k, 0)[0]).toBe(1);
      expect(l.target).toBeLessThan(2 ** k);
    }
  });
  it("Geheimschrift: ver- und entschlüsseln umkehrbar, Häufigkeit findet den Schlüssel", async () => {
    const { CAESAR_LEVELS, counts, decode, encode, guessKey, turnsFor } =
      await import("./caesar.ts");
    expect(encode("ABC XYZ", 3)).toBe("DEF ABC");
    for (const l of CAESAR_LEVELS) expect(decode(encode(l.plain, l.key), l.key)).toBe(l.plain);
    expect(counts("Eule")).toEqual({ E: 2, U: 1, L: 1 });
    const c3 = CAESAR_LEVELS[2]!;
    expect(guessKey(encode(c3.plain, c3.key))).toBe(c3.key);
    expect(turnsFor(3)).toBe(3);
    expect(turnsFor(23)).toBe(3);
  });
  it("Schildkröte: Schritt für Schritt, Schleifen, Teiche; Profi-Zahlen stimmen", async () => {
    const { TURTLE_LEVELS, run } = await import("./turtle.ts");
    type C = Parameters<typeof run>[1][number];
    const [t1, t2, t3] = TURTLE_LEVELS as [
      (typeof TURTLE_LEVELS)[0],
      (typeof TURTLE_LEVELS)[0],
      (typeof TURTLE_LEVELS)[0],
    ];
    expect(run(t1, ["F", "F"]).end).toBe("unterwegs");
    expect(run(t1, ["R3", "F", "F"]).end).toBe("ziel");
    expect(run(t1, ["R4", "F", "F"]).end).toBe("rand");
    expect(run(t2, ["R", "F"]).end).toBe("teich");
    expect(run(t2, ["R2", "R3", "F", "END", "R"]).end).toBe("ziel");
    expect(run(t3, ["R4", "F", "R", "F", "L"]).end).toBe("ziel");
    // Schritte: Schleife wird wirklich wiederholt
    expect(run(t1, ["R3", "F", "F"]).steps.filter((s) => s.card === 1)).toHaveLength(3);
    // keine kürzeren Programme als die Profi-Zahl
    const T: C[] = ["F", "R", "L", "R2", "R3", "R4", "END"];
    for (const l of TURTLE_LEVELS) {
      for (let len = 1; len < l.min; len++) {
        const idx = Array<number>(len).fill(0);
        for (;;) {
          expect(
            run(
              l,
              idx.map((i) => T[i]!),
            ).end,
            `${l.id}`,
          ).not.toBe("ziel");
          let k = len - 1;
          while (k >= 0 && idx[k] === T.length - 1) idx[k--] = 0;
          if (k < 0) break;
          idx[k]!++;
        }
      }
    }
  });
});

describe("KI-AK-16: Brücken-Spaziergang, Bienen, Murmelbahn", () => {
  it("Eulerweg: gerade/ungerade entscheidet; Tipp läuft jede Brücke einmal", async () => {
    const { EULER_LEVELS, allUsed, eulerKind, newWalk, nextIsland, stuck, walkTo } =
      await import("./euler.ts");
    expect(EULER_LEVELS.map((l) => eulerKind(l).kind)).toEqual(["kreis", "weg", "unmoeglich"]);
    expect(eulerKind(EULER_LEVELS[1]!).odd.sort()).toEqual(["A", "C"]);
    for (const l of EULER_LEVELS.slice(0, 2)) {
      let w = newWalk(l);
      for (let k = 0; k <= l.bridges.length; k++) {
        const to = nextIsland(l, w);
        if (to === null) break;
        w = walkTo(l, w, to)!;
      }
      expect(allUsed(w), l.id).toBe(true);
    }
    // falscher Start in Level 2 → steckt fest
    const l2 = EULER_LEVELS[1]!;
    let w = walkTo(l2, newWalk(l2), "B")!;
    for (const to of ["A", "D", "C", "B"]) w = walkTo(l2, w, to) ?? w;
    expect(stuck(l2, w) || !allUsed(w)).toBe(true);
    expect(walkTo(l2, walkTo(l2, newWalk(l2), "B")!, "D")).toBeNull(); // keine Brücke B–D
    expect(nextIsland(EULER_LEVELS[2]!, newWalk(EULER_LEVELS[2]!))).toBeNull();
  });
  it("Bienen: kürzeste Rundreise durch Durchprobieren, gierig ist nie besser", async () => {
    const { BEE_LEVELS, bestTour, greedyTour, tourLength } = await import("./tsp.ts");
    for (const l of BEE_LEVELS) {
      const b = bestTour(l);
      const g = greedyTour(l);
      expect(b.order).toHaveLength(l.flowers.length);
      expect(new Set(b.order).size).toBe(l.flowers.length);
      expect(tourLength(l, b.order)).toBeCloseTo(b.len);
      expect(g.len).toBeGreaterThanOrEqual(b.len - 1e-9);
      // Rückwärts ist genauso lang
      expect(tourLength(l, [...b.order].reverse())).toBeCloseTo(b.len);
    }
    // im größten Level ist „immer zur nächsten“ wirklich schlechter
    const l3 = BEE_LEVELS[2]!;
    expect(greedyTour(l3).len).toBeGreaterThan(bestTour(l3).len + 1);
    // mit festem Anfang bleibt der Anfang
    expect(bestTour(l3, [3]).order[0]).toBe(3);
  });
  it("Murmelbahn: Kruskal verbindet alles mit minimalem Holz", async () => {
    const { MST_LEVELS, connected, cost, kruskal } = await import("./mst.ts");
    for (const l of MST_LEVELS) {
      const k = kruskal(l);
      const es = k.picked.map((i) => l.edges[i]!);
      expect(es).toHaveLength(l.villages.length - 1);
      expect(connected(l.villages.length, es)).toBe(true);
      expect(cost(es)).toBe(k.total);
      expect(connected(l.villages.length, l.edges)).toBe(true);
      // keine Auswahl von n−1 Stücken ist billiger und verbunden (kleine Level durchprobieren)
      if (l.edges.length <= 14) {
        const n = l.villages.length;
        let best = Infinity;
        const pick = (from: number, chosen: number[]) => {
          if (chosen.length === n - 1) {
            const sel = chosen.map((i) => l.edges[i]!);
            if (connected(n, sel)) best = Math.min(best, cost(sel));
            return;
          }
          for (let i = from; i < l.edges.length; i++) pick(i + 1, [...chosen, i]);
        };
        pick(0, []);
        expect(k.total).toBe(best);
      }
      expect(k.steps.some((s) => !s.take) || l.edges.length === l.villages.length - 1).toBe(true);
    }
  });
});

describe("KI-AK-18: Tippflächen", () => {
  it("nächstgelegenes Ziel, mindestens 22 Bildschirmpunkte bei jedem Maßstab", async () => {
    const { pickNearest, TAP_CSS } = await import("../chapters/kit.ts");
    for (const scale of [1, 2, 3, 4]) {
      const r = TAP_CSS / scale;
      const items = [{ x: 100, y: 100 }];
      expect(pickNearest(items, { x: 100 + 21 / scale, y: 100 }, r)).toBe(0);
      expect(pickNearest(items, { x: 100, y: 100 + 21.9 / scale }, r)).toBe(0);
      expect(pickNearest(items, { x: 100 + 23 / scale, y: 100 }, r)).toBe(-1);
    }
    // zwei nahe Ziele: das nähere gewinnt
    const two = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(pickNearest(two, { x: 6, y: 0 }, 22)).toBe(1);
    expect(pickNearest(two, { x: 4, y: 0 }, 22)).toBe(0);
    // großes Ziel trifft auch weiter weg
    expect(pickNearest([{ x: 0, y: 0, r: 40 }], { x: 35, y: 0 }, 10)).toBe(0);
  });
});
