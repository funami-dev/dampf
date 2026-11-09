import { describe, expect, it } from "vitest";
import {
  COSTS,
  canBridgeAt,
  UNICORN_CHANCE,
  hiddenAt,
  habitatOk,
  newDay,
  visibleAnimals,
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
import { SPECIES, UNICORN, speciesById } from "./species.ts";
import { discover, loadBook, saveBook, BOOK_KEY } from "./tierbuch.ts";

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
  it("Wasser, Fels und Bäume sind nicht begehbar, gebaute Brücken schon", () => {
    const { w, s } = setup();
    const find = (t: number) => {
      const i = w.terrain.findIndex((x) => x === t);
      return [i % w.size, Math.floor(i / w.size)] as const;
    };
    expect(free(w, s, ...find(T.WATER))).toBe(false);
    expect(free(w, s, ...find(T.ROCK))).toBe(false);
    const [wx, wy] = find(T.WATER);
    s.bridges[idx(w, wx, wy)] = 1;
    expect(free(w, s, wx, wy)).toBe(true);
    const t = w.trees[0]!;
    expect(free(w, s, t.x, t.y)).toBe(false);
  });
  it("man läuft nicht in einen Baum, gleitet aber seitlich weiter", () => {
    const { w, s, p } = setup();
    p.landing = 0;
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
    p.x = p.home.x + 0.5;
    p.y = p.home.y + 0.5;
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

describe("Aktion: die nächste gewinnt", () => {
  it("Zelt neben einem Strauch: am Strauch wird gepflückt, am Zelt geschlafen", () => {
    const { w, s, p } = setup();
    const b = w.bushes[0]!;
    p.tent = { x: b.x + 1, y: b.y };
    p.x = b.x + 0.5;
    p.y = b.y - 0.3;
    expect(actionFor(w, s, p)?.kind).toBe("pick");
    p.x = b.x + 1.5;
    p.y = b.y - 0.4;
    expect(actionFor(w, s, p)?.kind).toBe("sleep");
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
    p.tent = { x: p.home.x + 1, y: p.home.y };
    p.wood = 9;
    p.berries = 2;
    p.x = p.home.x + 40.5;
    p.y = p.home.y + 0.5;
    p.needs.rest = 0.001;
    const ev = stepWorld(w, s, 1);
    expect(ev[0]?.text).toMatch(/eingeschlafen/);
    expect(p.needs.rest).toBe(50);
    expect(Math.hypot(p.x - (p.tent.x + 0.5), p.y - (p.tent.y + 0.5))).toBeLessThan(3);
    expect([p.wood, p.berries]).toEqual([9, 2]);
  });
  it("Hunger 0 macht langsam", () => {
    const { w, s, p } = setup();
    p.landing = 0;
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
    p.landing = 0;
    nextToTree(w, s, p);
    p.needs.fitness = 2;
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
  it("nur auf begehbaren Feldern, fliehen vor Spielern", () => {
    const { w, s, p } = setup();
    for (let i = 0; i < 600; i++) {
      stepWorld(w, s, 0.25);
      for (const a of s.animals)
        if (a.kind !== "hai") expect(free(w, s, Math.floor(a.x), Math.floor(a.y))).toBe(true);
    }
    s.total = 100 + Math.ceil(s.total / DAY) * DAY;
    const a = s.animals.find((x) => !hiddenAt(x.kind, s.total) && x.kind !== "hai")!;
    p.x = a.x + 1;
    p.y = a.y;
    const d0 = Math.hypot(a.x - p.x, a.y - p.y);
    for (let i = 0; i < 10; i++) stepWorld(w, s, 0.1);
    expect(a.fleeing || Math.hypot(a.x - p.x, a.y - p.y) > d0).toBe(true);
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

describe("WL-AK-19: Tiere in der Welt", () => {
  for (const seed of [1, 3, 42, 777]) {
    it(`Seed ${seed}: jede Art (außer Einhorn) kommt vor, im richtigen Lebensraum`, () => {
      const w = generateWorld(seed);
      const s = createState(w);
      const kinds = new Set(s.animals.map((a) => a.kind));
      for (const sp of SPECIES) if (sp.id !== UNICORN) expect(kinds, sp.id).toContain(sp.id);
      for (const a of s.animals) {
        const x = Math.floor(a.x);
        const y = Math.floor(a.y);
        if (a.kind !== "hai") expect(free(w, s, x, y)).toBe(true);
        expect(habitatOk(w, a.kind, x, y, false), a.kind).toBe(true);
        if (speciesById(a.kind)!.habitat === "huegel")
          expect(w.height[idx(w, x, y)]).toBeGreaterThanOrEqual(2);
      }
      // seltene Arten höchstens 2-mal, sehr seltene 1-mal
      for (const sp of SPECIES) {
        const n = s.animals.filter((a) => a.kind === sp.id).length;
        if (sp.rarity === "selten") expect(n).toBeLessThanOrEqual(2);
        if (sp.rarity === "sehr-selten") expect(n).toBeLessThanOrEqual(sp.id === "hai" ? 2 : 1);
      }
    });
  }

  it("Wasser- und Hügeltiere bleiben in ihrem Lebensraum, auch über viele Schritte", () => {
    const { w, s } = setup(9);
    for (let i = 0; i < 2000; i++) stepWorld(w, s, 0.25);
    for (const a of s.animals)
      expect(habitatOk(w, a.kind, Math.floor(a.x), Math.floor(a.y), false), a.kind).toBe(true);
  });

  it("nachtaktive Tiere sind tagsüber versteckt, in Dämmerung und Nacht sichtbar", () => {
    expect(hiddenAt("igel", 100)).toBe(true);
    expect(hiddenAt("igel", 10)).toBe(true);
    expect(hiddenAt("igel", 380)).toBe(false);
    expect(hiddenAt("igel", 500)).toBe(false);
    expect(hiddenAt("reh", 100)).toBe(false);
    expect(hiddenAt("reh", 500)).toBe(false);
  });
});

describe("WL-AK-20: Einhorn", () => {
  it("ca. 15 % der Tage, höchstens eins, weit weg, gleicher Seed → gleicher Verlauf", () => {
    const run = (seed: number) => {
      const w = generateWorld(seed);
      const s = createState(w);
      const p = addPlayer(w, s, "a", "Mia", "#e74c3c");
      const days: boolean[] = [];
      for (let d = 1; d <= 400; d++) {
        s.total = d * DAY + 1;
        newDay(w, s);
        const u = s.animals.filter((a) => a.kind === UNICORN);
        expect(u.length).toBeLessThanOrEqual(1);
        if (u[0]) expect(Math.hypot(u[0].x - p.x, u[0].y - p.y)).toBeGreaterThan(25);
        days.push(u.length === 1);
      }
      return days;
    };
    const a = run(11);
    expect(run(11)).toEqual(a);
    const share = a.filter(Boolean).length / a.length;
    expect(share).toBeGreaterThan(UNICORN_CHANCE - 0.07);
    expect(share).toBeLessThan(UNICORN_CHANCE + 0.07);
  });

  it("verschwindet am Tagesende", () => {
    const { w, s } = setup(5);
    let found = false;
    for (let d = 1; d < 200 && !found; d++) {
      s.total = d * DAY + 1;
      newDay(w, s);
      found = s.animals.some((a) => a.kind === UNICORN);
    }
    expect(found).toBe(true);
    // Nächster Tag: das alte Einhorn ist weg (evtl. kommt ein neues woanders)
    const old = s.animals.find((a) => a.kind === UNICORN)!;
    s.total += DAY;
    newDay(w, s);
    expect(s.animals).not.toContain(old);
  });
});

describe("WL-AK-21: Entdecken und Tierbuch", () => {
  it("sichtbar: tags 5 Felder, nachts 3 Felder oder im Feuerschein; versteckte nie", () => {
    const { s, p } = setup();
    s.animals = [
      { kind: "reh", x: p.x + 4.5, y: p.y, tx: 0, ty: 0, fleeing: false },
      { kind: "igel", x: p.x - 2, y: p.y, tx: 0, ty: 0, fleeing: false },
    ];
    s.total = 100; // Tag
    expect(visibleAnimals(s, p).map((a) => a.kind)).toEqual(["reh"]);
    s.total = 500; // Nacht
    expect(visibleAnimals(s, p).map((a) => a.kind)).toEqual(["igel"]);
    s.fires.push({ id: 1, x: Math.floor(p.x + 4.5), y: Math.floor(p.y) + 1, until: 9999 });
    expect(
      visibleAnimals(s, p)
        .map((a) => a.kind)
        .sort(),
    ).toEqual(["igel", "reh"]);
  });

  it("jede Art wird genau einmal eingetragen; Tierbuch übersteht Neuladen, kaputte Daten → leer", () => {
    const data = new Map<string, string>();
    const store = {
      get: (k: string) => data.get(k) ?? null,
      set: (k: string, v: string) => void data.set(k, v),
    };
    const book = loadBook(store);
    expect(book.size).toBe(0);
    expect(discover(book, ["reh", "reh", "igel", "drache"])).toEqual(["reh", "igel"]);
    expect(discover(book, ["reh"])).toEqual([]);
    saveBook(store, book);
    expect([...loadBook(store)].sort()).toEqual(["igel", "reh"]);
    for (const bad of ["{", '{"v":2,"seen":["reh"]}', '{"v":1,"seen":"reh"}'])
      expect(loadBook({ get: () => bad, set: () => undefined }).size).toBe(0);
    data.set(BOOK_KEY, '{"v":1,"seen":["reh",5,"drache"]}');
    expect([...loadBook(store)]).toEqual(["reh"]);
  });
});

describe("WL-AK-23: Fallschirm", () => {
  it("eigener zufälliger Landeplatz: frei, weit weg vom Flugzeug, Beeren in der Nähe; 3 s Landung", () => {
    const w = generateWorld(21);
    const s = createState(w);
    const homes = ["a", "b", "c", "d"].map((id) => addPlayer(w, s, id, id, "#e74c3c"));
    expect(new Set(homes.map((p) => `${p.home.x},${p.home.y}`)).size).toBe(4);
    for (const p of homes) {
      expect(
        free(w, s, p.home.x, p.home.y) ||
          Object.values(s.players).some((q) => q !== p && Math.floor(q.x) === p.home.x),
      ).toBe(true);
      expect(Math.hypot(p.home.x - w.plane.x, p.home.y - w.plane.y)).toBeGreaterThanOrEqual(58);
      let trees = 0;
      for (const t of w.trees) if (Math.hypot(t.x - p.home.x, t.y - p.home.y) <= 15) trees++;
      expect(trees).toBeGreaterThanOrEqual(10);
      expect(w.bushes.some((b) => Math.hypot(b.x - p.home.x, b.y - p.home.y) <= 6)).toBe(true);
      expect(p.landing).toBe(3);
    }
    const p = homes[0]!;
    const x0 = p.x;
    movePlayer(w, s, p, { x: 1, y: 0, run: false }, 0.5);
    expect(p.x).toBe(x0);
    for (let i = 0; i < 31; i++) stepWorld(w, s, 0.1);
    expect(p.landing).toBe(0);
  });
});

describe("WL-AK-24: Funkgerät", () => {
  it("bis 2 Felder ans Wrack → Funkgerät, genau eine Meldung", () => {
    const { w, s, p } = setup(2);
    p.landing = 0;
    const [cx, cy] = w.plane.cells[0]!;
    p.x = cx - 2 + 0.5;
    p.y = cy + 0.5;
    const ev = stepWorld(w, s, 0.1);
    expect(p.radio).toBe(true);
    expect(ev.filter((e) => /Funkgerät/.test(e.text))).toHaveLength(1);
    expect(stepWorld(w, s, 0.1).filter((e) => /Funkgerät/.test(e.text))).toHaveLength(0);
    const q = addPlayer(w, s, "far", "Fern", "#3498db");
    stepWorld(w, s, 0.1);
    expect(q.radio).toBe(false);
  });
});

describe("WL-AK-26: Hai", () => {
  it("nur im Meer, höchstens zwei, zeitweise abgetaucht", () => {
    const { w, s } = setup(4);
    const sharks = () => s.animals.filter((a) => a.kind === "hai");
    expect(sharks().length).toBeGreaterThanOrEqual(1);
    expect(sharks().length).toBeLessThanOrEqual(2);
    for (let i = 0; i < 1200; i++) {
      stepWorld(w, s, 0.25);
      for (const a of sharks())
        expect(w.terrain[idx(w, Math.floor(a.x), Math.floor(a.y))]).toBe(T.SEA);
    }
    let up = 0;
    for (let t = 0; t < 900; t++) if (!hiddenAt("hai", t)) up++;
    expect(up / 900).toBeGreaterThan(0.25);
    expect(up / 900).toBeLessThan(0.45);
    const a = sharks()[0]!;
    const viewer = { x: a.x, y: a.y + 2 };
    s.total = 10;
    expect(visibleAnimals(s, viewer)).toContain(a);
    s.total = 60;
    expect(visibleAnimals(s, viewer)).not.toContain(a);
  });
});

describe("WL-AK-28: Brücke bauen", () => {
  it("3 Holz je Feld, nur auf Flusswasser vor der Figur, dann begehbar", () => {
    const { w, s, p } = setup(2);
    p.landing = 0;
    // Ufer-Feld mit Fluss rechts davon (Kachel +x)
    let spot: [number, number] | null = null;
    for (let i = 0; i < w.terrain.length && !spot; i++) {
      if (w.terrain[i] !== T.WATER) continue;
      const x = i % w.size;
      const y = Math.floor(i / w.size);
      if (free(w, s, x - 1, y) && w.terrain[idx(w, x - 1, y)] !== T.WATER) spot = [x - 1, y];
    }
    const [bx, by] = spot!;
    p.x = bx + 0.5;
    p.y = by + 0.5;
    p.fx = 1;
    p.fy = 0;
    p.wood = 2;
    expect(build(w, s, p, "bridge")).toMatch(/3 Holz/);
    p.wood = 9;
    expect(free(w, s, bx + 1, by)).toBe(false);
    expect(build(w, s, p, "bridge")).toBe("Ein Stück Brücke steht!");
    expect(p.wood).toBe(6);
    expect(free(w, s, bx + 1, by)).toBe(true);
    // gleiche Stelle nochmal: geht nicht
    expect(build(w, s, p, "bridge")).toMatch(/Flusswasser/);
    // nicht auf Land, nicht aufs Meer
    p.fx = -1;
    expect(build(w, s, p, "bridge")).toMatch(/Flusswasser/);
    const sea = w.terrain.findIndex((t) => t === T.SEA);
    expect(canBridgeAt(w, s, sea % w.size, Math.floor(sea / w.size))).toBe(false);
    expect(p.wood).toBe(6);
    // auf der Brücke kein Zelt
    expect(canBuildAt(w, s, bx + 1, by)).toBe(false);
  });
});

describe("WL-AK-29: Trümmer ansehen", () => {
  it("am Trümmerteil gibt die Aktion den Hinweis", () => {
    const { w, s, p } = setup(2);
    const d = w.debris[0]!;
    p.x = d.x + 0.5;
    p.y = d.y + 0.5;
    s.berries = s.berries.map(() => 0); // kein Strauch dazwischen
    expect(actionFor(w, s, p)?.kind).toBe("inspect");
    expect(act(w, s, p)).toMatch(/^Ein Stück Flugzeug! Die Spur führt nach /);
  });
});
