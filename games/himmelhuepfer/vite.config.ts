import { defineConfig } from "vite";
import { dampfCompat } from "@dampf/game-kit/vite";

// Das Spiel wird unter /games/<slug>/ ausgeliefert (BUILD-AK-03).
export default defineConfig({
  base: "/games/himmelhuepfer/",
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [dampfCompat()],
});
