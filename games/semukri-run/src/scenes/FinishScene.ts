import Phaser from "phaser";
import { formatTime } from "../logic/race.ts";
import {
  MAX_NAME_LENGTH,
  insertRecord,
  normalizeName,
  qualifies,
  updateBest,
} from "../logic/records.ts";
import { canSave, loadData, saveData } from "../store.ts";
import { COLORS, FONT, SCALE, WIDTH } from "../theme.ts";
import { button, panel, text } from "./ui.ts";

interface FinishData {
  time?: number;
  samples?: number[];
  character: string;
  aborted?: boolean;
}

/** Zieleinlauf: Zeit, Bestzeit, ggf. Namenseingabe für die Top 10 (SR-AK-07 bis SR-AK-10). */
export class FinishScene extends Phaser.Scene {
  private result!: FinishData;
  private form: HTMLFormElement | null = null;
  private actions!: Phaser.GameObjects.Container;
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super("finish");
  }

  init(data: FinishData) {
    this.result = data;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.panel);
    this.add
      .tileSprite(WIDTH / 2, 600, WIDTH, 120, "crowd")
      .setTileScale(3)
      .setAlpha(0.35);
    const { time, aborted, character } = this.result;

    this.add
      .image(WIDTH / 2, 288, character, aborted ? "idle" : "cheer")
      .setOrigin(0.5, 1)
      .setScale(SCALE * 1.2);

    this.status = text(this, WIDTH / 2, 312, "", 10, COLORS.text);
    this.actions = this.add.container(0, 0, [
      button(this, WIDTH / 2, 470, "Nochmal", () => this.scene.start("race"), {
        name: "again",
        color: 0x38b764,
      }),
      button(this, WIDTH / 2, 530, "Rekorde", () => this.scene.start("records"), {
        name: "records",
      }),
      button(this, WIDTH / 2, 590, "Figur wechseln", () => this.scene.start("start"), {
        name: "change",
      }),
    ]);
    this.input.keyboard!.on("keydown-SPACE", () => {
      if (!this.form && this.actions.visible) this.scene.start("race");
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.closeForm());

    if (aborted || time === undefined) {
      text(this, WIDTH / 2, 70, "Lauf\nabgebrochen", 20, COLORS.red).setStroke(COLORS.ink, 6);
      this.status.setText("Dieser Lauf zählt nicht.");
      return;
    }

    // SR-AK-08: Bestzeit nur bei schnellerer Zeit ersetzen
    const data = loadData();
    const best = updateBest(data.best, time, character, this.result.samples ?? []);
    const isBest = best !== data.best;
    const next = { ...data, best };

    text(this, WIDTH / 2, 50, "ZIEL", 22, COLORS.yellow).setStroke(COLORS.ink, 6);
    text(this, WIDTH / 2, 100, formatTime(time), 28, COLORS.white)
      .setStroke(COLORS.ink, 6)
      .setName("time");
    if (isBest) text(this, WIDTH / 2, 142, "Neue Bestzeit!", 12, COLORS.green);
    else if (data.best)
      text(this, WIDTH / 2, 142, `Bestzeit: ${formatTime(data.best.time)}`, 10, COLORS.text);

    if (qualifies(data.top, time)) {
      saveData(next); // Bestzeit sofort sichern, Rekord nach Namenseingabe
      this.askName(next, time, character);
    } else {
      saveData(next);
      if (!canSave) this.status.setText("Rekorde werden in diesem\nBrowser nicht gespeichert.");
    }
  }

  private askName(data: ReturnType<typeof loadData>, time: number, character: string) {
    this.actions.setVisible(false);
    panel(this, 30, 325, WIDTH - 60, 110);
    text(this, WIDTH / 2, 350, "Top 10! Dein Name:", 10, COLORS.yellow);
    this.input.keyboard!.enabled = false;

    // Echtes Textfeld, damit auf dem Handy die Tastatur erscheint.
    const stage = this.game.canvas.parentElement!;
    const form = document.createElement("form");
    form.className = "sr-name";
    const rect = () => {
      const c = this.game.canvas.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      const k = c.width / WIDTH;
      form.style.left = `${c.left - s.left + 45 * k}px`;
      form.style.top = `${c.top - s.top + 370 * k}px`;
      form.style.width = `${(WIDTH - 90) * k}px`;
      form.style.fontSize = `${Math.max(12, 12 * k)}px`;
    };
    form.innerHTML = `
      <input name="name" maxlength="${MAX_NAME_LENGTH}" autocomplete="nickname" enterkeyhint="done"
        aria-label="Name für die Rekordliste" required />
      <button type="submit">OK</button>`;
    Object.assign(form.style, {
      position: "absolute",
      display: "flex",
      gap: "8px",
      fontFamily: FONT,
    });
    const style = document.createElement("style");
    style.textContent = `
      .sr-name input { flex: 1; min-width: 0; font: inherit; padding: 8px; border: 3px solid #1a1c2c;
        background: #f4f4f4; color: #1a1c2c; text-transform: none; }
      .sr-name button { font: inherit; padding: 8px 10px; border: 3px solid #1a1c2c; background: #38b764;
        color: #fff; cursor: pointer; }`;
    form.append(style);
    stage.append(form);
    rect();
    this.scale.on(Phaser.Scale.Events.RESIZE, rect);
    const input = form.querySelector("input")!;
    input.value = data.lastName;
    input.focus();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = normalizeName(input.value);
      if (!name) return input.focus();
      const entry = { name, time, character, date: new Date().toISOString() };
      const top = insertRecord(data.top, entry);
      const ok = saveData({ ...data, top, lastName: name });
      const place = top.indexOf(entry) + 1;
      this.closeForm();
      this.status.setText(ok ? `Gespeichert: Platz ${place}` : "Speichern nicht möglich.");
      this.actions.setVisible(true);
    });
    this.form = form;
  }

  private closeForm() {
    this.form?.remove();
    this.form = null;
    if (this.input.keyboard) this.input.keyboard.enabled = true;
  }
}
