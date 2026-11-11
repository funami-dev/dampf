import Phaser from "phaser";
import { fresh } from "../keys.ts";
import {
  DISTANCE,
  abort,
  createRace,
  formatTime,
  press,
  step,
  type RaceState,
  type Side,
} from "../logic/race.ts";
import { ghostPosition, ghostTimeAt } from "../logic/ghost.ts";
import { loadData } from "../store.ts";
import { COLORS, FONT, HEIGHT, SCALE, WIDTH } from "../theme.ts";
import { text } from "./ui.ts";

const PX_PER_M = 36;
const PLAYER_X = 110;
const PLAYER_FEET = 410;
const GHOST_FEET = 338;
const TRACK_TOP = 262;
const TRACK_BOTTOM = 432;
const BUTTON_Y = 545;

export class RaceScene extends Phaser.Scene {
  race!: RaceState;
  ghost: number[] = [];
  private character = "ukri";
  private world!: Phaser.GameObjects.Container;
  private crowd!: Phaser.GameObjects.TileSprite;
  private player!: Phaser.GameObjects.Sprite;
  private ghostSprite!: Phaser.GameObjects.Sprite;
  private timeText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private deltaText!: Phaser.GameObjects.Text;
  private speedBar!: Phaser.GameObjects.Graphics;
  private callout!: Phaser.GameObjects.Text;
  private done = false;
  private buttons: Record<Side, Phaser.GameObjects.Container> = {} as never;

  constructor() {
    super("race");
  }

  create() {
    this.race = createRace();
    this.done = false;
    this.character = this.registry.get("character") as string;
    const best = loadData().best;
    this.ghost = best?.ghost ?? [];

    this.drawBackground();
    this.world = this.add.container(PLAYER_X, 0, this.drawTrackMarks());

    this.ghostSprite = this.add
      .sprite(PLAYER_X, GHOST_FEET, best?.character ?? this.character, "idle")
      .setOrigin(0.5, 1)
      .setScale(SCALE * 0.85)
      .setAlpha(0.45)
      .setTint(0xc8e6ff)
      .setVisible(this.ghost.length > 0);
    this.player = this.add
      .sprite(PLAYER_X, PLAYER_FEET, this.character, "idle")
      .setOrigin(0.5, 1)
      .setScale(SCALE);

    this.drawHud();
    this.callout = text(this, WIDTH / 2, 200, "", 16, COLORS.yellow)
      .setStroke(COLORS.ink, 6)
      .setDepth(10);

    // Eingabe: Tastatur und zwei große Touch-Buttons (SR-AK-13)
    const kb = this.input.keyboard!;
    const onKey = (side: Side) =>
      fresh((e: KeyboardEvent) => {
        if (!e.repeat) this.tap(side);
      });
    kb.on("keydown-LEFT", onKey("left"));
    kb.on("keydown-A", onKey("left"));
    kb.on("keydown-RIGHT", onKey("right"));
    kb.on("keydown-D", onKey("right"));
    this.input.addPointer(2);
    this.buttons.left = this.tapButton(95, "L", "left");
    this.buttons.right = this.tapButton(WIDTH - 95, "R", "right");

    // SR-AK-14: Fokusverlust bricht den Lauf ab.
    const onBlur = () => this.abortRace();
    const onVisibility = () => document.hidden && onBlur();
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    });
    this.render();
  }

  tap(side: Side) {
    this.race = press(this.race, side);
    const b = this.buttons[side];
    b.setScale(0.94);
    this.time.delayedCall(70, () => b.setScale(1));
  }

  abortRace() {
    if (this.done) return;
    this.race = abort(this.race);
  }

  override update(_time: number, delta: number) {
    if (this.done) return;
    this.race = step(this.race, Math.min(delta, 100) / 1000);
    this.render();
    const r = this.race;
    if (r.phase === "finished") {
      this.done = true;
      this.player.stop().setFrame("cheer");
      this.callout.setText("ZIEL!");
      this.time.delayedCall(1200, () =>
        this.scene.start("finish", {
          time: r.finishTime,
          samples: r.samples,
          character: this.character,
        }),
      );
    } else if (r.phase === "aborted") {
      this.done = true;
      this.scene.start("finish", { aborted: true, character: this.character });
    }
  }

  private render() {
    const r = this.race;
    this.world.x = PLAYER_X - r.pos * PX_PER_M;
    this.crowd.tilePositionX = (r.pos * PX_PER_M * 0.35) / 3;

    // Figur: Laufanimation passend zum Tempo
    if (r.phase === "running" && r.speed > 0) {
      if (!this.player.anims.isPlaying) this.player.play(`${this.character}-run`);
      this.player.anims.timeScale = Math.max(0.4, r.speed / 6);
    } else if (r.phase !== "finished") {
      this.player.stop().setFrame("idle");
    }

    // Geist
    const gp = r.phase === "countdown" ? 0 : ghostPosition(this.ghost, r.t);
    if (gp !== null && this.ghost.length > 0) {
      this.ghostSprite.x = PLAYER_X + (gp - r.pos) * PX_PER_M;
      const moving = r.phase === "running" && gp < DISTANCE;
      if (moving && !this.ghostSprite.anims.isPlaying)
        this.ghostSprite.play(`${this.ghostSprite.texture.key}-run`);
      if (!moving) this.ghostSprite.stop().setFrame(gp >= DISTANCE ? "cheer" : "idle");
    }

    // HUD
    const time = r.finishTime ?? r.t;
    this.timeText.setText(formatTime(time));
    this.distText.setText(`${Math.floor(r.pos)} m`);
    const gt = r.phase === "running" ? ghostTimeAt(this.ghost, r.pos) : null;
    if (gt !== null && r.pos > 1) {
      const d = r.t - gt;
      this.deltaText.setText(`${d <= 0 ? "-" : "+"}${formatTime(Math.abs(d)).replace(" s", "")}`);
      this.deltaText.setColor(d <= 0 ? COLORS.green : COLORS.red);
    } else this.deltaText.setText("");
    const frac = Math.min(1, r.speed / 12);
    this.speedBar
      .clear()
      .fillStyle(COLORS.inkHex)
      .fillRect(20, 100, WIDTH - 40, 12)
      .fillStyle(frac > 0.75 ? 0x38b764 : frac > 0.4 ? 0xffd23b : 0xef7d57)
      .fillRect(22, 102, (WIDTH - 44) * frac, 8);

    // Countdown
    if (r.phase === "countdown")
      this.callout.setText(r.countdown > 1 ? "Auf die\nPlätze" : "Fertig");
    else if (r.phase === "running") this.callout.setText(r.t < 0.7 ? "Los!" : "");
  }

  private drawBackground() {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.add.rectangle(0, 120, WIDTH, 30, COLORS.skyLow).setOrigin(0);
    this.crowd = this.add
      .tileSprite(0, 150, WIDTH, TRACK_TOP - 150, "crowd")
      .setOrigin(0)
      .setTileScale(3);
    this.add.rectangle(0, TRACK_TOP - 8, WIDTH, 8, 0x333c57).setOrigin(0);
    this.add.rectangle(0, TRACK_TOP, WIDTH, TRACK_BOTTOM - TRACK_TOP, COLORS.tartan).setOrigin(0);
    for (const y of [TRACK_TOP + 6, 352, TRACK_BOTTOM - 8])
      this.add.rectangle(0, y, WIDTH, 3, COLORS.line).setOrigin(0);
    this.add.rectangle(0, TRACK_BOTTOM, WIDTH, HEIGHT - TRACK_BOTTOM, COLORS.grass).setOrigin(0);
  }

  /** Start-, Ziel- und Meterlinien im Weltmaßstab (bewegen sich mit). */
  private drawTrackMarks(): Phaser.GameObjects.GameObject[] {
    const g = this.add.graphics();
    const objs: Phaser.GameObjects.GameObject[] = [g];
    for (let m = 10; m < DISTANCE; m += 10) {
      g.fillStyle(COLORS.line, 0.7).fillRect(
        m * PX_PER_M - 1,
        TRACK_TOP + 6,
        3,
        TRACK_BOTTOM - TRACK_TOP - 12,
      );
      objs.push(
        this.add.text(m * PX_PER_M + 6, TRACK_TOP + 14, `${m}`, {
          fontFamily: FONT,
          fontSize: 10,
          color: "#f4f4f4",
        }),
      );
    }
    g.fillStyle(COLORS.line).fillRect(-3, TRACK_TOP + 6, 6, TRACK_BOTTOM - TRACK_TOP - 12); // Start
    // Ziel: Schachbrett
    for (let y = TRACK_TOP + 6, i = 0; y < TRACK_BOTTOM - 8; y += 6, i++) {
      g.fillStyle(i % 2 ? 0x000000 : 0xffffff).fillRect(DISTANCE * PX_PER_M - 6, y, 6, 6);
      g.fillStyle(i % 2 ? 0xffffff : 0x000000).fillRect(DISTANCE * PX_PER_M, y, 6, 6);
    }
    objs.push(
      this.add
        .text(DISTANCE * PX_PER_M, TRACK_TOP - 40, "ZIEL", {
          fontFamily: FONT,
          fontSize: 14,
          color: COLORS.yellow,
        })
        .setOrigin(0.5)
        .setStroke(COLORS.ink, 5),
    );
    return objs;
  }

  private drawHud() {
    this.add.rectangle(0, 0, WIDTH, 120, COLORS.panel).setOrigin(0);
    this.add.rectangle(0, 118, WIDTH, 3, COLORS.inkHex).setOrigin(0);
    this.timeText = text(this, WIDTH / 2, 36, "0,00 s", 26, COLORS.white).setStroke(COLORS.ink, 6);
    this.distText = this.add.text(20, 72, "0 m", {
      fontFamily: FONT,
      fontSize: 12,
      color: COLORS.text,
    });
    this.deltaText = this.add
      .text(WIDTH - 20, 72, "", { fontFamily: FONT, fontSize: 12, color: COLORS.green })
      .setOrigin(1, 0);
    this.speedBar = this.add.graphics();
  }

  private tapButton(x: number, label: string, side: Side) {
    const w = 160;
    const h = 150;
    const g = this.add
      .graphics()
      .fillStyle(COLORS.inkHex)
      .fillRect(-w / 2 + 5, -h / 2 + 5, w, h)
      .fillStyle(COLORS.panelLight)
      .fillRect(-w / 2, -h / 2, w, h)
      .lineStyle(4, COLORS.inkHex)
      .strokeRect(-w / 2, -h / 2, w, h);
    const t = text(this, 0, 0, label, 40, COLORS.white).setStroke(COLORS.ink, 6);
    return this.add
      .container(x, BUTTON_Y, [g, t])
      .setSize(w, h)
      .setName(`tap-${side}`)
      .setInteractive()
      .on("pointerdown", () => this.tap(side));
  }
}
