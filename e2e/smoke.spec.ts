import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { listedGames, loadManifests } from "../packages/game-kit/src/node.ts";
import { expectNoErrors, trackErrors } from "./helpers.ts";

/**
 * Smoke-Tests (Spec 001, BUILD-AK-16): schnell, für jedes Spiel und die Startseite.
 * Laufen beim vollen Lauf und bei gemeinsamem Code mit, nicht bei einzelnen Spielen.
 */
const games = listedGames(loadManifests(fileURLToPath(new URL("../games/", import.meta.url))));

test("SMOKE: Startseite listet alle Spiele ohne Fehler", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  const cards = page.locator("[data-testid=games] > li");
  await expect(cards).toHaveCount(games.length);
  for (const g of games) await expect(cards.filter({ hasText: g.title }).first()).toBeVisible();
  await expectNoErrors(errors);
});

for (const g of games) {
  test(`SMOKE: ${g.slug} lädt ohne Fehler und zeigt v${g.version}`, async ({ page }) => {
    test.setTimeout(60_000);
    const errors = trackErrors(page);
    await page.goto(`/games/${g.slug}/`);
    await expect(page).toHaveTitle(`${g.title} – Dampf`);
    await expect(page.locator("header").getByText(`v${g.version}`, { exact: true })).toBeVisible();
    // das Spiel hat etwas gezeichnet bzw. seine Oberfläche aufgebaut
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1000);
    await expectNoErrors(errors);
  });
}
