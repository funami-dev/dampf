import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "acorn";
import { expect, test } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

const GAMES_3D = ["pilot-pro", "hilden", "juist-faehre", "kasse"];
const GAMES_ALL = [
  ...GAMES_3D,
  "snake",
  "himmelhuepfer",
  "semukri-run",
  "waldlager",
  "planetenlander",
];
const TOO_OLD = /Dein Gerät ist leider zu alt für dieses Spiel/;

test("BUILD-AK-11: Spiel-Bundles enthalten keine Syntax neuer als ES2020", () => {
  test.skip(!!process.env.DAMPF_URL, "prüft das lokale dist/");
  const root = join(process.cwd(), "dist", "games");
  let files = 0;
  for (const slug of readdirSync(root)) {
    const dir = join(root, slug, "assets");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".js"))) {
      const code = readFileSync(join(dir, f), "utf8");
      expect(
        () =>
          parse(code, { ecmaVersion: 2020, sourceType: "module", allowAwaitOutsideFunction: true }),
        `${slug}/${f}`,
      ).not.toThrow();
      files++;
    }
  }
  expect(files).toBeGreaterThanOrEqual(GAMES_ALL.length);
});

for (const slug of GAMES_3D) {
  test(`BUILD-AK-13: ${slug} ohne WebGL 2 zeigt den Hinweis statt einer weißen Seite`, async ({
    page,
  }) => {
    test.skip(isMobile(page), "einmal reicht");
    const errors = trackErrors(page);
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === "webgl2") return null;
        return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof orig;
    });
    await page.goto(`/games/${slug}/`);
    await expect(page.getByRole("alert")).toContainText(TOO_OLD);
    const back = page.getByRole("link", { name: /Alle Spiele/ });
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute("href", "/");
    await page.waitForTimeout(500);
    await expectNoErrors(errors);
  });
}

for (const slug of GAMES_ALL) {
  test(`BUILD-AK-14: ${slug} startet auf aktuellen Browsern ohne Hinweis`, async ({ page }) => {
    test.skip(isMobile(page), "einmal reicht");
    test.setTimeout(60_000);
    await page.goto(`/games/${slug}/`);
    await expect(page.locator("#game > canvas")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(TOO_OLD)).toHaveCount(0);
  });
}
