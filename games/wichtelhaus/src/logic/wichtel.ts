/**
 * Wichtelhaus – Spiellogik (Spec: specs/games/wichtelhaus.md, WH-AK-01..06, 11).
 * Reines TypeScript ohne Phaser/DOM, damit alles mit Vitest prüfbar ist.
 */

export const DAY = 360; // Sekunden pro Spieltag
export const NIGHT_FROM = 0.75; // ab 3/4 des Tages ist Nacht …
export const NIGHT_TO = 0.12; // … bis kurz nach Tagesbeginn
export const KEY = "dampf.wichtelhaus.v1";
export const MAX_FOOD = 10;
export const FLOOR_AFTER_ABSENCE = 20;
export const ATTIC_AT = 10; // Freundschaft, ab der der Dachboden aufgeht

export type NeedKey = "hunger" | "energy" | "fun" | "clean";
export type Needs = Record<NeedKey, number>;
export type Pet = "katze" | "igel" | "drache";
export type Trait = "musik" | "basteln" | "lesen" | "schlafen";
export type Food = "brot" | "gemuese" | "obst" | "kuchen" | "suppe";
export type Gift =
  | "buch"
  | "ball"
  | "holz"
  | "blume"
  | "kakao"
  | "socken"
  | "muschel"
  | "kerze"
  | "malkasten"
  | "floete"
  | "puzzle"
  | "teddy"
  | "schal"
  | "gloeckchen"
  | "kekse"
  | "sternkarte"
  | "kreisel"
  | "seife"
  | "pflanze";
export type Room =
  "kueche" | "bad" | "wohnzimmer" | "musik" | "werkstatt" | "schlafzimmer" | "dachboden";
export type ActivityKind =
  | "essen"
  | "schlafen"
  | "baden"
  | "musik"
  | "basteln"
  | "lesen"
  | "spielen"
  | "schreiben"
  | "traurig"
  | "bummeln"
  | "sterne";
export type Request = "musik" | "basteln" | "vorlesen" | "schlafen" | "spielen" | "baden";

export const HAT_COLORS = ["#c0392b", "#2e86c1", "#27ae60", "#8e44ad", "#d68910", "#16a085"];
export const PETS: Record<Pet, string> = { katze: "Katze", igel: "Igel", drache: "kleiner Drache" };
export const TRAITS: Record<Trait, string> = {
  musik: "musikalisch",
  basteln: "bastelt gern",
  lesen: "liest gern",
  schlafen: "Langschläfer",
};
export const FOODS: Record<Food, { name: string; icon: string; hunger: number; fun: number }> = {
  brot: { name: "Brot", icon: "🍞", hunger: 30, fun: 0 },
  gemuese: { name: "Gemüse", icon: "🥕", hunger: 35, fun: 0 },
  obst: { name: "Obst", icon: "🍎", hunger: 25, fun: 5 },
  kuchen: { name: "Kuchen", icon: "🍰", hunger: 25, fun: 25 },
  suppe: { name: "Suppe", icon: "🍲", hunger: 50, fun: 5 },
};
/** Geschenke mit kleiner Wirkung (WH-AK-04, Feedback fb_4eg9mcaw) */
export const GIFTS: Record<Gift, { name: string; icon: string; effect: Partial<Needs> }> = {
  buch: { name: "Buch", icon: "📖", effect: { fun: 20 } },
  ball: { name: "Ball", icon: "⚽", effect: { fun: 20 } },
  holz: { name: "Bastelholz", icon: "🪵", effect: { fun: 15 } },
  blume: { name: "Blume", icon: "🌼", effect: { fun: 15 } },
  kakao: { name: "Tasse Kakao", icon: "☕", effect: { hunger: 15, fun: 10 } },
  socken: { name: "warme Socken", icon: "🧦", effect: { energy: 10, fun: 10 } },
  muschel: { name: "Muschel", icon: "🐚", effect: { fun: 15 } },
  kerze: { name: "Kerze", icon: "🕯️", effect: { energy: 10, fun: 5 } },
  malkasten: { name: "Malkasten", icon: "🎨", effect: { fun: 20 } },
  floete: { name: "Flöte", icon: "🎶", effect: { fun: 20 } },
  puzzle: { name: "Puzzle", icon: "🧩", effect: { fun: 20 } },
  teddy: { name: "Teddy", icon: "🧸", effect: { energy: 10, fun: 15 } },
  schal: { name: "Schal", icon: "🧣", effect: { energy: 5, fun: 10 } },
  gloeckchen: { name: "Glöckchen", icon: "🔔", effect: { fun: 15 } },
  kekse: { name: "Kekse", icon: "🍪", effect: { hunger: 15, fun: 10 } },
  sternkarte: { name: "Sternkarte", icon: "🗺️", effect: { fun: 15 } },
  kreisel: { name: "Kreisel", icon: "🌀", effect: { fun: 15 } },
  seife: { name: "Duftseife", icon: "🧼", effect: { clean: 30 } },
  pflanze: { name: "Pflanze", icon: "🪴", effect: { fun: 10 } },
};

/** Räume: Etage 0 = unten, 1 = oben, 2 = Dachboden; x = Mitte in Raumbreiten */
export const ROOMS: Record<Room, { name: string; floor: number; x: number }> = {
  kueche: { name: "Küche", floor: 0, x: 0 },
  wohnzimmer: { name: "Wohnzimmer", floor: 0, x: 1 },
  werkstatt: { name: "Werkstatt", floor: 0, x: 2 },
  bad: { name: "Bad", floor: 1, x: 0 },
  musik: { name: "Musikzimmer", floor: 1, x: 1 },
  schlafzimmer: { name: "Schlafzimmer", floor: 1, x: 2 },
  dachboden: { name: "Dachboden", floor: 2, x: 1 },
};

/** Abnahme der Bedürfnisse pro Sekunde (100 = gut) */
export const DECAY: Needs = {
  hunger: 100 / 600,
  energy: 100 / 720,
  fun: 100 / 420,
  clean: 100 / 900,
};

const ACT: Record<ActivityKind, { room: Room; seconds: number; text: string }> = {
  essen: { room: "kueche", seconds: 12, text: "Mmh, lecker!" },
  schlafen: { room: "schlafzimmer", seconds: 60, text: "Gähn … gute Nacht." },
  baden: { room: "bad", seconds: 14, text: "Plitsch, platsch!" },
  musik: { room: "musik", seconds: 20, text: "La la la …" },
  basteln: { room: "werkstatt", seconds: 22, text: "Ich bastle etwas Schönes." },
  lesen: { room: "wohnzimmer", seconds: 20, text: "Psst … eine spannende Stelle." },
  spielen: { room: "wohnzimmer", seconds: 16, text: "Komm her, du!" },
  schreiben: { room: "wohnzimmer", seconds: 14, text: "Ich schreibe dir einen Brief." },
  traurig: { room: "kueche", seconds: 15, text: "Ich habe Hunger … der Schrank ist leer." },
  bummeln: { room: "wohnzimmer", seconds: 10, text: "Hm, was mache ich jetzt?" },
  sterne: { room: "dachboden", seconds: 20, text: "So viele Sterne heute!" },
};
export const activityInfo = (k: ActivityKind) => ACT[k];

export interface Activity {
  kind: ActivityKind;
  room: Room;
  /** Restzeit in Sekunden */
  left: number;
  /** gewählter Vorrat beim Essen */
  food?: Food;
}

export interface Letter {
  day: number;
  text: string;
  read: boolean;
}

export interface World {
  v: 1;
  name: string;
  hat: string;
  pet: Pet;
  trait: Trait;
  needs: Needs;
  /** Spielzeit in Sekunden */
  t: number;
  food: Partial<Record<Food, number>>;
  gifts: Gift[];
  lastGiftDay: number;
  /** heute schon geschenkt (jedes Geschenk einmal pro Spieltag) */
  giftsToday: { day: number; given: Gift[] };
  friendship: number;
  crafted: number;
  activity: Activity;
  /** was heute Schönes passiert ist (für den Brief) */
  today: string[];
  letters: Letter[];
  lastLetterDay: number;
  /** echte Zeit beim Speichern (ms) */
  savedAt: number;
  /** Lautstärke 0..1 und stumm (WH-AK-11) */
  volume: number;
  muted: boolean;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));
export const dayOf = (t: number) => Math.floor(t / DAY);
export const timeOfDay = (t: number) => (((t % DAY) + DAY) % DAY) / DAY;
export const isNight = (t: number) => {
  const d = timeOfDay(t);
  return d >= NIGHT_FROM || d < NIGHT_TO;
};
export const foodCount = (w: World) => Object.values(w.food).reduce((a, b) => a + (b ?? 0), 0);

/** Neuer Wichtel (WH-AK-01) */
export function newWichtel(
  opts: { name?: string; hat?: string; pet?: Pet },
  rand: () => number = Math.random,
): World {
  const traits = Object.keys(TRAITS) as Trait[];
  return {
    v: 1,
    name: (opts.name ?? "").trim().slice(0, 12) || "Wichtel",
    hat: opts.hat && HAT_COLORS.includes(opts.hat) ? opts.hat : HAT_COLORS[0]!,
    pet: opts.pet ?? "katze",
    trait: traits[Math.floor(rand() * traits.length)]!,
    needs: { hunger: 80, energy: 80, fun: 80, clean: 80 },
    t: DAY * 0.2,
    food: { brot: 2, suppe: 1 },
    gifts: [],
    lastGiftDay: -1,
    giftsToday: { day: -1, given: [] },
    friendship: 0,
    crafted: 0,
    activity: { kind: "bummeln", room: "wohnzimmer", left: 5 },
    today: [],
    letters: [],
    lastLetterDay: 0,
    savedAt: Date.now(),
    volume: 0.3,
    muted: false,
  };
}

const LIKES: Record<Trait, ActivityKind> = {
  musik: "musik",
  basteln: "basteln",
  lesen: "lesen",
  schlafen: "schlafen",
};

/** Was macht der Wichtel als Nächstes? (WH-AK-02) */
export function chooseActivity(w: World, rand: () => number = Math.random): Activity {
  const n = w.needs;
  const mk = (kind: ActivityKind, food?: Food): Activity => ({
    kind,
    room: ACT[kind].room,
    left: ACT[kind].seconds * (kind === "schlafen" && w.trait === "schlafen" ? 1.3 : 1),
    food,
  });
  const low = (Object.keys(n) as NeedKey[]).sort((a, b) => n[a] - n[b])[0]!;
  if (n[low] < 40 || (isNight(w.t) && n.energy < 90)) {
    if (low === "hunger" && n.hunger < 40) {
      const f = bestFood(w);
      return f ? mk("essen", f) : mk("traurig");
    }
    if (low === "energy" || isNight(w.t)) return mk("schlafen");
    if (low === "clean") return mk("baden");
    if (low === "fun") return mk(funPick(w, rand));
  }
  if (w.today.length === 0 && rand() < 0.15) return mk("schreiben");
  return mk(rand() < 0.2 ? "bummeln" : funPick(w, rand));
}

function funPick(w: World, rand: () => number): ActivityKind {
  const opts: ActivityKind[] = ["musik", "basteln", "lesen", "spielen"];
  if (w.friendship >= ATTIC_AT && isNight(w.t)) opts.push("sterne");
  const fav = LIKES[w.trait];
  // Vorliebe doppelt gewichtet
  const pool = opts.flatMap((o) => (o === fav ? [o, o] : [o]));
  return pool[Math.floor(rand() * pool.length)]!;
}

function bestFood(w: World): Food | null {
  const have = (Object.keys(FOODS) as Food[]).filter((f) => (w.food[f] ?? 0) > 0);
  if (!have.length) return null;
  return have.sort((a, b) => FOODS[b].hunger - FOODS[a].hunger)[0]!;
}

/** Ergebnis einer beendeten Tätigkeit */
function finish(w: World, a: Activity) {
  const n = w.needs;
  switch (a.kind) {
    case "essen": {
      const f = a.food && (w.food[a.food] ?? 0) > 0 ? a.food : bestFood(w);
      if (!f) break;
      w.food[f] = (w.food[f] ?? 0) - 1;
      n.hunger = clamp(n.hunger + FOODS[f].hunger);
      n.fun = clamp(n.fun + FOODS[f].fun);
      if (f === "kuchen") remember(w, "Danke für den Kuchen!");
      break;
    }
    case "baden":
      n.clean = 100;
      break;
    case "musik":
      n.fun = clamp(n.fun + (w.trait === "musik" ? 40 : 30));
      remember(w, "Heute habe ich ein neues Lied gespielt.");
      break;
    case "basteln":
      n.fun = clamp(n.fun + (w.trait === "basteln" ? 40 : 30));
      w.crafted++;
      remember(w, "In der Werkstatt habe ich etwas Kleines gebastelt.");
      break;
    case "lesen":
      n.fun = clamp(n.fun + (w.trait === "lesen" ? 40 : 30));
      remember(w, "Ich habe in einem Buch gelesen.");
      break;
    case "spielen":
      n.fun = clamp(n.fun + 30);
      remember(w, `Ich habe mit meinem Haustier gespielt.`);
      break;
    case "sterne":
      n.fun = clamp(n.fun + 35);
      remember(w, "Auf dem Dachboden habe ich Sterne gezählt.");
      break;
    case "schreiben":
    case "traurig":
    case "bummeln":
    case "schlafen":
      break;
  }
}

function remember(w: World, s: string) {
  if (!w.today.includes(s)) w.today.push(s);
}

/** Ein Zeitschritt (WH-AK-02). Gibt eine Sprechblase zurück, wenn etwas Neues beginnt. */
export function step(w: World, dt: number, rand: () => number = Math.random): string | null {
  const before = dayOf(w.t);
  w.t += dt;
  const n = w.needs;
  const a = w.activity;
  const sleeping = a.kind === "schlafen";
  n.hunger = clamp(n.hunger - DECAY.hunger * dt * (sleeping ? 0.5 : 1));
  n.clean = clamp(n.clean - DECAY.clean * dt);
  n.fun = clamp(n.fun - DECAY.fun * dt * (sleeping ? 0.2 : 1));
  if (sleeping) n.energy = clamp(n.energy + (100 / 50) * dt);
  else n.energy = clamp(n.energy - DECAY.energy * dt * (isNight(w.t) ? 1.6 : 1));
  if (dayOf(w.t) !== before) newDay(w);
  a.left -= dt;
  if (sleeping && n.energy >= 100 && !isNight(w.t)) a.left = 0;
  if (a.left > 0) return null;
  finish(w, a);
  w.activity = chooseActivity(w, rand);
  return ACT[w.activity.kind].text;
}

/** Neuer Tag: ggf. Brief vom Vortag (WH-AK-06) */
function newDay(w: World) {
  const day = dayOf(w.t);
  if (day > w.lastLetterDay) {
    const lines = w.today.slice(0, 2);
    const text = lines.length
      ? `Hallo! ${lines.join(" ")} Bis bald, dein ${w.name}`
      : `Hallo! Heute war ein ruhiger Tag. Ich habe aus dem Fenster geschaut. Bis bald, dein ${w.name}`;
    w.letters.push({ day, text, read: false });
    if (w.letters.length > 30) w.letters.shift();
    w.lastLetterDay = day;
  }
  w.today = [];
}

/** Einkaufen (WH-AK-03) */
export function shop(w: World, f: Food): string {
  if (foodCount(w) >= MAX_FOOD) return "Der Vorratsschrank ist voll.";
  w.food[f] = (w.food[f] ?? 0) + 1;
  befriend(w, 0.5);
  return `${FOODS[f].icon} ${FOODS[f].name} liegt im Schrank.`;
}

/** heute schon geschenkt? */
export function giftedToday(w: World, g: Gift): boolean {
  return w.giftsToday.day === dayOf(w.t) && w.giftsToday.given.includes(g);
}

/** Geschenk – jedes einmal pro Spieltag (WH-AK-04) */
export function giveGift(w: World, g: Gift): string {
  const day = dayOf(w.t);
  if (w.giftsToday.day !== day) w.giftsToday = { day, given: [] };
  if (w.giftsToday.given.includes(g))
    return `${GIFTS[g].name} hat er heute schon bekommen. Morgen wieder!`;
  w.giftsToday.given.push(g);
  w.lastGiftDay = day;
  if (!w.gifts.includes(g)) w.gifts.push(g);
  for (const [k, v] of Object.entries(GIFTS[g].effect) as [NeedKey, number][])
    w.needs[k] = clamp(w.needs[k] + v);
  remember(w, `Danke für das Geschenk (${GIFTS[g].name})!`);
  // das erste Geschenk am Tag zählt am meisten
  befriend(w, 2 / w.giftsToday.given.length);
  return `${GIFTS[g].icon} Oh, ${GIFTS[g].name}! Danke!`;
}

const REQ: Record<Request, ActivityKind> = {
  musik: "musik",
  basteln: "basteln",
  vorlesen: "lesen",
  schlafen: "schlafen",
  spielen: "spielen",
  baden: "baden",
};

/** Anklopfen und bitten – immer mit Antwort (WH-AK-04) */
export function ask(
  w: World,
  r: Request,
  rand: () => number = Math.random,
): {
  ok: boolean;
  text: string;
} {
  const n = w.needs;
  const kind = REQ[r];
  let ok: boolean;
  let no = "Jetzt gerade nicht, vielleicht gleich.";
  if (r === "schlafen") {
    ok = n.energy < 80 || isNight(w.t);
    no = "Ich bin noch gar nicht müde!";
  } else if (r === "baden") {
    ok = n.clean < 95;
    no = "Ich bin doch ganz sauber!";
  } else if (n.energy < 20) {
    ok = false;
    no = "Jetzt nicht, ich bin so müde …";
  } else if (n.hunger < 20) {
    ok = false;
    no = "Erst brauche ich etwas zu essen.";
  } else {
    const mood = (n.hunger + n.energy + n.fun + n.clean) / 4;
    ok = mood > 35 || rand() < 0.5;
  }
  if (!ok) return { ok, text: no };
  w.activity = { kind, room: ACT[kind].room, left: ACT[kind].seconds };
  befriend(w, 1);
  const yes: Record<Request, string> = {
    musik: "Gern! Ich spiele dir etwas vor.",
    basteln: "Oh ja, ich bastle dir etwas!",
    vorlesen: "Setz dich, ich lese dir vor.",
    schlafen: "Gute Idee … gähn.",
    spielen: "Au ja, wir spielen!",
    baden: "Plitsch, platsch – ab in die Wanne!",
  };
  return { ok, text: yes[r] };
}

/** Ruhe-Tätigkeiten und Ruhemoment stärken die Freundschaft ein bisschen */
export function befriend(w: World, by: number) {
  w.friendship = Math.min(100, w.friendship + by);
}
export const atticOpen = (w: World) => w.friendship >= ATTIC_AT;

/** Abwesenheit: höchstens ein Spieltag läuft nach, Bedürfnisse nie unter 20 % (WH-AK-05) */
export function catchUp(w: World, nowMs: number, rand: () => number = Math.random): number {
  const away = Math.max(0, (nowMs - w.savedAt) / 1000);
  const sim = Math.min(away, DAY);
  for (let s = 0; s < sim; s += 1) step(w, Math.min(1, sim - s), rand);
  for (const k of Object.keys(w.needs) as NeedKey[])
    w.needs[k] = Math.max(FLOOR_AFTER_ABSENCE, w.needs[k]);
  w.savedAt = nowMs;
  return sim;
}

export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
}

export function save(s: Store, w: World, nowMs = Date.now()) {
  try {
    s.set(KEY, JSON.stringify({ ...w, savedAt: nowMs }));
  } catch {
    /* Speicher gesperrt */
  }
}

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Laden; kaputte Daten → null (dann neuer Wichtel, WH-AK-01) */
export function load(s: Store): World | null {
  try {
    const d = JSON.parse(s.get(KEY) ?? "null") as World | null;
    if (!d || d.v !== 1 || typeof d.name !== "string" || !num(d.t)) return null;
    if (!d.needs || !(["hunger", "energy", "fun", "clean"] as const).every((k) => num(d.needs[k])))
      return null;
    if (!(d.pet in PETS) || !(d.trait in TRAITS)) return null;
    const w = newWichtel({ name: d.name, hat: d.hat, pet: d.pet });
    return {
      ...w,
      ...d,
      hat: w.hat,
      food: d.food && typeof d.food === "object" ? d.food : {},
      gifts: Array.isArray(d.gifts) ? d.gifts.filter((g) => g in GIFTS) : [],
      giftsToday:
        d.giftsToday && num(d.giftsToday.day) && Array.isArray(d.giftsToday.given)
          ? { day: d.giftsToday.day, given: d.giftsToday.given.filter((g) => g in GIFTS) }
          : // ältere Spielstände: das eine Geschenk von heute zählt mit
            { day: num(d.lastGiftDay) ? d.lastGiftDay : -1, given: [] },
      letters: Array.isArray(d.letters) ? d.letters : [],
      today: Array.isArray(d.today) ? d.today : [],
      activity: d.activity && d.activity.kind in ACT ? d.activity : w.activity,
      volume: num(d.volume) ? Math.max(0, Math.min(1, d.volume)) : 0.3,
      muted: d.muted === true,
      savedAt: num(d.savedAt) ? d.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}
