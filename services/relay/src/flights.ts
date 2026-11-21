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

export interface Place {
  city: string;
  country: string;
}
export interface Flight {
  /** ICAO-Typcode, z. B. A320 (leer, wenn unbekannt) */
  type: string;
  /** Fluggesellschaft, Start und Ziel – nur wenn bekannt (WH-AK-21) */
  airline?: string;
  from?: Place;
  to?: Place;
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
  flight?: unknown;
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
export function toReply(raw: unknown, routes?: Map<string, Route>): FlightsReply {
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
    const f: Flight = { type, cat: categoryOf(type), phase, track: Math.round(track), alt };
    const cs = callsignOf(a.flight);
    if (cs) {
      const airline = airlineOf(cs);
      if (airline) f.airline = airline;
      const r = routes?.get(cs);
      if (r) {
        f.from = r.from;
        f.to = r.to;
      }
    }
    flights.push(f);
    // Betriebsrichtung: Starts und Landungen mit Kurs nahe einer Bahnrichtung
    if (phase !== "ueberflug" && alt < 1500) {
      if (angleDiff(track, RUNWAY.west) < 40) west++;
      else if (angleDiff(track, RUNWAY.east) < 40) ost++;
    }
  }
  const runway = west > ost ? "west" : ost > west ? "ost" : null;
  return { live: true, runway, flights: flights.slice(0, 20), source: empty.source };
}

/** Antwort für den Worker; holt die Daten (und die Strecken) und speichert sie kurz zwischen */
export async function handleFlights(
  fetcher: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>,
  post?: (url: string, body: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>,
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
    const raw = await res.json();
    let routes: Map<string, Route> | undefined;
    if (post) {
      try {
        routes = await lookupRoutes(raw, post);
      } catch {
        routes = undefined; // ohne Strecken weiter
      }
    }
    return { status: 200, body: JSON.stringify(toReply(raw, routes)), headers };
  } catch {
    // keine Daten → leerer Himmel (Spiel zeigt dann nichts)
    return {
      status: 200,
      body: JSON.stringify({ live: false, runway: null, flights: [], source: "adsb.lol (ODbL)" }),
      headers: { ...headers, "Cache-Control": "public, max-age=10" },
    };
  }
}

// --- Fluggesellschaft und Strecke (WH-AK-21) --------------------------------------------------
export const ROUTES_URL = "https://api.adsb.lol/api/0/routeset";

export const AIRLINES: Record<string, string> = {
  DLH: "Lufthansa",
  CLH: "Lufthansa CityLine",
  DLA: "Air Dolomiti",
  GEC: "Lufthansa Cargo",
  EWG: "Eurowings",
  EWE: "Eurowings Europe",
  CFG: "Condor",
  TUI: "TUI fly",
  JAF: "TUI fly Belgien",
  TFL: "TUI fly Niederlande",
  SXS: "SunExpress",
  PGT: "Pegasus",
  THY: "Turkish Airlines",
  KLM: "KLM",
  AFR: "Air France",
  HOP: "Air France HOP",
  BAW: "British Airways",
  EZY: "easyJet",
  EJU: "easyJet Europe",
  EZS: "easyJet Schweiz",
  RYR: "Ryanair",
  RUK: "Ryanair",
  WZZ: "Wizz Air",
  VLG: "Vueling",
  IBE: "Iberia",
  AEA: "Air Europa",
  AEE: "Aegean",
  SWR: "Swiss",
  EDW: "Edelweiss",
  AUA: "Austrian",
  SAS: "SAS",
  FIN: "Finnair",
  LOT: "LOT",
  TAP: "TAP Air Portugal",
  BEL: "Brussels Airlines",
  TRA: "Transavia",
  TVF: "Transavia France",
  NOZ: "Norwegian",
  NAX: "Norwegian",
  BTI: "airBaltic",
  ITY: "ITA Airways",
  CTN: "Croatia Airlines",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  ETD: "Etihad",
  DAL: "Delta",
  UAL: "United",
  AAL: "American Airlines",
  ACA: "Air Canada",
  ELY: "El Al",
  MSR: "EgyptAir",
  RAM: "Royal Air Maroc",
  BCS: "DHL (European Air Transport)",
  DHK: "DHL",
  UPS: "UPS",
  FDX: "FedEx",
};

const callsignOf = (x: unknown) =>
  typeof x === "string" && /^[A-Z0-9]{3,8}$/.test(x.trim().toUpperCase())
    ? x.trim().toUpperCase()
    : null;

/** Fluggesellschaft aus dem Kürzel der Flugnummer (z. B. EWG9XY → Eurowings) */
export function airlineOf(callsign: string): string | null {
  const m = /^([A-Z]{3})\d/.exec(callsign.toUpperCase());
  return m ? (AIRLINES[m[1]!] ?? null) : null;
}

const COUNTRY: Record<string, string> = {
  DE: "Deutschland",
  ES: "Spanien",
  TR: "Türkei",
  GB: "Großbritannien",
  FR: "Frankreich",
  IT: "Italien",
  NL: "Niederlande",
  AT: "Österreich",
  CH: "Schweiz",
  PT: "Portugal",
  GR: "Griechenland",
  EG: "Ägypten",
  US: "USA",
  AE: "Vereinigte Arabische Emirate",
  QA: "Katar",
  PL: "Polen",
  DK: "Dänemark",
  SE: "Schweden",
  NO: "Norwegen",
  FI: "Finnland",
  BE: "Belgien",
  HR: "Kroatien",
  MA: "Marokko",
  TN: "Tunesien",
  IE: "Irland",
  CZ: "Tschechien",
  HU: "Ungarn",
  RO: "Rumänien",
  BG: "Bulgarien",
  CY: "Zypern",
  MT: "Malta",
  IS: "Island",
  IL: "Israel",
  CA: "Kanada",
  LV: "Lettland",
  LT: "Litauen",
  EE: "Estland",
  LU: "Luxemburg",
  SI: "Slowenien",
  RS: "Serbien",
  AL: "Albanien",
  ME: "Montenegro",
  BA: "Bosnien und Herzegowina",
  MK: "Nordmazedonien",
  XK: "Kosovo",
  UA: "Ukraine",
  GE: "Georgien",
  AM: "Armenien",
  AZ: "Aserbaidschan",
  JO: "Jordanien",
  LB: "Libanon",
  SA: "Saudi-Arabien",
  OM: "Oman",
  BH: "Bahrain",
  KW: "Kuwait",
  IN: "Indien",
  TH: "Thailand",
  CN: "China",
  JP: "Japan",
  SG: "Singapur",
  MX: "Mexiko",
  DO: "Dominikanische Republik",
  CU: "Kuba",
  CV: "Kap Verde",
  SN: "Senegal",
  ZA: "Südafrika",
  KE: "Kenia",
};
const CITY: Record<string, string> = {
  Dusseldorf: "Düsseldorf",
  Duesseldorf: "Düsseldorf",
  Munich: "München",
  Cologne: "Köln",
  Nuremberg: "Nürnberg",
  "Frankfurt am Main": "Frankfurt",
  Vienna: "Wien",
  Zurich: "Zürich",
  Geneva: "Genf",
  Rome: "Rom",
  Milan: "Mailand",
  Venice: "Venedig",
  Naples: "Neapel",
  Lisbon: "Lissabon",
  Brussels: "Brüssel",
  Copenhagen: "Kopenhagen",
  Warsaw: "Warschau",
  Prague: "Prag",
  Athens: "Athen",
  "Palma De Mallorca": "Palma",
  "Palma de Mallorca": "Palma",
  Seville: "Sevilla",
  Moscow: "Moskau",
  Cairo: "Kairo",
  Marrakesh: "Marrakesch",
};
const placeOf = (a: {
  location?: unknown;
  name?: unknown;
  countryiso2?: unknown;
}): Place | null => {
  const city =
    typeof a.location === "string" && a.location
      ? a.location
      : typeof a.name === "string"
        ? a.name
        : "";
  if (!city) return null;
  const iso = typeof a.countryiso2 === "string" ? a.countryiso2.toUpperCase() : "";
  return { city: CITY[city] ?? city, country: COUNTRY[iso] ?? iso };
};

export interface Route {
  from: Place;
  to: Place;
}

/** Strecken aus der Antwort der Routen-Abfrage (nur plausible, mit Start und Ziel) */
export function parseRoutes(raw: unknown): Map<string, Route> {
  const out = new Map<string, Route>();
  if (!Array.isArray(raw)) return out;
  for (const r of raw as { callsign?: unknown; plausible?: unknown; _airports?: unknown }[]) {
    if (!r || typeof r.callsign !== "string" || !r.plausible) continue;
    const ap = Array.isArray(r._airports) ? r._airports : [];
    if (ap.length < 2) continue;
    const from = placeOf(ap[0] as object);
    const to = placeOf(ap[ap.length - 1] as object);
    if (from && to) out.set(r.callsign.trim().toUpperCase(), { from, to });
  }
  return out;
}

/** Strecken im Arbeitsspeicher des Workers merken (ändern sich selten) */
const routeCache = new Map<string, { route: Route | null; until: number }>();
export const ROUTE_TTL_MS = 60 * 60 * 1000;

async function lookupRoutes(
  raw: unknown,
  post: (url: string, body: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>,
  now = Date.now(),
): Promise<Map<string, Route>> {
  const list = (raw as { ac?: unknown })?.ac;
  const result = new Map<string, Route>();
  if (!Array.isArray(list)) return result;
  const ask: { callsign: string; lat: number; lng: number }[] = [];
  for (const a of list as RawAircraft[]) {
    const cs = callsignOf(a?.flight);
    if (!cs || !num(a.lat) || !num(a.lon)) continue;
    if (distanceKm(DUS.lat, DUS.lon, a.lat, a.lon) > DUS.radiusKm) continue;
    const hit = routeCache.get(cs);
    if (hit && hit.until > now) {
      if (hit.route) result.set(cs, hit.route);
      continue;
    }
    ask.push({ callsign: cs, lat: a.lat, lng: a.lon });
  }
  if (ask.length) {
    const res = await post(ROUTES_URL, JSON.stringify({ planes: ask.slice(0, 20) }));
    const found = res.ok ? parseRoutes(await res.json()) : new Map<string, Route>();
    for (const q of ask.slice(0, 20)) {
      const route = found.get(q.callsign) ?? null;
      routeCache.set(q.callsign, { route, until: now + ROUTE_TTL_MS });
      if (route) result.set(q.callsign, route);
    }
  }
  return result;
}
