import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { listedGames, loadManifests } from "../packages/game-kit/src/node.ts";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

const games = listedGames(loadManifests(fileURLToPath(new URL("../games/", import.meta.url))));

test.describe("Startseite", () => {
  test("PORTAL-AK-01/02/04: listet alle veröffentlichten Spiele mit Bild, Titel, Beschreibung", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/Dampf/);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    const cards = page.locator("[data-testid=games] > li");
    await expect(cards).toHaveCount(games.length);
    for (const [i, game] of games.entries()) {
      const card = cards.nth(i);
      await expect(card.getByRole("heading")).toHaveText(game.title);
      await expect(card).toContainText(game.description);
      const img = card.getByRole("img", { name: game.title });
      await expect(img).toBeVisible();
      await img.scrollIntoViewIfNeeded();
      expect(
        await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth),
      ).toBeGreaterThan(0);
    }
    await expectNoErrors(errors);
  });

  test("PORTAL-AK-03: Klick auf eine Karte lädt das Spiel ohne Fehler", async ({ page }) => {
    for (const game of games) {
      const errors = trackErrors(page);
      await page.goto("/");
      await page.locator(`a[data-game="${game.slug}"]`).click();
      await expect(page).toHaveURL(`/games/${game.slug}/`);
      await expect(page.locator("#game > canvas").first()).toBeVisible();
      await expect(page).toHaveTitle(`${game.title} – Dampf`);
      await page.waitForTimeout(500);
      await expectNoErrors(errors);
    }
  });

  test("MANIFEST-AK-07: Zurück-Button führt zur Startseite", async ({ page }) => {
    for (const game of games) {
      await page.goto(`/games/${game.slug}/`);
      await page.getByRole("link", { name: /Alle Spiele/ }).click();
      await expect(page).toHaveURL("/");
    }
  });

  test("PORTAL-AK-06: Mobile ohne horizontales Scrollen, einspaltig", async ({ page }) => {
    test.skip(!isMobile(page), "nur Mobile");
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const xs = await page
      .locator("[data-testid=games] > li")
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(1);
  });
});

test.describe("Startseite ohne JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("PORTAL-AK-07: Liste sichtbar und Links funktionieren", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid=games] > li")).toHaveCount(games.length);
    const first = games[0]!;
    await expect(page.locator(`a[data-game="${first.slug}"]`)).toHaveAttribute(
      "href",
      `/games/${first.slug}/`,
    );
    const res = await page.request.get(`/games/${first.slug}/`);
    expect(res.status()).toBe(200);
  });
});

test.describe("Startseite scrollen", () => {
  test("PORTAL-AK-09: Startseite lässt sich auf Mobile per Wischgeste scrollen", async ({
    page,
  }) => {
    test.skip(!isMobile(page), "nur Mobile");
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    test.skip(overflow <= 0, "Seite ist kürzer als der Bildschirm");
    // Echte Touch-Wischgeste nach oben (synthetische Scroll-Gesten umgehen die CSS-Sperre).
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, y?: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: y === undefined ? [] : [{ x: 180, y }],
      });
    await touch("touchStart", 550);
    for (let i = 1; i <= 10; i++) {
      await touch("touchMove", 550 - i * 30);
      await page.waitForTimeout(16);
    }
    await touch("touchEnd");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
