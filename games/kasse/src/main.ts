import * as THREE from "three";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import "./ui/style.css";
import { productById } from "./logic/catalog.ts";
import {
  attemptScan,
  canTotal,
  formatEuro,
  openRegister,
  pay,
  total,
  turn,
  type Register,
} from "./logic/register.ts";
import { buildProduct } from "./render/products3d.ts";
import {
  BAG,
  BELT,
  COUNTER_Y,
  SCANNER,
  buildCustomer,
  buildStore,
  drawScreen,
} from "./render/store3d.ts";
import { debugEnabled } from "./debug.ts";

const BELT_SPEED = 0.35;
const HOLD_Y = COUNTER_Y + 0.06;
const FRONT_X = BELT.x1 - 0.02;
const SPAWN_X = BELT.x0 + 0.2;

const stage = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
stage.style.background = "#1c4e9c";
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
Object.assign(renderer.domElement.style, {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  touchAction: "none",
});
stage.append(renderer.domElement);
const layer = document.createElement("div");
layer.className = "ka-layer";
stage.append(layer);
layer.innerHTML = `
  <div class="ka-top">
    <div class="ka-hud" role="status">
      <div><b data-h="customer">Kunde 1</b></div>
      <div>Heute: <b data-h="served">0</b> Kunden · <b data-h="revenue">0,00 €</b></div>
    </div>
    <button class="ka-btn" type="button" data-b="end">Feierabend</button>
  </div>
  <div class="ka-toast" role="status"></div>
  <div class="ka-bottom">
    <button class="ka-btn" type="button" data-b="turn">Drehen</button>
    <div class="ka-total">Summe <b data-h="total">0,00 €</b></div>
    <button class="ka-btn primary" type="button" data-b="sum" hidden>Summe</button>
  </div>`;
const $ = <T extends HTMLElement>(s: string) => layer.querySelector<T>(s)!;
const hud = (k: string) => $(`[data-h="${k}"]`);
const toastEl = $(".ka-toast");
const sumBtn = $<HTMLButtonElement>('[data-b="sum"]');

const scene = new THREE.Scene();
const store = buildStore(scene);
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 60);

// --- Zustand ---------------------------------------------------------------
type Place = "waiting" | "belt" | "held" | "bag";
interface Shown {
  uid: string;
  model: THREE.Group;
  place: Place;
  width: number;
  /** Zielwinkel (0 = Barcode zur Kassiererin) */
  yaw: number;
}

let reg: Register = openRegister(1);
let shown: Shown[] = [];
let screen: "menu" | "play" | "summary" = "menu";
let paused = false;
let phase: "scan" | "paying" = "scan";
let payTimer = 0;
let held: { s: Shown; pointerId: number; over: boolean } | null = null;
let selected: string | null = null;
let customerModel = buildCustomer(reg.seed);
scene.add(customerModel);
let leavingModel: THREE.Group | null = null;
let beltOffset = 0;
let toastUntil = 0;
let overlay: HTMLElement | null = null;
let photo: { from: THREE.Vector3; to: THREE.Vector3 } | null = null;
let lastReceipt = -1;
let flashUntil = 0;

const toast = (t: string, s = 2) => {
  toastEl.textContent = t;
  toastUntil = performance.now() + s * 1000;
};
const itemOf = (uid: string) => reg.items.find((i) => i.uid === uid)!;
const nameOf = (uid: string) => productById(itemOf(uid).productId)!.name;

function newCustomer() {
  for (const s of shown) scene.remove(s.model);
  shown = reg.items.map((it) => {
    const model = buildProduct(productById(it.productId)!);
    const yaw = it.facing === "toward" ? 0 : Math.PI;
    model.rotation.y = yaw;
    model.visible = false;
    scene.add(model);
    return { uid: it.uid, model, place: "waiting", width: model.userData.size[0], yaw };
  });
  held = null;
  selected = null;
  phase = "scan";
  if (customerModel) {
    leavingModel = customerModel;
  }
  customerModel = buildCustomer(reg.seed);
  customerModel.position.set(-3.2, 0, -0.95);
  scene.add(customerModel);
  lastReceipt = -1;
}

// --- Bedienung -----------------------------------------------------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const holdPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -HOLD_Y);
const canAct = () => screen === "play" && !paused && !overlay && phase === "scan";

function setRay(e: PointerEvent) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}

const overScanner = (p: THREE.Vector3) =>
  Math.abs(p.x - SCANNER.x) < SCANNER.halfW && Math.abs(p.z - SCANNER.z) < SCANNER.halfD;

function scanHeld() {
  if (!held) return;
  const { state, result } = attemptScan(reg, held.s.uid, true);
  reg = state;
  const name = nameOf(held.s.uid);
  if (result === "beep") {
    store.flash("ok");
    flashUntil = performance.now() + 500;
    toast(`Piep! ${name} ${formatEuro(productById(itemOf(held.s.uid).productId)!.price)}`);
  } else if (result === "away") {
    store.flash("bad");
    flashUntil = performance.now() + 500;
    toast("Barcode zeigt weg – drehen!");
  } else if (result === "already") toast(`${name} ist schon gescannt.`);
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (!canAct() || held) return;
  setRay(e);
  const pickable = shown.filter((s) => s.place === "belt" || s.place === "bag").map((s) => s.model);
  const hit = raycaster.intersectObjects(pickable, true).find((h) => h.object.userData.pick);
  if (!hit) return;
  let o: THREE.Object3D = hit.object;
  while (o.parent && !pickable.includes(o as THREE.Group)) o = o.parent;
  const s = shown.find((x) => x.model === o);
  if (!s) return;
  renderer.domElement.setPointerCapture(e.pointerId);
  held = { s, pointerId: e.pointerId, over: false };
  s.place = "held";
  selected = s.uid;
  moveHeld(e);
});
function moveHeld(e: PointerEvent) {
  if (!held || e.pointerId !== held.pointerId) return;
  setRay(e);
  const p = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(holdPlane, p)) return;
  p.x = Math.max(BELT.x0 + 0.1, Math.min(BAG.x1 - 0.05, p.x));
  p.z = Math.max(-0.28, Math.min(0.28, p.z));
  held.s.model.position.set(p.x, HOLD_Y, p.z);
  const over = overScanner(p);
  if (over && !held.over) scanHeld();
  held.over = over;
}
renderer.domElement.addEventListener("pointermove", moveHeld);
function release(e: PointerEvent) {
  if (!held || e.pointerId !== held.pointerId) return;
  const s = held.s;
  held = null;
  if (itemOf(s.uid).scanned) {
    s.place = "bag";
  } else {
    s.place = "belt";
    s.model.position.x = Math.min(s.model.position.x, FRONT_X);
    s.model.position.z = 0;
  }
}
renderer.domElement.addEventListener("pointerup", release);
renderer.domElement.addEventListener("pointercancel", release);

function doTurn() {
  if (!canAct()) return;
  let uid = held?.s.uid ?? selected;
  if (!uid || itemOf(uid).scanned) {
    // sonst die vorderste ungescannte Ware auf dem Band
    const front = shown
      .filter((s) => s.place === "belt" && !itemOf(s.uid).scanned)
      .sort((a, b) => b.model.position.x - a.model.position.x)[0];
    uid = front?.uid ?? null;
  }
  if (!uid) return;
  reg = turn(reg, uid);
  selected = uid;
  const s = shown.find((x) => x.uid === uid)!;
  s.yaw += Math.PI;
  if (held && held.s.uid === uid && held.over) scanHeld();
}

function doSum() {
  if (!canAct() || !canTotal(reg)) return;
  phase = "paying";
  payTimer = 1.6;
  store.terminalLight(true);
  toast(`Summe ${formatEuro(total(reg))} – Kunde zahlt mit Karte …`, 1.6);
}

$('[data-b="turn"]').addEventListener("click", () => doTurn());
sumBtn.addEventListener("click", () => doSum());
$('[data-b="end"]').addEventListener("click", () => showSummary());

window.addEventListener("keydown", (e) => {
  if (overlay) {
    if (e.code === "Escape" && screen === "summary") resume();
    return;
  }
  if (e.code === "KeyR" && !e.repeat) doTurn();
  if ((e.code === "Enter" || e.code === "NumpadEnter") && !e.repeat) doSum();
  if (e.code === "Escape") showSummary();
});
window.addEventListener("blur", () => setPaused(true));
document.addEventListener("visibilitychange", () => document.hidden && setPaused(true));

function panel(html: string) {
  closeOverlay();
  const el = document.createElement("div");
  el.className = "ka-panel";
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
    held = null;
    for (const s of shown) if (s.place === "held") s.place = itemOf(s.uid).scanned ? "bag" : "belt";
    panel(`<h2>Pause</h2><button class="ka-btn primary" type="button">Weiter kassieren</button>`)
      .querySelector("button")!
      .addEventListener("click", () => setPaused(false));
  } else if (!v) {
    paused = false;
    closeOverlay();
  }
}
function resume() {
  screen = "play";
  paused = false;
  closeOverlay();
}

function openMenu() {
  screen = "menu";
  const el = panel(`<div class="ka-brand">EDEKA</div><h2>Kassen-Held</h2>
    <p>Greif die Waren auf dem Band und zieh sie über den Scanner. Zeigt der Barcode weg, drück „Drehen“. Sind alle gescannt: „Summe“!</p>
    <button class="ka-btn primary" type="button">Kasse öffnen</button>
    <p><small>Maus/Finger: greifen und ziehen · R: Drehen · Enter: Summe · Esc: Feierabend</small></p>`);
  el.querySelector("button")!.addEventListener("click", () => {
    reg = openRegister((Date.now() & 0xffff) + 1);
    newCustomer();
    customerModel.position.x = -1.6;
    resume();
  });
}

function showSummary() {
  if (screen !== "play") return;
  screen = "summary";
  paused = false;
  held = null;
  for (const s of shown) if (s.place === "held") s.place = itemOf(s.uid).scanned ? "bag" : "belt";
  const st = reg.stats;
  const el = panel(`<h2>Feierabend!</h2>
    <dl class="ka-stats">
      <dt>Kunden</dt><dd data-s="customers">${st.customers}</dd>
      <dt>Waren</dt><dd data-s="items">${st.items}</dd>
      <dt>Umsatz</dt><dd data-s="revenue">${formatEuro(st.revenue)}</dd>
    </dl>
    <button class="ka-btn primary" type="button" data-a="resume">Weiter kassieren</button>
    <button class="ka-btn" type="button" data-a="new">Neue Schicht</button>`);
  el.querySelector('[data-a="resume"]')!.addEventListener("click", () => resume());
  el.querySelector('[data-a="new"]')!.addEventListener("click", () => openMenu());
}

// --- Darstellung -------------------------------------------------------
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  if (camera.aspect >= 1) {
    // Quer: von vorn, das ganze Band im Blick
    camera.userData.base = {
      pos: new THREE.Vector3(-0.25, 1.75, 0.95),
      look: new THREE.Vector3(-0.25, COUNTER_Y + 0.05, -0.6),
    };
    const hfov = 2 * Math.atan(1.45 / 1.3);
    camera.fov = Math.min(80, (2 * Math.atan(Math.tan(hfov / 2) / camera.aspect) * 180) / Math.PI);
  } else {
    // Hochkant: schräg von der Ablage aus am Band entlang
    camera.userData.base = {
      pos: new THREE.Vector3(0.75, 1.65, 0.85),
      look: new THREE.Vector3(-0.55, COUNTER_Y - 0.15, -0.3),
    };
    camera.fov = 72;
  }
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

function layoutBelt(dt: number) {
  const onBelt = shown
    .filter((s) => s.place === "belt")
    .sort((a, b) => b.model.position.x - a.model.position.x);
  let edge = FRONT_X + 0.02;
  for (const s of onBelt) {
    const target = edge - 0.02 - s.width / 2;
    const p = s.model.position;
    if (p.x < target) p.x = Math.min(target, p.x + BELT_SPEED * dt);
    else p.x += (target - p.x) * Math.min(1, dt * 6);
    p.y = COUNTER_Y;
    p.z += (0 - p.z) * Math.min(1, dt * 6);
    edge = Math.min(target, p.x) - s.width / 2 - 0.02;
  }
  // Nächste Ware vom Kunden aufs Band legen, sobald Platz ist
  const next = shown.find((s) => s.place === "waiting");
  if (next && edge > SPAWN_X + next.width / 2 + 0.02) {
    next.place = "belt";
    next.model.visible = true;
    next.model.position.set(SPAWN_X, COUNTER_Y, 0);
  }
  // Ablage
  shown
    .filter((s) => s.place === "bag")
    .forEach((s, i) => {
      const target = new THREE.Vector3(
        BAG.x0 + 0.12 + (i % 4) * 0.19,
        COUNTER_Y + 0.01,
        -0.2 + Math.floor(i / 4) * 0.17,
      );
      s.model.position.lerp(target, Math.min(1, dt * 8));
    });
}

function step(dt: number) {
  store.moveBelt(dt, BELT_SPEED);
  beltOffset += dt * BELT_SPEED;
  layoutBelt(dt);
  if (phase === "paying") {
    payTimer -= dt;
    for (const s of shown) if (s.place === "bag") s.model.position.z -= dt * 0.25;
    if (payTimer <= 0) {
      const paid = total(reg);
      reg = pay(reg);
      store.terminalLight(false);
      toast(`Bon gedruckt – Tschüss! (${formatEuro(paid)})`);
      newCustomer();
    }
  }
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (screen === "play" && !paused && !overlay) step(dt);
  if (now > flashUntil) store.flash(null);

  // Drehen animieren
  for (const s of shown) {
    const r = s.model.rotation;
    r.y += (s.yaw - r.y) * Math.min(1, dt * 10);
  }
  // Kunden laufen
  const cx = phase === "paying" ? -0.4 : -0.9;
  customerModel.position.x += (cx - customerModel.position.x) * Math.min(1, dt * 2);
  if (leavingModel) {
    leavingModel.position.x += dt * 1.5;
    if (leavingModel.position.x > 3) {
      scene.remove(leavingModel);
      leavingModel = null;
    }
  }

  // Kassenbildschirm
  if (reg.receipt.length !== lastReceipt) {
    lastReceipt = reg.receipt.length;
    drawScreen(
      store.screenCanvas,
      reg.receipt.map((id) => {
        const p = productById(id)!;
        return [p.name, formatEuro(p.price)];
      }),
      formatEuro(total(reg)),
      reg.customer,
    );
    store.screenTex.needsUpdate = true;
  }

  // HUD
  hud("customer").textContent = `Kunde ${reg.customer}`;
  hud("served").textContent = String(reg.stats.customers);
  hud("revenue").textContent = formatEuro(reg.stats.revenue);
  hud("total").textContent = formatEuro(total(reg));
  sumBtn.hidden = !(screen === "play" && phase === "scan" && canTotal(reg));
  if (now > toastUntil) toastEl.textContent = "";

  const base = camera.userData.base as { pos: THREE.Vector3; look: THREE.Vector3 };
  if (photo) {
    camera.position.copy(photo.from);
    camera.lookAt(photo.to);
  } else {
    camera.position.copy(base.pos);
    camera.lookAt(base.look);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

newCustomer();
customerModel.position.x = -0.9;
openMenu();
requestAnimationFrame(frame);

function project(v: THREE.Vector3): [number, number] {
  const p = v.clone().project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return [r.left + ((p.x + 1) / 2) * r.width, r.top + ((1 - p.y) / 2) * r.height];
}

if (debugEnabled) {
  window.__dampf = {
    state: () => ({
      screen: paused ? "paused" : screen,
      phase,
      customer: reg.customer,
      items: reg.items.map((i) => ({
        uid: i.uid,
        name: productById(i.productId)!.name,
        facing: i.facing,
        scanned: i.scanned,
        place: shown.find((s) => s.uid === i.uid)?.place,
      })),
      receipt: reg.receipt,
      total: total(reg),
      totalText: hud("total").textContent,
      canTotal: canTotal(reg),
      sumVisible: !sumBtn.hidden,
      stats: reg.stats,
      selected,
      beltOffset,
    }),
    screenPos: (uid) => {
      const s = shown.find((x) => x.uid === uid);
      if (!s || s.place === "waiting") return null;
      const h = (s.model.userData.size as number[])[1]!;
      return project(s.model.position.clone().add(new THREE.Vector3(0, h / 2, 0)));
    },
    scannerPos: () => project(new THREE.Vector3(SCANNER.x, HOLD_Y, SCANNER.z)),
    bagPos: () => project(new THREE.Vector3((BAG.x0 + BAG.x1) / 2, HOLD_Y, 0)),
    photo: (from, to) => {
      photo = { from: new THREE.Vector3(...from), to: new THREE.Vector3(...to) };
    },
  };
}
