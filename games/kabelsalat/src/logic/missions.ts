/**
 * Missionen (KS-AK-04): Ziel prüfen, indem alle Schalterstellungen durchprobiert werden.
 */
import { addPart, addWire, clone, type Circuit, type Kind } from "./circuit.ts";
import { solve, type Level } from "./solve.ts";

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
}

const lit = (l: Level) => l !== "aus";
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
  const sw = c.parts.filter((p) => p.kind === "schalter" || p.kind === "umschalter");
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
