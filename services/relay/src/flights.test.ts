import { describe, expect, it } from "vitest";
import { DUS, categoryOf, handleFlights, toReply } from "./flights.ts";

/** Flugzeug im adsb.lol-Format (Fuß, ft/min) */
const ac = (o: Record<string, unknown>) => ({
  hex: "3c6444",
  flight: "DLH9XY  ",
  r: "D-AIZZ",
  t: "A320",
  lat: DUS.lat + 0.02,
  lon: DUS.lon - 0.05,
  alt_baro: 2000,
  track: 233,
  baro_rate: -700,
  ...o,
});

describe("WH-AK-18: Flugdaten aufbereiten", () => {
  it("Typcodes → Sorten", () => {
    const cases: [string, string][] = [
      ["A320", "kurz"],
      ["A319", "kurz"],
      ["B738", "kurz"],
      ["B38M", "kurz"],
      ["BCS3", "kurz"],
      ["A321", "lang"],
      ["A21N", "lang"],
      ["B739", "lang"],
      ["A333", "gross"],
      ["A359", "gross"],
      ["B789", "gross"],
      ["B77W", "gross"],
      ["A310", "gross"],
      ["B748", "jumbo"],
      ["A388", "jumbo"],
      ["A346", "jumbo"],
      ["E190", "regional"],
      ["E75L", "regional"],
      ["CRJ9", "regional"],
      ["AT76", "propeller"],
      ["DH8D", "propeller"],
      ["C172", "klein"],
      ["PA28", "klein"],
      ["EC35", "heli"],
      ["H145", "heli"],
      ["", "kurz"],
      ["ZZZZ", "kurz"],
    ];
    for (const [t, c] of cases) expect(categoryOf(t), t).toBe(c);
  });
  it("Umkreis, Höhe, Landung/Start, keine Kennungen", () => {
    const r = toReply({
      ac: [
        ac({}),
        ac({ t: "B738", baro_rate: 1500, track: 235, alt_baro: 3000 }),
        ac({ t: "C172", baro_rate: 0, track: 90, alt_baro: 1500 }),
        ac({ lat: DUS.lat + 1 }), // zu weit weg
        ac({ alt_baro: 20000 }), // zu hoch
        ac({ alt_baro: "ground" }), // am Boden
        ac({ track: undefined }),
      ],
    });
    expect(r.live).toBe(true);
    expect(r.flights.map((f) => [f.type, f.cat, f.phase])).toEqual([
      ["A320", "kurz", "landung"],
      ["B738", "kurz", "start"],
      ["C172", "klein", "ueberflug"],
    ]);
    expect(r.flights[0]!.alt).toBe(610);
    const text = JSON.stringify(r);
    for (const secret of ["3c6444", "DLH9XY", "D-AIZZ", String(DUS.lat + 0.02)])
      expect(text).not.toContain(secret);
  });
  it("Betriebsrichtung aus den Kursen", () => {
    expect(toReply({ ac: [ac({}), ac({ track: 230, baro_rate: 900 })] }).runway).toBe("west");
    expect(toReply({ ac: [ac({ track: 55 }), ac({ track: 50, baro_rate: 900 })] }).runway).toBe(
      "ost",
    );
    expect(toReply({ ac: [ac({ track: 140 })] }).runway).toBeNull();
    expect(toReply({ ac: [] }).runway).toBeNull();
  });
  it("kaputte oder fehlende Daten → leer, kein Fehler", async () => {
    for (const bad of [null, {}, { ac: "x" }, { ac: [null, 1, "a", {}] }])
      expect(toReply(bad).flights).toEqual([]);
    expect(toReply(null).live).toBe(false);
    const fail = await handleFlights(async () => {
      throw new Error("offline");
    });
    expect(fail.status).toBe(200);
    expect(JSON.parse(fail.body)).toMatchObject({ live: false, flights: [] });
    const ok = await handleFlights(async () => ({
      ok: true,
      json: async () => ({ ac: [ac({})] }),
    }));
    expect(JSON.parse(ok.body).flights).toHaveLength(1);
    expect(ok.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(ok.headers["Cache-Control"]).toContain("max-age=20");
  });
});

describe("WH-AK-21: Fluggesellschaft und Strecke", () => {
  const route = (callsign: string, plausible = 1) => ({
    callsign,
    plausible,
    airport_codes: "LEPA-EDDL",
    _airports: [
      {
        name: "Palma de Mallorca Airport",
        location: "Palma De Mallorca",
        countryiso2: "ES",
        icao: "LEPA",
      },
      { name: "Düsseldorf Airport", location: "Dusseldorf", countryiso2: "DE", icao: "EDDL" },
    ],
  });
  it("Kürzel → Gesellschaft; Strecke mit Stadt und Land; keine Flugnummern", async () => {
    const { airlineOf, parseRoutes } = await import("./flights.ts");
    expect(airlineOf("EWG9XY")).toBe("Eurowings");
    expect(airlineOf("DLH123")).toBe("Lufthansa");
    expect(airlineOf("ZZZ123")).toBeNull();
    expect(airlineOf("DABCD")).toBeNull(); // Kennzeichen statt Flugnummer
    const m = parseRoutes([route("EWG9XY"), route("DLH1", 0), { callsign: "X1", _airports: [] }]);
    expect([...m.keys()]).toEqual(["EWG9XY"]);
    expect(m.get("EWG9XY")).toEqual({
      from: { city: "Palma", country: "Spanien" },
      to: { city: "Düsseldorf", country: "Deutschland" },
    });
    const res = await handleFlights(
      async () => ({ ok: true, json: async () => ({ ac: [ac({ flight: "EWG9XY  " })] }) }),
      async () => ({ ok: true, json: async () => [route("EWG9XY")] }),
    );
    const f = JSON.parse(res.body).flights[0];
    expect(f).toMatchObject({
      airline: "Eurowings",
      from: { city: "Palma", country: "Spanien" },
      to: { city: "Düsseldorf", country: "Deutschland" },
    });
    expect(res.body).not.toContain("EWG9XY");
    expect(res.body).not.toContain("EDDL");
  });
  it("Routen-Abfrage fällt aus → Flugzeuge trotzdem, ohne Strecke", async () => {
    const res = await handleFlights(
      async () => ({ ok: true, json: async () => ({ ac: [ac({ flight: "DLH77Q" })] }) }),
      async () => {
        throw new Error("offline");
      },
    );
    const f = JSON.parse(res.body).flights[0];
    expect(f.airline).toBe("Lufthansa");
    expect(f.from).toBeUndefined();
  });
});
