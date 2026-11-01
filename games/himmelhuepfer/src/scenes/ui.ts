import Phaser from "phaser";
import { COLORS, FONT } from "../theme.ts";

/** Runder Cartoon-Button mit Kontur und Schatten. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: { width?: number; color?: number; name?: string } = {},
) {
  const width = opts.width ?? 200;
  const height = 56;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.inkHex, 0.25).fillRoundedRect(
    -width / 2 + 3,
    -height / 2 + 5,
    width,
    height,
    18,
  );
  g.fillStyle(opts.color ?? COLORS.blueHex)
    .fillRoundedRect(-width / 2, -height / 2, width, height, 18)
    .lineStyle(3, COLORS.inkHex)
    .strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: 26, fontStyle: "600", color: COLORS.white })
    .setOrigin(0.5)
    .setStroke(COLORS.ink, 5);
  const c = scene.add.container(x, y, [g, text]).setSize(width, height);
  if (opts.name) c.setName(opts.name);
  c.setInteractive({ useHandCursor: true }).on("pointerup", onClick);
  c.on("pointerdown", () => c.setScale(0.95));
  c.on("pointerout", () => c.setScale(1));
  return c;
}

/** Abgerundete Info-Pille (z. B. Höhe, Sterne). */
export function pill(scene: Phaser.Scene, x: number, y: number, width: number) {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 0.85)
    .fillRoundedRect(x - width / 2, y - 20, width, 40, 20)
    .lineStyle(3, 0xa9d4f5)
    .strokeRoundedRect(x - width / 2, y - 20, width, 40, 20);
  const text = scene.add
    .text(x, y, "", { fontFamily: FONT, fontSize: 22, fontStyle: "600", color: "#2a4d6e" })
    .setOrigin(0.5);
  return { g, text };
}

export function title(scene: Phaser.Scene, x: number, y: number, label: string, size = 52) {
  return scene.add
    .text(x, y, label, { fontFamily: FONT, fontSize: size, fontStyle: "700", color: COLORS.yellow })
    .setOrigin(0.5)
    .setStroke(COLORS.ink, 9)
    .setShadow(0, 5, "rgba(35,48,61,0.35)", 0, true, true);
}

/** Himmel-Hintergrund mit Verlauf. */
export function sky(scene: Phaser.Scene) {
  const { width, height } = scene.scale;
  return scene.add
    .graphics()
    .fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1)
    .fillRect(0, 0, width, height)
    .setScrollFactor(0);
}
