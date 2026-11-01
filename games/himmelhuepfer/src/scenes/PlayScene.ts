import Phaser from "phaser";
import {
  START_CAMERA_Y,
  VIEW_HEIGHT,
  WIDTH,
  createGame,
  removePlatforms,
  step,
  type GameState,
  type Input,
} from "../logic/jump.ts";
import { COLORS, FIGURE_SCALE, FONT } from "../theme.ts";
import { debugEnabled } from "../debug.ts";
import { pill, sky } from "./ui.ts";

const DT = 1 / 120;
const MAX_STEPS_PER_FRAME = 8;
const HUD_HEIGHT = 70;
const PLATFORM_SCALE_Y = 0.4;
const CLOUD_PARALLAX = 0.25;

/** Weltkoordinate (y nach oben) → Bildschirm (y nach unten). */
const screenY = (worldY: number, cameraY: number) => VIEW_HEIGHT - (worldY - cameraY);

export class PlayScene extends Phaser.Scene {
  state!: GameState;
  paused = false;
  private acc = 0;
  private over = false;
  private player!: Phaser.GameObjects.Image;
  private platforms = new Map<number, Phaser.GameObjects.Image>();
  private stars = new Map<number, Phaser.GameObjects.Image>();
  private clouds: { img: Phaser.GameObjects.Image; y: number }[] = [];
  private city!: Phaser.GameObjects.Image;
  private hills!: Phaser.GameObjects.Image;
  private heightText!: Phaser.GameObjects.Text;
  private starText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private keys!: Record<"left" | "right" | "a" | "d", Phaser.Input.Keyboard.Key>;
  private lastJumps = 0;

  constructor() {
    super("play");
  }

  create() {
    this.state = createGame(Date.now() >>> 0);
    this.paused = false;
    this.over = false;
    this.acc = 0;
    this.lastJumps = 0;
    this.platforms.clear();
    this.stars.clear();

    sky(this);
    this.clouds = Array.from({ length: 5 }, (_, i) => ({
      img: this.add
        .image(Phaser.Math.Between(40, WIDTH - 40), 0, "wolke")
        .setScale(Phaser.Math.FloatBetween(0.3, 0.5)),
      y: i * 180 + 60,
    }));
    this.city = this.add
      .image(WIDTH / 2, 0, "stadt")
      .setOrigin(0.5, 1)
      .setScale(0.5);
    this.hills = this.add
      .image(WIDTH / 2, 0, "huegel")
      .setOrigin(0.5, 1)
      .setScale(0.5);

    const character = this.registry.get("character") as string;
    this.player = this.add
      .image(0, 0, character)
      .setOrigin(0.5, 0.95)
      .setScale(FIGURE_SCALE)
      .setDepth(10);

    // HUD
    const hud = pill(this, 70, 36, 116);
    this.heightText = hud.text;
    const starHud = pill(this, WIDTH / 2, 36, 96);
    this.starText = starHud.text;
    this.add
      .image(WIDTH / 2 - 26, 36, "stern")
      .setScale(0.22)
      .setDepth(21);
    for (const o of [hud.g, hud.text, starHud.g, starHud.text]) o.setDepth(20);
    this.add
      .container(WIDTH - 36, 36, [
        this.add.circle(0, 0, 22, 0xffffff, 0.85).setStrokeStyle(3, 0xa9d4f5),
        this.add.rectangle(-6, 0, 6, 18, 0x2a4d6e),
        this.add.rectangle(6, 0, 6, 18, 0x2a4d6e),
      ])
      .setSize(52, 52)
      .setName("pause")
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => this.setPaused(!this.paused));

    this.pauseOverlay = this.add
      .container(0, 0, [
        this.add.rectangle(0, 0, WIDTH, VIEW_HEIGHT, 0x23303d, 0.55).setOrigin(0),
        this.add
          .text(WIDTH / 2, VIEW_HEIGHT / 2, "Pause\n\nTippen oder P\nzum Weiterspielen", {
            fontFamily: FONT,
            fontSize: 30,
            fontStyle: "600",
            color: COLORS.white,
            align: "center",
          })
          .setOrigin(0.5)
          .setStroke(COLORS.ink, 6),
      ])
      .setDepth(30)
      .setVisible(false);

    // Eingabe
    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey("LEFT"),
      right: kb.addKey("RIGHT"),
      a: kb.addKey("A"),
      d: kb.addKey("D"),
    };
    kb.on("keydown-P", () => this.setPaused(!this.paused));
    kb.on("keydown-ESC", () => this.setPaused(!this.paused));
    this.input.addPointer(2);
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.paused && p.y > HUD_HEIGHT) this.setPaused(false);
    });

    // HH-AK-13: Fokusverlust pausiert.
    const pause = () => this.setPaused(true);
    const onVisibility = () => document.hidden && pause();
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
    });

    if (debugEnabled) window.__dampf!.fall = () => (this.state = removePlatforms(this.state));
    this.render();
  }

  setPaused(paused: boolean) {
    if (this.over) return;
    this.paused = paused;
    this.pauseOverlay.setVisible(paused);
  }

  /** Tastatur + gehaltene Bildschirmhälften (HH-AK-12). */
  input_(): Input {
    const input = {
      left: this.keys.left.isDown || this.keys.a.isDown,
      right: this.keys.right.isDown || this.keys.d.isDown,
    };
    for (const p of this.input.manager.pointers) {
      if (!p.isDown || p.downY < HUD_HEIGHT) continue;
      if (p.x < WIDTH / 2) input.left = true;
      else input.right = true;
    }
    return input;
  }

  override update(_time: number, delta: number) {
    if (this.paused || this.over) return;
    this.acc = Math.min(this.acc + delta / 1000, DT * MAX_STEPS_PER_FRAME);
    const input = this.input_();
    while (this.acc >= DT) {
      this.state = step(this.state, input, DT);
      this.acc -= DT;
    }
    this.render();
    if (!this.state.alive) {
      this.over = true;
      this.time.delayedCall(500, () =>
        this.scene.start("gameover", {
          height: this.state.heightMeters,
          stars: this.state.starCount,
        }),
      );
    }
  }

  private render() {
    const s = this.state;
    const cam = s.cameraY;

    // Parallaxe-Hintergrund
    const span = this.clouds.length * 180;
    for (const c of this.clouds) {
      const y = (((c.y + cam * CLOUD_PARALLAX) % span) + span) % span;
      c.img.setY(y - 90);
    }
    const rise = cam - START_CAMERA_Y;
    this.city.setY(VIEW_HEIGHT - 40 + rise * 0.6);
    this.hills.setY(VIEW_HEIGHT + rise);

    // Plattformen
    const seen = new Set<number>();
    for (const p of s.platforms) {
      seen.add(p.id);
      let img = this.platforms.get(p.id);
      if (!img) {
        img = this.add.image(0, 0, "plattform").setOrigin(0.5, 0.1);
        img.setScale(p.w / 360, PLATFORM_SCALE_Y);
        this.platforms.set(p.id, img);
      }
      img.setPosition(p.x, screenY(p.y, cam));
    }
    for (const [id, img] of this.platforms) {
      if (!seen.has(id)) {
        img.destroy();
        this.platforms.delete(id);
      }
    }

    // Sterne
    const starIds = new Set(s.stars.map((st) => st.id));
    for (const st of s.stars) {
      let img = this.stars.get(st.id);
      if (!img) {
        img = this.add.image(0, 0, "stern").setScale(0.3);
        this.stars.set(st.id, img);
      }
      img.setPosition(st.x, screenY(st.y, cam) + Math.sin(this.time.now / 300 + st.id) * 4);
    }
    for (const [id, img] of this.stars) {
      if (!starIds.has(id)) {
        img.destroy();
        this.stars.delete(id);
      }
    }

    // Figur (+ Doppel am Rand für den Wrap-around)
    const flip = s.player.facing === "left" ? -1 : 1;
    this.player.setPosition(s.player.x, screenY(s.player.y, cam));
    if (s.jumps !== this.lastJumps) {
      this.lastJumps = s.jumps;
      this.tweens.add({
        targets: this.player,
        scaleY: { from: FIGURE_SCALE * 0.8, to: FIGURE_SCALE },
        duration: 160,
        ease: "Back.out",
      });
    }
    this.player.scaleX = FIGURE_SCALE * flip;

    this.heightText.setText(`${s.heightMeters} m`);
    this.starText.setText(`   ${s.starCount}`);
  }
}
