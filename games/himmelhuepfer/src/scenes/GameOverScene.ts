import Phaser from "phaser";
import { FIGURE_SCALE, FONT } from "../theme.ts";
import { button, sky, title } from "./ui.ts";

export class GameOverScene extends Phaser.Scene {
  private height = 0;
  private stars = 0;

  constructor() {
    super("gameover");
  }

  init(data: { height?: number; stars?: number }) {
    this.height = data.height ?? 0;
    this.stars = data.stars ?? 0;
  }

  create() {
    const { width } = this.scale;
    sky(this);
    this.add
      .image(width / 2, 700, "huegel")
      .setOrigin(0.5, 1)
      .setScale(0.5);
    title(this, width / 2, 110, "Abgestürzt!", 48);
    const figure = this.add
      .image(width / 2, 250, this.registry.get("character") as string)
      .setScale(FIGURE_SCALE * 1.4);
    this.tweens.add({
      targets: figure,
      angle: { from: -8, to: 8 },
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: "Sine.inOut",
    });

    const style = { fontFamily: FONT, fontSize: 30, fontStyle: "600", color: "#2a4d6e" };
    this.add.text(width / 2, 360, `Höhe: ${this.height} m`, style).setOrigin(0.5);
    this.add.text(width / 2, 405, `Sterne: ${this.stars}`, style).setOrigin(0.5);

    button(this, width / 2, 500, "Nochmal", () => this.scene.start("play"), { name: "again" });
    button(this, width / 2, 575, "Figur wechseln", () => this.scene.start("select"), {
      name: "change",
      color: 0x8a6fd6,
      width: 240,
    });
    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("play"));
  }
}
