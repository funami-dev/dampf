import { defineConfig } from "vite";

// Das Spiel wird unter /games/<slug>/ ausgeliefert (BUILD-AK-03).
export default defineConfig({
  base: "/games/hilden/",
  build: { chunkSizeWarningLimit: 2000 },
});
