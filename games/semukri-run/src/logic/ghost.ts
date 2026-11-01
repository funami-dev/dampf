import { SAMPLE_INTERVAL } from "./race.ts";

/** Position des Geists zur Zeit t (interpoliert), nach dem Ziel konstant. SR-AK-06 */
export function ghostPosition(samples: readonly number[], t: number): number | null {
  if (samples.length === 0) return null;
  const f = Math.max(0, t) / SAMPLE_INTERVAL;
  const i = Math.floor(f);
  if (i >= samples.length - 1) return samples.at(-1)!;
  const a = samples[i]!;
  const b = samples[i + 1]!;
  return a + (b - a) * (f - i);
}

/** Zeitpunkt, zu dem der Geist die Position pos erreicht hat (für den Abstand „-0,32 s“). */
export function ghostTimeAt(samples: readonly number[], pos: number): number | null {
  if (samples.length === 0) return null;
  if (pos <= samples[0]!) return 0;
  const i = samples.findIndex((s) => s >= pos);
  if (i <= 0) return null;
  const a = samples[i - 1]!;
  const b = samples[i]!;
  return (i - 1 + (b === a ? 0 : (pos - a) / (b - a))) * SAMPLE_INTERVAL;
}
