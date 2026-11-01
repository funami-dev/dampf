import { describe, expect, it } from "vitest";
import { GRID_SIZE, createGame, speedFor, step, turn, type Cell, type GameState } from "./snake.ts";

const on = (cells: Cell[], c: Cell) => cells.some((s) => s.x === c.x && s.y === c.y);

/** Zustand mit fester Schlange (Kopf zuerst) und Futter weit weg. */
function state(snake: Cell[], over: Partial<GameState> = {}): GameState {
  return { ...createGame(1), snake, food: { x: 0, y: GRID_SIZE - 1 }, queue: [], ...over };
}

describe("Snake-Logik", () => {
  it("SNAKE-AK-01: neuer Zustand", () => {
    for (let seed = 0; seed < 50; seed++) {
      const g = createGame(seed);
      expect(g.snake).toHaveLength(3);
      expect(g.dir).toBe("right");
      expect(g.alive).toBe(true);
      expect(g.score).toBe(0);
      expect(on(g.snake, g.food!)).toBe(false);
    }
  });

  it("ist deterministisch für denselben Seed", () => {
    expect(createGame(42)).toEqual(createGame(42));
  });

  it("SNAKE-AK-02: step bewegt genau eine Zelle in Laufrichtung", () => {
    const g = state([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
    const n = step(g);
    expect(n.snake).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(g.snake[0]).toEqual({ x: 5, y: 5 }); // unveränderlich
  });

  it("SNAKE-AK-03: Futter fressen", () => {
    const g = state(
      [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ],
      { food: { x: 6, y: 5 } },
    );
    const n = step(g);
    expect(n.snake).toHaveLength(4);
    expect(n.score).toBe(1);
    expect(n.snake[0]).toEqual({ x: 6, y: 5 });
    expect(n.food).not.toBeNull();
    expect(on(n.snake, n.food!)).toBe(false);
  });

  it.each([
    ["right", { x: GRID_SIZE - 1, y: 4 }, { x: 0, y: 4 }],
    ["left", { x: 0, y: 4 }, { x: GRID_SIZE - 1, y: 4 }],
    ["up", { x: 4, y: 0 }, { x: 4, y: GRID_SIZE - 1 }],
    ["down", { x: 4, y: GRID_SIZE - 1 }, { x: 4, y: 0 }],
  ] as const)("SNAKE-AK-04: Wrap-around nach %s", (dir, head, expected) => {
    const n = step(state([head], { dir }));
    expect(n.alive).toBe(true);
    expect(n.snake[0]).toEqual(expected);
  });

  it("SNAKE-AK-05: Selbst-Kollision beendet das Spiel", () => {
    // Kopf bei (5,5) läuft nach unten in (5,6), das zum Körper gehört.
    const g = state(
      [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
        { x: 4, y: 6 },
      ],
      { dir: "down" },
    );
    const n = step(g);
    expect(n.alive).toBe(false);
    expect(step(n)).toBe(n); // nach Game Over passiert nichts mehr
  });

  it("SNAKE-AK-05: in die frei werdende Schwanzzelle laufen ist erlaubt", () => {
    const g = state(
      [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
      ],
      { dir: "down" },
    );
    expect(step(g).alive).toBe(true);
  });

  it("SNAKE-AK-05: …außer die Schlange wächst gerade", () => {
    const g = state(
      [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
      ],
      { dir: "down", food: { x: 5, y: 6 } },
    );
    expect(step(g).alive).toBe(false);
  });

  it("SNAKE-AK-06: 180°-Umkehr wird ignoriert", () => {
    const g = state([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    const n = step(turn(g, "left"));
    expect(n.dir).toBe("right");
    expect(n.alive).toBe(true);
  });

  it("SNAKE-AK-06: zwei schnelle Eingaben werden nacheinander ausgeführt", () => {
    let g = state([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
    g = turn(turn(g, "up"), "left");
    g = step(g);
    expect(g.snake[0]).toEqual({ x: 5, y: 4 });
    g = step(g);
    expect(g.snake[0]).toEqual({ x: 4, y: 4 });
    expect(g.alive).toBe(true);
  });

  it("SNAKE-AK-06: Puffer fasst höchstens 2 Eingaben", () => {
    const g = turn(turn(turn(state([{ x: 5, y: 5 }]), "up"), "left"), "down");
    expect(g.queue).toEqual(["up", "left"]);
  });

  it("SNAKE-AK-07: Tempo steigt alle 5 Punkte um 1 bis max. 15", () => {
    expect(speedFor(0)).toBe(8);
    expect(speedFor(4)).toBe(8);
    expect(speedFor(5)).toBe(9);
    expect(speedFor(34)).toBe(14);
    expect(speedFor(35)).toBe(15);
    expect(speedFor(500)).toBe(15);
  });
});
