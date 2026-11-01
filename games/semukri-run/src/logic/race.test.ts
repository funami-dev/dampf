import { describe, expect, it } from "vitest";
import {
  BOOST,
  COUNTDOWN,
  DISTANCE,
  DRAG,
  MAX_SPEED,
  SAMPLE_INTERVAL,
  TIME_LIMIT,
  createRace,
  formatTime,
  press,
  step,
  type RaceState,
} from "./race.ts";

const DT = 1 / 240;

/** Tippt `seconds` lang `rate`-mal pro Sekunde abwechselnd. */
function tapFor(state: RaceState, seconds: number, rate: number): RaceState {
  let r = state;
  let side: "left" | "right" = r.lastSide === "left" ? "right" : "left";
  let nextTap = 0;
  for (let t = 0; t < seconds && r.phase === "running"; t += DT) {
    if (t >= nextTap) {
      r = press(r, side);
      side = side === "left" ? "right" : "left";
      nextTap += 1 / rate;
    }
    r = step(r, DT);
  }
  return r;
}

function running(over: Partial<RaceState> = {}): RaceState {
  return { ...step(createRace(), COUNTDOWN + DT / 2), ...over };
}

describe("Rennen", () => {
  it("startet im Countdown", () => {
    const r = createRace();
    expect(r.phase).toBe("countdown");
    expect(r.countdown).toBe(COUNTDOWN);
    expect(r.pos).toBe(0);
  });

  it("SR-AK-04: Eingaben vor „Los!“ werden ignoriert, Zeit startet bei „Los!“", () => {
    let r = createRace();
    r = press(r, "left");
    r = press(press(r, "right"), "left");
    expect(r.speed).toBe(0);
    r = step(r, COUNTDOWN - 0.1);
    expect(r.phase).toBe("countdown");
    expect(r.t).toBe(0);
    r = step(r, 0.1);
    expect(r.phase).toBe("running");
    expect(r.t).toBe(0);
    expect(r.lastSide).toBeNull();
  });

  it("SR-AK-01: Seitenwechsel +1 m/s, gleiche Seite wirkungslos, max. 12 m/s", () => {
    let r = running();
    r = press(r, "left");
    expect(r.speed).toBe(BOOST);
    r = press(r, "left");
    expect(r.speed).toBe(BOOST);
    r = press(r, "right");
    expect(r.speed).toBe(2 * BOOST);
    for (let i = 0; i < 40; i++) r = press(r, i % 2 ? "right" : "left");
    expect(r.speed).toBe(MAX_SPEED);
  });

  it("SR-AK-02: ohne Eingabe sinkt das Tempo exponentiell mit 1,0/s", () => {
    let r = running({ speed: 10 });
    for (let i = 0; i < 240; i++) r = step(r, DT);
    expect(r.speed).toBeCloseTo(10 * Math.exp(-DRAG * 1), 3);
  });

  it("unter 0,2 m/s steht die Figur", () => {
    let r = running({ speed: 0.19, pos: 50 });
    r = step(r, DT);
    expect(r.speed).toBe(0);
    expect(r.pos).toBe(50);
  });

  it("SR-AK-03: 8 Eingaben/s ergeben in der 5. Sekunde im Schnitt etwa 8 m/s", () => {
    const r = running({ pos: -1000 }); // genug Anlauf, damit das Ziel nicht stört
    const after = tapFor(r, 4, 8);
    const end = tapFor(after, 1, 8);
    const avg = end.pos - after.pos;
    expect(avg).toBeGreaterThan(7.5);
    expect(avg).toBeLessThan(8.5);
  });

  it("SR-AK-05: Zielzeit ist auf 0,01 s genau (gegen die exakte Lösung)", () => {
    // Ohne Eingaben: d(t) = v0 (1 - e^{-kt}) / k  →  t = -ln(1 - d·k / v0) / k
    const v0 = 10;
    const s2 = running({ pos: 95, speed: v0, t: 7 });
    const exact2 = 7 + -Math.log(1 - (5 * DRAG) / v0) / DRAG;
    let r = s2;
    for (let i = 0; i < 2000 && r.phase === "running"; i++) r = step(r, 1 / 60);
    expect(r.phase).toBe("finished");
    expect(r.pos).toBe(DISTANCE);
    expect(Math.abs(r.finishTime! - exact2)).toBeLessThan(0.01);
  });

  it("die Zielzeit hängt kaum von der Schrittweite ab", () => {
    const run = (dt: number) => {
      let r = running({ pos: 80, speed: 12, t: 5 });
      while (r.phase === "running") r = step(r, dt);
      return r.finishTime!;
    };
    expect(Math.abs(run(1 / 30) - run(1 / 1000))).toBeLessThan(0.005);
  });

  it("nach dem Ziel ändert sich nichts mehr", () => {
    let r = running({ pos: 99.9, speed: 12 });
    r = step(r, 0.1);
    expect(r.phase).toBe("finished");
    expect(step(r, 1)).toBe(r);
    expect(press(r, "left")).toBe(r);
  });

  it("SR-AK-11: nach 60 s ohne Ziel wird abgebrochen", () => {
    let r = running({ t: TIME_LIMIT - 0.01, pos: 10, speed: 0 });
    r = step(r, 0.02);
    expect(r.phase).toBe("aborted");
    expect(r.finishTime).toBeNull();
  });

  it("SR-AK-06: Aufzeichnung alle 50 ms, letzter Punkt bei 100 m", () => {
    const r = tapFor(running(), 30, 10);
    expect(r.phase).toBe("finished");
    const n = r.samples.length;
    expect(n).toBeGreaterThan(Math.floor(r.finishTime! / SAMPLE_INTERVAL));
    expect(r.samples[0]).toBe(0);
    expect(r.samples[n - 1]).toBe(DISTANCE);
    for (let i = 1; i < n; i++) expect(r.samples[i]!).toBeGreaterThanOrEqual(r.samples[i - 1]!);
  });

  it("formatTime schneidet auf Hundertstel ab, mit Komma", () => {
    expect(formatTime(12.349)).toBe("12,34 s");
    expect(formatTime(9.9)).toBe("9,90 s");
    expect(formatTime(0)).toBe("0,00 s");
  });
});
