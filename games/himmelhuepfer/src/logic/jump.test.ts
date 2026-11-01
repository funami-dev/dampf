import { describe, expect, it } from "vitest";
import {
  GRAVITY,
  JUMP_SPEED,
  MAX_GAP,
  MOVE_SPEED,
  UNITS_PER_METER,
  WIDTH,
  createGame,
  difficulty,
  step,
  type GameState,
  type Input,
} from "./jump.ts";

const DT = 1 / 120;
const NONE: Input = { left: false, right: false };

function run(state: GameState, seconds: number, input: Input = NONE): GameState {
  let s = state;
  for (let t = 0; t < seconds; t += DT) s = step(s, input, DT);
  return s;
}

/** Zustand mit genau einer Plattform unter der Figur, ohne Sterne. */
function only(state: GameState, platforms: GameState["platforms"]): GameState {
  return { ...state, platforms, stars: [], nextPlatformY: Number.POSITIVE_INFINITY };
}

describe("Himmelhüpfer-Logik", () => {
  it("HH-AK-01: neues Spiel steht auf der Startplattform und springt sofort ab", () => {
    const g = createGame(1);
    const start = g.platforms[0]!;
    expect(g.player.y).toBe(start.y);
    expect(Math.abs(g.player.x - start.x)).toBeLessThan(start.w / 2);
    expect(g.heightMeters).toBe(0);
    expect(g.stars).not.toContainEqual(expect.objectContaining({ collected: true }));
    expect(g.starCount).toBe(0);
    const n = step(g, NONE, DT);
    expect(n.player.vy).toBe(JUMP_SPEED);
    expect(n.jumps).toBe(1);
  });

  it("ist deterministisch für denselben Seed", () => {
    expect(run(createGame(7), 3)).toEqual(run(createGame(7), 3));
  });

  it("HH-AK-02: fallend landen löst Sprung aus, steigend geht man durch", () => {
    const base = createGame(1);
    // steigend durch eine Plattform knapp über dem Kopf
    let g = only({ ...base, player: { ...base.player, y: 100, vy: 600 } }, [
      { id: 1, x: base.player.x, y: 110, w: 100 },
    ]);
    g = step(g, NONE, DT);
    expect(g.player.y).toBeGreaterThan(100);
    expect(g.player.vy).toBeLessThan(600);
    expect(g.jumps).toBe(base.jumps);

    // fallend auf eine Plattform
    g = only({ ...base, player: { ...base.player, y: 101, vy: -300 } }, [
      { id: 1, x: base.player.x, y: 100, w: 100 },
    ]);
    g = step(g, NONE, DT);
    expect(g.player.y).toBe(100);
    expect(g.player.vy).toBe(JUMP_SPEED);

    // fallend neben der Plattform: kein Sprung
    g = only({ ...base, player: { ...base.player, x: 50, y: 101, vy: -300 } }, [
      { id: 1, x: 300, y: 100, w: 60 },
    ]);
    g = step(g, NONE, DT);
    expect(g.player.vy).toBeLessThan(0);
  });

  it("Sprunghöhe entspricht v²/2g (270 WE)", () => {
    expect((JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY)).toBe(270);
    expect(MAX_GAP).toBeLessThan(270);
    const g = only(createGame(1), [{ id: 1, x: 200, y: 0, w: 400 }]);
    let s = step(g, NONE, DT);
    let top = 0;
    for (let i = 0; i < 120; i++) {
      s = step(s, NONE, DT);
      top = Math.max(top, s.player.y);
    }
    expect(top).toBeGreaterThan(260);
    expect(top).toBeLessThan(275);
  });

  it("HH-AK-03: Lenken mit 300 WE/s, beide Richtungen = keine Bewegung", () => {
    const g = only(createGame(1), []);
    const x0 = g.player.x;
    expect(step(g, { left: false, right: true }, 0.1).player.x).toBeCloseTo(x0 + MOVE_SPEED * 0.1);
    expect(step(g, { left: true, right: false }, 0.1).player.x).toBeCloseTo(x0 - MOVE_SPEED * 0.1);
    expect(step(g, { left: true, right: true }, 0.1).player.x).toBe(x0);
  });

  it("Figur schaut in Laufrichtung", () => {
    const g = only(createGame(1), []);
    expect(step(g, { left: true, right: false }, DT).player.facing).toBe("left");
    expect(step(g, { left: false, right: true }, DT).player.facing).toBe("right");
  });

  it("HH-AK-04: seitlicher Wrap-around in beide Richtungen", () => {
    const g = only(createGame(1), []);
    const right = step(
      { ...g, player: { ...g.player, x: WIDTH - 1 } },
      { left: false, right: true },
      0.1,
    );
    expect(right.player.x).toBeCloseTo(29);
    const left = step({ ...g, player: { ...g.player, x: 1 } }, { left: true, right: false }, 0.1);
    expect(left.player.x).toBeCloseTo(WIDTH - 29);
  });

  it("HH-AK-05: Kamera bewegt sich nur nach oben", () => {
    let s = createGame(3);
    let last = s.cameraY;
    for (let i = 0; i < 2000; i++) {
      s = step(s, NONE, DT);
      expect(s.cameraY).toBeGreaterThanOrEqual(last);
      last = s.cameraY;
      if (!s.alive) break;
    }
  });

  it("HH-AK-06: alle Plattformabstände sind erreichbar (100 Seeds, 200 m)", () => {
    for (let seed = 0; seed < 100; seed++) {
      let s = createGame(seed);
      const ys = new Set<number>(s.platforms.map((p) => p.y));
      // Kamera künstlich hochschieben, damit Plattformen bis 200 m erzeugt werden.
      while (s.nextPlatformY < 200 * UNITS_PER_METER) {
        s = step(
          { ...s, cameraY: s.cameraY + 300, player: { ...s.player, y: s.cameraY + 600, vy: 0 } },
          NONE,
          DT,
        );
        s.platforms.forEach((p) => ys.add(p.y));
      }
      const sorted = [...ys].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]! - sorted[i - 1]!).toBeLessThanOrEqual(MAX_GAP);
      }
    }
  });

  it("HH-AK-07: Abstände und Breiten wachsen mit der Höhe", () => {
    expect(difficulty(0)).toEqual({ gapMin: 60, gapMax: 110, width: 90 });
    expect(difficulty(50 * UNITS_PER_METER)).toEqual({ gapMin: 140, gapMax: 200, width: 60 });
    expect(difficulty(500 * UNITS_PER_METER)).toEqual({ gapMin: 140, gapMax: 200, width: 60 });
    const mid = difficulty(25 * UNITS_PER_METER);
    expect(mid.gapMin).toBe(100);
    expect(mid.width).toBe(75);
  });

  it("HH-AK-08: Stern berühren zählt +1 und entfernt ihn", () => {
    const g = createGame(1);
    const s = {
      ...only(g, [{ id: 1, x: 200, y: -500, w: 10 }]),
      player: { ...g.player, x: 200, y: 100, vy: 0 },
      stars: [{ id: 9, x: 200, y: 130 }],
    };
    const n = step(s, NONE, DT);
    expect(n.starCount).toBe(1);
    expect(n.stars).toHaveLength(0);
  });

  it("Sterne schweben über Plattformen, nicht über der Startplattform", () => {
    let total = 0;
    for (let seed = 0; seed < 50; seed++) {
      const g = createGame(seed);
      expect(g.stars.some((st) => Math.abs(st.y - g.platforms[0]!.y) < 100)).toBe(false);
      total += g.stars.length;
    }
    expect(total).toBeGreaterThan(0);
  });

  it("HH-AK-09: unter den Sichtbereich fallen = Game Over, Höhe = höchster Punkt", () => {
    const g = createGame(1);
    let s = only({ ...g, player: { ...g.player, y: 950, vy: 0 }, maxY: 950 }, []);
    s = { ...s, heightMeters: 9 };
    s = run(s, 3);
    expect(s.alive).toBe(false);
    expect(s.heightMeters).toBe(9);
    expect(step(s, NONE, DT)).toBe(s);
  });

  it("Höhe wird in ganzen Metern gezählt (100 WE = 1 m)", () => {
    const g = only(createGame(1), []);
    const s = step({ ...g, player: { ...g.player, y: 349, vy: 0 } }, NONE, DT);
    expect(s.heightMeters).toBe(3);
  });

  it("Plattformen unterhalb des Sichtbereichs werden entfernt", () => {
    let s = createGame(5);
    s = step({ ...s, cameraY: 5000, player: { ...s.player, y: 5600, vy: 0 } }, NONE, DT);
    expect(s.platforms.every((p) => p.y > s.cameraY - 200)).toBe(true);
  });
});
