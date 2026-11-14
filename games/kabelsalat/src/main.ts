import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { Sound } from "./audio.ts";
import { debugEnabled } from "./debug.ts";
import {
  BLOCK,
  KINDS,
  LIMITS,
  PARTS,
  addPart,
  addWire,
  clone,
  emptyCircuit,
  movePart,
  pinPos,
  removePart,
  removeWire,
  rotatePart,
  samePin,
  toggle,
  wiresAt,
  type Circuit,
  type Kind,
  type Part,
  type PinRef,
  type Wire,
} from "./logic/circuit.ts";
import { MISSIONS, checkMission, starsFor, type Mission } from "./logic/missions.ts";
import { load, save, unlocked, freeKinds, type Store } from "./logic/save.ts";
import { solve, type Result } from "./logic/solve.ts";

// --- Zustand -------------------------------------------------------------------------
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
const data = load(store);
const sound = new Sound();
sound.setVolume(data.volume, data.muted);

type Mode = "bauen" | "probieren";
let mode: Mode = "bauen";
/** aktuelle Mission (null = Freibau) */
let mission: Mission | null = null;
let circuit: Circuit = emptyCircuit();
let result: Result = solve(circuit);
let solved = false;
/** Schalter seit der letzten Bau-Änderung ausprobiert? (zählt für Missionen mit Schaltern) */
let tried = false;
let selected: { part?: number; wire?: number } = {};
/** angetippter erster Punkt eines Kabels */
let pending: PinRef | null = null;
/** Teil aus der Kiste, das als Nächstes gesetzt wird */
let armed: Kind | null = null;
let helpUntil = 0;
let paused = false;
let clock = 0;
/** schmaler Bildschirm: Werkbank oder Schaltplan */
let view: "werkbank" | "schaltplan" = "werkbank";
let overlay: HTMLElement | null = null;

const KIND_ICON: Record<Kind, string> = {
  batterie: "🔋",
  lampe: "💡",
  schalter: "🔘",
  umschalter: "🔀",
};
const BOOK: Record<Kind, { text: string; symbol: string; daily: string }> = {
  batterie: {
    text: "Die Batterie schiebt den Strom an: aus dem Pluspol (+) heraus, durch die Schaltung und zurück in den Minuspol (−). Diese hat 4,5 Volt.",
    symbol: "ein langer und ein kurzer Strich – der lange ist +",
    daily: "Taschenlampe, Fernbedienung",
  },
  lampe: {
    text: "Im Lämpchen wird ein dünner Draht so heiß, dass er leuchtet. Je mehr Strom, desto heller.",
    symbol: "ein Kreis mit einem Kreuz darin",
    daily: "Fahrradlicht, Taschenlampe",
  },
  schalter: {
    text: "Ein Schalter ist eine Brücke: zu = Strom fließt, offen = der Kreis ist unterbrochen.",
    symbol: "eine Linie, die wie eine Klappe aufsteht",
    daily: "Lichtschalter an der Wand",
  },
  umschalter: {
    text: "Der Umschalter verbindet seine Mitte (M) entweder mit A oder mit B – nie mit beiden.",
    symbol: "eine Klappe, die zwischen zwei Anschlüssen hin und her kippt",
    daily: "Licht im Treppenhaus, oben und unten schaltbar",
  },
};

// --- Oberfläche (HTML) ---------------------------------------------------------------
const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
const layer = document.createElement("div");
layer.className = "ks-layer";
layer.innerHTML = `
  <div class="ks-top">
    <div class="ks-goal" data-h="goal" role="status"></div>
    <div class="ks-tools">
      <div class="ks-modes" role="group" aria-label="Modus">
        <button class="ks-btn" type="button" data-b="bauen" aria-pressed="true">🔧 Bauen</button>
        <button class="ks-btn" type="button" data-b="probieren" aria-pressed="false">▶ Ausprobieren</button>
      </div>
      <button class="ks-btn" type="button" data-b="hilfe">💡 Hilfe</button>
      <button class="ks-btn ks-viewbtn" type="button" data-b="view">📐 Schaltplan</button>
      <button class="ks-btn" type="button" data-b="menu">☰ Menü</button>
    </div>
  </div>
  <div class="ks-sel" hidden>
    <button class="ks-btn" type="button" data-b="drehen">↻ Drehen</button>
    <button class="ks-btn" type="button" data-b="weg">🗑 Weg</button>
  </div>
  <div class="ks-toast" role="alert" hidden></div>
  <div class="ks-kit" role="group" aria-label="Teilekiste"></div>`;
stage.append(layer);
const $ = <E extends HTMLElement = HTMLElement>(s: string) => layer.querySelector<E>(s)!;
const kitEl = $(".ks-kit");
const selEl = $(".ks-sel");
const toastEl = $(".ks-toast");
let toastTimer = 0;
function toast(text: string, secs = 3) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.hidden = true), secs * 1000);
}

function setMode(m: Mode) {
  mode = m;
  pending = null;
  armed = null;
  if (m === "probieren") selected = {};
  $('[data-b="bauen"]').setAttribute("aria-pressed", String(m === "bauen"));
  $('[data-b="probieren"]').setAttribute("aria-pressed", String(m === "probieren"));
  refreshUi();
}
$('[data-b="bauen"]').addEventListener("click", () => setMode("bauen"));
$('[data-b="probieren"]').addEventListener("click", () => setMode("probieren"));
$('[data-b="hilfe"]').addEventListener("click", () => {
  sound.start();
  showHelp();
});
$('[data-b="view"]').addEventListener("click", () => {
  view = view === "werkbank" ? "schaltplan" : "werkbank";
  refreshUi();
});
$('[data-b="menu"]').addEventListener("click", () => openMenu());
$('[data-b="drehen"]').addEventListener("click", () => rotateSelected());
$('[data-b="weg"]').addEventListener("click", () => deleteSelected());

/** Was ist noch in der Kiste? */
function kitLeft(k: Kind): number {
  if (!mission) return LIMITS.parts - circuit.parts.length;
  const n = mission.kit[k] ?? 0;
  return n - circuit.parts.filter((p) => p.kind === k).length;
}
function kitKinds(): Kind[] {
  if (!mission) return freeKinds(data);
  return KINDS.filter((k) => (mission!.kit[k] ?? 0) > 0);
}

function refreshUi() {
  const goal = mission
    ? `<b>${mission.id}. ${mission.title}</b> ${solved ? "✅" : ""}<span>${mission.goal}</span>`
    : `<b>Freibau</b><span>Bau, was du willst – es wird gespeichert.</span>`;
  $("[data-h=goal]").innerHTML = goal;
  // Teilekiste
  const kinds = kitKinds();
  kitEl.hidden = mode !== "bauen" || kinds.length === 0;
  kitEl.innerHTML =
    kinds
      .map((k) => {
        const left = kitLeft(k);
        return `<button class="ks-btn ks-part" type="button" data-kind="${k}" aria-pressed="${armed === k}" ${left > 0 ? "" : "disabled"} aria-label="${PARTS[k].name}${mission ? ` (${left} übrig)` : ""}">${KIND_ICON[k]} ${PARTS[k].name}${mission ? ` <small>${left}</small>` : ""}</button>`;
      })
      .join("") +
    (mission
      ? `<button class="ks-btn" type="button" data-b="neu">↺ Neu</button>`
      : `<button class="ks-btn" type="button" data-b="leer">🧹 Alles weg</button>`);
  kitEl.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((b) => {
    b.addEventListener("pointerdown", (e) => startKitDrag(b.dataset.kind as Kind, e));
  });
  kitEl.querySelector('[data-b="neu"]')?.addEventListener("click", () => restartMission());
  kitEl.querySelector('[data-b="leer"]')?.addEventListener("click", () => clearFree());
  selEl.hidden = mode !== "bauen" || (selected.part === undefined && selected.wire === undefined);
  $<HTMLButtonElement>('[data-b="drehen"]').hidden = selected.part === undefined;
  $('[data-b="view"]').textContent = view === "werkbank" ? "📐 Schaltplan" : "🔧 Werkbank";
}

/** Teil aus der Kiste ziehen (oder antippen und dann die Stelle antippen) */
function startKitDrag(kind: Kind, e: PointerEvent) {
  sound.start();
  if (kitLeft(kind) <= 0) return;
  e.preventDefault();
  const sx = e.clientX;
  const sy = e.clientY;
  let moved = false;
  dragGhost = { kind, x: sx, y: sy };
  const move = (ev: PointerEvent) => {
    if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) moved = true;
    dragGhost = { kind, x: ev.clientX, y: ev.clientY };
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    dragGhost = null;
    if (!moved) {
      armed = armed === kind ? null : kind;
      refreshUi();
      if (armed) toast(`Tipp auf die Werkbank, wo ${PARTS[kind].name} hin soll.`, 2.5);
      return;
    }
    const w = clientToBench(ev.clientX, ev.clientY);
    if (w) placePart(kind, w.x, w.y);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
let dragGhost: { kind: Kind; x: number; y: number } | null = null;

function placePart(kind: Kind, x: number, y: number) {
  if (kitLeft(kind) <= 0) return;
  const b = benchSize();
  const p = addPart(
    circuit,
    kind,
    Math.max(BLOCK / 2, Math.min(b.w - BLOCK / 2, x)),
    Math.max(BLOCK / 2, Math.min(b.h - BLOCK / 2, y)),
  );
  if (!p) return toast("Mehr Teile passen nicht auf die Werkbank.");
  if (!data.seen.includes(kind)) data.seen.push(kind);
  selected = { part: p.id };
  armed = null;
  toastEl.hidden = true;
  sound.click();
  changed();
}
function rotateSelected() {
  if (selected.part === undefined) return;
  rotatePart(circuit, selected.part);
  sound.click();
  changed();
}
function deleteSelected() {
  if (selected.part !== undefined) removePart(circuit, selected.part);
  else if (selected.wire !== undefined) removeWire(circuit, selected.wire);
  selected = {};
  changed();
}

// --- Rechnen, prüfen, speichern ---------------------------------------------------------
let lastLit = new Set<number>();
let lastShort = false;
function changed(byToggle = false) {
  tried = byToggle ? true : false;
  result = solve(circuit);
  const lit = new Set(
    Object.entries(result.lamps)
      .filter(([, l]) => l.level !== "aus")
      .map(([id]) => Number(id)),
  );
  if ([...lit].some((id) => !lastLit.has(id))) sound.pling();
  lastLit = lit;
  if (result.short && !lastShort) {
    sound.buzz();
    toast(
      "⚠️ Kurzschluss! Der Strom nimmt den kürzesten Weg und geht nicht durch das Lämpchen.",
      5,
    );
  }
  lastShort = result.short;
  if (mission) {
    data.builds[mission.id] = clone(circuit);
    const v = checkMission(mission, circuit);
    const needsTry = circuit.parts.some((p) => p.kind === "schalter" || p.kind === "umschalter");
    if (v.ok && needsTry && !tried && !solved) {
      toast("Richtig verkabelt! Jetzt probier die Schalter aus: ▶ Ausprobieren.", 4);
    } else if (v.ok && !solved) {
      solved = true;
      const stars = starsFor(mission, circuit);
      data.stars[mission.id] = Math.max(data.stars[mission.id] ?? 0, stars);
      sound.tada();
      window.setTimeout(() => showSolved(stars), 600);
    } else if (!v.ok) solved = false;
  } else data.free = clone(circuit);
  save(store, data);
  refreshUi();
}

function showHelp() {
  helpUntil = clock + 6;
  if (result.short)
    return toast("⚠️ Kurzschluss: Such ein Kabel, das + und − ohne Lämpchen verbindet.", 5);
  const open = circuit.parts.some((p) =>
    PARTS[p.kind].pins.some((_, i) => !wiresAt(circuit, { part: p.id, pin: i })),
  );
  if (!circuit.parts.length) toast("Zieh Teile aus der Kiste unten auf die Werkbank.", 4);
  else if (open)
    toast("Die blinkenden Punkte haben noch kein Kabel – ist der Kreis überall geschlossen?", 5);
  else if (mission) toast(checkMission(mission, circuit).hint, 4);
  else toast("Alles verbunden. Probier die Schalter im Modus ▶ Ausprobieren!", 4);
}

// --- Missionen und Menü -----------------------------------------------------------------
function closeOverlay() {
  overlay?.remove();
  overlay = null;
}
function panel(html: string, label: string) {
  closeOverlay();
  const el = document.createElement("div");
  el.className = "ks-panel";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", label);
  el.innerHTML = `<div class="ks-card">${html}</div>`;
  layer.append(el);
  overlay = el;
  return el;
}
function startMission(m: Mission) {
  mission = m;
  circuit = data.builds[m.id] ? clone(data.builds[m.id]!) : m.preset ? m.preset() : emptyCircuit();
  solved = false;
  selected = {};
  pending = null;
  setMode("bauen");
  lastLit = new Set();
  result = solve(circuit);
  lastShort = result.short;
  solved = checkMission(m, circuit).ok;
  refreshUi();
  const el = panel(
    `<h2>${m.id}. ${m.title}</h2><p>${m.text}</p><p class="ks-goaltext">🎯 ${m.goal}</p>
     <button class="ks-btn ks-primary" type="button" data-x>Los!</button>`,
    "Mission",
  );
  el.querySelector("[data-x]")!.addEventListener("click", () => {
    sound.start();
    closeOverlay();
  });
}
function restartMission() {
  if (!mission) return;
  delete data.builds[mission.id];
  save(store, data);
  startMission(mission);
}
function startFree() {
  mission = null;
  circuit = clone(data.free);
  selected = {};
  pending = null;
  result = solve(circuit);
  lastShort = result.short;
  closeOverlay();
  setMode("bauen");
}
function clearFree() {
  if (!circuit.parts.length) return;
  const el = panel(
    `<h2>Alles weg?</h2><p>Die ganze Schaltung im Freibau wird abgebaut.</p>
     <div class="ks-row"><button class="ks-btn ks-primary" type="button" data-yes>Ja, alles weg</button>
     <button class="ks-btn" type="button" data-no>Nein</button></div>`,
    "Alles weg",
  );
  el.querySelector("[data-yes]")!.addEventListener("click", () => {
    circuit = emptyCircuit();
    closeOverlay();
    changed();
  });
  el.querySelector("[data-no]")!.addEventListener("click", closeOverlay);
}
function showSolved(stars: number) {
  if (!mission) return;
  const next = MISSIONS.find((m) => m.id === mission!.id + 1);
  const el = panel(
    `<h2>Geschafft! ${"⭐".repeat(stars)}</h2>
     <p>${stars === 2 ? "Super – mit ganz wenigen Kabeln!" : "Prima! Mit weniger Kabeln gibt es noch einen Stern."}</p>
     <div class="ks-row">
       ${next ? `<button class="ks-btn ks-primary" type="button" data-next>Nächste Mission</button>` : `<button class="ks-btn ks-primary" type="button" data-free>Zum Freibau</button>`}
       <button class="ks-btn" type="button" data-stay>Weiterbauen</button>
     </div>`,
    "Geschafft",
  );
  el.querySelector("[data-next]")?.addEventListener("click", () => startMission(next!));
  el.querySelector("[data-free]")?.addEventListener("click", startFree);
  el.querySelector("[data-stay]")!.addEventListener("click", closeOverlay);
}
function openMenu() {
  sound.start();
  const items = MISSIONS.map((m) => {
    const open = unlocked(data, m.id);
    const st = data.stars[m.id] ?? 0;
    return `<button class="ks-btn ks-mission" type="button" data-m="${m.id}" ${open ? "" : "disabled"}>
      ${open ? "" : "🔒 "}${m.id}. ${m.title} <span>${"⭐".repeat(st)}${"☆".repeat(2 - st)}</span></button>`;
  }).join("");
  const el = panel(
    `<h2>Kabelsalat</h2>
     <div class="ks-missions">${items}</div>
     <div class="ks-row">
       <button class="ks-btn" type="button" data-free>🛠️ Freibau</button>
       <button class="ks-btn" type="button" data-book>📖 Bauteile-Buch</button>
     </div>
     <label class="ks-field">Lautstärke <input type="range" min="0" max="100" value="${Math.round(data.volume * 100)}" aria-label="Lautstärke" /></label>
     <label class="ks-check"><input type="checkbox" ${data.muted ? "checked" : ""} aria-label="Stumm" /> Stumm</label>
     <button class="ks-btn ks-primary" type="button" data-x>Weiter</button>`,
    "Menü",
  );
  el.querySelectorAll<HTMLButtonElement>("[data-m]").forEach((b) =>
    b.addEventListener("click", () =>
      startMission(MISSIONS.find((m) => m.id === Number(b.dataset.m))!),
    ),
  );
  el.querySelector("[data-free]")!.addEventListener("click", startFree);
  el.querySelector("[data-book]")!.addEventListener("click", openBook);
  el.querySelector("[data-x]")!.addEventListener("click", closeOverlay);
  const range = el.querySelector<HTMLInputElement>("input[type=range]")!;
  const mute = el.querySelector<HTMLInputElement>("input[type=checkbox]")!;
  const apply = () => {
    data.volume = Number(range.value) / 100;
    data.muted = mute.checked;
    sound.setVolume(data.volume, data.muted);
    save(store, data);
  };
  range.addEventListener("input", apply);
  mute.addEventListener("change", apply);
}
function openBook() {
  const rows = KINDS.map((k) =>
    data.seen.includes(k)
      ? `<li><b>${KIND_ICON[k]} ${PARTS[k].name}</b> – ${BOOK[k].text}<br><small>Schaltzeichen: ${BOOK[k].symbol}. Im Alltag: ${BOOK[k].daily}.</small></li>`
      : `<li class="ks-locked">❔ Noch nicht entdeckt</li>`,
  ).join("");
  const el = panel(
    `<h2>📖 Bauteile-Buch</h2><ul class="ks-book">${rows}</ul>
     <button class="ks-btn ks-primary" type="button" data-x>Zurück</button>`,
    "Bauteile-Buch",
  );
  el.querySelector("[data-x]")!.addEventListener("click", openMenu);
}

// --- Tastatur ----------------------------------------------------------------------------
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.tagName === "INPUT") return;
  if (e.code === "Escape") {
    if (overlay) closeOverlay();
    else {
      selected = {};
      pending = null;
      armed = null;
      refreshUi();
    }
    return;
  }
  if (overlay) return;
  if (e.code === "KeyB") setMode("bauen");
  if (e.code === "KeyA") setMode("probieren");
  if (mode === "bauen" && e.code === "KeyR") rotateSelected();
  if (mode === "bauen" && (e.code === "Delete" || e.code === "Backspace")) deleteSelected();
});

// Fokusverlust: Lichtpunkte halten an (KS-AK-10)
window.addEventListener("blur", () => (paused = true));
window.addEventListener("focus", () => (paused = false));
document.addEventListener("visibilitychange", () => (paused = document.hidden));

// --- Werkbank und Schaltplan (Phaser) -----------------------------------------------------
const TOP = 96; // Platz für die obere Leiste
const BOTTOM = 70; // Platz für die Teilekiste
/** Werkbank-Größe in Einheiten (Hochkant schmaler und höher) */
let portrait = false;
const benchSize = () => (portrait ? { w: 480, h: 640 } : { w: 800, h: 520 });

interface Frame {
  ox: number;
  oy: number;
  k: number;
}
let benchFrame: Frame | null = null;
let planFrame: Frame | null = null;
let canvasRect = { left: 0, top: 0 };

function clientToBench(cx: number, cy: number) {
  if (!benchFrame) return null;
  const x = (cx - canvasRect.left - benchFrame.ox) / benchFrame.k;
  const y = (cy - canvasRect.top - benchFrame.oy) / benchFrame.k;
  const b = benchSize();
  return x >= 0 && y >= 0 && x <= b.w && y <= b.h ? { x, y } : null;
}
const benchToClient = (x: number, y: number) =>
  benchFrame
    ? {
        x: canvasRect.left + benchFrame.ox + x * benchFrame.k,
        y: canvasRect.top + benchFrame.oy + y * benchFrame.k,
      }
    : { x: 0, y: 0 };

const WIRE_COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xe67e22];
const PART_COLORS: Record<Kind, number> = {
  batterie: 0x2c3e50,
  lampe: 0x3d4a5c,
  schalter: 0x34495e,
  umschalter: 0x3b4b5e,
};

/** Kabel als weicher Bogen: Punkte entlang der Kurve */
function wireCurve(w: Wire, c: Circuit): { x: number; y: number }[] {
  const pa = c.parts.find((p) => p.id === w.a.part)!;
  const pb = c.parts.find((p) => p.id === w.b.part)!;
  const a = pinPos(pa, w.a.pin);
  const b = pinPos(pb, w.b.pin);
  const out = (p: Part, q: { x: number; y: number }) => {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  };
  const da = out(pa, a);
  const db = out(pb, b);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const reach = Math.min(90, len * 0.5 + 20);
  // zeigen die Punkte voneinander weg, macht das Kabel einen Bogen um die Blöcke herum
  const away =
    (da.x * (b.x - a.x) + da.y * (b.y - a.y)) / len < 0.2 ||
    (db.x * (a.x - b.x) + db.y * (a.y - b.y)) / len < 0.2;
  const bulge = away ? 90 : 0;
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  const side = n.y >= 0 ? 1 : -1; // lieber nach unten ausweichen
  const c1 = {
    x: a.x + da.x * (reach + bulge * 0.5) + n.x * bulge * side,
    y: a.y + da.y * (reach + bulge * 0.5) + n.y * bulge * side,
  };
  const c2 = {
    x: b.x + db.x * (reach + bulge * 0.5) + n.x * bulge * side,
    y: b.y + db.y * (reach + bulge * 0.5) + n.y * bulge * side,
  };
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const u = 1 - t;
    pts.push({
      x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    });
  }
  return pts;
}
const distToPolyline = (pts: { x: number; y: number }[], x: number, y: number) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)),
    );
    best = Math.min(best, Math.hypot(a.x + dx * t - x, a.y + dy * t - y));
  }
  return best;
};

/** Was liegt an dieser Stelle der Werkbank? Punkte vor Blöcken vor Kabeln */
function hitTest(x: number, y: number, k: number) {
  const pinR = Math.max(16, 22 / k);
  let pin: PinRef | null = null;
  let pd = pinR;
  for (const p of circuit.parts)
    PARTS[p.kind].pins.forEach((_, i) => {
      const q = pinPos(p, i);
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < pd) {
        pd = d;
        pin = { part: p.id, pin: i };
      }
    });
  if (pin) return { pin: pin as PinRef };
  const part = [...circuit.parts]
    .reverse()
    .find((p) => Math.abs(p.x - x) <= BLOCK / 2 && Math.abs(p.y - y) <= BLOCK / 2);
  if (part) return { part };
  const wire = circuit.wires.find(
    (w) => distToPolyline(wireCurve(w, circuit), x, y) < Math.max(8, 12 / k),
  );
  if (wire) return { wire };
  return {};
}

let schematicSymbols = 0;
/** Zeiger in Canvas-Koordinaten */
type Ptr = { x: number; y: number; isDown: boolean };

type Pt = { x: number; y: number };
/** schneidet die waagerechte/senkrechte Strecke einen Block (etwas verkleinert)? */
function segHitsPart(a: Pt, b: Pt, p: Part) {
  const s = BLOCK / 2 - 3;
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return x1 > p.x - s && x0 < p.x + s && y1 > p.y - s && y0 < p.y + s;
}
/**
 * Rechtwinkliger Weg für den Schaltplan: erst die einfachen L-Wege, sonst ein U-Weg ober- oder
 * unterhalb der Teile – der erste, der keinen Block kreuzt.
 */
function planRoute(pa: Part, a: Pt, pb: Part, b: Pt): Pt[] {
  const out = (p: Part, q: Pt) => {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: q.x + (dx / l) * 20, y: q.y + (dy / l) * 20 };
  };
  const a2 = out(pa, a);
  const b2 = out(pb, b);
  const minY = Math.min(pa.y, pb.y) - BLOCK / 2 - 24;
  const maxY = Math.max(pa.y, pb.y) + BLOCK / 2 + 24;
  const minX = Math.min(pa.x, pb.x) - BLOCK / 2 - 24;
  const maxX = Math.max(pa.x, pb.x) + BLOCK / 2 + 24;
  const routes: Pt[][] = [
    [a, { x: b.x, y: a.y }, b],
    [a, { x: a.x, y: b.y }, b],
    [a, a2, { x: b2.x, y: a2.y }, b2, b],
    [a, a2, { x: a2.x, y: b2.y }, b2, b],
    [a, a2, { x: a2.x, y: maxY }, { x: b2.x, y: maxY }, b2, b],
    [a, a2, { x: a2.x, y: minY }, { x: b2.x, y: minY }, b2, b],
    [a, a2, { x: maxX, y: a2.y }, { x: maxX, y: b2.y }, b2, b],
    [a, a2, { x: minX, y: a2.y }, { x: minX, y: b2.y }, b2, b],
  ];
  const clear = (r: Pt[]) =>
    r.every((q, i) => i === 0 || circuit.parts.every((p) => !segHitsPart(r[i - 1]!, q, p)));
  return routes.find(clear) ?? routes[4]!;
}

class Bench extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  labels: Phaser.GameObjects.Text[] = [];
  used = 0;
  drag: { part: number; dx: number; dy: number; moved: boolean } | null = null;
  wiring: { from: PinRef; x: number; y: number; moved: boolean } | null = null;
  phase = new Map<number, number>();
  constructor() {
    super("bench");
  }
  create() {
    this.g = this.add.graphics();
    // eigene Zeiger-Ereignisse am Canvas: zuverlässig für Maus, Finger und Stift
    const cv = this.game.canvas;
    const at = (e: PointerEvent, isDown: boolean): Ptr => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, isDown };
    };
    let down = false;
    cv.addEventListener("pointerdown", (e) => {
      down = true;
      this.down(at(e, true));
    });
    window.addEventListener("pointermove", (e) => this.move(at(e, down)));
    window.addEventListener("pointerup", (e) => {
      if (!down) return;
      down = false;
      this.up(at(e, false));
    });
    window.addEventListener("pointercancel", () => {
      down = false;
      this.drag = null;
      this.wiring = null;
    });
  }
  label(text: string, x: number, y: number, size: number, color = "#ffffff") {
    let t = this.labels[this.used];
    if (!t) {
      t = this.add
        .text(0, 0, "", { fontFamily: "system-ui, sans-serif", fontStyle: "bold" })
        .setOrigin(0.5);
      this.labels.push(t);
    }
    this.used++;
    return t
      .setText(text)
      .setPosition(x, y)
      .setFontSize(size)
      .setColor(color)
      .setVisible(true)
      .setDepth(5);
  }
  world(p: Ptr) {
    if (!benchFrame) return null;
    const b = benchSize();
    const x = (p.x - benchFrame.ox) / benchFrame.k;
    const y = (p.y - benchFrame.oy) / benchFrame.k;
    return x >= -20 && y >= -20 && x <= b.w + 20 && y <= b.h + 20 ? { x, y } : null;
  }
  down(p: Ptr) {
    sound.start();
    if (overlay || !benchFrame) return;
    const w = this.world(p);
    if (!w) return;
    const hit = hitTest(w.x, w.y, benchFrame.k);
    if (mode === "probieren") {
      if (hit.part && (hit.part.kind === "schalter" || hit.part.kind === "umschalter")) {
        toggle(circuit, hit.part.id);
        sound.clack();
        changed(true);
      }
      return;
    }
    if (hit.pin) {
      if (pending && !samePin(pending, hit.pin)) {
        this.connect(pending, hit.pin);
        pending = null;
        return;
      }
      this.wiring = { from: hit.pin, x: w.x, y: w.y, moved: false };
      return;
    }
    if (hit.part) {
      selected = { part: hit.part.id };
      pending = null;
      this.drag = { part: hit.part.id, dx: hit.part.x - w.x, dy: hit.part.y - w.y, moved: false };
      refreshUi();
      return;
    }
    if (hit.wire) {
      selected = { wire: hit.wire.id };
      pending = null;
      refreshUi();
      return;
    }
    if (armed) return placePart(armed, w.x, w.y);
    selected = {};
    pending = null;
    refreshUi();
  }
  move(p: Ptr) {
    const w = this.world(p);
    if (!w) return;
    if (this.wiring) {
      if (Math.hypot(w.x - this.wiring.x, w.y - this.wiring.y) > 6) this.wiring.moved = true;
      this.wiring.x = w.x;
      this.wiring.y = w.y;
    }
    if (this.drag && p.isDown) {
      const part = circuit.parts.find((q) => q.id === this.drag!.part);
      if (!part) return;
      const b = benchSize();
      const nx = Math.max(BLOCK / 2, Math.min(b.w - BLOCK / 2, w.x + this.drag.dx));
      const ny = Math.max(BLOCK / 2, Math.min(b.h - BLOCK / 2, w.y + this.drag.dy));
      if (Math.hypot(nx - part.x, ny - part.y) > 10) this.drag.moved = true;
      if (this.drag.moved) movePart(circuit, part.id, nx, ny);
    }
  }
  up(p: Ptr) {
    if (this.drag) {
      if (this.drag.moved) changed();
      this.drag = null;
    }
    if (!this.wiring || !benchFrame) return;
    const from = this.wiring.from;
    const moved = this.wiring.moved;
    this.wiring = null;
    const w = this.world(p);
    const hit = w ? hitTest(w.x, w.y, benchFrame.k) : {};
    if (hit.pin && !samePin(hit.pin, from)) return this.connect(from, hit.pin);
    if (!moved) {
      // Punkt angetippt: zweiten Punkt antippen
      pending = from;
      selected = {};
      refreshUi();
    }
  }
  connect(a: PinRef, b: PinRef) {
    const wire = addWire(circuit, a, b);
    if (!wire)
      return toast("Dieses Kabel gibt es schon – oder es passt kein Kabel mehr dran.", 2.5);
    sound.click();
    selected = {};
    changed();
  }

  override update(_t: number, delta: number) {
    const dt = Math.min(0.1, delta / 1000);
    clock += dt;
    const W = this.scale.width;
    const H = this.scale.height;
    const r = this.game.canvas.getBoundingClientRect();
    canvasRect = { left: r.left, top: r.top };
    const wasPortrait = portrait;
    portrait = H > W * 1.05 && W < 700;
    if (wasPortrait !== portrait) this.relayout();
    const wide = W >= 860;
    const g = this.g;
    g.clear();
    this.used = 0;
    g.fillStyle(0x1d2b3a, 1).fillRect(0, 0, W, H);
    // Platz unter der oberen Leiste (am Handy bricht sie um)
    const bar = layer.querySelector<HTMLElement>(".ks-top")!.getBoundingClientRect();
    const top = Math.max(TOP, bar.bottom - r.top + 8);
    const bottom = H - (mode === "bauen" ? BOTTOM : 12);
    const showBench = wide || view === "werkbank";
    const showPlan = wide || view === "schaltplan";
    const b = benchSize();
    const fit = (x0: number, w: number): Frame => {
      const k = Math.min(w / b.w, (bottom - top) / b.h);
      return { k, ox: x0 + (w - b.w * k) / 2, oy: top + (bottom - top - b.h * k) / 2 };
    };
    benchFrame = showBench ? fit(8, (wide ? W * 0.6 : W) - 16) : null;
    planFrame = showPlan ? (wide ? fit(W * 0.6, W * 0.4 - 8) : fit(8, W - 16)) : null;
    if (benchFrame) this.drawBench(benchFrame, dt);
    if (planFrame) this.drawPlan(planFrame);
    else schematicSymbols = 0;
    // Teil, das gerade aus der Kiste gezogen wird
    if (dragGhost && benchFrame) {
      const k = benchFrame.k;
      g.fillStyle(PART_COLORS[dragGhost.kind], 0.6);
      g.fillRoundedRect(
        dragGhost.x - canvasRect.left - (BLOCK / 2) * k,
        dragGhost.y - canvasRect.top - (BLOCK / 2) * k,
        BLOCK * k,
        BLOCK * k,
        10 * k,
      );
    }
    for (let i = this.used; i < this.labels.length; i++) this.labels[i]!.setVisible(false);
  }
  relayout() {
    // Werkbank wechselt die Form: Teile in den neuen Bereich holen
    const b = benchSize();
    for (const p of circuit.parts)
      movePart(circuit, p.id, Math.min(p.x, b.w - BLOCK / 2), Math.min(p.y, b.h - BLOCK / 2));
  }

  drawBench(f: Frame, dt: number) {
    const g = this.g;
    const { k } = f;
    const X = (x: number) => f.ox + x * k;
    const Y = (y: number) => f.oy + y * k;
    const b = benchSize();
    g.fillStyle(0x2f4f3a, 1).fillRoundedRect(X(0), Y(0), b.w * k, b.h * k, 12 * k);
    g.fillStyle(0x3f6a4d, 1);
    for (let y = 20; y < b.h; y += 40)
      for (let x = 20; x < b.w; x += 40) g.fillCircle(X(x), Y(y), 1.6 * k);
    // Kabel
    circuit.wires.forEach((w, i) => {
      const pts = wireCurve(w, circuit);
      const sel = selected.wire === w.id;
      const amps = result.wires[w.id] ?? 0;
      if (sel) {
        g.lineStyle(11 * k, 0xffffff, 0.9);
        g.strokePoints(pts.map((q) => new Phaser.Math.Vector2(X(q.x), Y(q.y))));
      }
      g.lineStyle(6 * k, WIRE_COLORS[i % WIRE_COLORS.length]!, 1);
      g.strokePoints(pts.map((q) => new Phaser.Math.Vector2(X(q.x), Y(q.y))));
      // Lichtpunkte: wandern mit dem Strom, mehr Strom = schneller
      if (Math.abs(amps) > 0.01 && !result.short) {
        const speed = Math.min(1.2, 0.25 + Math.abs(amps) * 1.5) * Math.sign(amps);
        const ph = ((this.phase.get(w.id) ?? 0) + (paused ? 0 : dt * speed * 0.6) + 10) % 1;
        this.phase.set(w.id, ph);
        g.fillStyle(0xfff6b0, 1);
        for (let d = 0; d < 4; d++) {
          const t = (ph + d / 4) % 1;
          const q = pts[Math.round(t * (pts.length - 1))]!;
          g.fillCircle(X(q.x), Y(q.y), 3.2 * k);
        }
      }
    });
    // Blöcke
    for (const p of circuit.parts) this.drawPart(p, X, Y, k);
    // Kabel, das gerade gezogen wird
    if (this.wiring?.moved) {
      const part = circuit.parts.find((q) => q.id === this.wiring!.from.part);
      if (part) {
        const a = pinPos(part, this.wiring.from.pin);
        g.lineStyle(5 * k, 0xffffff, 0.7);
        g.lineBetween(X(a.x), Y(a.y), X(this.wiring.x), Y(this.wiring.y));
      }
    }
    if (!circuit.parts.length)
      this.label(
        "Zieh Teile aus der Kiste hierher",
        X(b.w / 2),
        Y(b.h / 2),
        Math.max(13, 20 * k),
        "#9fc4a8",
      );
  }

  drawPart(p: Part, X: (x: number) => number, Y: (y: number) => number, k: number) {
    const g = this.g;
    const s = BLOCK / 2;
    const sel = selected.part === p.id;
    if (sel)
      g.fillStyle(0xffffff, 0.9).fillRoundedRect(
        X(p.x - s - 4),
        Y(p.y - s - 4),
        (BLOCK + 8) * k,
        (BLOCK + 8) * k,
        14 * k,
      );
    const hot = p.kind === "batterie" && result.short;
    g.fillStyle(hot ? 0xb03a2e : PART_COLORS[p.kind], 1).fillRoundedRect(
      X(p.x - s),
      Y(p.y - s),
      BLOCK * k,
      BLOCK * k,
      10 * k,
    );
    g.fillStyle(0xffffff, 0.08).fillRoundedRect(X(p.x - s), Y(p.y - s), BLOCK * k, 14 * k, 10 * k);
    // Symbol im Block (gedreht wie der Block)
    const rot = (dx: number, dy: number) => {
      let x = dx;
      let y = dy;
      for (let i = 0; i < p.rot; i++) [x, y] = [-y, x];
      return { x: X(p.x + x), y: Y(p.y + y) };
    };
    const line = (a: [number, number], b: [number, number], w: number, c: number) => {
      const A = rot(...a);
      const B = rot(...b);
      g.lineStyle(w * k, c, 1).lineBetween(A.x, A.y, B.x, B.y);
    };
    switch (p.kind) {
      case "batterie": {
        const body = rot(0, 0);
        g.fillStyle(0xf39c12, 1);
        const a = rot(-24, -12);
        const c = rot(24, 12);
        g.fillRect(
          Math.min(a.x, c.x),
          Math.min(a.y, c.y),
          Math.abs(c.x - a.x),
          Math.abs(c.y - a.y),
        );
        line([24, 0], [30, 0], 8, 0xbdc3c7);
        this.label("4,5 V", body.x, body.y, Math.max(9, 13 * k), "#2c2c2c");
        if (hot) {
          // Hitze-Wellen, ruhig (0,5 Hz)
          g.lineStyle(2 * k, 0xffb199, 0.8);
          for (let i = -1; i <= 1; i++) {
            const x0 = X(p.x + i * 14);
            const yb = Y(p.y - s - 4);
            const wob = Math.sin(clock * Math.PI + i) * 3 * k;
            g.lineBetween(x0, yb, x0 + wob, yb - 10 * k);
            g.lineBetween(x0 + wob, yb - 10 * k, x0, yb - 20 * k);
          }
        }
        break;
      }
      case "lampe": {
        const lamp = result.lamps[p.id];
        const lvl = lamp?.level ?? "aus";
        const c = rot(0, -4);
        if (lvl !== "aus") {
          g.fillStyle(0xfff3a0, lvl === "hell" ? 0.35 : 0.15).fillCircle(
            c.x,
            c.y,
            (lvl === "hell" ? 46 : 34) * k,
          );
        }
        g.fillStyle(
          lvl === "hell" ? 0xfff176 : lvl === "schwach" ? 0xd4c27a : 0x8a9099,
          1,
        ).fillCircle(c.x, c.y, 18 * k);
        g.lineStyle(2 * k, 0x5d4037, 1);
        const f1 = rot(-6, 0);
        const f2 = rot(0, -10);
        const f3 = rot(6, 0);
        g.lineBetween(f1.x, f1.y, f2.x, f2.y);
        g.lineBetween(f2.x, f2.y, f3.x, f3.y);
        const base = rot(0, 18);
        g.fillStyle(0x95a5a6, 1).fillCircle(base.x, base.y, 7 * k);
        line([-30, 0], [-12, 8], 3, 0x95a5a6);
        line([30, 0], [12, 8], 3, 0x95a5a6);
        break;
      }
      case "schalter": {
        line([-30, 0], [-14, 0], 4, 0xbdc3c7);
        line([14, 0], [30, 0], 4, 0xbdc3c7);
        line([-14, 0], p.on ? [14, 0] : [10, -18], 6, p.on ? 0x2ecc71 : 0xe67e22);
        this.label(p.on ? "AN" : "AUS", rot(0, 22).x, rot(0, 22).y, Math.max(8, 11 * k), "#cfd8dc");
        break;
      }
      case "umschalter": {
        line([-30, 0], [-10, 0], 4, 0xbdc3c7);
        line([24, -20], [30, -20], 4, 0xbdc3c7);
        line([24, 20], [30, 20], 4, 0xbdc3c7);
        line([-10, 0], p.on ? [24, 20] : [24, -20], 6, 0x2ecc71);
        break;
      }
    }
    // Anschlusspunkte
    PARTS[p.kind].pins.forEach((d, i) => {
      const q = pinPos(p, i);
      const ref = { part: p.id, pin: i };
      const isPending = pending && samePin(pending, ref);
      const lonely = clock < helpUntil && !wiresAt(circuit, ref);
      if (isPending || lonely) {
        // langsames Pulsieren (1 Hz, KS-AK-10)
        const a = 0.35 + 0.35 * Math.sin(clock * Math.PI * 2);
        g.fillStyle(isPending ? 0xffffff : 0xffeb3b, a).fillCircle(X(q.x), Y(q.y), 18 * k);
      }
      g.fillStyle(0x111111, 1).fillCircle(X(q.x), Y(q.y), 10 * k);
      g.fillStyle(d.label === "+" ? 0xe74c3c : d.label === "−" ? 0x3498db : 0xf1c40f, 1).fillCircle(
        X(q.x),
        Y(q.y),
        7 * k,
      );
      if (d.label) {
        const o = { x: q.x + (p.x - q.x) * 0.3, y: q.y + (p.y - q.y) * 0.3 };
        this.label(d.label, X(o.x), Y(o.y), Math.max(10, 15 * k));
      }
    });
  }

  /** Schaltplan mit Normsymbolen an denselben Stellen; Kabel rechtwinklig */
  drawPlan(f: Frame) {
    const g = this.g;
    const { k } = f;
    const X = (x: number) => f.ox + x * k;
    const Y = (y: number) => f.oy + y * k;
    const b = benchSize();
    g.fillStyle(0xf7f4ea, 1).fillRoundedRect(X(0), Y(0), b.w * k, b.h * k, 12 * k);
    g.fillStyle(0xe0dccd, 1);
    for (let y = 20; y < b.h; y += 40)
      for (let x = 20; x < b.w; x += 40) g.fillRect(X(x), Y(y), 1.5, 1.5);
    this.label("Schaltplan", X(56), Y(16), Math.max(10, 14 * k), "#7a7466");
    const ink = 0x2b2b2b;
    // Leitungen
    for (const w of circuit.wires) {
      const pa = circuit.parts.find((p) => p.id === w.a.part)!;
      const pb = circuit.parts.find((p) => p.id === w.b.part)!;
      const a = pinPos(pa, w.a.pin);
      const c = pinPos(pb, w.b.pin);
      const live = Math.abs(result.wires[w.id] ?? 0) > 0.01 && !result.short;
      g.lineStyle((live ? 3 : 2) * k, live ? 0xe67e22 : ink, 1);
      const route = planRoute(pa, a, pb, c);
      for (let i = 1; i < route.length; i++)
        g.lineBetween(X(route[i - 1]!.x), Y(route[i - 1]!.y), X(route[i]!.x), Y(route[i]!.y));
    }
    let n = 0;
    for (const p of circuit.parts) {
      n++;
      const rot = (dx: number, dy: number) => {
        let x = dx;
        let y = dy;
        for (let i = 0; i < p.rot; i++) [x, y] = [-y, x];
        return { x: X(p.x + x), y: Y(p.y + y) };
      };
      const line = (a: [number, number], c: [number, number], w = 2) => {
        const A = rot(...a);
        const C = rot(...c);
        g.lineStyle(w * k, ink, 1).lineBetween(A.x, A.y, C.x, C.y);
      };
      switch (p.kind) {
        case "batterie":
          line([40, 0], [6, 0]);
          line([-40, 0], [-6, 0]);
          line([6, -20], [6, 20], 3); // langer Strich = +
          line([-6, -10], [-6, 10], 6); // kurzer, dicker Strich = −
          this.label("+", rot(16, -16).x, rot(16, -16).y, Math.max(10, 14 * k), "#2b2b2b");
          break;
        case "lampe": {
          const lvl = result.lamps[p.id]?.level ?? "aus";
          line([-40, 0], [-16, 0]);
          line([40, 0], [16, 0]);
          const c = rot(0, 0);
          if (lvl !== "aus")
            g.fillStyle(0xfff176, lvl === "hell" ? 1 : 0.5).fillCircle(c.x, c.y, 16 * k);
          g.lineStyle(2 * k, ink, 1).strokeCircle(c.x, c.y, 16 * k);
          line([-11, -11], [11, 11]);
          line([-11, 11], [11, -11]);
          break;
        }
        case "schalter": {
          line([-40, 0], [-16, 0]);
          line([16, 0], [40, 0]);
          line([-16, 0], p.on ? [16, 0] : [12, -16], 3);
          // Kontakte als kleine Kreise, damit man den Schalter auch geschlossen erkennt
          for (const dx of [-16, 16]) {
            const c = rot(dx, 0);
            g.fillStyle(0xf7f4ea, 1).fillCircle(c.x, c.y, 4 * k);
            g.lineStyle(2 * k, ink, 1).strokeCircle(c.x, c.y, 4 * k);
          }
          break;
        }
        case "umschalter":
          line([-40, 0], [-14, 0]);
          line([18, -20], [40, -20]);
          line([18, 20], [40, 20]);
          line([-14, 0], p.on ? [18, 20] : [18, -20]);
          break;
      }
      // Verbindungspunkte an Abzweigungen
      PARTS[p.kind].pins.forEach((_, i) => {
        if (wiresAt(circuit, { part: p.id, pin: i }) >= 2) {
          const q = pinPos(p, i);
          g.fillStyle(ink, 1).fillCircle(X(q.x), Y(q.y), 4 * k);
        }
      });
    }
    schematicSymbols = n;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: "#1d2b3a",
  scale: { mode: Phaser.Scale.RESIZE, width: stage.clientWidth, height: stage.clientHeight },
  scene: [Bench],
  banner: false,
});

// Start: neue Spieler beginnen mit Mission 1, sonst das Menü
refreshUi();
const firstOpen = MISSIONS.find((m) => !data.stars[m.id] && unlocked(data, m.id));
if (!Object.keys(data.stars).length) startMission(MISSIONS[0]!);
else {
  if (firstOpen) startMission(firstOpen);
  else startFree();
  closeOverlay();
  openMenu();
}

if (debugEnabled) {
  (window as unknown as { __dampf: unknown }).__dampf = {
    state: () => ({
      screen: overlay?.getAttribute("aria-label") ?? "werkbank",
      mode,
      mission: mission?.id ?? null,
      solved,
      stars: { ...data.stars },
      parts: circuit.parts.map((p) => ({
        id: p.id,
        kind: p.kind,
        x: p.x,
        y: p.y,
        rot: p.rot,
        on: p.on,
      })),
      wires: circuit.wires.length,
      lamps: circuit.parts
        .filter((p) => p.kind === "lampe")
        .map((p) => result.lamps[p.id]?.level ?? "aus"),
      short: result.short,
      view: { bench: !!benchFrame, plan: !!planFrame },
      schematic: schematicSymbols,
      paused,
      volume: data.volume,
      pending: !!pending,
    }),
    /** Bildschirm-Koordinaten eines Anschlusspunkts bzw. einer Werkbank-Stelle */
    pin: (part: number, pin: number) => {
      const p = circuit.parts.find((q) => q.id === part);
      return p ? benchToClient(pinPos(p, pin).x, pinPos(p, pin).y) : null;
    },
    at: (x: number, y: number) => benchToClient(x, y),
    bench: () => benchSize(),
  };
}
