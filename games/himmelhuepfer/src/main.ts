import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import { VIEW_HEIGHT, WIDTH } from "./logic/jump.ts";
import { FONT } from "./theme.ts";
import { debugEnabled } from "./debug.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { SelectScene } from "./scenes/SelectScene.ts";
import { PlayScene } from "./scenes/PlayScene.ts";
import { GameOverScene } from "./scenes/GameOverScene.ts";

const parent = mountGameShell({ title: manifest.title });
parent.style.background = "linear-gradient(#4fb8f2, #c6ecff)";

await Promise.all(
  ["400", "600", "700"].map((w) => document.fonts.load(`${w} 24px ${FONT}`).catch(() => undefined)),
);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: "#4fb8f2",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, SelectScene, PlayScene, GameOverScene],
  banner: false,
});

function visibleTexts(objects: Phaser.GameObjects.GameObject[]): string[] {
  return objects.flatMap((o) => {
    if (o instanceof Phaser.GameObjects.Text) return o.visible ? [o.text.trim()] : [];
    if (o instanceof Phaser.GameObjects.Container) return o.visible ? visibleTexts(o.list) : [];
    return [];
  });
}

if (debugEnabled) {
  const active = () => game.scene.getScenes(true)[0];
  const play = () => game.scene.getScene("play") as PlayScene;
  window.__dampf = {
    scene: () => active()?.scene.key ?? "",
    texts: () => visibleTexts(active()?.children.list ?? []),
    state: () => {
      if (!game.scene.isActive("play")) return null;
      const { player, heightMeters, starCount, alive, cameraY, jumps } = play().state;
      return {
        ...player,
        heightMeters,
        starCount,
        alive,
        cameraY,
        jumps,
        paused: play().paused,
        character: game.registry.get("character"),
      };
    },
    point: (name) => {
      const obj = active()?.children.getByName(name) as Phaser.GameObjects.Container | null;
      if (!obj) return null;
      const rect = game.canvas.getBoundingClientRect();
      return {
        x: rect.left + (obj.x * rect.width) / WIDTH,
        y: rect.top + (obj.y * rect.height) / VIEW_HEIGHT,
      };
    },
    fall: () => undefined,
  };
}
