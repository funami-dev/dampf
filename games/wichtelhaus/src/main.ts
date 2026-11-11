import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { Sound } from "./audio.ts";
import {
  BREATH_CYCLE,
  IDLE_CYCLES,
  REDUCED_MOTION_SLOWDOWN,
  breathPhase,
  lanternLevel,
  sway,
} from "./logic/calm.ts";
import {
  DAY,
  FOODS,
  GIFTS,
  HAT_COLORS,
  MAX_FOOD,
  PETS,
  ROOMS,
  activityInfo,
  ask,
  atticOpen,
  befriend,
  catchUp,
  dayOf,
  foodCount,
  giveGift,
  isNight,
  load,
  newWichtel,
  save,
  shop,
  step,
  timeOfDay,
  type Food,
  type Gift,
  type Pet,
  type Request,
  type Room,
  type Store,
  type World,
} from "./logic/wichtel.ts";
import { debugEnabled } from "./debug.ts";
import { fit, layoutFor, type Layout } from "./logic/layout.ts";
import { FURNITURE, itemBox } from "./logic/furniture.ts";
import { furnitureArt, petArt, roomArt, sleeperArt, wichtelArt, windowRect } from "./art/art.ts";

const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
stage.style.background = "#2b2233";

const store: Store = {
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
      /* gesperrt */
    }
  },
};
const sound = new Sound();
const reduced =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const slow = reduced ? REDUCED_MOTION_SLOWDOWN : 1;

let world: World | null = load(store);
if (world) catchUp(world, Date.now());
let paused = false;
let bubble = "";
let bubbleUntil = 0;
let calm: { kind: "ruhemoment"; started: number } | null = null;
let overlay: HTMLElement | null = null;
let saveTimer = 0;
let ambientTimer = 0;
let clock = 0; // Sekunden seit Start (für Animationen)

// --- Oberfläche ----------------------------------------------------------------
const layer = document.createElement("div");
layer.className = "wh-layer";
layer.innerHTML = `
  <div class="wh-top" hidden>
    <div class="wh-needs" role="status" aria-label="So geht es dem Wichtel">
      <span data-n="hunger" title="Hunger">🍲<i><b></b></i></span>
      <span data-n="energy" title="Müdigkeit">💤<i><b></b></i></span>
      <span data-n="fun" title="Spaß">😊<i><b></b></i></span>
      <span data-n="clean" title="Sauberkeit">🧼<i><b></b></i></span>
    </div>
    <div class="wh-side">
      <span class="wh-day" data-h="day"></span>
      <span class="wh-heart" data-h="heart" title="Freundschaft">💛 0</span>
      <button class="wh-btn wh-small" type="button" data-b="sound" aria-label="Klang">🔈</button>
    </div>
  </div>
  <button class="wh-btn wh-fab" type="button" data-b="menu" aria-label="Menü" aria-expanded="false" hidden>☰<span class="wh-dot" data-h="dot" hidden></span></button>
  <div class="wh-bar" id="wh-actions" hidden>
    <button class="wh-btn" type="button" data-b="shop">🧺 Einkaufen</button>
    <button class="wh-btn" type="button" data-b="gift">🎁 Geschenk</button>
    <button class="wh-btn" type="button" data-b="knock">🚪 Anklopfen</button>
    <button class="wh-btn" type="button" data-b="calm">🕯️ Ruhe</button>
    <button class="wh-btn" type="button" data-b="letters">✉️ Briefe<span class="wh-badge" data-h="unread" hidden></span></button>
  </div>`;
stage.append(layer);
const $ = <E extends HTMLElement>(s: string) => layer.querySelector<E>(s)!;
const h = (k: string) => $(`[data-h="${k}"]`);

const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const say = (t: string, secs = 5) => {
  bubble = t;
  bubbleUntil = clock + secs;
};

function drawer(html: string, label: string) {
  overlay?.remove();
  const el = document.createElement("section");
  el.className = "wh-drawer";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", label);
  el.innerHTML = `${html}<button class="wh-btn wh-close" type="button" data-x>Schließen</button>`;
  layer.append(el);
  overlay = el;
  el.querySelector("[data-x]")!.addEventListener("click", closeDrawer);
  return el;
}
function closeDrawer() {
  overlay?.remove();
  overlay = null;
  calm = null;
}
const tap = (fn: () => void) => () => {
  sound.start();
  setMenu(false);
  fn();
};

// Menü-Knopf auf schmalen Bildschirmen (WH-AK-14): öffnet die Aktionen als Liste
function setMenu(open: boolean) {
  const bar = $(".wh-bar");
  bar.classList.toggle("open", open);
  $('[data-b="menu"]').setAttribute("aria-expanded", String(open));
}
const menuOpen = () => $(".wh-bar").classList.contains("open");

// --- Einzug (WH-AK-01/07) ---------------------------------------------------------
function openSetup() {
  let hat = HAT_COLORS[0]!;
  let pet: Pet = "katze";
  const el = drawer(
    `<h2>Wer zieht ein?</h2>
    <label class="wh-field">Name des Wichtels <input type="text" maxlength="12" placeholder="Wichtel" autocomplete="off" /></label>
    <div class="wh-choices" role="group" aria-label="Mützenfarbe">${HAT_COLORS.map(
      (c) =>
        `<button type="button" class="wh-color" data-c="${c}" style="background:${c}" aria-label="Mütze ${c}" aria-pressed="${c === hat}"></button>`,
    ).join("")}</div>
    <div class="wh-choices" role="group" aria-label="Haustier">${(Object.keys(PETS) as Pet[])
      .map(
        (p) =>
          `<button type="button" class="wh-btn" data-p="${p}" aria-pressed="${p === pet}">${PETS[p]}</button>`,
      )
      .join("")}</div>
    <button class="wh-btn wh-primary" type="button" data-go>Einziehen!</button>`,
    "Wer zieht ein?",
  );
  el.querySelector("[data-x]")!.remove();
  el.querySelectorAll<HTMLButtonElement>("[data-c]").forEach((b) =>
    b.addEventListener("click", () => {
      hat = b.dataset.c!;
      el.querySelectorAll("[data-c]").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)),
      );
    }),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-p]").forEach((b) =>
    b.addEventListener("click", () => {
      pet = b.dataset.p as Pet;
      el.querySelectorAll("[data-p]").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)),
      );
    }),
  );
  el.querySelector("[data-go]")!.addEventListener(
    "click",
    tap(() => {
      const name = el.querySelector<HTMLInputElement>("input")!.value;
      world = newWichtel({ name, hat, pet });
      save(store, world);
      closeDrawer();
      showUi(true);
      say(`Hallo! Ich bin ${world.name}. ${GREET[world.trait]}`, 7);
    }),
  );
}

function showUi(on: boolean) {
  $(".wh-top").hidden = !on;
  $(".wh-bar").hidden = !on;
  $('[data-b="menu"]').hidden = !on;
  if (!on) setMenu(false);
}

const GREET: Record<World["trait"], string> = {
  musik: "Ich mache gern Musik.",
  basteln: "Ich bastle gern.",
  lesen: "Ich lese gern.",
  schlafen: "Ich schlafe gern lange.",
};

// --- Helfen ---------------------------------------------------------------------
function openShop() {
  if (!world) return;
  const w = world;
  const el = drawer(
    `<h2>🧺 Einkaufen</h2><p>Im Schrank: ${foodCount(w)} / ${MAX_FOOD}</p>
    <div class="wh-choices">${(Object.keys(FOODS) as Food[])
      .map(
        (f) =>
          `<button class="wh-btn" type="button" data-f="${f}">${FOODS[f].icon} ${FOODS[f].name}</button>`,
      )
      .join("")}</div>`,
    "Einkaufen",
  );
  el.querySelectorAll<HTMLButtonElement>("[data-f]").forEach((b) =>
    b.addEventListener("click", () => {
      say(shop(w, b.dataset.f as Food), 3);
      el.querySelector("p")!.textContent = `Im Schrank: ${foodCount(w)} / ${MAX_FOOD}`;
      sound.page();
    }),
  );
}

function openGift() {
  if (!world) return;
  const w = world;
  const done = w.lastGiftDay === dayOf(w.t);
  const el = drawer(
    `<h2>🎁 Geschenk</h2><p>${done ? "Heute gab es schon ein Geschenk. Morgen wieder!" : "Was möchtest du schenken?"}</p>
    <div class="wh-choices">${(Object.keys(GIFTS) as Gift[])
      .map(
        (g) =>
          `<button class="wh-btn" type="button" data-g="${g}" ${done ? "disabled" : ""}>${GIFTS[g].icon} ${GIFTS[g].name}</button>`,
      )
      .join("")}</div>`,
    "Geschenk",
  );
  el.querySelectorAll<HTMLButtonElement>("[data-g]").forEach((b) =>
    b.addEventListener("click", () => {
      say(giveGift(w, b.dataset.g as Gift), 5);
      sound.knock();
      closeDrawer();
    }),
  );
}

function openKnock() {
  if (!world) return;
  const w = world;
  sound.knock();
  const asks: [Request, string][] = [
    ["musik", "🎵 Spiel etwas vor!"],
    ["basteln", "🔨 Bastel etwas!"],
    ["vorlesen", "📖 Lies vor!"],
    [
      "spielen",
      `🐾 Spiel mit ${PETS[w.pet] === "kleiner Drache" ? "dem Drachen" : PETS[w.pet] === "Igel" ? "dem Igel" : "der Katze"}!`,
    ],
    ["schlafen", "🌙 Geh schlafen!"],
  ];
  const el = drawer(
    `<h2>🚪 Anklopfen</h2><p>Worum möchtest du ${escapeHtml(w.name)} bitten?</p>
    <div class="wh-choices">${asks.map(([r, t]) => `<button class="wh-btn" type="button" data-r="${r}">${t}</button>`).join("")}</div>`,
    "Anklopfen",
  );
  el.querySelectorAll<HTMLButtonElement>("[data-r]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = ask(w, b.dataset.r as Request);
      say(r.text, 5);
      if (r.ok && b.dataset.r === "musik") sound.melody();
      closeDrawer();
    }),
  );
}

const TASKS: [string, string, () => void][] = [
  ["buersten", "🪮 Haustier bürsten", () => sound.brush()],
  ["giessen", "🪴 Pflanzen gießen", () => sound.water()],
  ["sortieren", "📚 Bücher sortieren", () => sound.page()],
  ["putzen", "🪟 Fenster putzen", () => sound.brush()],
];
let task: { id: string; started: number; done: boolean } | null = null;

function openCalm() {
  if (!world) return;
  const w = world;
  const el = drawer(
    `<h2>🕯️ Ruhe</h2>
    <button class="wh-btn wh-primary" type="button" data-m>Ruhemoment: Atme mit ${escapeHtml(w.name)}</button>
    <p class="wh-hint">Halte einen Knopf gedrückt – ganz in Ruhe.</p>
    <div class="wh-choices">${TASKS.map(([id, t]) => `<button class="wh-btn wh-hold" type="button" data-t="${id}">${t}<span class="wh-prog"></span></button>`).join("")}</div>`,
    "Ruhe",
  );
  el.querySelector("[data-m]")!.addEventListener("click", openBreath);
  el.querySelectorAll<HTMLButtonElement>("[data-t]").forEach((b) => {
    const id = b.dataset.t!;
    const start = (e: PointerEvent) => {
      e.preventDefault();
      sound.start();
      b.setPointerCapture?.(e.pointerId);
      task = { id, started: clock, done: false };
      TASKS.find((t) => t[0] === id)![2]();
    };
    const stop = () => {
      if (task?.id === id && !task.done) task = null;
      b.style.setProperty("--p", "0");
    };
    b.addEventListener("pointerdown", start);
    b.addEventListener("pointerup", stop);
    b.addEventListener("pointercancel", stop);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
}

/** Ruhemoment: Laterne 5 s heller, 5 s dunkler (WH-AK-12) */
function openBreath() {
  calm = { kind: "ruhemoment", started: clock };
  const el = drawer(
    `<h2>Atme mit dem Wichtel</h2>
    <div class="wh-lantern" aria-hidden="true"><i></i></div>
    <p class="wh-breath" aria-live="polite">Einatmen</p>
    <button class="wh-btn wh-primary" type="button" data-done>Fertig</button>`,
    "Ruhemoment",
  );
  el.classList.add("wh-calm");
  el.querySelector("[data-x]")!.remove();
  el.querySelector("[data-done]")!.addEventListener("click", () => {
    if (world) befriend(world, 1);
    say("Das tat gut. Danke!", 4);
    closeDrawer();
  });
  calm = { kind: "ruhemoment", started: clock };
}

function openLetters() {
  if (!world) return;
  const w = world;
  const items = [...w.letters].reverse();
  const el = drawer(
    `<h2>✉️ Briefe</h2>${
      items.length
        ? `<ol class="wh-letters">${items
            .map(
              (l) =>
                `<li class="${l.read ? "" : "new"}"><b>Tag ${l.day}</b><p>${escapeHtml(l.text)}</p></li>`,
            )
            .join("")}</ol>`
        : "<p>Noch keine Briefe. Morgen vielleicht!</p>"
    }`,
    "Briefe",
  );
  sound.page();
  for (const l of w.letters) l.read = true;
  el.classList.add("wh-scroll");
}

function openSound() {
  if (!world) return;
  const w = world;
  const el = drawer(
    `<h2>🔈 Klang</h2>
    <label class="wh-field">Lautstärke <input type="range" min="0" max="100" value="${Math.round(w.volume * 100)}" aria-label="Lautstärke" /></label>
    <label class="wh-check"><input type="checkbox" ${w.muted ? "checked" : ""} aria-label="Stumm" /> Stumm</label>
    <p class="wh-hint">🎧 Am schönsten mit Kopfhörern.</p>`,
    "Klang",
  );
  const range = el.querySelector<HTMLInputElement>('input[type="range"]')!;
  const mute = el.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  const apply = () => {
    w.volume = Number(range.value) / 100;
    w.muted = mute.checked;
    sound.setVolume(w.volume, w.muted);
    save(store, w);
  };
  range.addEventListener("input", apply);
  mute.addEventListener("change", apply);
}

$('[data-b="shop"]').addEventListener("click", tap(openShop));
$('[data-b="gift"]').addEventListener("click", tap(openGift));
$('[data-b="knock"]').addEventListener("click", tap(openKnock));
$('[data-b="calm"]').addEventListener("click", tap(openCalm));
$('[data-b="letters"]').addEventListener("click", tap(openLetters));
$('[data-b="sound"]').addEventListener("click", tap(openSound));
$('[data-b="menu"]').addEventListener("click", (e) => {
  e.stopPropagation();
  sound.start();
  setMenu(!menuOpen());
});
// Tipp daneben schließt das Menü
window.addEventListener("pointerdown", (e) => {
  const t = e.target as HTMLElement;
  if (menuOpen() && !t.closest(".wh-bar") && !t.closest('[data-b="menu"]')) setMenu(false);
});

window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.tagName === "INPUT") return;
  if (e.code === "Escape") {
    if (paused) return setPaused(false);
    if (menuOpen()) return setMenu(false);
    if (overlay && world) closeDrawer();
    return;
  }
  if (!world || overlay || paused) return;
  const k = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].indexOf(e.code);
  if (k >= 0) [openShop, openGift, openKnock, openCalm, openLetters][k]!();
});

// --- Pause ----------------------------------------------------------------------
const pauseEl = document.createElement("div");
pauseEl.className = "wh-pause";
pauseEl.hidden = true;
pauseEl.innerHTML = `<button class="wh-btn wh-primary" type="button">Weiterspielen</button>`;
pauseEl.querySelector("button")!.addEventListener("click", () => setPaused(false));
layer.append(pauseEl);
function setPaused(v: boolean) {
  if (!world) return;
  paused = v;
  pauseEl.hidden = !v;
  if (v) {
    save(store, world);
    task = null;
  }
}
window.addEventListener("blur", () => setPaused(true));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPaused(true);
});
window.addEventListener("pagehide", () => world && save(store, world));

// --- Zeit ------------------------------------------------------------------------
function tick(dt: number) {
  clock += dt;
  if (!world || paused) return;
  const w = world;
  const text = step(w, dt);
  if (text && clock > bubbleUntil) say(text, 4);
  // Ruhe-Tätigkeit durch Halten (3 s)
  if (task && !task.done) {
    const p = Math.min(1, (clock - task.started) / 3);
    overlay
      ?.querySelector<HTMLElement>(`[data-t="${task.id}"]`)
      ?.style.setProperty("--p", String(p));
    if (p >= 1) {
      task.done = true;
      befriend(w, 0.5);
      if (task.id === "buersten") w.needs.fun = Math.min(100, w.needs.fun + 5);
      say(
        task.id === "buersten"
          ? "Schnurr … das mag es."
          : task.id === "giessen"
            ? "Die Pflanzen freuen sich."
            : task.id === "sortieren"
              ? "So ordentlich!"
              : "Jetzt sieht man die Wolken wieder.",
        4,
      );
    }
  }
  // leise Umgebung
  ambientTimer -= dt;
  if (ambientTimer <= 0) {
    ambientTimer = 4 + Math.random() * 6;
    const d = timeOfDay(w.t);
    if (d > 0.12 && d < 0.35) sound.bird();
    else if (d > 0.62 && d < 0.75) sound.cricket();
    if (w.activity.kind === "lesen" || isNight(w.t))
      for (let k = 0; k < 3; k++) setTimeout(() => sound.crackle(), k * 220);
  }
  sound.setRain(rainy(w));
  saveTimer += dt;
  if (saveTimer > 5) {
    saveTimer = 0;
    save(store, w);
  }
  updateHud();
}

/** Wetter je Tag (immer gleich für denselben Tag) */
const rainy = (w: World) => (dayOf(w.t) * 7919 + 13) % 5 === 0;

function updateHud() {
  const w = world!;
  for (const k of ["hunger", "energy", "fun", "clean"] as const) {
    const el = $(`[data-n="${k}"]`);
    el.querySelector<HTMLElement>("b")!.style.width = `${Math.round(w.needs[k])}%`;
    el.classList.toggle("low", w.needs[k] < 25);
  }
  const d = timeOfDay(w.t);
  h("day").textContent =
    `${isNight(w.t) ? "🌙" : d < 0.25 ? "🌅" : d > 0.62 ? "🌇" : "☀️"} Tag ${dayOf(w.t) + 1}`;
  h("heart").textContent = `💛 ${Math.floor(w.friendship)}`;
  const unread = w.letters.filter((l) => !l.read).length;
  h("unread").hidden = unread === 0;
  h("dot").hidden = unread === 0;
  h("unread").textContent = String(unread);
  if (calm && overlay) {
    const s = clock - calm.started;
    const lvl = lanternLevel(s / slow);
    overlay.querySelector<HTMLElement>(".wh-lantern i")!.style.opacity = String(0.25 + 0.75 * lvl);
    overlay.querySelector<HTMLElement>(".wh-lantern i")!.style.transform =
      `scale(${0.85 + 0.25 * lvl})`;
    overlay.querySelector<HTMLElement>(".wh-breath")!.textContent = breathPhase(s / slow);
  }
}

// --- Grafik ---------------------------------------------------------------------
// Hausplan je nach Bildformat (WH-AK-13); wird in draw() neu bestimmt
let L: Layout = layoutFor(480, 600);
let GROUND = 520;
const houseW = () => L.roomW * L.cols;
const floorY = (f: number) => GROUND - (f + 1) * L.floorH; // Oberkante der Etage
const roomX = (r: Room) => L.houseX + L.roomW * L.rooms[r].col;
const roomCenter = (r: Room) => ({
  x: r === "dachboden" ? L.width / 2 : roomX(r) + L.roomW / 2,
  y: floorY(L.rooms[r].floor) + L.floorH - 8,
});
const stairX = () => L.houseX + houseW() - 14;
const WALLS: Record<Room, number> = {
  kueche: 0xe9d8b4,
  wohnzimmer: 0xd9c6a5,
  werkstatt: 0xcdb48e,
  bad: 0xc9dde0,
  musik: 0xe2cfe0,
  schlafzimmer: 0xc9cfe8,
  dachboden: 0xb89a74,
};
const mix = (a: number, b: number, t: number) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    Math.round(ca.red + (cb.red - ca.red) * t),
    Math.round(ca.green + (cb.green - ca.green) * t),
    Math.round(ca.blue + (cb.blue - ca.blue) * t),
  );
};
/** Zahl der gezeigten Bilder (WH-AK-16, für Tests) */
let spritesShown = 0;
const walker = { x: 0, y: 0, init: false, facing: 1, moving: false };

class HouseScene extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  fg!: Phaser.GameObjects.Graphics;
  bubble!: Phaser.GameObjects.Text;
  imgs = new Map<string, Phaser.GameObjects.Image>();
  seen = new Set<string>();
  constructor() {
    super("house");
  }
  create() {
    this.g = this.add.graphics().setDepth(0);
    this.fg = this.add.graphics().setDepth(2.5);
    this.bubble = this.add
      .text(0, 0, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#3a2f45",
        backgroundColor: "#fff8ee",
        padding: { x: 8, y: 5 },
        wordWrap: { width: 200 },
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setDepth(10);
  }
  override update(_t: number, delta: number) {
    tick(Math.min(0.1, delta / 1000));
    this.draw();
  }
  draw() {
    const g = this.g;
    const Wd = this.scale.width;
    const Hd = this.scale.height;
    const next = layoutFor(Wd, Hd);
    if (next.portrait !== L.portrait) walker.init = false; // neuer Plan: Wichtel neu hinstellen
    L = next;
    const fitted = fit(L, Wd, Hd);
    const k = fitted.k;
    const ox = fitted.ox;
    const oy = 0;
    GROUND = fitted.ground;
    const W0 = L.width;
    g.clear();
    const w = world;
    const t = w ? timeOfDay(w.t) : 0.3;
    const night = w ? isNight(w.t) : false;
    // Himmel: Morgen, Tag, Abend, Nacht weich ineinander
    const sky = night
      ? 0x1d2440
      : t < 0.2
        ? mix(0xf3c6a5, 0x9fc8e8, (t - 0.12) / 0.08)
        : t > 0.62
          ? mix(0x9fc8e8, 0xe9a27a, Math.min(1, (t - 0.62) / 0.13))
          : 0x9fc8e8;
    g.fillStyle(sky, 1);
    g.fillRect(0, 0, Wd, Hd);
    const X = (x: number) => ox + x * k;
    const Y = (y: number) => oy + y * k;
    const R = (x: number, y: number, ww: number, hh: number, c: number, a = 1) => {
      g.fillStyle(c, a);
      g.fillRect(X(x), Y(y), ww * k, hh * k);
    };
    // Sterne nachts, sanft (kein Blinken)
    if (night)
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97) % W0;
        const sy = (i * 53) % Math.max(60, floorY(L.floors - 1) - L.roofH);
        R(sx, sy, 2, 2, 0xffffff, 0.35 + 0.35 * sway(clock / slow, 9, i * 0.13));
      }
    // Hügel und Bäume (wiegen sich langsam)
    g.fillStyle(night ? 0x22362a : 0x7fae6a, 1);
    g.fillEllipse(X(W0 * 0.17), Y(GROUND + 20), 360 * k, 160 * k);
    g.fillEllipse(X(W0 * 0.87), Y(GROUND + 30), 360 * k, 140 * k);
    for (const [tx, s] of [
      [W0 * 0.05, 1],
      [W0 * 0.94, 0.9],
      [W0 * 0.125, 0.7],
    ] as const) {
      const sw = (sway(clock / slow, IDLE_CYCLES.baeume!, tx / 100) - 0.5) * 4;
      R(tx - 3, GROUND - 40 * s, 6, 40 * s, 0x6b4a2e);
      g.fillStyle(night ? 0x1f3a26 : 0x4f8a43, 1);
      g.fillCircle(X(tx + sw), Y(GROUND - 52 * s), 22 * s * k);
    }
    g.fillStyle(night ? 0x2c3b2a : 0x6a9a58, 1);
    g.fillRect(0, Y(GROUND), Wd, Hd - Y(GROUND));
    // Regen (langsam fallende, dünne Striche)
    if (w && rainy(w)) {
      g.lineStyle(1 * k, 0xcfe3f2, 0.35);
      for (let i = 0; i < 60; i++) {
        const rx = (i * 41) % W0;
        const ry = ((i * 67 + clock * 90) % (GROUND + 40)) - 20;
        g.lineBetween(X(rx), Y(ry), X(rx - 3), Y(ry + 10));
      }
    }
    // Haus: flaches Dach mit Dachboden, darunter die Etagen (WH-AK-13)
    const top = floorY(L.floors - 1);
    const cx = W0 / 2;
    const hx0 = L.houseX;
    const hx1 = L.houseX + houseW();
    g.fillStyle(0x7a3b2e, 1);
    // Schornstein (hinter dem Dach)
    const chx = hx1 - 70;
    R(chx, top - L.roofH * 0.62 - 18, 16, 30, night ? 0x5a3a30 : 0x8a4a3a);
    for (let y = 0; y < 30; y += 5) R(chx, top - L.roofH * 0.62 - 18 + y, 16, 1, 0x6a3a2c);
    R(chx - 2, top - L.roofH * 0.62 - 21, 20, 4, 0x55433a);
    g.fillStyle(night ? 0x5a2c22 : 0x7a3b2e, 1);
    g.fillTriangle(X(hx0 - 20), Y(top + 2), X(cx), Y(top - L.roofH), X(hx1 + 20), Y(top + 2));
    // Dachziegel: Reihen mit versetzten Fugen
    {
      const apex = top - L.roofH;
      const half = (y: number) => ((hx1 + 20 - cx) * (y - apex)) / (top + 2 - apex);
      for (let y = apex + 6, row = 0; y < top; y += 6, row++) {
        const hw = half(y);
        R(cx - hw, y, hw * 2, 1, night ? 0x40201a : 0x5e2a20);
        for (let x = cx - hw + (row % 2) * 5; x < cx + hw - 2; x += 10)
          R(x, y + 1, 1, 5, night ? 0x40201a : 0x6a3226);
        R(cx - hw, y + 1, hw * 2, 1, night ? 0x6a3a30 : 0x9a5040, 0.5);
      }
    }
    const dim = night ? 0.55 : 1;
    // Dachboden
    const attic = w ? atticOpen(w) : false;
    g.fillStyle(mix(0x3a2a20, WALLS.dachboden, attic ? dim : 0.35), 1);
    g.fillTriangle(X(hx0 + 18), Y(top), X(cx), Y(top - L.roofH + 20), X(hx1 - 18), Y(top));
    // Bretter im Dachboden
    {
      const apex = top - L.roofH + 20;
      const hw0 = cx - (hx0 + 18);
      for (let x = hx0 + 30; x < hx1 - 24; x += 12) {
        const d = Math.abs(x - cx) / hw0;
        const yTop = apex + (top - apex) * d;
        R(x, yTop, 1, top - yTop, 0x000000, 0.18);
      }
      R(hx0 + 18, top - 2, hx1 - hx0 - 36, 2, 0x5a4434);
    }
    if (attic) {
      // Teleskop
      R(cx + 30, top - 28, 4, 28, 0x55433a);
      g.lineStyle(5 * k, 0x8a7a6a, 1);
      g.lineBetween(X(cx + 32), Y(top - 28), X(cx + 52), Y(top - 44));
    } else {
      g.lineStyle(3 * k, 0x2a1d16, 0.8);
      g.lineBetween(X(cx - 36), Y(top - 8), X(cx + 36), Y(top - 34));
      g.lineBetween(X(cx - 36), Y(top - 34), X(cx + 36), Y(top - 8));
    }
    // Fensterglas zeigt den Himmel; die Raumbilder haben dort ein Loch
    const glass = night ? 0x2a3560 : mix(sky, 0xffffff, 0.35);
    for (const r of Object.keys(ROOMS) as Room[]) {
      if (r === "dachboden") continue;
      const wr = windowRect(L.roomW);
      R(roomX(r) + wr.x, floorY(L.rooms[r].floor) + wr.y, wr.w, wr.h, glass);
    }
    const f = this.fg;
    f.clear();
    const tint = night ? 0x8a8aa8 : t > 0.62 ? 0xf2dcc8 : 0xffffff;
    this.seen.clear();
    for (const r of Object.keys(ROOMS) as Room[]) {
      if (r === "dachboden") continue;
      const rx = roomX(r);
      const ry = floorY(L.rooms[r].floor);
      this.img(`room:${r}`, `room-${r}-${L.roomW}`, () => roomArt(r, L.roomW, L.floorH))
        .setOrigin(0, 0)
        .setPosition(X(rx), Y(ry))
        .setScale(k)
        .setDepth(1)
        .setTint(tint);
      for (const it of FURNITURE[r]) {
        const b = itemBox(it, L.roomW);
        this.img(`f:${r}:${it.key}`, `f-${it.key}`, () => furnitureArt(it.key, it.w, it.h))
          .setOrigin(0, 0)
          .setPosition(X(rx + b.x), Y(ry + b.y))
          .setScale(k)
          .setDepth(2)
          .setTint(tint);
      }
      this.details(r, rx, ry, X, Y, k, night);
    }
    // Außenwand rechts und Treppe (rechts innen), eine je Etage
    const F = (x: number, y: number, ww: number, hh: number, c: number, a = 1) => {
      f.fillStyle(c, a);
      f.fillRect(X(x), Y(y), ww * k, hh * k);
    };
    F(hx1 - 3, top, 3, L.floorH * L.floors, 0x5a4434);
    for (let fl = 0; fl < L.floors - 1; fl++)
      for (let st = 0; st < 8; st++) {
        const sx = stairX() - st * 5;
        const sy = floorY(fl) + L.floorH - 8 - st * (L.floorH / 8);
        F(sx, sy, 12, 3, night ? 0x4a3826 : 0x6b4f37);
        F(sx, sy, 12, 1, night ? 0x5e4a36 : 0x8a6a4a);
      }
    // Wichtel und Haustier
    if (w) this.wichtel(w, X, Y, k, tint);
    else this.bubble.setVisible(false);
    for (const [id, im] of this.imgs) if (!this.seen.has(id)) im.setVisible(false);
    spritesShown = this.seen.size;
  }

  /** Bild holen oder anlegen; die Textur entsteht nur einmal */
  img(id: string, key: string, make: () => HTMLCanvasElement) {
    this.seen.add(id);
    if (!this.textures.exists(key)) this.textures.addCanvas(key, make());
    let im = this.imgs.get(id);
    if (!im) {
      im = this.add.image(0, 0, key);
      this.imgs.set(id, im);
    } else if (im.texture.key !== key) im.setTexture(key);
    return im.setVisible(true);
  }

  /** bewegte Kleinigkeiten über den Möbeln: Vorräte, Feuer, Basteleien, Noten, Laterne */
  details(
    r: Room,
    rx: number,
    ry: number,
    X: (x: number) => number,
    Y: (y: number) => number,
    k: number,
    night: boolean,
  ) {
    const f = this.fg;
    const w = world;
    const at = (key: string) => {
      const it = FURNITURE[r as Exclude<Room, "dachboden">].find((i) => i.key === key)!;
      const b = itemBox(it, L.roomW);
      return { x: rx + b.x, y: ry + b.y, w: b.w, h: b.h };
    };
    const F = (x: number, y: number, ww: number, hh: number, c: number, a = 1) => {
      f.fillStyle(c, a);
      f.fillRect(X(x), Y(y), ww * k, hh * k);
    };
    switch (r) {
      case "kueche": {
        // Vorratsgläser im Schrank (je Fach fünf)
        const s = at("schrank");
        const n = w ? foodCount(w) : 0;
        for (let i = 0; i < n; i++) {
          const jx = s.x + 4 + (i % 5) * 5;
          const jy = s.y + 9 + Math.floor(i / 5) * 12;
          F(jx, jy, 4, 6, 0xf1c40f);
          F(jx, jy, 4, 1, 0xc0392b);
          F(jx, jy + 2, 1, 3, 0xfbe08a);
        }
        break;
      }
      case "wohnzimmer": {
        // ruhiges Kaminfeuer (Zyklus 6 s, kein Flackern)
        const kz = at("kamin");
        const fl = sway(clock / slow, IDLE_CYCLES.kerze!);
        const base = kz.y + kz.h - 6;
        f.fillStyle(0xe67e22, 0.65 + 0.25 * fl);
        f.fillTriangle(
          X(kz.x + 8),
          Y(base),
          X(kz.x + 14),
          Y(base - 14 - 3 * fl),
          X(kz.x + 20),
          Y(base),
        );
        f.fillStyle(0xf9d56e, 0.7 + 0.2 * fl);
        f.fillTriangle(
          X(kz.x + 11),
          Y(base),
          X(kz.x + 14),
          Y(base - 8 - 2 * fl),
          X(kz.x + 17),
          Y(base),
        );
        if (night) {
          f.fillStyle(0xffb35c, 0.12 + 0.06 * fl);
          f.fillCircle(X(kz.x + 14), Y(base - 6), 26 * k);
        }
        break;
      }
      case "werkstatt": {
        const s = at("wandregal");
        const n = Math.min(8, w?.crafted ?? 0);
        for (let i = 0; i < n; i++) {
          const c = [0xe67e22, 0x16a085, 0x8e44ad][i % 3]!;
          F(s.x + 2 + i * 4.5, s.y - 8, 4, 8, c);
          F(s.x + 2 + i * 4.5, s.y - 8, 1, 8, 0xffffff, 0.35);
        }
        break;
      }
      case "musik": {
        if (w?.activity.kind === "musik") {
          const p0 = at("klavier");
          // drei Noten steigen nacheinander langsam auf (6 s)
          for (let n = 0; n < 3; n++) {
            const p = ((clock / slow + n * 2) % 6) / 6;
            const a = Math.max(0, 1 - p) * 0.8;
            const nx = p0.x + 34 + p * 30 + n * 4;
            const ny = p0.y - 6 - p * 30;
            f.fillStyle(0x3a2f45, a);
            f.fillEllipse(X(nx), Y(ny), 4 * k, 3 * k);
            F(nx + 1.5, ny - 9, 1, 9, 0x3a2f45, a);
          }
        }
        break;
      }
      case "schlafzimmer": {
        // Laterne mit langsamem Atem-Rhythmus (10 s)
        const l = sway(clock / slow, IDLE_CYCLES.laterne!);
        const la = at("laterne");
        f.fillStyle(0xffd27a, 0.18 + 0.22 * l);
        f.fillCircle(X(la.x + la.w / 2), Y(la.y + la.h / 2), (8 + 4 * l) * k);
        break;
      }
    }
  }

  wichtel(w: World, X: (x: number) => number, Y: (y: number) => number, k: number, tint: number) {
    const f = this.fg;
    const target = roomCenter(w.activity.room);
    const tx =
      w.activity.kind === "musik" && w.activity.room === "musik"
        ? roomX("musik") + 36 // am Klavier auf dem Hocker
        : target.x + (w.activity.kind === "schlafen" ? 20 : -14);
    const ty = target.y;
    if (!walker.init) {
      walker.x = tx;
      walker.y = ty;
      walker.init = true;
    }
    // langsam laufen; Etagenwechsel über die Treppe
    const speed = 40 / slow;
    const dt = 1 / 60;
    walker.moving = false;
    if (Math.abs(walker.y - ty) > 1) {
      const sx = stairX();
      if (Math.abs(walker.x - sx) > 1) {
        walker.facing = Math.sign(sx - walker.x);
        walker.x += Math.sign(sx - walker.x) * Math.min(speed * dt, Math.abs(sx - walker.x));
      } else walker.y += Math.sign(ty - walker.y) * Math.min(speed * dt, Math.abs(ty - walker.y));
      walker.moving = true;
    } else if (Math.abs(walker.x - tx) > 1) {
      walker.facing = Math.sign(tx - walker.x);
      walker.x += Math.sign(tx - walker.x) * Math.min(speed * dt, Math.abs(tx - walker.x));
      walker.moving = true;
    }
    const sleeping = w.activity.kind === "schlafen" && !walker.moving;
    const breath = sway(clock / slow, IDLE_CYCLES.atmen!); // 10 s
    const bob = walker.moving ? Math.abs(Math.sin(clock * 4)) * 1.5 : breath * 1.2;
    const x = walker.x;
    const y = walker.y - bob;
    const flip = walker.facing < 0;
    if (sleeping) {
      // liegt im Bett, Zzz sanft
      this.img("wichtel", `sleep-${w.hat}`, () => sleeperArt(w.hat))
        .setOrigin(0.5, 1)
        .setPosition(X(x), Y(walker.y - 10))
        .setScale(k)
        .setFlipX(false)
        .setDepth(3)
        .setTint(tint);
      f.fillStyle(0x3a2f45, 0.4 + 0.4 * breath);
      f.fillCircle(X(x + 18), Y(walker.y - 30 - breath * 6), 2.5 * k);
    } else {
      const frame = walker.moving ? (Math.floor(clock * 4) % 2 ? "walk0" : "walk1") : "stand";
      this.img("wichtel", `w-${w.hat}-${frame}`, () => wichtelArt(w.hat, frame))
        .setOrigin(0.5, 1)
        .setPosition(X(x), Y(y))
        .setScale(k)
        .setFlipX(flip)
        .setDepth(3)
        .setTint(tint);
    }
    // Haustier folgt gemütlich
    const px = x - walker.facing * 18;
    const pb = sway(clock / slow, IDLE_CYCLES.haustier!) * 1;
    this.img("pet", `pet-${w.pet}`, () => petArt(w.pet))
      .setOrigin(0.5, 1)
      .setPosition(X(px), Y(walker.y - pb))
      .setScale(k)
      .setFlipX(flip)
      .setDepth(3)
      .setTint(tint);
    // Sprechblase
    const show = bubble && clock < bubbleUntil;
    this.bubble
      .setVisible(!!show)
      .setText(show ? bubble : "")
      .setScale(1)
      .setPosition(X(Math.max(110, Math.min(L.width - 110, x))), Y(y - 48));
    void BREATH_CYCLE;
    void DAY;
    void activityInfo;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: "#2b2233",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: stage.clientWidth, height: stage.clientHeight },
  scene: [HouseScene],
  banner: false,
});

if (world) {
  showUi(true);
  sound.setVolume(world.volume, world.muted);
  say(`Schön, dass du wieder da bist!`, 5);
} else openSetup();

if (debugEnabled) {
  window.__dampf = {
    state: () => ({
      screen: !world
        ? "setup"
        : paused
          ? "paused"
          : (overlay?.getAttribute("aria-label") ?? "house"),
      name: world?.name ?? null,
      pet: world?.pet ?? null,
      trait: world?.trait ?? null,
      needs: world ? { ...world.needs } : null,
      food: world ? foodCount(world) : 0,
      activity: world?.activity.kind ?? null,
      room: world?.activity.room ?? null,
      friendship: world?.friendship ?? 0,
      letters: world?.letters.length ?? 0,
      unread: world?.letters.filter((l) => !l.read).length ?? 0,
      volume: world?.volume ?? 0.3,
      muted: world?.muted ?? false,
      bubble: clock < bubbleUntil ? bubble : "",
      lantern: calm ? lanternLevel((clock - calm.started) / slow) : null,
      calmSeconds: calm ? clock - calm.started : null,
      reduced,
      sprites: spritesShown,
      t: world?.t ?? 0,
    }),
    advance: (s: number) => {
      if (world) for (let i = 0; i < s; i++) step(world, 1);
    },
    setNeeds: (n: Partial<World["needs"]>) => {
      if (world) Object.assign(world.needs, n);
    },
  };
}
