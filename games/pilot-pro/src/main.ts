import * as THREE from "three";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { aircraftById, airlineById } from "./logic/catalog.ts";
import { createFlight, step, type FlightState } from "./logic/flight.ts";
import { buildAircraft } from "./render/aircraft.ts";
import { buildWorld, toThree, yaw } from "./render/world.ts";
import { createMenu } from "./ui/menu.ts";
import { createHud } from "./ui/hud.ts";
import { createControls } from "./ui/controls.ts";
import { debugEnabled } from "./debug.ts";

const PHYSICS_DT = 1 / 120;

const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
stage.style.background = "#8ec5ff";

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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
layer.className = "pp-layer";
stage.append(layer);

const scene = new THREE.Scene();
buildWorld(scene);
const camera = new THREE.PerspectiveCamera(60, 1, 2, 40_000);

let screen: "menu" | "flight" = "menu";
let aircraftId = "a320";
let airlineId = "lufthansa";
let flight: FlightState = createFlight();
let cameraMode: "chase" | "cockpit" = "chase";
let paused = false;
let plane = buildAircraft(aircraftById(aircraftId), airlineById(airlineId));
scene.add(plane);
let orbit = 0;

function rebuildPlane() {
  scene.remove(plane);
  plane.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    }
  });
  plane = buildAircraft(aircraftById(aircraftId), airlineById(airlineId));
  scene.add(plane);
  placePlane();
}

function placePlane() {
  plane.position.copy(toThree(flight.x, flight.y + plane.userData.gearHeight, flight.z));
  plane.rotation.set(
    (flight.pitch * Math.PI) / 180,
    yaw(flight.heading),
    (-flight.roll * Math.PI) / 180,
    "YXZ",
  );
}

const menu = createMenu(
  layer,
  { aircraft: aircraftId, airline: airlineId },
  {
    onChange(a, l) {
      aircraftId = a;
      airlineId = l;
      rebuildPlane();
    },
    onStart: () => startFlight(),
  },
);
const hud = createHud(layer, () => openMenu());
const controls = createControls(layer, () => {
  if (screen === "flight") cameraMode = cameraMode === "chase" ? "cockpit" : "chase";
});

const pauseEl = document.createElement("div");
pauseEl.className = "pp-pause";
pauseEl.innerHTML = `<button class="pp-btn pp-go" type="button" style="width:auto">Pause – Weiterfliegen</button>`;
pauseEl.querySelector("button")!.addEventListener("click", () => setPaused(false));
layer.append(pauseEl);

function setPaused(v: boolean) {
  paused = v && screen === "flight";
  pauseEl.style.display = paused ? "" : "none";
}

function showFlightUi(v: boolean) {
  hud.show(v);
  controls.show(v);
  menu.show(!v);
}

function startFlight() {
  flight = createFlight();
  controls.reset();
  cameraMode = "chase";
  screen = "flight";
  showFlightUi(true);
  setPaused(false);
  placePlane();
  camera.position.copy(plane.position).add(new THREE.Vector3(0, 30, 120));
}

function openMenu() {
  screen = "menu";
  flight = createFlight();
  placePlane();
  setPaused(false);
  showFlightUi(false);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (screen === "flight") openMenu();
  } else if (
    (e.code === "Enter" || e.code === "Space") &&
    screen === "menu" &&
    !(e.target instanceof HTMLButtonElement)
  ) {
    startFlight();
  } else if (e.code === "KeyP" && screen === "flight") setPaused(!paused);
});

// PP-AK-13: Fokusverlust pausiert
window.addEventListener("blur", () => setPaused(true));
document.addEventListener("visibilitychange", () => document.hidden && setPaused(true));

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const tmp = new THREE.Vector3();
function updateCamera(dt: number) {
  const L = plane.userData.length as number;
  const r = plane.userData.radius as number;
  if (screen === "menu") {
    orbit += dt * 0.25;
    // Hochformat: weiter weg und Flugzeug in die obere Bildhälfte (unten liegt das Menü)
    const portrait = camera.aspect < 1;
    const dist = L * (portrait ? 2.4 : 1.25);
    camera.position.set(
      plane.position.x + Math.sin(orbit) * dist,
      plane.position.y + L * (portrait ? 0.2 : 0.3),
      plane.position.z + Math.cos(orbit) * dist,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(
      plane.position.x,
      plane.position.y - L * (portrait ? 0.45 : -0.08),
      plane.position.z,
    );
    return;
  }
  if (cameraMode === "cockpit") {
    camera.position.copy(plane.localToWorld(tmp.set(0, r * 0.4, -L * 0.5 - r * 1.7)));
    camera.quaternion.copy(plane.quaternion);
    return;
  }
  // Verfolgersicht: hinter dem Flugzeug (nur Kurs, nicht Rollen), weich nachgeführt
  // vorn (Three.js) = (sin h, 0, −cos h) → hinten = (−sin h, 0, cos h)
  const h = (flight.heading * Math.PI) / 180;
  const back = tmp.set(-Math.sin(h), 0, Math.cos(h));
  const desired = plane.position
    .clone()
    .addScaledVector(back, L * 1.7)
    .add(new THREE.Vector3(0, L * 0.45, 0));
  camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
  camera.up.set(0, 1, 0);
  camera.lookAt(plane.position);
}

let last = performance.now();
let acc = 0;
function frame(now: number) {
  // Höchstens 0,1 s pro Bild nachholen (langsame Geräte laufen sonst in Zeitlupe).
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (screen === "flight" && !paused) {
    controls.update(dt);
    acc += dt;
    while (acc >= PHYSICS_DT) {
      flight = step(flight, controls.input, PHYSICS_DT);
      acc -= PHYSICS_DT;
    }
    placePlane();
    hud.update(flight, paused);
  }
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

showFlightUi(false);
setPaused(false);
placePlane();
requestAnimationFrame(frame);

if (debugEnabled) {
  window.__dampf = {
    screen: () => (screen === "flight" && paused ? "paused" : screen),
    state: () => ({
      ...flight,
      aircraft: aircraftId,
      airline: airlineId,
      camera: cameraMode,
      paused,
      modelAirline: plane.userData.airlineName,
      modelAircraft: plane.userData.aircraftName,
      throttleInput: controls.input.throttle,
      pitchInput: controls.input.pitch,
      rollInput: controls.input.roll,
    }),
  };
}
