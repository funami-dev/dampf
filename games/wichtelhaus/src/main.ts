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
  <div class="wh-bar" hidden>
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
  fn();
};

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

window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.tagName === "INPUT") return;
  if (e.code === "Escape") {
    if (paused) return setPaused(false);
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
const W0 = 480;
const H0 = 600;
const ROOM_W = 120;
const FLOOR_H = 110;
const HOUSE_X = (W0 - ROOM_W * 3) / 2;
const GROUND = 520;
const floorY = (f: number) => GROUND - (f + 1) * FLOOR_H; // Oberkante der Etage
const roomCenter = (r: Room) => {
  const o = ROOMS[r];
  const w = o.floor === 2 ? ROOM_W * 1.6 : ROOM_W;
  const x = o.floor === 2 ? W0 / 2 : HOUSE_X + ROOM_W * o.x + ROOM_W / 2;
  return { x: x + (o.floor === 2 ? 0 : 0), y: floorY(o.floor) + FLOOR_H - 8, w };
};
const STAIR_X = HOUSE_X + ROOM_W * 3 - 14;
const WALLS: Record<Room, number> = {
  kueche: 0xe9d8b4,
  wohnzimmer: 0xd9c6a5,
  werkstatt: 0xcdb48e,
  bad: 0xc9dde0,
  musik: 0xe2cfe0,
  schlafzimmer: 0xc9cfe8,
  dachboden: 0xb89a74,
};
const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;
const mix = (a: number, b: number, t: number) => {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(
    Math.round(ca.red + (cb.red - ca.red) * t),
    Math.round(ca.green + (cb.green - ca.green) * t),
    Math.round(ca.blue + (cb.blue - ca.blue) * t),
  );
};
const walker = { x: 0, y: 0, init: false, facing: 1, moving: false };

class HouseScene extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  bubble!: Phaser.GameObjects.Text;
  constructor() {
    super("house");
  }
  create() {
    this.g = this.add.graphics();
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
    const k = Math.min(Wd / W0, Hd / H0);
    const ox = (Wd - W0 * k) / 2;
    const oy = (Hd - H0 * k) / 2;
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
        const sy = (i * 53) % 260;
        R(sx, sy, 2, 2, 0xffffff, 0.35 + 0.35 * sway(clock / slow, 9, i * 0.13));
      }
    // Hügel und Bäume (wiegen sich langsam)
    g.fillStyle(night ? 0x22362a : 0x7fae6a, 1);
    g.fillEllipse(X(80), Y(GROUND + 20), 360 * k, 160 * k);
    g.fillEllipse(X(420), Y(GROUND + 30), 360 * k, 140 * k);
    for (const [tx, s] of [
      [24, 1],
      [452, 0.9],
      [60, 0.7],
    ] as const) {
      const sw = (sway(clock / slow, IDLE_CYCLES.baeume!, tx / 100) - 0.5) * 4;
      R(tx - 3, GROUND - 40 * s, 6, 40 * s, 0x6b4a2e);
      g.fillStyle(night ? 0x1f3a26 : 0x4f8a43, 1);
      g.fillCircle(X(tx + sw), Y(GROUND - 52 * s), 22 * s * k);
    }
    R(0, GROUND, W0, H0 - GROUND, night ? 0x2c3b2a : 0x6a9a58);
    // Regen (langsam fallende, dünne Striche)
    if (w && rainy(w)) {
      g.lineStyle(1 * k, 0xcfe3f2, 0.35);
      for (let i = 0; i < 60; i++) {
        const rx = (i * 41) % W0;
        const ry = ((i * 67 + clock * 90) % (GROUND + 40)) - 20;
        g.lineBetween(X(rx), Y(ry), X(rx - 3), Y(ry + 10));
      }
    }
    // Haus: Dach, Dachboden, zwei Etagen
    const roofY = floorY(2) + 12;
    g.fillStyle(0x7a3b2e, 1);
    g.fillTriangle(
      X(HOUSE_X - 20),
      Y(roofY + 68),
      X(W0 / 2),
      Y(roofY - 50),
      X(HOUSE_X + ROOM_W * 3 + 20),
      Y(roofY + 68),
    );
    const dim = night ? 0.55 : 1;
    // Dachboden
    const attic = w ? atticOpen(w) : false;
    g.fillStyle(mix(0x3a2a20, WALLS.dachboden, attic ? dim : 0.35), 1);
    g.fillTriangle(
      X(HOUSE_X + 20),
      Y(roofY + 62),
      X(W0 / 2),
      Y(roofY - 30),
      X(HOUSE_X + ROOM_W * 3 - 20),
      Y(roofY + 62),
    );
    if (attic) {
      // Teleskop
      R(W0 / 2 + 30, roofY + 30, 4, 30, 0x55433a);
      g.lineStyle(5 * k, 0x8a7a6a, 1);
      g.lineBetween(X(W0 / 2 + 32), Y(roofY + 30), X(W0 / 2 + 52), Y(roofY + 12));
    } else {
      g.lineStyle(3 * k, 0x2a1d16, 0.8);
      g.lineBetween(X(W0 / 2 - 40), Y(roofY + 30), X(W0 / 2 + 40), Y(roofY + 50));
      g.lineBetween(X(W0 / 2 - 40), Y(roofY + 50), X(W0 / 2 + 40), Y(roofY + 30));
    }
    for (const r of Object.keys(ROOMS) as Room[]) {
      const o = ROOMS[r];
      if (o.floor === 2) continue;
      const rx = HOUSE_X + ROOM_W * o.x;
      const ry = floorY(o.floor);
      R(rx, ry, ROOM_W, FLOOR_H, mix(0x241c2c, WALLS[r], dim));
      // Boden und Wände
      R(rx, ry + FLOOR_H - 8, ROOM_W, 8, 0x8a6a4a);
      R(rx, ry, 3, FLOOR_H, 0x5a4434);
      this.furniture(r, rx, ry, X, Y, R, night);
    }
    R(HOUSE_X + ROOM_W * 3 - 3, floorY(1), 3, FLOOR_H * 2, 0x5a4434);
    // Treppe (rechts innen)
    for (let s = 0; s < 8; s++) R(STAIR_X - s * 5, GROUND - 8 - s * (FLOOR_H / 8), 12, 3, 0x6b4f37);
    // Wichtel und Haustier
    if (w) this.wichtel(w, X, Y, R, k);
    else this.bubble.setVisible(false);
  }

  furniture(
    r: Room,
    rx: number,
    ry: number,
    X: (x: number) => number,
    Y: (y: number) => number,
    R: (x: number, y: number, ww: number, hh: number, c: number, a?: number) => void,
    night: boolean,
  ) {
    const g = this.g;
    const floor = ry + FLOOR_H - 8;
    // Fenster
    const win = night ? 0x2a3560 : 0xbfe0f5;
    R(rx + 44, ry + 18, 30, 24, 0x5a4434);
    R(rx + 46, ry + 20, 26, 20, win);
    const w = world;
    switch (r) {
      case "kueche": {
        R(rx + 8, floor - 34, 26, 34, 0x8b8f96); // Herd
        R(rx + 10, floor - 30, 22, 4, 0x3b3f44);
        R(rx + 80, floor - 44, 30, 44, 0xa77b4f); // Vorratsschrank
        const n = w ? foodCount(w) : 0;
        for (let i = 0; i < n; i++)
          R(rx + 84 + (i % 5) * 5, floor - 40 + Math.floor(i / 5) * 10, 4, 6, 0xf1c40f);
        R(rx + 40, floor - 18, 30, 4, 0x8a5a3a); // Tisch
        R(rx + 44, floor - 14, 3, 14, 0x8a5a3a);
        R(rx + 63, floor - 14, 3, 14, 0x8a5a3a);
        break;
      }
      case "wohnzimmer": {
        R(rx + 8, floor - 18, 40, 18, 0x9b4f4f); // Sofa
        R(rx + 8, floor - 26, 8, 26, 0x8a4545);
        R(rx + 86, floor - 50, 26, 50, 0x6b4a2e); // Regal
        for (let i = 0; i < 4; i++)
          R(rx + 89, floor - 46 + i * 12, 20, 8, [0xc0392b, 0x2e86c1, 0x27ae60, 0xd68910][i]!);
        // Kamin mit ruhigem Feuer (Zyklus 6 s, kein Flackern)
        R(rx + 56, floor - 26, 24, 26, 0x7a6a5a);
        const f = sway(clock / slow, IDLE_CYCLES.kerze!);
        g.fillStyle(0xf39c12, 0.6 + 0.3 * f);
        g.fillTriangle(
          X(rx + 61),
          Y(floor - 4),
          X(rx + 68),
          Y(floor - 18 - 3 * f),
          X(rx + 75),
          Y(floor - 4),
        );
        break;
      }
      case "werkstatt": {
        R(rx + 10, floor - 22, 50, 6, 0x8a5a3a); // Werkbank
        R(rx + 14, floor - 16, 4, 16, 0x8a5a3a);
        R(rx + 52, floor - 16, 4, 16, 0x8a5a3a);
        R(rx + 72, floor - 56, 40, 4, 0x6b4a2e); // Regal mit Basteleien
        const n = Math.min(8, w?.crafted ?? 0);
        for (let i = 0; i < n; i++)
          R(rx + 74 + i * 5, floor - 64, 4, 8, [0xe67e22, 0x16a085, 0x8e44ad][i % 3]!);
        break;
      }
      case "bad": {
        R(rx + 10, floor - 20, 50, 20, 0xffffff); // Wanne
        R(rx + 12, floor - 18, 46, 6, 0x9fd3e8);
        R(rx + 86, floor - 34, 20, 26, 0xd0e6ea); // Spiegel/Waschbecken
        break;
      }
      case "musik": {
        R(rx + 10, floor - 30, 44, 30, 0x2b2b2b); // Klavier
        R(rx + 12, floor - 24, 40, 5, 0xffffff);
        R(rx + 86, floor - 30, 8, 30, 0xd4a017); // Notenständer
        if (w?.activity.kind === "musik") {
          const p = (clock / slow) % 6;
          g.fillStyle(0x3a2f45, Math.max(0, 1 - p / 6));
          g.fillCircle(X(rx + 40 + p * 6), Y(floor - 44 - p * 6), 3);
        }
        break;
      }
      case "schlafzimmer": {
        R(rx + 50, floor - 18, 60, 18, 0x6b8acb); // Bett
        R(rx + 50, floor - 24, 14, 10, 0xffffff);
        // Laterne mit langsamem Atem-Rhythmus (10 s)
        const l = sway(clock / slow, IDLE_CYCLES.laterne!);
        R(rx + 14, floor - 30, 10, 14, 0x5a4434);
        g.fillStyle(0xffd27a, 0.35 + 0.4 * l);
        g.fillCircle(X(rx + 19), Y(floor - 23), (6 + 3 * l) * (X(1) - X(0)));
        break;
      }
      case "dachboden":
        break;
    }
  }

  wichtel(
    w: World,
    X: (x: number) => number,
    Y: (y: number) => number,
    R: (x: number, y: number, ww: number, hh: number, c: number, a?: number) => void,
    k: number,
  ) {
    const g = this.g;
    const target = roomCenter(w.activity.room);
    const tx = target.x + (w.activity.kind === "schlafen" ? 20 : -14);
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
      if (Math.abs(walker.x - STAIR_X) > 1) {
        walker.facing = Math.sign(STAIR_X - walker.x);
        walker.x +=
          Math.sign(STAIR_X - walker.x) * Math.min(speed * dt, Math.abs(STAIR_X - walker.x));
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
    if (sleeping) {
      // liegt im Bett, Zzz sanft
      R(x - 10, y - 10, 20, 7, hex(w.hat));
      R(x + 8, y - 12, 8, 8, 0xf5d0b0);
      g.fillStyle(0x3a2f45, 0.4 + 0.4 * breath);
      g.fillCircle(X(x + 22), Y(y - 26 - breath * 6), 2.5 * k);
    } else {
      R(x - 6, y - 16, 12, 14, 0x5d7a3a); // Körper
      R(x - 5, y - 2, 4, 2, 0x3b2a1e);
      R(x + 1, y - 2, 4, 2, 0x3b2a1e);
      R(x - 5, y - 26, 10, 10, 0xf5d0b0); // Kopf
      R(x - 5, y - 20, 10, 5, 0xffffff); // Bart
      g.fillStyle(hex(w.hat), 1); // Zipfelmütze
      g.fillTriangle(X(x - 7), Y(y - 25), X(x + 7), Y(y - 25), X(x + walker.facing * 6), Y(y - 42));
      R(x + (walker.facing > 0 ? 1 : -3), y - 23, 2, 2, 0x2b2b2b);
    }
    // Haustier folgt gemütlich
    const px = x - walker.facing * 18;
    const pb = sway(clock / slow, IDLE_CYCLES.haustier!) * 1;
    const pc = w.pet === "katze" ? 0xd68910 : w.pet === "igel" ? 0x7a5a3a : 0x48a36a;
    R(px - 6, walker.y - 8 - pb, 12, 8, pc);
    R(px + walker.facing * 4, walker.y - 12 - pb, 5, 5, pc);
    if (w.pet === "igel")
      for (let i = 0; i < 4; i++) R(px - 6 + i * 3, walker.y - 10 - pb, 2, 2, 0x4a3420);
    if (w.pet === "drache") R(px - 2, walker.y - 11 - pb, 4, 2, 0x2e7d4f);
    // Sprechblase
    const show = bubble && clock < bubbleUntil;
    this.bubble
      .setVisible(!!show)
      .setText(show ? bubble : "")
      .setScale(1)
      .setPosition(X(Math.max(110, Math.min(W0 - 110, x))), Y(y - 48));
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
