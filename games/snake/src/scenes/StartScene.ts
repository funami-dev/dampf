import Phaser from "phaser";
import { COLORS, FONT } from "../theme.ts";
import { onTap } from "./input.ts";

export class StartScene extends Phaser.Scene {
  constructor() {
    super("start");
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add
      .text(cx, height * 0.28, "SNAKE", { fontFamily: FONT, fontSize: 48, color: COLORS.accent })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.5, "Tippen oder Leertaste\nzum Starten", {
        fontFamily: FONT,
        fontSize: 16,
        color: COLORS.text,
        align: "center",
        lineSpacing: 12,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.75, "Steuerung:\nPfeiltasten / WASD\noder wischen\n\nP / Esc: Pause", {
        fontFamily: FONT,
        fontSize: 11,
        color: COLORS.warn,
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const start = () => this.scene.start("play");
    this.input.keyboard?.once("keydown-SPACE", start);
    onTap(this, start);
  }
}
