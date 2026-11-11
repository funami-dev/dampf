import * as THREE from "three";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { LANDMARKS, WORKPLACES, buildCity } from "./logic/city.ts";
import { movePlayer, type Player } from "./logic/player.ts";
import {
  JOBS,
  USE_RADIUS,
  createTask,
  currentStep,
  useAt,
  type JobId,
  type Task,
} from "./logic/jobs.ts";
import { bakeResult, needle } from "./logic/baking.ts";
import { addStar, browserStore, hasBadge, load, save, type SaveData } from "./logic/save.ts";
import { buildCityScene, textSprite, v3 } from "./render/city3d.ts";
import { buildMatti } from "./render/matti.ts";
import { INTERIOR_DOOR, buildInterior } from "./render/interior.ts";
import { drawCity } from "./render/mapCanvas.ts";
import { debugEnabled } from "./debug.ts";

const DISCOVER_RADIUS = 25;
const city = buildCity();
const store = browserStore();
let data: SaveData = load(store);
const persist = () => save(store, data);

// --- DOM / Renderer ---
const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
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
layer.className = "hi-layer";
stage.append(layer);
layer.innerHTML = `
  <div class="hi-top">
    <div class="hi-task" role="status"></div>
    <button class="hi-btn" type="button" data-b="map">Karte</button>
    <button class="hi-btn" type="button" data-b="menu">Menü</button>
  </div>
  <div class="hi-arrow" hidden></div>
  <div class="hi-toast" role="status"></div>
  <div class="hi-look" aria-hidden="true"></div>
  <div class="hi-bottom">
    <div class="hi-stick" role="slider" aria-label="Laufen"><div class="hi-knob"></div></div>
    <div class="hi-actions">
      <button class="hi-btn primary hi-use" type="button" data-b="use" data-hold hidden>Benutzen</button>
    </div>
  </div>`;
const $ = <T extends HTMLElement>(sel: string) => layer.querySelector<T>(sel)!;
const taskEl = $(".hi-task");
const arrowEl = $(".hi-arrow");
const toastEl = $(".hi-toast");
const useBtn = $<HTMLButtonElement>('[data-b="use"]');

// --- Szenen ---
const cityScene = new THREE.Scene();
buildCityScene(cityScene, city);
const houseScene = new THREE.Scene();
buildInterior(houseScene);
const camera = new THREE.PerspectiveCamera(60, 1, 0.2, 900);
const matti = buildMatti();
cityScene.add(matti.group);

// Markierungen: Häuser, Ziel
const houseMarkers = city.houses.map((h) => {
  const s = textSprite(h.name, "#ffffff", "rgba(214,51,132,0.92)", 0.9);
  s.position.copy(v3(h.door[0], 7, h.door[1]));
  cityScene.add(s);
  return s;
});
const target = new THREE.Group();
const ring = new THREE.Mesh(
  new THREE.RingGeometry(2.2, 3, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.15;
const beacon = new THREE.Mesh(
  new THREE.ConeGeometry(0.8, 1.8, 4),
  new THREE.MeshBasicMaterial({ color: 0xffcc00 }),
);
beacon.rotation.x = Math.PI;
beacon.position.y = 6;
target.add(ring, beacon);
target.visible = false;
cityScene.add(target);

// --- Zustand ---
const startPos = (): [number, number] => {
  const h = city.houses.find((x) => x.id === data.house);
  return h ? h.door : [0, 15];
};
const [sx, sz] = startPos();
let player: Player = { x: sx, z: sz, heading: 180, moving: false };
let inside = false;
let insidePos = new THREE.Vector3(0, 0, 3.5);
let insideHeading = 180;
let camHeading = 0;
let task: Task | null = null;
let paused = false;
let overlay: HTMLElement | null = null;
let holdStart: number | null = null;
let toastUntil = 0;
let photo: { from: THREE.Vector3; to: THREE.Vector3 } | null = null;

function toast(text: string, seconds = 2.5) {
  toastEl.textContent = text;
  toastUntil = performance.now() + seconds * 1000;
}

// --- Eingabe ---
const keys = new Set<string>();
const stick = { x: 0, y: 0 };
let stickId: number | null = null;
const stickEl = $(".hi-stick");
const knob = $(".hi-knob");
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

// Kamera drehen: Wischen rechts / Maus ziehen auf dem Canvas
let lookId: number | null = null;
let lookX = 0;
for (const el of [$(".hi-look"), renderer.domElement]) {
  el.addEventListener("pointerdown", (e) => {
    lookId = e.pointerId;
    lookX = e.clientX;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerId !== lookId) return;
    camHeading = (camHeading + (e.clientX - lookX) * 0.35 + 360) % 360;
    lookX = e.clientX;
  });
  el.addEventListener("pointerup", () => (lookId = null));
  el.addEventListener("pointercancel", () => (lookId = null));
}

useBtn.addEventListener("pointerdown", () => (holdStart = performance.now()));
useBtn.addEventListener("pointerup", () => {
  if (holdStart !== null) activate((performance.now() - holdStart) / 1000);
  holdStart = null;
});
useBtn.addEventListener("pointerleave", () => (holdStart = null));
useBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter") activate(0);
});
$('[data-b="map"]').addEventListener("click", () => openMap());
$('[data-b="menu"]').addEventListener("click", () => openMenu());

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))
    e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (overlay) {
    if (e.code === "Escape" || e.code === "KeyM") closeOverlay();
    return;
  }
  if (e.code === "KeyE" || e.code === "Space") holdStart = performance.now();
  if (e.code === "KeyM") openMap();
  if (e.code === "Escape") openMenu();
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if ((e.code === "KeyE" || e.code === "Space") && holdStart !== null && !overlay) {
    activate((performance.now() - holdStart) / 1000);
    holdStart = null;
  }
});
window.addEventListener("blur", () => {
  keys.clear();
  setPaused(true);
});
document.addEventListener("visibilitychange", () => document.hidden && setPaused(true));

// --- Overlays ---
function panel(html: string): HTMLElement {
  closeOverlay();
  const el = document.createElement("div");
  el.className = "hi-panel";
  el.innerHTML = html;
  layer.append(el);
  overlay = el;
  return el;
}
function closeOverlay() {
  overlay?.remove();
  overlay = null;
  bakeRunning = false;
}
function setPaused(v: boolean) {
  if (v && !paused) {
    paused = true;
    const el = panel(
      `<h2>Pause</h2><button class="hi-btn primary" type="button">Weiterspielen</button>`,
    );
    el.querySelector("button")!.addEventListener("click", () => setPaused(false));
  } else if (!v) {
    paused = false;
    closeOverlay();
  }
}

function openMap() {
  const el = panel(`<h2>Karte</h2><canvas class="hi-map" aria-label="Karte von Hilden"></canvas>
    <p>Gelb: Ziel · Pink: Häuser · Blau: Arbeitsorte · Rot: Wahrzeichen</p>
    <button class="hi-btn" type="button">Schließen</button>`);
  const cv = el.querySelector("canvas")!;
  const src = drawCity(city, 2, { buildings: true });
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext("2d")!;
  g.drawImage(src, 0, 0);
  const P = (x: number, z: number): [number, number] => [((x + 800) / 5) * 2, ((800 - z) / 5) * 2];
  const dot = (x: number, z: number, color: string, r = 6) => {
    const [px, py] = P(x, z);
    g.fillStyle = color;
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
  };
  for (const l of LANDMARKS) dot(l.x, l.z, data.discovered.includes(l.id) ? "#c0392b" : "#e8a39b");
  for (const w of WORKPLACES) dot(w.door[0], w.door[1], "#2f6fb3");
  for (const h of city.houses)
    dot(h.door[0], h.door[1], h.id === data.house ? "#d63384" : "#f0a6c9", 7);
  const s = task && currentStep(task);
  if (s) dot(s.target[0], s.target[1], "#ffcc00", 9);
  const [px, py] = P(player.x, player.z);
  g.fillStyle = "#fff";
  g.strokeStyle = "#12324f";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(px, py, 8, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  el.querySelector("button")!.addEventListener("click", closeOverlay);
}

function openMenu() {
  const el = panel(`<h2>Mein Hilden</h2>
    <p>Sterne: ${JOBS.map((j) => `${j.name} ${data.stars[j.id]}${hasBadge(data, j.id) ? " 🏅" : ""}`).join(" · ")}</p>
    <p>Entdeckt: ${data.discovered.length} von ${LANDMARKS.length} Orten</p>
    <button class="hi-btn primary" type="button" data-a="close">Weiterspielen</button>
    ${task ? '<button class="hi-btn" type="button" data-a="abort">Aufgabe abbrechen</button>' : ""}
    <button class="hi-btn" type="button" data-a="house">Anderes Haus wählen</button>
    <p><small>Laufen: WASD/Pfeile oder Joystick · Rennen: Umschalt · Kamera: ziehen oder Q/E · Benutzen: E</small></p>`);
  el.querySelector('[data-a="close"]')!.addEventListener("click", closeOverlay);
  el.querySelector('[data-a="abort"]')?.addEventListener("click", () => {
    task = null;
    closeOverlay();
  });
  el.querySelector('[data-a="house"]')!.addEventListener("click", () => {
    data = { ...data, house: null };
    persist();
    closeOverlay();
    toast("Such dir ein neues Haus aus (pinke Schilder)!", 4);
  });
}

function openJobBoard() {
  const el = panel(`<h2>Jobbrett</h2><p>Such dir einen Beruf aus:</p>
    ${JOBS.map(
      (j) =>
        `<button class="hi-btn" type="button" data-job="${j.id}">${j.name} (${data.stars[j.id]} ★${hasBadge(data, j.id) ? ` · ${j.badge}` : ""})</button>`,
    ).join("")}
    <button class="hi-btn" type="button" data-a="close">Lieber frei herumlaufen</button>`);
  el.querySelectorAll<HTMLButtonElement>("[data-job]").forEach((b) =>
    b.addEventListener("click", () => {
      task = createTask(city, b.dataset.job as JobId, (Date.now() & 0xffff) + 1);
      closeOverlay();
      toast(`${JOBS.find((j) => j.id === task!.job)!.name}: los geht's!`);
    }),
  );
  el.querySelector('[data-a="close"]')!.addEventListener("click", closeOverlay);
}

let bakeRunning = false;
let bakeT = 0;
let bakeNeedle: HTMLElement | null = null;
function openBake() {
  const el =
    panel(`<h2>Brötchen backen</h2><p>Hol die Brötchen raus, wenn der Zeiger im grünen Bereich ist!</p>
    <div class="hi-bake"><div class="hi-needle"></div></div>
    <button class="hi-btn primary" type="button">Rausholen!</button>`);
  bakeRunning = true;
  bakeT = 0;
  bakeNeedle = el.querySelector(".hi-needle");
  el.querySelector("button")!.addEventListener("click", () =>
    finishBake(bakeResult(needle(bakeT))),
  );
}
function finishBake(ok: boolean) {
  if (!task) return closeOverlay();
  if (!ok) {
    toast("Zu früh oder zu spät – nochmal!");
    bakeT = Math.random() * 3;
    return;
  }
  closeOverlay();
  const s = currentStep(task)!;
  task = useAt(task, s.target[0], s.target[1], { baked: true });
  toast("Lecker! Jetzt ausliefern.");
}

// --- Benutzen ---
type Action = { label: string; run: (held: number) => void } | null;

function nearbyAction(): Action {
  if (inside) {
    return insidePos.distanceTo(INTERIOR_DOOR) < 1.6
      ? { label: "Rausgehen", run: () => leaveHouse() }
      : null;
  }
  const near = (p: readonly [number, number], r = USE_RADIUS) =>
    Math.hypot(p[0] - player.x, p[1] - player.z) <= r;
  const s = task && currentStep(task);
  if (s && near(s.target)) {
    const label = { use: "Benutzen", bake: "Backen", cat: "Katze holen", fire: "Löschen (halten)" }[
      s.kind
    ];
    return {
      label,
      run: (held) => {
        if (s.kind === "bake") return openBake();
        const before = task!;
        task = useAt(before, player.x, player.z, { heldSeconds: held });
        if (task === before) {
          if (s.kind === "fire") toast("Länger gedrückt halten!");
          return;
        }
        if (task.done) {
          data = addStar(data, task.job);
          persist();
          const job = JOBS.find((j) => j.id === task!.job)!;
          toast(
            hasBadge(data, job.id) && data.stars[job.id] === 5
              ? `Abzeichen: ${job.badge}! 🏅`
              : `Geschafft! +1 ★ ${job.name}`,
            3.5,
          );
          task = null;
        } else toast("Erledigt – weiter zum nächsten Ziel!");
      },
    };
  }
  if (near(city.jobBoard)) return { label: "Jobbrett", run: () => openJobBoard() };
  for (const h of city.houses) {
    if (!near(h.door)) continue;
    if (data.house === null) {
      return {
        label: `${h.name} wählen`,
        run: () => {
          data = { ...data, house: h.id };
          persist();
          toast(`${h.name} ist jetzt dein Zuhause!`, 3);
        },
      };
    }
    if (data.house === h.id) return { label: "Reingehen", run: () => enterHouse() };
  }
  return null;
}

function activate(held: number) {
  if (paused || overlay) return;
  nearbyAction()?.run(held);
}

function enterHouse() {
  inside = true;
  insidePos = new THREE.Vector3(0, 0, 3.5);
  insideHeading = 180;
  houseScene.add(matti.group);
}
function leaveHouse() {
  inside = false;
  cityScene.add(matti.group);
  const h = city.houses.find((x) => x.id === data.house)!;
  player = { ...player, x: h.door[0], z: h.door[1] };
}

// --- Schleife ---
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const ray = new THREE.Raycaster();
const buildingsMesh = cityScene.getObjectByName("gebaeude")!;
let last = performance.now();
let acc = 0;

function inputVector() {
  const k = (...c: string[]) => c.some((x) => keys.has(x));
  const x = (k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0) + stick.x;
  const z = (k("KeyW", "ArrowUp") ? 1 : 0) - (k("KeyS", "ArrowDown") ? 1 : 0) - stick.y;
  const run = k("ShiftLeft", "ShiftRight") || Math.hypot(stick.x, stick.y) > 0.95;
  return { x, z, run };
}

function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!paused && !overlay) {
    if (keys.has("KeyQ")) camHeading = (camHeading - 90 * dt + 360) % 360;
    if (keys.has("KeyE") && holdStart === null) camHeading = (camHeading + 90 * dt) % 360;
    const inp = inputVector();
    if (inside) {
      // Im Haus: feste Kamera, Bewegung relativ zum Bildschirm (vorwärts = ins Zimmer)
      const len = Math.min(1, Math.hypot(inp.x, inp.z));
      if (len > 0.05) {
        const dx = (inp.x / Math.max(1, len)) * 3 * dt;
        const dn = (inp.z / Math.max(1, len)) * 3 * dt;
        insidePos.x = Math.max(-3.6, Math.min(3.6, insidePos.x + dx));
        insidePos.z = Math.max(-4.6, Math.min(4.6, insidePos.z - dn));
        insideHeading = (Math.atan2(dx, dn) * 180) / Math.PI;
      }
      matti.animate(dt, len > 0.05 ? 3 : 0);
    } else {
      acc += dt;
      const before = player;
      while (acc >= 1 / 60) {
        player = movePlayer(city, player, inp, camHeading, 1 / 60);
        acc -= 1 / 60;
      }
      matti.animate(
        dt,
        player.moving ? Math.hypot(player.x - before.x, player.z - before.z) / dt : 0,
      );
      for (const l of LANDMARKS) {
        if (
          !data.discovered.includes(l.id) &&
          Math.hypot(l.visit[0] - player.x, l.visit[1] - player.z) < DISCOVER_RADIUS
        ) {
          data = { ...data, discovered: [...data.discovered, l.id] };
          persist();
          toast(`Entdeckt: ${l.name}!`);
        }
      }
    }
  }
  if (bakeRunning && bakeNeedle) {
    bakeT += dt;
    bakeNeedle.style.left = `${needle(bakeT) * 100}%`;
  }

  // Figur + Kamera
  const scene = inside ? houseScene : cityScene;
  if (inside) {
    matti.group.position.copy(insidePos);
    matti.group.rotation.y = (-insideHeading * Math.PI) / 180;
  } else {
    matti.group.position.copy(v3(player.x, 0, player.z));
    matti.group.rotation.y = (-player.heading * Math.PI) / 180;
  }
  const h = (camHeading * Math.PI) / 180;
  const head = matti.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
  if (inside) {
    // Überblick über das ganze Zimmer (kein Dach)
    camera.position.set(insidePos.x * 0.3, 8.5, 9);
    camera.lookAt(insidePos.x * 0.3, 0, -0.8);
  } else {
    const back = new THREE.Vector3(-Math.sin(h), 0, Math.cos(h)); // hinter der Figur (Three-Koordinaten)
    let dist = 7;
    const dir = back
      .clone()
      .add(new THREE.Vector3(0, 0.35, 0))
      .normalize();
    ray.set(head, dir);
    ray.far = dist;
    const hit = ray.intersectObject(buildingsMesh, false)[0];
    if (hit) dist = Math.max(1.2, hit.distance - 0.4);
    camera.position
      .copy(head)
      .addScaledVector(back, dist)
      .add(new THREE.Vector3(0, dist * 0.35 + 0.6, 0));
    camera.lookAt(head);
  }

  if (photo) {
    camera.position.copy(photo.from);
    camera.lookAt(photo.to);
  }

  // Ziel, Pfeil, Häuser, HUD
  const step = task && currentStep(task);
  target.visible = !!step && !inside;
  if (step) {
    target.position.copy(v3(step.target[0], 0, step.target[1]));
    beacon.position.y = 6 + Math.sin(now / 300) * 0.6;
    const bearing =
      (Math.atan2(step.target[0] - player.x, step.target[1] - player.z) * 180) / Math.PI;
    arrowEl.hidden = inside;
    arrowEl.style.transform = `rotate(${bearing - camHeading}deg)`;
  } else arrowEl.hidden = true;
  houseMarkers.forEach(
    (m, k) => (m.visible = data.house === null || data.house === city.houses[k]!.id),
  );
  const jobName = task ? JOBS.find((j) => j.id === task!.job)!.name : null;
  const totalStars = Object.values(data.stars).reduce((a, b) => a + b, 0);
  taskEl.innerHTML = step
    ? `<b>${jobName}</b>: ${step.label}<small>${Math.round(Math.hypot(step.target[0] - player.x, step.target[1] - player.z))} m · ★ ${totalStars}</small>`
    : data.house === null
      ? `Such dir ein Haus aus! <small>Pinke Schilder zeigen freie Häuser</small>`
      : `Frei unterwegs <small>Jobbrett am Alten Markt · ★ ${totalStars}</small>`;
  const action = paused || overlay ? null : nearbyAction();
  useBtn.hidden = !action;
  if (action) useBtn.textContent = action.label;
  if (now > toastUntil) toastEl.textContent = "";

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (data.house === null) toast("Willkommen in Hilden! Such dir ein Haus aus.", 4);

if (debugEnabled) {
  window.__dampf = {
    state: () => ({
      x: player.x,
      z: player.z,
      heading: player.heading,
      inside,
      house: data.house,
      stars: data.stars,
      discovered: data.discovered,
      task: task && {
        job: task.job,
        index: task.index,
        steps: task.steps.length,
        target: currentStep(task)?.target,
        kind: currentStep(task)?.kind,
      },
      action: nearbyAction()?.label ?? null,
      paused,
      overlay: overlay ? (overlay.querySelector("h2")?.textContent ?? "") : null,
      houses: city.houses.map((h) => ({ id: h.id, door: h.door })),
      jobBoard: city.jobBoard,
    }),
    teleport: (x, z) => {
      player = { ...player, x, z };
    },
    bakeSuccess: () => finishBake(true),
    photo: (from, to) => {
      photo = { from: v3(from[0], from[1], from[2]), to: v3(to[0], to[1], to[2]) };
    },
  };
}
