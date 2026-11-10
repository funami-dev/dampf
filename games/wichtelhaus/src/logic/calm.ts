/**
 * Ruhe-Design (WH-AK-11/12): langsame Zyklen, kein Blinken, leise Klänge.
 * Grundlage: langsames Atmen mit ca. 6 Atemzügen pro Minute (10 s je Zyklus).
 */
export const BREATH = { inhale: 5, exhale: 5 }; // Sekunden
export const BREATH_CYCLE = BREATH.inhale + BREATH.exhale;
/** kürzester erlaubter Zyklus für Leerlauf-Animationen (s) */
export const MIN_IDLE_CYCLE = 4;
/** höchste erlaubte Blink-/Flacker-Frequenz (Hz) */
export const MAX_FLASH_HZ = 3;
export const DEFAULT_VOLUME = 0.3;
/** Bei „weniger Bewegung“ laufen Animationen um diesen Faktor langsamer */
export const REDUCED_MOTION_SLOWDOWN = 2;

/** Leerlauf-Animationen: Name → Zyklus in Sekunden */
export const IDLE_CYCLES: Record<string, number> = {
  atmen: BREATH_CYCLE,
  laterne: BREATH_CYCLE,
  kerze: 6,
  baeume: 8,
  haustier: 7,
  rauch: 9,
};

/** Laternen-Helligkeit 0..1 im Ruhemoment: 5 s heller, 5 s dunkler */
export function lanternLevel(seconds: number): number {
  const t = ((seconds % BREATH_CYCLE) + BREATH_CYCLE) % BREATH_CYCLE;
  if (t < BREATH.inhale) return 0.5 - 0.5 * Math.cos((t / BREATH.inhale) * Math.PI);
  return 0.5 + 0.5 * Math.cos(((t - BREATH.inhale) / BREATH.exhale) * Math.PI);
}

/** „Einatmen“ oder „Ausatmen“ für die Anzeige */
export const breathPhase = (seconds: number) =>
  ((seconds % BREATH_CYCLE) + BREATH_CYCLE) % BREATH_CYCLE < BREATH.inhale
    ? "Einatmen"
    : "Ausatmen";

/** sanfte Schwingung 0..1 mit Zyklus `cycle` Sekunden */
export const sway = (seconds: number, cycle: number, phase = 0) =>
  0.5 - 0.5 * Math.cos(((seconds / cycle + phase) % 1) * Math.PI * 2);
