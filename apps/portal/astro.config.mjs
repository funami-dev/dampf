import { createReadStream, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, normalize } from "node:path";
import { defineConfig } from "astro/config";
import { dampfFeedbackEnv } from "@dampf/game-kit/vite";

const gamesDir = fileURLToPath(new URL("../../games/", import.meta.url));

/** Im Dev-Server die Thumbnails aus games/<slug>/public unter /games/<slug>/ ausliefern. */
const devGameAssets = {
  name: "dampf-dev-game-assets",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const match = req.url?.match(/^\/games\/([a-z0-9-]+)\/(.+\.(png|jpg|webp|svg))$/);
      if (!match) return next();
      const file = normalize(join(gamesDir, match[1], "public", match[2]));
      if (!file.startsWith(gamesDir) || !existsSync(file) || !statSync(file).isFile())
        return next();
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  vite: {
    // Zentrale Feedback-Adresse wie in den Spielen (Spec 004)
    plugins: [devGameAssets, dampfFeedbackEnv()],
    define: { "import.meta.env.DAMPF_GAMES_DIR": JSON.stringify(gamesDir) },
  },
});
