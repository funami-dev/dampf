import Phaser from "phaser";
import { CHARACTERS, COLORS, FIGURE_SCALE, FONT, type CharacterId } from "../theme.ts";
import { button, sky, title } from "./ui.ts";

const CARD_W = 116;
const CARD_H = 176;

/** HH-AK-10: Figurenauswahl. */
export class SelectScene extends Phaser.Scene {
  private cards: {
    id: CharacterId;
    frame: Phaser.GameObjects.Graphics;
    check: Phaser.GameObjects.Container;
  }[] = [];

  constructor() {
    super("select");
  }

  create() {
    const { width } = this.scale;
    this.cards = [];
    sky(this);
    this.add
      .image(width / 2, 700, "huegel")
      .setOrigin(0.5, 1)
      .setScale(0.5);

    title(this, width / 2, 92, "Himmelhüpfer");
    this.add
      .graphics()
      .fillStyle(0x4a90e2)
      .fillRoundedRect(width / 2 - 100, 148, 200, 44, 14);
    this.add
      .text(width / 2, 170, "Figur wählen", {
        fontFamily: FONT,
        fontSize: 26,
        fontStyle: "600",
        color: COLORS.white,
      })
      .setOrigin(0.5)
      .setStroke("#2f6fb8", 6);

    CHARACTERS.forEach((c, i) => {
      const x = width / 2 + (i - 1) * (CARD_W + 10);
      const y = 320;
      const frame = this.add.graphics();
      const name = this.add
        .text(0, -CARD_H / 2 + 24, c.name, {
          fontFamily: FONT,
          fontSize: 22,
          fontStyle: "700",
          color: COLORS.yellow,
        })
        .setOrigin(0.5)
        .setStroke(COLORS.ink, 5);
      const figure = this.add.image(0, 14, c.id).setScale(FIGURE_SCALE * 1.25);
      const check = this.add.container(0, CARD_H / 2, [
        this.add.circle(0, 0, 17, COLORS.yellowHex).setStrokeStyle(3, COLORS.inkHex),
        this.add
          .text(0, 1, "✓", { fontFamily: FONT, fontSize: 22, fontStyle: "700", color: COLORS.ink })
          .setOrigin(0.5),
      ]);
      const card = this.add
        .container(x, y, [frame, name, figure, check])
        .setSize(CARD_W, CARD_H)
        .setName(`card-${c.id}`)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => this.select(c.id));
      card.setData("id", c.id);
      this.cards.push({ id: c.id, frame, check });
    });

    this.add
      .text(width / 2, 470, "Tippe deine Lieblingsfigur und\nspring so hoch du kannst!", {
        fontFamily: FONT,
        fontSize: 20,
        color: "#2a4d6e",
        align: "center",
        lineSpacing: 4,
      })
      .setOrigin(0.5);
    button(this, width / 2, 560, "Los!", () => this.start(), { name: "start" });

    const kb = this.input.keyboard;
    kb?.on("keydown-LEFT", () => this.move(-1));
    kb?.on("keydown-RIGHT", () => this.move(1));
    kb?.on("keydown-A", () => this.move(-1));
    kb?.on("keydown-D", () => this.move(1));
    kb?.once("keydown-SPACE", () => this.start());
    kb?.once("keydown-ENTER", () => this.start());
    this.render();
  }

  get selected(): CharacterId {
    return this.registry.get("character") as CharacterId;
  }

  select(id: CharacterId) {
    this.registry.set("character", id);
    this.render();
  }

  private move(delta: number) {
    const i = CHARACTERS.findIndex((c) => c.id === this.selected);
    this.select(CHARACTERS[(i + delta + CHARACTERS.length) % CHARACTERS.length]!.id);
  }

  private start() {
    this.scene.start("play");
  }

  private render() {
    for (const card of this.cards) {
      const on = card.id === this.selected;
      card.frame
        .clear()
        .fillStyle(on ? COLORS.selectedHex : COLORS.cardHex)
        .fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22)
        .lineStyle(on ? 6 : 3, on ? 0xf0b429 : 0x9cc6ec)
        .strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22);
      card.check.setVisible(on);
    }
  }
}
