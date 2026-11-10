import { FEET, KNOTS, type FlightState } from "../logic/flight.ts";
import { AIRPORTS, BOUNDS, LANDMARKS, RIVER } from "../logic/world.ts";
import { ZOOM, toLatLon } from "../logic/geo.ts";
import { TileCache, drawTiles } from "./osmmap.ts";

const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";
const osmLink = (cls: string) =>
  `<a class="${cls}" href="${OSM_COPYRIGHT}" target="_blank" rel="noopener">© OpenStreetMap-Mitwirkende</a>`;

export function createHud(
  layer: HTMLElement,
  onMenu: () => void,
  bigMap: { onOpen: () => void; onClose: () => void } = { onOpen() {}, onClose() {} },
) {
  const hud = document.createElement("div");
  hud.className = "pp-hud";
  hud.innerHTML = `
    <div class="pp-gauges" aria-live="off">
      <div class="pp-gauge"><b data-g="spd">0</b><small>Knoten</small></div>
      <div class="pp-gauge"><b data-g="alt">0</b><small>Fuß</small></div>
      <div class="pp-gauge"><b data-g="hdg">0°</b><small>Kurs</small></div>
      <div class="pp-gauge"><b data-g="thr">0 %</b><small>Schub</small></div>
      <div class="pp-gauge"><b data-g="vs">0</b><small>Fuß/min</small></div>
    </div>`;
  const menu = document.createElement("button");
  menu.className = "pp-btn";
  menu.type = "button";
  menu.textContent = "Menü";
  menu.addEventListener("click", onMenu);
  hud.append(menu);
  const map = document.createElement("canvas");
  map.className = "pp-map";
  map.width = 84 * 2;
  map.height = 140 * 2;
  map.setAttribute("aria-label", "Karte");
  map.setAttribute("role", "button");
  map.tabIndex = 0;
  // Namensnennung OpenStreetMap (Spec: Live-Karte)
  const credit = document.createElement("div");
  credit.className = "pp-osm-credit";
  credit.innerHTML = osmLink("pp-osm");
  const notice = document.createElement("div");
  notice.className = "pp-notice";
  notice.setAttribute("role", "status");
  // große Karte (PP-AK-16)
  const big = document.createElement("div");
  big.className = "pp-bigmap";
  big.setAttribute("role", "dialog");
  big.setAttribute("aria-label", "Große Karte");
  big.style.display = "none";
  big.innerHTML = `<canvas></canvas>
    <div class="pp-bigmap-bar">
      <button class="pp-btn" type="button" data-z="+" aria-label="Näher heran">+</button>
      <button class="pp-btn" type="button" data-z="-" aria-label="Weiter weg">−</button>
      <button class="pp-btn pp-go" type="button" data-z="x">Schließen</button>
    </div>
    ${osmLink("pp-osm pp-osm-big")}`;
  layer.append(hud, map, credit, notice, big);
  const bigCanvas = big.querySelector("canvas")!;
  const bigCtx = bigCanvas.getContext("2d")!;
  let bigZoom: number = ZOOM.big;
  let bigOpen = false;
  let last: FlightState | null = null;
  const smallCache = new TileCache();
  const bigCache = new TileCache();
  let smallMode: "tiles" | "drawn" = "drawn";
  smallCache.onLoad = () => last && drawMap(last);
  bigCache.onLoad = () => bigOpen && drawBig();
  const openBig = () => {
    bigOpen = true;
    big.style.display = "";
    bigMap.onOpen();
    drawBig();
  };
  const closeBig = () => {
    bigOpen = false;
    big.style.display = "none";
    bigMap.onClose();
  };
  map.addEventListener("click", openBig);
  map.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openBig();
    }
  });
  big.querySelectorAll<HTMLButtonElement>("[data-z]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.z === "x") return closeBig();
      bigZoom = Math.max(ZOOM.min, Math.min(ZOOM.max, bigZoom + (b.dataset.z === "+" ? 1 : -1)));
      drawBig();
    }),
  );

  const g = (k: string) => hud.querySelector<HTMLElement>(`[data-g="${k}"]`)!;
  const ctx = map.getContext("2d")!;
  const mx = (x: number) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * map.width;
  const mz = (z: number) => (1 - (z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * map.height;

  /** Flugzeug-Pfeil an (px, py) */
  function arrow(c: CanvasRenderingContext2D, px: number, py: number, heading: number, k = 1) {
    c.save();
    c.translate(px, py);
    c.rotate((heading * Math.PI) / 180);
    c.scale(k, k);
    c.fillStyle = "#ff3b30";
    c.strokeStyle = "#fff";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -12);
    c.lineTo(8, 9);
    c.lineTo(0, 4);
    c.lineTo(-8, 9);
    c.closePath();
    c.stroke();
    c.fill();
    c.restore();
  }

  function drawBig() {
    if (!last) return;
    const r = bigCanvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (bigCanvas.width !== w || bigCanvas.height !== h) {
      bigCanvas.width = w;
      bigCanvas.height = h;
    }
    bigCtx.fillStyle = "#cfd8c4";
    bigCtx.fillRect(0, 0, w, h);
    const { lat, lon } = toLatLon(last.x, last.z);
    drawTiles(bigCtx, bigCache, lat, lon, bigZoom, 256 * (dpr / 1.5));
    arrow(bigCtx, w / 2, h / 2, last.heading, dpr);
  }

  function drawMap(s: FlightState) {
    last = s;
    ctx.clearRect(0, 0, map.width, map.height);
    // echte Karte, wenn alle Kacheln da sind; sonst (lädt noch / offline) die gezeichnete Karte
    const { lat, lon } = toLatLon(s.x, s.z);
    ctx.fillStyle = "#cfd8c4";
    ctx.fillRect(0, 0, map.width, map.height);
    if (drawTiles(ctx, smallCache, lat, lon, ZOOM.small)) {
      smallMode = "tiles";
      arrow(ctx, map.width / 2, map.height / 2, s.heading, 1.4);
      return;
    }
    smallMode = "drawn";
    ctx.clearRect(0, 0, map.width, map.height);
    ctx.strokeStyle = "#5aa0e0";
    ctx.lineWidth = 5;
    ctx.beginPath();
    RIVER.forEach(([x, z], i) => (i ? ctx.lineTo(mx(x), mz(z)) : ctx.moveTo(mx(x), mz(z))));
    ctx.stroke();
    ctx.fillStyle = "#ddd";
    for (const a of AIRPORTS) ctx.fillRect(mx(a.x) - 6, mz(a.z) - 6, 12, 12);
    ctx.fillStyle = "#ffcc00";
    for (const l of LANDMARKS) {
      ctx.beginPath();
      ctx.arc(mx(l.x), mz(l.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Flugzeug als Pfeil
    ctx.save();
    ctx.translate(mx(s.x), mz(s.z));
    ctx.rotate((s.heading * Math.PI) / 180);
    ctx.fillStyle = "#ff3b30";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let frame = 0;
  return {
    update(s: FlightState, paused: boolean) {
      g("spd").textContent = String(Math.round(s.speed * KNOTS));
      g("alt").textContent = String(Math.round(s.y * FEET));
      g("hdg").textContent = `${String(Math.round(s.heading) % 360).padStart(3, "0")}°`;
      g("thr").textContent = `${Math.round(s.throttle * 100)} %`;
      g("vs").textContent = String(Math.round((s.vs * FEET * 60) / 10) * 10);
      notice.textContent = paused ? "" : (s.notice ?? "");
      if (frame++ % 6 === 0) drawMap(s);
    },
    show(v: boolean) {
      for (const e of [hud, map, credit, notice]) e.style.display = v ? "" : "none";
      if (!v && bigOpen) closeBig();
    },
    mapState: () => ({
      mode: smallMode,
      loaded: smallCache.loaded + bigCache.loaded,
      failed: smallCache.failed + bigCache.failed,
      maxLoading: Math.max(smallCache.maxLoading, bigCache.maxLoading),
      bigOpen,
      bigZoom,
    }),
  };
}
