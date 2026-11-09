import "@fontsource/press-start-2p/400.css";
import Phaser from "phaser";
import { mountGameShell } from "@dampf/game-kit/shell";
import manifest from "../game.json";
import { debugEnabled } from "./debug.ts";
import { ghostPosition } from "./logic/ghost.ts";
import { FONT, HEIGHT, WIDTH } from "./theme.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { StartScene } from "./scenes/StartScene.ts";
import { RaceScene } from "./scenes/RaceScene.ts";
import { FinishScene } from "./scenes/FinishScene.ts";
import { RecordsScene } from "./scenes/RecordsScene.ts";

const parent = mountGameShell({
  title: manifest.title,
  slug: manifest.slug,
  version: manifest.version,
});
parent.style.background = "#29366f";

await document.fonts.load(`16px ${FONT}`).catch(() => undefined);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#29366f",
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, StartScene, RaceScene, FinishScene, RecordsScene],
  banner: false,
});

function visibleTexts(objects: Phaser.GameObjects.GameObject[]): string[] {
  return objects.flatMap((o) => {
    if (o instanceof Phaser.GameObjects.Text) return o.visible ? [o.text] : [];
    if (o instanceof Phaser.GameObjects.Container) return o.visible ? visibleTexts(o.list) : [];
    return [];
  });
}

function findByName(
  objects: Phaser.GameObjects.GameObject[],
  name: string,
): Phaser.GameObjects.Container | null {
  for (const o of objects) {
    if (o.name === name) return o as Phaser.GameObjects.Container;
    if (o instanceof Phaser.GameObjects.Container && o.visible) {
      const inner = findByName(o.list, name);
      if (inner) return inner;
    }
  }
  return null;
}

if (debugEnabled) {
  const active = () => game.scene.getScenes(true)[0];
  window.__dampf = {
    scene: () => active()?.scene.key ?? "",
    character: () => game.registry.get("character") as string,
    texts: () => visibleTexts(active()?.children.list ?? []),
    state: () => {
      if (!game.scene.isActive("race")) return null;
      const s = game.scene.getScene("race") as RaceScene;
      const { phase, t, pos, speed, finishTime, countdown } = s.race;
      return {
        phase,
        t,
        pos,
        speed,
        finishTime,
        countdown,
        ghostPos: s.ghost.length ? ghostPosition(s.ghost, t) : null,
        character: game.registry.get("character"),
      };
    },
    point: (name) => {
      const obj = findByName(active()?.children.list ?? [], name);
      if (!obj) return null;
      const rect = game.canvas.getBoundingClientRect();
      return {
        x: rect.left + (obj.x * rect.width) / WIDTH,
        y: rect.top + (obj.y * rect.height) / HEIGHT,
      };
    },
  };
}
