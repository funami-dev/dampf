import { describe, expect, it } from "vitest";
import {
  BODIES,
  G_EARTH,
  PLAYABLE,
  bodyById,
  compareText,
  fallInOneSecond,
  fallText,
} from "./bodies.ts";
import {
  LANDER,
  STEP,
  judge,
  mass,
  startLander,
  stars,
  step,
  terminalVelocity,
  touching,
  type Lander,
} from "./physics.ts";
import { KEY, fresh, loadProgress, record, saveProgress, type Store } from "./progress.ts";
import { PAD, WIDTH, groundAt, makeTerrain } from "./terrain.ts";

const none = { thrust: false, left: false, right: false };
const run = (l: Lander, c = none, id = "mond", secs = 1) => {
  const b = bodyById(id)!;
  for (let i = 0; i < Math.round(secs / STEP); i++) step(l, c, b, STEP, WIDTH);
};
const at = (over: Partial<Lander> = {}): Lander => ({
  x: 300,
  y: 1000,
  vx: 0,
  vy: 0,
  angle: 0,
  omega: 0,
  fuel: LANDER.fuel,
  t: 0,
  ...over,
});

describe("PL-AK-01: Orte", () => {
  it("echte g-Werte und Luftdichten", () => {
    const want: Record<string, [number, number, boolean]> = {
      mond: [1.62, 0, true],
      ceres: [0.28, 0, true],
      pluto: [0.62, 0, true],
      titan: [1.35, 5.3, true],
      merkur: [3.7, 0, true],
      mars: [3.71, 0.02, true],
      venus: [8.87, 65, true],
      erde: [9.81, 1.225, true],
      jupiter: [24.79, 0, false],
      saturn: [10.44, 0, false],
      uranus: [8.69, 0, false],
      neptun: [11.15, 0, false],
    };
    expect(BODIES.map((b) => b.id)).toEqual(Object.keys(want));
    for (const b of BODIES) expect([b.g, b.rho, b.playable], b.id).toEqual(want[b.id]);
    expect(PLAYABLE.map((b) => b.id)).toEqual([
      "mond",
      "ceres",
      "pluto",
      "titan",
      "merkur",
      "mars",
      "venus",
      "erde",
    ]);
    for (const b of BODIES.filter((x) => !x.playable)) expect(b.fact).toMatch(/Boden/);
  });
});

describe("PL-AK-02: freier Fall ohne Luft", () => {
  for (const b of BODIES.filter((x) => x.rho === 0))
    it(`${b.name}: nach 1 s ½ g tief und v = g`, () => {
      const l = at();
      run(l, none, b.id, 1);
      expect(1000 - l.y).toBeCloseTo(0.5 * b.g, 1);
      expect(Math.abs(1000 - l.y - 0.5 * b.g)).toBeLessThan(0.01 * b.g);
      expect(-l.vy).toBeCloseTo(b.g, 2);
    });
});

describe("PL-AK-03: Hauptdüse", () => {
  it("Beschleunigung = 30 kN / Masse − g, Treibstoff 10 kg/s, leer → kein Schub", () => {
    const l = at();
    const m = mass(l);
    const g = bodyById("mond")!.g;
    run(l, { ...none, thrust: true }, "mond", 0.1);
    const a = l.vy / 0.1;
    // Masse sinkt in 0,1 s nur um 1 kg → ±1 %
    expect(Math.abs(a - (LANDER.thrust / m - g))).toBeLessThan(0.01 * (LANDER.thrust / m - g));
    expect(l.fuel).toBeCloseTo(LANDER.fuel - 1, 5);
    const e = at({ fuel: 0 });
    run(e, { ...none, thrust: true }, "mond", 1);
    expect(-e.vy).toBeCloseTo(g, 2);
    expect(e.fuel).toBe(0);
  });

  it("auf der Erde schafft die volle Fähre mehr als ihr Gewicht", () => {
    expect(LANDER.thrust / (LANDER.dry + LANDER.fuel)).toBeGreaterThan(G_EARTH);
  });

  it("Drehen: Seitendüsen kippen die Fähre, ohne Eingabe stoppt die Drehung", () => {
    const l = at();
    run(l, { ...none, right: true }, "mond", 0.5);
    expect(l.angle).toBeGreaterThan(0.2);
    const a = l.angle;
    run(l, none, "mond", 1);
    expect(l.omega).toBe(0);
    expect(l.angle).toBeGreaterThan(a);
    expect(l.fuel).toBeLessThan(LANDER.fuel);
  });
});

describe("PL-AK-04: Luftwiderstand", () => {
  for (const id of ["venus", "titan", "erde"]) {
    it(`${id}: Endgeschwindigkeit √(2mg/(ρ c_w A))`, () => {
      const b = bodyById(id)!;
      const l = at({ y: 100_000, fuel: 0 });
      run(l, none, id, 120);
      const vt = terminalVelocity(b, LANDER.dry);
      expect(Math.abs(-l.vy - vt) / vt).toBeLessThan(0.02);
    });
  }
  it("Venus voll betankt ≈ 7 m/s, Erde ≈ 52 m/s, Mars kaum Bremsung", () => {
    const m = LANDER.dry + LANDER.fuel;
    expect(terminalVelocity(bodyById("venus")!, m)).toBeCloseTo(6.9, 0);
    expect(terminalVelocity(bodyById("erde")!, m)).toBeCloseTo(52.9, 0);
    expect(terminalVelocity(bodyById("mars")!, m)).toBeGreaterThan(250);
    expect(terminalVelocity(bodyById("mond")!, m)).toBe(Infinity);
  });
});

describe("PL-AK-05: Landung", () => {
  const t = makeTerrain("mond", true);
  const onPad = (o: Partial<Lander>) => at({ x: t.pad.center, y: t.pad.y, ...o });
  it("gelandet genau innerhalb der Grenzen", () => {
    expect(judge(onPad({ vy: -2, vx: 1, angle: (10 * Math.PI) / 180 }), t).landed).toBe(true);
    expect(judge(onPad({ vy: -2.01 }), t).reason).toBe("hart");
    expect(judge(onPad({ vx: -1.01 }), t).reason).toBe("seitlich");
    expect(judge(onPad({ angle: (-10.5 * Math.PI) / 180 }), t).reason).toBe("schief");
    expect(judge(onPad({ x: t.pad.x0 + 1 }), t).reason).toBe("neben");
    expect(judge(onPad({ x: t.pad.center - 100, vy: -0.1 }), t).reason).toBe("neben");
  });
  it("Plattform ist flach, Start 300 m darüber und 150 m daneben", () => {
    expect(groundAt(t, t.pad.x0)).toBe(t.pad.y);
    expect(groundAt(t, t.pad.x1)).toBe(t.pad.y);
    expect(t.pad.x1 - t.pad.x0).toBe(PAD.width);
    const l = startLander(t);
    expect(t.pad.center - l.x).toBe(150);
    expect(l.y - groundAt(t, l.x)).toBe(300);
    expect(touching(l, t)).toBe(false);
    expect(touching({ ...l, y: groundAt(t, l.x) - 0.01 }, t)).toBe(true);
  });
  it("Höhenprofil ist je Ort immer gleich", () => {
    expect(makeTerrain("mars", false)).toEqual(makeTerrain("mars", false));
    expect(makeTerrain("mars", false).heights).not.toEqual(makeTerrain("erde", false).heights);
  });
});

describe("PL-AK-06: Sterne und Fortschritt", () => {
  const t = makeTerrain("mond", true);
  const v = (vy: number) => judge(at({ x: t.pad.center, y: t.pad.y, vy }), t);
  it("Sterne", () => {
    expect(stars(v(-3), 600)).toBe(0);
    expect(stars(v(-1.5), 600)).toBe(1);
    expect(stars(v(-0.9), 100)).toBe(2);
    expect(stars(v(-0.9), 180)).toBe(3);
  });
  it("Bestwerte, Neuladen und kaputte Daten (alle Orte sind ohnehin frei)", () => {
    const data = new Map<string, string>();
    const s: Store = { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
    expect(loadProgress(s)).toEqual(fresh());
    let p = record(fresh(), "mond", 2);
    expect(p).toEqual({ best: { mond: 2 } });
    p = record(p, "mond", 1);
    expect(p.best.mond).toBe(2);
    p = record(p, "mond", 0);
    expect(p.best.mond).toBe(2);
    saveProgress(s, p);
    expect(loadProgress(s)).toEqual(p);
    p = record(p, "erde", 3);
    expect(p.best).toEqual({ mond: 2, erde: 3 });
    for (const bad of ["{", "null", '{"v":2}', '{"v":1,"best":"x"}'])
      expect(loadProgress({ get: () => bad, set: () => {} }), bad).toEqual(fresh());
    expect(
      loadProgress({ get: () => '{"v":1,"unlocked":99,"best":{"mond":7,"ceres":3}}', set() {} }),
    ).toEqual({ best: { ceres: 3 } });
    expect(KEY).toBe("dampf.planetenlander.v1");
  });
});

describe("PL-AK-07: Lern-Karte", () => {
  it("Fallstrecke in 1 s und Vergleich mit der Erde", () => {
    expect(fallInOneSecond(9.81)).toBe(4.9);
    expect(fallInOneSecond(1.62)).toBe(0.8);
    expect(fallText(3.71)).toBe(
      "Ein Ball fällt hier in 1 Sekunde 1,9 m tief (auf der Erde 4,9 m).",
    );
    expect(compareText(1.62)).toBe("Die Schwerkraft ist hier 6-mal schwächer als auf der Erde.");
    expect(compareText(3.71)).toBe("Die Schwerkraft ist hier 2,6-mal schwächer als auf der Erde.");
    expect(compareText(0.28)).toBe("Die Schwerkraft ist hier 35-mal schwächer als auf der Erde.");
    expect(compareText(8.87)).toBe(
      "Die Schwerkraft ist hier fast so stark wie auf der Erde (90 %).",
    );
    expect(compareText(9.81)).toBe("Das ist genau die Schwerkraft der Erde – wie zu Hause.");
    expect(compareText(24.79)).toBe("Die Schwerkraft ist hier 2,5-mal stärker als auf der Erde.");
    expect(compareText(11.15)).toBe(
      "Die Schwerkraft ist hier etwas stärker als auf der Erde (114 %).",
    );
  });
});

describe("PL-AK-13: Ergebnis mit Grenzen", () => {
  it("Wert, Grenze, Überschreitung", async () => {
    const { margins, SAFE } = await import("./physics.ts");
    const m = margins({ down: 3.4, side: 0.5, tilt: (15 * Math.PI) / 180 });
    const by = Object.fromEntries(m.map((r) => [r.key, r]));
    expect(by.down!.limit).toBe(SAFE.down);
    expect(by.down!.over).toBeCloseTo(1.4);
    expect(by.down!.word).toBe("zu schnell");
    expect(by.side!.over).toBe(0);
    expect(by.tilt!.limit).toBeCloseTo(10);
    expect(by.tilt!.over).toBeCloseTo(5);
    expect(by.tilt!.word).toBe("zu schief");
  });
});
