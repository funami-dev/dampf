import Phaser from "phaser";
import { fresh } from "@dampf/game-kit/keys";
import { CHARACTERS, type CharacterId } from "../sprites.ts";
import { formatTime } from "../logic/race.ts";
import { canSave, loadData } from "../store.ts";
import { COLORS, SCALE, WIDTH } from "../theme.ts";
import { button, text } from "./ui.ts";

export class StartScene extends Phaser.Scene {
  private frames: {
    id: CharacterId;
    g: Phaser.GameObjects.Graphics;
    arrow: Phaser.GameObjects.Text;
  }[] = [];

  constructor() {
    super("start");
  }

  create() {
    this.frames = [];
    this.cameras.main.setBackgroundColor(COLORS.panel);
    this.add
      .tileSprite(WIDTH / 2, 625, WIDTH, 60, "crowd")
      .setTileScale(3)
      .setAlpha(0.35);

    text(this, WIDTH / 2, 60, "SemUkri", 30, COLORS.yellow).setStroke(COLORS.ink, 8);
    text(this, WIDTH / 2, 105, "RUN", 34, COLORS.white).setStroke(COLORS.ink, 8);
    text(this, WIDTH / 2, 160, "Figur wählen", 12);

    CHARACTERS.forEach((c, i) => {
      const x = WIDTH / 2 + (i - 1) * 112;
      const g = this.add.graphics();
      const arrow = text(this, x, 196, "▼", 14, COLORS.yellow);
      this.add.image(x, 330, c.id, "idle").setOrigin(0.5, 1).setScale(SCALE);
      text(this, x, 350, c.name, 10);
      this.add
        .zone(x, 280, 100, 150)
        .setName(`card-${c.id}`)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => this.select(c.id));
      this.frames.push({ id: c.id, g, arrow });
    });

    const data = loadData();
    text(
      this,
      WIDTH / 2,
      400,
      data.best ? `Bestzeit: ${formatTime(data.best.time)}` : "Noch keine Bestzeit",
      12,
      COLORS.yellow,
    );
    if (!canSave) {
      text(
        this,
        WIDTH / 2,
        430,
        "Rekorde werden in diesem\nBrowser nicht gespeichert.",
        8,
        COLORS.red,
      );
    }

    button(this, WIDTH / 2, 490, "Los!", () => this.go(), {
      name: "start",
      color: 0x38b764,
      size: 16,
      height: 54,
    });
    button(this, WIDTH / 2, 565, "Rekorde", () => this.scene.start("records"), { name: "records" });

    const kb = this.input.keyboard!;
    kb.on(
      "keydown-LEFT",
      fresh(() => this.move(-1)),
    );
    kb.on(
      "keydown-RIGHT",
      fresh(() => this.move(1)),
    );
    kb.on(
      "keydown-A",
      fresh(() => this.move(-1)),
    );
    kb.on(
      "keydown-D",
      fresh(() => this.move(1)),
    );
    kb.once("keydown-ENTER", () => this.go());
    kb.once("keydown-SPACE", () => this.go());
    this.render();
  }

  private get selected(): CharacterId {
    return this.registry.get("character") as CharacterId;
  }

  private select(id: CharacterId) {
    this.registry.set("character", id);
    this.render();
  }

  private move(d: number) {
    const i = CHARACTERS.findIndex((c) => c.id === this.selected);
    this.select(CHARACTERS[(i + d + CHARACTERS.length) % CHARACTERS.length]!.id);
  }

  private go() {
    this.scene.start("race");
  }

  private render() {
    this.frames.forEach(({ id, g, arrow }, i) => {
      const x = WIDTH / 2 + (i - 1) * 112;
      const on = id === this.selected;
      g.clear()
        .fillStyle(on ? COLORS.panelLight : COLORS.inkHex, on ? 1 : 0.5)
        .fillRect(x - 50, 210, 100, 155)
        .lineStyle(on ? 4 : 2, on ? COLORS.yellowHex : 0x566c86)
        .strokeRect(x - 50, 210, 100, 155);
      arrow.setVisible(on);
    });
  }
}
