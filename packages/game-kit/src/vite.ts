import { fileURLToPath } from "node:url";
import { loadEnv, type Plugin } from "vite";

/** Repo-Hauptordner: dort stehen `.env.production` / `.env.development` (Spec 004) */
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/** Feedback-Adresse für einen Vite-Modus, zentral aus dem Repo-Hauptordner (Spec 004) */
export function feedbackUrlFor(mode: string): string {
  return loadEnv(mode, repoRoot, "VITE_FEEDBACK_URL").VITE_FEEDBACK_URL ?? "";
}

/** Setzt `import.meta.env.VITE_FEEDBACK_URL` für Spiele und Portal aus einer zentralen Stelle */
export function dampfFeedbackEnv(): Plugin {
  return {
    name: "dampf-feedback-env",
    config: (_config, { mode }) => ({
      define: { "import.meta.env.VITE_FEEDBACK_URL": JSON.stringify(feedbackUrlFor(mode)) },
    }),
  };
}

/** Mindest-Browser aller Spiele (Spec 001, Browser-Unterstützung). */
export const BROWSER_TARGET = ["es2020", "safari15"];

export const TOO_OLD_TEXT =
  "Dein Gerät ist leider zu alt für dieses Spiel. Es braucht mindestens iOS 15 bzw. einen aktuellen Browser.";

export interface CompatOptions {
  /** 3D-Spiele (Three.js) brauchen WebGL 2. */
  webgl2?: boolean;
}

/** Klassisches Skript (ES5): prüft das Gerät und lädt erst dann das Spiel-Modul. */
export function loaderScript(src: string, crossorigin: boolean, opts: CompatOptions): string {
  return `(function () {
  var ok = typeof Promise !== "undefined" && typeof Promise.any === "function";
  if (ok && ${opts.webgl2 ? "true" : "false"}) {
    try {
      var gl = document.createElement("canvas").getContext("webgl2");
      ok = !!gl;
      var lose = gl && gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    } catch (e) {
      ok = false;
    }
  }
  function start() {
    if (ok) {
      var s = document.createElement("script");
      s.type = "module";
      ${crossorigin ? 's.crossOrigin = "anonymous";' : ""}
      s.src = ${JSON.stringify(src)};
      document.head.appendChild(s);
      return;
    }
    document.body.style.cssText =
      "margin:0;min-height:100vh;background:#121a26;color:#c7d5e0;font:16px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box";
    document.body.innerHTML =
      '<div role="alert"><p style="font-size:20px;margin:0 0 16px">' +
      ${JSON.stringify(TOO_OLD_TEXT)} +
      '</p><a href="/" style="color:#66c0f4;font-weight:700">\\u2190 Alle Spiele</a></div>';
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();`;
}

/**
 * Vite-Plugin für alle Spiele: setzt das Build-Ziel für ältere Safari-Versionen (BUILD-AK-11)
 * und ersetzt das Spiel-Modul durch einen Lader, der zu alten Geräten statt einer weißen Seite
 * einen Hinweis zeigt (BUILD-AK-13). Setzt außerdem die zentrale Feedback-Adresse (Spec 004).
 */
export function dampfCompat(opts: CompatOptions = {}): Plugin {
  return {
    name: "dampf-compat",
    config: (_config, { mode }) => ({
      build: { target: BROWSER_TARGET },
      define: { "import.meta.env.VITE_FEEDBACK_URL": JSON.stringify(feedbackUrlFor(mode)) },
    }),
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(
          /<script type="module"([^>]*?) src="([^"]+)"([^>]*)><\/script>/g,
          (tag, before: string, src: string, after: string) =>
            src.includes("/@vite/")
              ? tag
              : `<script>${loaderScript(src, /crossorigin/.test(before + after), opts)}</script>`,
        );
      },
    },
  };
}
