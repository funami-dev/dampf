import { describe, expect, it } from "vitest";
import { RATES } from "./needs.ts";
import { applySnap, parseHost, toSnap } from "./protocol.ts";
import { load, save, type Store } from "./save.ts";
import { TRAIL, addPlayer, createState, markTrail, stepWorld } from "./sim.ts";
import { SPECIES, UNICORN } from "./species.ts";
import { generateWorld, idx } from "./world.ts";

const memory = (): Store => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe("WL-AK-37: Regenbogenspur", () => {
  it("Spurfeld bis jetzt + 600 s, höchstens 300, abgelaufene verschwinden", () => {
    const w = generateWorld(3);
    const s = createState(w);
    s.total = 1000;
    markTrail(w, s, 10.4, 12.7);
    expect(s.trail[idx(w, 10, 12)]).toBe(1000 + TRAIL.seconds);
    expect(TRAIL.seconds).toBe(600);
    for (let i = 0; i < 350; i++) {
      s.total = 1001 + i;
      markTrail(w, s, 20 + (i % 100), 20 + Math.floor(i / 100));
    }
    expect(Object.keys(s.trail)).toHaveLength(TRAIL.max);
    expect(TRAIL.max).toBe(300);
    // die ältesten sind weg
    expect(s.trail[idx(w, 10, 12)]).toBeUndefined();
    expect(s.trail[idx(w, 20, 20)]).toBeUndefined();
    s.total = 1350 + TRAIL.seconds + 1;
    markTrail(w, s, 5, 5);
    expect(Object.keys(s.trail)).toHaveLength(1);
  });

  it("nur das Einhorn hinterlässt beim Laufen eine Spur", () => {
    const w = generateWorld(11);
    const s = createState(w);
    addPlayer(w, s, "me", "Lea", "#3498db");
    s.total = 100; // Tag: alle tagaktiven laufen
    s.day = 0; // kein neuer Tag (sonst könnte ein echtes Einhorn dazukommen)
    const meadow = (k: string) => SPECIES.find((x) => x.id === k)?.habitat === "wiese";
    const a = s.animals.find(
      (x) => meadow(x.kind) && SPECIES.find((y) => y.id === x.kind)!.time === "tag",
    )!;
    s.animals = [a];
    for (let i = 0; i < 400; i++) {
      a.tx = a.x + 3;
      a.ty = a.y;
      stepWorld(w, s, 0.1);
    }
    expect(Object.keys(s.trail)).toHaveLength(0);
    a.kind = UNICORN;
    const start = idx(w, Math.floor(a.x), Math.floor(a.y));
    for (let i = 0; i < 400; i++) {
      a.tx = a.x + 3;
      a.ty = a.y;
      stepWorld(w, s, 0.1);
    }
    const cells = Object.keys(s.trail).map(Number);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells).toContain(start);
  });

  it("Gäste bekommen die Spur, ungültige Spurdaten werden abgewiesen", () => {
    const w = generateWorld(5);
    const s = createState(w);
    addPlayer(w, s, "host", "Lea", "#3498db");
    const h = s.players.host!;
    s.total = 50;
    markTrail(w, s, h.x, h.y);
    markTrail(w, s, 1, 1); // weit weg
    const snap = JSON.parse(JSON.stringify(toSnap(w, s, [h])));
    expect(snap.trail).toEqual([[idx(w, Math.floor(h.x), Math.floor(h.y)), 50 + TRAIL.seconds]]);
    const ok = parseHost(snap)!;
    const g = createState(w);
    applySnap(g, ok as never, "gast", true);
    expect(g.trail).toEqual({ [idx(w, Math.floor(h.x), Math.floor(h.y))]: 50 + TRAIL.seconds });
    for (const bad of [[[1]], [["x", 2]], "x", [[1, NaN]]])
      expect(parseHost({ ...snap, trail: bad })).toBeNull();
    // ohne Spur (ältere Gastgeber) geht es auch
    const old = { ...snap };
    delete old.trail;
    expect(parseHost(old)).not.toBeNull();
  });

  it("die Spur wird nicht gespeichert", () => {
    const w = generateWorld(9);
    const s = createState(w);
    addPlayer(w, s, "me", "Lea", "#3498db");
    markTrail(w, s, 30, 30);
    const store = memory();
    save(store, 9, s, "me");
    expect(load(store)!.state.trail).toEqual({});
  });
});

describe("WL-AK-38: Fitness hält doppelt so lange", () => {
  it("Rennen leert volle Fitness in ca. 30 s, ein Axthieb kostet 2,5 %", () => {
    expect(100 / RATES.runPerSec).toBeCloseTo(30);
    expect(RATES.chopCost).toBe(2.5);
  });
});
