import { describe, expect, it } from "vitest";
import { DAY } from "./daytime.ts";
import { applySnap, parseGuest, parseHost, toSnap } from "./protocol.ts";
import { load, save, type Store } from "./save.ts";
import {
  APPLES,
  FOODS,
  HUT_CANS,
  MUSHROOMS,
  act,
  actionFor,
  addPlayer,
  createState,
  eat,
  foodsOf,
  free,
  hasApples,
  stepWorld,
  type Player,
  type State,
} from "./sim.ts";
import { HUT, T, generateWorld, idx, reachable, type World } from "./world.ts";

const memory = (): Store => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};
function setup(seed = 21) {
  const w = generateWorld(seed);
  const s = createState(w);
  const p = addPlayer(w, s, "me", "Lea", "#3498db");
  p.landing = 0;
  return { w, s, p };
}
/** Figur auf ein freies Nachbarfeld von (x, y) stellen */
function besides(w: World, s: State, p: Player, x: number, y: number) {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const)
    if (free(w, s, x + dx, y + dy)) {
      p.x = x + dx + 0.5;
      p.y = y + dy + 0.5;
      return;
    }
  throw new Error("kein freies Nachbarfeld");
}

describe("WL-AK-39: verlassene Hütte", () => {
  it("genau eine Hütte, weit weg, erreichbar, nicht begehbar (viele Seeds)", () => {
    for (let k = 1; k <= 30; k++) {
      const seed = k * 7919 + 13;
      const w = generateWorld(seed);
      const s = createState(w);
      const { x, y } = w.hut;
      const t = w.terrain[idx(w, x, y)];
      expect(t === T.GRASS || t === T.FOREST, `Seed ${seed}`).toBe(true);
      expect(Math.hypot(x - w.start.x, y - w.start.y)).toBeGreaterThanOrEqual(HUT.minStart);
      expect(Math.hypot(x - w.plane.x, y - w.plane.y)).toBeGreaterThanOrEqual(HUT.minPlane);
      expect(free(w, s, x, y)).toBe(false);
      const reach = reachable(w, true);
      const n = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => reach[idx(w, x + dx!, y + dy!)] === 1);
      expect(n, `Seed ${seed} erreichbar`).toBe(true);
    }
  });

  it("Kiste: 2 Dosen, dann leer → In der Hütte schlafen; nach einem Spieltag wieder voll", () => {
    const { w, s, p } = setup();
    besides(w, s, p, w.hut.x, w.hut.y);
    s.mushrooms = [];
    expect(actionFor(w, s, p)?.label).toBe("Kiste öffnen");
    expect(act(w, s, p)).toBe("+2 Dosen");
    expect(p.cans).toBe(HUT_CANS.give);
    expect(actionFor(w, s, p)?.label).toBe("In der Hütte schlafen");
    act(w, s, p);
    expect(p.sleeping).toBe(true);
    p.sleeping = false;
    for (let t = 0; t < DAY + 2; t++) stepWorld(w, s, 1);
    expect(s.hutCans).toBe(HUT_CANS.give);
  });

  it("Meldung beim ersten Herankommen genau einmal", () => {
    const { w, s, p } = setup();
    p.x = w.hut.x + 0.5 + HUT.see + 2;
    p.y = w.hut.y + 0.5;
    const hits = () =>
      stepWorld(w, s, 0.1).filter((e) => e.text.startsWith("Eine verlassene Hütte!")).length;
    expect(hits()).toBe(0);
    p.x = w.hut.x + 0.5 + HUT.see - 1;
    expect(hits()).toBe(1);
    expect(hits()).toBe(0);
  });
});

describe("WL-AK-40: Apfelbäume", () => {
  it("etwa 10 % der Bäume, immer gleich je Seed", () => {
    const w = generateWorld(5);
    const share = w.trees.filter((t) => t.apple).length / w.trees.length;
    expect(share).toBeGreaterThan(0.05);
    expect(share).toBeLessThan(0.15);
    expect(generateWorld(5).trees.map((t) => !!t.apple)).toEqual(w.trees.map((t) => !!t.apple));
  });

  it("schütteln gibt 2 Äpfel, dann Holz hacken; nach einem halben Tag wieder Äpfel", () => {
    const { w, s, p } = setup();
    s.mushrooms = [];
    // Apfelbaum ohne andere Bäume direkt daneben (sonst wäre ein anderer Baum näher)
    const k = w.trees.findIndex(
      (t) =>
        t.apple &&
        free(w, s, t.x - 1, t.y) &&
        !w.trees.some((o) => o !== t && Math.hypot(o.x - (t.x - 1), o.y - t.y) < 2),
    );
    const t = w.trees[k]!;
    p.x = t.x - 0.5;
    p.y = t.y + 0.5;
    expect(hasApples(w, s, k)).toBe(true);
    expect(actionFor(w, s, p)?.label).toBe("Äpfel schütteln");
    expect(act(w, s, p)).toBe("+2 Äpfel");
    expect(p.apples).toBe(APPLES.give);
    expect(actionFor(w, s, p)?.label).toBe("Holz hacken");
    s.total += APPLES.regrow + 1;
    expect(hasApples(w, s, k)).toBe(true);
  });
});

describe("WL-AK-41: Pilze", () => {
  it("nur auf freien Waldfeldern; sammeln gibt einen; nach einem halben Tag wieder gleich viele", () => {
    const { w, s, p } = setup();
    expect(s.mushrooms.length).toBeGreaterThan(30);
    for (const m of s.mushrooms) {
      expect(w.terrain[m]).toBe(T.FOREST);
      expect(w.treeAt[m]).toBe(0);
    }
    const n = s.mushrooms.length;
    const m = s.mushrooms[0]!;
    p.x = (m % w.size) + 0.5;
    p.y = Math.floor(m / w.size) + 0.5;
    expect(actionFor(w, s, p)?.label).toBe("Pilz sammeln");
    expect(act(w, s, p)).toBe("+1 Pilz");
    expect(p.mushrooms).toBe(1);
    expect(s.mushrooms).not.toContain(m);
    for (let t = 0; t < MUSHROOMS.regrow + 2; t++) stepWorld(w, s, 1);
    expect(s.mushrooms.length).toBe(n);
  });
});

describe("WL-AK-42: Essen, Speichern, Mehrspieler", () => {
  it("jede Sorte gibt ihren Hunger-Wert, max. 100; ohne Vorrat ändert sich nichts", () => {
    const { p } = setup();
    expect(eat(p)).toBe("Nichts zu essen dabei – such Beeren, Äpfel oder Pilze!");
    expect(FOODS.mushrooms.hunger).toBe(8);
    expect(FOODS.berries.hunger).toBe(12);
    expect(FOODS.apples.hunger).toBe(20);
    expect(FOODS.cans.hunger).toBe(35);
    for (const k of ["mushrooms", "berries", "apples", "cans"] as const) {
      p.needs.hunger = 40;
      p[k] = 1;
      expect(eat(p, k)).toBe("Lecker!");
      expect(p.needs.hunger).toBe(40 + FOODS[k].hunger);
      expect(p[k]).toBe(0);
    }
    p.needs.hunger = 90;
    p.cans = 1;
    eat(p);
    expect(p.needs.hunger).toBe(100);
    p.apples = 1;
    p.berries = 2;
    expect(foodsOf(p)).toEqual(["berries", "apples"]);
  });

  it("Speichern/Laden: Vorräte, Kiste, Äpfel, Pilze; kaputte Werte → sicher", () => {
    const { w, s, p } = setup(9);
    Object.assign(p, { apples: 3, mushrooms: 2, cans: 1, hutSeen: true });
    s.hutCans = 0;
    s.hutRefill = 999;
    s.appleEmpty[4] = 777;
    const store = memory();
    save(store, 9, s, "me");
    const r = load(store)!;
    const q = r.state.players.me!;
    expect([q.apples, q.mushrooms, q.cans, q.hutSeen]).toEqual([3, 2, 1, true]);
    expect([r.state.hutCans, r.state.hutRefill]).toEqual([0, 999]);
    expect(r.state.appleEmpty[4]).toBe(777);
    expect(r.state.mushrooms).toEqual(s.mushrooms);
    // ältere Spielstände ohne die neuen Felder
    const raw = JSON.parse(store.get("dampf.waldlager.v1")!);
    delete raw.state.mushrooms;
    delete raw.state.hutCans;
    raw.state.players.me.apples = "viele";
    store.set("dampf.waldlager.v1", JSON.stringify(raw));
    const old = load(store)!;
    expect(old.state.players.me!.apples).toBe(0);
    expect(old.state.hutCans).toBe(HUT_CANS.give);
    expect(old.state.mushrooms.length).toBeGreaterThan(0);
    void w;
  });

  it("Schnappschuss überträgt Vorräte, Kiste, Äpfel und Pilze; Gäste wählen die Sorte", () => {
    const { w, s, p } = setup(5);
    Object.assign(p, { apples: 2, cans: 1 });
    s.hutCans = 1;
    const near = s.mushrooms.find(
      (m) => Math.abs((m % w.size) - p.x) < 25 && Math.abs(Math.floor(m / w.size) - p.y) < 25,
    );
    const snap = JSON.parse(JSON.stringify(toSnap(w, s, [p])));
    expect(snap.hutCans).toBe(1);
    if (near !== undefined) expect(snap.mushrooms).toContain(near);
    const ok = parseHost(snap)!;
    const g = createState(w);
    applySnap(g, ok as never, "gast", true);
    expect(g.players.me!.apples).toBe(2);
    expect(g.players.me!.cans).toBe(1);
    expect(g.hutCans).toBe(1);
    for (const bad of [{ hutCans: "x" }, { mushrooms: ["a"] }, { appleEmpty: [[1]] }])
      expect(parseHost({ ...snap, ...bad })).toBeNull();
    expect(parseGuest({ v: 1, k: "eat", food: "apples" })).toEqual({
      v: 1,
      k: "eat",
      food: "apples",
    });
    expect(parseGuest({ v: 1, k: "eat" })).toEqual({ v: 1, k: "eat" });
    expect(parseGuest({ v: 1, k: "eat", food: "kuchen" })).toBeNull();
  });
});
