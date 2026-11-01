import { FEET, KNOTS, type FlightState } from "../logic/flight.ts";
import { AIRPORTS, BOUNDS, LANDMARKS, RIVER } from "../logic/world.ts";

export function createHud(layer: HTMLElement, onMenu: () => void) {
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
  const notice = document.createElement("div");
  notice.className = "pp-notice";
  notice.setAttribute("role", "status");
  layer.append(hud, map, notice);

  const g = (k: string) => hud.querySelector<HTMLElement>(`[data-g="${k}"]`)!;
  const ctx = map.getContext("2d")!;
  const mx = (x: number) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * map.width;
  const mz = (z: number) => (1 - (z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * map.height;

  function drawMap(s: FlightState) {
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
      for (const e of [hud, map, notice]) e.style.display = v ? "" : "none";
    },
  };
}
