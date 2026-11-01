import { defineConfig } from "vite";

// Das Spiel wird unter /games/<slug>/ ausgeliefert (BUILD-AK-03).
export default defineConfig({
  base: "/games/himmelhuepfer/",
  build: { chunkSizeWarningLimit: 2000 },
});
