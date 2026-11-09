import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "packages/*/src/**/*.test.ts",
            "games/*/src/**/*.test.ts",
            "services/*/src/**/*.test.ts",
            "scripts/**/*.test.ts",
          ],
        },
      },
      "apps/portal",
    ],
  },
});
