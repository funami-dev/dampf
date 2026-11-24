/**
 * Kabelsalat – Schaltung aus Blöcken und Kabeln (Spec: specs/games/kabelsalat.md, KS-AK-01).
 * Reines TypeScript ohne Phaser/DOM, damit alles mit Vitest prüfbar ist.
 */

export type Kind =
  | "batterie"
  | "lampe"
  | "schalter"
  | "umschalter"
  | "led"
  | "widerstand"
  | "messgeraet"
  | "taster"
  | "drehregler"
  | "summer";

/** Drehregler: Stufen in Ω (KS-AK-17) */
export const KNOB = [0, 10, 25, 60, 150];

/** Widerstandswerte (Ω) zum Durchschalten; Start 220 Ω (KS-AK-13) */
export const RESISTORS = [100, 220, 470, 1000];
export const DEFAULT_RESISTOR = 1;

/** Blockgröße und Raster in Werkbank-Einheiten */
export const BLOCK = 80;
export const GRID = 20;
export const LIMITS = { parts: 20, wires: 40 };

export interface PartInfo {
  name: string;
  /** Lage der Anschlusspunkte relativ zur Blockmitte (ungedreht) und ihre Beschriftung */
  pins: { x: number; y: number; label: string }[];
}

const H = BLOCK / 2;
export const PARTS: Record<Kind, PartInfo> = {
  batterie: {
    name: "Batterie",
    pins: [
      { x: H, y: 0, label: "+" },
      { x: -H, y: 0, label: "−" },
    ],
  },
  lampe: {
    name: "Lämpchen",
    pins: [
      { x: -H, y: 0, label: "" },
      { x: H, y: 0, label: "" },
    ],
  },
  schalter: {
    name: "Schalter",
    pins: [
      { x: -H, y: 0, label: "" },
      { x: H, y: 0, label: "" },
    ],
  },
  umschalter: {
    name: "Umschalter",
    pins: [
      { x: -H, y: 0, label: "M" },
      { x: H, y: -H / 2, label: "A" },
      { x: H, y: H / 2, label: "B" },
    ],
  },
  led: {
    name: "LED",
    pins: [
      { x: -H, y: 0, label: "A" },
      { x: H, y: 0, label: "K" },
    ],
  },
  widerstand: {
    name: "Widerstand",
    pins: [
      { x: -H, y: 0, label: "" },
      { x: H, y: 0, label: "" },
    ],
  },
  messgeraet: {
    name: "Messgerät",
    pins: [
      { x: -H, y: H / 2, label: "+" },
      { x: H, y: H / 2, label: "−" },
    ],
  },
  taster: {
    name: "Taster",
    pins: [
      { x: -H, y: 0, label: "" },
      { x: H, y: 0, label: "" },
    ],
  },
  drehregler: {
    name: "Drehregler",
    pins: [
      { x: -H, y: H / 2, label: "" },
      { x: H, y: H / 2, label: "" },
    ],
  },
  summer: {
    name: "Summer",
    pins: [
      { x: -H, y: 0, label: "" },
      { x: H, y: 0, label: "" },
    ],
  },
};
export const KINDS = Object.keys(PARTS) as Kind[];

export interface Part {
  id: number;
  kind: Kind;
  /** Mitte in Werkbank-Einheiten */
  x: number;
  y: number;
  /** Drehung in Vierteln (0..3, im Uhrzeigersinn) */
  rot: number;
  /** Schalter: zu (true) / offen; Umschalter: Mitte mit B (true) oder A (false);
   * Messgerät: mA (true) oder V (false) */
  on: boolean;
  /** Widerstand: Index in RESISTORS; Drehregler: Stufe in KNOB */
  val?: number;
}

export interface PinRef {
  part: number;
  pin: number;
}

export interface Wire {
  id: number;
  a: PinRef;
  b: PinRef;
}

export interface Circuit {
  parts: Part[];
  wires: Wire[];
  next: number;
}

export const emptyCircuit = (): Circuit => ({ parts: [], wires: [], next: 1 });

export const snap = (v: number) => Math.round(v / GRID) * GRID;

/** Anschlusspunkt in Werkbank-Koordinaten (mit Drehung) */
export function pinPos(p: Part, pin: number): { x: number; y: number } {
  const d = PARTS[p.kind].pins[pin]!;
  let { x, y } = d;
  for (let k = 0; k < ((p.rot % 4) + 4) % 4; k++) [x, y] = [-y, x];
  return { x: p.x + x, y: p.y + y };
}

export function addPart(c: Circuit, kind: Kind, x: number, y: number): Part | null {
  if (c.parts.length >= LIMITS.parts) return null;
  const p: Part = { id: c.next++, kind, x: snap(x), y: snap(y), rot: 0, on: false };
  if (kind === "widerstand") p.val = DEFAULT_RESISTOR;
  if (kind === "drehregler") p.val = 0;
  c.parts.push(p);
  return p;
}

export const samePin = (a: PinRef, b: PinRef) => a.part === b.part && a.pin === b.pin;

/** Kabel zwischen zwei Punkten; abgelehnt: zu sich selbst, doppelt, unbekannt, zu viele */
export function addWire(c: Circuit, a: PinRef, b: PinRef): Wire | null {
  if (samePin(a, b)) return null;
  const ok = (r: PinRef) => {
    const p = c.parts.find((q) => q.id === r.part);
    return !!p && r.pin >= 0 && r.pin < PARTS[p.kind].pins.length;
  };
  if (!ok(a) || !ok(b)) return null;
  if (c.wires.length >= LIMITS.wires) return null;
  if (
    c.wires.some(
      (w) => (samePin(w.a, a) && samePin(w.b, b)) || (samePin(w.a, b) && samePin(w.b, a)),
    )
  )
    return null;
  const w: Wire = { id: c.next++, a: { ...a }, b: { ...b } };
  c.wires.push(w);
  return w;
}

export function removePart(c: Circuit, id: number) {
  c.parts = c.parts.filter((p) => p.id !== id);
  c.wires = c.wires.filter((w) => w.a.part !== id && w.b.part !== id);
}
export function removeWire(c: Circuit, id: number) {
  c.wires = c.wires.filter((w) => w.id !== id);
}
export function rotatePart(c: Circuit, id: number) {
  const p = c.parts.find((q) => q.id === id);
  if (p) p.rot = (p.rot + 1) % 4;
}
export function movePart(c: Circuit, id: number, x: number, y: number) {
  const p = c.parts.find((q) => q.id === id);
  if (p) {
    p.x = snap(x);
    p.y = snap(y);
  }
}
/** Schalter/Umschalter umlegen */
export function toggle(c: Circuit, id: number): boolean {
  const p = c.parts.find((q) => q.id === id);
  if (!p || !TOGGLES.includes(p.kind)) return false;
  p.on = !p.on;
  return true;
}
/** Teile, die man im Modus Ausprobieren antippen kann */
export const TOGGLES: Kind[] = ["schalter", "umschalter", "messgeraet"];

/** Taster drücken (true) oder loslassen (false) */
export function press(c: Circuit, id: number, down: boolean): boolean {
  const p = c.parts.find((q) => q.id === id);
  if (!p || p.kind !== "taster" || p.on === down) return false;
  p.on = down;
  return true;
}
/** Drehregler eine Stufe weiter drehen; gibt den neuen Wert (Ω) zurück */
export function turnKnob(c: Circuit, id: number): number | null {
  const p = c.parts.find((q) => q.id === id);
  if (!p || p.kind !== "drehregler") return null;
  p.val = ((p.val ?? 0) + 1) % KNOB.length;
  return KNOB[p.val]!;
}
export const knobOhms = (p: Part) => KNOB[p.val ?? 0] ?? 0;

/** Ohm-Wert eines Widerstands */
export const ohms = (p: Part) => RESISTORS[p.val ?? DEFAULT_RESISTOR] ?? 220;
/** Widerstandswert reihum wechseln; gibt den neuen Wert (Ω) zurück */
export function cycleValue(c: Circuit, id: number): number | null {
  const p = c.parts.find((q) => q.id === id);
  if (!p || p.kind !== "widerstand") return null;
  p.val = ((p.val ?? DEFAULT_RESISTOR) + 1) % RESISTORS.length;
  return ohms(p);
}

/** Zahl der Kabel an einem Punkt */
export const wiresAt = (c: Circuit, r: PinRef) =>
  c.wires.filter((w) => samePin(w.a, r) || samePin(w.b, r)).length;

export const clone = (c: Circuit): Circuit => JSON.parse(JSON.stringify(c)) as Circuit;

/** Gültige Schaltung aus unbekannten Daten (Speichern/Laden) oder null */
export function parseCircuit(d: unknown): Circuit | null {
  const o = d as Circuit;
  if (!o || !Array.isArray(o.parts) || !Array.isArray(o.wires)) return null;
  const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  const parts = o.parts.filter(
    (p) =>
      p && num(p.id) && (KINDS as string[]).includes(p.kind) && num(p.x) && num(p.y) && num(p.rot),
  );
  if (parts.length !== o.parts.length || parts.length > LIMITS.parts) return null;
  const c: Circuit = {
    parts: parts.map((p) => {
      // Taster sind nach dem Laden immer losgelassen
      const q: Part = {
        ...p,
        rot: ((p.rot % 4) + 4) % 4,
        on: p.kind !== "taster" && p.on === true,
      };
      delete q.val;
      if (p.kind === "drehregler")
        q.val =
          typeof p.val === "number" && Number.isInteger(p.val) && p.val >= 0 && p.val < KNOB.length
            ? p.val
            : 0;
      if (p.kind === "widerstand")
        q.val =
          typeof p.val === "number" &&
          Number.isInteger(p.val) &&
          p.val >= 0 &&
          p.val < RESISTORS.length
            ? p.val
            : DEFAULT_RESISTOR;
      return q;
    }),
    wires: [],
    next: Math.max(1, ...parts.map((p) => p.id + 1)),
  };
  for (const w of o.wires) {
    if (!w || !num(w.id)) return null;
    const nw = addWire(c, w.a, w.b);
    if (!nw) return null;
    nw.id = w.id;
  }
  c.next = Math.max(c.next, num(o.next) ? o.next : 1, ...c.wires.map((w) => w.id + 1));
  return c;
}
