import { describe, expect, it } from "vitest";
import {
  ANIMALS,
  COSTS,
  FIRE,
  act,
  actionFor,
  addPlayer,
  build,
  canBuildAt,
  createState,
  eat,
  free,
  movePlayer,
  stepWorld,
  type Player,
  type State,
} from "./sim.ts";
import { DAY } from "./daytime.ts";
import { T, generateWorld, idx, type World } from "./world.ts";

function setup(seed = 3) {
  const w = generateWorld(seed);
  const s = createState(w);
  const p = addPlayer(w, s, "a", "Mia", "#e74c3c");
  return { w, s, p };
}

/** Spieler direkt neben einen stehenden Baum stellen */
function nextToTree(w: World, s: State, p: Player) {
  for (let k = 0; k < w.trees.length; k++) {
    const t = w.trees[k]!;
    if (free(w, s, t.x - 1, t.y)) {
      p.x = t.x - 0.5;
      p.y = t.y + 0.5;
      p.fx = 1;
      p.fy = 0;
      return k;
    }
  }
  throw new Error("kein Baum");
}

describe("WL-AK-02: Kollision", () => {
  it("Wasser, Fels und Bäume sind nicht begehbar, Furten schon", () => {
    const { w, s } = setup();
    const find = (t: number) => {
      const i = w.terrain.findIndex((x) => x === t);
      return [i % w.size, Math.floor(i / w.size)] as const;
    };
    expect(free(w, s, ...find(T.WATER))).toBe(false);
    expect(free(w, s, ...find(T.ROCK))).toBe(false);
    expect(free(w, s, ...find(T.FORD))).toBe(true);
    const t = w.trees[0]!;
    expect(free(w, s, t.x, t.y)).toBe(false);
  });
  it("man läuft nicht in einen Baum, gleitet aber seitlich weiter", () => {
    const { w, s, p } = setup();
    const k = nextToTree(w, s, p);
    const t = w.trees[k]!;
    // Bildschirm-Richtung so wählen, dass es in Kachel-Richtung +x geht: (sx,sy) = (1,1)/√2 → (+x)
    for (let i = 0; i < 60; i++) movePlayer(w, s, p, { x: 0.7071, y: 0.7071, run: false }, 1 / 30);
    expect(p.x).toBeLessThan(t.x - 0.29 + 0.01);
  });
});

describe("WL-AK-05: Holz hacken", () => {
  it("vier Hiebe geben 3 Holz, Baum wird Stumpf und wächst nach einem Spieltag nach", () => {
    const { w, s, p } = setup();
    const k = nextToTree(w, s, p);
    expect(actionFor(w, s, p)?.kind).toBe("chop");
    for (let i = 0; i < 3; i++) expect(act(w, s, p)).toBe("Tock!");
    expect(act(w, s, p)).toBe("+3 Holz");
    expect(p.wood).toBe(3);
    expect(s.stumps[k]).toBeDefined();
    const t = w.trees[k]!;
    expect(free(w, s, t.x, t.y)).toBe(true);
    p.x = w.start.x + 0.5;
    p.y = w.start.y + 0.5;
    for (let i = 0; i < DAY + 1; i++) stepWorld(w, s, 1);
    expect(s.stumps[k]).toBeUndefined();
  });
  it("höchstens 30 Holz", () => {
    const { w, s, p } = setup();
    p.wood = 30;
    nextToTree(w, s, p);
    expect(act(w, s, p)).toMatch(/nicht mehr Holz/);
    expect(p.wood).toBe(30);
  });
});

describe("WL-AK-06: Beeren", () => {
  it("Strauch gibt 4 Beeren, füllt sich nach halbem Tag; Essen +12 %", () => {
    const { w, s, p } = setup();
    const b = w.bushes[0]!;
    p.x = b.x + 0.5;
    p.y = b.y - 0.3;
    expect(actionFor(w, s, p)?.kind).toBe("pick");
    expect(act(w, s, p)).toBe("+4 Beeren");
    expect(p.berries).toBe(4);
    expect(actionFor(w, s, p)?.kind).not.toBe("pick");
    p.needs.hunger = 40;
    expect(eat(p)).toBe("Lecker!");
    expect(p.needs.hunger).toBe(52);
    expect(p.berries).toBe(3);
    for (let i = 0; i < DAY / 2 + 1; i++) stepWorld(w, s, 1);
    expect(s.berries[0]).toBe(4);
  });
});

describe("WL-AK-07: Bauen", () => {
  function onFlatSpot(w: World, s: State, p: Player) {
    for (let y = 2; y < w.size - 2; y++)
      for (let x = 2; x < w.size - 3; x++)
        if (
          canBuildAt(w, s, x + 1, y) &&
          free(w, s, x, y) &&
          !w.trees.some((t) => Math.hypot(t.x - x, t.y - y) < 3)
        ) {
          p.x = x + 0.5;
          p.y = y + 0.5;
          p.fx = 1;
          p.fy = 0;
          return { x: x + 1, y };
        }
    throw new Error("kein Platz");
  }
  it("Zelt kostet 8 Holz, ein neues ersetzt das alte", () => {
    const { w, s, p } = setup();
    p.wood = 7;
    onFlatSpot(w, s, p);
    expect(build(w, s, p, "tent")).toMatch(/8 Holz/);
    p.wood = 20;
    const spot = onFlatSpot(w, s, p);
    expect(build(w, s, p, "tent")).toBe("Dein Zelt steht!");
    expect(p.tent).toEqual(spot);
    expect(p.wood).toBe(12);
    expect(free(w, s, spot.x, spot.y)).toBe(false);
    const spot2 = onFlatSpot(w, s, p);
    build(w, s, p, "tent");
    expect(p.tent).toEqual(spot2);
    expect(free(w, s, spot.x, spot.y)).toBe(true);
  });
  it("Feuer kostet 3 Holz, brennt 3 Min., Holz nachlegen +2 Min.", () => {
    const { w, s, p } = setup();
    p.wood = 5;
    onFlatSpot(w, s, p);
    expect(build(w, s, p, "fire")).toBe("Das Lagerfeuer brennt!");
    expect(p.wood).toBe(5 - COSTS.fire);
    const f = s.fires[0]!;
    expect(f.until - s.total).toBe(FIRE.burn);
    expect(actionFor(w, s, p)?.kind).toBe("stoke");
    act(w, s, p);
    expect(f.until - s.total).toBe(FIRE.burn + FIRE.stoke);
  });
  it("nicht auf Wasser, Bäumen oder schrägem Gelände", () => {
    const { w, s } = setup();
    const water = w.terrain.findIndex((x) => x === T.WATER);
    expect(canBuildAt(w, s, water % w.size, Math.floor(water / w.size))).toBe(false);
    const t = w.trees[0]!;
    expect(canBuildAt(w, s, t.x, t.y)).toBe(false);
    for (let y = 1; y < w.size - 1; y++)
      for (let x = 1; x < w.size - 1; x++)
        if (w.height[idx(w, x, y)] !== w.height[idx(w, x + 1, y)])
          expect(canBuildAt(w, s, x, y)).toBe(false);
  });
});

describe("WL-AK-04: Kein Sterben", () => {
  it("Müdigkeit 0 → am Zelt aufwachen mit 50 %, Inventar bleibt", () => {
    const { w, s, p } = setup();
    p.tent = { x: w.start.x + 1, y: w.start.y };
    p.wood = 9;
    p.berries = 2;
    p.x = 10.5;
    p.y = 10.5;
    p.needs.rest = 0.001;
    const ev = stepWorld(w, s, 1);
    expect(ev[0]?.text).toMatch(/eingeschlafen/);
    expect(p.needs.rest).toBe(50);
    expect(Math.hypot(p.x - (p.tent.x + 0.5), p.y - (p.tent.y + 0.5))).toBeLessThan(3);
    expect([p.wood, p.berries]).toEqual([9, 2]);
  });
  it("Hunger 0 macht langsam", () => {
    const { w, s, p } = setup();
    const x0 = p.x;
    const y0 = p.y;
    movePlayer(w, s, p, { x: 0, y: -1, run: false }, 0.2);
    const full = Math.hypot(p.x - x0, p.y - y0);
    p.x = x0;
    p.y = y0;
    p.needs.hunger = 0;
    movePlayer(w, s, p, { x: 0, y: -1, run: false }, 0.2);
    expect(Math.hypot(p.x - x0, p.y - y0)).toBeLessThan(full * 0.7);
  });
  it("Fitness 0 sperrt Rennen und Hacken bis 20 %", () => {
    const { w, s, p } = setup();
    nextToTree(w, s, p);
    p.needs.fitness = 3;
    act(w, s, p);
    expect(p.exhausted).toBe(true);
    expect(act(w, s, p)).toMatch(/erschöpft/);
    movePlayer(w, s, p, { x: 1, y: 0, run: true }, 0.1);
    expect(p.running).toBe(false);
    movePlayer(w, s, p, { x: 0, y: 0, run: false }, 0.1);
    for (let i = 0; i < 4; i++) stepWorld(w, s, 1);
    expect(p.exhausted).toBe(false);
  });
});

describe("WL-AK-08: Schlafen beschleunigt die Nacht", () => {
  it("schläft allein nachts → Zeit läuft 4-mal so schnell", () => {
    const { w, s, p } = setup();
    s.total = 450;
    p.sleeping = true;
    p.needs.rest = 0;
    p.needs.rest = 10;
    stepWorld(w, s, 1);
    expect(s.total).toBeCloseTo(454, 5);
    p.sleeping = false;
    stepWorld(w, s, 1);
    expect(s.total).toBeCloseTo(455, 5);
  });
  it("mit zwei Spielern nur, wenn alle schlafen", () => {
    const { w, s, p } = setup();
    const q = addPlayer(w, s, "b", "Ben", "#3498db");
    s.total = 450;
    p.sleeping = true;
    p.needs.rest = 10;
    stepWorld(w, s, 1);
    expect(s.total).toBeCloseTo(451, 5);
    q.sleeping = true;
    q.needs.rest = 10;
    stepWorld(w, s, 1);
    expect(s.total).toBeCloseTo(455, 5);
  });
});

describe("WL-AK-09: Tiere", () => {
  it("alle Arten, nur auf begehbaren Feldern, fliehen vor Spielern", () => {
    const { w, s, p } = setup();
    expect(new Set(s.animals.map((a) => a.kind))).toEqual(new Set(ANIMALS));
    for (let i = 0; i < 600; i++) {
      stepWorld(w, s, 0.25);
      for (const a of s.animals) expect(free(w, s, Math.floor(a.x), Math.floor(a.y))).toBe(true);
    }
    const a = s.animals[0]!;
    p.x = a.x + 1;
    p.y = a.y;
    const d0 = Math.hypot(a.x - p.x, a.y - p.y);
    s.total = 100;
    for (let i = 0; i < 10; i++) stepWorld(w, s, 0.1);
    expect(a.fleeing || Math.hypot(a.x - p.x, a.y - p.y) > d0).toBe(true);
    expect(s.animals.length).toBe(new Set(s.animals).size);
  });
  it("es gibt keine Aktion gegen Tiere", () => {
    const { w, s, p } = setup();
    const a = s.animals[0]!;
    p.x = a.x;
    p.y = a.y;
    const n = s.animals.length;
    const kind = actionFor(w, s, p)?.kind;
    expect(["chop", "pick", "sleep", "wake", "stoke", undefined]).toContain(kind);
    act(w, s, p);
    expect(s.animals.length).toBe(n);
  });
});
