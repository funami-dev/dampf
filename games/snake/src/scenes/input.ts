import Phaser from "phaser";
import { detectSwipe, type Direction } from "@dampf/game-kit";

/** Ruft fn bei einem Tippen/Klick auf (Zeigerbewegung unter Swipe-Schwelle). */
export function onTap(scene: Phaser.Scene, fn: () => void) {
  scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
    const scale = scene.scale.displayScale;
    if (detectSwipe((p.upX - p.downX) / scale.x, (p.upY - p.downY) / scale.y) === null) fn();
  });
}

/** Ruft fn mit der Richtung auf, sobald eine Wischbewegung die Schwelle überschreitet. */
export function onSwipe(scene: Phaser.Scene, fn: (dir: Direction) => void) {
  let handled = false;
  scene.input.on("pointerdown", () => (handled = false));
  scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
    if (!p.isDown || handled) return;
    // Bildschirm-Pixel statt Spielkoordinaten, damit die Schwelle unabhängig von der Skalierung ist.
    const scale = scene.scale.displayScale;
    const dir = detectSwipe((p.x - p.downX) / scale.x, (p.y - p.downY) / scale.y);
    if (dir) {
      handled = true;
      fn(dir);
    }
  });
}

export const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
