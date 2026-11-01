// Nur über @dampf/game-kit/shell importieren: bringt das Spielseiten-CSS mit.
import "./compat.ts";
import "./shell.css";

export interface ShellOptions {
  title: string;
}

/**
 * Baut die Vollbild-Spielseite: schmale Leiste mit Zurück-Button (MANIFEST-AK-07) und darunter
 * der Container für das Spiel. Der Button liegt außerhalb des Spielfelds und verdeckt nichts.
 * Gibt das Element zurück, in das Phaser rendern soll.
 */
export function mountGameShell({ title }: ShellOptions): HTMLElement {
  document.documentElement.lang = "de";
  document.title = `${title} – Dampf`;

  const bar = document.createElement("header");
  bar.className = "dampf-bar";
  const back = document.createElement("a");
  back.href = "/";
  back.className = "dampf-back";
  back.textContent = "← Alle Spiele";
  const name = document.createElement("span");
  name.className = "dampf-title";
  name.textContent = title;
  bar.append(back, name);

  const stage = document.createElement("main");
  stage.className = "dampf-stage";
  stage.id = "game";

  document.body.classList.add("dampf-game");
  document.body.append(bar, stage);
  return stage;
}
