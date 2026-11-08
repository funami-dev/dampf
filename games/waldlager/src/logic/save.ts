import { COLORS, addPlayer, createState, type Player, type State } from "./sim.ts";
import { SIZE, generateWorld, type World } from "./world.ts";

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

const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);

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

/** Lädt die eigene Welt; kaputte oder fehlende Daten → null (neue Welt, kein Absturz). */
export function load(store: Store): { world: World; state: State; me: string } | null {
  try {
    const raw = store.get(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Saved;
    if (d?.v !== 1 || !num(d.seed) || typeof d.me !== "string") return null;
    if (d.size !== SIZE && !(num(d.size) && d.size >= 64 && d.size <= SIZE)) return null;
    const s = d.state;
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
      fires: s.fires,
      nextFire: num(s.nextFire) ? s.nextFire : 1,
      bridges: s.bridges && typeof s.bridges === "object" ? s.bridges : {},
      players: {},
    };
    const home = { x: Math.floor(me.x), y: Math.floor(me.y) };
    const p = addPlayer(
      world,
      state,
      me.id,
      me.name,
      COLORS.includes(me.color as never) ? me.color : COLORS[0],
      home,
    );
    Object.assign(p, {
      x: me.x,
      y: me.y,
      needs: me.needs,
      wood: me.wood,
      berries: me.berries,
      tent: me.tent ?? null,
      home:
        me.home && num(me.home.x) && num(me.home.y)
          ? me.home
          : { x: Math.floor(me.x), y: Math.floor(me.y) },
      radio: me.radio === true,
      landing: 0,
    });
    return { world, state, me: me.id };
  } catch {
    return null;
  }
}
