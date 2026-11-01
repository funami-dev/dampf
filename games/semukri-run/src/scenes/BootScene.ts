import Phaser from "phaser";
import { CHARACTERS, FRAMES, SPRITE_H, SPRITE_W, drawFigure } from "../sprites.ts";

/** Erzeugt alle Pixel-Texturen per Code (keine Bilddateien nötig). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create() {
    for (const c of CHARACTERS) {
      const canvas = document.createElement("canvas");
      canvas.width = SPRITE_W * FRAMES.length;
      canvas.height = SPRITE_H;
      const ctx = canvas.getContext("2d")!;
      FRAMES.forEach((f, i) => drawFigure(ctx, c.id, f, i * SPRITE_W, 0));
      const tex = this.textures.addCanvas(c.id, canvas)!;
      FRAMES.forEach((f, i) => tex.add(f, 0, i * SPRITE_W, 0, SPRITE_W, SPRITE_H));
      this.anims.create({
        key: `${c.id}-run`,
        frames: ["run0", "run1", "run2", "run3"].map((frame) => ({ key: c.id, frame })),
        frameRate: 10,
        repeat: -1,
      });
    }
    this.textures.addCanvas("crowd", crowd());
    if (!this.registry.has("character")) this.registry.set("character", "ukri");
    this.scene.start("start");
  }
}

/** Kachelbare Tribüne mit Pixel-Publikum (64 × 40). */
function crowd(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 40;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3b5dc9";
  ctx.fillRect(0, 0, 64, 40);
  const shirts = ["#e83b3b", "#ffd23b", "#38b764", "#f4f4f4", "#ef7d57", "#a7f070", "#b13e53"];
  const skins = ["#f4c7a1", "#e8b48f", "#c68a62", "#8d5a3b"];
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let row = 0; row < 4; row++) {
    ctx.fillStyle = row % 2 ? "#29366f" : "#333c57";
    ctx.fillRect(0, row * 10 + 8, 64, 2);
    for (let x = 1; x < 64; x += 4) {
      const y = row * 10 + 1;
      ctx.fillStyle = shirts[Math.floor(rnd() * shirts.length)]!;
      ctx.fillRect(x, y + 3, 3, 4);
      ctx.fillStyle = skins[Math.floor(rnd() * skins.length)]!;
      ctx.fillRect(x, y, 3, 3);
      if (rnd() < 0.3) ctx.fillRect(x + (rnd() < 0.5 ? -1 : 3), y - 1, 1, 2); // jubelnder Arm
    }
  }
  return c;
}
