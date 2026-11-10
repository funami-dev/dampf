import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { clockOf, darkness, phaseOf } from "./logic/daytime.ts";
import {
  COLORS,
  COSTS,
  FIRE,
  act,
  actionFor,
  activeAt,
  addPlayer,
  isColor,
  markTrail,
  FOODS,
  foodsOf,
  hasApples,
  type FoodKind,
  build,
  buildSpot,
  canBridgeAt,
  canBuildAt,
  createState,
  eat,
  free,
  hiddenAt,
  isStump,
  visibleAnimals,
  movePlayer,
  stepWorld,
  type BuildKind,
  type Player,
  type State,
} from "./logic/sim.ts";
import { browserStore, load, save } from "./logic/save.ts";
import { applySnap, parseGuest, parseHost, toSnap, type GuestMsg } from "./logic/protocol.ts";
import { HABITAT_TEXT, SPECIES, TIME_TEXT, UNICORN, speciesById } from "./logic/species.ts";
import { discover, loadBook, saveBook } from "./logic/tierbuch.ts";
import { T, generateWorld, idx, inside, type World } from "./logic/world.ts";
import { bearing, mapPoint } from "./logic/compass.ts";
import { HS, isoX, isoY, tileX, tileY } from "./render/iso.ts";
import {
  addChute,
  addPlayerTex,
  addTent,
  addTextures,
  speciesCanvas,
  tileKey,
} from "./render/textures.ts";
import { debugEnabled } from "./debug.ts";

const store = browserStore();
/** Online-Server (WL-AK-16): ohne Adresse nur Einzelspieler */
const params = new URLSearchParams(location.search);
const RELAY_URL = (
  debugEnabled && params.has("relay")
    ? params.get("relay")!
    : ((import.meta.env.VITE_RELAY_URL as string | undefined) ?? "")
).replace(/\/$/, "");

// --- Seite und Bedienelemente ------------------------------------------
const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
stage.style.background = "#1e3a1a";
const layer = document.createElement("div");
layer.className = "wl-layer";
layer.innerHTML = `
  <canvas class="wl-night"></canvas>
  <div class="wl-top">
    <div class="wl-hud" role="status">
      <div class="wl-bar" data-n="hunger"><span>Hunger</span><i><b></b></i></div>
      <div class="wl-bar" data-n="rest"><span>Müdigkeit</span><i><b></b></i></div>
      <div class="wl-bar" data-n="fitness"><span>Fitness</span><i><b></b></i></div>
      <div class="wl-inv"><span data-h="wood">🪵 0</span> <span data-h="berries">🫐 0</span> <span data-h="apples" hidden></span> <span data-h="mushrooms" hidden></span> <span data-h="cans" hidden></span></div>
    </div>
    <div class="wl-side">
      <div class="wl-clock" data-h="clock">07:00</div>
      <div class="wl-compass" role="img" aria-label="Kompass, Norden oben">
        <b class="n">N</b><b class="o">O</b><b class="s">S</b><b class="w">W</b>
        <i class="wl-needle" hidden><span>🏠</span></i>
      </div>
      <div class="wl-room" data-h="room" hidden></div>
      <button class="wl-btn" type="button" data-b="menu">Menü</button>
    </div>
  </div>
  <div class="wl-toast" role="status"></div>
  <div class="wl-buildbar" hidden>
    <button class="wl-btn" type="button" data-b="tent">Zelt (${COSTS.tent} Holz)</button>
    <button class="wl-btn" type="button" data-b="fire">Lagerfeuer (${COSTS.fire} Holz)</button>
    <button class="wl-btn" type="button" data-b="bridge">Brücke (${COSTS.bridge} Holz)</button>
    <button class="wl-btn" type="button" data-b="cancel">✕</button>
  </div>
  <div class="wl-buildbar wl-eatbar" role="group" aria-label="Was möchtest du essen?" hidden></div>
  <div class="wl-bottom">
    <div class="wl-stick" role="slider" aria-label="Laufen"><div class="wl-knob"></div></div>
    <div class="wl-actions">
      <button class="wl-btn" type="button" data-b="radio" hidden>📻 Funk</button>
      <button class="wl-btn" type="button" data-b="build">Bauen</button>
      <button class="wl-btn" type="button" data-b="eat">Essen</button>
      <button class="wl-btn primary wl-act" type="button" data-b="act" aria-label="Aktion">Aktion</button>
    </div>
  </div>`;
stage.append(layer);
const $ = <E extends HTMLElement>(s: string) => layer.querySelector<E>(s)!;
const hud = (k: string) => $(`[data-h="${k}"]`);
const toastEl = $(".wl-toast");
const actBtn = $<HTMLButtonElement>('[data-b="act"]');
const buildBar = $(".wl-buildbar");
const night = $<HTMLCanvasElement>(".wl-night");
const needle = $(".wl-needle");
let hutAngle: number | null = null;
const nightCtx = night.getContext("2d")!;

// --- Spielzustand -------------------------------------------------------
let world: World;
let state: State;
let meId = "me";
let screen: "menu" | "play" = "menu";
let paused = false;
let overlay: HTMLElement | null = null;
let building = false;
let toastUntil = 0;
let saveTimer = 0;
let chopTimer = 0;
let bushAt: Map<number, number> | null = null;
// Mehrspieler
let mode: "solo" | "host" | "guest" = "solo";
let ws: WebSocket | null = null;
let roomCode: string | null = null;
let netTimer = 0;
let gotSnap = false;
let worldReady = true;
let nextOpenTry = 0;
let metaTimer = 0;
let lobby: { code: string; host: string; players: string[]; count: number; max: number }[] | null =
  null;
let lobbyError = false;
let lobbyTimer: ReturnType<typeof setInterval> | null = null;
// Tierbuch
const book = loadBook(store);
let seeTimer = 0;
let wasLanding = false;
const me = (): Player => state.players[meId]!;

let profile = { name: "", color: COLORS[1] as string };
let saved: ReturnType<typeof load> = null;

/** Große Insel erzeugen dauert einen Moment: erst Hinweis zeigen, dann rechnen */
function withLoading(fn: () => void) {
  panel(`<h2>Die Insel entsteht …</h2><p>Gleich geht's los.</p>`);
  setTimeout(fn, 40);
}

function newWorld(seed = Date.now() & 0x7fffffff || 1) {
  world = generateWorld(seed);
  state = createState(world);
  meId = "me";
  addPlayer(world, state, meId, profile.name, profile.color);
  bushAt = null;
  minimap = null;
}

const toast = (t: string | null, s = 2.2) => {
  if (!t) return;
  toastEl.textContent = t;
  toastUntil = performance.now() + s * 1000;
};

// --- Eingabe ------------------------------------------------------------
const keys = new Set<string>();
const stick = { x: 0, y: 0 };
let stickId: number | null = null;
const stickEl = $(".wl-stick");
const knob = $(".wl-knob");
const moveStick = (e: PointerEvent) => {
  const r = stickEl.getBoundingClientRect();
  const rad = r.width / 2;
  let dx = (e.clientX - (r.left + rad)) / rad;
  let dy = (e.clientY - (r.top + rad)) / rad;
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  stick.x = dx;
  stick.y = dy;
  knob.style.transform = `translate(${dx * rad * 0.6}px, ${dy * rad * 0.6}px)`;
};
stickEl.addEventListener("pointerdown", (e) => {
  stickId = e.pointerId;
  stickEl.setPointerCapture(e.pointerId);
  moveStick(e);
});
stickEl.addEventListener("pointermove", (e) => e.pointerId === stickId && moveStick(e));
const releaseStick = () => {
  stickId = null;
  stick.x = stick.y = 0;
  knob.style.transform = "";
};
stickEl.addEventListener("pointerup", releaseStick);
stickEl.addEventListener("pointercancel", releaseStick);

const canPlay = () => screen === "play" && !paused && !overlay;
function doAct() {
  if (!canPlay()) return;
  if (mode === "guest") return guestSend({ v: 1, k: "act" });
  toast(act(world, state, me()), 1.2);
}
/** Essen (WL-AK-42): eine Sorte → direkt; mehrere → Auswahl-Leiste */
function doEat(kind?: FoodKind) {
  if (!canPlay()) return;
  const have = foodsOf(me());
  if (!kind && have.length > 1) return toggleEat(!!eatBar.hidden);
  toggleEat(false);
  if (mode === "guest")
    return guestSend(kind ? { v: 1, k: "eat", food: kind } : { v: 1, k: "eat" });
  toast(eat(me(), kind), 1.5);
}
const eatBar = $(".wl-eatbar");
function toggleEat(on: boolean) {
  if (on && !canPlay()) return;
  if (on) {
    toggleBuild(false);
    const p = me();
    eatBar.innerHTML =
      foodsOf(p)
        .map(
          (k, i) =>
            `<button class="wl-btn" type="button" data-food="${k}" aria-label="${FOODS[k].one} essen (${p[k]})">${FOODS[k].icon} ${FOODS[k].one} (${p[k]})<small> ${i + 1}</small></button>`,
        )
        .join("") +
      `<button class="wl-btn" type="button" data-food="x" aria-label="Schließen">✕</button>`;
    eatBar
      .querySelectorAll<HTMLButtonElement>("[data-food]")
      .forEach((b) =>
        b.addEventListener("click", () =>
          b.dataset.food === "x" ? toggleEat(false) : doEat(b.dataset.food as FoodKind),
        ),
      );
  }
  eatBar.hidden = !on;
}
function toggleBuild(on = !building) {
  if (!canPlay() && on) return;
  if (on) toggleEat(false);
  building = on;
  buildBar.hidden = !on;
}
function doBuild(kind: BuildKind) {
  if (!canPlay()) return;
  if (mode === "guest") {
    guestSend({ v: 1, k: "build", kind });
    toggleBuild(false);
    return;
  }
  if (kind === "tent") addTent(game.textures, me().color);
  const msg = build(world, state, me(), kind);
  toast(msg);
  // Brücken baut man Stück für Stück: Bau-Leiste bleibt offen
  if (kind !== "bridge" && /steht|brennt/.test(msg)) toggleBuild(false);
}

actBtn.addEventListener("click", () => doAct());
$('[data-b="eat"]').addEventListener("click", () => doEat());
$('[data-b="radio"]').addEventListener("click", () => openRadio());
$('[data-b="build"]').addEventListener("click", () => toggleBuild());
$('[data-b="tent"]').addEventListener("click", () => doBuild("tent"));
$('[data-b="fire"]').addEventListener("click", () => doBuild("fire"));
$('[data-b="bridge"]').addEventListener("click", () => doBuild("bridge"));
$('[data-b="cancel"]').addEventListener("click", () => toggleBuild(false));
$('[data-b="menu"]').addEventListener("click", () => openMenu());

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
    e.preventDefault();
  if ((e.target as HTMLElement)?.tagName === "INPUT") return;
  keys.add(e.code);
  if (overlay) {
    if (e.code === "Escape" && screen === "play") resume();
    return;
  }
  if (e.repeat) return;
  if (e.code === "KeyE" || e.code === "Space") {
    doAct();
    chopTimer = 0.45;
  }
  if (e.code === "KeyQ") doEat();
  if (e.code === "KeyF" && screen === "play" && me().radio) openRadio();
  if (e.code === "KeyT" && screen === "play") {
    toggleBuild(false);
    openBook(() => resume());
  }
  if (e.code === "KeyB") toggleBuild();
  if (!eatBar.hidden && /^Digit[1-4]$/.test(e.code)) {
    const k = foodsOf(me())[Number(e.code.slice(5)) - 1];
    if (k) doEat(k);
    return;
  }
  if (building && e.code === "Digit1") doBuild("tent");
  if (building && e.code === "Digit2") doBuild("fire");
  if (building && e.code === "Digit3") doBuild("bridge");
  if (e.code === "Escape") {
    if (!eatBar.hidden) toggleEat(false);
    else if (building) toggleBuild(false);
    else openMenu();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  setPaused(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setPaused(true);
    persist();
  }
});
window.addEventListener("pagehide", () => persist());

function persist() {
  if (state && world && mode !== "guest") save(store, world.seed, state, meId, world.size);
}

// --- Menüs --------------------------------------------------------------
function panel(html: string) {
  closeOverlay();
  const el = document.createElement("div");
  el.className = "wl-panel";
  el.innerHTML = html;
  layer.append(el);
  overlay = el;
  return el;
}
function closeOverlay() {
  overlay?.remove();
  overlay = null;
}
function resume() {
  screen = "play";
  paused = false;
  closeOverlay();
}
function setPaused(v: boolean) {
  if (screen !== "play") return;
  if (v && !paused) {
    paused = true;
    panel(`<h2>Pause</h2><button class="wl-btn primary" type="button">Weiterspielen</button>`)
      .querySelector("button")!
      .addEventListener("click", () => resume());
  } else if (!v) resume();
}

const isPreset = (c: string) => (COLORS as readonly string[]).includes(c);
const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function openStart() {
  screen = "menu";
  const hasSave = !!saved;
  const el = panel(`<h2>Waldlager</h2>
    <p>Hack Holz, bau dein Zelt und ein Lagerfeuer, such Beeren – und entdecke alle Tiere des Waldes. Die Tiere tun dir nichts, und du ihnen auch nicht.</p>
    <label class="wl-field">Dein Name <input type="text" maxlength="12" value="${escapeHtml(profile.name)}" placeholder="Wanderer" autocomplete="off" /></label>
    ${RELAY_URL ? `<p class="wl-hint">Dein Name ist für alle sichtbar – nimm einen Spitznamen.</p>` : ""}
    <div class="wl-colors" role="group" aria-label="Farbe">${COLORS.map(
      (c) =>
        `<button type="button" class="wl-color" data-c="${c}" style="background:${c}" aria-label="Farbe ${c}" aria-pressed="${c === profile.color}"></button>`,
    ).join(
      "",
    )}<label class="wl-color-pick${isPreset(profile.color) ? "" : " on"}" title="Eigene Farbe"${isPreset(profile.color) || !isColor(profile.color) ? "" : ` style="background:${profile.color}"`}><input type="color" value="${isColor(profile.color) ? profile.color : COLORS[1]}" aria-label="Eigene Farbe" /><span aria-hidden="true">🎨</span></label></div>
    <button class="wl-btn primary" type="button" data-a="play">${hasSave ? "Weiterspielen" : "Los geht's"}</button>
    ${hasSave ? `<button class="wl-btn" type="button" data-a="new">Neue Welt</button>` : ""}
    <button class="wl-btn" type="button" data-a="book">Tierbuch</button>
    ${RELAY_URL ? `<section class="wl-lobby" aria-label="Offene Welten"><h3>Offene Welten</h3><div class="wl-rooms" role="list"></div></section>` : ""}
    <p><small>Laufen: WASD/Pfeile · Rennen: Umschalt · Aktion: E · Essen: Q · Bauen: B · Tierbuch: T</small></p>`);
  const input = el.querySelector("input")!;
  const takeName = () => (profile.name = input.value.trim().slice(0, 12) || "Wanderer");
  const pick = el.querySelector<HTMLInputElement>(".wl-color-pick input")!;
  const choose = (c: string, b: Element | null) => {
    profile.color = c;
    el.querySelectorAll(".wl-color").forEach((x) =>
      x.setAttribute("aria-pressed", String(x === b)),
    );
    pick.parentElement!.classList.toggle("on", !b);
    pick.parentElement!.style.background = b ? "" : c;
  };
  el.querySelectorAll<HTMLButtonElement>(".wl-color").forEach((b) =>
    b.addEventListener("click", () => choose(b.dataset.c!, b)),
  );
  // WL-AK-31/32: eigene Farbe über den Farbwähler
  const custom = () => {
    const c = pick.value.toLowerCase();
    if (isColor(c)) choose(c, el.querySelector(`.wl-color[data-c="${c}"]`));
  };
  pick.addEventListener("input", custom);
  pick.addEventListener("change", custom);
  const start = (fresh: boolean) => {
    takeName();
    if (fresh) return withLoading(() => go(true));
    go(false);
  };
  const go = (fresh: boolean) => {
    if (fresh) {
      newWorld();
      saved = null;
    }
    const p = me();
    p.name = profile.name;
    p.color = profile.color;
    persist();
    resume();
    if (p.landing <= 0)
      toast(`Hallo ${p.name}! Irgendwo auf der Insel liegt ein abgestürztes Flugzeug.`, 4);
  };
  el.querySelector('[data-a="play"]')!.addEventListener("click", () => start(false));
  el.querySelector('[data-a="new"]')?.addEventListener("click", () => start(true));
  el.querySelector('[data-a="book"]')!.addEventListener("click", () => {
    takeName();
    openBook(() => openStart());
  });
  const rooms = el.querySelector<HTMLElement>(".wl-rooms");
  if (rooms) {
    rooms.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-room]");
      if (!b || b.disabled) return;
      takeName();
      joinWorld(b.dataset.room!);
    });
    startLobby(rooms);
  }
}

/** Liste offener Welten: alle 5 Sekunden neu laden (WL-AK-15) */
function startLobby(list: HTMLElement) {
  stopLobby();
  const render = () => {
    if (!list.isConnected) return stopLobby();
    const rooms = (lobby ?? []).filter((r) => r.code !== roomCode);
    list.innerHTML = lobbyError
      ? `<p class="wl-muted">${OFFLINE}</p>`
      : !lobby
        ? `<p class="wl-muted">Suche offene Welten …</p>`
        : !rooms.length
          ? `<p class="wl-muted">Gerade ist keine andere Welt offen.</p>`
          : rooms
              .map((r) => {
                const full = r.count >= r.max;
                return `<div class="wl-room-item" role="listitem">
                  <div><b>${escapeHtml(r.host)}s Welt</b><br><small>${r.players.map(escapeHtml).join(", ")} · ${r.count} / ${r.max}</small></div>
                  <button class="wl-btn" type="button" data-room="${escapeHtml(r.code)}" ${full ? "disabled" : ""} aria-label="${escapeHtml(r.host)}s Welt beitreten">${full ? "Voll" : "Beitreten"}</button>
                </div>`;
              })
              .join("");
  };
  const load = async () => {
    try {
      const res = await fetch(`${RELAY_URL.replace(/^ws/, "http")}/rooms`, { cache: "no-store" });
      lobby = (await res.json()) as typeof lobby;
      lobbyError = !Array.isArray(lobby);
    } catch {
      lobbyError = true;
    }
    render();
  };
  render();
  void load();
  lobbyTimer = setInterval(() => void load(), 5000);
}
function stopLobby() {
  if (lobbyTimer) clearInterval(lobbyTimer);
  lobbyTimer = null;
}

/** Tierbuch (WL-AK-21/22) */
function openBook(back: () => void) {
  const items = SPECIES.map((sp) => {
    const seen = book.has(sp.id);
    const img = speciesCanvas(sp, 3).toDataURL();
    const hint =
      sp.id === UNICORN ? "Sehr selten …" : `${TIME_TEXT[sp.time]} ${HABITAT_TEXT[sp.habitat]}`;
    // WL-AK-35/36: ist die Art gerade unterwegs? (nicht beim unentdeckten Einhorn)
    const on = activeAt(sp.id, state.total);
    const now =
      !seen && sp.id === UNICORN
        ? ""
        : `<br><span class="wl-active${on ? " on" : ""}">${
            sp.id === "hai"
              ? on
                ? "🟢 Flosse ist gerade zu sehen"
                : "🌊 Gerade abgetaucht"
              : on
                ? "🟢 Jetzt unterwegs"
                : "💤 Schläft gerade"
          }</span>`;
    return `<li class="wl-animal${seen ? "" : " unseen"}" data-id="${sp.id}">
      <img src="${img}" alt="${seen ? sp.name : "unbekanntes Tier"}" />
      <div><b>${seen ? sp.name : "???"}</b><br><small>${seen ? `${TIME_TEXT[sp.time]} ${HABITAT_TEXT[sp.habitat]} · ${sp.fact}` : hint}</small>${now}</div>
    </li>`;
  }).join("");
  const el = panel(`<h2>Tierbuch</h2>
    <p class="wl-count">${book.size} / ${SPECIES.length} entdeckt</p>
    <label class="wl-field wl-search">Tier suchen <input type="search" placeholder="z. B. Hase" autocomplete="off" enterkeyhint="search" /></label>
    <ul class="wl-book">${items}</ul>
    <p class="wl-empty" hidden>Kein entdecktes Tier heißt so.</p>
    <button class="wl-btn primary" type="button" data-a="back">Zurück</button>`);
  el.classList.add("wl-panel-scroll");
  // WL-AK-33: Suche nur über entdeckte Namen – verrät nichts über unentdeckte Tiere
  const search = el.querySelector<HTMLInputElement>(".wl-search input")!;
  const rows = [...el.querySelectorAll<HTMLElement>(".wl-animal")];
  const empty = el.querySelector<HTMLElement>(".wl-empty")!;
  search.addEventListener("input", () => {
    const q = search.value.trim().toLocaleLowerCase("de");
    let shown = 0;
    SPECIES.forEach((sp, i) => {
      const ok = !q || (book.has(sp.id) && sp.name.toLocaleLowerCase("de").includes(q));
      rows[i]!.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown > 0;
  });
  el.querySelector('[data-a="back"]')!.addEventListener("click", back);
}

/** angesengte Felder (je Welt einmal als Menge) */
let scorchFor: World | null = null;
let scorchCache = new Set<number>();
function scorchSet() {
  if (scorchFor !== world) {
    scorchFor = world;
    scorchCache = new Set(world.scorch);
  }
  return scorchCache;
}
let smokeShown = 0;

/** Inselkarte (einmal je Welt gezeichnet) */
let minimap: HTMLCanvasElement | null = null;
function islandMap(): HTMLCanvasElement {
  if (minimap) return minimap;
  const c = document.createElement("canvas");
  c.width = world.size;
  c.height = world.size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(world.size, world.size);
  const col: Record<number, [number, number, number]> = {
    [T.SEA]: [31, 79, 143],
    [T.WATER]: [58, 123, 213],
    [T.FORD]: [95, 155, 216],
    [T.BRIDGE]: [139, 90, 43],
    [T.SAND]: [217, 197, 138],
    [T.GRASS]: [106, 168, 79],
    [T.FOREST]: [47, 95, 39],
    [T.ROCK]: [141, 141, 141],
    [T.WRECK]: [200, 200, 200],
  };
  for (let i = 0; i < world.terrain.length; i++) {
    const [r, gg, b] = col[world.terrain[i]!] ?? [0, 0, 0];
    const k = 1 - world.height[i]! * 0.06;
    img.data[i * 4] = r * k;
    img.data[i * 4 + 1] = gg * k;
    img.data[i * 4 + 2] = b * k;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  minimap = c;
  return c;
}

/** Funkgerät: alle Spieler mit Koordinaten und Inselkarte (WL-AK-25) */
let radioTimer: ReturnType<typeof setInterval> | null = null;
function openRadio() {
  if (screen !== "play" || !me().radio) return;
  toggleBuild(false);
  const el = panel(`<h2>📻 Funk</h2>
    <ul class="wl-radio" aria-label="Spieler"></ul>
    <canvas class="wl-map" width="256" height="256" aria-label="Inselkarte"></canvas>
    <button class="wl-btn primary" type="button" data-a="back">Zurück</button>`);
  el.classList.add("wl-panel-scroll");
  const list = el.querySelector<HTMLElement>(".wl-radio")!;
  const cv = el.querySelector<HTMLCanvasElement>(".wl-map")!;
  const g = cv.getContext("2d")!;
  const draw = () => {
    if (!el.isConnected) {
      if (radioTimer) clearInterval(radioTimer);
      radioTimer = null;
      return;
    }
    list.innerHTML = Object.values(state.players)
      .map(
        (q) =>
          `<li class="${q.id === meId ? "me" : ""}"><i style="background:${q.color}"></i><b>${escapeHtml(q.name)}</b> · X ${Math.floor(q.x)} · Y ${Math.floor(q.y)}</li>`,
      )
      .join("");
    // wie das Spielbild gedreht: Norden oben (WL-AK-44)
    const W = cv.width;
    const P = (x: number, y: number) => mapPoint(x, y, world.size, W);
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#1f4f8f";
    g.fillRect(0, 0, W, W);
    g.save();
    g.translate(W / 2, W / 2);
    g.rotate(Math.PI / 4);
    g.scale(W / (world.size * Math.SQRT2), W / (world.size * Math.SQRT2));
    g.translate(-world.size / 2, -world.size / 2);
    g.drawImage(islandMap(), 0, 0);
    g.restore();
    g.fillStyle = "#fff";
    g.font = "bold 16px system-ui";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("✈", ...P(world.plane.x + 0.5, world.plane.y + 0.5));
    g.font = "15px system-ui";
    g.fillText("🏠", ...P(world.hut.x + 0.5, world.hut.y + 0.5));
    for (const q of Object.values(state.players)) {
      const [px, py] = P(q.x, q.y);
      g.fillStyle = q.color;
      g.strokeStyle = "#fff";
      g.lineWidth = q.id === meId ? 2.5 : 1.5;
      g.beginPath();
      g.arc(px, py, q.id === meId ? 5 : 4, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    // Windrose
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.beginPath();
    g.arc(W - 26, 26, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "bold 11px system-ui";
    g.fillText("N", W - 26, 12);
    g.fillText("S", W - 26, 40);
    g.fillText("W", W - 40, 26);
    g.fillText("O", W - 12, 26);
    g.fillStyle = "#e74c3c";
    g.beginPath();
    g.moveTo(W - 26, 18);
    g.lineTo(W - 22, 27);
    g.lineTo(W - 30, 27);
    g.closePath();
    g.fill();
  };
  draw();
  if (radioTimer) clearInterval(radioTimer);
  radioTimer = setInterval(draw, 500);
  el.querySelector('[data-a="back"]')!.addEventListener("click", () => resume());
}

function openMenu() {
  if (screen !== "play") return;
  toggleBuild(false);
  const el = panel(`<h2>Menü</h2>
    <button class="wl-btn primary" type="button" data-a="resume">Weiterspielen</button>
    <button class="wl-btn" type="button" data-a="book">Tierbuch</button>
    ${mode === "guest" ? `<button class="wl-btn" type="button" data-a="leave">Welt verlassen</button>` : ""}
    ${mode !== "guest" ? `<button class="wl-btn" type="button" data-a="new">Neue Welt</button>` : ""}
    <button class="wl-btn" type="button" data-a="main">Hauptmenü</button>
    <p><small>Laufen: WASD/Pfeile oder Joystick · Rennen: Umschalt · Aktion: E · Essen: Q · Bauen: B (1 Zelt, 2 Feuer) · Tierbuch: T</small></p>`);
  el.querySelector('[data-a="resume"]')!.addEventListener("click", () => resume());
  el.querySelector('[data-a="book"]')!.addEventListener("click", () => openBook(() => openMenu()));
  el.querySelector('[data-a="new"]')?.addEventListener("click", () => {
    closeWorld();
    withLoading(() => {
      newWorld();
      persist();
      resume();
    });
  });
  el.querySelector('[data-a="leave"]')?.addEventListener("click", () => leaveGuest(null));
  el.querySelector('[data-a="main"]')!.addEventListener("click", () => {
    if (mode === "guest") leaveGuest(null);
    else {
      closeWorld();
      persist();
      openStart();
    }
  });
}

// --- Mehrspieler über WebSocket (Raum-Server) ----------------------------
const OFFLINE = "Online gerade nicht möglich – spiel einfach allein weiter.";

function connect(
  path: string,
  onMsg: (m: Record<string, unknown>) => void,
  onEnd: (opened: boolean) => void,
) {
  let opened = false;
  let sock: WebSocket;
  try {
    sock = new WebSocket(RELAY_URL + path);
  } catch {
    onEnd(false);
    return null;
  }
  sock.addEventListener("open", () => (opened = true));
  sock.addEventListener("message", (e) => {
    try {
      onMsg(JSON.parse(String(e.data)) as Record<string, unknown>);
    } catch {
      /* ungültig: ignorieren */
    }
  });
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    if (ws === sock) ws = null;
    onEnd(opened);
  };
  sock.addEventListener("close", end);
  sock.addEventListener("error", end);
  return sock;
}

function hostSend(to: string | undefined, d: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "to", to, d }));
}
function guestSend(d: GuestMsg) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(d));
}
const guests = () => Object.keys(state.players).filter((id) => id !== meId);
function dropGuests() {
  for (const id of guests()) delete state.players[id];
}

/** Gastgeber: eigene Welt für andere öffnen */
/** Gastgeber: die eigene Welt ist immer offen (automatisch, sobald man spielt) */
function openWorld() {
  if (!RELAY_URL || mode !== "solo") return;
  mode = "host";
  roomCode = null;
  ws = connect(
    "/host",
    (m) => {
      if (m.t === "room" && typeof m.code === "string") {
        roomCode = m.code;
        sendMeta();
      } else if (m.t === "from" && typeof m.id === "string") onGuestMsg(m.id, m.d);
      else if (m.t === "peer-leave" && typeof m.id === "string") {
        const p = state.players[m.id];
        if (p) toast(`${p.name} ist gegangen.`);
        delete state.players[m.id];
        sendMeta();
      }
    },
    (opened) => {
      if (mode !== "host") return;
      mode = "solo";
      roomCode = null;
      dropGuests();
      nextOpenTry = now() + 30_000;
      if (opened) toast("Verbindung zum Raum-Server verloren – du spielst allein weiter.", 4);
    },
  );
}

/** Name und Spieler für die Liste offener Welten melden */
function sendMeta() {
  if (mode !== "host" || ws?.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      t: "meta",
      host: me().name,
      players: Object.values(state.players).map((p) => p.name),
    }),
  );
}

function closeWorld() {
  if (mode !== "host") return;
  mode = "solo";
  roomCode = null;
  const s = ws;
  ws = null;
  s?.close();
  dropGuests();
}

function onGuestMsg(id: string, d: unknown) {
  const g = parseGuest(d);
  if (!g) return;
  if (g.k === "hello") {
    if (!state.players[id]) {
      if (Object.keys(state.players).length >= 6) return;
      addPlayer(world, state, id, g.name, g.color);
      toast(`${state.players[id]!.name} ist in deine Welt gekommen!`, 3);
      sendMeta();
    }
    hostSend(id, { v: 1, k: "welcome", seed: world.seed });
    hostSend(id, toSnap(world, state, [state.players[id]!]));
    return;
  }
  const p = state.players[id];
  if (!p) return;
  const say = (text: string | null) => text && hostSend(id, { v: 1, k: "toast", text });
  switch (g.k) {
    case "move":
      if (inside(world, Math.floor(g.x), Math.floor(g.y))) {
        p.x = g.x;
        p.y = g.y;
      }
      p.fx = g.fx;
      p.fy = g.fy;
      p.moving = g.moving;
      p.running = g.running && !p.exhausted;
      if (g.moving) {
        p.sleeping = false;
        p.chop = null;
      }
      break;
    case "act":
      say(act(world, state, p));
      break;
    case "eat":
      say(eat(p, g.food));
      break;
    case "build":
      say(build(world, state, p, g.kind));
      break;
  }
}

/** Gast: einer fremden Welt beitreten */
function joinWorld(code: string) {
  if (!RELAY_URL) return;
  stopLobby();
  closeWorld();
  persist();
  let myId = "";
  mode = "guest";
  gotSnap = false;
  ws = connect(
    `/join/${code}`,
    (m) => {
      if (m.t === "joined" && typeof m.id === "string") {
        myId = m.id;
        guestSend({ v: 1, k: "hello", name: profile.name || "Wanderer", color: profile.color });
      } else if (m.t === "error") {
        leaveGuest(
          m.reason === "full"
            ? "Diese Welt ist schon voll (6 Spieler)."
            : "Diesen Raum gibt es nicht – prüf den Code.",
        );
      } else if (m.t === "closed") leaveGuest("Der Gastgeber hat die Welt verlassen.");
      else if (m.t === "msg") {
        const h = parseHost(m.d);
        if (!h) return;
        if (h.k === "welcome") {
          worldReady = false;
          withLoading(() => {
            world = generateWorld(h.seed);
            state = createState(world);
            state.players = {};
            meId = myId;
            addPlayer(world, state, meId, profile.name, profile.color);
            bushAt = null;
            minimap = null;
            worldReady = true;
            resume();
          });
        } else if (h.k === "snap" && meId === myId && worldReady) {
          applySnap(state, h, meId, !gotSnap);
          if (!state.players[meId]) addPlayer(world, state, meId, profile.name, profile.color);
          gotSnap = true;
        } else if (h.k === "toast") toast(h.text, 1.5);
      }
    },
    (opened) => {
      if (mode === "guest") leaveGuest(opened ? "Der Gastgeber hat die Welt verlassen." : OFFLINE);
    },
  );
}

function leaveGuest(reason: string | null) {
  if (mode !== "guest") return;
  mode = "solo";
  const s = ws;
  ws = null;
  s?.close();
  const own = load(store);
  if (own) {
    world = own.world;
    state = own.state;
    meId = own.me;
    bushAt = null;
  } else newWorld();
  minimap = null;
  if (!reason) return openStart();
  screen = "menu";
  panel(`<h2>Welt verlassen</h2><p role="alert">${reason}</p>
    <button class="wl-btn primary" type="button">Zum Menü</button>`)
    .querySelector("button")!
    .addEventListener("click", () => openStart());
}

function netTick(dt: number) {
  netTimer += dt;
  if (netTimer < 0.1) return;
  netTimer = 0;
  if (mode === "host" && guests().length)
    hostSend(
      undefined,
      toSnap(
        world,
        state,
        guests().map((id) => state.players[id]!),
      ),
    );
  metaTimer += 0.1;
  if (metaTimer >= 10) {
    metaTimer = 0;
    sendMeta();
  }
  if (mode === "guest" && gotSnap) {
    const p = me();
    guestSend({
      v: 1,
      k: "move",
      x: p.x,
      y: p.y,
      fx: p.fx,
      fy: p.fy,
      moving: p.moving,
      running: p.running,
    });
  }
}

// --- Darstellung (Phaser) ----------------------------------------------
let debrisAt: Map<number, number> | null = null;
let debrisWorld: World | null = null;
const debrisIndex = () => {
  if (!debrisAt || debrisWorld !== world) {
    debrisAt = new Map();
    debrisWorld = world;
    world.debris.forEach((d, i) => debrisAt!.set(idx(world, d.x, d.y), i));
  }
  return debrisAt;
};
const bushIndex = () => {
  if (!bushAt) {
    bushAt = new Map();
    world.bushes.forEach((b, i) => bushAt!.set(idx(world, b.x, b.y), i));
  }
  return bushAt;
};
const hAt = (x: number, y: number) => {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  return inside(world, cx, cy) ? world.height[idx(world, cx, cy)]! : 0;
};
const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

class WorldScene extends Phaser.Scene {
  ground: Phaser.GameObjects.Image[] = [];
  objects: Phaser.GameObjects.Image[] = [];
  dyn = new Map<string, Phaser.GameObjects.Image>();
  labels = new Map<string, Phaser.GameObjects.Text>();
  ghost!: Phaser.GameObjects.Image;
  prevX = new WeakMap<object, number>();

  constructor() {
    super("world");
  }

  create() {
    addTextures(this.textures);
    this.ghost = this.add.image(0, 0, "ghost").setOrigin(0.5, 0).setVisible(false);
    this.cameras.main.setRoundPixels(true);
    this.scale.on("resize", () => this.fitZoom());
    this.fitZoom();
  }

  fitZoom() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setZoom(Math.max(2, Math.min(4, Math.round(Math.min(w, h * 1.2) / 280))));
  }

  pool(list: Phaser.GameObjects.Image[], i: number) {
    let im = list[i];
    if (!im) {
      im = this.add.image(0, 0, "stump");
      list.push(im);
    }
    im.setVisible(true);
    return im;
  }

  sprite(id: string, key: string) {
    let s = this.dyn.get(id);
    if (!s) {
      s = this.add.image(0, 0, key);
      this.dyn.set(id, s);
    }
    if (s.texture.key !== key) s.setTexture(key);
    s.setVisible(true);
    return s;
  }

  override update(time: number, delta: number) {
    tick(Math.min(0.1, delta / 1000));
    const p = me();
    const cam = this.cameras.main;
    const lift = p.landing > 0 ? (p.landing / 3) * 100 : 0;
    cam.centerOn(
      Math.round(isoX(p.x, p.y)),
      Math.round(isoY(p.x, p.y, hAt(p.x, p.y)) - 10 - lift * 0.6),
    );
    const v = cam.worldView;
    const corners = [
      [v.x, v.y],
      [v.right, v.y],
      [v.x, v.bottom + 4 * HS],
      [v.right, v.bottom + 4 * HS],
    ] as const;
    const xs = corners.map(([a, b]) => tileX(a, b));
    const ys = corners.map(([a, b]) => tileY(a, b));
    const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 1);
    const x1 = Math.min(world.size - 1, Math.ceil(Math.max(...xs)) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 1);
    const y1 = Math.min(world.size - 1, Math.ceil(Math.max(...ys)) + 1);
    let gi = 0;
    let oi = 0;
    const bushes = bushIndex();
    const shrooms = new Set(state.mushrooms);
    const scorched = scorchSet();
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const sx = isoX(x, y);
        const i = idx(world, x, y);
        const h = world.height[i]!;
        const sy = isoY(x, y, h);
        if (sx < v.x - 20 || sx > v.right + 20 || sy < v.y - 50 || sy > v.bottom + 10) continue;
        const t = world.terrain[i]!;
        this.pool(this.ground, gi++)
          .setTexture(tileKey(state.bridges[i] ? T.BRIDGE : t, hash(x, y) % 3))
          .setOrigin(0.5, 0)
          .setPosition(sx, sy)
          .setDepth(-1e6 + (x + y) * 4 + h);
        const cx = isoX(x + 0.5, y + 0.5);
        const cy = isoY(x + 0.5, y + 0.5, h);
        if (scorched.has(i))
          this.pool(this.ground, gi++)
            .setTexture("scorch")
            .setOrigin(0.5, 0)
            .setPosition(sx, sy)
            .setDepth(-1e6 + (x + y) * 4 + h + 1);
        const tree = world.treeAt[i]!;
        if (tree && world.trees[tree - 1]!.fallen && !isStump(state, tree - 1)) {
          // umgeknickter, angekohlter Stamm in der Absturz-Schneise (WL-AK-46)
          this.pool(this.objects, oi++)
            .setTexture(`fallen${hash(x, y) & 1}`)
            .setOrigin(0.5, 0.7)
            .setPosition(cx, cy)
            .setDepth((x + y + 1) * 10);
        } else if (tree) {
          const stump = isStump(state, tree - 1);
          this.pool(this.objects, oi++)
            .setTexture(
              stump
                ? "stump"
                : `${hasApples(world, state, tree - 1) ? "apple" : "tree"}${hash(x, y) & 1}`,
            )
            .setOrigin(0.5, stump ? 0.7 : 0.94)
            .setPosition(cx, cy)
            .setDepth((x + y + 1) * 10);
        }
        const db = debrisIndex().get(i);
        if (db !== undefined)
          this.pool(this.objects, oi++)
            .setTexture(`debris${db % 3}`)
            .setOrigin(0.5, 0.7)
            .setPosition(cx, cy)
            .setDepth((x + y + 1) * 10);
        if (x === world.hut.x && y === world.hut.y)
          this.pool(this.objects, oi++)
            .setTexture("hut")
            .setOrigin(0.5, 0.82)
            .setPosition(cx, cy)
            .setDepth((x + y + 1) * 10);
        if (shrooms.has(i))
          this.pool(this.objects, oi++)
            .setTexture("mushroom")
            .setOrigin(0.5, 0.8)
            .setPosition(cx, cy)
            .setDepth((x + y + 1) * 10);
        const b = bushes.get(i);
        if (b !== undefined)
          this.pool(this.objects, oi++)
            .setTexture(state.berries[b]! > 0 ? "bush" : "bushEmpty")
            .setOrigin(0.5, 0.85)
            .setPosition(cx, cy)
            .setDepth((x + y + 1) * 10);
      }
    for (let k = gi; k < this.ground.length; k++) this.ground[k]!.setVisible(false);
    for (let k = oi; k < this.objects.length; k++) this.objects[k]!.setVisible(false);

    // Bewegliches: Zelte, Feuer, Figuren, Tiere
    const seen = new Set<string>();
    const place = (id: string, key: string, x: number, y: number, oy = 1) => {
      seen.add(id);
      return this.sprite(id, key)
        .setOrigin(0.5, oy)
        .setPosition(Math.round(isoX(x, y)), Math.round(isoY(x, y, hAt(x, y))))
        .setDepth((x + y) * 10 + 1);
    };
    for (const q of Object.values(state.players)) {
      if (q.tent)
        place(`tent:${q.id}`, addTent(this.textures, q.color), q.tent.x + 0.5, q.tent.y + 0.5, 0.8);
    }
    const flick = Math.floor(time / 160) % 2;
    for (const f of state.fires)
      place(
        `fire:${f.id}`,
        f.until > state.total ? `fire${flick}` : "ash",
        f.x + 0.5,
        f.y + 0.5,
        0.9,
      );
    // Flugzeugwrack mit Rauchsäule (WL-AK-47)
    const pl = world.plane;
    smokeShown = 0;
    if (Math.abs(pl.x - p.x) < 60 && Math.abs(pl.y - p.y) < 60) {
      if (Math.abs(pl.x - p.x) < 40 && Math.abs(pl.y - p.y) < 40)
        place("wreck", "wreck", pl.x + 0.5, pl.y + 0.5, 0.72).setDepth((pl.x + pl.y + 3) * 10);
      const N = 14;
      for (let k = 0; k < N; k++) {
        const ph = (time / 9000 + k / N) % 1;
        const sp = place(`smoke:${k}`, "smoke", pl.x + 0.5, pl.y + 0.5, 0.5);
        sp.setPosition(sp.x + 6 + ph * 40 + Math.sin(ph * 6 + k) * 4, sp.y - 18 - ph * 190)
          .setScale(0.6 + ph * 2.4)
          .setAlpha((1 - ph) * 0.75)
          .setDepth(1e6 - 10);
        smokeShown++;
      }
    }
    for (const q of Object.values(state.players)) {
      if (q.sleeping) continue;
      const s = place(`p:${q.id}`, addPlayerTex(this.textures, q.color), q.x, q.y);
      if (q.landing > 0) {
        // Fallschirm: schwebt von oben herab
        s.y -= Math.round((q.landing / 3) * 100);
        s.x += Math.round(Math.sin(time / 300) * 3);
        const c = place(`chute:${q.id}`, addChute(this.textures, q.color), q.x, q.y);
        c.setPosition(s.x, s.y - 16).setDepth(s.depth + 1);
      }
      if (q.moving) s.y -= Math.floor(time / 120) % 2;
      if (q.moving || q.chop) s.setFlipX(isoX(q.fx, q.fy) < 0);
      if (q.id !== meId) {
        seen.add(`l:${q.id}`);
        let l = this.labels.get(q.id);
        if (!l) {
          l = this.add.text(0, 0, q.name, {
            fontFamily: "system-ui",
            fontSize: "8px",
            color: "#fff",
          });
          l.setOrigin(0.5, 1).setResolution(4);
          this.labels.set(q.id, l);
        }
        l.setPosition(s.x, s.y - 24)
          .setDepth(1e6)
          .setVisible(true);
      }
    }
    // Regenbogenspur des Einhorns (WL-AK-37), nur in der Nähe der Figur
    for (const [k, until] of Object.entries(state.trail)) {
      const left = until - state.total;
      const i = Number(k);
      const tx = i % world.size;
      const ty = Math.floor(i / world.size);
      if (left <= 0 || Math.abs(tx - p.x) > TRAIL_VIEW || Math.abs(ty - p.y) > TRAIL_VIEW) continue;
      place(`tr:${k}`, "rainbow", tx + 0.5, ty + 0.5, 0.5)
        .setDepth((tx + ty) * 10 - 2)
        .setScale(1.4)
        .setAlpha(Math.min(1, left / 60) * (0.75 + 0.25 * Math.sin(time / 250 + i)));
    }
    state.animals.forEach((a, k) => {
      if (hiddenAt(a.kind, state.total)) return;
      const s = place(`a:${k}`, `animal:${a.kind}`, a.x, a.y);
      if (a.kind === UNICORN) {
        s.setAlpha(0.85 + Math.sin(time / 200) * 0.15);
        const sp = place(`sp:${k}`, "sparkle", a.x + Math.sin(time / 300) * 0.6, a.y - 0.4);
        sp.setAlpha(0.5 + 0.5 * Math.sin(time / 150)).setDepth(s.depth + 1);
      } else s.setAlpha(1);
      const prev = this.prevX.get(a);
      const sx = isoX(a.x, a.y);
      if (prev !== undefined && Math.abs(sx - prev) > 0.01) s.setFlipX(sx < prev);
      this.prevX.set(a, sx);
    });
    for (const [id, s] of this.dyn) if (!seen.has(id)) s.setVisible(false);
    for (const [id, l] of this.labels) if (!seen.has(`l:${id}`)) l.setVisible(false);

    // Bauplatz anzeigen
    if (building && screen === "play") {
      const spot = buildSpot(p);
      const ok =
        canBuildAt(world, state, spot.x, spot.y) || canBridgeAt(world, state, spot.x, spot.y);
      this.ghost
        .setTexture(ok ? "ghost" : "ghostBad")
        .setPosition(isoX(spot.x, spot.y), isoY(spot.x, spot.y, hAt(spot.x, spot.y)))
        .setDepth(-1e5)
        .setVisible(true);
    } else this.ghost.setVisible(false);

    drawNight(cam, time);
  }
}

/** Dämmerung und Nacht mit Lichtkreisen um Feuer und Figur (WL-AK-08) */
function drawNight(cam: Phaser.Cameras.Scene2D.Camera, time: number) {
  const { dark, dusk } = darkness(state.total);
  const w = Math.ceil(stage.clientWidth / 3);
  const h = Math.ceil(stage.clientHeight / 3);
  if (night.width !== w || night.height !== h) {
    night.width = w;
    night.height = h;
  }
  nightCtx.globalCompositeOperation = "source-over";
  nightCtx.clearRect(0, 0, w, h);
  lastDark = dark;
  if (dark <= 0.01 && dusk <= 0.01) return;
  nightCtx.fillStyle = `rgba(255,110,40,${dusk * 0.22})`;
  nightCtx.fillRect(0, 0, w, h);
  nightCtx.fillStyle = `rgba(8,12,38,${dark})`;
  nightCtx.fillRect(0, 0, w, h);
  nightCtx.globalCompositeOperation = "destination-out";
  const v = cam.worldView;
  const scale = cam.zoom / 3;
  const light = (x: number, y: number, r: number) => {
    const sx = (isoX(x, y) - v.x) * scale;
    const sy = (isoY(x, y, hAt(x, y)) - 8 - v.y) * scale;
    const rr = r * 16 * scale;
    const g = nightCtx.createRadialGradient(sx, sy, rr * 0.15, sx, sy, rr);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    nightCtx.fillStyle = g;
    nightCtx.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  };
  for (const f of state.fires)
    if (f.until > state.total) light(f.x + 0.5, f.y + 0.5, 6 + Math.sin(time / 90) * 0.3);
  for (const q of Object.values(state.players)) if (!q.sleeping) light(q.x, q.y, 2.4);
  // die Brandstelle glimmt nachts (WL-AK-47)
  light(world.plane.x + 0.5, world.plane.y + 0.5, 2.2 + Math.sin(time / 140) * 0.25);
  {
    const ex = (isoX(world.plane.x + 0.5, world.plane.y + 0.5) - v.x) * scale;
    const ey =
      (isoY(world.plane.x + 0.5, world.plane.y + 0.5, hAt(world.plane.x, world.plane.y)) - v.y) *
      scale;
    const rr = 2.6 * 16 * scale;
    nightCtx.globalCompositeOperation = "source-over";
    const og = nightCtx.createRadialGradient(ex, ey, 0, ex, ey, rr);
    og.addColorStop(0, `rgba(255,120,30,${0.28 * dark + 0.06 * Math.sin(time / 120)})`);
    og.addColorStop(1, "rgba(255,120,30,0)");
    nightCtx.fillStyle = og;
    nightCtx.fillRect(ex - rr, ey - rr, rr * 2, rr * 2);
  }
  // die Regenbogenspur leuchtet auch nachts (WL-AK-37)
  const me0 = state.players[meId];
  if (me0)
    for (const [k, until] of Object.entries(state.trail)) {
      const i = Number(k);
      const tx = i % world.size;
      const ty = Math.floor(i / world.size);
      if (
        until > state.total &&
        Math.abs(tx - me0.x) <= TRAIL_VIEW &&
        Math.abs(ty - me0.y) <= TRAIL_VIEW
      )
        light(tx + 0.5, ty + 0.5, 0.9);
    }
}
const TRAIL_VIEW = 24;
let lastDark = 0;

// --- Spielschleife ---------------------------------------------------------
function tick(dt: number) {
  if (now() > toastUntil) toastEl.textContent = "";
  if (canPlay()) {
    const k = (...c: string[]) => c.some((x) => keys.has(x));
    const ix = (k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0) + stick.x;
    const iy = (k("KeyS", "ArrowDown") ? 1 : 0) - (k("KeyW", "ArrowUp") ? 1 : 0) + stick.y;
    const run = k("ShiftLeft", "ShiftRight") || Math.hypot(stick.x, stick.y) > 0.95;
    movePlayer(world, state, me(), { x: ix, y: iy, run }, dt);
    // Aktionstaste gedrückt halten: weiter hacken
    if (k("KeyE", "Space") && actionFor(world, state, me())?.kind === "chop") {
      chopTimer -= dt;
      if (chopTimer <= 0) {
        doAct();
        chopTimer = 0.45;
      }
    }
    if (mode !== "guest") for (const ev of stepWorld(world, state, dt)) onEvent(ev);
    saveTimer += dt;
    if (saveTimer > 5) {
      saveTimer = 0;
      persist();
    }
  } else if (screen === "play") {
    movePlayer(world, state, me(), { x: 0, y: 0, run: false }, dt);
    // Mit anderen läuft die Welt weiter (WL-AK-17)
    if (mode === "host" && guests().length)
      for (const ev of stepWorld(world, state, dt)) onEvent(ev);
  }
  if (mode !== "solo") netTick(dt);
  // Welt immer offen: im Hintergrund verbinden bzw. alle 30 s neu versuchen
  if (RELAY_URL && mode === "solo" && screen === "play" && now() >= nextOpenTry) {
    nextOpenTry = now() + 30_000;
    openWorld();
  }
  // Nach der Fallschirm-Landung
  if (screen === "play" && state.players[meId]) {
    const landing = me().landing > 0;
    if (wasLanding && !landing)
      toast(
        "Gelandet! Irgendwo auf der Insel liegt ein abgestürztes Flugzeug – dort findest du ein Funkgerät.",
        5,
      );
    wasLanding = landing;
  }
  // Tiere entdecken
  seeTimer += dt;
  if (screen === "play" && seeTimer >= 0.25 && (mode !== "guest" || gotSnap)) {
    seeTimer = 0;
    const fresh = discover(
      book,
      visibleAnimals(state, me()).map((a) => a.kind),
    );
    if (fresh.length) {
      saveBook(store, book);
      const sp = speciesById(fresh[fresh.length - 1]!)!;
      toast(sp.id === UNICORN ? "✨ Ein Einhorn! ✨" : `Neu entdeckt: ${sp.name}!`, 3.5);
    }
  }
  updateHud();
}
const now = () => performance.now();
function onEvent(ev: { player: string; text: string }) {
  if (ev.player === meId) toast(ev.text, 3);
  else if (mode === "host") hostSend(ev.player, { v: 1, k: "toast", text: ev.text });
}

function updateHud() {
  const p = me();
  for (const k of ["hunger", "rest", "fitness"] as const) {
    const el = $(`[data-n="${k}"]`);
    const v = Math.round(p.needs[k]);
    el.querySelector<HTMLElement>("b")!.style.width = `${v}%`;
    el.classList.toggle("low", v <= 20);
    el.title = `${v} %`;
  }
  hud("wood").textContent = `🪵 ${p.wood}`;
  hud("berries").textContent = `🫐 ${p.berries}`;
  for (const k of ["apples", "mushrooms", "cans"] as const) {
    const el = hud(k);
    el.hidden = p[k] <= 0;
    el.textContent = `${FOODS[k].icon} ${p[k]}`;
  }
  hud("clock").textContent =
    `${phaseOf(state.total) === "nacht" ? "🌙" : "☀️"} ${clockOf(state.total)}`;
  // Kompass: Nadel zur Hütte, sobald man das Funkgerät (mit Karte) hat (WL-AK-44/45)
  hutAngle = p.radio ? bearing(world.hut.x + 0.5 - p.x, world.hut.y + 0.5 - p.y) : null;
  needle.hidden = hutAngle === null;
  if (hutAngle !== null) needle.style.transform = `rotate(${hutAngle.toFixed(1)}deg)`;
  const room = hud("room");
  room.hidden = mode === "solo" || (mode === "host" && !roomCode);
  room.textContent =
    mode === "host"
      ? `Online · ${Object.keys(state.players).length}`
      : `Gast · ${Object.keys(state.players).length}`;
  $<HTMLButtonElement>('[data-b="radio"]').hidden = !p.radio;
  const a = screen === "play" ? actionFor(world, state, p) : null;
  actBtn.textContent = a ? a.label : "Aktion";
  actBtn.disabled = !a;
}

// --- Start --------------------------------------------------------------
panel(`<h2>Die Insel entsteht …</h2><p>Gleich geht's los.</p>`);
await new Promise((r) => setTimeout(r, 40));
saved = load(store);
if (saved) {
  world = saved.world;
  state = saved.state;
  meId = saved.me;
  profile = { name: me().name, color: me().color };
} else newWorld();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: "#1e3a1a",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: stage.clientWidth, height: stage.clientHeight },
  scene: [WorldScene],
  banner: false,
});
openStart();

/** Welche Aktion gäbe es an (x, y)? (nur für Test-Hilfen) */
function actionAt(x: number, y: number) {
  const p = me();
  const [ox, oy] = [p.x, p.y];
  p.x = x;
  p.y = y;
  const a = actionFor(world, state, p)?.kind ?? null;
  p.x = ox;
  p.y = oy;
  return a;
}
function standFor(
  tx: number,
  ty: number,
  kinds: string[],
): [number, number, number, number] | null {
  for (const [dx, dy] of [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ] as const) {
    const sx = tx + dx;
    const sy = ty + dy;
    if (!free(world, state, sx, sy)) continue;
    const a = actionAt(sx + 0.5, sy + 0.5);
    if (a && kinds.includes(a)) return [tx, ty, sx, sy];
  }
  return null;
}

if (debugEnabled) {
  window.__dampf = {
    state: () => {
      const p = me();
      return {
        screen: paused ? "paused" : overlay && screen === "play" ? "menu" : screen,
        total: state.total,
        trail: Object.keys(state.trail).length,
        hutAngle,
        smoke: smokeShown,
        hut: world.hut,
        clock: clockOf(state.total),
        phase: phaseOf(state.total),
        dark: lastDark,
        seed: world.seed,
        start: world.start,
        me: {
          name: p.name,
          color: p.color,
          x: p.x,
          y: p.y,
          needs: p.needs,
          wood: p.wood,
          berries: p.berries,
          apples: p.apples,
          mushrooms: p.mushrooms,
          cans: p.cans,
          tent: p.tent,
          sleeping: p.sleeping,
          radio: p.radio,
          landing: p.landing,
          home: p.home,
        },
        action: actionFor(world, state, p)?.kind ?? null,
        fires: state.fires.map((f) => ({
          x: f.x,
          y: f.y,
          burning: f.until > state.total,
          left: f.until - state.total,
        })),
        stumps: Object.keys(state.stumps).length,
        animals: state.animals.length,
        building,
        fireBurn: FIRE.burn,
        mode,
        roomCode,
        players: Object.values(state.players).map((q) => ({
          id: q.id,
          name: q.name,
          x: q.x,
          y: q.y,
        })),
        stumpList: Object.keys(state.stumps).map(Number),
        book: [...book],
        debris: world.debris,
        bridges: Object.keys(state.bridges).map(Number),
        plane: { x: world.plane.x, y: world.plane.y, cells: world.plane.cells },
        size: world.size,
        lobby,
        lobbyError,
        visible: visibleAnimals(state, p).map((a) => a.kind),
      };
    },
    teleport: (x, y, fx, fy) => {
      const p = me();
      p.x = x;
      p.y = y;
      if (fx !== undefined && fy !== undefined) {
        p.fx = fx;
        p.fy = fy;
      }
    },
    finishLanding: () => {
      me().landing = 0;
    },
    markTrail: (x, y) => markTrail(world, state, x, y),
    cell: (x, y) => ({
      terrain: inside(world, x, y) ? world.terrain[idx(world, x, y)]! : -1,
      free: free(world, state, x, y),
      tree: inside(world, x, y) ? world.treeAt[idx(world, x, y)]! : 0,
    }),
    riverSpot: () => {
      // freies Ufer-Feld mit Flusswasser direkt daneben, möglichst nah: [x, y, fx, fy]
      const p = me();
      let best: [number, number, number, number] | null = null;
      let bd = Infinity;
      for (let y = 1; y < world.size - 1; y++)
        for (let x = 1; x < world.size - 1; x++) {
          if (world.terrain[idx(world, x, y)] !== T.WATER) continue;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const bx = x + dx;
            const by = y + dy;
            if (!free(world, state, bx, by) || world.terrain[idx(world, bx, by)] === T.WATER)
              continue;
            // über den Fluss (höchstens 4 Wasserfelder) muss ein freies Landfeld folgen
            let k = 0;
            while (k < 5 && world.terrain[idx(world, x - dx * k, y - dy * k)] === T.WATER) k++;
            const ex = x - dx * k;
            const ey = y - dy * k;
            if (k > 4 || !inside(world, ex, ey) || !free(world, state, ex, ey)) continue;
            const d = Math.hypot(bx - p.x, by - p.y);
            if (d < bd) {
              bd = d;
              best = [bx, by, -dx, -dy];
            }
          }
        }
      return best;
    },
    nearestAnimal: () => {
      const p = me();
      let best: [number, number, string] | null = null;
      let bd = Infinity;
      for (const a of state.animals) {
        if (hiddenAt(a.kind, state.total) || book.has(a.kind)) continue;
        const d = Math.hypot(a.x - p.x, a.y - p.y);
        if (d < bd) {
          bd = d;
          best = [a.x, a.y, a.kind];
        }
      }
      return best;
    },
    setTime: (t) => {
      state.total = t;
    },
    setNeeds: (n) => {
      Object.assign(me().needs, n);
    },
    nearestTree: () => {
      const p = me();
      let best: [number, number, number, number] | null = null;
      let bd = Infinity;
      world.trees.forEach((t, k) => {
        if (isStump(state, k)) return;
        for (const [dx, dy] of [
          [-1, 0],
          [0, -1],
          [1, 0],
          [0, 1],
        ] as const) {
          if (!free(world, state, t.x + dx, t.y + dy)) continue;
          // kein Strauch in Reichweite, sonst wäre „pflücken“ die nähere Aktion
          if (world.bushes.some((b) => Math.hypot(b.x - (t.x + dx), b.y - (t.y + dy)) < 2.5))
            continue;
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d >= bd) continue;
          // von dort muss „Holz hacken“ die Aktion sein (nicht Äpfel/Pilz)
          if (actionAt(t.x + dx + 0.5, t.y + dy + 0.5) !== "chop") continue;
          bd = d;
          best = [t.x, t.y, t.x + dx, t.y + dy];
        }
      });
      return best;
    },
    // Hütte und Apfelbaum (WL-AK-43): Stehfeld, von dem aus die Aktion passt
    fallenTree: () => {
      const t = world.trees.find((q) => q.fallen);
      return t ? [t.x, t.y] : null;
    },
    hutSpot: () => standFor(world.hut.x, world.hut.y, ["open", "hutsleep"]),
    appleSpot: () => {
      const p = me();
      const trees = world.trees
        .map((t, k) => ({ t, k, d: Math.hypot(t.x - p.x, t.y - p.y) }))
        .filter((o) => hasApples(world, state, o.k))
        .sort((a, b) => a.d - b.d);
      for (const o of trees) {
        const r = standFor(o.t.x, o.t.y, ["shake"]);
        if (r) return r;
      }
      return null;
    },
    nearestBush: () => {
      const p = me();
      let best: [number, number] | null = null;
      let bd = Infinity;
      world.bushes.forEach((b, k) => {
        if (state.berries[k]! <= 0) return;
        for (const [dx, dy] of [
          [0, -1],
          [-1, 0],
          [1, 0],
          [0, 1],
        ] as const)
          if (
            free(world, state, b.x + dx, b.y + dy) &&
            // dort muss „Beeren pflücken“ die nächste Aktion sein (kein Baum näher)
            actionFor(world, state, { ...p, x: b.x + dx + 0.5, y: b.y + dy + 0.5 })?.kind === "pick"
          ) {
            const d = Math.hypot(b.x - p.x, b.y - p.y);
            if (d < bd) {
              bd = d;
              best = [b.x + dx, b.y + dy];
            }
            break;
          }
      });
      return best;
    },
    buildSpot: () => {
      const p = me();
      for (let r = 0; r < 20; r++)
        for (let y = Math.floor(p.y) - r; y <= Math.floor(p.y) + r; y++)
          for (let x = Math.floor(p.x) - r; x <= Math.floor(p.x) + r; x++)
            if (
              free(world, state, x, y) &&
              canBuildAt(world, state, x + 1, y) &&
              !world.trees.some((t, k) => !isStump(state, k) && Math.hypot(t.x - x, t.y - y) < 2.5)
            )
              return [x, y, 1, 0];
      return null;
    },
  };
}
