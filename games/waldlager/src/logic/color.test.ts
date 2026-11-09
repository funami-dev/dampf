import { describe, expect, it } from "vitest";
import { applySnap, parseGuest, parseHost, toSnap } from "./protocol.ts";
import { KEY, load, save, type Store } from "./save.ts";
import { COLORS, addPlayer, createState, isColor } from "./sim.ts";
import { generateWorld } from "./world.ts";

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe("WL-AK-31: Eigene Farbe", () => {
  it("nur #rrggbb ist gültig", () => {
    for (const c of [...COLORS, "#00ff7f", "#123abc"]) expect(isColor(c)).toBe(true);
    for (const c of ["red", "#fff", "#12345g", "#1234567", "url(x)", "#00FF7F", "", 3])
      expect(isColor(c)).toBe(false);
  });

  it("Gäste mit eigener Farbe werden angenommen, ungültige abgewiesen", () => {
    expect(parseGuest({ v: 1, k: "hello", name: "Ben", color: "#00ff7f" })).toEqual({
      v: 1,
      k: "hello",
      name: "Ben",
      color: "#00ff7f",
    });
    for (const color of ["red", "#fff", "url(x)", '#000000"><b>'])
      expect(parseGuest({ v: 1, k: "hello", name: "Ben", color })).toBeNull();
  });

  it("Snapshots: eigene Farbe kommt an, ungültige Farbe wird abgewiesen", () => {
    const w = generateWorld(5);
    const s = createState(w);
    addPlayer(w, s, "host", "Lea", "#00ff7f");
    const snap = JSON.parse(JSON.stringify(toSnap(w, s, [s.players.host!])));
    const ok = parseHost(snap);
    expect(ok).not.toBeNull();
    const s2 = createState(w);
    applySnap(s2, ok as never, "gast", true);
    expect(s2.players.host!.color).toBe("#00ff7f");
    snap.players[0].color = "red";
    expect(parseHost(snap)).toBeNull();
  });

  it("Spielstand mit eigener Farbe lädt sie, ungültige Farbe → erste Jacken-Farbe", () => {
    const w = generateWorld(9);
    const s = createState(w);
    addPlayer(w, s, "me", "Lea", "#00ff7f");
    const store = memory();
    save(store, 9, s, "me");
    expect(load(store)!.state.players.me!.color).toBe("#00ff7f");
    const raw = JSON.parse(store.data.get(KEY)!);
    const fix = (o: unknown): void => {
      if (o && typeof o === "object")
        for (const [k, v] of Object.entries(o)) {
          if (k === "color" && v === "#00ff7f") (o as Record<string, unknown>)[k] = "url(x)";
          else fix(v);
        }
    };
    fix(raw);
    store.data.set(KEY, JSON.stringify(raw));
    expect(load(store)!.state.players.me!.color).toBe(COLORS[0]);
  });
});
