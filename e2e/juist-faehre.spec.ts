import { expect, test, type Page } from "@playwright/test";
import { expectNoErrors, isMobile, trackErrors } from "./helpers.ts";

interface JfState {
  screen: string;
  ship: string;
  shipName: string;
  direction: string;
  phase: string;
  clock: number;
  departure: number;
  boarded: number;
  passengers: number;
  throttle: number;
  rudder: number;
  camera: string;
  action: string | null;
  targetBerth: [number, number];
  logbook: { trips: number; best: Record<string, Record<string, number>> };
}

const SHIPS = [
  "Frisia I",
  "Frisia II",
  "Frisia III",
  "Frisia IV",
  "Frisia VII",
  "Frisia VIII",
  "Frisia IX",
  "Frisia E-I",
];
const state = (page: Page) => page.evaluate(() => (window.__dampf as { state(): JfState }).state());

async function open(page: Page) {
  await page.goto("/games/juist-faehre/?e2e");
  await expect.poll(() => page.evaluate(() => !!window.__dampf), { timeout: 60_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).screen).toBe("menu");
}

const shipButton = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Schiff" })
    .getByRole("button", { name: new RegExp(`^${name.replace(/[-]/g, "\\-")}\\b`) });

declare global {
  interface Window {
    __dampf?: unknown;
  }
}

test("JF-AK-01: alle 8 Schiffe wählbar, Modell trägt den Namen", async ({ page }) => {
  test.skip(isMobile(page), "einmal reicht");
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  for (const name of SHIPS) {
    await shipButton(page, name).click();
    await expect.poll(async () => (await state(page)).shipName).toBe(name);
  }
  await expectNoErrors(errors);
});

test("JF-AK-11: Desktop – einsteigen, ablegen, anlegen, Ergebnis, zurückfahren", async ({
  page,
}) => {
  test.skip(isMobile(page), "nur Desktop");
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  await open(page);
  await shipButton(page, "Frisia III").click();
  await page.getByRole("button", { name: "Norddeich → Juist" }).click();
  await page.getByRole("button", { name: "Los geht's!" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");

  // JF-AK-07: vor dem Ende des Einsteigens kein Ablegen
  const s0 = await state(page);
  expect(s0.phase).toBe("boarding");
  expect(s0.boarded).toBeLessThan(s0.passengers);
  await page.keyboard.press("e");
  expect((await state(page)).phase).toBe("boarding");

  await expect.poll(async () => (await state(page)).action, { timeout: 120_000 }).toBe("Ablegen");
  const ready = await state(page);
  expect(ready.boarded).toBe(ready.passengers);
  expect(ready.clock).toBeGreaterThanOrEqual(ready.departure);
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).phase).toBe("sailing");

  // Fahrhebel per Tastatur
  await page.keyboard.press("w");
  await page.keyboard.press("w");
  expect((await state(page)).throttle).toBe(0.5);
  await page.keyboard.press("s");
  await page.keyboard.press("s");
  expect((await state(page)).throttle).toBe(0);

  // Test-Hilfe: direkt in den Anlegebereich Juist, dann festmachen
  const [x, z] = ready.targetBerth;
  await page.evaluate(
    ([x, z]) =>
      (window.__dampf as { teleport(x: number, z: number, h: number): void }).teleport(x, z, 0),
    [x, z],
  );
  await expect.poll(async () => (await state(page)).action).toBe("Festmachen");
  await page.keyboard.press("e");
  await expect.poll(async () => (await state(page)).screen).toBe("result");
  await expect(page.getByLabel(/von 3 Sternen/)).toBeVisible();
  const r = await state(page);
  expect(r.logbook.trips).toBe(1);
  expect(r.logbook.best["frisia-iii"]!["to-juist"]).toBeGreaterThanOrEqual(1);

  await page.getByRole("button", { name: "Zurückfahren" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  const back = await state(page);
  expect(back.direction).toBe("to-norddeich");
  expect(back.phase).toBe("boarding");
  await expectNoErrors(errors);
});

test("JF-AK-12: Mobile – Fahrhebel, Ruder, Kamera, Menü sichtbar und bedienbar", async ({
  page,
}) => {
  test.skip(!isMobile(page), "nur Mobile");
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await open(page);
  await page.getByRole("button", { name: "Los geht's!" }).tap();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  const vp = page.viewportSize()!;
  const lever = page.getByRole("slider", { name: "Fahrhebel" });
  const rudder = page.getByRole("slider", { name: "Ruder" });
  for (const el of [
    lever,
    rudder,
    page.getByRole("button", { name: "Kamera" }),
    page.getByRole("button", { name: "Menü" }),
  ]) {
    await expect(el).toBeVisible();
    const b = (await el.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 0.5);
  }
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (x0: number, y0: number, x1: number, y1: number) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: x0, y: y0 }],
    });
    for (let i = 1; i <= 6; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 + ((y1 - y0) * i) / 6 }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const lb = (await lever.boundingBox())!;
  await swipe(lb.x + lb.width / 2, lb.y + lb.height / 2, lb.x + lb.width / 2, lb.y + 4);
  await expect.poll(async () => (await state(page)).throttle).toBe(1);
  const rb = (await rudder.boundingBox())!;
  await swipe(rb.x + rb.width / 2, rb.y + rb.height / 2, rb.x + rb.width - 4, rb.y + rb.height / 2);
  await expect.poll(async () => (await state(page)).rudder).toBeGreaterThan(0.8);
  await page.getByRole("button", { name: "Kamera" }).tap();
  await expect.poll(async () => (await state(page)).camera).toBe("bridge");
  await expectNoErrors(errors);
});

test("JF-AK-13: Fokusverlust pausiert auch die Spieluhr", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await page.getByRole("button", { name: "Los geht's!" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(async () => (await state(page)).screen).toBe("paused");
  const c = (await state(page)).clock;
  await page.waitForTimeout(600);
  expect((await state(page)).clock).toBe(c);
  await page.getByRole("button", { name: "Weiterfahren" }).click();
  await expect.poll(async () => (await state(page)).screen).toBe("play");
});
