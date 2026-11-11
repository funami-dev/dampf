import { describe, expect, it } from "vitest";
import { applySnap, parseGuest, parseHost, toSnap } from "./protocol.ts";
import { load, save, type Store } from "./save.ts";
import {
  CHEST,
  LIMITS,
  addPlayer,
  chestMove,
  chestNear,
  createState,
  giveFood,
  nearbyPlayer,
} from "./sim.ts";
import { generateWorld } from "./world.ts";

const memory = (): Store => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};
function two() {
  const w = generateWorld(42);
  const s = createState(w);
  const a = addPlayer(w, s, "me", "Lea", "#3498db");
  const b = addPlayer(w, s, "gast", "Max", "#e74c3c");
  for (const p of [a, b]) p.landing = 0;
  b.x = a.x + 1;
  b.y = a.y;
  return { w, s, a, b };
}

describe("WL-AK-57: Essen geben", () => {
  it("an den Mitspieler daneben, mit Meldung für beide", () => {
    const { s, a, b } = two();
    a.apples = 2;
    b.apples = 0;
    expect(nearbyPlayer(s, a)?.id).toBe("gast");
    const r = giveFood(s, a, "apples");
    expect(r.text).toBe("Du hast Max einen Apfel gegeben 🍎");
    expect(r.to).toEqual({ player: "gast", text: "🍎 Lea hat dir einen Apfel gegeben!" });
    expect([a.apples, b.apples]).toEqual([1, 1]);
  });
  it("niemand da, nichts dabei, Taschen voll, schlafend → nichts passiert", () => {
    const { s, a, b } = two();
    a.fish = 0;
    expect(giveFood(s, a, "fish").text).toBe("Kein Fisch dabei.");
    a.cans = 1;
    b.cans = LIMITS.food;
    expect(giveFood(s, a, "cans").text).toBe("Max kann nichts mehr tragen.");
    b.sleeping = true;
    expect(giveFood(s, a, "cans").text).toMatch(/niemand/);
    b.sleeping = false;
    b.x = a.x + 5;
    expect(nearbyPlayer(s, a)).toBeNull();
    expect(a.cans).toBe(1);
  });
});

describe("WL-AK-56: Truhen in Hütte und Zelt", () => {
  it("Hütte: hineinlegen und herausnehmen, jeder darf nehmen, Platz 40", () => {
    const { w, s, a, b } = two();
    a.x = w.hut.x + 1.5;
    a.y = w.hut.y + 0.5;
    b.x = a.x;
    b.y = a.y;
    expect(chestNear(w, s, a)?.where).toBe("hut");
    a.wood = 3;
    expect(chestMove(w, s, a, "wood", "put")).toMatch(/hineingelegt|gelegt/);
    expect([a.wood, s.hutChest.wood]).toEqual([2, 1]);
    b.wood = 0;
    expect(chestMove(w, s, b, "wood", "take")).toMatch(/genommen/);
    expect([b.wood, s.hutChest.wood]).toEqual([1, 0]);
    s.hutChest = { wood: CHEST.hut };
    expect(chestMove(w, s, a, "wood", "put")).toBe("Die Truhe ist voll.");
    a.x += 20;
    expect(chestMove(w, s, a, "wood", "put")).toBe("Hier ist keine Truhe.");
  });
  it("Zelt: eigene Truhe mit 10 Plätzen, andere dürfen auch herausnehmen", () => {
    const { w, s, a, b } = two();
    a.tent = { x: Math.floor(a.x) + 1, y: Math.floor(a.y) };
    a.x = a.tent.x - 0.5;
    a.y = a.tent.y + 0.5;
    a.fish = 12;
    for (let k = 0; k < 10; k++) chestMove(w, s, a, "fish", "put");
    expect(chestMove(w, s, a, "fish", "put")).toBe("Die Truhe ist voll.");
    expect(s.tentChests.me).toEqual({ fish: 10 });
    b.x = a.x;
    b.y = a.y + 1;
    expect(chestNear(w, s, b)?.label).toBe("Truhe in Leas Zelt");
    expect(chestMove(w, s, b, "fish", "take")).toMatch(/genommen/);
    expect(b.fish).toBe(1);
  });
  it("übersteht Neuladen und geht an die Gäste", () => {
    const { w, s, a } = two();
    s.hutChest = { wood: 4, cans: 2 };
    s.tentChests.me = { apples: 3 };
    a.tent = { x: Math.floor(a.x) + 1, y: Math.floor(a.y) };
    const store = memory();
    save(store, 42, s, "me");
    const r = load(store)!;
    expect(r.state.hutChest).toEqual({ wood: 4, cans: 2 });
    expect(r.state.tentChests).toEqual({ me: { apples: 3 } });
    const snap = parseHost(JSON.parse(JSON.stringify(toSnap(w, s, [a]))))!;
    const g = createState(w);
    applySnap(g, snap as Parameters<typeof applySnap>[1], "gast", true);
    expect(g.hutChest).toEqual({ wood: 4, cans: 2 });
    expect(g.tentChests.me).toEqual({ apples: 3 });
    expect(parseGuest({ v: 1, k: "chest", kind: "wood", dir: "take" })).toEqual({
      v: 1,
      k: "chest",
      kind: "wood",
      dir: "take",
    });
    expect(parseGuest({ v: 1, k: "chest", kind: "gold", dir: "take" })).toBeNull();
    expect(parseGuest({ v: 1, k: "give", food: "fish" })).toEqual({
      v: 1,
      k: "give",
      food: "fish",
    });
  });
});
