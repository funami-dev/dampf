import Phaser from "phaser";
import { COLORS, FONT } from "../theme.ts";

export const text = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 12,
  color: string = COLORS.text,
) =>
  scene.add
    .text(x, y, value, { fontFamily: FONT, fontSize: size, color, align: "center", lineSpacing: 6 })
    .setOrigin(0.5);

/** Pixel-Button: Rahmen, Schatten, Beschriftung. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: { width?: number; height?: number; color?: number; name?: string; size?: number } = {},
) {
  const w = opts.width ?? 220;
  const h = opts.height ?? 44;
  const g = scene.add.graphics();
  const draw = (pressed: boolean) => {
    const o = pressed ? 3 : 0;
    g.clear()
      .fillStyle(COLORS.inkHex)
      .fillRect(-w / 2 + 4, -h / 2 + 4, w, h)
      .fillStyle(opts.color ?? COLORS.panelLight)
      .fillRect(-w / 2 + o, -h / 2 + o, w, h)
      .lineStyle(3, COLORS.inkHex)
      .strokeRect(-w / 2 + o, -h / 2 + o, w, h);
    label_.setPosition(o, o);
  };
  const label_ = text(scene, 0, 0, label, opts.size ?? 12);
  const c = scene.add.container(x, y, [g, label_]).setSize(w, h);
  if (opts.name) c.setName(opts.name);
  draw(false);
  c.setInteractive({ useHandCursor: true })
    .on("pointerdown", () => draw(true))
    .on("pointerout", () => draw(false))
    .on("pointerup", () => {
      draw(false);
      onClick();
    });
  return c;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  return scene.add
    .graphics()
    .fillStyle(COLORS.inkHex, 0.85)
    .fillRect(x, y, w, h)
    .lineStyle(3, COLORS.yellowHex)
    .strokeRect(x, y, w, h);
}
