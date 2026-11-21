/**
 * Tipps Schritt für Schritt (KS-AK-11): je Mission 3–6 Schritte, die sich selbst abhaken.
 * Verbindungen zählen über Kabel (auch über mehrere), egal wo die Teile liegen.
 */
import { PARTS, type Circuit, type Kind } from "./circuit.ts";
import type { Result } from "./solve.ts";

/** Anschluss nach Bauteil-Art; pin -1 = irgendein Punkt dieses Teils */
export interface PinOf {
  kind: Kind;
  pin: number;
}
export interface Step {
  text: string;
  /** was beim aktuellen Schritt sanft leuchtet */
  focus: { kinds?: Kind[]; pins?: PinOf[] };
  done: (c: Circuit, r: Result, solved: boolean) => boolean;
}

/** Punkte, die nur über Kabel zusammenhängen (ohne durch Bauteile zu gehen) */
function wireGroups(c: Circuit) {
  const parent = new Map<string, string>();
  const key = (p: number, i: number) => `${p}:${i}`;
  const find = (k: string): string => {
    const q = parent.get(k) ?? k;
    if (q === k) return k;
    const r = find(q);
    parent.set(k, r);
    return r;
  };
  for (const w of c.wires) parent.set(find(key(w.a.part, w.a.pin)), find(key(w.b.part, w.b.pin)));
  return (p: number, i: number) => find(key(p, i));
}
const pinsOf = (c: Circuit, at: PinOf) =>
  c.parts
    .filter((p) => p.kind === at.kind)
    .flatMap((p) =>
      PARTS[p.kind].pins
        .map((_, i) => ({ part: p.id, pin: i }))
        .filter((q) => at.pin < 0 || q.pin === at.pin),
    );

/** Gibt es ein Kabel(-netz) zwischen a und b (an verschiedenen Teilen)? */
export function linked(c: Circuit, a: PinOf, b: PinOf): boolean {
  const g = wireGroups(c);
  for (const x of pinsOf(c, a))
    for (const y of pinsOf(c, b))
      if (x.part !== y.part && g(x.part, x.pin) === g(y.part, y.pin)) return true;
  return false;
}
/** verbunden mit mindestens n verschiedenen Teilen der Art b */
function linkedToEach(c: Circuit, a: PinOf, kind: Kind, n: number): boolean {
  const g = wireGroups(c);
  const hit = new Set<number>();
  for (const x of pinsOf(c, a))
    for (const y of pinsOf(c, { kind, pin: -1 }))
      if (x.part !== y.part && g(x.part, x.pin) === g(y.part, y.pin)) hit.add(y.part);
  return hit.size >= n;
}
/** zwei verschiedene Teile derselben Art direkt miteinander verkabelt */
function linkedSameKind(c: Circuit, kind: Kind): boolean {
  const g = wireGroups(c);
  const ps = pinsOf(c, { kind, pin: -1 });
  return ps.some((x) => ps.some((y) => x.part !== y.part && g(x.part, x.pin) === g(y.part, y.pin)));
}
const has = (c: Circuit, kit: Partial<Record<Kind, number>>) =>
  (Object.entries(kit) as [Kind, number][]).every(
    ([k, n]) => c.parts.filter((p) => p.kind === k).length >= n,
  );
const levels = (c: Circuit, r: Result) =>
  c.parts.filter((p) => p.kind === "lampe").map((p) => r.lamps[p.id]?.level ?? "aus");

const PLUS: PinOf = { kind: "batterie", pin: 0 };
const MINUS: PinOf = { kind: "batterie", pin: 1 };
const LAMP: PinOf = { kind: "lampe", pin: -1 };
const SW: PinOf = { kind: "schalter", pin: -1 };
const RES: PinOf = { kind: "widerstand", pin: -1 };
const LED_A: PinOf = { kind: "led", pin: 0 };
const LED_K: PinOf = { kind: "led", pin: 1 };
const LED: PinOf = { kind: "led", pin: -1 };
const M_PLUS: PinOf = { kind: "messgeraet", pin: 0 };
const M_MINUS: PinOf = { kind: "messgeraet", pin: 1 };

const parts = (kit: Partial<Record<Kind, number>>, text: string): Step => ({
  text,
  focus: { kinds: Object.keys(kit) as Kind[] },
  done: (c) => has(c, kit),
});
const tryIt = (text: string): Step => ({
  text,
  focus: { kinds: ["schalter", "umschalter"] },
  done: (_c, _r, solved) => solved,
});

export const STEPS: Record<number, Step[]> = {
  1: [
    parts(
      { batterie: 1, lampe: 1 },
      "Zieh die Batterie und das Lämpchen aus der Kiste auf die Werkbank.",
    ),
    {
      text: "Zieh ein Kabel vom Pluspol (+, roter Punkt) der Batterie zu einem Punkt am Lämpchen. Aus dem Pluspol kommt der Strom heraus.",
      focus: { pins: [PLUS] },
      done: (c) => linked(c, PLUS, LAMP),
    },
    {
      text: "Zieh ein zweites Kabel vom anderen Punkt des Lämpchens zum Minuspol (−, blauer Punkt). Dort fließt der Strom zurück.",
      focus: { pins: [MINUS] },
      done: (c) => linked(c, MINUS, LAMP),
    },
    {
      text: "Das Lämpchen leuchtet: Der Stromkreis ist geschlossen – der Strom fließt im Kreis.",
      focus: { kinds: ["lampe"] },
      done: (c, r) => levels(c, r).some((l) => l !== "aus"),
    },
  ],
  2: [
    parts(
      { batterie: 1, lampe: 1, schalter: 1 },
      "Leg Batterie, Lämpchen und Schalter auf die Werkbank.",
    ),
    {
      text: "Kabel vom Pluspol (+) zum Lämpchen.",
      focus: { pins: [PLUS] },
      done: (c) => linked(c, PLUS, LAMP),
    },
    {
      text: "Kabel vom anderen Punkt des Lämpchens zum Schalter. Der Schalter wird so ein Teil des Kreises.",
      focus: { kinds: ["schalter"] },
      done: (c) => linked(c, LAMP, SW),
    },
    {
      text: "Kabel vom anderen Punkt des Schalters zurück zum Minuspol (−).",
      focus: { pins: [MINUS] },
      done: (c) => linked(c, SW, MINUS),
    },
    tryIt(
      "Wechsle zu ▶ Ausprobieren und tippe auf den Schalter: zu = Licht an, offen = Licht aus.",
    ),
  ],
  3: [
    parts({ batterie: 1, lampe: 2 }, "Leg die Batterie und beide Lämpchen auf die Werkbank."),
    {
      text: "Kabel vom Pluspol (+) zum ersten Lämpchen.",
      focus: { pins: [PLUS] },
      done: (c) => linked(c, PLUS, LAMP),
    },
    {
      text: "Kabel vom ersten Lämpchen zum zweiten – hintereinander, wie Perlen auf einer Kette.",
      focus: { kinds: ["lampe"] },
      done: (c) => linkedSameKind(c, "lampe"),
    },
    {
      text: "Kabel vom zweiten Lämpchen zurück zum Minuspol (−).",
      focus: { pins: [MINUS] },
      done: (c, r) => levels(c, r).length === 2 && levels(c, r).every((l) => l === "schwach"),
    },
    {
      text: "Beide leuchten schwächer: Sie teilen sich die 4,5 Volt der Batterie.",
      focus: { kinds: ["lampe"] },
      done: (_c, _r, solved) => solved,
    },
  ],
  4: [
    parts({ batterie: 1, lampe: 2 }, "Leg die Batterie und beide Lämpchen auf die Werkbank."),
    {
      text: "Vom Pluspol (+) je ein Kabel zu jedem Lämpchen. Jedes bekommt seinen eigenen Weg.",
      focus: { pins: [PLUS] },
      done: (c) => linkedToEach(c, PLUS, "lampe", 2),
    },
    {
      text: "Von beiden Lämpchen je ein Kabel zurück zum Minuspol (−).",
      focus: { pins: [MINUS] },
      done: (c) => linkedToEach(c, MINUS, "lampe", 2),
    },
    {
      text: "Beide leuchten hell: Nebeneinander bekommt jedes die vollen 4,5 Volt.",
      focus: { kinds: ["lampe"] },
      done: (_c, _r, solved) => solved,
    },
  ],
  5: [
    parts(
      { batterie: 1, lampe: 1, schalter: 2 },
      "Leg Batterie, Lämpchen und beide Schalter auf die Werkbank.",
    ),
    {
      text: "Kabel vom Pluspol (+) zum Lämpchen.",
      focus: { pins: [PLUS] },
      done: (c) => linked(c, PLUS, LAMP),
    },
    {
      text: "Kabel vom Lämpchen zum ersten Schalter.",
      focus: { kinds: ["schalter"] },
      done: (c) => linked(c, LAMP, SW),
    },
    {
      text: "Kabel vom ersten Schalter zum zweiten – hintereinander. Der Strom muss durch beide.",
      focus: { kinds: ["schalter"] },
      done: (c) => linkedSameKind(c, "schalter"),
    },
    {
      text: "Kabel vom zweiten Schalter zurück zum Minuspol (−).",
      focus: { pins: [MINUS] },
      done: (c) => linked(c, SW, MINUS),
    },
    tryIt("Probier aus: Nur wenn beide Schalter zu sind, leuchtet es (UND)."),
  ],
  6: [
    parts(
      { batterie: 1, lampe: 1, schalter: 2 },
      "Leg Batterie, Lämpchen und beide Schalter auf die Werkbank.",
    ),
    {
      text: "Kabel vom Pluspol (+) zum Lämpchen.",
      focus: { pins: [PLUS] },
      done: (c) => linked(c, PLUS, LAMP),
    },
    {
      text: "Vom anderen Punkt des Lämpchens je ein Kabel zu beiden Schaltern. So gibt es zwei Wege.",
      focus: { kinds: ["schalter"] },
      done: (c) => linkedToEach(c, LAMP, "schalter", 2),
    },
    {
      text: "Von beiden Schaltern je ein Kabel zum Minuspol (−).",
      focus: { pins: [MINUS] },
      done: (c) => linkedToEach(c, MINUS, "schalter", 2),
    },
    tryIt("Probier aus: Ein Schalter reicht schon (ODER)."),
  ],
  7: [
    parts(
      { batterie: 1, lampe: 1, umschalter: 2 },
      "Leg Batterie, Lämpchen und beide Umschalter auf die Werkbank.",
    ),
    {
      text: "Kabel vom Pluspol (+) zum Lämpchen.",
      focus: { pins: [PLUS] },
      done: (c) => linked(c, PLUS, LAMP),
    },
    {
      text: "Kabel vom Lämpchen zur Mitte (M) des ersten Umschalters.",
      focus: { pins: [{ kind: "umschalter", pin: 0 }] },
      done: (c) => linked(c, LAMP, { kind: "umschalter", pin: 0 }),
    },
    {
      text: "Verbinde A mit A und B mit B – das sind die zwei Leitungen im Treppenhaus.",
      focus: {
        pins: [
          { kind: "umschalter", pin: 1 },
          { kind: "umschalter", pin: 2 },
        ],
      },
      done: (c) => {
        const a = { kind: "umschalter" as const, pin: 1 };
        const b = { kind: "umschalter" as const, pin: 2 };
        return (linked(c, a, a) && linked(c, b, b)) || (linked(c, a, b) && linked(c, b, a));
      },
    },
    {
      text: "Kabel von der Mitte (M) des zweiten Umschalters zum Minuspol (−).",
      focus: { pins: [MINUS] },
      done: (c) => linked(c, { kind: "umschalter", pin: 0 }, MINUS),
    },
    tryIt("Probier aus: Jeder Umschalter kann das Licht an- und ausmachen."),
  ],
  8: [
    {
      text: "Schau auf die Batterie: Sie ist rot und heiß. Das heißt Kurzschluss – + und − sind direkt verbunden.",
      focus: { kinds: ["batterie"] },
      done: () => true,
    },
    {
      text: "Such das Kabel, das von + direkt nach − führt, ohne Lämpchen dazwischen. Tipp es an und dann auf 🗑 Weg.",
      focus: { pins: [PLUS, MINUS] },
      done: (_c, r) => !r.short,
    },
    tryIt("Jetzt fließt der Strom durchs Lämpchen. Probier den Schalter aus."),
  ],
  9: [
    parts(
      { batterie: 1, led: 1, widerstand: 1 },
      "Leg Batterie, LED und Widerstand auf die Werkbank.",
    ),
    {
      text: "Kabel vom Pluspol (+) zum Widerstand. Er bremst den Strom, bevor er zur LED kommt.",
      focus: { pins: [PLUS], kinds: ["widerstand"] },
      done: (c) => linked(c, PLUS, RES) || linked(c, PLUS, LED_A),
    },
    {
      text: "Kabel vom Widerstand zum A der LED. A ist das lange Bein und gehört zum Plus.",
      focus: { pins: [LED_A] },
      done: (c) => linked(c, RES, LED),
    },
    {
      text: "Kabel vom K der LED zurück zum Minuspol (−).",
      focus: { pins: [LED_K, MINUS] },
      done: (c) => linked(c, LED_K, MINUS) || linked(c, RES, MINUS),
    },
    {
      text: "Die LED leuchtet! Ohne Widerstand wäre zu viel Strom geflossen – Puff.",
      focus: { kinds: ["led"] },
      done: (_c, _r, solved) => solved,
    },
  ],
  10: [
    parts(
      { batterie: 1, lampe: 1, messgeraet: 1 },
      "Leg Batterie, Lämpchen und Messgerät auf die Werkbank.",
    ),
    {
      text: "Bau erst den Kreis: + zum Lämpchen und vom Lämpchen zurück zu −. Das Lämpchen leuchtet.",
      focus: { pins: [PLUS, MINUS] },
      done: (c, r) => levels(c, r).some((l) => l !== "aus"),
    },
    {
      text: "Kabel vom roten Punkt (+) des Messgeräts zu dem Punkt des Lämpchens, der zum Plus geht.",
      focus: { pins: [M_PLUS] },
      done: (c) => linked(c, M_PLUS, LAMP),
    },
    {
      text: "Kabel vom blauen Punkt (−) des Messgeräts zum anderen Punkt des Lämpchens.",
      focus: { pins: [M_MINUS] },
      done: (c) => linked(c, M_MINUS, LAMP),
    },
    {
      text: "Lies ab: So viel Volt liegen am Lämpchen an – fast die ganzen 4,5 V der Batterie.",
      focus: { kinds: ["messgeraet"] },
      done: (_c, _r, solved) => solved,
    },
  ],
  11: [
    parts(
      { batterie: 1, lampe: 1, messgeraet: 1 },
      "Leg Batterie, Lämpchen und Messgerät auf die Werkbank.",
    ),
    {
      text: "Kabel vom Pluspol (+) zum roten Punkt (+) des Messgeräts. Der Strom soll durchs Messgerät.",
      focus: { pins: [PLUS, M_PLUS] },
      done: (c) => linked(c, PLUS, M_PLUS),
    },
    {
      text: "Kabel vom blauen Punkt (−) des Messgeräts zum Lämpchen.",
      focus: { pins: [M_MINUS] },
      done: (c) => linked(c, M_MINUS, LAMP),
    },
    {
      text: "Kabel vom Lämpchen zurück zum Minuspol (−). Jetzt steckt das Messgerät in Reihe im Kreis.",
      focus: { pins: [MINUS] },
      done: (c) => linked(c, LAMP, MINUS),
    },
    {
      text: "Wechsle zu ▶ Ausprobieren und tippe auf das Messgerät, bis es mA zeigt.",
      focus: { kinds: ["messgeraet"] },
      done: (c, r) => c.parts.some((p) => p.kind === "messgeraet" && r.meters[p.id]?.mode === "mA"),
    },
  ],
};

/** Welche Schritte sind erledigt? */
export const stepsDone = (id: number, c: Circuit, r: Result, solved: boolean) =>
  (STEPS[id] ?? []).map((s) => s.done(c, r, solved));
