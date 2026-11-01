import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

interface PPState {
  x: number;
  y: number;
  speed: number;
  heading: number;
  onGround: boolean;
  throttle: number;
  camera: string;
  aircraft: string;
  airline: string;
  modelAirline: string;
  modelAircraft: string;
  throttleInput: number;
  pitchInput: number;
}

const AIRCRAFT = ["A320", "A321", "A340", "A380"];
const AIRLINES = [
  "Lufthansa",
  "Emirates",
  "Eurowings",
  "Condor",
  "British Airways",
  "La Compagnie",
  "US Airways",
];

const screen = (page: Page) =>
  page.evaluate(() => (window.__dampf as { screen(): string }).screen());
const state = (page: Page) => page.evaluate(() => (window.__dampf as { state(): PPState }).state());

async function open(page: Page) {
  await page.goto("/games/pilot-pro/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 30_000 }).toBe(true);
  await expect.poll(() => screen(page)).toBe("menu");
}

/** Echte Touch-Wischgeste (CDP) von (x0,y0) nach (x1,y1); hält am Ende `holdMs`. */
async function drag(page: Page, x0: number, y0: number, x1: number, y1: number, holdMs = 0) {
  const cdp = await page.context().newCDPSession(page);
  const t = (type: string, x?: number, y?: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: x === undefined ? [] : [{ x, y: y! }],
    });
  await t("touchStart", x0, y0);
  for (let i = 1; i <= 8; i++)
    await t("touchMove", x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8);
  if (holdMs) await page.waitForTimeout(holdMs);
  return () => t("touchEnd");
}

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

test.describe("Katalog im Browser", () => {
  // Kleines Fenster: das Software-Rendering im Testcontainer ist sonst sehr langsam.
  test.use({ viewport: { width: 420, height: 720 } });

  test("PP-AK-01: alle 28 Kombinationen bauen ein Modell mit Airline-Namen", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "einmal reicht");
    test.setTimeout(300_000);
    const errors = trackErrors(page);
    await open(page);
    for (const a of AIRCRAFT) {
      await page
        .getByRole("group", { name: "Flugzeug" })
        .getByRole("button", { name: a, exact: true })
        .click();
      for (const l of AIRLINES) {
        await page
          .getByRole("group", { name: "Airline" })
          .getByRole("button", { name: l, exact: true })
          .click();
        const s = await state(page);
        expect([s.modelAircraft, s.modelAirline]).toEqual([a, l]);
      }
    }
    await expectNoErrors(errors);
  });
});

test("PP-AK-11: Desktop – abheben, Kamera wechseln, Menü", async ({ page }) => {
  test.skip(isMobile(page), "nur Desktop");
  test.setTimeout(180_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).click();
  await expect.poll(() => screen(page)).toBe("flight");

  const s0 = await state(page);
  expect(s0.onGround).toBe(true);
  expect(s0.speed).toBe(0);
  expect(Math.round(s0.heading)).toBe(233);

  await page.keyboard.down("PageUp");
  await expect
    .poll(async () => (await state(page)).throttle, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(1);
  await page.keyboard.up("PageUp");
  await expect.poll(async () => (await state(page)).speed, { timeout: 90_000 }).toBeGreaterThan(80);

  await page.keyboard.down("ArrowDown");
  await expect.poll(async () => (await state(page)).y, { timeout: 60_000 }).toBeGreaterThan(10);
  await page.keyboard.up("ArrowDown");
  expect((await state(page)).onGround).toBe(false);

  await page.keyboard.press("c");
  expect((await state(page)).camera).toBe("cockpit");
  await page.keyboard.press("c");
  expect((await state(page)).camera).toBe("chase");

  await page.keyboard.press("Escape");
  await expect.poll(() => screen(page)).toBe("menu");
  await expect(page.getByRole("button", { name: "Abheben!" })).toBeVisible();
  await expectNoErrors(errors);
});

test("PP-AK-12: Mobile – Bedienelemente sichtbar und bedienbar", async ({ page }) => {
  test.skip(!isMobile(page), "nur Mobile");
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).tap();
  await expect.poll(() => screen(page)).toBe("flight");

  const vp = page.viewportSize()!;
  const controls = [
    page.getByRole("slider", { name: "Steuerknüppel" }),
    page.getByRole("slider", { name: "Schubhebel" }),
    page.getByRole("button", { name: "Kamera" }),
    page.getByRole("button", { name: "Bremse" }),
    page.getByRole("button", { name: "Menü" }),
  ];
  for (const c of controls) {
    await expect(c).toBeVisible();
    const b = (await c.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 0.5);
  }
  const stick = (await controls[0]!.boundingBox())!;
  expect(stick.width).toBeGreaterThanOrEqual(120);

  // Schubhebel ganz nach oben schieben
  const thr = (await controls[1]!.boundingBox())!;
  const end = await drag(
    page,
    thr.x + thr.width / 2,
    thr.y + thr.height - 8,
    thr.x + thr.width / 2,
    thr.y + 2,
  );
  await end();
  await expect.poll(async () => (await state(page)).throttleInput).toBeGreaterThan(0.9);
  const v0 = (await state(page)).speed;
  await expect
    .poll(async () => (await state(page)).speed, { timeout: 30_000 })
    .toBeGreaterThan(v0 + 5);

  // Joystick nach unten ziehen = Nase hoch
  const cx = stick.x + stick.width / 2;
  const cy = stick.y + stick.height / 2;
  const release = await drag(page, cx, cy, cx, cy + stick.height / 2, 300);
  expect((await state(page)).pitchInput).toBeGreaterThan(0.8);
  await release();
  await expect.poll(async () => (await state(page)).pitchInput).toBe(0);

  await controls[2]!.tap();
  expect((await state(page)).camera).toBe("cockpit");
  await expectNoErrors(errors);
});

test("PP-AK-13: Fokusverlust pausiert den Flug", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await page.getByRole("button", { name: "Abheben!" }).click();
  await expect.poll(() => screen(page)).toBe("flight");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(() => screen(page)).toBe("paused");
  const x = (await state(page)).x;
  await page.waitForTimeout(500);
  expect((await state(page)).x).toBe(x);
  await page.getByRole("button", { name: /Weiterfliegen/ }).click();
  await expect.poll(() => screen(page)).toBe("flight");
});
