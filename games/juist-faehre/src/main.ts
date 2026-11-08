import * as THREE from "three";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { FAIRWAY, SHIPS, shipById, type Pt } from "./logic/world.ts";
import { stepShip } from "./logic/ship.ts";
import {
  canCastOff,
  canMoor,
  castOff,
  createTrip,
  formatClock,
  moor,
  result,
  tick,
  toBerth,
  type Direction,
  type Trip,
} from "./logic/trip.ts";
import { browserStore, load, record, save } from "./logic/logbook.ts";
import { buildWorld, v3 } from "./render/world3d.ts";
import { buildShip } from "./render/ship3d.ts";
import { debugEnabled } from "./debug.ts";

const KNOTS = 1.943844;
const store = browserStore();
let logbook = load(store);

const stage = mountGameShell({ title: manifest.title, version: manifest.version });
stage.style.background = "#a9d4f5";
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
Object.assign(renderer.domElement.style, {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
});
stage.append(renderer.domElement);
const layer = document.createElement("div");
layer.className = "jf-layer";
stage.append(layer);
layer.innerHTML = `
  <div class="jf-top">
    <div class="jf-hud" role="status">
      <div>Uhr <b data-h="clock">--:--</b></div>
      <div>Soll <b data-h="due">--:--</b></div>
      <div><b data-h="speed">0,0</b> kn</div>
      <div data-h="pax">Passagiere</div>
      <div>Zufrieden <b data-h="sat">100 %</b></div>
      <div>Ziel <b data-h="dist">–</b></div>
    </div>
    <div class="jf-side">
      <button class="jf-btn" type="button" data-b="camera">Kamera</button>
      <button class="jf-btn" type="button" data-b="menu">Menü</button>
    </div>
  </div>
  <div class="jf-arrow" hidden></div>
  <div class="jf-toast" role="status"></div>
  <div class="jf-bottom">
    <div class="jf-rudder" role="slider" aria-label="Ruder" aria-valuemin="-35" aria-valuemax="35" aria-valuenow="0"><div class="jf-rudder-knob"></div></div>
    <div class="jf-mid"><button class="jf-btn primary jf-action" type="button" hidden>Ablegen</button></div>
    <div class="jf-lever" role="slider" aria-label="Fahrhebel" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><div class="jf-lever-mid"></div><div class="jf-lever-knob"></div></div>
  </div>`;
const $ = <T extends HTMLElement>(s: string) => layer.querySelector<T>(s)!;
const hud = (k: string) => $(`[data-h="${k}"]`);
const actionBtn = $<HTMLButtonElement>(".jf-action");
const arrowEl = $(".jf-arrow");
const toastEl = $(".jf-toast");
const leverEl = $(".jf-lever");
const leverKnob = $(".jf-lever-knob");
const rudderEl = $(".jf-rudder");
const rudderKnob = $(".jf-rudder-knob");

const scene = new THREE.Scene();
const world = buildWorld(scene);
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 7000);

let shipId = "frisia-i";
let direction: Direction = "to-juist";
let trip: Trip = createTrip(shipId, direction, 1);
let shipModel = buildShip(shipById(shipId));
scene.add(shipModel);
let screen: "menu" | "play" | "result" = "menu";
let paused = false;
let cameraMode: "chase" | "bridge" = "chase";
const controls = { throttle: 0, rudder: 0 };
let keyRudder = 0;
let toastUntil = 0;
let waypoint = 0;
let photo: { from: THREE.Vector3; to: THREE.Vector3 } | null = null;
let overlay: HTMLElement | null = null;

const toast = (t: string, s = 2.5) => {
  toastEl.textContent = t;
  toastUntil = performance.now() + s * 1000;
};

function route(): Pt[] {
  const fw = direction === "to-juist" ? FAIRWAY : [...FAIRWAY].reverse();
  return [...fw, toBerth(direction).start];
}

function setLever(v: number) {
  controls.throttle = Math.max(-1, Math.min(1, Math.round(v * 4) / 4));
  leverKnob.style.top = `${50 - controls.throttle * 42}%`;
  leverEl.setAttribute("aria-valuenow", String(Math.round(controls.throttle * 100)));
}
function setRudder(v: number) {
  controls.rudder = Math.abs(v) < 0.08 ? 0 : Math.max(-1, Math.min(1, v));
  rudderKnob.style.left = `${50 + controls.rudder * 42}%`;
  rudderEl.setAttribute("aria-valuenow", String(Math.round(controls.rudder * 35)));
}

// Fahrhebel und Ruder (Zeiger/Touch, bleiben stehen)
function drag(el: HTMLElement, fn: (e: PointerEvent, r: DOMRect) => void) {
  let id: number | null = null;
  el.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    el.setPointerCapture(e.pointerId);
    fn(e, el.getBoundingClientRect());
  });
  el.addEventListener(
    "pointermove",
    (e) => e.pointerId === id && fn(e, el.getBoundingClientRect()),
  );
  el.addEventListener("pointerup", () => (id = null));
  el.addEventListener("pointercancel", () => (id = null));
}
drag(leverEl, (e, r) => setLever(1 - ((e.clientY - r.top) / r.height) * 2));
drag(rudderEl, (e, r) => setRudder(((e.clientX - r.left) / r.width) * 2 - 1));

actionBtn.addEventListener("click", () => doAction());
$('[data-b="camera"]').addEventListener(
  "click",
  () => (cameraMode = cameraMode === "chase" ? "bridge" : "chase"),
);
$('[data-b="menu"]').addEventListener("click", () => openMenu());

const keys = new Set<string>();
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if (overlay) {
    if (e.code === "Escape" && screen === "play") closeOverlay();
    return;
  }
  if (e.code === "KeyW" || e.code === "ArrowUp") setLever(controls.throttle + 0.25);
  if (e.code === "KeyS" || e.code === "ArrowDown") setLever(controls.throttle - 0.25);
  if (e.code === "KeyC") cameraMode = cameraMode === "chase" ? "bridge" : "chase";
  if ((e.code === "KeyE" || e.code === "Space") && !e.repeat) doAction();
  if (e.code === "Escape") openMenu();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  setPaused(true);
});
document.addEventListener("visibilitychange", () => document.hidden && setPaused(true));

function panel(html: string) {
  closeOverlay();
  const el = document.createElement("div");
  el.className = "jf-panel";
  el.innerHTML = html;
  layer.append(el);
  overlay = el;
  return el;
}
function closeOverlay() {
  overlay?.remove();
  overlay = null;
}
function setPaused(v: boolean) {
  if (screen !== "play") return;
  if (v && !paused) {
    paused = true;
    panel(`<h2>Pause</h2><button class="jf-btn primary" type="button">Weiterfahren</button>`)
      .querySelector("button")!
      .addEventListener("click", () => setPaused(false));
  } else if (!v) {
    paused = false;
    closeOverlay();
  }
}

const starText = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);

function openMenu() {
  screen = "menu";
  paused = false;
  const best = (id: string) => logbook.best[id] ?? {};
  const el = panel(`<h2>Juist-Fähre</h2><p>Wähl dein Schiff und die Richtung.</p>
    <div class="jf-grid" role="group" aria-label="Schiff">${SHIPS.map(
      (s) =>
        `<button class="jf-btn" type="button" data-ship="${s.id}" aria-pressed="${s.id === shipId}">${s.name}<br><small>${starText(best(s.id)["to-juist"] ?? 0)} ${starText(best(s.id)["to-norddeich"] ?? 0)}</small></button>`,
    ).join("")}</div>
    <div class="jf-grid" role="group" aria-label="Richtung">
      <button class="jf-btn" type="button" data-dir="to-juist" aria-pressed="${direction === "to-juist"}">Norddeich → Juist</button>
      <button class="jf-btn" type="button" data-dir="to-norddeich" aria-pressed="${direction === "to-norddeich"}">Juist → Norddeich</button>
    </div>
    <button class="jf-btn primary" type="button" data-a="start">Los geht's!</button>
    <p><small>Fahrten: ${logbook.trips} · Fahrhebel: W/S · Ruder: A/D · Ablegen/Festmachen: E · Kamera: C</small></p>`);
  el.querySelectorAll<HTMLButtonElement>("[data-ship]").forEach((b) =>
    b.addEventListener("click", () => {
      shipId = b.dataset.ship!;
      el.querySelectorAll("[data-ship]").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)),
      );
      newTrip();
    }),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-dir]").forEach((b) =>
    b.addEventListener("click", () => {
      direction = b.dataset.dir as Direction;
      el.querySelectorAll("[data-dir]").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)),
      );
      newTrip();
    }),
  );
  el.querySelector('[data-a="start"]')!.addEventListener("click", () => {
    newTrip();
    screen = "play";
    closeOverlay();
    toast("Passagiere steigen ein …", 3);
  });
}

function newTrip() {
  trip = createTrip(shipId, direction, (Date.now() & 0xffff) + 1);
  scene.remove(shipModel);
  shipModel = buildShip(shipById(shipId));
  scene.add(shipModel);
  setLever(0);
  setRudder(0);
  waypoint = 0;
  cameraMode = "chase";
  snapCamera = true;
}

function showResult() {
  const r = result(trip);
  logbook = record(logbook, shipId, direction, r.stars);
  save(store, logbook);
  screen = "result";
  const el = panel(`<h2>Festgemacht in ${toBerth(direction).name}!</h2>
    <div class="jf-stars" aria-label="${r.stars} von 3 Sternen">${starText(r.stars)}</div>
    <p>${r.lateMinutes <= 5 ? "Pünktlich" : `${r.lateMinutes} Minuten Verspätung`} · Ankunft ${formatClock(trip.arrivalClock ?? trip.clock)} (Soll ${formatClock(trip.due)})</p>
    <p>Zufriedenheit: ${r.satisfaction} %</p>
    <button class="jf-btn primary" type="button" data-a="back">Zurückfahren</button>
    <button class="jf-btn" type="button" data-a="menu">Anderes Schiff</button>`);
  el.querySelector('[data-a="back"]')!.addEventListener("click", () => {
    direction = direction === "to-juist" ? "to-norddeich" : "to-juist";
    newTrip();
    screen = "play";
    closeOverlay();
    toast("Passagiere steigen ein …", 3);
  });
  el.querySelector('[data-a="menu"]')!.addEventListener("click", () => openMenu());
}

function doAction() {
  if (screen !== "play" || paused || overlay) return;
  if (trip.phase === "boarding") {
    if (canCastOff(trip)) {
      trip = castOff(trip);
      toast("Leinen los! Gute Fahrt.");
    } else if (trip.boarded < trip.passengers) toast("Es steigen noch Passagiere ein.");
    else toast(`Abfahrt erst um ${formatClock(trip.departure)}.`);
  } else if (trip.phase === "sailing" && canMoor(trip)) {
    trip = moor(trip);
    setLever(0);
    showResult();
  }
}

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

let snapCamera = true;
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  if (screen === "play" && !paused && !overlay) {
    const k = (...c: string[]) => c.some((x) => keys.has(x));
    const kr = (k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0);
    if (kr !== 0 || keyRudder !== 0) setRudder(kr);
    keyRudder = kr;
    let grounded = false;
    let impact = 0;
    if (trip.phase === "sailing") {
      for (let t = 0; t < dt - 1e-9; t += 1 / 60) {
        const r = stepShip(trip.ship, controls, Math.min(1 / 60, dt - t));
        trip = { ...trip, ship: r.state };
        grounded ||= r.grounded;
        impact = Math.max(impact, r.impact);
      }
      if (grounded) toast("Auf Grund gelaufen! Zurück ins Fahrwasser.");
      if (impact > 1) toast("Zu hart angelegt!");
      const wp = route()[waypoint];
      if (
        wp &&
        waypoint < route().length - 1 &&
        Math.hypot(wp[0] - trip.ship.x, wp[1] - trip.ship.z) < 150
      )
        waypoint++;
    }
    trip = tick(trip, dt, { grounded, impact, heel: trip.ship.heel });
  }
  world.animate(time);

  // Schiff
  const s = trip.ship;
  shipModel.position.copy(v3(s.x, Math.sin(time * 1.1) * 0.15, s.z));
  shipModel.rotation.set(
    Math.sin(time * 0.8) * 0.01,
    (-s.heading * Math.PI) / 180,
    (s.heel * Math.PI) / 180 + Math.sin(time * 0.9) * 0.01,
    "YXZ",
  );

  // Kamera
  const L = shipModel.userData.length as number;
  if (photo) {
    camera.position.copy(photo.from);
    camera.lookAt(photo.to);
  } else if (screen === "menu") {
    const a = time * 0.15;
    camera.position.set(
      shipModel.position.x + Math.sin(a) * L * 1.6,
      L * 0.6,
      shipModel.position.z + Math.cos(a) * L * 1.6,
    );
    camera.lookAt(shipModel.position.x, 4, shipModel.position.z);
  } else if (cameraMode === "bridge") {
    camera.position.copy(
      shipModel.localToWorld((shipModel.userData.bridge as THREE.Vector3).clone()),
    );
    camera.quaternion.copy(shipModel.quaternion);
  } else {
    const h = (s.heading * Math.PI) / 180;
    const desired = v3(s.x - Math.sin(h) * L * 1.5, L * 0.55, s.z - Math.cos(h) * L * 1.5);
    if (snapCamera) camera.position.copy(desired);
    else camera.position.lerp(desired, 1 - Math.exp(-dt * 3));
    snapCamera = false;
    camera.lookAt(shipModel.position.x, 6, shipModel.position.z);
  }

  // HUD
  const target = toBerth(direction);
  hud("clock").textContent = formatClock(trip.clock);
  hud("due").textContent = formatClock(trip.due);
  hud("speed").textContent = (Math.abs(s.speed) * KNOTS).toFixed(1).replace(".", ",");
  hud("pax").textContent =
    trip.phase === "boarding"
      ? `Einsteigen ${Math.floor(trip.boarded)}/${trip.passengers}`
      : `${trip.passengers} Passagiere`;
  hud("sat").textContent = `${Math.round(trip.satisfaction)} %`;
  const dist = Math.hypot(target.start[0] - s.x, target.start[1] - s.z);
  hud("dist").textContent =
    dist > 999 ? `${(dist / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(dist)} m`;
  const wp = route()[waypoint]!;
  if (screen === "play" && trip.phase === "sailing") {
    const bearing = (Math.atan2(wp[0] - s.x, wp[1] - s.z) * 180) / Math.PI;
    arrowEl.hidden = false;
    arrowEl.style.transform = `rotate(${bearing - s.heading}deg)`;
  } else arrowEl.hidden = true;
  const act =
    screen === "play" && !overlay
      ? trip.phase === "boarding"
        ? canCastOff(trip)
          ? "Ablegen"
          : null
        : canMoor(trip)
          ? "Festmachen"
          : null
      : null;
  actionBtn.hidden = !act;
  if (act) actionBtn.textContent = act;
  if (now > toastUntil) toastEl.textContent = "";

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

openMenu();
requestAnimationFrame(frame);

if (debugEnabled) {
  window.__dampf = {
    state: () => ({
      screen: paused ? "paused" : screen,
      ship: shipId,
      shipName: shipModel.userData.name,
      direction,
      phase: trip.phase,
      clock: trip.clock,
      departure: trip.departure,
      due: trip.due,
      boarded: trip.boarded,
      passengers: trip.passengers,
      satisfaction: trip.satisfaction,
      x: trip.ship.x,
      z: trip.ship.z,
      speed: trip.ship.speed,
      throttle: controls.throttle,
      rudder: controls.rudder,
      camera: cameraMode,
      action: actionBtn.hidden ? null : actionBtn.textContent,
      targetBerth: toBerth(direction).start,
      logbook,
    }),
    teleport: (x, z, heading) => {
      trip = { ...trip, ship: { ...trip.ship, x, z, heading, speed: 0, heel: 0 } };
      snapCamera = true;
    },
    photo: (from, to) => {
      photo = { from: v3(...from), to: v3(...to) };
    },
  };
}
