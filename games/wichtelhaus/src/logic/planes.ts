/**
 * Flugzeuge über dem Haus (WH-AK-19): aus den Live-Daten vom Dampf-Worker werden höchstens drei
 * ruhige Überflüge. Reines TypeScript, damit alles mit Vitest prüfbar ist.
 */
export type Category =
  "kurz" | "lang" | "gross" | "jumbo" | "regional" | "propeller" | "klein" | "heli";
export type Phase = "landung" | "start" | "ueberflug";
export interface Place {
  city: string;
  country: string;
}
export interface Flight {
  type: string;
  /** nur wenn bekannt (WH-AK-21/22) */
  airline?: string;
  from?: Place;
  to?: Place;
  cat: Category;
  phase: Phase;
  track: number;
  alt: number;
}
export interface FlightsReply {
  live: boolean;
  runway: "west" | "ost" | null;
  flights: Flight[];
  source: string;
}

export const CATEGORIES: Category[] = [
  "kurz",
  "lang",
  "gross",
  "jumbo",
  "regional",
  "propeller",
  "klein",
  "heli",
];
/** Namen der Sorten im Flugzeugbuch (WH-AK-28) */
export const CATEGORY_NAMES: Record<Category, string> = {
  kurz: "Kurzstrecken-Jet",
  lang: "Langer Jet",
  gross: "Großraumjet",
  jumbo: "Jumbo",
  regional: "Regionaljet",
  propeller: "Propellerflugzeug",
  klein: "Kleinflugzeug",
  heli: "Hubschrauber",
};
export const SKY = { max: 3, minSecs: 20, maxSecs: 40, commentEvery: 120, spawnEvery: 6 };

const NAMES: Record<string, string> = {
  A318: "Airbus A318",
  A319: "Airbus A319",
  A320: "Airbus A320",
  A20N: "Airbus A320neo",
  A321: "Airbus A321",
  A21N: "Airbus A321neo",
  A332: "Airbus A330",
  A333: "Airbus A330",
  A339: "Airbus A330neo",
  A359: "Airbus A350",
  A35K: "Airbus A350",
  A388: "Airbus A380",
  A343: "Airbus A340",
  A346: "Airbus A340",
  BCS1: "Airbus A220",
  BCS3: "Airbus A220",
  B737: "Boeing 737",
  B738: "Boeing 737-800",
  B739: "Boeing 737-900",
  B38M: "Boeing 737 MAX",
  B39M: "Boeing 737 MAX 9",
  B744: "Boeing 747",
  B748: "Boeing 747-8",
  B763: "Boeing 767",
  B772: "Boeing 777",
  B77W: "Boeing 777",
  B788: "Boeing 787",
  B789: "Boeing 787",
  B78X: "Boeing 787",
  E190: "Embraer 190",
  E195: "Embraer 195",
  E75L: "Embraer 175",
  E170: "Embraer 170",
  E290: "Embraer E2",
  E295: "Embraer E2",
  CRJ9: "Bombardier CRJ900",
  AT75: "ATR 72",
  AT76: "ATR 72",
  AT45: "ATR 42",
  DH8D: "Dash 8",
  C172: "Cessna 172",
  PA28: "Piper",
  EC35: "Hubschrauber EC135",
  H145: "Hubschrauber H145",
};
const KIND_NAME: Record<Category, string> = {
  kurz: "Passagierjet",
  lang: "langer Passagierjet",
  gross: "Großraumflugzeug",
  jumbo: "Jumbo",
  regional: "kleiner Jet",
  propeller: "Propellerflugzeug",
  klein: "Kleinflugzeug",
  heli: "Hubschrauber",
};
export const COMMENTS: Record<Category, string[]> = {
  kurz: ["Da fliegt wieder einer in den Urlaub!", "Schau mal, ein Flugzeug!"],
  lang: ["Das ist aber ein langes Flugzeug!", "Wie viele Leute da wohl drin sitzen?"],
  gross: ["Oh, ein ganz großes Flugzeug – das fliegt bestimmt weit weg!"],
  jumbo: ["Oh, ein großer Jumbo!", "Vier Triebwerke – wow!"],
  regional: ["Ein kleiner Jet – flink wie ein Vogel."],
  propeller: ["Ein Propellerflugzeug – das brummt so gemütlich."],
  klein: ["Ein winziges Flugzeug! Da passen nur wenige rein."],
  heli: ["Ein Hubschrauber! Der kann in der Luft stehen bleiben."],
};

export const nameOf = (f: Flight) => NAMES[f.type] ?? `ein ${KIND_NAME[f.cat]}`;
const FROM: Record<string, string> = { west: "Westen", ost: "Osten" };

/** links = Westen, rechts = Osten. +1 = fliegt nach rechts (Osten), −1 = nach links */
export function directionOf(f: Flight, runway: FlightsReply["runway"]): 1 | -1 {
  if (f.phase !== "ueberflug" && runway) return runway === "west" ? -1 : 1;
  return Math.sin((f.track * Math.PI) / 180) >= 0 ? 1 : -1;
}

/** Text fürs Antippen: „Airbus A320 – Landung von Osten“ */
export function describe(f: Flight, dir: 1 | -1): string {
  const from = dir === 1 ? FROM.west : FROM.ost;
  const to = dir === 1 ? FROM.ost : FROM.west;
  const what =
    f.phase === "landung"
      ? `Landung von ${from}`
      : f.phase === "start"
        ? `Start Richtung ${to}`
        : `Überflug Richtung ${to}`;
  const n = nameOf(f);
  const plane = `${n.charAt(0).toUpperCase()}${n.slice(1)} – ${what}`;
  const at = (p: Place) => (p.country ? `${p.city} (${p.country})` : p.city);
  const route = f.from && f.to ? ` · von ${at(f.from)} nach ${at(f.to)}` : "";
  return `${f.airline ? `${f.airline} · ` : ""}${plane}${route}`;
}

export interface Plane {
  id: number;
  flight: Flight;
  dir: 1 | -1;
  /** Fortschritt 0..1 über den Himmel */
  p: number;
  /** Dauer des Überflugs in Sekunden */
  secs: number;
  /** Höhe am Anfang/Ende (0 = tief, 1 = hoch) */
  y0: number;
  y1: number;
}

export interface SkyState {
  planes: Plane[];
  reply: FlightsReply | null;
  /** welche Flüge aus der letzten Antwort schon gezeigt wurden */
  used: Set<number>;
  nextSpawn: number;
  lastComment: number;
  nextId: number;
  clock: number;
}
export const newSky = (): SkyState => ({
  planes: [],
  reply: null,
  used: new Set(),
  nextSpawn: 0,
  lastComment: -Infinity,
  nextId: 1,
  clock: 0,
});

/** neue Live-Daten übernehmen */
export function setReply(s: SkyState, r: FlightsReply | null) {
  s.reply = r && r.live ? r : null;
  s.used = new Set();
  if (!s.reply) s.planes = [];
}

/**
 * Himmel weiterlaufen lassen; gibt einen Wichtel-Kommentar zurück, wenn es Zeit dafür ist.
 * `rand` für die Tests austauschbar.
 */
export function updateSky(
  s: SkyState,
  dt: number,
  rand: () => number = Math.random,
): string | null {
  s.clock += dt;
  for (const p of s.planes) p.p += dt / p.secs;
  s.planes = s.planes.filter((p) => p.p < 1);
  let comment: string | null = null;
  const r = s.reply;
  if (!r || s.clock < s.nextSpawn || s.planes.length >= SKY.max) return null;
  const free = r.flights.map((_, i) => i).filter((i) => !s.used.has(i));
  if (!free.length) return null;
  const i = free[Math.floor(rand() * free.length)]!;
  s.used.add(i);
  const f = r.flights[i]!;
  const dir = directionOf(f, r.runway);
  const hi = 0.35 + rand() * 0.55;
  const plane: Plane = {
    id: s.nextId++,
    flight: f,
    dir,
    p: 0,
    secs: SKY.minSecs + rand() * (SKY.maxSecs - SKY.minSecs),
    y0: f.phase === "start" ? hi * 0.55 : hi,
    y1: f.phase === "landung" ? hi * 0.55 : f.phase === "start" ? Math.min(1, hi * 1.25) : hi,
  };
  s.planes.push(plane);
  s.nextSpawn = s.clock + SKY.spawnEvery + rand() * SKY.spawnEvery;
  if (s.clock - s.lastComment >= SKY.commentEvery) {
    const list = COMMENTS[f.cat];
    comment = list[Math.floor(rand() * list.length)]!;
    s.lastComment = s.clock;
  }
  return comment;
}

/** Lage eines Flugzeugs: x 0..1 (links→rechts), y 0..1 (tief→hoch) */
export function planePos(p: Plane): { x: number; y: number } {
  const t = p.p;
  return { x: p.dir === 1 ? t : 1 - t, y: p.y0 + (p.y1 - p.y0) * t };
}

/**
 * Was sagt der Wichtel beim Flugzeuge-Beobachten? (WH-AK-23) – zum ersten Flugzeug am Himmel,
 * nachts nur Umrisse und Lichter, sonst „Himmel leer“.
 */
export function watchRemark(planes: Plane[], night: boolean): string {
  if (!planes.length) return "Gerade ist der Himmel leer … vielleicht kommt gleich eins.";
  if (night) return "Nachts sehe ich nur die Umrisse und die Lichter – schön!";
  const f = planes[0]!.flight;
  const name = NAMES[f.type] ? `ein ${NAMES[f.type]}` : nameOf(f);
  const who = f.airline ? `${name} von ${f.airline}` : name;
  const at = (p: Place) => (p.country ? `${p.city} (${p.country})` : p.city);
  const tail =
    f.phase === "landung" && f.from
      ? ` – der kommt aus ${at(f.from)}!`
      : f.phase === "start" && f.to
        ? ` – der fliegt nach ${at(f.to)}. Gute Reise!`
        : "!";
  return `Da! ${who.charAt(0).toUpperCase()}${who.slice(1)}${tail}`;
}
