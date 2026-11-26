/**
 * Knobel-Insel (Spec: specs/games/knobel-insel.md): Insel-Karte, Pfannkuchen-Turm (Hanoi) und
 * Über den Fluss. Gezeichnet wird in eine kleine Pixel-Bildfläche, die Phaser scharf vergrößert.
 */
import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { Sound } from "./audio.ts";
import { debugEnabled } from "./debug.ts";
import {
  LEVELS,
  PEG_NAMES,
  canMove,
  helperDisc,
  helperPlan,
  minMoves,
  move,
  newTower,
  solve,
  solved,
  starsFor,
  taskText,
  top,
  type Frame,
  type Pegs,
} from "./logic/hanoi.ts";
import {
  RIVER_LEVELS,
  boatCheck,
  cloneState,
  cross,
  graph,
  hint,
  isGoal,
  key,
  kindsAt,
  problem,
  shortest,
  startState,
  type RiverLevel,
  type State,
} from "./logic/river.ts";
import { load, record, save, unlocked, type Saved, type Store } from "./logic/save.ts";
import { REGIONS, type Chapter, type Kit, type Region } from "./chapters/kit.ts";
import { waageChapter } from "./chapters/waage.ts";
import { mazeChapter } from "./chapters/maze.ts";
import { flipChapter } from "./chapters/flip.ts";
import { bridgeChapter } from "./chapters/bridge.ts";
import { jugsChapter } from "./chapters/jugs.ts";
import { frogsChapter } from "./chapters/frogs.ts";
import { lightsChapter } from "./chapters/lights.ts";
import { penguinsChapter } from "./chapters/penguins.ts";
import { SPRITES, drawSprite, spriteSize } from "./art/sprites.ts";
import {
  RIVER_HALF,
  discWidth,
  drawBoat,
  drawIsland,
  drawKitchen,
  drawPancake,
  drawRiverWorld,
  drawWaterSparkle,
  isoFor,
  kitchenLayout,
  tile,
  type Iso,
  type KitchenLayout,
} from "./art/scenes.ts";

const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
stage.style.background = "#5fb3e0";

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
const data: Saved = load(store);
const sound = new Sound();
sound.setVolume(data.volume, data.muted);

type View = "map" | "hanoi" | "river" | "chapter";
let view: View = "map";
let paused = false;
let clock = 0;
/** nur für Tests: Animationen schneller */
let speed = 1;

// --- Oberfläche (HTML über der Pixel-Fläche) ------------------------------------------
const layer = document.createElement("div");
layer.className = "ki-layer";
layer.innerHTML = `
  <div class="ki-top" hidden>
    <div class="ki-head"><b data-h="title"></b><span data-h="count" role="status"></span></div>
    <div class="ki-tools" data-h="tools"></div>
  </div>
  <div class="ki-chapters" role="region" aria-label="Kapitel" hidden></div>
  <ol class="ki-steps" data-h="steps" aria-label="Aufgaben der Zeitlupe" hidden></ol>
  <div class="ki-toast" role="alert" hidden></div>
  <button class="ki-btn ki-menu" type="button" data-b="menu" aria-label="Menü">☰</button>`;
stage.append(layer);
const $ = <E extends HTMLElement = HTMLElement>(s: string) => layer.querySelector<E>(s)!;
const h = (k: string) => $(`[data-h="${k}"]`);
let overlay: HTMLElement | null = null;
let toastTimer = 0;
function toast(text: string, secs = 3) {
  const el = $(".ki-toast");
  el.textContent = text;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), secs * 1000);
}
function panel(html: string, label: string) {
  overlay?.remove();
  const el = document.createElement("section");
  el.className = "ki-panel";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", label);
  el.innerHTML = html;
  layer.append(el);
  overlay = el;
  return el;
}
function closePanel() {
  overlay?.remove();
  overlay = null;
}
const stars = (n: number) => `${"⭐".repeat(n)}${"☆".repeat(3 - n)}`;
const btn = (label: string, attr: string, extra = "") =>
  `<button class="ki-btn ${extra}" type="button" ${attr}>${label}</button>`;
function persist() {
  save(store, data);
}

// --- Insel-Karte mit Gegenden (KI-AK-09) ----------------------------------------------------
interface Entry {
  id: string;
  icon: string;
  title: string;
  region: Region;
  levels: { id: string; label: string; aria: string }[];
  open: (i: number) => void;
}
function entries(): Entry[] {
  const own: Entry[] = [
    {
      id: "hanoi",
      icon: "🥞",
      title: "Pfannkuchen-Turm",
      region: "logik",
      levels: LEVELS.map((n, i) => ({
        id: `h${n}`,
        label: `${n} 🥞`,
        aria: `Pfannkuchen-Turm Level ${i + 1}: ${n} Pfannkuchen`,
      })),
      open: (i) => startHanoi(LEVELS[i]!),
    },
    {
      id: "river",
      icon: "⛵",
      title: "Über den Fluss",
      region: "logik",
      levels: RIVER_LEVELS.map((l, i) => ({
        id: l.id,
        label: l.title,
        aria: `Über den Fluss Level ${i + 1}: ${l.title}`,
      })),
      open: (i) => startRiver(RIVER_LEVELS[i]!),
    },
  ];
  const more: Entry[] = CHAPTERS.map((c) => ({
    id: c.id,
    icon: c.icon,
    title: c.title,
    region: c.region,
    levels: c.levels.map((l, i) => ({ ...l, aria: `${c.title} Level ${i + 1}: ${l.label}` })),
    open: (i) => startChapter(c, i),
  }));
  return [...own, ...more];
}
function showMap() {
  view = "map";
  cur = null;
  stopZeitlupe();
  closePanel();
  $(".ki-top").hidden = true;
  h("steps").hidden = true;
  const ch = $(".ki-chapters");
  ch.hidden = false;
  const lvl = (id: string, label: string, aria: string) => {
    const open = unlocked(data, id);
    const st = data.stars[id] ?? 0;
    return `<button class="ki-btn ki-level" type="button" data-l="${id}" aria-label="${aria}" ${open ? "" : "disabled"}>${open ? "" : "🔒 "}${label}<small>${stars(st)}</small></button>`;
  };
  const list = entries();
  ch.innerHTML = (Object.keys(REGIONS) as Region[])
    .map((r) => {
      const es = list.filter((e) => e.region === r);
      return `<section class="ki-region" style="--rc:${REGIONS[r].color}"><h2>${REGIONS[r].title}</h2>
        ${
          es.length
            ? es
                .map(
                  (e) => `<div class="ki-chapter"><h3>${e.icon} ${e.title}</h3>
                  <div class="ki-levels">${e.levels.map((l) => lvl(l.id, l.label, l.aria)).join("")}</div>
                  ${data.cards.includes(e.id) ? btn("🤖 So denkt ein Computer", `data-card="${e.id}"`, "ki-small") : ""}</div>`,
                )
                .join("")
            : `<p class="ki-soon">Bald: Orakel-Uhu, Zaubertrick, Geheimschrift und Schildkröten-Programm.</p>`
        }</section>`;
    })
    .join("");
  ch.querySelectorAll<HTMLButtonElement>("[data-l]").forEach((b) =>
    b.addEventListener("click", () => {
      sound.start();
      const id = b.dataset.l!;
      for (const e of list) {
        const i = e.levels.findIndex((l) => l.id === id);
        if (i >= 0) e.open(i);
      }
    }),
  );
  ch.querySelectorAll<HTMLButtonElement>("[data-card]").forEach((b) =>
    b.addEventListener("click", () => showCard(b.dataset.card!, showMap)),
  );
}

const CARDS: Record<string, string> = {
  hanoi: `<h2>🤖 So denkt ein Computer</h2>
    <p><b>Der Trick heißt Rekursion:</b> Um einen Turm aus 5 Pfannkuchen umzustapeln, trägst du
    zuerst den Turm aus 4 weg, legst den größten an sein Ziel und stapelst die 4 wieder darauf. Und
    die 4? Genauso – mit einem Turm aus 3. Der Computer ruft dieselbe Anleitung immer wieder mit
    einem kleineren Turm auf.</p>
    <p><b>Jeder Pfannkuchen mehr verdoppelt die Arbeit (und eins dazu):</b> 3 → 7 Züge, 4 → 15,
    5 → 31, 7 → 127.</p>
    <p>🏯 <b>Die Legende:</b> In einem Tempel liegt ein Turm aus 64 goldenen Scheiben. Mit einem Zug
    pro Sekunde bräuchte man etwa <b>585 Milliarden Jahre</b> – viel länger, als es das Weltall
    gibt!</p>`,
  river: `<h2>🤖 So denkt ein Computer</h2>
    <p>Ein Computer probiert Schritt für Schritt <b>alle Möglichkeiten</b> aus: zuerst alles, was
    1 Fahrt weit weg ist, dann alles, was 2 Fahrten weit weg ist, und so weiter. Verbotene Lagen
    lässt er weg. So findet er sicher den <b>kürzesten Weg</b>.</p>
    <p>Das nennt man <b>Breitensuche</b>. Auf der Rätsel-Landkarte siehst du alle erlaubten Lagen
    als Punkte – und deinen Weg dazwischen.</p>`,
};
function showCard(c: string, back: () => void) {
  const html = CARDS[c] ?? CHAPTERS.find((x) => x.id === c)?.card ?? "";
  const el = panel(`${html}${btn("Weiter", "data-x", "ki-primary")}`, "So denkt ein Computer");
  if (!data.cards.includes(c)) {
    data.cards.push(c);
    persist();
  }
  el.querySelector("[data-x]")!.addEventListener("click", () => {
    closePanel();
    back();
  });
}

function setTop(title: string, tools: string) {
  $(".ki-chapters").hidden = true;
  $(".ki-top").hidden = false;
  h("title").textContent = title;
  h("tools").innerHTML = tools;
}

// --- weitere Kapitel (Module mit gemeinsamem Kit) ----------------------------------------------
const kit: Kit = {
  clock: () => clock,
  speed: () => speed,
  sound,
  toast,
  intro(title, html) {
    const el = panel(`<h2>${title}</h2>${html}${btn("Los!", "data-x", "ki-primary")}`, "Level");
    el.querySelector("[data-x]")!.addEventListener("click", closePanel);
  },
  setTop(title, tools, on) {
    setTop(
      title,
      tools
        .map((t) =>
          btn(
            t.label,
            `data-b="${t.id}"${t.pressed === undefined ? "" : ` aria-pressed="${t.pressed}"`}`,
            t.primary ? "ki-primary" : "",
          ),
        )
        .join(""),
    );
    h("tools")
      .querySelectorAll<HTMLButtonElement>("[data-b]")
      .forEach((b) =>
        b.addEventListener("click", () => {
          sound.start();
          on(b.dataset.b!);
        }),
      );
  },
  setCount: (t) => (h("count").textContent = t),
  finish(o) {
    record(data, o.level, o.stars);
    persist();
    const result = () => {
      if (!cur || cur.id !== o.chapter) return;
      const el = panel(
        `<h2>Geschafft! ${stars(o.stars)}</h2><p>${o.text}</p>
         <div class="ki-row">
           ${o.next ? btn("Nächstes Level", "data-next", "ki-primary") : ""}
           ${o.extra ? btn(o.extra.label, "data-extra") : ""}
           ${btn("Nochmal", "data-again")}
           ${btn("🏝️ Insel", "data-map")}
         </div>`,
        "Geschafft",
      );
      el.querySelector("[data-next]")?.addEventListener("click", () => o.next!());
      el.querySelector("[data-extra]")?.addEventListener("click", () => o.extra!.fn());
      el.querySelector("[data-again]")!.addEventListener("click", o.again);
      el.querySelector("[data-map]")!.addEventListener("click", showMap);
    };
    window.setTimeout(() => {
      if (!data.cards.includes(o.chapter)) showCard(o.chapter, result);
      else result();
    }, 900 / speed);
  },
  map: () => showMap(),
  stateMap: (gph, mine, best, card, after) => stateMap(gph, mine, best, card, after),
  closePanel: () => closePanel(),
};
const CHAPTERS: Chapter[] = [
  waageChapter(kit),
  mazeChapter(kit),
  flipChapter(kit),
  bridgeChapter(kit),
  penguinsChapter(kit),
  jugsChapter(kit),
  frogsChapter(kit),
  lightsChapter(kit),
];
let cur: Chapter | null = null;
function startChapter(c: Chapter, i: number) {
  view = "chapter";
  cur = c;
  stopZeitlupe();
  c.start(i);
}

// --- Pfannkuchen-Turm -------------------------------------------------------------------
interface Flight {
  disc: number;
  from: number;
  to: number;
  t: number;
  dur: number;
  by: "kind" | "maus" | "zeitlupe";
}
const H = {
  n: 3,
  pegs: newTower(3) as Pegs,
  moves: 0,
  sel: -1,
  justSel: false,
  pattern: false,
  helper: false,
  flight: null as Flight | null,
  queue: [] as { from: number; to: number; by: Flight["by"]; frame?: Frame }[],
  ouch: { disc: 0, until: 0 },
  frames: null as Frame[] | null,
  frame: null as Frame | null,
  done: false,
  doneAt: 0,
  cursor: 0,
};

function startHanoi(n: number) {
  view = "hanoi";
  stopZeitlupe();
  H.n = n;
  H.helper = H.helper && n >= 4;
  resetHanoi();
  const el = panel(
    `<h2>🥞 Pfannkuchen-Turm · ${n} Pfannkuchen</h2>
     <p>Bring alle Pfannkuchen auf den Teller <b>ganz rechts</b>. Du darfst immer nur den obersten
     bewegen – und ein großer darf <b>nie auf einem kleineren</b> liegen, sonst matscht er ihn platt!</p>
     <p>Profi-Zahl: <b>${minMoves(n)} Züge</b>.</p>
     ${btn("Los!", "data-x", "ki-primary")}`,
    "Level",
  );
  el.querySelector("[data-x]")!.addEventListener("click", closePanel);
  hanoiUi();
}
function resetHanoi() {
  H.pegs = newTower(H.n);
  H.moves = 0;
  H.sel = -1;
  H.flight = null;
  H.queue = [];
  H.done = false;
  H.frame = null;
  hanoiCount();
}
function hanoiUi() {
  const i = LEVELS.indexOf(H.n) + 1;
  setTop(
    `🥞 Level ${i} · ${H.n} Pfannkuchen`,
    [
      btn("💡 Muster-Tipp", `data-b="pattern" aria-pressed="${H.pattern}"`),
      H.n >= 4 ? btn("🐭 Helfer-Modus", `data-b="helper" aria-pressed="${H.helper}"`) : "",
      H.helper ? btn("🐭 Maus, trag den kleinen Turm weg!", 'data-b="mouse"', "ki-primary") : "",
      H.frames ? btn("⏹ Anhalten", 'data-b="stop"') : btn("▶ Zeig's mir", 'data-b="show"'),
      btn("↺ Neu", 'data-b="reset"'),
      btn("🏝️ Insel", 'data-b="map"'),
    ].join(""),
  );
  const on = (b: string, f: () => void) =>
    h("tools")
      .querySelector(`[data-b="${b}"]`)
      ?.addEventListener("click", () => {
        sound.start();
        f();
      });
  on("pattern", () => {
    H.pattern = !H.pattern;
    if (H.pattern) toast("Der Kleinste ist jeden zweiten Zug dran – immer im Kreis!", 4);
    hanoiUi();
  });
  on("helper", () => {
    H.helper = !H.helper;
    resetHanoi();
    if (H.helper)
      toast("Du bewegst nur den größten Pfannkuchen – die Maus trägt den kleinen Turm.", 4);
    hanoiUi();
  });
  on("mouse", mouseHelps);
  on("show", startZeitlupe);
  on("stop", () => {
    stopZeitlupe();
    resetHanoi();
    hanoiUi();
  });
  on("reset", () => {
    stopZeitlupe();
    resetHanoi();
    hanoiUi();
  });
  on("map", showMap);
  hanoiCount();
}
function hanoiCount() {
  h("count").textContent = `Züge: ${H.moves} · Profi-Zahl: ${minMoves(H.n)}`;
}

/** Zug anfragen (vom Kind); prüft Regeln und startet die Animation */
function tryMove(from: number, to: number) {
  if (H.flight || H.frames || H.done) return;
  const d = top(H.pegs, from);
  if (d === undefined) return;
  if (H.helper && d !== helperDisc(H.pegs, H.n)) {
    toast("Im Helfer-Modus bewegst du nur den größten Pfannkuchen – die Maus macht den Rest.", 4);
    return;
  }
  if (!canMove(H.pegs, from, to)) {
    // großer auf kleinen: Autsch!
    const under = top(H.pegs, to);
    H.ouch = { disc: under ?? d, until: clock + 0.8 };
    sound.ouch();
    toast("Autsch! Ein großer Pfannkuchen darf nicht auf einen kleineren.", 3);
    return;
  }
  H.queue.push({ from, to, by: "kind" });
}
function mouseHelps() {
  if (H.flight || H.queue.length || H.done) return;
  const plan = helperPlan(H.pegs, H.n);
  if (plan === null) {
    toast("Die kleinen Pfannkuchen liegen durcheinander – drück ↺ Neu.", 4);
    return;
  }
  if (!plan.length) {
    toast("Alles bereit – jetzt bist du dran mit dem großen!", 3);
    return;
  }
  for (const [from, to] of plan) H.queue.push({ from, to, by: "maus" });
}
function startZeitlupe() {
  resetHanoi();
  H.frames = solve(H.n);
  for (const f of H.frames) H.queue.push({ from: f.from, to: f.to, by: "zeitlupe", frame: f });
  h("steps").hidden = false;
  hanoiUi();
}
function stopZeitlupe() {
  H.frames = null;
  H.frame = null;
  H.queue = [];
  H.flight = null;
  h("steps").hidden = true;
}
function showSteps(f: Frame) {
  h("steps").innerHTML = f.stack
    .map(
      (t, i) =>
        `<li style="margin-left:${i * 12}px" class="${i === f.stack.length - 1 ? "now" : ""}">📦 ${taskText(t)}</li>`,
    )
    .join("");
}
function hanoiTick(dt: number) {
  if (!H.flight && H.queue.length) {
    const q = H.queue.shift()!;
    const d = top(H.pegs, q.from);
    if (d === undefined || !canMove(H.pegs, q.from, q.to)) {
      H.queue = [];
      return;
    }
    const dur = q.by === "zeitlupe" ? 0.8 : q.by === "maus" ? 0.4 : 0.28;
    H.flight = { disc: d, from: q.from, to: q.to, t: 0, dur, by: q.by };
    if (q.frame) {
      H.frame = q.frame;
      showSteps(q.frame);
    }
    sound.pick();
  }
  const f = H.flight;
  if (f) {
    f.t += (dt * speed) / f.dur;
    if (f.t >= 1) {
      move(H.pegs, f.from, f.to);
      H.flight = null;
      sound.drop();
      if (f.by !== "zeitlupe") H.moves++;
      hanoiCount();
      if (solved(H.pegs, H.n)) {
        if (f.by === "zeitlupe") {
          toast("So geht es am schnellsten – jetzt du!", 3);
          window.setTimeout(() => {
            if (view !== "hanoi" || !H.frames) return;
            stopZeitlupe();
            resetHanoi();
            hanoiUi();
          }, 1800 / speed);
        } else hanoiSolved();
      }
    }
  }
}
function hanoiSolved() {
  H.done = true;
  H.doneAt = clock;
  const st = starsFor(H.moves, H.n);
  const id = `h${H.n}`;
  record(data, id, st);
  persist();
  sound.tada();
  const next = LEVELS[LEVELS.indexOf(H.n) + 1];
  const firstCard = !data.cards.includes("hanoi");
  window.setTimeout(() => {
    if (view !== "hanoi") return;
    const el = panel(
      `<h2>Geschafft! ${stars(st)}</h2>
       <p>${H.moves} Züge – die Profi-Zahl ist ${minMoves(H.n)}.
       ${st === 3 ? "Perfekt wie ein Computer!" : "Schaffst du es noch mit weniger Zügen?"}</p>
       <div class="ki-row">
         ${next ? btn("Nächstes Level", "data-next", "ki-primary") : ""}
         ${btn("Nochmal", "data-again")}
         ${btn("🏝️ Insel", "data-map")}
       </div>`,
      "Geschafft",
    );
    el.querySelector("[data-next]")?.addEventListener("click", () => startHanoi(next!));
    el.querySelector("[data-again]")!.addEventListener("click", () => startHanoi(H.n));
    el.querySelector("[data-map]")!.addEventListener("click", showMap);
    // beim ersten Mal zuerst die Erklärkarte, danach wieder das Ergebnis
    if (firstCard) showCard("hanoi", () => hanoiSolvedAgain(el));
  }, 900 / speed);
}
/** nach der Erklärkarte wieder das Ergebnis zeigen */
function hanoiSolvedAgain(el: HTMLElement) {
  layer.append(el);
  overlay = el;
}

let K: KitchenLayout = kitchenLayout(320, 200, 3);
function hanoiPegAt(x: number) {
  let best = 0;
  K.pegX.forEach((px, i) => {
    if (Math.abs(px - x) < Math.abs(K.pegX[best]! - x)) best = i;
  });
  return best;
}
function hanoiDown(x: number) {
  if (H.flight || H.frames || H.done) return;
  const p = hanoiPegAt(x);
  if (H.sel < 0) {
    if (H.pegs[p]!.length) {
      H.sel = p;
      H.justSel = true;
      sound.pick();
    }
  } else H.justSel = false;
}
function hanoiUp(x: number) {
  if (H.sel < 0) return;
  const p = hanoiPegAt(x);
  if (H.justSel) {
    H.justSel = false;
    if (p !== H.sel) {
      const from = H.sel;
      H.sel = -1;
      tryMove(from, p);
    }
    return;
  }
  const from = H.sel;
  H.sel = -1;
  if (p !== from) tryMove(from, p);
}

function drawHanoi(g: CanvasRenderingContext2D, vw: number, vh: number) {
  K = kitchenLayout(vw, vh, H.n);
  drawKitchen(g, vw, vh, K);
  // Koch-Bär schaut zu (oben in der Mitte, doppelt so groß)
  const bx = Math.round(vw / 2 - 16);
  const by = 4 + Math.round(Math.sin(clock * (Math.PI / 5)) * 1); // atmet ruhig (10 s)
  // Durchreiche, aus der der Bär schaut
  g.fillStyle = "#8a5a33";
  g.fillRect(bx - 8, 2, 48, 46);
  g.fillStyle = "#5a3a22";
  g.fillRect(bx - 5, 5, 42, 40);
  drawSprite(g, SPRITES.baer!, bx, by, false, {}, 2);
  g.fillStyle = "#c88a52";
  g.fillRect(bx - 10, 44, 52, 5);
  const happy = H.done && clock - H.doneAt < 6;
  const surprised = clock < H.ouch.until;
  if (happy) {
    g.fillStyle = "#9a6233";
    g.fillRect(bx + 8, by + 14, 2, 2);
    g.fillRect(bx + 22, by + 14, 2, 2);
    g.fillStyle = "#2b2233";
    g.fillRect(bx + 6, by + 15, 2, 1);
    g.fillRect(bx + 10, by + 15, 2, 1);
    g.fillRect(bx + 20, by + 15, 2, 1);
    g.fillRect(bx + 24, by + 15, 2, 1);
  }
  if (surprised) {
    g.fillStyle = "#2b2233";
    g.fillRect(bx + 14, by + 20, 4, 4);
  }
  const lift = K.tableY - (H.n + 2) * K.discH - 8;
  const blinkOf = (d: number) => (clock * 0.37 + d * 1.31) % 5 < 0.14;
  const nextIsSmallest = H.pattern && !H.done && H.moves % 2 === 0 && !H.frames;
  for (let p = 0; p < 3; p++) {
    const stack = H.pegs[p]!;
    stack.forEach((d, j) => {
      const isTop = j === stack.length - 1;
      if (H.flight && isTop && p === H.flight.from) return;
      let y = K.tableY - (j + 1) * K.discH;
      if (isTop && p === H.sel) y -= 6;
      const shake = clock < H.ouch.until && d === H.ouch.disc ? Math.sin(clock * 40) * 1.5 : 0;
      const glow =
        nextIsSmallest && d === 1 ? 0.35 + 0.25 * Math.sin(clock * Math.PI * 2) : undefined;
      drawPancake(g, K.pegX[p]! + shake, y, discWidth(K, d, H.n), K.discH, d, {
        blink: blinkOf(d) || happy,
        ouch: clock < H.ouch.until && d === H.ouch.disc,
        topping: isTop,
        glow,
      });
    });
  }
  const f = H.flight;
  if (f) {
    // hoch, hinüber, runter
    const x0 = K.pegX[f.from]!;
    const x1 = K.pegX[f.to]!;
    const y0 = K.tableY - H.pegs[f.from]!.length * K.discH;
    const y1 = K.tableY - (H.pegs[f.to]!.length + 1) * K.discH;
    const t = Math.min(1, f.t);
    const ease = (u: number) => u * u * (3 - 2 * u);
    let x = x0;
    let y: number;
    if (t < 0.3) y = y0 + (lift - y0) * ease(t / 0.3);
    else if (t < 0.7) {
      y = lift;
      x = x0 + (x1 - x0) * ease((t - 0.3) / 0.4);
    } else {
      x = x1;
      y = lift + (y1 - lift) * ease((t - 0.7) / 0.3);
    }
    drawPancake(g, x, y, discWidth(K, f.disc, H.n), K.discH, f.disc, { topping: true });
    if (f.by === "maus") {
      const m = SPRITES.maus!;
      drawSprite(
        g,
        m,
        Math.round(x - spriteSize(m).w),
        Math.round(y - spriteSize(m).h * 2),
        x1 < x0,
        {},
        2,
      );
    }
  }
  // Streusel nach dem Ziel (3 s)
  if (H.done && clock - H.doneAt < 3) {
    const cols = ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#f4a0a8"];
    for (let i = 0; i < 50; i++) {
      const sx = (i * 53) % vw;
      const sy = ((clock - H.doneAt) * 60 + ((i * 37) % vh)) % vh;
      g.fillStyle = cols[i % cols.length]!;
      g.fillRect(sx, Math.round(sy), 2, 1);
    }
  }
  // Tastatur-Auswahl
  if (keyboardUsed) {
    g.fillStyle = "#2b2233";
    g.fillRect(K.pegX[H.cursor]! - 3, K.tableY + 8, 6, 2);
  }
}

// --- Über den Fluss ----------------------------------------------------------------------
interface Crossing {
  ids: string[];
  from: 0 | 1;
  t: number;
  dur: number;
  done: () => void;
}
const F = {
  level: RIVER_LEVELS[0]! as RiverLevel,
  state: startState(RIVER_LEVELS[0]!) as State,
  inBoat: [] as string[],
  history: [] as State[],
  path: [] as string[],
  crossings: 0,
  min: 7,
  anim: null as Crossing | null,
  conflict: null as null | { until: number; chasers: string[]; victims: string[]; kind: string },
  hint: [] as string[],
  hintUntil: 0,
  pos: {} as Record<string, { x: number; y: number }>,
  done: false,
  doneAt: 0,
  /** Rückfahrt ist schon angekündigt */
  returning: false,
};
let iso: Iso = isoFor(320, 200);

function startRiver(l: RiverLevel) {
  view = "river";
  F.level = l;
  F.min = shortest(l)!.length;
  resetRiver();
  const el = panel(
    `<h2>⛵ ${l.title}</h2><p>${l.text}</p>
     <p><small>Tippe Figuren an, damit sie ins Boot steigen, dann auf „⛵ Los!“. Profi-Zahl: <b>${F.min} Fahrten</b>.</small></p>
     ${btn("Los!", "data-x", "ki-primary")}`,
    "Level",
  );
  el.querySelector("[data-x]")!.addEventListener("click", closePanel);
  riverUi();
}
function resetRiver() {
  F.state = startState(F.level);
  F.inBoat = [];
  F.history = [];
  F.path = [key(F.level, F.state)];
  F.crossings = 0;
  F.anim = null;
  F.conflict = null;
  F.hint = [];
  F.done = false;
  F.returning = false;
  F.pos = {};
  riverCount();
}
function riverUi() {
  const i = RIVER_LEVELS.indexOf(F.level) + 1;
  setTop(
    `⛵ Level ${i} · ${F.level.title}`,
    [
      btn("⛵ Los!", 'data-b="go"', "ki-primary"),
      btn("↩ Zurück", 'data-b="undo"'),
      btn("💡 Tipp", 'data-b="hint"'),
      btn("↺ Neu", 'data-b="reset"'),
      btn("🏝️ Insel", 'data-b="map"'),
    ].join(""),
  );
  const on = (b: string, f: () => void) =>
    h("tools")
      .querySelector(`[data-b="${b}"]`)!
      .addEventListener("click", () => {
        sound.start();
        f();
      });
  on("go", riverGo);
  on("undo", riverUndo);
  on("hint", riverHint);
  on("reset", () => {
    resetRiver();
  });
  on("map", showMap);
}
function riverCount() {
  h("count").textContent = `Fahrten: ${F.crossings} · Profi-Zahl: ${F.min}`;
}
const actorName = (id: string) => F.level.actors.find((a) => a.id === id)!.name;
const listNames = (ids: string[]) => {
  const n = ids.map(actorName);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} und ${n.at(-1)}` : (n[0] ?? "");
};

function riverTap(id: string) {
  if (F.anim || F.conflict || F.done || F.returning) return;
  const a = F.level.actors.find((x) => x.id === id)!;
  if (F.inBoat.includes(id)) {
    F.inBoat = F.inBoat.filter((x) => x !== id);
    sound.click();
    return;
  }
  if (F.state.side[id] !== F.state.boat) {
    toast(`Das Boot ist auf der anderen Seite – ${a.name} kann nicht einsteigen.`, 3);
    return;
  }
  const w = F.inBoat.reduce((s, x) => s + F.level.actors.find((y) => y.id === x)!.weight, 0);
  if (w + a.weight > F.level.seats) {
    toast("So viel passt nicht ins Boot!", 2.5);
    return;
  }
  F.inBoat.push(id);
  sound.click();
}
function riverGo() {
  if (F.anim || F.conflict || F.done || F.returning) return;
  const why = boatCheck(F.level, F.state, F.inBoat);
  if (why) {
    toast(why, 3);
    return;
  }
  const ids = [...F.inBoat];
  const prev = cloneState(F.state);
  F.anim = {
    ids,
    from: F.state.boat,
    t: 0,
    dur: 1.5,
    done: () => {
      const next = cross(F.level, prev, ids)!;
      F.state = next;
      F.inBoat = [];
      sound.splash();
      const msg = problem(F.level, next);
      if (msg) conflict(next, msg, () => returnBoat(ids, prev, false));
      else {
        F.history.push(prev);
        F.crossings++;
        F.path.push(key(F.level, next));
        riverCount();
        if (isGoal(F.level, next)) riverSolved();
      }
    },
  };
}
/** Boot mit der Gruppe zurückfahren und die alte Lage herstellen */
function returnBoat(ids: string[], prev: State, undo: boolean) {
  F.inBoat = [...ids];
  F.returning = true;
  window.setTimeout(
    () => {
      F.returning = false;
      F.anim = {
        ids,
        from: F.state.boat,
        t: 0,
        dur: 1.2,
        done: () => {
          F.state = cloneState(prev);
          F.inBoat = [];
          if (undo) {
            F.crossings = Math.max(0, F.crossings - 1);
            F.path.pop();
            riverCount();
          }
        },
      };
    },
    (undo ? 0 : 400) / speed,
  );
}
function conflict(s: State, msg: string, after: () => void) {
  const bank = F.level.rule(kindsAt(F.level, s, 0)) ? 0 : 1;
  const here = F.level.actors.filter((a) => s.side[a.id] === bank);
  const ofKind = (k: string) => here.filter((a) => a.kind === k).map((a) => a.id);
  let chasers: string[];
  let victims: string[];
  let kind = "feder";
  if (F.level.id === "f1") {
    if (ofKind("fuchs").length && ofKind("gans").length) {
      chasers = ofKind("fuchs");
      victims = ofKind("gans");
    } else {
      chasers = ofKind("gans");
      victims = ofKind("korn");
      kind = "korn";
    }
  } else {
    chasers = ofKind("fuchs");
    victims = ofKind("hase");
    kind = "schreck";
  }
  F.conflict = { until: clock + 1.8 / speed, chasers, victims, kind };
  sound.honk();
  toast(msg, 4);
  window.setTimeout(() => {
    F.conflict = null;
    after();
  }, 1800 / speed);
}
function riverUndo() {
  if (F.anim || F.conflict || F.done || !F.history.length) return;
  const prev = F.history.pop()!;
  const ids = F.level.actors
    .filter((a) => a.id && prev.side[a.id] !== F.state.side[a.id])
    .map((a) => a.id);
  returnBoat(ids, prev, true);
}
function riverHint() {
  if (F.anim || F.conflict || F.done) return;
  const ids = hint(F.level, F.state);
  if (!ids) return;
  F.hint = ids;
  F.hintUntil = clock + 5;
  toast(
    `💡 Tipp: ${listNames(ids)} ${ids.length > 1 ? "fahren" : "fährt"} als Nächstes hinüber.`,
    5,
  );
}
function riverSolved() {
  F.done = true;
  F.doneAt = clock;
  const m = F.min;
  const st = F.crossings <= m ? 3 : F.crossings <= m * 1.5 ? 2 : 1;
  record(data, F.level.id, st);
  persist();
  sound.tada();
  const idx = RIVER_LEVELS.indexOf(F.level);
  const next = RIVER_LEVELS[idx + 1];
  window.setTimeout(() => {
    if (view !== "river") return;
    const el = panel(
      `<h2>Alle drüben! ${stars(st)}</h2>
       <p>${F.crossings} Fahrten – die Profi-Zahl ist ${m}.</p>
       <div class="ki-row">
         ${btn("🗺️ Rätsel-Landkarte", "data-graph", "ki-primary")}
         ${next ? btn("Nächstes Level", "data-next") : ""}
         ${btn("Nochmal", "data-again")}
         ${btn("🏝️ Insel", "data-map")}
       </div>`,
      "Geschafft",
    );
    el.querySelector("[data-graph]")!.addEventListener("click", showGraph);
    el.querySelector("[data-next]")?.addEventListener("click", () => startRiver(next!));
    el.querySelector("[data-again]")!.addEventListener("click", () => startRiver(F.level));
    el.querySelector("[data-map]")!.addEventListener("click", showMap);
  }, 1200 / speed);
}
/** Rätsel-Landkarte: alle erlaubten Lagen, eigener und kürzester Weg (KI-AK-06) */
function showGraph() {
  const gph = graph(F.level);
  const best = shortest(F.level)!;
  const bestKeys = [key(F.level, startState(F.level))];
  let s = startState(F.level);
  for (const ids of best) {
    s = cross(F.level, s, ids)!;
    bestKeys.push(key(F.level, s));
  }
  stateMap(gph, F.path, bestKeys, "river", () => {
    if (!data.cards.includes("river")) showCard("river", showMap);
    else showMap();
  });
}
/** allgemeine Rätsel-Landkarte (Fluss, Wasserkrüge) */
function stateMap(
  gph: { nodes: { key: string; dist: number; goal: boolean }[]; edges: [string, string][] },
  mine: string[],
  bestKeys: string[],
  card: string,
  after: () => void,
) {
  const el = panel(
    `<h2>🗺️ Rätsel-Landkarte</h2>
     <canvas class="ki-graph" width="640" height="380" role="img" aria-label="Rätsel-Landkarte mit ${gph.nodes.length} Lagen"></canvas>
     <p class="ki-legend"><span class="me">━ dein Weg</span> <span class="best">┅ kürzester Weg</span> <span class="st">● Start</span> <span class="go">● Ziel</span></p>
     <p><small>Jeder Punkt ist eine mögliche Lage. Linien sind mögliche Schritte. ${gph.nodes.length} Lagen gibt es hier.</small></p>
     <div class="ki-row">${btn("🤖 So denkt ein Computer", "data-card")} ${btn("Weiter", "data-x", "ki-primary")}</div>`,
    "Rätsel-Landkarte",
  );
  const cv = el.querySelector<HTMLCanvasElement>("canvas")!;
  const g = cv.getContext("2d")!;
  const maxD = Math.max(...gph.nodes.map((n) => n.dist));
  const cols = new Map<number, string[]>();
  for (const n of gph.nodes) cols.set(n.dist, [...(cols.get(n.dist) ?? []), n.key]);
  const at = new Map<string, { x: number; y: number }>();
  for (const [d, list] of cols)
    list.forEach((k, i) =>
      at.set(k, {
        x: 40 + (d / Math.max(1, maxD)) * 560,
        y: 30 + ((i + 1) * 320) / (list.length + 1),
      }),
    );
  g.fillStyle = "#fffaf0";
  g.fillRect(0, 0, 640, 380);
  g.strokeStyle = "#c9c2b3";
  g.lineWidth = 2;
  for (const [a, b] of gph.edges) {
    const p = at.get(a);
    const q = at.get(b);
    if (!p || !q) continue;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(q.x, q.y);
    g.stroke();
  }
  const line = (keys: string[], color: string, width: number, dash: number[]) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.beginPath();
    keys.forEach((k, i) => {
      const p = at.get(k);
      if (!p) return;
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    });
    g.stroke();
    g.setLineDash([]);
  };
  line(mine, "#3a7bd5", 6, []);
  line(bestKeys, "#e67e22", 3, [8, 6]);
  for (const n of gph.nodes) {
    const p = at.get(n.key)!;
    g.fillStyle = n.dist === 0 ? "#2ecc71" : n.goal ? "#f1c40f" : "#7a6f5c";
    g.beginPath();
    g.arc(p.x, p.y, n.dist === 0 || n.goal ? 10 : 6, 0, Math.PI * 2);
    g.fill();
  }
  el.querySelector("[data-card]")!.addEventListener("click", () =>
    showCard(card, () => stateMap(gph, mine, bestKeys, card, after)),
  );
  el.querySelector("[data-x]")!.addEventListener("click", after);
}

/** Stellplatz einer Figur am Ufer */
function slot(id: string, side: 0 | 1) {
  const i = F.level.actors.findIndex((a) => a.id === id);
  const n = F.level.actors.length;
  // gleichmäßig am Ufer verteilt, nie auf dem Steg (Spalte c)
  const gap = n > 4 ? 2 : 3;
  const tx = iso.c + Math.round((i - (n - 1) / 2) * gap) || 1;
  const ty = side === 0 ? iso.c - RIVER_HALF - 3 : iso.c + RIVER_HALF + 3;
  return tile(iso, tx, ty);
}
const dock = (side: 0 | 1) =>
  tile(iso, iso.c + 1, side === 0 ? iso.c - RIVER_HALF : iso.c + RIVER_HALF);
function boatAt() {
  const a = F.anim;
  if (!a) return dock(F.state.boat);
  const p = dock(a.from);
  const q = dock((1 - a.from) as 0 | 1);
  const t = Math.min(1, a.t);
  const e = t * t * (3 - 2 * t);
  return { x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e };
}
function seatOf(id: string, ids: string[], boat: { x: number; y: number }) {
  const heavy = F.level.actors.find((a) => a.id === id)!.weight > 1;
  const i = ids.indexOf(id);
  const dx = heavy || ids.length === 1 ? 0 : i === 0 ? -6 : 6;
  return { x: boat.x + dx, y: boat.y - 3 };
}
function riverTick(dt: number) {
  const a = F.anim;
  if (a) {
    a.t += (dt * speed) / a.dur;
    if (a.t >= 1) {
      F.anim = null;
      a.done();
    }
  }
  const boat = boatAt();
  for (const act of F.level.actors) {
    let target: { x: number; y: number };
    let snap = false;
    if (F.anim && F.anim.ids.includes(act.id)) {
      target = seatOf(act.id, F.anim.ids, boat);
      snap = true;
    } else if (F.inBoat.includes(act.id)) target = seatOf(act.id, F.inBoat, boat);
    else target = slot(act.id, F.state.side[act.id]!);
    const p = (F.pos[act.id] ??= { ...target });
    if (snap) Object.assign(p, target);
    else {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy);
      const step = 70 * dt * speed;
      if (d <= step) Object.assign(p, target);
      else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
  }
}
let worldCache: { key: string; canvas: HTMLCanvasElement } | null = null;
function drawRiver(g: CanvasRenderingContext2D, vw: number, vh: number) {
  iso = isoFor(vw, vh);
  const ck = `${vw}x${vh}`;
  if (!worldCache || worldCache.key !== ck) {
    const c = document.createElement("canvas");
    c.width = vw;
    c.height = vh;
    drawRiverWorld(c.getContext("2d")!, iso);
    worldCache = { key: ck, canvas: c };
  }
  g.drawImage(worldCache.canvas, 0, 0);
  drawWaterSparkle(g, iso, clock);
  // Enten ziehen ruhig ihre Bahn
  for (let i = 0; i < 2; i++) {
    const u = ((clock / 40 + i * 0.5) % 1) * 2 - 1;
    const p = tile(iso, iso.c + u * 14, iso.c + (i ? 1 : -1) * 0.6);
    drawSprite(
      g,
      SPRITES.ente!,
      Math.round(p.x - 3),
      Math.round(p.y - 4 + Math.sin(clock + i) * 0.6),
      u > 0,
    );
  }
  const boat = boatAt();
  const bob = Math.sin(clock * (Math.PI / 2)) * 0.8;
  drawBoat(g, Math.round(boat.x), Math.round(boat.y + 2 + bob));
  // Figuren von hinten nach vorn
  const list = [...F.level.actors].sort((a, b) => F.pos[a.id]!.y - F.pos[b.id]!.y);
  for (const act of list) {
    const p = F.pos[act.id]!;
    const sp = SPRITES[act.kind]!;
    const { w, h: hh } = spriteSize(sp);
    let ox = 0;
    let oy = 0;
    const c = F.conflict;
    if (c && c.chasers.includes(act.id)) {
      const v = F.pos[c.victims[0]!];
      if (v)
        ox =
          Math.sign(v.x - p.x) *
          Math.min(6, Math.abs(v.x - p.x) / 2) *
          Math.min(1, (clock - (c.until - 1.8)) * 2);
    }
    if (c && c.victims.includes(act.id)) oy = -Math.abs(Math.sin(clock * 9)) * 5;
    const glow = F.hint.includes(act.id) && clock < F.hintUntil;
    if (glow) {
      g.globalAlpha = 0.35 + 0.25 * Math.sin(clock * Math.PI * 2);
      g.fillStyle = "#fff6a8";
      g.fillRect(Math.round(p.x - w / 2 - 2), Math.round(p.y - hh - 2), w + 4, hh + 4);
      g.globalAlpha = 1;
    }
    // Schatten
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(Math.round(p.x - w / 2 + 1), Math.round(p.y - 1), w - 2, 2);
    const facing = F.state.side[act.id] === 0;
    drawSprite(g, sp, Math.round(p.x - w / 2 + ox), Math.round(p.y - hh + oy), !facing);
    if (c && c.victims.includes(act.id)) {
      const t = clock;
      for (let i = 0; i < 5; i++) {
        const fx = p.x + Math.sin(t * 3 + i * 1.3) * 8;
        const fy = p.y - hh - 2 - ((t * 20 + i * 4) % 14);
        g.fillStyle = c.kind === "korn" ? "#f6d55c" : c.kind === "schreck" ? "#e74c3c" : "#ffffff";
        g.fillRect(
          Math.round(fx),
          Math.round(fy),
          c.kind === "schreck" ? 1 : 2,
          c.kind === "schreck" ? 3 : 1,
        );
      }
    }
  }
  if (F.done && clock - F.doneAt < 3) {
    for (let i = 0; i < 40; i++) {
      g.fillStyle = ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71"][i % 4]!;
      g.fillRect((i * 47) % vw, Math.round(((clock - F.doneAt) * 50 + ((i * 29) % vh)) % vh), 2, 1);
    }
  }
}
function riverActorAt(x: number, y: number): string | null {
  let best: string | null = null;
  let bd = Infinity;
  for (const act of F.level.actors) {
    const p = F.pos[act.id];
    if (!p) continue;
    const { w, h: hh } = spriteSize(SPRITES[act.kind]!);
    const cx = p.x;
    const cy = p.y - hh / 2;
    if (Math.abs(x - cx) <= w / 2 + 3 && Math.abs(y - cy) <= hh / 2 + 3) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) {
        bd = d;
        best = act.id;
      }
    }
  }
  return best;
}

// --- Pixel-Fläche mit Phaser ----------------------------------------------------------------
let scale = 2;
let vw = 320;
let vh = 200;
let keyboardUsed = false;
let pointerIsDown = false;
const screen = document.createElement("canvas");
const ctx = screen.getContext("2d")!;
function fitSize(W: number, H2: number) {
  scale = Math.max(1, Math.round(Math.min(W, H2) / 210));
  const w = Math.ceil(W / scale);
  const hh = Math.ceil(H2 / scale);
  if (w !== vw || hh !== vh || screen.width !== w) {
    vw = w;
    vh = hh;
    screen.width = vw;
    screen.height = vh;
    return true;
  }
  return false;
}

class Board extends Phaser.Scene {
  img!: Phaser.GameObjects.Image;
  tex!: Phaser.Textures.CanvasTexture;
  n = 0;
  constructor() {
    super("board");
  }
  create() {
    fitSize(this.scale.width, this.scale.height);
    this.makeTexture();
    const cv = this.game.canvas;
    const toV = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
    };
    cv.addEventListener("pointerdown", (e) => {
      sound.start();
      if (overlay || paused) return;
      const p = toV(e);
      pointerIsDown = true;
      if (view === "hanoi") hanoiDown(p.x);
      else if (view === "river") {
        const id = riverActorAt(p.x, p.y);
        if (id) riverTap(id);
      } else if (view === "chapter") cur?.down(p);
    });
    window.addEventListener("pointermove", (e) => {
      if (!pointerIsDown || overlay || paused || view !== "chapter") return;
      cur?.move?.(toV(e));
    });
    window.addEventListener("pointerup", (e) => {
      const was = pointerIsDown;
      pointerIsDown = false;
      if (overlay || paused || !was) return;
      if (view === "hanoi") hanoiUp(toV(e).x);
      else if (view === "chapter") cur?.up?.(toV(e));
    });
  }
  makeTexture() {
    if (this.textures.exists("screen")) this.textures.remove("screen");
    this.tex = this.textures.addCanvas(`screen`, screen)!;
    if (!this.img) this.img = this.add.image(0, 0, "screen").setOrigin(0, 0);
    else this.img.setTexture("screen");
  }
  override update(_t: number, delta: number) {
    const dt = Math.min(0.1, delta / 1000);
    if (fitSize(this.scale.width, this.scale.height)) this.makeTexture();
    if (!paused) {
      clock += dt;
      if (view === "hanoi") hanoiTick(dt);
      else if (view === "river") riverTick(dt);
      else if (view === "chapter") cur?.tick(dt);
    }
    ctx.imageSmoothingEnabled = false;
    if (view === "hanoi") drawHanoi(ctx, vw, vh);
    else if (view === "river") drawRiver(ctx, vw, vh);
    else if (view === "chapter" && cur) cur.draw(ctx, vw, vh);
    else drawIsland(ctx, vw, vh, clock);
    this.tex.refresh();
    this.img.setScale(scale);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: "#5fb3e0",
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: stage.clientWidth, height: stage.clientHeight },
  scene: [Board],
  banner: false,
});

// --- Menü, Pause, Tastatur ----------------------------------------------------------------
function openMenu() {
  const el = panel(
    `<h2>Menü</h2>
     <label class="ki-vol">🔈 Lautstärke <input type="range" min="0" max="100" value="${Math.round(data.volume * 100)}" aria-label="Lautstärke"></label>
     <label class="ki-vol"><input type="checkbox" ${data.muted ? "checked" : ""} aria-label="Stumm"> Stumm</label>
     <div class="ki-row">${btn("🏝️ Zur Insel-Karte", "data-map")} ${btn("Weiter", "data-x", "ki-primary")}</div>`,
    "Menü",
  );
  const [range, mute] = [...el.querySelectorAll<HTMLInputElement>("input")] as [
    HTMLInputElement,
    HTMLInputElement,
  ];
  const apply = () => {
    data.volume = Number(range.value) / 100;
    data.muted = mute.checked;
    sound.setVolume(data.volume, data.muted);
    persist();
  };
  range.addEventListener("input", apply);
  mute.addEventListener("change", apply);
  el.querySelector("[data-map]")!.addEventListener("click", showMap);
  el.querySelector("[data-x]")!.addEventListener("click", closePanel);
}
$('[data-b="menu"]').addEventListener("click", () => {
  sound.start();
  if (overlay?.getAttribute("aria-label") === "Menü") closePanel();
  else openMenu();
});
function setPaused(on: boolean) {
  if (on === paused) return;
  paused = on;
  if (on) {
    const el = panel(`<h2>Pause</h2>${btn("Weiterspielen", "data-x", "ki-primary")}`, "Pause");
    el.querySelector("[data-x]")!.addEventListener("click", () => {
      paused = false;
      closePanel();
    });
  } else if (overlay?.getAttribute("aria-label") === "Pause") closePanel();
}
window.addEventListener("blur", () => setPaused(true));
document.addEventListener("visibilitychange", () => document.hidden && setPaused(true));
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === "Escape") {
    if (overlay) closePanel();
    else openMenu();
    return;
  }
  if (overlay || paused) return;
  if (view === "hanoi") {
    keyboardUsed = true;
    const pick = (p: number) => {
      if (H.sel < 0) {
        if (H.pegs[p]!.length && !H.flight) H.sel = p;
      } else {
        const from = H.sel;
        H.sel = -1;
        if (from !== p) tryMove(from, p);
      }
    };
    if (e.key === "ArrowLeft") H.cursor = (H.cursor + 2) % 3;
    else if (e.key === "ArrowRight") H.cursor = (H.cursor + 1) % 3;
    else if (e.key === "Enter" || e.key === " ") pick(H.cursor);
    else if (["1", "2", "3"].includes(e.key)) pick(Number(e.key) - 1);
    else return;
    e.preventDefault();
  } else if (view === "river") {
    if (e.key === "z" || e.key === "Z") riverUndo();
    else if (e.key === "h" || e.key === "H") riverHint();
    else if (e.key === "Enter") riverGo();
  } else if (view === "chapter" && cur?.key?.(e)) e.preventDefault();
});

showMap();

if (debugEnabled) {
  const cv = () => document.querySelector("canvas")!.getBoundingClientRect();
  (window as unknown as { __dampf: unknown }).__dampf = {
    state: () => ({
      view,
      screen: overlay?.getAttribute("aria-label") ?? view,
      paused,
      stars: { ...data.stars },
      cards: [...data.cards],
      hanoi: {
        n: H.n,
        pegs: H.pegs.map((s) => [...s]),
        moves: H.moves,
        sel: H.sel,
        done: H.done,
        busy: !!H.flight || H.queue.length > 0,
        helper: H.helper,
        zeitlupe: !!H.frames,
        steps: H.frame ? H.frame.stack.length : 0,
      },
      river: {
        level: F.level.id,
        side: { ...F.state.side },
        boat: F.state.boat,
        inBoat: [...F.inBoat],
        crossings: F.crossings,
        busy: !!F.anim || !!F.conflict || F.returning,
        done: F.done,
        hint: [...F.hint],
      },
      volume: data.volume,
      chapter: cur ? { id: cur.id, ...cur.debug() } : null,
      scale,
    }),
    /** Bildschirmpunkt über einem Teller */
    pegPoint: (i: number) => {
      const r = cv();
      return { x: r.left + K.pegX[i]! * scale, y: r.top + (K.tableY - 10) * scale };
    },
    /** Bildschirmpunkt einer Figur */
    actorPoint: (id: string) => {
      const p = F.pos[id];
      if (!p) return null;
      const r = cv();
      const { h: hh } = spriteSize(SPRITES[F.level.actors.find((a) => a.id === id)!.kind]!);
      return { x: r.left + p.x * scale, y: r.top + (p.y - hh / 2) * scale };
    },
    speed: (k: number) => (speed = k),
    pegNames: PEG_NAMES,
    /** Bildschirmpunkt im aktuellen Kapitel (z. B. „keks:3“, „links“, „1,1“, „hase“) */
    chapterPoint: (what: string) => {
      const p = cur?.point?.(what);
      if (!p) return null;
      const r = cv();
      return { x: r.left + p.x * scale, y: r.top + p.y * scale };
    },
  };
}
