import { describe, expect, it } from "vitest";
import { KEY, load, save, type Store } from "./save.ts";
import { addPlayer, createState } from "./sim.ts";
import { generateWorld } from "./world.ts";

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe("WL-AK-10: Speichern", () => {
  it("Welt, Inventar und Leisten überstehen Neuladen", () => {
    const w = generateWorld(77);
    const s = createState(w);
    const p = addPlayer(w, s, "me", "Lea", "#3498db");
    p.wood = 11;
    p.berries = 3;
    p.needs.hunger = 42;
    p.tent = { x: 5, y: 6 };
    s.total = 1234;
    s.stumps[3] = 1800;
    s.berries[0] = 1;
    s.fires.push({ id: 1, x: 9, y: 9, until: 1300 });
    addPlayer(w, s, "gast", "Gast", "#e74c3c");
    const store = memory();
    save(store, 77, s, "me");
    const r = load(store)!;
    expect(r.me).toBe("me");
    expect(r.world.seed).toBe(77);
    const q = r.state.players.me!;
    expect([q.name, q.color, q.wood, q.berries, q.needs.hunger]).toEqual([
      "Lea",
      "#3498db",
      11,
      3,
      42,
    ]);
    expect(q.tent).toEqual({ x: 5, y: 6 });
    expect(r.state.total).toBe(1234);
    expect(r.state.stumps[3]).toBe(1800);
    expect(r.state.berries[0]).toBe(1);
    expect(r.state.fires).toHaveLength(1);
    expect(Object.keys(r.state.players)).toEqual(["me"]);
  });

  it("kaputte oder fehlende Daten → null ohne Absturz", () => {
    const store = memory();
    expect(load(store)).toBeNull();
    for (const bad of [
      "{",
      "null",
      '{"v":2}',
      '{"v":1,"seed":"x"}',
      '{"v":1,"seed":1,"me":"a","state":{}}',
    ])
      expect(load({ get: () => bad, set: () => undefined })).toBeNull();
    store.data.set(
      KEY,
      JSON.stringify({
        v: 1,
        seed: 5,
        me: "a",
        state: { total: 1, berries: [], fires: [], players: { a: { id: "a" } } },
      }),
    );
    expect(load(store)).toBeNull();
  });
});
