import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

/** Spec: specs/games/planetenlander.md (PL-AK-08..12) */
interface PlState {
  screen: string;
  paused: boolean;
  body: string | null;
  alt: number;
  x: number;
  vx: number;
  vy: number;
  angle: number;
  fuel: number;
  padCenter: number;
  result: { landed: boolean; reason: string; stars: number } | null;
  best: Record<string, number>;
}
interface Hooks {
  state(): PlState;
  place(alt: number, vy: number, vx?: number, angle?: number): void;
}
declare global {
  interface Window {
    __dampf?: unknown;
  }
}
const state = (page: Page) => page.evaluate(() => (window.__dampf as Hooks).state());
const place = (page: Page, alt: number, vy: number, vx = 0, angle = 0) =>
  page.evaluate(
    ([a, v, x, g]) => (window.__dampf as Hooks).place(a!, v!, x, g),
    [alt, vy, vx, angle],
  );

async function open(page: Page) {
  await page.goto("/games/planetenlander/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
}
const tap = (page: Page, name: string | RegExp) =>
  isMobile(page)
    ? page.getByRole("button", { name }).first().tap()
    : page.getByRole("button", { name }).first().click();

test("PL-AK-08: Auswahl – alle Orte sofort frei, Gasriesen erklären sich", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  for (const n of ["Mond", "Ceres", "Pluto", "Titan", "Merkur", "Mars", "Venus", "Erde"])
    await expect(page.getByRole("button", { name: new RegExp(`^${n}`) })).toBeVisible();
  for (const n of ["Mond", "Ceres", "Pluto", "Titan", "Merkur", "Mars", "Venus", "Erde"])
    await expect(page.getByRole("button", { name: n, exact: true })).toBeEnabled();
  await expect(page.getByText("🔒")).toHaveCount(0);
  await expect(page.getByText("g = 1,62 m/s² · 17 % der Erde")).toBeVisible();

  await page.getByRole("button", { name: "Jupiter: Warum nicht?" }).click();
  await expect(page.getByText("Schwerkraft: 24,79 m/s²")).toBeVisible();
  await expect(page.getByText(/keinen festen Boden/)).toBeVisible();
  await expect(page.getByText("Deshalb kann man hier nicht landen.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Los!" })).toHaveCount(0);
  await page.getByRole("button", { name: "Zurück" }).click();
  await expect(page.getByRole("heading", { name: "Planetenlander" })).toBeVisible();
  await expectNoErrors(errors);
});

test("PL-AK-09: Mond – Lern-Karte, Schub, sanft landen, Sterne bleiben nach Neuladen", async ({
  page,
}) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Mond", exact: true }).click();
  await expect(page.getByText("Schwerkraft: 1,62 m/s²")).toBeVisible();
  await expect(
    page.getByText("Die Schwerkraft ist hier 6-mal schwächer als auf der Erde."),
  ).toBeVisible();
  await expect(page.getByText(/in 1 Sekunde 0,8 m tief/)).toBeVisible();
  await page.getByRole("button", { name: "Los!" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("fly");
  await expect(page.getByRole("status").getByText("Treibstoff")).toBeVisible();

  // fallen lassen, dann Schub: Sinken wird kleiner
  await expect.poll(async () => -(await state(page)).vy).toBeGreaterThan(2);
  const before = -(await state(page)).vy;
  await page.keyboard.down("ArrowUp");
  await expect.poll(async () => -(await state(page)).vy).toBeLessThan(before - 1);
  await page.keyboard.up("ArrowUp");
  expect((await state(page)).fuel).toBeLessThan(600);

  // sanft auf die Plattform
  await place(page, 0.1, -0.5);
  await expect(page.getByRole("heading", { name: "Gelandet! 🎉" })).toBeVisible();
  const s = await state(page);
  expect(s.result).toMatchObject({ landed: true });
  expect(s.result!.stars).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole("button", { name: "Nächster Ort: Ceres" })).toBeVisible();

  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  expect((await state(page)).best.mond).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole("button", { name: "Mond", exact: true })).toContainText("★★");
  await expectNoErrors(errors);
});

test("PL-AK-10: zu schnell → Bruchlandung mit Nochmal", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Mond", exact: true }).click();
  await page.getByRole("button", { name: "Los!" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("fly");
  await place(page, 0.5, -6);
  await expect(page.getByRole("heading", { name: "Rumms! 💥" })).toBeVisible();
  await expect(page.getByText("Zu schnell aufgesetzt – bremse früher mit der Düse.")).toBeVisible();
  // PL-AK-13: Grenze und wie viel zu viel
  await expect(page.getByText("erlaubt 2,0 m/s")).toBeVisible();
  await expect(page.locator(".pl-over").first()).toHaveText(/^\d+,\d m\/s zu schnell$/);
  expect((await state(page)).result).toMatchObject({ landed: false, reason: "hart", stars: 0 });
  expect((await state(page)).best.mond).toBeUndefined();
  await page.getByRole("button", { name: "Nochmal" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("fly");
  expect((await state(page)).alt).toBeGreaterThan(250);
  await expectNoErrors(errors);
});

test("PL-AK-11: Mobile – Knöpfe gleichzeitig, Anzeigen lesbar, kein Querscrollen", async ({
  page,
}) => {
  test.skip(!isMobile(page), "nur Mobile");
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Mond", exact: true }).tap();
  await page.getByRole("button", { name: "Los!" }).tap();
  await expect.poll(async () => (await state(page)).screen).toBe("fly");
  const vw = page.viewportSize()!.width;
  const vh = page.viewportSize()!.height;
  for (const name of ["Schub", "Links drehen", "Rechts drehen"]) {
    const b = (await page.getByRole("button", { name }).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vw);
    expect(b.y + b.height).toBeLessThanOrEqual(vh);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  const hud = (await page.getByRole("status").first().boundingBox())!;
  expect(hud.x + hud.width).toBeLessThanOrEqual(vw);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);

  // Schub und Drehen gleichzeitig (zwei Finger)
  const center = async (name: string) => {
    const b = (await page.getByRole("button", { name }).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const t = await center("Schub");
  const r = await center("Rechts drehen");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: t.x, y: t.y, id: 1 },
      { x: r.x, y: r.y, id: 2 },
    ],
  });
  const a0 = (await state(page)).angle;
  const f0 = (await state(page)).fuel;
  await expect.poll(async () => (await state(page)).angle).toBeGreaterThan(a0 + 5);
  // Schub läuft gleichzeitig: Treibstoff sinkt (10 kg/s)
  await expect.poll(async () => (await state(page)).fuel).toBeLessThan(f0 - 2);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expectNoErrors(errors);
});

test("PL-AK-12: Fokusverlust pausiert", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  await tap(page, /^Mond$/);
  await tap(page, "Los!");
  await expect.poll(async () => (await state(page)).screen).toBe("fly");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  const alt = (await state(page)).alt;
  await page.waitForTimeout(400);
  expect((await state(page)).alt).toBe(alt);
  await tap(page, "Weiterspielen");
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  await expect.poll(async () => (await state(page)).alt).toBeLessThan(alt);
  await expectNoErrors(errors);
});
