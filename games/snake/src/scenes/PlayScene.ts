import Phaser from "phaser";
import {
  createGame,
  grow,
  GRID_SIZE,
  speedFor,
  step,
  turn,
  type GameState,
} from "../logic/snake.ts";
import { CELL, COLORS, FONT, HUD } from "../theme.ts";
import { debugEnabled } from "../debug.ts";
import { KEY_DIRECTIONS, onSwipe, onTap } from "./input.ts";

export class PlayScene extends Phaser.Scene {
  state!: GameState;
  paused = false;
  private elapsed = 0;
  private board!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super("play");
  }

  create() {
    this.state = createGame(Date.now() >>> 0);
    this.paused = false;
    this.elapsed = 0;
    const { width } = this.scale;

    this.scoreText = this.add
      .text(12, HUD / 2, "", { fontFamily: FONT, fontSize: 16, color: COLORS.text })
      .setOrigin(0, 0.5);
    this.add
      .text(width - 12, HUD / 2, "II", {
        fontFamily: FONT,
        fontSize: 18,
        color: COLORS.accent,
        padding: { x: 10, y: 8 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => this.setPaused(!this.paused));

    this.board = this.add.graphics();
    this.pauseOverlay = this.add
      .container(0, 0, [
        this.add.rectangle(0, HUD, width, GRID_SIZE * CELL, 0x000000, 0.6).setOrigin(0),
        this.add
          .text(
            width / 2,
            HUD + (GRID_SIZE * CELL) / 2,
            "PAUSE\n\nTippen oder P\nzum Weiterspielen",
            {
              fontFamily: FONT,
              fontSize: 16,
              color: COLORS.text,
              align: "center",
              lineSpacing: 8,
            },
          )
          .setOrigin(0.5),
      ])
      .setVisible(false);

    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (e.code === "KeyP" || e.code === "Escape") return this.setPaused(!this.paused);
      const dir = KEY_DIRECTIONS[e.code];
      if (dir && !this.paused) {
        e.preventDefault();
        this.state = turn(this.state, dir);
      }
    });
    onSwipe(this, (dir) => {
      if (!this.paused) this.state = turn(this.state, dir);
    });
    onTap(this, () => {
      if (this.paused) this.setPaused(false);
    });

    // SNAKE-AK-10: Fokusverlust pausiert.
    const pause = () => this.setPaused(true);
    const onVisibility = () => document.hidden && pause();
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
    });

    if (debugEnabled) {
      window.__dampf!.grow = (n) => (this.state = grow(this.state, n));
    }
    this.draw();
  }

  setPaused(paused: boolean) {
    if (!this.state.alive) return;
    this.paused = paused;
    this.pauseOverlay.setVisible(paused);
  }

  override update(_time: number, delta: number) {
    if (this.paused) return;
    this.elapsed += delta;
    const interval = 1000 / speedFor(this.state.score);
    // Maximal ein Schritt pro Frame, damit nach Rucklern nichts übersprungen wird.
    if (this.elapsed < interval) return;
    this.elapsed = Math.min(this.elapsed - interval, interval);
    this.state = step(this.state);
    this.draw();
    if (!this.state.alive) {
      this.time.delayedCall(400, () => this.scene.start("gameover", { score: this.state.score }));
    }
  }

  private draw() {
    const g = this.board.clear();
    const size = GRID_SIZE * CELL;
    g.fillStyle(COLORS.board).fillRect(0, HUD, size, size);
    g.lineStyle(1, COLORS.grid, 1);
    for (let i = 1; i < GRID_SIZE; i++) {
      g.lineBetween(i * CELL, HUD, i * CELL, HUD + size);
      g.lineBetween(0, HUD + i * CELL, size, HUD + i * CELL);
    }
    const cell = (x: number, y: number, color: number, inset = 2) =>
      g
        .fillStyle(color)
        .fillRect(x * CELL + inset, HUD + y * CELL + inset, CELL - 2 * inset, CELL - 2 * inset);

    const { food, snake, alive } = this.state;
    if (food) cell(food.x, food.y, COLORS.food, 5);
    snake.forEach((s, i) =>
      cell(s.x, s.y, i === 0 ? (alive ? COLORS.head : 0xff5555) : COLORS.snake),
    );
    this.scoreText.setText(`PUNKTE ${this.state.score}`);
  }
}
