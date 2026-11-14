/**
 * Kabelsalat – Schaltung aus Blöcken und Kabeln (Spec: specs/games/kabelsalat.md, KS-AK-01).
 * Reines TypeScript ohne Phaser/DOM, damit alles mit Vitest prüfbar ist.
 */

export type Kind = "batterie" | "lampe" | "schalter" | "umschalter";

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
  /** Schalter: zu (true) / offen; Umschalter: Mitte mit B (true) oder A (false) */
  on: boolean;
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
  if (!p || (p.kind !== "schalter" && p.kind !== "umschalter")) return false;
  p.on = !p.on;
  return true;
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
    parts: parts.map((p) => ({ ...p, rot: ((p.rot % 4) + 4) % 4, on: p.on === true })),
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
