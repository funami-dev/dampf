/**
 * Feedback-Knopf und -Formular (Spec 004) für Spiele (über `mountGameShell`) und die Startseite.
 * Nur Freitext; mitgeschickt werden Spiel, Version und grobe Geräteinfo – nie Namen oder IDs.
 */
import "./feedback.css";

export const FEEDBACK_TEXT = {
  heading: (title: string) => `Sag uns deine Meinung zu ${title}!`,
  hint: "Schreib bitte keinen Namen, keine Adresse und keine Telefonnummer hinein.",
  placeholder: "Was ist passiert? Oder was wünschst du dir?",
  privacy:
    "Wir speichern nur deinen Text, das Spiel und grobe Geräte-Infos – keinen Namen. Nach spätestens einem Jahr wird alles gelöscht.",
  tooShort: "Schreib noch ein bisschen mehr.",
  thanks: "Danke! Deine Nachricht ist angekommen. 🎉",
  error: "Das hat gerade nicht geklappt. Versuch es später noch mal.",
  tooMany: "Du hast schon viel geschrieben – mach kurz Pause und versuch es später noch mal.",
  footer: "Wir lesen alles, können aber nicht antworten.",
  button: "Feedback geben",
  label: "Deine Nachricht",
  send: "Abschicken",
  cancel: "Abbrechen",
  ok: "OK",
};

export const FEEDBACK_MIN = 3;
export const FEEDBACK_MAX = 500;

/** Adresse aus `VITE_FEEDBACK_URL` (zentral über das Vite-Plugin aus game-kit gesetzt) */
export function defaultFeedbackUrl(): string {
  return (import.meta.env.VITE_FEEDBACK_URL as string | undefined) ?? "";
}

export interface Device {
  mobile: boolean;
  touch: boolean;
  viewport: string;
  browser: string;
  os: string;
}

/** Grobe Geräteinfo (FEEDBACK-AK-19): Größe auf 100 px gerundet, nur Familie + Hauptversion */
export function deviceInfo(ua: string, width: number, height: number, touch: boolean): Device {
  const v = (re: RegExp) => re.exec(ua)?.[1];
  const ver = (name: string, major: string | undefined) => (major ? `${name} ${major}` : name);
  let browser = "Unbekannt";
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = ver("Edge", v(/Edg(?:e|A|iOS)?\/(\d+)/));
  else if (/SamsungBrowser\//.test(ua)) browser = ver("Samsung", v(/SamsungBrowser\/(\d+)/));
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = ver("Firefox", v(/(?:Firefox|FxiOS)\/(\d+)/));
  else if (/Chrome\/|CriOS\//.test(ua)) browser = ver("Chrome", v(/(?:Chrome|CriOS)\/(\d+)/));
  else if (/Safari\//.test(ua)) browser = ver("Safari", v(/Version\/(\d+)/));
  const mac = /Macintosh/.test(ua);
  let os = "Unbekannt";
  if (/iPhone|iPad|iPod/.test(ua) || (mac && touch)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (mac) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  const round = (n: number) => Math.max(0, Math.round(n / 100) * 100);
  return {
    mobile: /Mobi|Android|iPhone|iPad|iPod/.test(ua) || (mac && touch),
    touch,
    viewport: `${round(width)}x${round(height)}`,
    browser,
    os,
  };
}

/** Zeichen zählen wie der Server (Codepunkte, ohne Leerraum am Rand) */
export function feedbackLength(text: string): number {
  return [...text.trim()].length;
}

export interface FeedbackOptions {
  /** Spiel-Slug oder "portal" */
  game: string;
  /** Version aus game.json; bei der Startseite null */
  gameVersion: string | null;
  /** Name für die Überschrift */
  title: string;
  /** Adresse; ohne Adresse gibt es keinen Knopf (FEEDBACK-AK-19) */
  url?: string;
  /** Spiel beim Öffnen pausieren (blur) und beim Schließen fortsetzen (focus) */
  pauseGame?: boolean;
}

const BLOCK_KEYS = ["keydown", "keyup", "keypress"] as const;
const BLOCK_POINTER = [
  "pointerdown",
  "pointerup",
  "pointermove",
  "mousedown",
  "mouseup",
  "touchstart",
  "touchend",
  "touchmove",
  "click",
  "wheel",
] as const;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

let counter = 0;

/**
 * Baut Knopf und Formular. Gibt den Knopf zurück (zum Einhängen) oder null, wenn keine Adresse
 * eingerichtet ist.
 */
export function createFeedbackButton(opts: FeedbackOptions): HTMLButtonElement | null {
  const url = opts.url ?? defaultFeedbackUrl();
  if (!url) return null;
  const n = ++counter;

  const button = el("button", { type: "button", className: "dampf-fb-open" });
  button.setAttribute("aria-label", FEEDBACK_TEXT.button);
  const icon = el("span", { className: "dampf-fb-icon" }, "💬");
  const word = el("span", { className: "dampf-fb-word" }, "Feedback");
  icon.setAttribute("aria-hidden", "true");
  word.setAttribute("aria-hidden", "true");
  button.append(icon, word);

  const dialog = el("dialog", { className: "dampf-fb" });
  dialog.setAttribute("aria-labelledby", `dampf-fb-h-${n}`);
  document.body.append(dialog);

  const blockKeys = (e: Event) => e.stopImmediatePropagation();
  const stop = (e: Event) => e.stopPropagation();
  for (const t of BLOCK_POINTER) dialog.addEventListener(t, stop);

  let closeTimer = 0;
  const close = () => {
    if (dialog.open) dialog.close();
  };
  dialog.addEventListener("close", () => {
    clearTimeout(closeTimer);
    for (const t of BLOCK_KEYS) window.removeEventListener(t, blockKeys, true);
    if (opts.pauseGame) window.dispatchEvent(new Event("focus"));
    button.focus({ preventScroll: true });
  });

  function renderForm(keepText = "") {
    const ta = el("textarea", {
      id: `dampf-fb-t-${n}`,
      maxLength: FEEDBACK_MAX,
      rows: 5,
      placeholder: FEEDBACK_TEXT.placeholder,
      value: keepText,
    });
    const count = el("span", { className: "dampf-fb-count" });
    const msg = el("p", { className: "dampf-fb-msg" });
    msg.setAttribute("role", "status");
    const hp = el("input", {
      type: "text",
      name: "website",
      tabIndex: -1,
      autocomplete: "off",
      className: "dampf-fb-hp",
    });
    hp.setAttribute("aria-hidden", "true");
    const send = el("button", { type: "submit", className: "dampf-fb-send" }, FEEDBACK_TEXT.send);
    const cancel = el(
      "button",
      { type: "button", className: "dampf-fb-cancel" },
      FEEDBACK_TEXT.cancel,
    );
    const updateCount = () => (count.textContent = `${ta.value.length} / ${FEEDBACK_MAX}`);
    ta.addEventListener("input", () => {
      updateCount();
      msg.textContent = "";
    });
    updateCount();
    cancel.addEventListener("click", close);

    const form = el(
      "form",
      { className: "dampf-fb-form", noValidate: true },
      el("h2", { id: `dampf-fb-h-${n}` }, FEEDBACK_TEXT.heading(opts.title)),
      el("p", { className: "dampf-fb-hint" }, FEEDBACK_TEXT.hint),
      el("label", { htmlFor: ta.id, className: "dampf-fb-label" }, FEEDBACK_TEXT.label),
      ta,
      el("div", { className: "dampf-fb-row" }, count),
      msg,
      hp,
      el("p", { className: "dampf-fb-privacy" }, FEEDBACK_TEXT.privacy),
      el("div", { className: "dampf-fb-actions" }, cancel, send),
      el("p", { className: "dampf-fb-foot" }, FEEDBACK_TEXT.footer),
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (send.disabled) return;
      if (feedbackLength(ta.value) < FEEDBACK_MIN) {
        msg.textContent = FEEDBACK_TEXT.tooShort;
        ta.focus();
        return;
      }
      send.disabled = true;
      msg.textContent = "";
      const body = {
        game: opts.game,
        gameVersion: opts.gameVersion,
        text: ta.value,
        device: deviceInfo(
          navigator.userAgent,
          window.innerWidth,
          window.innerHeight,
          navigator.maxTouchPoints > 0,
        ),
        website: hp.value,
      };
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 10_000);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctl.signal,
        });
        if (res.status === 201) return renderThanks();
        msg.textContent = res.status === 429 ? FEEDBACK_TEXT.tooMany : FEEDBACK_TEXT.error;
      } catch {
        msg.textContent = FEEDBACK_TEXT.error;
      } finally {
        clearTimeout(timer);
        send.disabled = false;
      }
    });
    dialog.replaceChildren(form);
    return ta;
  }

  function renderThanks() {
    const ok = el("button", { type: "button", className: "dampf-fb-send" }, FEEDBACK_TEXT.ok);
    ok.addEventListener("click", close);
    const thanks = el("p", { className: "dampf-fb-thanks" }, FEEDBACK_TEXT.thanks);
    thanks.setAttribute("role", "status");
    dialog.replaceChildren(
      el(
        "div",
        { className: "dampf-fb-form" },
        el("h2", { id: `dampf-fb-h-${n}` }, FEEDBACK_TEXT.heading(opts.title)),
        thanks,
        el("div", { className: "dampf-fb-actions" }, ok),
      ),
    );
    ok.focus();
    closeTimer = window.setTimeout(close, 3000);
  }

  button.addEventListener("click", () => {
    if (dialog.open) return;
    const ta = renderForm();
    for (const t of BLOCK_KEYS) window.addEventListener(t, blockKeys, true);
    if (opts.pauseGame) window.dispatchEvent(new Event("blur"));
    dialog.showModal();
    ta.focus();
  });

  return button;
}
