/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { getViteConfig } from "astro/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default getViteConfig(
  { root, test: { name: "portal", root, include: ["src/**/*.test.ts"] } },
  { root },
);
