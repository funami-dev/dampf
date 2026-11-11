import { COLORS, addPlayer, free, isColor, createState, type Player, type State } from "./sim.ts";
import { SIZE, T, generateWorld, idx, inside, type World } from "./world.ts";
import { isChest } from "./protocol.ts";

/** Speicherstand (WL-AK-10), localStorage-Schlüssel dampf.waldlager.v1 */
export const KEY = "dampf.waldlager.v1";

export interface Store {
  get(k: string): string | null;
  set(k: string, v: string): void;
}

export function browserStore(): Store {
  return {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* Speicher gesperrt: ohne Speichern weiterspielen */
      }
    },
  };
}

export interface Saved {
  v: 1;
  seed: number;
  /** Kartengröße; alte Spielstände ohne Größe (96 × 96) werden nicht übernommen */
  size: number;
  state: State;
  me: string;
}

export function save(store: Store, seed: number, state: State, me: string, size = SIZE) {
  const data: Saved = { v: 1, seed, size, state, me };
  store.set(KEY, JSON.stringify(data));
}

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
/** Vorrat 0–20 (ungültig → 0) */
const food = (x: unknown) => (num(x) ? Math.max(0, Math.min(20, Math.floor(x))) : 0);
const numRecord = (x: unknown): Record<number, number> | null =>
  !!x && typeof x === "object" && !Array.isArray(x) && Object.values(x).every(num)
    ? (x as Record<number, number>)
    : null;

function validPlayer(p: unknown): p is Player {
  const q = p as Player;
  return (
    !!q &&
    typeof q.id === "string" &&
    typeof q.name === "string" &&
    typeof q.color === "string" &&
    num(q.x) &&
    num(q.y) &&
    num(q.wood) &&
    num(q.berries) &&
    !!q.needs &&
    num(q.needs.hunger) &&
    num(q.needs.rest) &&
    num(q.needs.fitness)
  );
}

const onLake = (w: World, x: number, y: number) =>
  inside(w, Math.floor(x), Math.floor(y)) &&
  w.terrain[idx(w, Math.floor(x), Math.floor(y))] === T.LAKE;

/** nächstes freies Feld in wachsenden Ringen */
export function nearestFree(w: World, s: State, x: number, y: number): { x: number; y: number } {
  for (let r = 1; r < w.size; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (free(w, s, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
  return w.start;
}

/** Lädt die eigene Welt; kaputte oder fehlende Daten → null (neue Welt, kein Absturz). */
export function load(store: Store): { world: World; state: State; me: string } | null {
  try {
    const raw = store.get(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Saved;
    if (d?.v !== 1 || !num(d.seed) || typeof d.me !== "string") return null;
    if (d.size !== SIZE && !(num(d.size) && d.size >= 64 && d.size <= SIZE)) return null;
    const s = d.state;
    const old = s as unknown as { hutCans?: unknown };
    if (!s || !num(s.total) || !Array.isArray(s.berries) || !Array.isArray(s.fires)) return null;
    const me = s.players?.[d.me];
    if (!validPlayer(me)) return null;
    const world = generateWorld(d.seed, d.size);
    if (s.berries.length !== world.bushes.length) return null;
    // Nur die eigene Figur übernehmen (Gäste gehören nicht zur gespeicherten Welt)
    const fresh = createState(world);
    const state: State = {
      ...fresh,
      total: s.total,
      stumps: s.stumps ?? {},
      berries: s.berries,
      refill: s.refill ?? {},
      fires: s.fires.filter((f) => !onLake(world, f.x, f.y)),
      nextFire: num(s.nextFire) ? s.nextFire : 1,
      bridges: s.bridges && typeof s.bridges === "object" ? s.bridges : {},
      // Hütte, Äpfel, Pilze (WL-AK-42); ältere Spielstände: frisch erzeugt
      appleEmpty: numRecord(s.appleEmpty) ?? fresh.appleEmpty,
      mushrooms:
        Array.isArray(s.mushrooms) && s.mushrooms.every((m) => Number.isInteger(m))
          ? s.mushrooms.filter(
              (m) => m >= 0 && m < world.size * world.size && world.terrain[m] !== T.LAKE,
            )
          : fresh.mushrooms,
      mushroomRespawn:
        Array.isArray(s.mushroomRespawn) && s.mushroomRespawn.every(num) ? s.mushroomRespawn : [],
      // Truhen (WL-AK-56); ältere Spielstände hatten nur Dosen in der Kiste
      hutChest: isChest(s.hutChest)
        ? s.hutChest
        : num(old.hutCans)
          ? { cans: Math.max(0, Math.min(2, Math.floor(old.hutCans))) }
          : fresh.hutChest,
      tentChests:
        s.tentChests && isChest(s.tentChests[me.id]) ? { [me.id]: s.tentChests[me.id]! } : {},
      hutRefill: num(s.hutRefill) ? s.hutRefill : null,
      fishRest: numRecord(s.fishRest) ?? {},
      players: {},
    };
    const home = { x: Math.floor(me.x), y: Math.floor(me.y) };
    const p = addPlayer(
      world,
      state,
      me.id,
      me.name,
      isColor(me.color) ? me.color : COLORS[0],
      home,
    );
    Object.assign(p, {
      x: me.x,
      y: me.y,
      needs: { ...me.needs, warmth: num(me.needs.warmth) ? me.needs.warmth : 100 },
      wood: me.wood,
      berries: me.berries,
      tent: me.tent && !onLake(world, me.tent.x, me.tent.y) ? me.tent : null,
      home:
        me.home && num(me.home.x) && num(me.home.y)
          ? me.home
          : { x: Math.floor(me.x), y: Math.floor(me.y) },
      radio: me.radio === true,
      apples: food(me.apples),
      mushrooms: food(me.mushrooms),
      cans: food(me.cans),
      fish: food(me.fish),
      rod: me.rod === true,
      hutSeen: me.hutSeen === true,
      landing: 0,
    });
    // ältere Spielstände: Wer jetzt in einem neuen See steht, kommt ans Ufer (WL-AK-52)
    if (!free(world, state, Math.floor(p.x), Math.floor(p.y))) {
      const spot = nearestFree(world, state, Math.floor(p.x), Math.floor(p.y));
      p.x = spot.x + 0.5;
      p.y = spot.y + 0.5;
    }
    if (onLake(world, p.home.x, p.home.y)) p.home = { x: Math.floor(p.x), y: Math.floor(p.y) };
    return { world, state, me: me.id };
  } catch {
    return null;
  }
}
