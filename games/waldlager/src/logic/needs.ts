/** Hunger, Müdigkeit, Fitness (WL-AK-03/04). 100 = gut, 0 = leer. */
export interface Needs {
  hunger: number;
  rest: number;
  fitness: number;
}

export const FULL: Needs = { hunger: 100, rest: 100, fitness: 100 };

export const RATES = {
  hungerPerSec: 100 / 720, // voll → leer in 12 Min.
  restPerSec: 100 / 960, // tagsüber 16 Min., nachts doppelt so schnell
  sleepPerSec: 100 / 40, // Schlafen im Zelt
  firePerSec: 100 / 180, // am Feuer sitzen (Müdigkeit)
  runPerSec: 100 / 30, // Rennen kostet Fitness (WL-AK-38: hält doppelt so lange wie früher)
  chopCost: 2.5, // pro Axthieb
  fitStand: 6,
  fitWalk: 2,
  fitFire: 12,
  berry: 12,
};

export interface NeedsCtx {
  night: boolean;
  running: boolean;
  moving: boolean;
  sleeping: boolean;
  atFire: boolean;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Schwäche (WL-AK-34): Tempo-Faktor; die stärkere Bremse zählt */
export function speedFactor(n: Needs): number {
  const fit = n.fitness < 10 ? 0.6 : n.fitness < 25 ? 0.8 : 1;
  const food = n.hunger <= 0 ? 0.6 : 1;
  return Math.min(fit, food);
}

/** Schwäche (WL-AK-34): Hunger unter 25 % → Fitness kostet doppelt, erholt sich halb so schnell */
export function fitnessFactor(n: Needs): { cost: number; recover: number } {
  return n.hunger < 25 ? { cost: 2, recover: 0.5 } : { cost: 1, recover: 1 };
}

export function stepNeeds(n: Needs, dt: number, c: NeedsCtx): Needs {
  let rest = n.rest;
  if (c.sleeping) rest += RATES.sleepPerSec * dt;
  else {
    rest -= RATES.restPerSec * (c.night ? 2 : 1) * dt;
    if (c.atFire && !c.moving) rest += RATES.firePerSec * dt;
  }
  let fitness = n.fitness;
  const f = fitnessFactor(n);
  if (c.running && c.moving) fitness -= RATES.runPerSec * f.cost * dt;
  else if (c.atFire && !c.moving) fitness += RATES.fitFire * f.recover * dt;
  else fitness += (c.moving ? RATES.fitWalk : RATES.fitStand) * f.recover * dt;
  return {
    hunger: clamp(n.hunger - RATES.hungerPerSec * dt),
    rest: clamp(rest),
    fitness: clamp(fitness),
  };
}

export const eatBerry = (n: Needs): Needs => ({ ...n, hunger: clamp(n.hunger + RATES.berry) });
/** Essen gibt Hunger zurück (WL-AK-42) */
export const eatFood = (n: Needs, amount: number): Needs => ({
  ...n,
  hunger: clamp(n.hunger + amount),
});
