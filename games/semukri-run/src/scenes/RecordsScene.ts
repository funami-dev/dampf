import Phaser from "phaser";
import { formatTime } from "../logic/race.ts";
import { loadData } from "../store.ts";
import { COLORS, FONT, WIDTH } from "../theme.ts";
import { button, text } from "./ui.ts";

export class RecordsScene extends Phaser.Scene {
  constructor() {
    super("records");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.panel);
    text(this, WIDTH / 2, 50, "REKORDE", 22, COLORS.yellow).setStroke(COLORS.ink, 6);
    const data = loadData();
    if (data.top.length === 0) {
      text(this, WIDTH / 2, 250, "Noch keine Rekorde.\n\nLauf los!", 12);
    }
    data.top.forEach((e, i) => {
      const y = 110 + i * 38;
      const color = i === 0 ? COLORS.yellow : COLORS.text;
      const style = { fontFamily: FONT, fontSize: 11, color };
      this.add.text(18, y, `${String(i + 1).padStart(2, " ")}.`, style);
      this.add
        .image(70, y + 6, e.character, "idle")
        .setScale(1)
        .setOrigin(0.5);
      this.add.text(88, y, e.name, style);
      this.add.text(WIDTH - 18, y, formatTime(e.time), style).setOrigin(1, 0);
    });
    button(this, WIDTH / 2, 545 + 30, "Zurück", () => this.scene.start("start"), { name: "back" });
    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("start"));
    this.input.keyboard!.once("keydown-ESC", () => this.scene.start("start"));
  }
}
