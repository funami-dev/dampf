import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
export const RELAY_PORT = 8787;
/** Mit DAMPF_URL laufen die Tests gegen eine echte Seite (z. B. Production) statt lokal. */
const remote = process.env.DAMPF_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: remote ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 667 } },
    },
  ],
  webServer: remote
    ? undefined
    : [
        {
          command: "tsx scripts/serve.ts",
          port: PORT,
          reuseExistingServer: !process.env.CI,
        },
        // Lokaler Raum-Server für Mehrspieler-Tests (WL-AK-15)
        {
          command: "tsx services/relay/src/node.ts",
          port: RELAY_PORT,
          reuseExistingServer: !process.env.CI,
        },
      ],
});
