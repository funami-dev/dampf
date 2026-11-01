import { CELL, Cell, N, type City } from "../logic/city.ts";

export const COLORS: Record<Cell, string> = {
  [Cell.Grass]: "#8fbf6a",
  [Cell.Road]: "#6b6f75",
  [Cell.Pedestrian]: "#c9b79c",
  [Cell.Plaza]: "#b9a48a",
  [Cell.Park]: "#5fa34a",
  [Cell.Water]: "#4a8fc9",
  [Cell.Rail]: "#7a6a5a",
  [Cell.Building]: "#d8cfc4",
  [Cell.Blocked]: "#6f8f5a",
};

/** Zeichnet das Raster (Norden oben). `px` = Pixel pro Feld. */
export function drawCity(
  city: City,
  px: number,
  opts: { buildings?: boolean } = {},
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = N * px;
  const g = c.getContext("2d")!;
  for (let i = 0; i < city.cells.length; i++) {
    let t = city.cells[i] as Cell;
    if (t === Cell.Building && !opts.buildings) t = Cell.Grass;
    g.fillStyle = COLORS[t];
    const col = i % N;
    const row = Math.floor(i / N);
    g.fillRect(col * px, (N - 1 - row) * px, px, px);
  }
  // Gleise: Schwellen andeuten
  void CELL;
  return c;
}
