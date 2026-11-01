import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { loadManifests } from "../packages/game-kit/src/node.ts";

const games = loadManifests(fileURLToPath(new URL("../games/", import.meta.url)));
const INSET = 40;

test.describe("Spiel-Rahmen", () => {
  for (const game of games) {
    test(`MANIFEST-AK-08: ${game.slug} hält den sicheren Bereich frei`, async ({ page }) => {
      // env(safe-area-inset-*) lässt sich in Chromium nicht setzen; der Rahmen liest die Werte
      // über CSS-Variablen mit env() als Standard, die wir hier simulieren.
      await page.addInitScript((inset) => {
        document.addEventListener("DOMContentLoaded", () => {
          document.documentElement.style.setProperty("--dampf-safe-top", `${inset}px`);
          document.documentElement.style.setProperty("--dampf-safe-bottom", `${inset}px`);
        });
      }, INSET);
      await page.goto(`/games/${game.slug}/`);
      const canvas = page.locator("#game > canvas").first();
      await expect(canvas).toBeVisible();
      await page.waitForTimeout(300);
      const vh = page.viewportSize()!.height;
      const box = (await canvas.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(vh - INSET + 0.5);
      const back = (await page.getByRole("link", { name: /Alle Spiele/ }).boundingBox())!;
      expect(back.y).toBeGreaterThanOrEqual(INSET - 0.5);
    });
  }
});
