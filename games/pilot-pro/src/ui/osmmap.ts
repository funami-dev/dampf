/**
 * OpenStreetMap-Kacheln auf einem Canvas (Spec: Live-Karte, PP-AK-15..17).
 * Lädt nur, was gebraucht wird, höchstens MAX_LOADING gleichzeitig; der Browser speichert
 * die Kacheln zwischen. Schlägt eine Kachel fehl, bleibt sie leer (die gezeichnete Karte
 * dient dann als Ersatz).
 */
import { MAX_LOADING, TILE_SIZE, TILE_URL, toTile } from "../logic/geo.ts";

type Entry = { img: HTMLImageElement; state: "queued" | "loading" | "ok" | "error" };

export class TileCache {
  private tiles = new Map<string, Entry>();
  private queue: string[] = [];
  loading = 0;
  maxLoading = 0;
  loaded = 0;
  failed = 0;
  onLoad: () => void = () => {};

  get(z: number, x: number, y: number): Entry {
    const n = 2 ** z;
    const key = `${z}/${((x % n) + n) % n}/${y}`;
    let e = this.tiles.get(key);
    if (!e) {
      e = { img: new Image(), state: "queued" };
      this.tiles.set(key, e);
      this.queue.push(key);
      this.pump();
    }
    return e;
  }

  private pump() {
    while (this.loading < MAX_LOADING && this.queue.length) {
      const key = this.queue.shift()!;
      const e = this.tiles.get(key)!;
      const [z, x, y] = key.split("/").map(Number) as [number, number, number];
      e.state = "loading";
      this.loading++;
      this.maxLoading = Math.max(this.maxLoading, this.loading);
      const done = (ok: boolean) => {
        e.state = ok ? "ok" : "error";
        if (ok) this.loaded++;
        else this.failed++;
        this.loading--;
        this.pump();
        this.onLoad();
      };
      e.img.onload = () => done(true);
      e.img.onerror = () => done(false);
      e.img.decoding = "async";
      e.img.referrerPolicy = "strict-origin-when-cross-origin";
      e.img.src = TILE_URL(z, x, y);
    }
  }

  /** Warteschlange auf das Nötige kürzen (z. B. nach Zoomwechsel) */
  keepOnly(keys: Set<string>) {
    this.queue = this.queue.filter((k) => {
      if (keys.has(k)) return true;
      this.tiles.delete(k);
      return false;
    });
  }
}

/**
 * Zeichnet die Kacheln rund um (lat, lon) mittig auf den Canvas.
 * Rückgabe: true, wenn alle sichtbaren Kacheln geladen sind.
 */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  cache: TileCache,
  lat: number,
  lon: number,
  zoom: number,
  /** Pixel pro Kachel auf dem Canvas */
  size = TILE_SIZE,
): boolean {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const c = toTile(lat, lon, zoom);
  const x0 = Math.floor(c.x - W / 2 / size);
  const x1 = Math.floor(c.x + W / 2 / size);
  const y0 = Math.floor(c.y - H / 2 / size);
  const y1 = Math.floor(c.y + H / 2 / size);
  const need = new Set<string>();
  let complete = true;
  const n = 2 ** zoom;
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      if (ty < 0 || ty >= n) continue;
      need.add(`${zoom}/${((tx % n) + n) % n}/${ty}`);
      const e = cache.get(zoom, tx, ty);
      const px = Math.round(W / 2 + (tx - c.x) * size);
      const py = Math.round(H / 2 + (ty - c.y) * size);
      if (e.state === "ok") ctx.drawImage(e.img, px, py, size, size);
      else complete = false;
    }
  cache.keepOnly(need);
  return complete;
}
