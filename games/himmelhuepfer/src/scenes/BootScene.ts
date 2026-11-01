import Phaser from "phaser";
import { CHARACTERS } from "../theme.ts";

const asset = (file: string) => `${import.meta.env.BASE_URL}assets/${file}`;

/** Lädt alle SVG-Grafiken in doppelter Auflösung (scharf auf Retina-Displays). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    for (const c of CHARACTERS) {
      this.load.svg(c.id, asset(`figur-${c.id}.svg`), { width: 192, height: 256 });
    }
    this.load.svg("plattform", asset("plattform.svg"), { width: 360, height: 80 });
    this.load.svg("stern", asset("stern.svg"), { width: 128, height: 128 });
    this.load.svg("wolke", asset("wolke.svg"), { width: 480, height: 240 });
    this.load.svg("stadt", asset("stadt.svg"), { width: 800, height: 300 });
    this.load.svg("huegel", asset("huegel.svg"), { width: 800, height: 200 });
  }

  create() {
    if (!this.registry.has("character")) this.registry.set("character", "matti");
    this.scene.start("select");
  }
}
