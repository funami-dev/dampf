/** Bäcker-Mini-Spiel: Nadel pendelt, im grünen Bereich aus dem Ofen holen (HI-AK-08). */
export const BAKE_ZONE: readonly [number, number] = [0.62, 0.8];
const SPEED = 2.2;

export const needle = (t: number) => 0.5 - 0.5 * Math.cos(t * SPEED);
export const bakeResult = (v: number) => v >= BAKE_ZONE[0] && v <= BAKE_ZONE[1];
