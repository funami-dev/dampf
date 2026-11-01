/** Touch-/Maus-Steuerung (Joystick, Schubhebel, Buttons) und Tastatur. */
export interface Input {
  pitch: number;
  roll: number;
  throttle: number;
  brake: boolean;
}

export function createControls(layer: HTMLElement, onCamera: () => void) {
  const input: Input = { pitch: 0, roll: 0, throttle: 0, brake: false };
  const stickInput = { x: 0, y: 0 };
  const keys = new Set<string>();

  const root = document.createElement("div");
  root.className = "pp-controls";
  root.innerHTML = `
    <div class="pp-stick" role="slider" aria-label="Steuerknüppel"><div class="pp-knob"></div></div>
    <div class="pp-mid">
      <button class="pp-btn" type="button" data-b="camera">Kamera</button>
      <button class="pp-btn" type="button" data-b="brake">Bremse</button>
    </div>
    <div class="pp-throttle" role="slider" aria-label="Schubhebel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="pp-throttle-label">Schub</div>
      <div class="pp-throttle-fill"></div>
    </div>`;
  layer.append(root);

  // Joystick
  const stick = root.querySelector<HTMLElement>(".pp-stick")!;
  const knob = root.querySelector<HTMLElement>(".pp-knob")!;
  let stickId: number | null = null;
  const moveStick = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    const rad = r.width / 2;
    let dx = (e.clientX - (r.left + rad)) / rad;
    let dy = (e.clientY - (r.top + rad)) / rad;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    stickInput.x = dx;
    stickInput.y = dy;
    knob.style.transform = `translate(${dx * rad * 0.6}px, ${dy * rad * 0.6}px)`;
  };
  stick.addEventListener("pointerdown", (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  stick.addEventListener("pointermove", (e) => e.pointerId === stickId && moveStick(e));
  const releaseStick = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    stickInput.x = stickInput.y = 0;
    knob.style.transform = "";
  };
  stick.addEventListener("pointerup", releaseStick);
  stick.addEventListener("pointercancel", releaseStick);

  // Schubhebel
  const thr = root.querySelector<HTMLElement>(".pp-throttle")!;
  const fill = root.querySelector<HTMLElement>(".pp-throttle-fill")!;
  let thrId: number | null = null;
  const setThrottle = (v: number) => {
    input.throttle = Math.max(0, Math.min(1, v));
    fill.style.height = `calc(${input.throttle * 100}% - ${input.throttle * 12}px)`;
    thr.setAttribute("aria-valuenow", String(Math.round(input.throttle * 100)));
  };
  const moveThr = (e: PointerEvent) => {
    const r = thr.getBoundingClientRect();
    setThrottle(1 - (e.clientY - r.top - 6) / (r.height - 12));
  };
  thr.addEventListener("pointerdown", (e) => {
    thrId = e.pointerId;
    thr.setPointerCapture(e.pointerId);
    moveThr(e);
  });
  thr.addEventListener("pointermove", (e) => e.pointerId === thrId && moveThr(e));
  thr.addEventListener("pointerup", () => (thrId = null));
  thr.addEventListener("pointercancel", () => (thrId = null));

  // Buttons
  const brake = root.querySelector<HTMLElement>('[data-b="brake"]')!;
  let brakeHeld = false;
  brake.addEventListener("pointerdown", () => (brakeHeld = true));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"])
    brake.addEventListener(ev, () => (brakeHeld = false));
  root.querySelector('[data-b="camera"]')!.addEventListener("click", onCamera);

  // Tastatur
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    keys.add(e.code);
    if (e.code === "KeyC") onCamera();
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Space"].includes(
        e.code,
      )
    )
      e.preventDefault();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  const k = (...codes: string[]) => codes.some((c) => keys.has(c));
  return {
    input,
    setThrottle,
    /** pro Frame aufrufen: Tastatur + Joystick zu Steuereingaben zusammenführen */
    update(dt: number) {
      const kbPitch = (k("ArrowDown", "KeyS") ? 1 : 0) - (k("ArrowUp", "KeyW") ? 1 : 0);
      const kbRoll = (k("ArrowRight", "KeyD") ? 1 : 0) - (k("ArrowLeft", "KeyA") ? 1 : 0);
      // Nase hoch = Joystick nach unten ziehen
      input.pitch = Math.max(-1, Math.min(1, kbPitch + stickInput.y));
      input.roll = Math.max(-1, Math.min(1, kbRoll + stickInput.x));
      const up = k("PageUp", "Equal", "NumpadAdd", "BracketRight");
      const down = k("PageDown", "Minus", "NumpadSubtract", "Slash");
      if (up || down) setThrottle(input.throttle + (up ? 0.5 : -0.5) * dt);
      input.brake = brakeHeld || k("KeyB");
    },
    show(v: boolean) {
      root.style.display = v ? "" : "none";
    },
    reset() {
      setThrottle(0);
      stickInput.x = stickInput.y = 0;
      knob.style.transform = "";
    },
  };
}
