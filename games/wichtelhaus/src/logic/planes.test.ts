import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  COMMENTS,
  SKY,
  describe as describeFlight,
  directionOf,
  newSky,
  planePos,
  setReply,
  updateSky,
  watchRemark,
  type Flight,
  type FlightsReply,
} from "./planes.ts";
import { PLANE_ART } from "../art/planes.ts";

const fl = (o: Partial<Flight>): Flight => ({
  type: "A320",
  cat: "kurz",
  phase: "landung",
  track: 233,
  alt: 600,
  ...o,
});
const reply = (flights: Flight[], runway: FlightsReply["runway"] = "west"): FlightsReply => ({
  live: true,
  runway,
  flights,
  source: "adsb.lol (ODbL)",
});
const fixed = (v: number) => () => v;

describe("WH-AK-19: Flugzeuge am Himmel", () => {
  it("Richtung: Westbetrieb von rechts nach links, Ostbetrieb umgekehrt; Überflug nach Kurs", () => {
    expect(directionOf(fl({}), "west")).toBe(-1);
    expect(directionOf(fl({ phase: "start" }), "ost")).toBe(1);
    expect(directionOf(fl({ phase: "ueberflug", track: 90 }), "west")).toBe(1);
    expect(directionOf(fl({ phase: "ueberflug", track: 270 }), "ost")).toBe(-1);
    expect(directionOf(fl({ track: 60 }), null)).toBe(1);
    expect(describeFlight(fl({}), -1)).toBe("Airbus A320 – Landung von Osten");
    expect(describeFlight(fl({ phase: "start", type: "B748", cat: "jumbo" }), -1)).toBe(
      "Boeing 747-8 – Start Richtung Westen",
    );
    expect(describeFlight(fl({ type: "XYZ1", cat: "heli", phase: "ueberflug" }), 1)).toBe(
      "Ein Hubschrauber – Überflug Richtung Osten",
    );
    // WH-AK-22: Fluggesellschaft und Strecke, wenn bekannt
    expect(
      describeFlight(
        fl({
          airline: "Eurowings",
          from: { city: "Palma", country: "Spanien" },
          to: { city: "Düsseldorf", country: "Deutschland" },
        }),
        -1,
      ),
    ).toBe(
      "Eurowings · Airbus A320 – Landung von Osten · von Palma (Spanien) nach Düsseldorf (Deutschland)",
    );
  });
  it("höchstens 3; Westbetrieb fliegt nach links; keine Daten → leer", () => {
    const s = newSky();
    setReply(s, reply([fl({}), fl({}), fl({}), fl({}), fl({})]));
    for (let t = 0; t < 60; t += 0.5) {
      updateSky(s, 0.5, fixed(0.3));
      expect(s.planes.length).toBeLessThanOrEqual(SKY.max);
    }
    expect(s.planes.length).toBeGreaterThan(0);
    const p = s.planes[0]!;
    const a = planePos(p);
    p.p += 0.2;
    expect(planePos(p).x).toBeLessThan(a.x); // nach links
    expect(planePos(p).y).toBeLessThan(a.y); // Landung sinkt
    setReply(s, null);
    expect(s.planes).toEqual([]);
    updateSky(s, 30, fixed(0.3));
    expect(s.planes).toEqual([]);
    setReply(s, { ...reply([fl({})]), live: false });
    updateSky(s, 30, fixed(0.3));
    expect(s.planes).toEqual([]);
  });
  it("jede Sorte hat Bild und Kommentar; Kommentare höchstens alle 2 Minuten", () => {
    for (const c of CATEGORIES) {
      expect(PLANE_ART[c], c).toBeDefined();
      expect(COMMENTS[c].length).toBeGreaterThan(0);
    }
    const s = newSky();
    setReply(s, reply(Array.from({ length: 20 }, () => fl({ cat: "jumbo", type: "B744" }))));
    const said: number[] = [];
    for (let t = 0; t < 300; t += 1) {
      if (updateSky(s, 1, fixed(0.5))) said.push(s.clock);
      if (s.used.size > 15) setReply(s, s.reply);
    }
    expect(said.length).toBeGreaterThan(1);
    for (let i = 1; i < said.length; i++)
      expect(said[i]! - said[i - 1]!).toBeGreaterThanOrEqual(120);
  });
});

describe("WH-AK-23: Flugzeuge beobachten", () => {
  it("Sätze zum echten Flugzeug, leerer Himmel, Nacht", () => {
    const s = newSky();
    setReply(
      s,
      reply([
        fl({
          airline: "Pegasus",
          from: { city: "Kayseri", country: "Türkei" },
          to: { city: "Düsseldorf", country: "Deutschland" },
        }),
      ]),
    );
    updateSky(s, 1, fixed(0.5));
    expect(watchRemark(s.planes, false)).toBe(
      "Da! Ein Airbus A320 von Pegasus – der kommt aus Kayseri (Türkei)!",
    );
    s.planes[0]!.flight = fl({
      phase: "start",
      type: "",
      cat: "kurz",
      to: { city: "Monastir", country: "Tunesien" },
    });
    expect(watchRemark(s.planes, false)).toBe(
      "Da! Ein Passagierjet – der fliegt nach Monastir (Tunesien). Gute Reise!",
    );
    expect(watchRemark(s.planes, true)).toBe("Ich sehe nur die Lichter der Flugzeuge – schön!");
    expect(watchRemark([], false)).toBe(
      "Gerade ist der Himmel leer … vielleicht kommt gleich eins.",
    );
  });
});
