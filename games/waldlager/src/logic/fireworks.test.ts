import { describe, expect, it } from "vitest";
import { DAY } from "./daytime.ts";
import { FIREWORK, STYLES, particlesFor } from "./fireworks.ts";
import { applySnap, parseHost, toSnap, type Snap } from "./protocol.ts";
import { load, save, type Store } from "./save.ts";
import {
  ROCKET_DAY,
  addPlayer,
  chestCount,
  createState,
  free,
  launchRocket,
  rocketMove,
  stepWorld,
  type Player,
  type State,
} from "./sim.ts";
import { generateWorld, type World } from "./world.ts";

const world = generateWorld(21);
function setup() {
  const w = world;
  const s = createState(w);
  const p = addPlayer(w, s, "me", "Lea", "#3498db");
  p.landing = 0;
  return { w, s, p };
}
function atHut(w: World, s: State, p: Player) {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const)
    if (free(w, s, w.hut.x + dx, w.hut.y + dy)) {
      p.x = w.hut.x + dx + 0.5;
      p.y = w.hut.y + dy + 0.5;
      return;
    }
  throw new Error("kein freies Feld an der Hütte");
}
const night = (s: State) => (s.total = Math.floor(s.total / DAY) * DAY + DAY + 450);
const memory = (): Store => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe("WL-AK-65: Feuerwerkskiste", () => {
  it("99 Raketen, nehmen nur an der Hütte, einzeln und zu fünft, bis 10", () => {
    const { w, s, p } = setup();
    expect(s.hutRockets).toBe(99);
    p.x = w.hut.x + 20;
    expect(rocketMove(w, s, p, "take")).toMatch(/Hütte/);
    expect(p.rockets).toBe(0);
    atHut(w, s, p);
    rocketMove(w, s, p, "take");
    expect([p.rockets, s.hutRockets]).toEqual([1, 98]);
    rocketMove(w, s, p, "take", 5);
    rocketMove(w, s, p, "take", 5);
    expect([p.rockets, s.hutRockets]).toEqual([10, 89]);
    expect(rocketMove(w, s, p, "take")).toMatch(/Taschen/);
    rocketMove(w, s, p, "put");
    expect([p.rockets, s.hutRockets]).toEqual([9, 90]);
    expect(chestCount(s.hutChest)).toBe(2);
  });

  it("leer bleibt leer, auch nach Tagen", () => {
    const { w, s, p } = setup();
    atHut(w, s, p);
    s.hutRockets = 1;
    rocketMove(w, s, p, "take", 5);
    expect([p.rockets, s.hutRockets]).toEqual([1, 0]);
    for (let t = 0; t < 3 * DAY; t += 1) stepWorld(w, s, 1);
    expect(s.hutRockets).toBe(0);
    atHut(w, s, p);
    expect(rocketMove(w, s, p, "take")).toMatch(/leer/);
  });

  it("Speichern/Laden und Schnappschuss; ungültige Werte → 0", () => {
    const { w, s, p } = setup();
    atHut(w, s, p);
    rocketMove(w, s, p, "take", 5);
    const store = memory();
    save(store, 21, s, "me");
    const r = load(store)!;
    expect([r.state.hutRockets, r.state.players.me!.rockets]).toEqual([94, 5]);
    const raw = JSON.parse(store.get("dampf.waldlager.v1")!);
    raw.state.hutRockets = "viele";
    raw.state.players.me.rockets = -3;
    store.set("dampf.waldlager.v1", JSON.stringify(raw));
    const bad = load(store)!;
    expect([bad.state.hutRockets, bad.state.players.me!.rockets]).toEqual([0, 0]);
    night(s);
    launchRocket(w, s, p);
    const snap = parseHost(JSON.parse(JSON.stringify(toSnap(w, s, [{ x: p.x, y: p.y }])))) as Snap;
    expect(snap).not.toBeNull();
    const guest = createState(w);
    applySnap(guest, snap, "gast", true);
    expect(guest.hutRockets).toBe(94);
    expect(guest.players.me!.rockets).toBe(4);
    expect(guest.fireworks).toHaveLength(1);
    expect(parseHost({ ...snap, fireworks: [{ ...snap.fireworks![0]!, style: "bombe" }] })).toBe(
      null,
    );
  });
});

describe("WL-AK-66: Zünden", () => {
  it("tagsüber abgelehnt, nachts klappt es, Wartezeit und höchstens 6", () => {
    const { w, s, p } = setup();
    p.rockets = 10;
    s.total = Math.floor(s.total / DAY) * DAY + DAY + 100; // Tag
    expect(launchRocket(w, s, p).text).toBe(ROCKET_DAY);
    s.total = Math.floor(s.total / DAY) * DAY + 10; // Morgen
    expect(launchRocket(w, s, p).text).toBe(ROCKET_DAY);
    expect(p.rockets).toBe(10);
    s.total = Math.floor(s.total / DAY) * DAY + 380; // Dämmerung
    const r = launchRocket(w, s, p);
    expect(r.firework).toBeDefined();
    expect(STYLES).toContain(r.firework!.style);
    expect(p.rockets).toBe(9);
    expect(launchRocket(w, s, p).firework).toBeUndefined();
    for (let k = 0; k < 7; k++) {
      s.total += FIREWORK.cooldown;
      launchRocket(w, s, p);
    }
    expect(s.fireworks.length).toBeLessThanOrEqual(FIREWORK.max);
    expect(p.rockets).toBe(2);
    // nach dem Verblassen verschwinden sie
    for (let t = 0; t < FIREWORK.rise + FIREWORK.burst + 1; t += 0.5) stepWorld(w, s, 0.5);
    expect(s.fireworks).toHaveLength(0);
  });

  it("schlafend, landend oder ohne Rakete passiert nichts", () => {
    const { w, s, p } = setup();
    night(s);
    expect(launchRocket(w, s, p)).toEqual({ text: null });
    p.rockets = 3;
    p.sleeping = true;
    expect(launchRocket(w, s, p).firework).toBeUndefined();
    p.sleeping = false;
    p.landing = 1;
    expect(launchRocket(w, s, p).firework).toBeUndefined();
    expect(p.rockets).toBe(3);
  });

  it("alle 8 Stile kommen vor", () => {
    const { w, s, p } = setup();
    const seen = new Set<string>();
    for (let k = 0; k < 200; k++) {
      night(s);
      p.rockets = 1;
      p.lastRocket = undefined;
      seen.add(launchRocket(w, s, p).firework!.style);
    }
    expect(seen.size).toBe(8);
  });

  for (const style of STYLES)
    it(`Stil ${style}: 60–140 Partikel, gleicher Seed → gleiches Bild`, () => {
      const a = particlesFor(style, 7);
      expect(a.length).toBeGreaterThanOrEqual(60);
      expect(a.length).toBeLessThanOrEqual(140);
      expect(particlesFor(style, 7)).toEqual(a);
      for (const q of a) expect(Math.hypot(q.dx, q.dy)).toBeLessThanOrEqual(1.2);
    });

  it("Formen: Stern hat 5 Spitzen, Vogel ist symmetrisch, Ring ist rund", () => {
    const star = particlesFor("stern", 3).filter((q) => Math.hypot(q.dx, q.dy) > 0.93);
    const sectors = new Set(
      star.map(
        (q) => Math.round(((Math.atan2(q.dy, q.dx) + Math.PI / 2) / (Math.PI * 2)) * 5 + 5) % 5,
      ),
    );
    expect(sectors.size).toBe(5);
    const bird = particlesFor("vogel", 3);
    for (const q of bird)
      expect(bird.some((o) => Math.abs(o.dx + q.dx) < 1e-9 && Math.abs(o.dy - q.dy) < 1e-9)).toBe(
        true,
      );
    const ring = particlesFor("ring", 3).map((q) => Math.hypot(q.dx, q.dy));
    expect(Math.max(...ring) - Math.min(...ring)).toBeLessThan(0.1);
    // Formen sind verschieden
    const sig = (st: (typeof STYLES)[number]) =>
      JSON.stringify(
        particlesFor(st, 3)
          .slice(0, 5)
          .map((q) => [q.dx.toFixed(2), q.dy.toFixed(2)]),
      );
    expect(new Set(STYLES.map(sig)).size).toBe(8);
  });
});
