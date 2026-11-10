import { describe, expect, it } from "vitest";
import { applySnap, parseGuest, parseHost, toSnap } from "./protocol.ts";
import { load, save, type Store } from "./save.ts";
import {
  COSTS,
  FISHING,
  FOODS,
  LIMITS,
  act,
  actionFor,
  addPlayer,
  build,
  createState,
  eat,
  fishHere,
  foodsOf,
  free,
} from "./sim.ts";
import { generateWorld } from "./world.ts";

const memory = (): Store => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

/** Figur auf ein freies Feld in Reichweite der Fischstelle k stellen */
function standAt(w: ReturnType<typeof generateWorld>, s: ReturnType<typeof createState>, k = 0) {
  const p = addPlayer(w, s, "me", "Lea", "#3498db");
  p.landing = 0;
  const f = w.fish[k]!;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      if (Math.hypot(dx, dy) <= FISHING.reach - 0.3 && free(w, s, f.x + dx, f.y + dy)) {
        p.x = f.x + dx + 0.5;
        p.y = f.y + dy + 0.5;
        // andere Aktionen (Bäume, Sträucher …) aus dem Weg räumen ist nicht nötig:
        // Angeln muss unter den Möglichkeiten sein, wenn es die nächste ist
        return p;
      }
  throw new Error("kein Platz an der Fischstelle");
}

describe("WL-AK-54: Werkzeuge und Angel", () => {
  it("Angel kostet 5 Holz, nur eine", () => {
    const w = generateWorld(42);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    expect(COSTS.rod).toBe(5);
    expect(p.rod).toBe(false);
    p.wood = 4;
    expect(build(w, s, p, "rod")).toBe("Dafür brauchst du 5 Holz.");
    p.wood = 12;
    expect(build(w, s, p, "rod")).toMatch(/Angel ist fertig/);
    expect([p.rod, p.wood]).toEqual([true, 7]);
    expect(build(w, s, p, "rod")).toBe("Du hast schon eine Angel.");
    expect(p.wood).toBe(7);
  });

  it("Angeln an einer Fischstelle gibt einen Fisch, die Stelle ruht einen halben Tag", () => {
    const w = generateWorld(42);
    const s = createState(w);
    // eine Fischstelle suchen, an der Angeln die nächste Aktion ist
    let p = null;
    let k = 0;
    for (; k < w.fish.length; k++) {
      s.players = {};
      const q = standAt(w, s, k);
      q.rod = true;
      if (actionFor(w, s, q)?.kind === "fish") {
        p = q;
        break;
      }
    }
    expect(p).not.toBeNull();
    const me = p!;
    // ohne Angel kein Angeln
    me.rod = false;
    expect(actionFor(w, s, me)?.kind).not.toBe("fish");
    me.rod = true;
    expect(actionFor(w, s, me)?.label).toBe("Angeln");
    expect(act(w, s, me)).toBe("+1 Fisch 🐟");
    expect(me.fish).toBe(1);
    expect(fishHere(s, k)).toBe(false);
    expect(actionFor(w, s, me)?.kind).not.toBe("fish");
    s.total += FISHING.rest + 1;
    expect(fishHere(s, k)).toBe(true);
    expect(actionFor(w, s, me)?.kind).toBe("fish");
    // volle Taschen
    me.fish = LIMITS.food;
    expect(act(w, s, me)).toBe("Deine Taschen sind voll.");
    expect(me.fish).toBe(LIMITS.food);
  });

  it("Fisch essen: +30 % Hunger, in der Essen-Auswahl", () => {
    const w = generateWorld(42);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    p.berries = 0;
    p.fish = 2;
    p.needs.hunger = 40;
    expect(FOODS.fish.hunger).toBe(30);
    expect(foodsOf(p)).toEqual(["fish"]);
    expect(eat(p, "fish")).toBe("Lecker!");
    expect([p.fish, p.needs.hunger]).toEqual([1, 70]);
  });

  it("Angel, Fische und ruhende Stellen überstehen Neuladen", () => {
    const w = generateWorld(42);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    p.rod = true;
    p.fish = 3;
    s.fishRest[1] = 999;
    const store = memory();
    save(store, 42, s, "me");
    const r = load(store)!;
    const q = r.state.players.me!;
    expect([q.rod, q.fish]).toEqual([true, 3]);
    expect(r.state.fishRest[1]).toBe(999);
  });

  it("Mehrspieler: Gäste bauen Angeln, sehen Fische und ruhende Stellen", () => {
    expect(parseGuest({ v: 1, k: "build", kind: "rod" })).toEqual({
      v: 1,
      k: "build",
      kind: "rod",
    });
    const w = generateWorld(42);
    const s = createState(w);
    const p = addPlayer(w, s, "gast", "Gast", "#e74c3c");
    p.rod = true;
    p.fish = 2;
    const f = w.fish[0]!;
    p.x = f.x + 0.5;
    p.y = f.y + 0.5;
    s.total = 10;
    s.fishRest[0] = 500;
    const snap = parseHost(JSON.parse(JSON.stringify(toSnap(w, s, [p]))))!;
    expect(snap).not.toBeNull();
    const g = createState(w);
    applySnap(g, snap as Parameters<typeof applySnap>[1], "gast", true);
    expect([g.players.gast!.rod, g.players.gast!.fish]).toEqual([true, 2]);
    expect(fishHere(g, 0)).toBe(false);
  });
});
