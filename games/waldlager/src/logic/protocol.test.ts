import { describe, expect, it } from "vitest";
import { applySnap, parseGuest, parseHost, toSnap } from "./protocol.ts";
import { addPlayer, createState } from "./sim.ts";
import { generateWorld } from "./world.ts";

describe("WL-AK-12: Protokoll", () => {
  it("gültige Gast-Nachrichten werden erkannt", () => {
    expect(parseGuest({ v: 1, k: "hello", name: "Ben", color: "#3498db" })?.k).toBe("hello");
    expect(
      parseGuest({ v: 1, k: "move", x: 1, y: 2, fx: 1, fy: 0, moving: true, running: false })?.k,
    ).toBe("move");
    expect(parseGuest({ v: 1, k: "build", kind: "fire" })).toEqual({
      v: 1,
      k: "build",
      kind: "fire",
    });
    expect(parseGuest({ v: 1, k: "act" })).toEqual({ v: 1, k: "act" });
    expect(parseGuest({ v: 1, k: "build", kind: "bridge" })?.k).toBe("build");
  });

  it("falsche Version oder ungültiger Inhalt → null, kein Absturz", () => {
    for (const bad of [
      null,
      42,
      "x",
      [],
      { v: 2, k: "act" },
      { v: 1, k: "fly" },
      { v: 1, k: "hello", name: "x".repeat(40), color: "#3498db" },
      { v: 1, k: "hello", name: "Ben", color: "red" },
      { v: 1, k: "move", x: "1", y: 2, fx: 0, fy: 0, moving: true, running: false },
      { v: 1, k: "move", x: NaN, y: 2, fx: 0, fy: 0, moving: true, running: false },
      { v: 1, k: "build", kind: "castle" },
    ])
      expect(parseGuest(bad)).toBeNull();
    for (const bad of [
      null,
      { v: 1, k: "welcome", seed: "1" },
      { v: 1, k: "snap" },
      {
        v: 1,
        k: "snap",
        total: 1,
        stumps: [],
        berries: [[1]],
        fires: [],
        animals: [],
        players: [],
      },
      {
        v: 1,
        k: "snap",
        total: 1,
        stumps: [],
        berries: "4",
        fires: [],
        animals: [[99, 1, 1]],
        players: [],
      },
      {
        v: 1,
        k: "snap",
        total: 1,
        stumps: [],
        berries: "4",
        fires: [],
        animals: [],
        players: [{ id: 1 }],
      },
    ])
      expect(parseHost(bad)).toBeNull();
  });

  it("Schnappschuss hin und zurück; eigene Position bleibt lokal", () => {
    const w = generateWorld(5);
    const host = createState(w);
    addPlayer(w, host, "me", "Mia", "#e74c3c");
    const g = addPlayer(w, host, "g1", "Ben", "#3498db");
    g.wood = 7;
    g.radio = true;
    // Baum, Strauch und Feuer in der Nähe des Gastes
    const near = (o: { x: number; y: number }) => Math.hypot(o.x - g.x, o.y - g.y) < 20;
    const tree = w.trees.findIndex(near);
    const bush = w.bushes.findIndex(near);
    host.stumps[tree] = 999;
    host.berries[bush] = 1;
    host.fires.push({ id: 1, x: Math.floor(g.x) + 2, y: Math.floor(g.y), until: 200 });
    const far = w.trees.findIndex((t) => Math.hypot(t.x - g.x, t.y - g.y) > 60);
    host.bridges[1234] = 1;
    host.stumps[far] = 999;
    const snap = parseHost(JSON.parse(JSON.stringify(toSnap(w, host, [g]))));
    expect(snap?.k).toBe("snap");
    const guest = createState(w);
    applySnap(guest, snap as never, "g1", true);
    expect(Object.keys(guest.players).sort()).toEqual(["g1", "me"]);
    expect(guest.players.g1!.wood).toBe(7);
    expect(guest.players.g1!.radio).toBe(true);
    expect(guest.stumps[tree]).toBeDefined();
    expect(guest.stumps[far]).toBeUndefined();
    expect(guest.berries[bush]).toBe(1);
    expect(guest.fires).toHaveLength(1);
    expect(guest.bridges[1234]).toBe(1);
    // nur Tiere in der Nähe des Gastes
    expect(guest.animals.length).toBeLessThan(host.animals.length);
    for (const a of guest.animals) expect(Math.abs(a.x - g.x)).toBeLessThanOrEqual(30);
    guest.players.g1!.x = 50.25;
    applySnap(guest, snap as never, "g1", false);
    expect(guest.players.g1!.x).toBe(50.25);
    expect(guest.players.me!.x).toBe(host.players.me!.x);
    // auch mit 5 Gästen an verschiedenen Orten unter 16 KB
    const focus = [g, ...[1, 2, 3, 4].map((k) => addPlayer(w, host, `g${k + 1}`, "X", "#3498db"))];
    expect(JSON.stringify(toSnap(w, host, focus)).length).toBeLessThan(16 * 1024);
  });
});
