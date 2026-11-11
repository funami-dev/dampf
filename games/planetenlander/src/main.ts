import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import {
  BODIES,
  G_EARTH,
  PLAYABLE,
  airText,
  bodyById,
  compareText,
  de,
  fallText,
  type Body,
} from "./logic/bodies.ts";
import {
  LANDER,
  SAFE,
  STEP,
  judge,
  stars as starsFor,
  startLander,
  step,
  touching,
  type Controls,
  type Lander,
  type Verdict,
  margins,
} from "./logic/physics.ts";
import { loadProgress, record, saveProgress, type Store } from "./logic/progress.ts";
import { WIDTH, groundAt, makeTerrain, type Terrain } from "./logic/terrain.ts";
import { debugEnabled } from "./debug.ts";

// Steuer-Knöpfe nur mit gezeichneten Bildern, ohne Text – auf dem iPhone lässt sich so beim
// langen Drücken nichts markieren (Feedback fb_h1hi7qx7)
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false">${body}</svg>`;
const ICON_LEFT = svg(
  '<path d="M7 7a8 8 0 1 1-1.8 8.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M3 4v6h6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
);
const ICON_RIGHT = svg(
  '<path d="M17 7a8 8 0 1 0 1.8 8.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M21 4v6h-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
);
const ICON_FLAME = svg(
  '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3-1-5 1-8z" fill="#c0392b"/><path d="M12 12c.5 2 3 3 3 5.5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3.5.3 1 .8 1.5 1.5 1.5 0-1.5-.5-2.5 0-3.5z" fill="#ffd166"/>',
);

const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
stage.style.background = "#0b0f1a";

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
let progress = loadProgress(store);

// --- Oberfläche --------------------------------------------------------------
const layer = document.createElement("div");
layer.className = "pl-layer";
layer.innerHTML = `
  <div class="pl-hud" role="status" hidden>
    <div><span>Höhe</span><b data-h="alt">0 m</b></div>
    <div><span>Sinken</span><b data-h="down">0,0 m/s</b></div>
    <div><span>Seitlich</span><b data-h="side">0,0 m/s</b></div>
    <div><span>Neigung</span><b data-h="tilt">0°</b></div>
    <div><span>Treibstoff</span><b data-h="fuel">100 %</b></div>
    <div><span>g</span><b data-h="g">1,62</b></div>
  </div>
  <button class="pl-btn pl-pause" type="button" data-b="pause" hidden>Pause</button>
  <div class="pl-controls" hidden>
    <div class="pl-turn">
      <button class="pl-btn pl-big" type="button" data-c="left" data-hold aria-label="Links drehen">${ICON_LEFT}</button>
      <button class="pl-btn pl-big" type="button" data-c="right" data-hold aria-label="Rechts drehen">${ICON_RIGHT}</button>
    </div>
    <button class="pl-btn pl-big pl-thrust" type="button" data-c="thrust" data-hold aria-label="Schub">${ICON_FLAME}</button>
  </div>`;
stage.append(layer);
const $ = <E extends HTMLElement>(s: string) => layer.querySelector<E>(s)!;
const hudEl = $(".pl-hud");
const controlsEl = $(".pl-controls");
const pauseBtn = $<HTMLButtonElement>('[data-b="pause"]');
const hud = (k: string) => $(`[data-h="${k}"]`);

// --- Zustand -------------------------------------------------------------------
type Screen = "select" | "learn" | "info" | "fly" | "result";
let screen: Screen = "select";
let paused = false;
let body: Body = PLAYABLE[0]!;
let terrain: Terrain = makeTerrain(body.id, body.rho === 0);
let lander: Lander = startLander(terrain);
let result: { v: Verdict; stars: number } | null = null;
let acc = 0;
let overlay: HTMLElement | null = null;
const keys = new Set<string>();
const touch = { thrust: false, left: false, right: false };
interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  w: number;
  life: number;
  color: number;
}
let pieces: Piece[] = [];

const controls = (): Controls => ({
  thrust: touch.thrust || keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space"),
  left: touch.left || keys.has("ArrowLeft") || keys.has("KeyA"),
  right: touch.right || keys.has("ArrowRight") || keys.has("KeyD"),
});

const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pct = (g: number) => `${Math.round((g / G_EARTH) * 100)} % der Erde`;
const starText = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);

function panel(html: string) {
  overlay?.remove();
  const el = document.createElement("div");
  el.className = "pl-panel";
  el.innerHTML = html;
  layer.append(el);
  overlay = el;
  return el;
}
function closePanel() {
  overlay?.remove();
  overlay = null;
}
function flyUi(on: boolean) {
  hudEl.hidden = !on;
  controlsEl.hidden = !on;
  pauseBtn.hidden = !on;
}

// --- Auswahl -------------------------------------------------------------------
function openSelect() {
  screen = "select";
  paused = false;
  flyUi(false);
  // alle Orte sind sofort spielbar (Feedback fb_2rpon5ao)
  const card = (b: Body) => {
    const best = progress.best[b.id] ?? 0;
    return `<button class="pl-card" type="button" data-id="${b.id}" aria-label="${escapeHtml(b.name)}">
      <span class="pl-icon">${b.icon}</span>
      <b>${escapeHtml(b.name)}</b>
      <small>g = ${de(b.g, 2)} m/s² · ${pct(b.g)}</small>
      <span class="pl-stars">${starText(best)}</span>
    </button>`;
  };
  const gas = BODIES.filter((b) => !b.playable)
    .map(
      (
        b,
      ) => `<button class="pl-card gas" type="button" data-gas="${b.id}" aria-label="${escapeHtml(b.name)}: Warum nicht?">
      <span class="pl-icon">${b.icon}</span>
      <b>${escapeHtml(b.name)}</b>
      <small>g = ${de(b.g, 2)} m/s² · ${pct(b.g)}</small>
      <span class="pl-why">ℹ️ Warum nicht?</span>
    </button>`,
    )
    .join("");
  const el = panel(`<h2>Planetenlander</h2>
    <p>Wo willst du landen? Jeder Ort hat seine echte Schwerkraft.</p>
    <div class="pl-grid">${PLAYABLE.map(card).join("")}</div>
    <h3>Gasriesen – hier kann man nicht landen</h3>
    <div class="pl-grid">${gas}</div>`);
  el.classList.add("pl-scroll");
  el.querySelectorAll<HTMLButtonElement>("[data-id]").forEach((b) =>
    b.addEventListener("click", () => openLearn(bodyById(b.dataset.id!)!)),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-gas]").forEach((b) =>
    b.addEventListener("click", () => openGasInfo(bodyById(b.dataset.gas!)!)),
  );
}

function openGasInfo(b: Body) {
  screen = "info";
  const el = panel(`<h2>${b.icon} ${escapeHtml(b.name)}</h2>
    <p class="pl-g">Schwerkraft: <b>${de(b.g, 2)} m/s²</b></p>
    <p>${compareText(b.g)}</p>
    <p class="pl-fact">${escapeHtml(b.fact)}</p>
    <p><b>Deshalb kann man hier nicht landen.</b></p>
    <button class="pl-btn primary" type="button" data-a="back">Zurück</button>`);
  el.querySelector('[data-a="back"]')!.addEventListener("click", openSelect);
}

// --- Lern-Karte ------------------------------------------------------------------
function openLearn(b: Body) {
  screen = "learn";
  body = b;
  const el = panel(`<h2>${b.icon} ${escapeHtml(b.name)}</h2>
    <p class="pl-g">Schwerkraft: <b>${de(b.g, 2)} m/s²</b></p>
    <p>${compareText(b.g)}</p>
    <p>${fallText(b.g)}</p>
    <p>${airText(b)}</p>
    <p class="pl-fact">${escapeHtml(b.fact)}</p>
    <p class="pl-hint">Lande auf der gelben Plattform: langsamer als ${SAFE.down} m/s nach unten, höchstens ${SAFE.side} m/s zur Seite, fast gerade.<br>
    <small>Schub: ↑ / W / Leertaste · Drehen: ← → / A D · Pause: P</small></p>
    <div class="pl-row">
      <button class="pl-btn" type="button" data-a="back">Zurück</button>
      <button class="pl-btn primary" type="button" data-a="go">Los!</button>
    </div>`);
  el.querySelector('[data-a="back"]')!.addEventListener("click", openSelect);
  el.querySelector('[data-a="go"]')!.addEventListener("click", () => startFlight(b));
}

// --- Flug ----------------------------------------------------------------------------
function startFlight(b: Body) {
  body = b;
  terrain = makeTerrain(b.id, b.rho === 0);
  lander = startLander(terrain);
  result = null;
  pieces = [];
  acc = 0;
  view.h = 0;
  keys.clear();
  Object.assign(touch, { thrust: false, left: false, right: false });
  closePanel();
  screen = "fly";
  paused = false;
  flyUi(true);
  hud("g").textContent = `${de(b.g, 2)} m/s²`;
}

function setPaused(v: boolean) {
  if (screen !== "fly") return;
  if (v && !paused) {
    paused = true;
    keys.clear();
    Object.assign(touch, { thrust: false, left: false, right: false });
    const el = panel(`<h2>Pause</h2>
      <button class="pl-btn primary" type="button" data-a="resume">Weiterspielen</button>
      <button class="pl-btn" type="button" data-a="select">Zur Auswahl</button>`);
    el.querySelector('[data-a="resume"]')!.addEventListener("click", () => setPaused(false));
    el.querySelector('[data-a="select"]')!.addEventListener("click", openSelect);
  } else if (!v && paused) {
    paused = false;
    closePanel();
  }
}

const REASON: Record<Verdict["reason"], string> = {
  ok: "",
  neben: "Zu felsig hier – ziel auf die gelbe Plattform!",
  hart: "Zu schnell aufgesetzt – bremse früher mit der Düse.",
  seitlich: "Zu schnell zur Seite – bleib ruhig über der Plattform.",
  schief: "Zu schief – richte die Fähre vor dem Aufsetzen gerade auf.",
};

function finish() {
  const v = judge(lander, terrain);
  const s = starsFor(v, lander.fuel);
  result = { v, stars: s };
  screen = "result";
  flyUi(false);
  keys.clear();
  if (v.landed) {
    lander.y = groundAt(terrain, lander.x);
    lander.vx = 0;
    lander.vy = 0;
    lander.angle = 0;
    progress = record(progress, body.id, s);
    saveProgress(store, progress);
    if (body.rho === 0) dust();
  } else crash();
  const i = PLAYABLE.findIndex((b) => b.id === body.id);
  const next = v.landed && i + 1 < PLAYABLE.length ? PLAYABLE[i + 1]! : null;
  const el = panel(`<h2>${v.landed ? "Gelandet! 🎉" : "Rumms! 💥"}</h2>
    ${v.landed ? `<p class="pl-big-stars" aria-label="${s} von 3 Sternen">${starText(s)}</p>` : `<p>${REASON[v.reason]}</p>`}
    <dl class="pl-values">
      ${margins(v)
        .map((m) => {
          const n = (x: number) => (m.key === "tilt" ? `${Math.round(x)}` : de(x));
          const sep = m.key === "tilt" ? "" : " ";
          const val = `${n(m.value)}${sep}${m.unit}`;
          // knapp drüber zeigt mindestens 0,1 m/s bzw. 1°, damit nie „0,0 zu schnell“ dasteht
          const over = Math.max(m.key === "tilt" ? 1 : 0.1, m.over);
          const verdict =
            m.over > 0
              ? `<span class="pl-over">${n(over)}${sep}${m.unit} ${m.word}</span>`
              : `<span class="pl-ok">✓</span>`;
          return `<dt>${m.label}</dt><dd>${val} <small>· erlaubt ${n(m.limit)}${sep}${m.unit}</small> · ${verdict}</dd>`;
        })
        .join("")}
      <dt>Treibstoff</dt><dd>${Math.round((lander.fuel / LANDER.fuel) * 100)} %</dd>
    </dl>
    <div class="pl-row">
      <button class="pl-btn" type="button" data-a="again">Nochmal</button>
      ${next ? `<button class="pl-btn primary" type="button" data-a="next">Nächster Ort: ${escapeHtml(next.name)}</button>` : ""}
      <button class="pl-btn" type="button" data-a="select">Zur Auswahl</button>
    </div>`);
  el.classList.add("pl-result");
  el.querySelector('[data-a="again"]')!.addEventListener("click", () => startFlight(body));
  el.querySelector('[data-a="next"]')?.addEventListener("click", () => openLearn(next!));
  el.querySelector('[data-a="select"]')!.addEventListener("click", openSelect);
}

function crash() {
  const colors = [0xd9d9e0, 0xf6c344, 0x9aa3b5, 0xffffff, 0xff8a3d];
  for (let k = 0; k < 18; k++)
    pieces.push({
      x: lander.x + (Math.random() - 0.5) * 4,
      y: lander.y + 1 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 14,
      vy: 4 + Math.random() * 10,
      r: Math.random() * 6,
      w: 0.4 + Math.random() * 1.2,
      life: 3,
      color: colors[k % colors.length]!,
    });
}
function dust() {
  for (let k = 0; k < 16; k++)
    pieces.push({
      x: lander.x + (Math.random() - 0.5) * 3,
      y: lander.y + 0.2,
      vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 5),
      vy: Math.random() * 1.5,
      r: 0,
      w: 0.5 + Math.random() * 0.6,
      life: 1.6,
      color: 0xbdb8ad,
    });
}

function tick(dt: number) {
  if (screen === "fly" && !paused) {
    acc += Math.min(dt, 0.1);
    const c = controls();
    while (acc >= STEP) {
      acc -= STEP;
      step(lander, c, body, STEP, WIDTH);
      if (touching(lander, terrain)) {
        finish();
        break;
      }
    }
    updateHud();
  }
  for (const p of pieces) {
    p.life -= dt;
    p.vy -= Math.max(body.g, 1) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += dt * 4;
    const gy = groundAt(terrain, p.x);
    if (p.y < gy) {
      p.y = gy;
      p.vy = 0;
      p.vx *= 0.8;
    }
  }
  pieces = pieces.filter((p) => p.life > 0 || p.color !== 0xbdb8ad);
}

function updateHud() {
  const alt = Math.max(0, lander.y - groundAt(terrain, lander.x));
  const down = -lander.vy;
  const side = Math.abs(lander.vx);
  const tilt = Math.abs((lander.angle * 180) / Math.PI);
  const set = (k: string, text: string, ok: boolean | null, warn = false) => {
    const el = hud(k);
    el.textContent = text;
    el.className = ok === null ? "" : ok ? "ok" : warn ? "warn" : "bad";
  };
  set("alt", `${Math.round(alt)} m`, null);
  set(
    "down",
    `${down >= 0 ? "↓" : "↑"} ${de(Math.abs(down))} m/s`,
    down <= SAFE.down,
    down <= SAFE.down * 2,
  );
  set("side", `${lander.vx >= 0 ? "→" : "←"} ${de(side)} m/s`, side <= SAFE.side, side <= 2);
  set("tilt", `${Math.round(tilt)}°`, tilt <= 10, tilt <= 20);
  const f = Math.round((lander.fuel / LANDER.fuel) * 100);
  set("fuel", `${f} %`, f > 20, f > 0);
}

// --- Eingaben ------------------------------------------------------------------------------
const GAME_KEYS = [
  "ArrowUp",
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "Space",
  "KeyW",
  "KeyA",
  "KeyD",
];
window.addEventListener("keydown", (e) => {
  if (
    (e.target as HTMLElement)?.tagName === "INPUT" ||
    (e.target as HTMLElement)?.tagName === "TEXTAREA"
  )
    return;
  if (screen === "fly" && (e.code === "KeyP" || e.code === "Escape")) {
    setPaused(!paused);
    e.preventDefault();
    return;
  }
  if (GAME_KEYS.includes(e.code) && screen === "fly") {
    keys.add(e.code);
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  setPaused(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPaused(true);
});
pauseBtn.addEventListener("click", () => setPaused(true));
controlsEl.querySelectorAll<HTMLButtonElement>("[data-c]").forEach((b) => {
  const k = b.dataset.c as keyof typeof touch;
  const on = (e: PointerEvent) => {
    e.preventDefault();
    b.setPointerCapture?.(e.pointerId);
    touch[k] = true;
    b.classList.add("on");
  };
  const off = () => {
    touch[k] = false;
    b.classList.remove("on");
  };
  b.addEventListener("pointerdown", on);
  b.addEventListener("pointerup", off);
  b.addEventListener("pointercancel", off);
  b.addEventListener("lostpointercapture", off);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
});

// --- Grafik ------------------------------------------------------------------------------
const view = { h: 0 };
const STARS = Array.from({ length: 70 }, () => ({
  x: Math.random(),
  y: Math.random() * 0.8,
  s: Math.random() < 0.2 ? 2 : 1,
}));
const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;

class FlightScene extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  constructor() {
    super("flight");
  }
  create() {
    this.g = this.add.graphics();
  }
  override update(_time: number, delta: number) {
    tick(delta / 1000);
    this.draw(_time);
  }
  draw(time: number) {
    const g = this.g;
    const W = this.scale.width;
    const H = this.scale.height;
    g.clear();
    const c = body.colors;
    g.fillGradientStyle(hex(c.skyTop), hex(c.skyTop), hex(c.skyBottom), hex(c.skyBottom), 1);
    g.fillRect(0, 0, W, H);
    if (screen === "select" || screen === "info") return;
    if (body.stars) {
      g.fillStyle(0xffffff, 0.8);
      for (const s of STARS) g.fillRect(Math.floor(s.x * W), Math.floor(s.y * H), s.s, s.s);
    }
    // Ansicht: nah am Boden größer
    const ground = groundAt(terrain, lander.x);
    const alt = Math.max(0, lander.y - ground);
    const want = Math.max(70, Math.min(420, alt * 2.2 + 40));
    view.h = view.h ? view.h + (want - view.h) * 0.05 : want;
    const S = H / view.h;
    let bottom = Math.min(ground, terrain.pad.y) - view.h * 0.15;
    if (lander.y - bottom > view.h * 0.72) bottom = lander.y - view.h * 0.72;
    const camX = lander.x;
    const sx = (x: number) => (x - camX) * S + W / 2;
    const sy = (y: number) => H - (y - bottom) * S;

    // Boden
    const x0 = Math.max(0, camX - W / 2 / S - 10);
    const x1 = Math.min(WIDTH, camX + W / 2 / S + 10);
    const pts: Phaser.Math.Vector2[] = [];
    for (let x = x0; x <= x1; x += 2)
      pts.push(new Phaser.Math.Vector2(sx(x), sy(groundAt(terrain, x))));
    pts.push(new Phaser.Math.Vector2(sx(x1), H + 10), new Phaser.Math.Vector2(sx(x0), H + 10));
    g.fillStyle(hex(c.ground), 1);
    g.fillPoints(pts, true);
    g.lineStyle(Math.max(2, S * 0.6), hex(c.edge), 1);
    g.strokePoints(pts.slice(0, -2), false);
    // außerhalb des Gebiets: dunkle Wände
    g.fillStyle(0x000000, 0.35);
    if (sx(0) > 0) g.fillRect(0, 0, sx(0), H);
    if (sx(WIDTH) < W) g.fillRect(sx(WIDTH), 0, W - sx(WIDTH), H);

    // Plattform
    const p = terrain.pad;
    g.fillStyle(0xf6c344, 1);
    g.fillRect(sx(p.x0), sy(p.y) - Math.max(3, S * 0.6), (p.x1 - p.x0) * S, Math.max(3, S * 0.6));
    const blink = Math.floor(time / 400) % 2 ? 0xff5a4f : 0x7bd35a;
    g.fillStyle(blink, 1);
    for (const x of [p.x0, p.x1])
      g.fillRect(sx(x) - 2, sy(p.y) - Math.max(6, S * 1.6), 4, Math.max(4, S));
    // Pfeil zur Plattform, wenn sie nicht zu sehen ist
    const px = sx(p.center);
    if (px < 0 || px > W) {
      const right = px > W;
      const ax = right ? W - 14 : 14;
      const ay = H * 0.5;
      g.fillStyle(0xf6c344, 1);
      g.fillTriangle(
        ax + (right ? 10 : -10),
        ay,
        ax - (right ? 6 : -6),
        ay - 9,
        ax - (right ? 6 : -6),
        ay + 9,
      );
    }

    // Fähre
    if (!(result && !result.v.landed)) this.drawLander(g, sx, sy, S, time);
    // Trümmer / Staub
    for (const q of pieces) {
      if (q.life <= 0 && q.color === 0xbdb8ad) continue;
      g.fillStyle(q.color, q.color === 0xbdb8ad ? Math.max(0, q.life / 1.6) * 0.7 : 1);
      const w = Math.max(2, q.w * S);
      g.fillRect(sx(q.x) - w / 2, sy(q.y) - w / 2, w, w * (0.5 + 0.5 * Math.abs(Math.sin(q.r))));
    }
    // Dunst (dichte Luft)
    if (c.haze) {
      const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(c.haze);
      if (m) {
        g.fillStyle(Phaser.Display.Color.GetColor(+m[1]!, +m[2]!, +m[3]!), +m[4]! * 0.6);
        g.fillRect(0, 0, W, H);
      }
    }
  }
  drawLander(
    g: Phaser.GameObjects.Graphics,
    sx: (x: number) => number,
    sy: (y: number) => number,
    S: number,
    time: number,
  ) {
    const l = lander;
    const cx = l.x;
    const cy = l.y + 2.5;
    const cos = Math.cos(l.angle);
    const sin = Math.sin(l.angle);
    // lokale Koordinaten (m, y nach oben, Fußpunkt-Mitte = 0,0) → Bildschirm
    // in großer Höhe größer zeichnen, damit man die Fähre sieht (mindestens 5 px pro Meter)
    const k = Math.max(1, 5 / S);
    const P = (x: number, y: number) => {
      const dx = x * k;
      const dy = (y - 2.5) * k;
      return new Phaser.Math.Vector2(sx(cx + dx * cos + dy * sin), sy(cy - dx * sin + dy * cos));
    };
    const poly = (color: number, pts: [number, number][]) => {
      g.fillStyle(color, 1);
      g.fillPoints(
        pts.map(([x, y]) => P(x, y)),
        true,
      );
    };
    const c = controls();
    if (screen === "fly" && c.thrust && l.fuel > 0) {
      const len = 2.2 + Math.sin(time / 30) * 0.4 + Math.random() * 0.6;
      poly(0xff8a3d, [
        [-0.7, 1.1],
        [0.7, 1.1],
        [0, 1.1 - len],
      ]);
      poly(0xffe27a, [
        [-0.35, 1.1],
        [0.35, 1.1],
        [0, 1.1 - len * 0.55],
      ]);
    }
    if (screen === "fly" && (c.left || c.right) && l.fuel > 0) {
      const side = c.right ? -1 : 1;
      poly(0xffffff, [
        [side * 2.1, 3.6],
        [side * 2.1, 3.2],
        [side * 2.9, 3.4],
      ]);
    }
    // Beine
    g.lineStyle(Math.max(2, S * k * 0.35), 0x9aa3b5, 1);
    for (const s of [-1, 1]) {
      const a = P(s * 1.5, 1.6);
      const b = P(s * 2.5, 0);
      g.lineBetween(a.x, a.y, b.x, b.y);
      const f1 = P(s * 2.5 - 0.5, 0);
      const f2 = P(s * 2.5 + 0.5, 0);
      g.lineBetween(f1.x, f1.y, f2.x, f2.y);
    }
    // Düse, Rumpf, Kabine, Fenster
    poly(0x5d6577, [
      [-0.6, 1.5],
      [0.6, 1.5],
      [0.8, 1.1],
      [-0.8, 1.1],
    ]);
    poly(0xd9a441, [
      [-2, 1.5],
      [2, 1.5],
      [2, 3.2],
      [-2, 3.2],
    ]);
    poly(0xd9d9e0, [
      [-1.5, 3.2],
      [1.5, 3.2],
      [1.1, 4.8],
      [-1.1, 4.8],
    ]);
    poly(0x2b3a55, [
      [-0.5, 3.6],
      [0.5, 3.6],
      [0.4, 4.3],
      [-0.4, 4.3],
    ]);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: "#0b0f1a",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: stage.clientWidth, height: stage.clientHeight },
  scene: [FlightScene],
  banner: false,
});
openSelect();

if (debugEnabled) {
  window.__dampf = {
    state: () => ({
      screen: paused ? "paused" : screen,
      paused,
      body: screen === "select" ? null : body.id,
      alt: lander.y - groundAt(terrain, lander.x),
      x: lander.x,
      vx: lander.vx,
      vy: lander.vy,
      angle: (lander.angle * 180) / Math.PI,
      fuel: lander.fuel,
      padCenter: terrain.pad.center,
      result: result
        ? { landed: result.v.landed, reason: result.v.reason, stars: result.stars }
        : null,
      best: { ...progress.best },
    }),
    place: (alt, vy, vx = 0, angle = 0) => {
      lander.x = terrain.pad.center;
      lander.y = groundAt(terrain, lander.x) + alt;
      lander.vx = vx;
      lander.vy = vy;
      lander.angle = (angle * Math.PI) / 180;
      lander.omega = 0;
    },
  };
}
