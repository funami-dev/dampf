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
  addPlayer,
  build,
  buildSpot,
  canBuildAt,
  createState,
  eat,
  free,
  isStump,
  movePlayer,
  stepWorld,
  type Player,
  type State,
} from "./logic/sim.ts";
import { browserStore, load, save } from "./logic/save.ts";
import { applySnap, parseGuest, parseHost, toSnap, type GuestMsg } from "./logic/protocol.ts";
import { generateWorld, idx, inside, type World } from "./logic/world.ts";
import { HS, isoX, isoY, tileX, tileY } from "./render/iso.ts";
import { addPlayerTex, addTent, addTextures, tileKey } from "./render/textures.ts";
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
const stage = mountGameShell({ title: manifest.title });
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
      <div class="wl-inv"><span data-h="wood">🪵 0</span> <span data-h="berries">🫐 0</span></div>
    </div>
    <div class="wl-side">
      <div class="wl-clock" data-h="clock">07:00</div>
      <div class="wl-room" data-h="room" hidden></div>
      <button class="wl-btn" type="button" data-b="menu">Menü</button>
    </div>
  </div>
  <div class="wl-toast" role="status"></div>
  <div class="wl-buildbar" hidden>
    <button class="wl-btn" type="button" data-b="tent">Zelt (${COSTS.tent} Holz)</button>
    <button class="wl-btn" type="button" data-b="fire">Lagerfeuer (${COSTS.fire} Holz)</button>
    <button class="wl-btn" type="button" data-b="cancel">✕</button>
  </div>
  <div class="wl-bottom">
    <div class="wl-stick" role="slider" aria-label="Laufen"><div class="wl-knob"></div></div>
    <div class="wl-actions">
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
const me = (): Player => state.players[meId]!;

let profile = { name: "", color: COLORS[1] as string };
const saved = load(store);
if (saved) {
  world = saved.world;
  state = saved.state;
  meId = saved.me;
  profile = { name: me().name, color: me().color };
} else newWorld();

function newWorld(seed = Date.now() & 0x7fffffff || 1) {
  world = generateWorld(seed);
  state = createState(world);
  meId = "me";
  addPlayer(world, state, meId, profile.name, profile.color);
  bushAt = null;
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
function doEat() {
  if (!canPlay()) return;
  if (mode === "guest") return guestSend({ v: 1, k: "eat" });
  toast(eat(me()), 1.5);
}
function toggleBuild(on = !building) {
  if (!canPlay() && on) return;
  building = on;
  buildBar.hidden = !on;
}
function doBuild(kind: "tent" | "fire") {
  if (!canPlay()) return;
  if (mode === "guest") {
    guestSend({ v: 1, k: "build", kind });
    toggleBuild(false);
    return;
  }
  if (kind === "tent") addTent(game.textures, me().color);
  const msg = build(world, state, me(), kind);
  toast(msg);
  if (/steht|brennt/.test(msg)) toggleBuild(false);
}

actBtn.addEventListener("click", () => doAct());
$('[data-b="eat"]').addEventListener("click", () => doEat());
$('[data-b="build"]').addEventListener("click", () => toggleBuild());
$('[data-b="tent"]').addEventListener("click", () => doBuild("tent"));
$('[data-b="fire"]').addEventListener("click", () => doBuild("fire"));
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
  if (e.code === "KeyB") toggleBuild();
  if (building && e.code === "Digit1") doBuild("tent");
  if (building && e.code === "Digit2") doBuild("fire");
  if (e.code === "Escape") {
    if (building) toggleBuild(false);
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
  if (state && world && mode !== "guest") save(store, world.seed, state, meId);
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

const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function openStart() {
  screen = "menu";
  const hasSave = !!saved;
  const el = panel(`<h2>Waldlager</h2>
    <p>Hack Holz, bau dein Zelt und ein Lagerfeuer und such Beeren, bevor es dunkel wird. Die Tiere im Wald tun dir nichts – und du ihnen auch nicht.</p>
    <label class="wl-field">Dein Name <input type="text" maxlength="12" value="${escapeHtml(profile.name)}" placeholder="Wanderer" autocomplete="off" /></label>
    <div class="wl-colors" role="group" aria-label="Farbe">${COLORS.map(
      (c) =>
        `<button type="button" class="wl-color" data-c="${c}" style="background:${c}" aria-label="Farbe ${c}" aria-pressed="${c === profile.color}"></button>`,
    ).join("")}</div>
    <button class="wl-btn primary" type="button" data-a="play">${hasSave ? "Weiterspielen" : "Los geht's"}</button>
    ${hasSave ? `<button class="wl-btn" type="button" data-a="new">Neue Welt</button>` : ""}
    ${RELAY_URL ? `<button class="wl-btn" type="button" data-a="join">Einer Welt beitreten</button>` : ""}
    <p><small>Laufen: WASD/Pfeile · Rennen: Umschalt · Aktion: E · Essen: Q · Bauen: B</small></p>`);
  const input = el.querySelector("input")!;
  el.querySelectorAll<HTMLButtonElement>(".wl-color").forEach((b) =>
    b.addEventListener("click", () => {
      profile.color = b.dataset.c!;
      el.querySelectorAll(".wl-color").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)),
      );
    }),
  );
  const start = (fresh: boolean) => {
    profile.name = input.value.trim().slice(0, 12) || "Wanderer";
    if (fresh) newWorld();
    const p = me();
    p.name = profile.name;
    p.color = profile.color;
    persist();
    resume();
    toast(`Hallo ${p.name}! Such dir einen Baum und hack Holz (E).`, 3.5);
  };
  el.querySelector('[data-a="play"]')!.addEventListener("click", () => start(false));
  el.querySelector('[data-a="new"]')?.addEventListener("click", () => start(true));
  el.querySelector('[data-a="join"]')?.addEventListener("click", () => {
    profile.name = input.value.trim().slice(0, 12) || "Wanderer";
    openJoin();
  });
}

function openJoin() {
  const el = panel(`<h2>Einer Welt beitreten</h2>
    <p>Gib den Raum-Code ein, den dir der Gastgeber zeigt.</p>
    <label class="wl-field">Raum-Code <input type="text" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="ABCD" /></label>
    <button class="wl-btn primary" type="button" data-a="go">Beitreten</button>
    <button class="wl-btn" type="button" data-a="back">Zurück</button>`);
  const input = el.querySelector("input")!;
  const go = () => {
    const code = input.value.trim().toUpperCase();
    if (/^[A-Z]{4}$/.test(code)) joinWorld(code);
    else toast("Der Code hat 4 Buchstaben.");
  };
  el.querySelector('[data-a="go"]')!.addEventListener("click", go);
  input.addEventListener("keydown", (e) => e.key === "Enter" && go());
  el.querySelector('[data-a="back"]')!.addEventListener("click", () => openStart());
}

function openMenu() {
  if (screen !== "play") return;
  toggleBuild(false);
  const online =
    mode === "host"
      ? `<p>Raum-Code: <b class="wl-code">${roomCode ?? "…"}</b> – andere können damit beitreten.</p>
         <button class="wl-btn" type="button" data-a="close">Welt schließen</button>`
      : mode === "guest"
        ? `<button class="wl-btn" type="button" data-a="leave">Welt verlassen</button>`
        : RELAY_URL
          ? `<button class="wl-btn" type="button" data-a="open">Welt öffnen</button>`
          : "";
  const el = panel(`<h2>Menü</h2>
    <button class="wl-btn primary" type="button" data-a="resume">Weiterspielen</button>
    ${online}
    ${mode === "solo" ? `<button class="wl-btn" type="button" data-a="new">Neue Welt</button>` : ""}
    <p><small>Laufen: WASD/Pfeile oder Joystick · Rennen: Umschalt · Aktion: E · Essen: Q · Bauen: B (1 Zelt, 2 Feuer)</small></p>`);
  el.querySelector('[data-a="resume"]')!.addEventListener("click", () => resume());
  el.querySelector('[data-a="new"]')?.addEventListener("click", () => {
    newWorld();
    persist();
    resume();
    toast("Eine neue Welt!");
  });
  el.querySelector('[data-a="open"]')?.addEventListener("click", () => {
    resume();
    openWorld();
  });
  el.querySelector('[data-a="close"]')?.addEventListener("click", () => {
    closeWorld();
    resume();
    toast("Deine Welt ist wieder nur für dich.");
  });
  el.querySelector('[data-a="leave"]')?.addEventListener("click", () => leaveGuest(null));
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
function openWorld() {
  if (!RELAY_URL || mode !== "solo") return;
  mode = "host";
  roomCode = null;
  ws = connect(
    "/host",
    (m) => {
      if (m.t === "room" && typeof m.code === "string") {
        roomCode = m.code;
        toast(`Deine Welt ist offen! Raum-Code: ${m.code}`, 6);
      } else if (m.t === "from" && typeof m.id === "string") onGuestMsg(m.id, m.d);
      else if (m.t === "peer-leave" && typeof m.id === "string") {
        const p = state.players[m.id];
        if (p) toast(`${p.name} ist gegangen.`);
        delete state.players[m.id];
      }
    },
    (opened) => {
      if (mode !== "host") return;
      mode = "solo";
      roomCode = null;
      dropGuests();
      toast(
        opened ? "Verbindung zum Raum-Server verloren – du spielst allein weiter." : OFFLINE,
        4,
      );
    },
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
    }
    hostSend(id, { v: 1, k: "welcome", seed: world.seed });
    hostSend(id, toSnap(state));
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
      say(eat(p));
      break;
    case "build":
      say(build(world, state, p, g.kind));
      break;
  }
}

/** Gast: einer fremden Welt beitreten */
function joinWorld(code: string) {
  if (!RELAY_URL) return;
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
          world = generateWorld(h.seed);
          state = createState(world);
          state.players = {};
          meId = myId;
          addPlayer(world, state, meId, profile.name, profile.color);
          bushAt = null;
          resume();
          toast("Du bist in der Welt angekommen!", 3);
        } else if (h.k === "snap" && meId === myId && world.seed) {
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
  if (mode === "host" && guests().length) hostSend(undefined, toSnap(state));
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
    cam.centerOn(Math.round(isoX(p.x, p.y)), Math.round(isoY(p.x, p.y, hAt(p.x, p.y)) - 10));
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
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const sx = isoX(x, y);
        const i = idx(world, x, y);
        const h = world.height[i]!;
        const sy = isoY(x, y, h);
        if (sx < v.x - 20 || sx > v.right + 20 || sy < v.y - 50 || sy > v.bottom + 10) continue;
        const t = world.terrain[i]!;
        this.pool(this.ground, gi++)
          .setTexture(tileKey(t, hash(x, y) % 3))
          .setOrigin(0.5, 0)
          .setPosition(sx, sy)
          .setDepth(-1e6 + (x + y) * 4 + h);
        const cx = isoX(x + 0.5, y + 0.5);
        const cy = isoY(x + 0.5, y + 0.5, h);
        const tree = world.treeAt[i]!;
        if (tree) {
          const stump = isStump(state, tree - 1);
          this.pool(this.objects, oi++)
            .setTexture(stump ? "stump" : `tree${hash(x, y) & 1}`)
            .setOrigin(0.5, stump ? 0.7 : 0.94)
            .setPosition(cx, cy)
            .setDepth((x + y + 1) * 10);
        }
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
    for (const q of Object.values(state.players)) {
      if (q.sleeping) continue;
      const s = place(`p:${q.id}`, addPlayerTex(this.textures, q.color), q.x, q.y);
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
    state.animals.forEach((a, k) => {
      const s = place(`a:${k}`, a.kind, a.x, a.y);
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
      const ok = canBuildAt(world, state, spot.x, spot.y);
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
}
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
  hud("clock").textContent =
    `${phaseOf(state.total) === "nacht" ? "🌙" : "☀️"} ${clockOf(state.total)}`;
  const room = hud("room");
  room.hidden = mode === "solo";
  room.textContent =
    mode === "host"
      ? `Raum ${roomCode ?? "…"} · ${Object.keys(state.players).length}`
      : `Gast · ${Object.keys(state.players).length}`;
  const a = screen === "play" ? actionFor(world, state, p) : null;
  actBtn.textContent = a ? a.label : "Aktion";
  actBtn.disabled = !a;
}

// --- Start --------------------------------------------------------------
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

if (debugEnabled) {
  window.__dampf = {
    state: () => {
      const p = me();
      return {
        screen: paused ? "paused" : overlay && screen === "play" ? "menu" : screen,
        total: state.total,
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
          tent: p.tent,
          sleeping: p.sleeping,
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
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < bd) {
            bd = d;
            best = [t.x, t.y, t.x + dx, t.y + dy];
          }
        }
      });
      return best;
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
          if (free(world, state, b.x + dx, b.y + dy)) {
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
