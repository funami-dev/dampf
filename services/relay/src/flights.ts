/**
 * Flugverkehr am Flughafen Düsseldorf für das Wichtelhaus (Spec: specs/games/wichtelhaus.md,
 * „Flugzeuge über dem Haus“, WH-AK-18). Quelle: adsb.lol (ODbL). Weitergegeben wird nur, was das
 * Spiel braucht – keine Kennungen, Flugnummern oder Positionen.
 */
export const DUS = { lat: 51.2895, lon: 6.7668, radiusKm: 15, maxAltM: 3000 };
export const FLIGHTS_PATH = "/flights/dus";
export const SOURCE_URL = `https://api.adsb.lol/v2/lat/${DUS.lat}/lon/${DUS.lon}/dist/9`;
/** Bahnen 05/23: Kurse in Grad */
export const RUNWAY = { east: 53, west: 233 };
export const CACHE_SECONDS = 20;

export type Category =
  "kurz" | "lang" | "gross" | "jumbo" | "regional" | "propeller" | "klein" | "heli";
export type Phase = "landung" | "start" | "ueberflug";

export interface Flight {
  /** ICAO-Typcode, z. B. A320 (leer, wenn unbekannt) */
  type: string;
  cat: Category;
  phase: Phase;
  /** Kurs in Grad (0 = Norden) */
  track: number;
  /** Höhe in Metern */
  alt: number;
}
export interface FlightsReply {
  live: boolean;
  /** Betriebsrichtung: "west" (Bahn 23), "ost" (Bahn 05) oder null */
  runway: "west" | "ost" | null;
  flights: Flight[];
  source: string;
}

const PREFIX: [RegExp, Category][] = [
  [/^(A38|B74|A34|A124|AN22|IL96|A225)/, "jumbo"],
  [/^(A33|A35|B76|B77|B78|A30|A310|MD11|IL86)/, "gross"],
  [/^(A321|A21N|B739|B39M|B753|B752|B3XM)/, "lang"],
  [/^(A31|A32|A19|A20|A22|BCS|B73|B37|B38|MD8|MD9|B71|F100|C919)/, "kurz"],
  [/^(E1|E2|E7|E9|CRJ|RJ|B46|F70|SU95|AJ27|E35|E45)/, "regional"],
  [/^(AT4|AT7|DH8|SF34|D328|J328|SB20|F50|C130|L410|BE20|B190|P180|PC12|DHC)/, "propeller"],
  [/^(EC|H1|H6|AS|AW|B06|B407|B429|R22|R44|S76|S92|A109|A139|A169|BK17|NH90|H145|H135)/, "heli"],
  [/^(C1|C2|PA|DA|SR2|M20|BE[0-9]|TB|P28|P32|C82|ECHO|GLID)/, "klein"],
];
/** Typcode → Sorte; Unbekanntes wie ein Kurzstrecken-Jet */
export function categoryOf(type: string): Category {
  const t = type.toUpperCase().trim();
  if (!t) return "kurz";
  for (const [re, cat] of PREFIX) if (re.test(t)) return cat;
  return "kurz";
}

/** Entfernung in km (Haversine) */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

interface RawAircraft {
  t?: unknown;
  lat?: unknown;
  lon?: unknown;
  alt_baro?: unknown;
  track?: unknown;
  true_heading?: unknown;
  baro_rate?: unknown;
  geom_rate?: unknown;
}
const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Rohdaten von adsb.lol → schlanke Antwort fürs Spiel */
export function toReply(raw: unknown): FlightsReply {
  const empty: FlightsReply = { live: false, runway: null, flights: [], source: "adsb.lol (ODbL)" };
  const list = (raw as { ac?: unknown })?.ac;
  if (!Array.isArray(list)) return empty;
  const flights: Flight[] = [];
  let west = 0;
  let ost = 0;
  for (const a of list as RawAircraft[]) {
    if (!a || !num(a.lat) || !num(a.lon)) continue;
    if (distanceKm(DUS.lat, DUS.lon, a.lat, a.lon) > DUS.radiusKm) continue;
    // alt_baro ist in Fuß; "ground" = am Boden (nicht am Himmel zeigen)
    if (!num(a.alt_baro)) continue;
    const alt = Math.round(a.alt_baro * 0.3048);
    if (alt > DUS.maxAltM || alt < 30) continue;
    const track = num(a.track) ? a.track : num(a.true_heading) ? a.true_heading : null;
    if (track === null) continue;
    const rate = num(a.baro_rate) ? a.baro_rate : num(a.geom_rate) ? a.geom_rate : 0;
    const phase: Phase = rate < -300 ? "landung" : rate > 300 ? "start" : "ueberflug";
    const type = typeof a.t === "string" ? a.t.toUpperCase().slice(0, 4) : "";
    flights.push({ type, cat: categoryOf(type), phase, track: Math.round(track), alt });
    // Betriebsrichtung: Starts und Landungen mit Kurs nahe einer Bahnrichtung
    if (phase !== "ueberflug" && alt < 1500) {
      if (angleDiff(track, RUNWAY.west) < 40) west++;
      else if (angleDiff(track, RUNWAY.east) < 40) ost++;
    }
  }
  const runway = west > ost ? "west" : ost > west ? "ost" : null;
  return { live: true, runway, flights: flights.slice(0, 20), source: empty.source };
}

/** Antwort für den Worker; holt die Daten und speichert sie kurz zwischen */
export async function handleFlights(
  fetcher: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>,
): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
  };
  try {
    const res = await fetcher(SOURCE_URL);
    if (!res.ok) throw new Error("upstream");
    return { status: 200, body: JSON.stringify(toReply(await res.json())), headers };
  } catch {
    // keine Daten → leerer Himmel (Spiel zeigt dann nichts)
    return {
      status: 200,
      body: JSON.stringify({ live: false, runway: null, flights: [], source: "adsb.lol (ODbL)" }),
      headers: { ...headers, "Cache-Control": "public, max-age=10" },
    };
  }
}
