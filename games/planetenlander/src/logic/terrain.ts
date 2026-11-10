/** Festes Höhenprofil je Ort mit flacher Landeplattform (Spec: Spielablauf 3) */
export const WIDTH = 600; // m
export const STEP_X = 5; // m zwischen Stützpunkten
export const PAD = { width: 30, center: 420 };

export interface Terrain {
  /** Bodenhöhe in m an x = i · STEP_X */
  heights: number[];
  pad: { x0: number; x1: number; center: number; y: number };
}

/** kleiner, deterministischer Zufall (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedOf = (id: string) =>
  [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

export function makeTerrain(id: string, craters: boolean): Terrain {
  const r = rng(seedOf(id));
  const n = WIDTH / STEP_X + 1;
  const heights: number[] = [];
  // sanfte Hügel aus einigen Sinuswellen
  const waves = Array.from({ length: 4 }, (_, k) => ({
    amp: (6 + r() * 14) / (k + 1),
    len: 60 + r() * 180,
    ph: r() * Math.PI * 2,
  }));
  for (let i = 0; i < n; i++) {
    const x = i * STEP_X;
    let h = 30;
    for (const w of waves) h += w.amp * Math.sin((x / w.len) * Math.PI * 2 + w.ph);
    h += (r() - 0.5) * 4;
    heights.push(h);
  }
  // Krater auf Orten ohne Luft
  if (craters)
    for (let k = 0; k < 4; k++) {
      const cx = r() * WIDTH;
      const rad = 12 + r() * 20;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(i * STEP_X - cx) / rad;
        if (d < 1) heights[i]! -= (1 - d * d) * rad * 0.35;
        else if (d < 1.3) heights[i]! += (1.3 - d) * rad * 0.15;
      }
    }
  // Plattform: flach auf mittlerer Höhe
  const x0 = PAD.center - PAD.width / 2;
  const x1 = PAD.center + PAD.width / 2;
  const i0 = Math.floor(x0 / STEP_X);
  const i1 = Math.ceil(x1 / STEP_X);
  let sum = 0;
  for (let i = i0; i <= i1; i++) sum += heights[i]!;
  const y = Math.round(sum / (i1 - i0 + 1));
  for (let i = i0 - 1; i <= i1 + 1; i++) heights[i] = y;
  for (let i = 0; i < n; i++) heights[i] = Math.max(2, heights[i]!);
  return { heights, pad: { x0, x1, center: PAD.center, y } };
}

/** Bodenhöhe an Stelle x (lineare Interpolation) */
export function groundAt(t: Terrain, x: number): number {
  const f = Math.max(0, Math.min(t.heights.length - 1, x / STEP_X));
  const i = Math.floor(f);
  const a = t.heights[i]!;
  const b = t.heights[Math.min(t.heights.length - 1, i + 1)]!;
  return a + (b - a) * (f - i);
}
