/**
 * Kompass und gedrehte Inselkarte (WL-AK-44). Im Spielbild ist Norden oben: Kachelrichtung
 * (−1, −1) zeigt nach oben, (+1, −1) nach rechts (Osten). Die Kacheln sind doppelt so breit wie hoch.
 */

/** Richtung von (dx, dy) in Kacheln als Bildschirm-Winkel: 0° = Norden (oben), im Uhrzeigersinn */
export function bearing(dx: number, dy: number): number {
  const sx = dx - dy;
  const sy = (dx + dy) / 2;
  const a = (Math.atan2(sx, -sy) * 180) / Math.PI;
  return (a + 360) % 360;
}

/** Kachel (x, y) → Punkt auf einer quadratischen Karte der Breite `px`, wie das Spielbild gedreht */
export function mapPoint(x: number, y: number, size: number, px: number): [number, number] {
  const k = px / (size * Math.SQRT2);
  const c = size / 2;
  const u = (x - c - (y - c)) / Math.SQRT2;
  const v = (x - c + (y - c)) / Math.SQRT2;
  return [px / 2 + u * k, px / 2 + v * k];
}
