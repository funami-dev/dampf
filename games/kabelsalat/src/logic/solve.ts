/**
 * Simulation (KS-AK-02/03): Knotenpotential-Verfahren (MNA) mit echten Werten.
 * Jeder Anschlusspunkt ist ein Knoten. Kabel und geschlossene Schalter sind sehr kleine
 * Widerstände, damit man auch ihren Strom (für die Lichtpunkte) kennt. Jeder Knoten hängt mit
 * einem winzigen Leitwert an Masse, so bleibt die Rechnung auch bei offenen Teilen lösbar.
 */
import { PARTS, type Circuit } from "./circuit.ts";

export const ELEC = {
  volt: 4.5,
  /** Innenwiderstand der Batterie (Ω) */
  inner: 0.5,
  /** Lämpchen (Ω): allein ≈ 0,29 A */
  lamp: 15,
  /** Kabel und geschlossene Schalter (Ω) */
  wire: 0.01,
  /** ab diesem Batteriestrom gilt es als Kurzschluss (A) */
  short: 3,
  /** Lämpchen: ab hier glimmt es, ab hier ist es hell (A) */
  dim: 0.05,
  bright: 0.2,
  gmin: 1e-9,
};

export type Level = "aus" | "schwach" | "hell";

export interface Result {
  /** Strom je Lämpchen (A, Betrag) und Helligkeit, nach Teil-Id */
  lamps: Record<number, { amps: number; level: Level }>;
  /** Strom je Batterie (A, aus + heraus) */
  batteries: Record<number, number>;
  /** Strom je Kabel (A, positiv = von a nach b) */
  wires: Record<number, number>;
  /** Spannung je Anschlusspunkt (V), Schlüssel "teil:punkt" */
  volts: Record<string, number>;
  short: boolean;
}

export const levelOf = (amps: number, short: boolean): Level =>
  short || amps < ELEC.dim ? "aus" : amps < ELEC.bright ? "schwach" : "hell";

/** lineares Gleichungssystem lösen (Gauß mit Spaltenpivot); null wenn singulär */
function gauss(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    if (Math.abs(A[p]![c]!) < 1e-18) return null;
    [A[c], A[p]] = [A[p]!, A[c]!];
    [b[c], b[p]] = [b[p]!, b[c]!];
    for (let r = c + 1; r < n; r++) {
      const f = A[r]![c]! / A[c]![c]!;
      if (!f) continue;
      for (let k = c; k < n; k++) A[r]![k]! -= f * A[c]![k]!;
      b[r]! -= f * b[c]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]!;
    for (let k = r + 1; k < n; k++) s -= A[r]![k]! * x[k]!;
    x[r] = s / A[r]![r]!;
  }
  return x.every(Number.isFinite) ? x : null;
}

export function solve(c: Circuit): Result {
  // Knoten: jeder Anschlusspunkt; dazu je Batterie ein innerer Knoten
  const node = new Map<string, number>();
  const key = (part: number, pin: number) => `${part}:${pin}`;
  for (const p of c.parts) PARTS[p.kind].pins.forEach((_, i) => node.set(key(p.id, i), node.size));
  const inner = new Map<number, number>();
  for (const p of c.parts) if (p.kind === "batterie") inner.set(p.id, node.size + inner.size);
  const nNodes = node.size + inner.size;
  const sources = c.parts.filter((p) => p.kind === "batterie");
  const n = nNodes + sources.length;
  const A = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const b = new Array<number>(n).fill(0);
  const G = (i: number, j: number, g: number) => {
    A[i]![i]! += g;
    A[j]![j]! += g;
    A[i]![j]! -= g;
    A[j]![i]! -= g;
  };
  for (let i = 0; i < nNodes; i++) A[i]![i]! += ELEC.gmin;
  const pinNode = (part: number, pin: number) => node.get(key(part, pin))!;
  for (const p of c.parts) {
    const a = () => pinNode(p.id, 0);
    switch (p.kind) {
      case "lampe":
        G(a(), pinNode(p.id, 1), 1 / ELEC.lamp);
        break;
      case "schalter":
        if (p.on) G(a(), pinNode(p.id, 1), 1 / ELEC.wire);
        break;
      case "umschalter":
        G(a(), pinNode(p.id, p.on ? 2 : 1), 1 / ELEC.wire);
        break;
      case "batterie":
        // + (Punkt 0) = innerer Knoten + V; innerer Knoten über Innenwiderstand an − (Punkt 1)
        G(inner.get(p.id)!, pinNode(p.id, 1), 1 / ELEC.inner);
        break;
    }
  }
  for (const w of c.wires) G(pinNode(w.a.part, w.a.pin), pinNode(w.b.part, w.b.pin), 1 / ELEC.wire);
  sources.forEach((p, k) => {
    const row = nNodes + k;
    const plus = pinNode(p.id, 0);
    const mid = inner.get(p.id)!;
    // Strom der Quelle fließt aus + heraus
    A[plus]![row]! += 1;
    A[mid]![row]! -= 1;
    A[row]![plus]! += 1;
    A[row]![mid]! -= 1;
    b[row] = ELEC.volt;
  });
  const x = n ? gauss(A, b) : [];
  const v = (part: number, pin: number) => (x ? x[pinNode(part, pin)]! : 0);
  const res: Result = { lamps: {}, batteries: {}, wires: {}, volts: {}, short: false };
  for (const p of c.parts)
    PARTS[p.kind].pins.forEach((_, i) => (res.volts[key(p.id, i)] = v(p.id, i)));
  sources.forEach((p, k) => {
    // Unbekannte der Quelle = Strom von + nach innen; aus + heraus ist das Gegenteil
    const amps = x ? -x[nNodes + k]! : 0;
    res.batteries[p.id] = amps;
    if (Math.abs(amps) > ELEC.short) res.short = true;
  });
  for (const w of c.wires)
    res.wires[w.id] = (v(w.a.part, w.a.pin) - v(w.b.part, w.b.pin)) / ELEC.wire;
  for (const p of c.parts)
    if (p.kind === "lampe") {
      const amps = Math.abs(v(p.id, 0) - v(p.id, 1)) / ELEC.lamp;
      res.lamps[p.id] = { amps, level: levelOf(amps, res.short) };
    }
  return res;
}
