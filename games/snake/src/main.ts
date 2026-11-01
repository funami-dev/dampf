import "@fontsource/press-start-2p/400.css";
import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import { GRID_SIZE } from "./logic/snake.ts";
import { CELL, COLORS, FONT, HUD } from "./theme.ts";
import { debugEnabled } from "./debug.ts";
import { StartScene } from "./scenes/StartScene.ts";
import { PlayScene } from "./scenes/PlayScene.ts";
import { GameOverScene } from "./scenes/GameOverScene.ts";

const parent = mountGameShell({ title: manifest.title });

// Pixel-Schrift laden, bevor Phaser Texte rendert.
await document.fonts.load(`16px ${FONT}`).catch(() => undefined);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: GRID_SIZE * CELL,
  height: GRID_SIZE * CELL + HUD,
  backgroundColor: COLORS.bg,
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [StartScene, PlayScene, GameOverScene],
  banner: false,
});

function visibleTexts(objects: Phaser.GameObjects.GameObject[]): string[] {
  return objects.flatMap((o) => {
    if (o instanceof Phaser.GameObjects.Text) return o.visible ? [o.text] : [];
    if (o instanceof Phaser.GameObjects.Container) return o.visible ? visibleTexts(o.list) : [];
    return [];
  });
}

if (debugEnabled) {
  const play = () => game.scene.getScene("play") as PlayScene;
  const active = () => game.scene.getScenes(true)[0];
  window.__dampf = {
    scene: () => active()?.scene.key ?? "",
    texts: () => visibleTexts(active()?.children.list ?? []),
    state: () => (game.scene.isActive("play") ? { ...play().state, paused: play().paused } : null),
    grow: () => undefined,
  };
}
