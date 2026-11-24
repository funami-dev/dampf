/**
 * Missionen (KS-AK-04): Ziel prüfen, indem alle Schalterstellungen durchprobiert werden.
 */
import { KNOB, addPart, addWire, clone, type Circuit, type Kind } from "./circuit.ts";
import { solve, type Level, type Result } from "./solve.ts";

export interface Mission {
  id: number;
  title: string;
  /** kurze Erklärung (1–3 Sätze) */
  text: string;
  goal: string;
  /** Teilekiste: so viele Blöcke je Art */
  kit: Partial<Record<Kind, number>>;
  /** so wenige Kabel reichen (für den Extra-Stern) */
  minWires: number;
  /** vorgebaute Schaltung (Mission 8) */
  preset?: () => Circuit;
  /** Prüfung je Schalterstellung: Helligkeiten der Lämpchen → passt? */
  check: (lamps: Level[], switches: boolean[]) => boolean;
  /** zusätzliche Prüfung mit dem ganzen Ergebnis (LEDs, Messgerät; Missionen 9–11) */
  checkResult?: (c: Circuit, r: Result) => boolean;
}

const lit = (l: Level) => l !== "aus";
/** Summer brummt genau dann, wenn alle Taster gedrückt sind */
const buzzWhenPressed = (c: Circuit, r: Result) => {
  const pressed = c.parts.filter((p) => p.kind === "taster").every((p) => p.on);
  const buzz = c.parts.some((p) => p.kind === "summer" && r.buzzers[p.id]?.on);
  return buzz === pressed;
};
const allLit = (ls: Level[]) => ls.length > 0 && ls.every(lit);
const allOff = (ls: Level[]) => ls.every((l) => !lit(l));

function shortPreset(): Circuit {
  const c: Circuit = { parts: [], wires: [], next: 1 };
  const bat = addPart(c, "batterie", 200, 300)!;
  const lamp = addPart(c, "lampe", 400, 160)!;
  const sw = addPart(c, "schalter", 600, 300)!;
  addWire(c, { part: bat.id, pin: 0 }, { part: lamp.id, pin: 0 });
  addWire(c, { part: lamp.id, pin: 1 }, { part: sw.id, pin: 0 });
  addWire(c, { part: sw.id, pin: 1 }, { part: bat.id, pin: 1 });
  // der Fehler: ein Kabel direkt von + nach −
  addWire(c, { part: bat.id, pin: 0 }, { part: bat.id, pin: 1 });
  return c;
}

export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: "Licht an!",
    text: "Strom fließt nur im Kreis: von + aus der Batterie durch das Lämpchen und zurück zu −.",
    goal: "Bring das Lämpchen zum Leuchten.",
    kit: { batterie: 1, lampe: 1 },
    minWires: 2,
    check: (l) => allLit(l),
  },
  {
    id: 2,
    title: "Mit Schalter",
    text: "Ein Schalter ist eine Brücke im Stromkreis. Offen ist der Kreis unterbrochen.",
    goal: "Das Lämpchen geht mit dem Schalter an und aus.",
    kit: { batterie: 1, lampe: 1, schalter: 1 },
    minWires: 3,
    check: (l, s) => (s[0] ? allLit(l) : allOff(l)),
  },
  {
    id: 3,
    title: "Zwei hintereinander",
    text: "Hintereinander (in Reihe) muss der Strom durch beide Lämpchen. Sie teilen sich die Spannung.",
    goal: "Beide Lämpchen leuchten – hintereinander, also schwächer.",
    kit: { batterie: 1, lampe: 2 },
    minWires: 3,
    check: (l) => l.length === 2 && l.every((x) => x === "schwach"),
  },
  {
    id: 4,
    title: "Zwei nebeneinander",
    text: "Nebeneinander (parallel) hat jedes Lämpchen seinen eigenen Weg zur Batterie.",
    goal: "Beide Lämpchen leuchten hell.",
    kit: { batterie: 1, lampe: 2 },
    minWires: 4,
    check: (l) => l.length === 2 && l.every((x) => x === "hell"),
  },
  {
    id: 5,
    title: "Beide Schalter nötig",
    text: "Zwei Schalter hintereinander: Nur wenn beide zu sind, ist der Kreis geschlossen (UND).",
    goal: "Das Lämpchen leuchtet nur, wenn beide Schalter an sind.",
    kit: { batterie: 1, lampe: 1, schalter: 2 },
    minWires: 4,
    check: (l, s) => (s[0] && s[1] ? allLit(l) : allOff(l)),
  },
  {
    id: 6,
    title: "Ein Schalter reicht",
    text: "Zwei Schalter nebeneinander: Jeder ist ein eigener Weg. Einer genügt (ODER).",
    goal: "Das Lämpchen leuchtet, wenn mindestens ein Schalter an ist.",
    kit: { batterie: 1, lampe: 1, schalter: 2 },
    minWires: 5,
    check: (l, s) => (s[0] || s[1] ? allLit(l) : allOff(l)),
  },
  {
    id: 7,
    title: "Treppenhaus-Licht",
    text: "Ein Umschalter verbindet seine Mitte mit A oder mit B. Zwei davon: Licht von unten und von oben schalten.",
    goal: "Jeder der beiden Umschalter kann das Lämpchen an- und ausmachen.",
    kit: { batterie: 1, lampe: 1, umschalter: 2 },
    minWires: 4,
    check: (l, s) => {
      const same = s[0] === s[1];
      // an, wenn gleich – oder an, wenn verschieden; Hauptsache, jeder Schalter wechselt es
      return lit(l[0] ?? "aus") === same || lit(l[0] ?? "aus") === !same;
    },
  },
  {
    id: 8,
    title: "Kurzschluss-Detektiv",
    text: "Bei einem Kurzschluss nimmt der Strom den kürzesten Weg – am Lämpchen vorbei. Die Batterie wird heiß.",
    goal: "Finde den Fehler: Das Lämpchen soll mit dem Schalter an- und ausgehen.",
    kit: {},
    minWires: 3,
    preset: shortPreset,
    check: (l, s) => (s[0] ? allLit(l) : allOff(l)),
  },
  {
    id: 9,
    title: "LED mit Bremse",
    text: "Eine LED braucht einen Widerstand als Bremse, sonst macht sie Puff. Und sie leuchtet nur richtig herum: A zum Plus, K zum Minus.",
    goal: "Bring die LED zum Leuchten – ohne Puff.",
    kit: { batterie: 1, led: 1, widerstand: 1 },
    minWires: 3,
    check: () => true,
    checkResult: (c, r) => {
      const ls = c.parts.filter((p) => p.kind === "led").map((p) => r.leds[p.id]?.level ?? "aus");
      return ls.length > 0 && ls.every((l) => l === "hell" || l === "schwach");
    },
  },
  {
    id: 10,
    title: "Spannung messen",
    text: "Das Messgerät auf V (Volt) misst die Spannung zwischen seinen zwei Spitzen. Es kommt neben das Lämpchen – der Strom fließt weiter durchs Lämpchen.",
    goal: "Das Lämpchen leuchtet und das Messgerät zeigt seine Spannung in Volt.",
    kit: { batterie: 1, lampe: 1, messgeraet: 1 },
    minWires: 4,
    check: (l) => allLit(l),
    checkResult: (c, r) =>
      c.parts.some(
        (p) =>
          p.kind === "messgeraet" &&
          r.meters[p.id]?.mode === "V" &&
          Math.abs(r.meters[p.id]!.value) >= 3.5,
      ),
  },
  {
    id: 11,
    title: "Strom messen",
    text: "Auf mA misst das Messgerät den Strom, der hindurchfließt. Dafür muss es mitten im Kreis stecken – in Reihe, wie eine Perle auf der Kette.",
    goal: "Das Messgerät steht auf mA im Kreis und zeigt den Strom; das Lämpchen leuchtet.",
    kit: { batterie: 1, lampe: 1, messgeraet: 1 },
    minWires: 3,
    check: (l) => allLit(l),
    checkResult: (c, r) =>
      c.parts.some(
        (p) =>
          p.kind === "messgeraet" &&
          r.meters[p.id]?.mode === "mA" &&
          Math.abs(r.meters[p.id]!.value) >= 200,
      ),
  },
  {
    id: 12,
    title: "Türklingel",
    text: "Ein Taster verbindet nur, solange man ihn drückt – lässt man los, ist der Kreis wieder offen. So funktioniert eine Klingel.",
    goal: "Der Summer brummt nur, solange der Taster gedrückt ist.",
    kit: { batterie: 1, taster: 1, summer: 1 },
    minWires: 3,
    check: () => true,
    checkResult: buzzWhenPressed,
  },
  {
    id: 13,
    title: "Dimmer",
    text: "Ein Drehregler ist ein Widerstand, den man verstellen kann. Mehr Ohm heißt weniger Strom – das Lämpchen wird schwächer.",
    goal: "Mit dem Drehregler lässt sich das Lämpchen hell und schwach stellen.",
    kit: { batterie: 1, lampe: 1, drehregler: 1 },
    minWires: 3,
    check: () => true,
    checkResult: (c0) => {
      // alle Stufen durchdrehen und schauen, ob es hell und schwach gibt
      const c = clone(c0);
      const knobs = c.parts.filter((p) => p.kind === "drehregler");
      const lamps = c.parts.filter((p) => p.kind === "lampe");
      if (!knobs.length || !lamps.length) return false;
      const seen = new Set<Level>();
      for (let i = 0; i < KNOB.length; i++) {
        for (const k of knobs) k.val = i;
        const r = solve(c);
        if (r.short) continue;
        for (const l of lamps) seen.add(r.lamps[l.id]!.level);
      }
      return seen.has("hell") && seen.has("schwach");
    },
  },
  {
    id: 14,
    title: "Klingel mit Licht",
    text: "Hinter dem Taster teilt sich der Weg: ein Weg durch den Summer, einer durchs Lämpchen. Beide bekommen Strom, wenn man drückt.",
    goal: "Auf Knopfdruck brummt der Summer und das Lämpchen leuchtet; losgelassen ist beides aus.",
    kit: { batterie: 1, taster: 1, summer: 1, lampe: 1 },
    minWires: 5,
    check: (l, s) => (s.every(Boolean) ? allLit(l) : allOff(l)),
    checkResult: buzzWhenPressed,
  },
];

export interface Verdict {
  ok: boolean;
  short: boolean;
  /** Hinweis für das Kind, wenn es noch nicht passt */
  hint: string;
}

/** Alle Stellungen der Schalter/Umschalter durchprobieren (Reihenfolge wie in der Schaltung) */
export function checkMission(m: Mission, c0: Circuit): Verdict {
  const c = clone(c0);
  const lamps = c.parts.filter((p) => p.kind === "lampe");
  const sw = c.parts.filter(
    (p) => p.kind === "schalter" || p.kind === "umschalter" || p.kind === "taster",
  );
  const need = m.kit.lampe ?? (m.preset ? 1 : 0);
  if (lamps.length < need) return { ok: false, short: false, hint: "Es fehlt noch ein Lämpchen." };
  const kinds = Object.entries(m.kit) as [Kind, number][];
  for (const [k, n] of kinds)
    if (c.parts.filter((p) => p.kind === k).length < n)
      return { ok: false, short: false, hint: "Benutze alle Teile aus der Kiste." };
  let ok = true;
  // Mission 7: jeder Umschalter muss das Lämpchen umschalten können
  const toggles = m.id === 7;
  const states: Level[][] = [];
  for (let mask = 0; mask < 1 << sw.length; mask++) {
    sw.forEach((p, i) => (p.on = !!(mask & (1 << i))));
    const r = solve(c);
    if (r.short)
      return { ok: false, short: true, hint: "Kurzschluss! Der Strom geht am Lämpchen vorbei." };
    const ls = lamps.map((p) => r.lamps[p.id]!.level);
    states.push(ls);
    if (
      !m.check(
        ls,
        sw.map((p) => p.on),
      )
    )
      ok = false;
    if (m.checkResult && !m.checkResult(c, r)) ok = false;
    if (Object.values(r.leds).some((l) => l.level === "puff"))
      return {
        ok: false,
        short: false,
        hint: "Puff! Zu viel Strom – die LED braucht einen Widerstand als Bremse.",
      };
  }
  if (toggles && ok) {
    // jede einzelne Änderung eines Umschalters muss das Licht umschalten
    for (let mask = 0; mask < 1 << sw.length; mask++)
      for (let i = 0; i < sw.length; i++) {
        const a = states[mask]![0] !== "aus";
        const b = states[mask ^ (1 << i)]![0] !== "aus";
        if (a === b) ok = false;
      }
  }
  return ok
    ? { ok, short: false, hint: "Geschafft!" }
    : {
        ok,
        short: false,
        hint: "Noch nicht ganz – probier die Schalter aus und schau, was passiert.",
      };
}

/** Sterne: 1 fürs Schaffen, 1 extra mit wenigen Kabeln */
export const starsFor = (m: Mission, c: Circuit) => (c.wires.length <= m.minWires ? 2 : 1);
