import Phaser from "phaser";
import { COLORS, FONT } from "../theme.ts";
import { onTap } from "./input.ts";

export class GameOverScene extends Phaser.Scene {
  score = 0;

  constructor() {
    super("gameover");
  }

  init(data: { score?: number }) {
    this.score = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add
      .text(cx, height * 0.3, "GAME OVER", { fontFamily: FONT, fontSize: 36, color: COLORS.warn })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.45, `Punkte: ${this.score}`, {
        fontFamily: FONT,
        fontSize: 20,
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.65, "Tippen oder Leertaste\nfür Nochmal", {
        fontFamily: FONT,
        fontSize: 14,
        color: COLORS.accent,
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    const again = () => this.scene.start("play");
    this.input.keyboard?.once("keydown-SPACE", again);
    onTap(this, again);
  }
}
