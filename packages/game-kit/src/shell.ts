// Nur über @dampf/game-kit/shell importieren: bringt das Spielseiten-CSS mit.
import "./compat.ts";
import "./shell.css";
import { installNoSelect, installNoZoom } from "./nozoom.ts";
import { createFeedbackButton } from "./feedback.ts";

export interface ShellOptions {
  title: string;
  /** Spiel-Slug aus game.json, wird beim Feedback mitgeschickt (Spec 004) */
  slug: string;
  /** Version aus game.json, wird klein neben dem Titel gezeigt (MANIFEST-AK-11) */
  version?: string;
  /** Feedback-Adresse; Standard: VITE_FEEDBACK_URL. Leer = kein Feedback-Knopf. */
  feedbackUrl?: string;
}

/**
 * Baut die Vollbild-Spielseite: schmale Leiste mit Zurück-Button (MANIFEST-AK-07) und darunter
 * der Container für das Spiel. Der Button liegt außerhalb des Spielfelds und verdeckt nichts.
 * Gibt das Element zurück, in das Phaser rendern soll.
 */
export function mountGameShell({ title, slug, version, feedbackUrl }: ShellOptions): HTMLElement {
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
  if (version) {
    const v = document.createElement("span");
    v.className = "dampf-version";
    v.textContent = `v${version}`;
    v.title = `Version ${version}`;
    bar.append(v);
  }
  // Feedback-Knopf rechts in der Leiste (Spec 004)
  const fb = createFeedbackButton({
    game: slug,
    gameVersion: version ?? "0.0.0",
    title,
    url: feedbackUrl,
    pauseGame: true,
  });
  if (fb) bar.append(fb);

  const stage = document.createElement("main");
  stage.className = "dampf-stage";
  stage.id = "game";

  document.body.classList.add("dampf-game");
  installNoZoom();
  installNoSelect();
  document.body.append(bar, stage);
  return stage;
}
