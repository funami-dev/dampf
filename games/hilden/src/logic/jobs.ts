import type { City, Workplace } from "./city.ts";

export type JobId = Workplace["id"];
export const BADGE_STARS = 5;
export const USE_RADIUS = 4;
export const FIRE_HOLD = 1.5;

export const JOBS: readonly { id: JobId; name: string; badge: string }[] = [
  { id: "post", name: "Postbote", badge: "Meister-Postbote" },
  { id: "baker", name: "Bäcker", badge: "Meister-Bäcker" },
  { id: "police", name: "Polizei", badge: "Meister-Polizist" },
  { id: "fire", name: "Feuerwehr", badge: "Meister-Feuerwehr" },
];

export interface Step {
  kind: "use" | "bake" | "cat" | "fire";
  target: [number, number];
  label: string;
}

export interface Task {
  job: JobId;
  steps: Step[];
  index: number;
  done: boolean;
}

/** mulberry32: mischt auch kleine, aufeinanderfolgende Seeds gut durch. */
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LOST = ["Teddybär", "Schlüsselbund", "Rucksack", "Fahrradhelm", "Brieftasche", "Fußball"];

export function createTask(city: City, job: JobId, seed: number): Task {
  const rand = rng(seed);
  const pick = <T>(list: readonly T[], n: number): T[] => {
    const copy = [...list];
    const out: T[] = [];
    while (out.length < n && copy.length)
      out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]!);
    return out;
  };
  const door = (id: JobId) => city.workplace(id).door;
  let steps: Step[];
  switch (job) {
    case "post":
      steps = [
        { kind: "use", target: door("post"), label: "Briefe bei der Post abholen" },
        ...pick(city.doors, 3).map((t, i): Step => ({
          kind: "use",
          target: t,
          label: `Brief ${i + 1} von 3 einwerfen`,
        })),
      ];
      break;
    case "baker":
      steps = [
        { kind: "bake", target: door("baker"), label: "In der Bäckerei Brötchen backen" },
        ...pick(city.doors, 2).map((t, i): Step => ({
          kind: "use",
          target: t,
          label: `Brötchen ${i + 1} von 2 liefern`,
        })),
      ];
      break;
    case "police":
      steps = [
        ...pick(city.spots, 3).map((t, i): Step => ({
          kind: "use",
          target: t,
          label: `Fundsache ${i + 1} von 3 finden: ${LOST[Math.floor(rand() * LOST.length)]}`,
        })),
        { kind: "use", target: door("police"), label: "Fundsachen zur Polizeiwache bringen" },
      ];
      break;
    case "fire": {
      const cat = rand() < 0.5;
      steps = [
        { kind: "use", target: door("fire"), label: "Zur Feuerwache und ausrücken" },
        cat
          ? { kind: "cat", target: pick(city.spots, 1)[0]!, label: "Katze vom Baum holen" }
          : {
              kind: "fire",
              target: pick(city.spots, 1)[0]!,
              label: "Feuer löschen (Benutzen gedrückt halten)",
            },
      ];
      break;
    }
  }
  return { job, steps, index: 0, done: false };
}

export const currentStep = (t: Task): Step | null => (t.done ? null : (t.steps[t.index] ?? null));

/** „Benutzen“ an Position (x, z). Gibt die Aufgabe unverändert zurück, wenn nichts passiert. */
export function useAt(
  t: Task,
  x: number,
  z: number,
  opts: { baked?: boolean; heldSeconds?: number },
): Task {
  const s = currentStep(t);
  if (!s || Math.hypot(s.target[0] - x, s.target[1] - z) > USE_RADIUS) return t;
  if (s.kind === "bake" && !opts.baked) return t;
  if (s.kind === "fire" && (opts.heldSeconds ?? 0) < FIRE_HOLD) return t;
  const index = t.index + 1;
  return { ...t, index, done: index >= t.steps.length };
}
